export interface AutoDollhouseConfig {
  enabled: boolean
  alpha_front_walls: number
  distance_threshold: number
  angle_threshold_deg: number
}

export interface AutoDollhouseWall {
  id: string
  start: { x_mm: number; y_mm: number }
  end: { x_mm: number; y_mm: number }
  manualVisible: boolean
}

export interface AutoDollhouseCamera {
  x_mm: number
  y_mm: number
  yaw_rad: number
}

export interface AutoDollhouseResolveInput {
  camera: AutoDollhouseCamera
  walls: AutoDollhouseWall[]
  settings: AutoDollhouseConfig | null
}

export function resolveAutoDollhouseOpacities(input: AutoDollhouseResolveInput): Record<string, number> {
  const result: Record<string, number> = {}
  const settings = input.settings

  for (const wall of input.walls) {
    result[wall.id] = 1
  }

  if (!settings || !settings.enabled || input.walls.length === 0) {
    return result
  }

  const forwardX = Math.cos(input.camera.yaw_rad)
  const forwardY = Math.sin(input.camera.yaw_rad)
  const angleThresholdCos = Math.cos((settings.angle_threshold_deg * Math.PI) / 180)

  const candidates: Array<{ id: string; distance: number; facing: number }> = []

  for (const wall of input.walls) {
    if (!wall.manualVisible) {
      continue
    }

    const midX = (wall.start.x_mm + wall.end.x_mm) * 0.5
    const midY = (wall.start.y_mm + wall.end.y_mm) * 0.5
    const toWallX = midX - input.camera.x_mm
    const toWallY = midY - input.camera.y_mm
    const distance = Math.hypot(toWallX, toWallY)
    if (distance <= 1 || distance > settings.distance_threshold) {
      continue
    }

    const dirX = toWallX / distance
    const dirY = toWallY / distance
    const facing = dirX * forwardX + dirY * forwardY

    if (facing < angleThresholdCos) {
      continue
    }

    candidates.push({ id: wall.id, distance, facing })
  }

  if (candidates.length === 0) {
    return result
  }

  candidates.sort((left, right) => left.distance - right.distance)
  const lead = candidates[0]
  result[lead.id] = settings.alpha_front_walls

  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const closeDistance = candidate.distance - lead.distance <= 250
    const similarFacing = Math.abs(candidate.facing - lead.facing) <= 0.08
    if (closeDistance && similarFacing) {
      result[candidate.id] = settings.alpha_front_walls
      continue
    }
    break
  }

  return result
}
