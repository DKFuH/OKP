export type MaterialCategory = 'floor' | 'wall' | 'front' | 'worktop' | 'custom'

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  floor: 'Boden',
  wall: 'Wand',
  front: 'Front',
  worktop: 'Arbeitsplatte',
  custom: 'Individuell',
}

export const MATERIAL_FALLBACK_COLORS: Record<MaterialCategory, string> = {
  floor: '#334155',
  wall: '#94a3b8',
  front: '#f59e0b',
  worktop: '#64748b',
  custom: '#a8a29e',
}

export interface MaterialLibraryItem {
  id: string
  tenant_id: string
  name: string
  category: MaterialCategory
  texture_url: string | null
  preview_url: string | null
  scale_x_mm: number | null
  scale_y_mm: number | null
  rotation_deg: number
  roughness: number | null
  metallic: number | null
  config_json: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MaterialSurfaceTarget =
  | 'floor'
  | 'ceiling'
  | 'wall_north'
  | 'wall_south'
  | 'wall_east'
  | 'wall_west'

export interface MaterialSurfaceAssignmentPayload {
  surface: MaterialSurfaceTarget
  material_item_id?: string | null
  uv_scale?: {
    x: number
    y: number
  }
  rotation_deg?: number
}

export interface MaterialPlacementAssignmentPayload {
  placement_id: string
  target_kind?: 'placement' | 'asset'
  material_item_id?: string | null
  uv_scale?: {
    x: number
    y: number
  }
  rotation_deg?: number
}

export interface MaterialAssignmentPayload {
  room_id: string
  surface_assignments?: MaterialSurfaceAssignmentPayload[]
  placement_assignments?: MaterialPlacementAssignmentPayload[]
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

export interface MaterialAssignmentsResponse {
  room_id: string
  coloring: unknown
  placements: unknown
  resolved: {
    surfaces: Array<{
      surface: MaterialSurfaceTarget
      material: ResolvedMaterialAssignment
    }>
    placements: Array<{
      placement_id: string
      material: ResolvedMaterialAssignment
    }>
  }
}
