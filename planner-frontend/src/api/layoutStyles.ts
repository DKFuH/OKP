import { api } from './client.js'

export type LayoutStylePreset = {
  id: string
  tenant_id: string
  name: string
  text_height_mm: number
  arrow_size_mm: number
  line_width_mm: number
  centerline_dash_mm: number
  symbol_scale_mm: number
  font_family: string | null
  config_json: Record<string, unknown>
}

export type LayoutStylePreview = {
  sheet_id: string
  sheet_scale: string
  preset: LayoutStylePreset
  resolved: {
    text_px: number
    arrow_px: number
    stroke_px: number
    centerline_dash_px: number[]
    symbol_px: number
  }
}

export const layoutStylesApi = {
  list: () => api.get<LayoutStylePreset[]>('/tenant/layout-styles'),

  create: (payload: Partial<Omit<LayoutStylePreset, 'id' | 'tenant_id'>>) =>
    api.post<LayoutStylePreset>('/tenant/layout-styles', payload),

  update: (id: string, payload: Partial<Omit<LayoutStylePreset, 'id' | 'tenant_id'>>) =>
    api.put<LayoutStylePreset>(`/tenant/layout-styles/${id}`, payload),

  remove: (id: string) => api.delete(`/tenant/layout-styles/${id}`),

  preview: (sheetId: string, payload: { sheet_scale?: string; style_preset_id?: string }) =>
    api.post<LayoutStylePreview>(`/layout-sheets/${sheetId}/preview-style`, payload),
}
