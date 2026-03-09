import { arcToLineSegments, isArcWallSegment } from '../arcInterop.js'

type Point3 = { x: number; y: number; z: number }

export interface StlExportOptions {
  projectName: string
  wall_segments: Array<{
    id: string
    kind?: 'line' | 'arc'
    x0_mm?: number
    y0_mm?: number
    x1_mm?: number
    y1_mm?: number
    start?: { x_mm: number; y_mm: number }
    end?: { x_mm: number; y_mm: number }
    center?: { x_mm: number; y_mm: number }
    radius_mm?: number
    clockwise?: boolean
    thickness_mm?: number
  }>
  placements: Array<{ id?: string; offset_mm: number; width_mm: number; depth_mm: number; height_mm?: number }>
  ceiling_height_mm: number
}

const MM_TO_M = 0.001

function facetNormal(a: Point3, b: Point3, c: Point3): Point3 {
  const ux = b.x - a.x
  const uy = b.y - a.y
  const uz = b.z - a.z
  const vx = c.x - a.x
  const vy = c.y - a.y
  const vz = c.z - a.z

  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const len = Math.hypot(nx, ny, nz) || 1

  return { x: nx / len, y: ny / len, z: nz / len }
}

function triangleToStl(a: Point3, b: Point3, c: Point3): string[] {
  const n = facetNormal(a, b, c)
  return [
    `facet normal ${n.x} ${n.y} ${n.z}`,
    '  outer loop',
    `    vertex ${a.x} ${a.y} ${a.z}`,
    `    vertex ${b.x} ${b.y} ${b.z}`,
    `    vertex ${c.x} ${c.y} ${c.z}`,
    '  endloop',
    'endfacet',
  ]
}

function boxTriangles(min: Point3, max: Point3): string[] {
  const p000 = { x: min.x, y: min.y, z: min.z }
  const p100 = { x: max.x, y: min.y, z: min.z }
  const p110 = { x: max.x, y: max.y, z: min.z }
  const p010 = { x: min.x, y: max.y, z: min.z }
  const p001 = { x: min.x, y: min.y, z: max.z }
  const p101 = { x: max.x, y: min.y, z: max.z }
  const p111 = { x: max.x, y: max.y, z: max.z }
  const p011 = { x: min.x, y: max.y, z: max.z }

  return [
    ...triangleToStl(p000, p100, p110), ...triangleToStl(p000, p110, p010),
    ...triangleToStl(p001, p111, p101), ...triangleToStl(p001, p011, p111),
    ...triangleToStl(p000, p001, p101), ...triangleToStl(p000, p101, p100),
    ...triangleToStl(p010, p110, p111), ...triangleToStl(p010, p111, p011),
    ...triangleToStl(p000, p010, p011), ...triangleToStl(p000, p011, p001),
    ...triangleToStl(p100, p101, p111), ...triangleToStl(p100, p111, p110),
  ]
}

export function buildStlString(options: StlExportOptions): string {
  const lines = [`solid ${options.projectName.replace(/\s+/g, '_')}`]

  for (const wall of options.wall_segments) {
    const segments = isArcWallSegment(wall)
      ? arcToLineSegments({
          id: wall.id,
          kind: 'arc',
          start: wall.start,
          end: wall.end,
          center: wall.center,
          radius_mm: wall.radius_mm,
          clockwise: wall.clockwise,
          thickness_mm: wall.thickness_mm,
        })
      : ((typeof wall.x0_mm === 'number' &&
          typeof wall.y0_mm === 'number' &&
          typeof wall.x1_mm === 'number' &&
          typeof wall.y1_mm === 'number')
        ? [{ x0_mm: wall.x0_mm, y0_mm: wall.y0_mm, x1_mm: wall.x1_mm, y1_mm: wall.y1_mm }]
        : [])

    for (const segment of segments) {
      const dx = segment.x1_mm - segment.x0_mm
      const dy = segment.y1_mm - segment.y0_mm
      const len = Math.hypot(dx, dy)
      if (len < 1) continue

      const nx = -dy / len
      const ny = dx / len
      const halfThickness = ((wall.thickness_mm ?? 100) / 2) * MM_TO_M
      const h = options.ceiling_height_mm * MM_TO_M

      const x0 = segment.x0_mm * MM_TO_M
      const y0 = segment.y0_mm * MM_TO_M
      const x1 = segment.x1_mm * MM_TO_M
      const y1 = segment.y1_mm * MM_TO_M

      const corners = [
        { x: x0 + nx * halfThickness, y: y0 + ny * halfThickness },
        { x: x1 + nx * halfThickness, y: y1 + ny * halfThickness },
        { x: x1 - nx * halfThickness, y: y1 - ny * halfThickness },
        { x: x0 - nx * halfThickness, y: y0 - ny * halfThickness },
      ]

      const bottom = corners.map((corner) => ({ ...corner, z: 0 }))
      const top = corners.map((corner) => ({ ...corner, z: h }))

      lines.push(
        ...triangleToStl(bottom[0], bottom[1], bottom[2]),
        ...triangleToStl(bottom[0], bottom[2], bottom[3]),
        ...triangleToStl(top[0], top[2], top[1]),
        ...triangleToStl(top[0], top[3], top[2]),
      )

      for (let i = 0; i < 4; i += 1) {
        const next = (i + 1) % 4
        lines.push(
          ...triangleToStl(bottom[i], bottom[next], top[next]),
          ...triangleToStl(bottom[i], top[next], top[i]),
        )
      }
    }
  }

  let placementCursor = 0
  for (const wall of options.wall_segments) {
    if (
      typeof wall.x0_mm !== 'number' ||
      typeof wall.y0_mm !== 'number' ||
      typeof wall.x1_mm !== 'number' ||
      typeof wall.y1_mm !== 'number'
    ) {
      continue
    }

    const dx = wall.x1_mm - wall.x0_mm
    const dy = wall.y1_mm - wall.y0_mm
    const len = Math.hypot(dx, dy)
    if (len < 1) continue

    const tx = dx / len
    const ty = dy / len
    const nx = -ty
    const ny = tx

    const placement = options.placements[placementCursor]
    if (!placement) break
    placementCursor += 1

    const baseX = wall.x0_mm + tx * placement.offset_mm
    const baseY = wall.y0_mm + ty * placement.offset_mm
    const depth = placement.depth_mm * MM_TO_M
    const width = placement.width_mm * MM_TO_M
    const height = (placement.height_mm ?? 720) * MM_TO_M

    const p0 = { x: baseX * MM_TO_M, y: baseY * MM_TO_M }
    const p1 = { x: p0.x + tx * width, y: p0.y + ty * width }
    const p2 = { x: p1.x + nx * depth, y: p1.y + ny * depth }
    const p3 = { x: p0.x + nx * depth, y: p0.y + ny * depth }

    const min = {
      x: Math.min(p0.x, p1.x, p2.x, p3.x),
      y: Math.min(p0.y, p1.y, p2.y, p3.y),
      z: 0,
    }
    const max = {
      x: Math.max(p0.x, p1.x, p2.x, p3.x),
      y: Math.max(p0.y, p1.y, p2.y, p3.y),
      z: height,
    }
    lines.push(...boxTriangles(min, max))
  }

  lines.push(`endsolid ${options.projectName.replace(/\s+/g, '_')}`)
  return lines.join('\n')
}
