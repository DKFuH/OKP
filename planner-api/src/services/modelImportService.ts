export type AssetSourceFormat = 'obj' | 'dae'

export interface AssetBoundingBoxMm {
  width_mm: number
  height_mm: number
  depth_mm: number
}

export interface AssetDefaultScale {
  factor_to_mm: number
  axis_scale: { x: number; y: number; z: number }
  source_unit: 'm' | 'cm' | 'mm'
}

export interface ModelImportMeta {
  sourceFormat: AssetSourceFormat
  bboxMm: AssetBoundingBoxMm
  defaultScale: AssetDefaultScale
  vertexCount: number
}

type Point3 = { x: number; y: number; z: number }

function parseFloatSafe(value: string): number | null {
  const next = Number.parseFloat(value)
  if (!Number.isFinite(next)) return null
  return next
}

function parseObjVertices(content: string): Point3[] {
  const vertices: Point3[] = []
  for (const line of content.split(/\r?\n/g)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('v ')) continue
    const parts = trimmed.split(/\s+/)
    if (parts.length < 4) continue

    const x = parseFloatSafe(parts[1] ?? '')
    const y = parseFloatSafe(parts[2] ?? '')
    const z = parseFloatSafe(parts[3] ?? '')
    if (x == null || y == null || z == null) continue

    vertices.push({ x, y, z })
  }
  return vertices
}

function parseDaeVertices(content: string): Point3[] {
  const arrays: string[] = []

  const positionsSourceRegex = /<source[^>]*id\s*=\s*"[^"]*positions[^"]*"[^>]*>[\s\S]*?<float_array[^>]*>([\s\S]*?)<\/float_array>[\s\S]*?<\/source>/gi
  for (const match of content.matchAll(positionsSourceRegex)) {
    if (match[1]) arrays.push(match[1])
  }

  if (arrays.length === 0) {
    const fallbackRegex = /<float_array[^>]*>([\s\S]*?)<\/float_array>/gi
    for (const match of content.matchAll(fallbackRegex)) {
      if (match[1]) arrays.push(match[1])
    }
  }

  const vertices: Point3[] = []
  for (const chunk of arrays) {
    const values = chunk
      .trim()
      .split(/\s+/)
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    for (let index = 0; index + 2 < values.length; index += 3) {
      vertices.push({
        x: values[index] ?? 0,
        y: values[index + 1] ?? 0,
        z: values[index + 2] ?? 0,
      })
    }
  }

  return vertices
}

function detectSourceFormat(fileName: string): AssetSourceFormat {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.obj')) return 'obj'
  if (lower.endsWith('.dae')) return 'dae'
  throw new Error('Nur OBJ und DAE werden unterstützt')
}

function computeBounds(vertices: Point3[]) {
  if (vertices.length === 0) {
    throw new Error('Keine Geometriedaten im Modell gefunden')
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  for (const vertex of vertices) {
    minX = Math.min(minX, vertex.x)
    minY = Math.min(minY, vertex.y)
    minZ = Math.min(minZ, vertex.z)
    maxX = Math.max(maxX, vertex.x)
    maxY = Math.max(maxY, vertex.y)
    maxZ = Math.max(maxZ, vertex.z)
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  }
}

function inferFactorToMm(maxDimension: number): AssetDefaultScale {
  if (maxDimension <= 20) {
    return {
      factor_to_mm: 1000,
      axis_scale: { x: 1, y: 1, z: 1 },
      source_unit: 'm',
    }
  }

  if (maxDimension <= 500) {
    return {
      factor_to_mm: 10,
      axis_scale: { x: 1, y: 1, z: 1 },
      source_unit: 'cm',
    }
  }

  return {
    factor_to_mm: 1,
    axis_scale: { x: 1, y: 1, z: 1 },
    source_unit: 'mm',
  }
}

export function extractModelImportMeta(fileName: string, content: string): ModelImportMeta {
  if (!content || content.trim().length === 0) {
    throw new Error('Datei ist leer')
  }

  const sourceFormat = detectSourceFormat(fileName)
  const vertices = sourceFormat === 'obj' ? parseObjVertices(content) : parseDaeVertices(content)

  const rawBounds = computeBounds(vertices)
  const maxDimension = Math.max(rawBounds.width, rawBounds.height, rawBounds.depth)
  const defaultScale = inferFactorToMm(maxDimension)

  const width_mm = Math.round(rawBounds.width * defaultScale.factor_to_mm)
  const height_mm = Math.round(rawBounds.height * defaultScale.factor_to_mm)
  const depth_mm = Math.round(rawBounds.depth * defaultScale.factor_to_mm)

  if (width_mm <= 0 || height_mm <= 0 || depth_mm <= 0) {
    throw new Error('Ungültige Bounding-Box: Modell muss in allen Achsen Ausdehnung haben')
  }

  return {
    sourceFormat,
    bboxMm: {
      width_mm,
      height_mm,
      depth_mm,
    },
    defaultScale,
    vertexCount: vertices.length,
  }
}
