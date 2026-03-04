import { api } from './client.js'
import type {
  MaterialAssignmentPayload,
  MaterialAssignmentsResponse,
  MaterialCategory,
  MaterialLibraryItem,
} from '../plugins/materials/index.js'

interface MaterialWriteFields {
  name: string
  category: MaterialCategory
  texture_url?: string | null
  preview_url?: string | null
  scale_x_mm?: number | null
  scale_y_mm?: number | null
  rotation_deg?: number
  roughness?: number | null
  metallic?: number | null
  config_json?: Record<string, unknown>
}

export type MaterialCreatePayload = MaterialWriteFields

export type MaterialPatchPayload = Partial<MaterialWriteFields>

export const materialLibraryApi = {
  list: (params?: { q?: string; category?: MaterialCategory }): Promise<MaterialLibraryItem[]> => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.category) search.set('category', params.category)
    const qs = search.toString()
    return api.get<MaterialLibraryItem[]>(`/tenant/materials${qs ? `?${qs}` : ''}`)
  },

  create: (payload: MaterialCreatePayload): Promise<MaterialLibraryItem> =>
    api.post<MaterialLibraryItem>('/tenant/materials', payload),

  patch: (id: string, payload: MaterialPatchPayload): Promise<MaterialLibraryItem> =>
    api.patch<MaterialLibraryItem>(`/tenant/materials/${id}`, payload),

  remove: (id: string): Promise<void> =>
    api.delete(`/tenant/materials/${id}`),

  assign: (projectId: string, payload: MaterialAssignmentPayload): Promise<MaterialAssignmentsResponse> =>
    api.post<MaterialAssignmentsResponse>(`/projects/${projectId}/material-assignments`, payload),
}
