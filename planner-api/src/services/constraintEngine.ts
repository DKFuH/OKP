export type ConstraintType =
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'coincident'
  | 'equal_length'
  | 'symmetry_axis'
  | 'driving_dimension'

export interface Constraint {
  id: string
  type: ConstraintType
  target_refs: string[]
  value_json: Record<string, unknown>
  enabled: boolean
}

export interface WallSegment {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface PlacementPoint {
  id: string
  x: number
  y: number
  wall_id?: string | null
}

export interface ConstraintSolveInput {
  constraints: Constraint[]
  wallSegments: WallSegment[]
  placements: PlacementPoint[]
}

export interface ConstraintSolveOutput {
  wallSegments: WallSegment[]
  placements: PlacementPoint[]
  warnings: string[]
}

const EPSILON = 1e-9

function cloneWalls(walls: WallSegment[]): WallSegment[] {
  return walls.map((wall) => ({ ...wall }))
}

function clonePlacements(placements: PlacementPoint[]): PlacementPoint[] {
  return placements.map((placement) => ({ ...placement }))
}

function wallLength(wall: WallSegment): number {
  return Math.hypot(wall.x1 - wall.x0, wall.y1 - wall.y0)
}

function setWallDirectionPreserveLength(
  wall: WallSegment,
  directionX: number,
  directionY: number
): void {
  const length = wallLength(wall)
  const vectorLength = Math.hypot(directionX, directionY)
  if (vectorLength < EPSILON || length < EPSILON) {
    return
  }
  const unitX = directionX / vectorLength
  const unitY = directionY / vectorLength
  wall.x1 = wall.x0 + unitX * length
  wall.y1 = wall.y0 + unitY * length
}

function pointOnWallAtOffset(wall: WallSegment, offsetMm: number): { x: number; y: number } {
  const length = wallLength(wall)
  if (length < EPSILON) {
    return { x: wall.x0, y: wall.y0 }
  }
  const t = Math.max(0, Math.min(1, offsetMm / length))
  return {
    x: wall.x0 + (wall.x1 - wall.x0) * t,
    y: wall.y0 + (wall.y1 - wall.y0) * t,
  }
}

export function solveConstraints(input: ConstraintSolveInput): ConstraintSolveOutput {
  const wallSegments = cloneWalls(input.wallSegments)
  const placements = clonePlacements(input.placements)
  const warnings: string[] = []

  const wallMap = new Map<string, WallSegment>()
  wallSegments.forEach((wall) => wallMap.set(wall.id, wall))

  const placementMap = new Map<string, PlacementPoint>()
  placements.forEach((placement) => placementMap.set(placement.id, placement))

  for (const constraint of input.constraints.filter((item) => item.enabled)) {
    if (constraint.type === 'horizontal') {
      const wall = wallMap.get(constraint.target_refs[0] ?? '')
      if (!wall) {
        warnings.push(`Constraint ${constraint.id}: missing wall target for horizontal`)
        continue
      }
      wall.y1 = wall.y0
      continue
    }

    if (constraint.type === 'vertical') {
      const wall = wallMap.get(constraint.target_refs[0] ?? '')
      if (!wall) {
        warnings.push(`Constraint ${constraint.id}: missing wall target for vertical`)
        continue
      }
      wall.x1 = wall.x0
      continue
    }

    if (constraint.type === 'parallel' || constraint.type === 'perpendicular') {
      const reference = wallMap.get(constraint.target_refs[0] ?? '')
      const target = wallMap.get(constraint.target_refs[1] ?? '')
      if (!reference || !target) {
        warnings.push(`Constraint ${constraint.id}: missing wall target for ${constraint.type}`)
        continue
      }

      const refDx = reference.x1 - reference.x0
      const refDy = reference.y1 - reference.y0
      if (constraint.type === 'parallel') {
        setWallDirectionPreserveLength(target, refDx, refDy)
      } else {
        setWallDirectionPreserveLength(target, -refDy, refDx)
      }
      continue
    }

    if (constraint.type === 'equal_length') {
      const source = wallMap.get(constraint.target_refs[0] ?? '')
      const target = wallMap.get(constraint.target_refs[1] ?? '')
      if (!source || !target) {
        warnings.push(`Constraint ${constraint.id}: missing wall target for equal_length`)
        continue
      }

      const sourceLength = wallLength(source)
      const dx = target.x1 - target.x0
      const dy = target.y1 - target.y0
      const currentLength = Math.hypot(dx, dy)
      if (sourceLength < EPSILON || currentLength < EPSILON) {
        continue
      }
      const scale = sourceLength / currentLength
      target.x1 = target.x0 + dx * scale
      target.y1 = target.y0 + dy * scale
      continue
    }

    if (constraint.type === 'coincident') {
      const placement = placementMap.get(constraint.target_refs[0] ?? '')
      const wall = wallMap.get(constraint.target_refs[1] ?? '')
      if (!placement || !wall) {
        warnings.push(`Constraint ${constraint.id}: missing targets for coincident`)
        continue
      }

      const offsetMm = Number(constraint.value_json.offset_mm ?? 0)
      const point = pointOnWallAtOffset(wall, Number.isFinite(offsetMm) ? offsetMm : 0)
      placement.x = point.x
      placement.y = point.y
      placement.wall_id = wall.id
      continue
    }

    if (constraint.type === 'symmetry_axis') {
      const a = placementMap.get(constraint.target_refs[0] ?? '')
      const b = placementMap.get(constraint.target_refs[1] ?? '')
      if (!a || !b) {
        warnings.push(`Constraint ${constraint.id}: missing placement targets for symmetry_axis`)
        continue
      }

      const axis = (constraint.value_json.axis as string | undefined) ?? 'x'
      const axisValue = Number(constraint.value_json.value_mm ?? 0)
      if (!Number.isFinite(axisValue)) {
        warnings.push(`Constraint ${constraint.id}: invalid axis value for symmetry_axis`)
        continue
      }

      if (axis === 'y') {
        b.x = a.x
        b.y = axisValue - (a.y - axisValue)
      } else {
        b.y = a.y
        b.x = axisValue - (a.x - axisValue)
      }
      continue
    }

    if (constraint.type === 'driving_dimension') {
      const wallTarget = wallMap.get(constraint.target_refs[0] ?? '')
      if (wallTarget) {
        const lengthMm = Number(constraint.value_json.length_mm)
        if (!Number.isFinite(lengthMm) || lengthMm <= 0) {
          warnings.push(`Constraint ${constraint.id}: invalid length_mm for driving_dimension`)
          continue
        }
        const dx = wallTarget.x1 - wallTarget.x0
        const dy = wallTarget.y1 - wallTarget.y0
        const currentLength = Math.hypot(dx, dy)
        if (currentLength < EPSILON) {
          wallTarget.x1 = wallTarget.x0 + lengthMm
          wallTarget.y1 = wallTarget.y0
        } else {
          const scale = lengthMm / currentLength
          wallTarget.x1 = wallTarget.x0 + dx * scale
          wallTarget.y1 = wallTarget.y0 + dy * scale
        }
        continue
      }

      const placementA = placementMap.get(constraint.target_refs[0] ?? '')
      const placementB = placementMap.get(constraint.target_refs[1] ?? '')
      if (!placementA || !placementB) {
        warnings.push(`Constraint ${constraint.id}: missing targets for driving_dimension`)
        continue
      }

      const distanceMm = Number(constraint.value_json.distance_mm)
      if (!Number.isFinite(distanceMm) || distanceMm < 0) {
        warnings.push(`Constraint ${constraint.id}: invalid distance_mm for driving_dimension`)
        continue
      }

      placementB.x = placementA.x + distanceMm
      placementB.y = placementA.y
      continue
    }
  }

  return {
    wallSegments,
    placements,
    warnings,
  }
}
