import AdmZip from 'adm-zip'
import { arcToLineSegments, isArcWallSegment } from '../arcInterop.js'

type ThreeMfWallSegment = {
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

type ThreeMfPlacement = {
  id?: string
  offset_mm: number
  width_mm: number
  depth_mm: number
  height_mm?: number
}

export interface ThreeMfExportOptions {
  projectName: string
  wall_segments: ThreeMfWallSegment[]
  placements: ThreeMfPlacement[]
  ceiling_height_mm: number
}

type Vertex = { x: number; y: number; z: number }
type Triangle = { v1: number; v2: number; v3: number }

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function addVertex(vertices: Vertex[], vertex: Vertex): number {
  vertices.push(vertex)
  return vertices.length - 1
}

function pushQuad(vertices: Vertex[], triangles: Triangle[], a: Vertex, b: Vertex, c: Vertex, d: Vertex): void {
  const ia = addVertex(vertices, a)
  const ib = addVertex(vertices, b)
  const ic = addVertex(vertices, c)
  const id = addVertex(vertices, d)
  triangles.push({ v1: ia, v2: ib, v3: ic }, { v1: ia, v2: ic, v3: id })
}

function buildModelXml(options: ThreeMfExportOptions): string {
  const vertices: Vertex[] = []
  const triangles: Triangle[] = []

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
      if (len < 1) {
        continue
      }

      const nx = -dy / len
      const ny = dx / len
      const halfThickness = (wall.thickness_mm ?? 100) / 2
      const h = options.ceiling_height_mm

      const b0 = { x: segment.x0_mm + nx * halfThickness, y: segment.y0_mm + ny * halfThickness, z: 0 }
      const b1 = { x: segment.x1_mm + nx * halfThickness, y: segment.y1_mm + ny * halfThickness, z: 0 }
      const b2 = { x: segment.x1_mm - nx * halfThickness, y: segment.y1_mm - ny * halfThickness, z: 0 }
      const b3 = { x: segment.x0_mm - nx * halfThickness, y: segment.y0_mm - ny * halfThickness, z: 0 }
      const t0 = { ...b0, z: h }
      const t1 = { ...b1, z: h }
      const t2 = { ...b2, z: h }
      const t3 = { ...b3, z: h }

      pushQuad(vertices, triangles, b0, b1, b2, b3)
      pushQuad(vertices, triangles, t0, t3, t2, t1)
      pushQuad(vertices, triangles, b0, t0, t1, b1)
      pushQuad(vertices, triangles, b1, t1, t2, b2)
      pushQuad(vertices, triangles, b2, t2, t3, b3)
      pushQuad(vertices, triangles, b3, t3, t0, b0)
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
    if (!placement) {
      break
    }
    placementCursor += 1

    const dx = wall.x1_mm - wall.x0_mm
    const dy = wall.y1_mm - wall.y0_mm
    const len = Math.hypot(dx, dy)
    if (len < 1) {
      continue
    }

    const tx = dx / len
    const ty = dy / len
    const nx = -ty
    const ny = tx

    const baseX = wall.x0_mm + tx * placement.offset_mm
    const baseY = wall.y0_mm + ty * placement.offset_mm
    const width = placement.width_mm
    const depth = placement.depth_mm
    const height = placement.height_mm ?? 720

    const p0 = { x: baseX, y: baseY, z: 0 }
    const p1 = { x: p0.x + tx * width, y: p0.y + ty * width, z: 0 }
    const p2 = { x: p1.x + nx * depth, y: p1.y + ny * depth, z: 0 }
    const p3 = { x: p0.x + nx * depth, y: p0.y + ny * depth, z: 0 }
    const p4 = { ...p0, z: height }
    const p5 = { ...p1, z: height }
    const p6 = { ...p2, z: height }
    const p7 = { ...p3, z: height }

    pushQuad(vertices, triangles, p0, p1, p2, p3)
    pushQuad(vertices, triangles, p4, p7, p6, p5)
    pushQuad(vertices, triangles, p0, p4, p5, p1)
    pushQuad(vertices, triangles, p1, p5, p6, p2)
    pushQuad(vertices, triangles, p2, p6, p7, p3)
    pushQuad(vertices, triangles, p3, p7, p4, p0)
  }

  const vertexXml = vertices.map((vertex) => `<vertex x="${vertex.x}" y="${vertex.y}" z="${vertex.z}"/>`).join('')
  const triangleXml = triangles
    .map((triangle) => `<triangle v1="${triangle.v1}" v2="${triangle.v2}" v3="${triangle.v3}"/>`)
    .join('')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">',
    '  <metadata name="Application">OpenKitchenPlanner</metadata>',
    `  <metadata name="Title">${escapeXml(options.projectName)}</metadata>`,
    '  <resources>',
    '    <object id="1" type="model">',
    '      <mesh>',
    `        <vertices>${vertexXml}</vertices>`,
    `        <triangles>${triangleXml}</triangles>`,
    '      </mesh>',
    '    </object>',
    '  </resources>',
    '  <build>',
    '    <item objectid="1"/>',
    '  </build>',
    '</model>',
  ].join('\n')
}

export function buildThreeMfBuffer(options: ThreeMfExportOptions): Buffer {
  const zip = new AdmZip()
  const modelXml = buildModelXml(options)

  zip.addFile(
    '[Content_Types].xml',
    Buffer.from(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>',
        '</Types>',
      ].join('\n'),
      'utf8',
    ),
  )
  zip.addFile(
    '_rels/.rels',
    Buffer.from(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '  <Relationship Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model"/>',
        '</Relationships>',
      ].join('\n'),
      'utf8',
    ),
  )
  zip.addFile('3D/3dmodel.model', Buffer.from(modelXml, 'utf8'))

  return zip.toBuffer()
}
