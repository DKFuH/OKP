import { api } from './client.js'
import type { Vertex, WallSegment } from '@shared/types'

export interface RoomBoundaryPayload {
  vertices: Vertex[]
  wall_segments: WallSegment[]
}

export interface RoomPayload {
  id: string
  project_id: string
  name: string
  ceiling_height_mm: number
  boundary: RoomBoundaryPayload
  ceiling_constraints: unknown[]
  openings: unknown[]
  placements: unknown[]
  created_at: string
  updated_at: string
}

export const roomsApi = {
  list: (projectId: string) =>
    api.get<RoomPayload[]>(`/projects/${projectId}/rooms`),

  create: (data: {
    project_id: string
    name: string
    ceiling_height_mm?: number
    boundary: RoomBoundaryPayload
  }) => api.post<RoomPayload>('/rooms', data),

  update: (id: string, data: Partial<{
    name: string
    ceiling_height_mm: number
    boundary: RoomBoundaryPayload
    ceiling_constraints: unknown[]
    openings: unknown[]
    placements: unknown[]
  }>) => api.put<RoomPayload>(`/rooms/${id}`, data),

  delete: (id: string) => api.delete(`/rooms/${id}`),
}
