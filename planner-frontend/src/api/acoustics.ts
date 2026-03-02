export interface AcousticGridMeta {
  id: string
  filename: string
  variable: 'spl_db' | 'spl_dba' | 't20_s' | 'sti'
  resolution_mm: number
  grid_cols: number
  grid_rows: number
  min_value: number
  max_value: number
  created_at: string
}

export interface GeoJsonGrid {
  type: 'FeatureCollection'
  variable: string
  min: number
  max: number
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Polygon'; coordinates: number[][][] }
    properties: { value: number; color: string }
  }>
}

export const acousticsApi = {
  importCnivg: async (projectId: string, file: File): Promise<{ grid_id: string; cols: number; rows: number }> => {
    const text = await file.text()
    const response = await fetch(`/api/v1/projects/${projectId}/import/acoustics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Filename': file.name,
      },
      body: text,
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<{ grid_id: string; cols: number; rows: number }>
  },

  listGrids: async (projectId: string): Promise<AcousticGridMeta[]> => {
    const response = await fetch(`/api/v1/projects/${projectId}/acoustic-grids`)
    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<AcousticGridMeta[]>
  },

  getTiles: async (gridId: string): Promise<GeoJsonGrid> => {
    const response = await fetch(`/api/v1/acoustic-grids/${gridId}/tiles`)
    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<GeoJsonGrid>
  },

  deleteGrid: async (gridId: string): Promise<void> => {
    const response = await fetch(`/api/v1/acoustic-grids/${gridId}`, { method: 'DELETE' })
    if (!response.ok) {
      throw new Error(await response.text())
    }
  },

  listLayers: async (projectId: string): Promise<unknown[]> => {
    const response = await fetch(`/api/v1/projects/${projectId}/acoustic-layers`)
    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<unknown[]>
  },
}