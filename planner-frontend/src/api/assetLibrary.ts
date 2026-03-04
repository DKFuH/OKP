import { api } from './client.js'
import type { AssetCategory, AssetLibraryItem } from '../plugins/assetLibrary/index.js'

interface AssetImportPayload {
  name?: string
  category: AssetCategory
  tags: string[]
  file_name: string
  file_base64: string
}

interface AssetPatchPayload {
  name?: string
  category?: AssetCategory
  tags?: string[]
  preview_url?: string | null
}

export const assetLibraryApi = {
  list: (params?: { q?: string; category?: AssetCategory }): Promise<AssetLibraryItem[]> => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.category) search.set('category', params.category)
    const qs = search.toString()
    return api.get<AssetLibraryItem[]>(`/tenant/assets${qs ? `?${qs}` : ''}`)
  },

  importAsset: (payload: AssetImportPayload): Promise<AssetLibraryItem> =>
    api.post<AssetLibraryItem>('/tenant/assets/import', payload),

  patch: (id: string, payload: AssetPatchPayload): Promise<AssetLibraryItem> =>
    api.patch<AssetLibraryItem>(`/tenant/assets/${id}`, payload),

  remove: (id: string): Promise<void> =>
    api.delete(`/tenant/assets/${id}`),
}
