export type MaterialCategory = 'floor' | 'wall' | 'front' | 'worktop' | 'custom'

export interface MaterialLibraryRecord {
  id: string
  name: string
  category: string
  texture_url: string | null
  preview_url: string | null
  scale_x_mm: number | null
  scale_y_mm: number | null
  rotation_deg: number
  roughness: number | null
  metallic: number | null
}

export interface MaterialAssignmentInput {
  material_item_id?: string | null
  texture_url?: string | null
  color_hex?: string | null
  uv_scale?: {
    x: number
    y: number
  } | null
  rotation_deg?: number | null
}

export interface ResolvedMaterialAssignment {
  material_item_id: string | null
  name: string
  category: string
  texture_url: string | null
  preview_url: string | null
  color_hex: string
  roughness: number
  metallic: number
  uv_scale: {
    x: number
    y: number
  }
  rotation_deg: number
  source: 'library' | 'fallback'
}

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  floor: '#334155',
  wall: '#94a3b8',
  front: '#f59e0b',
  worktop: '#64748b',
  custom: '#a8a29e',
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function normalizeColor(input: string | null | undefined): string | null {
  if (!input) return null
  return HEX_COLOR_PATTERN.test(input) ? input.toLowerCase() : null
}

function normalizeScale(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  if (value <= 0) return null
  return value
}

export function resolveMaterialAssignment(options: {
  assignment?: MaterialAssignmentInput | null
  materialItem?: MaterialLibraryRecord | null
  fallbackCategory?: MaterialCategory
}): ResolvedMaterialAssignment {
  const fallbackCategory = options.fallbackCategory ?? 'custom'
  const material = options.materialItem ?? null
  const assignment = options.assignment ?? null

  const category = (material?.category as MaterialCategory | undefined) ?? fallbackCategory
  const fallbackColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.custom

  const uvScaleX = assignment?.uv_scale?.x
  const uvScaleY = assignment?.uv_scale?.y

  const scaleX = normalizeScale(material?.scale_x_mm ?? null)
  const scaleY = normalizeScale(material?.scale_y_mm ?? null)

  const resolvedUvScale = {
    x: normalizeScale(uvScaleX) ?? (scaleX ? Math.max(0.1, scaleX / 1000) : 1),
    y: normalizeScale(uvScaleY) ?? (scaleY ? Math.max(0.1, scaleY / 1000) : 1),
  }

  const resolvedRotation = clamp(
    assignment?.rotation_deg ?? material?.rotation_deg ?? 0,
    0,
    360,
  )

  return {
    material_item_id: material?.id ?? assignment?.material_item_id ?? null,
    name: material?.name ?? 'Standard',
    category,
    texture_url: assignment?.texture_url ?? material?.texture_url ?? null,
    preview_url: material?.preview_url ?? null,
    color_hex: normalizeColor(assignment?.color_hex) ?? fallbackColor,
    roughness: clamp(material?.roughness ?? 0.72, 0, 1),
    metallic: clamp(material?.metallic ?? 0.06, 0, 1),
    uv_scale: resolvedUvScale,
    rotation_deg: resolvedRotation,
    source: material ? 'library' : 'fallback',
  }
}
