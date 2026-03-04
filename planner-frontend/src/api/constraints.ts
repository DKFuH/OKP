import { api } from './client.js'

export type ConstraintType =
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'coincident'
  | 'equal_length'
  | 'symmetry_axis'
  | 'driving_dimension'

export interface GeometryConstraint {
  id: string
  tenant_id: string
  room_id: string
  type: ConstraintType
  target_refs: string[]
  value_json: Record<string, unknown>
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface GeometryConstraintInput {
  type: ConstraintType
  target_refs: string[]
  value_json?: Record<string, unknown>
  enabled?: boolean
}

export interface ConstraintSolveResponse {
  room_id: string
  persisted: boolean
  wall_segments: Array<{ id: string; x0: number; y0: number; x1: number; y1: number }>
  placements: Array<{ id: string; x: number; y: number; wall_id?: string | null }>
  warnings: string[]
}

export function getRoomConstraints(roomId: string): Promise<GeometryConstraint[]> {
  return api.get<GeometryConstraint[]>(`/rooms/${roomId}/constraints`)
}

export function createRoomConstraint(roomId: string, payload: GeometryConstraintInput): Promise<GeometryConstraint> {
  return api.post<GeometryConstraint>(`/rooms/${roomId}/constraints`, payload)
}

export function updateConstraint(constraintId: string, payload: GeometryConstraintInput): Promise<GeometryConstraint> {
  return api.put<GeometryConstraint>(`/constraints/${constraintId}`, payload)
}

export function deleteConstraint(constraintId: string): Promise<void> {
  return api.delete(`/constraints/${constraintId}`)
}

export function solveRoomConstraints(roomId: string, persist = false): Promise<ConstraintSolveResponse> {
  return api.post<ConstraintSolveResponse>(`/rooms/${roomId}/constraints/solve?persist=${persist ? 'true' : 'false'}`, {})
}
