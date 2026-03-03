export type FengShuiMode = 'west' | 'east' | 'both'

export interface FengShuiAnalysisMeta {
  id: string
  mode: FengShuiMode
  score_total: number
  score_west: number
  score_east: number
  compass_deg: number
  created_at: string
}

export interface FengShuiAnalyzeBody {
  mode: FengShuiMode
  compass_deg: number
  entry?: { x_mm: number; y_mm: number; room_id?: string; door_id?: string; placement_id?: string }
  bounds_mm: { x_min: number; y_min: number; x_max: number; y_max: number }
  kitchen?: {
    sink?: { x_mm: number; y_mm: number; placement_id?: string }
    hob?: { x_mm: number; y_mm: number; placement_id?: string }
    fridge?: { x_mm: number; y_mm: number; placement_id?: string }
  }
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Polygon' | 'Point' | 'LineString'; coordinates: any }
    properties: Record<string, any>
  }>
}

export interface FengShuiFinding {
  id: string
  system: 'west' | 'east'
  severity: 'info' | 'warn' | 'critical'
  title: string
  reason: string
  recommendation: string
  score_impact?: number
  object_refs?: Array<{ room_id?: string; placement_id?: string; door_id?: string }>
  geometry?: { type: 'Point' | 'Polygon' | 'LineString'; coordinates: any }
  tags?: string[]
}

export const fengshuiApi = {
  analyze: (projectId: string, body: FengShuiAnalyzeBody): Promise<FengShuiAnalysisMeta> =>
    fetch(`/api/v1/projects/${projectId}/analyze/fengshui`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() as Promise<FengShuiAnalysisMeta> }),

  listAnalyses: (projectId: string): Promise<FengShuiAnalysisMeta[]> =>
    fetch(`/api/v1/projects/${projectId}/fengshui-analyses`).then(r => r.json() as Promise<FengShuiAnalysisMeta[]>),

  getZones: (analysisId: string): Promise<GeoJsonFeatureCollection> =>
    fetch(`/api/v1/fengshui-analyses/${analysisId}/zones`).then(r => r.json() as Promise<GeoJsonFeatureCollection>),

  getFindings: (analysisId: string): Promise<FengShuiFinding[]> =>
    fetch(`/api/v1/fengshui-analyses/${analysisId}/findings`).then(r => r.json() as Promise<FengShuiFinding[]>),

  deleteAnalysis: (analysisId: string) =>
    fetch(`/api/v1/fengshui-analyses/${analysisId}`, { method: 'DELETE' }),
}
