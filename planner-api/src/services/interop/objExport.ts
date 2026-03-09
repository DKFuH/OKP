import { arcToLineSegments, isArcWallSegment } from '../arcInterop.js'

type ObjWallSegment = {
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
}

type ObjPlacement = {
  id?: string
  offset_mm: number
  width_mm: number
  depth_mm: number
  height_mm?: number
}

export interface ObjExportOptions {
  projectName: string
  wall_segments: ObjWallSegment[]
  placements: ObjPlacement[]
  ceiling_height_mm: number
}

type Vertex = { x: number; y: number; z: number }

const MM_TO_M = 0.001

function sanitizeName(value: string): string {
  return value.replace(/[^\w.-]+/g, '_')
}

function addVertex(vertices: string[], vertex: Vertex): number {
  vertices.push(`v ${vertex.x} ${vertex.y} ${vertex.z}`)
  return vertices.length
}

function pushQuad(vertices: string[], faces: string[], a: Vertex, b: Vertex, c: Vertex, d: Vertex): void {
  const ia = addVertex(vertices, a)
  const ib = addVertex(vertices, b)
  const ic = addVertex(vertices, c)
  const id = addVertex(vertices, d)
  faces.push(`f ${ia} ${ib} ${ic}`)
  faces.push(`f ${ia} ${ic} ${id}`)
}

export function buildObjString(options: ObjExportOptions): string {
  const vertices: string[] = []
  const faces: string[] = [`o ${sanitizeName(options.projectName)}`]

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

      const b0 = { x: x0 + nx * halfThickness, y: y0 + ny * halfThickness, z: 0 }
      const b1 = { x: x1 + nx * halfThickness, y: y1 + ny * halfThickness, z: 0 }
      const b2 = { x: x1 - nx * halfThickness, y: y1 - ny * halfThickness, z: 0 }
      const b3 = { x: x0 - nx * halfThickness, y: y0 - ny * halfThickness, z: 0 }
      const t0 = { ...b0, z: h }
      const t1 = { ...b1, z: h }
      const t2 = { ...b2, z: h }
      const t3 = { ...b3, z: h }

      faces.push(`g wall_${sanitizeName(wall.id)}`)
      pushQuad(vertices, faces, b0, b1, b2, b3)
      pushQuad(vertices, faces, t0, t3, t2, t1)
      pushQuad(vertices, faces, b0, t0, t1, b1)
      pushQuad(vertices, faces, b1, t1, t2, b2)
      pushQuad(vertices, faces, b2, t2, t3, b3)
      pushQuad(vertices, faces, b3, t3, t0, b0)
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

    const placement = options.placements[placementCursor]
    if (!placement) break
    placementCursor += 1

    const dx = wall.x1_mm - wall.x0_mm
    const dy = wall.y1_mm - wall.y0_mm
    const len = Math.hypot(dx, dy)
    if (len < 1) continue

    const tx = dx / len
    const ty = dy / len
    const nx = -ty
    const ny = tx

    const baseX = wall.x0_mm + tx * placement.offset_mm
    const baseY = wall.y0_mm + ty * placement.offset_mm
    const width = placement.width_mm * MM_TO_M
    const depth = placement.depth_mm * MM_TO_M
    const height = (placement.height_mm ?? 720) * MM_TO_M

    const p0 = { x: baseX * MM_TO_M, y: baseY * MM_TO_M, z: 0 }
    const p1 = { x: p0.x + tx * width, y: p0.y + ty * width, z: 0 }
    const p2 = { x: p1.x + nx * depth, y: p1.y + ny * depth, z: 0 }
    const p3 = { x: p0.x + nx * depth, y: p0.y + ny * depth, z: 0 }
    const p4 = { ...p0, z: height }
    const p5 = { ...p1, z: height }
    const p6 = { ...p2, z: height }
    const p7 = { ...p3, z: height }

    faces.push(`g placement_${sanitizeName(placement.id ?? `p${placementCursor}`)}`)
    pushQuad(vertices, faces, p0, p1, p2, p3)
    pushQuad(vertices, faces, p4, p7, p6, p5)
    pushQuad(vertices, faces, p0, p4, p5, p1)
    pushQuad(vertices, faces, p1, p5, p6, p2)
    pushQuad(vertices, faces, p2, p6, p7, p3)
    pushQuad(vertices, faces, p3, p7, p4, p0)
  }

  return ['# OKP OBJ export', ...vertices, ...faces].join('\n')
}
