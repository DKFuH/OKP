import { api } from './client.js'

export interface Placement {
  id: string
  catalog_item_id: string
  wall_id: string
  offset_mm: number
  width_mm: number
  depth_mm: number
  height_mm: number
  worldPos?: { x_mm: number; y_mm: number }
}

export const placementsApi = {
  list: (roomId: string): Promise<Placement[]> =>
    api.get<Placement[]>(`/rooms/${roomId}/placements`),

  save: (roomId: string, placements: Placement[]): Promise<Placement[]> =>
    api.put<Placement[]>(`/rooms/${roomId}/placements`, { placements }),

  create: (roomId: string, placement: Omit<Placement, 'id'>): Promise<Placement> =>
    api.post<Placement>(`/rooms/${roomId}/placements`, placement),

  delete: (roomId: string, placementId: string): Promise<void> =>
    api.delete(`/rooms/${roomId}/placements/${placementId}`),
}
