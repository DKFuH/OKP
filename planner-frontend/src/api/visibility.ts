import { api } from './client.js'

const TENANT_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000001'

export type LockScope = 'manual' | 'safe_edit' | 'system'

export interface VisibilityApplyPayload {
  levels?: Array<{ level_id: string; visible: boolean }>
  dimensions?: Array<{ dimension_id: string; visible: boolean }>
  placements?: Array<{ room_id: string; placement_id: string; visible: boolean }>
  walls?: Array<{ room_id: string; wall_id: string; visible: boolean }>
}

export interface LocksApplyPayload {
  levels?: Array<{ level_id: string; locked: boolean; lock_scope?: LockScope }>
  dimensions?: Array<{ dimension_id: string; locked: boolean; lock_scope?: LockScope }>
  placements?: Array<{ room_id: string; placement_id: string; locked: boolean; lock_scope?: LockScope }>
  walls?: Array<{ room_id: string; wall_id: string; locked: boolean; lock_scope?: LockScope }>
}

export interface AutoDollhouseSettings {
  project_id: string
  enabled: boolean
  alpha_front_walls: number
  distance_threshold: number
  angle_threshold_deg: number
}

export interface AutoDollhousePatch {
  enabled?: boolean
  alpha_front_walls?: number
  distance_threshold?: number
  angle_threshold_deg?: number
}

export const visibilityApi = {
  applyVisibility: (projectId: string, payload: VisibilityApplyPayload) =>
    api.post<{ updated: Record<string, number> }>(
      `/projects/${projectId}/visibility/apply`,
      payload,
      { 'X-Tenant-Id': TENANT_ID_PLACEHOLDER },
    ),

  applyLocks: (projectId: string, payload: LocksApplyPayload) =>
    api.post<{ updated: Record<string, number> }>(
      `/projects/${projectId}/locks/apply`,
      payload,
      { 'X-Tenant-Id': TENANT_ID_PLACEHOLDER },
    ),

  getAutoDollhouse: (projectId: string) =>
    api.get<AutoDollhouseSettings>(
      `/projects/${projectId}/visibility/auto-dollhouse`,
      { 'X-Tenant-Id': TENANT_ID_PLACEHOLDER },
    ),

  updateAutoDollhouse: (projectId: string, payload: AutoDollhousePatch) =>
    api.patch<AutoDollhouseSettings>(
      `/projects/${projectId}/visibility/auto-dollhouse`,
      payload,
      { 'X-Tenant-Id': TENANT_ID_PLACEHOLDER },
    ),
}
