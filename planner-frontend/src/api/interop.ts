import { api } from './client.js'

export type InteropCapability = {
  provider_id: string
  provider_kind: 'embedded' | 'plugin' | 'external' | string
  availability: 'stable' | 'experimental' | 'disabled' | string
  format: 'dxf' | 'dwg' | 'skp' | 'ifc' | 'stl' | 'step' | 'obj' | '3mf' | string
  import_preview: boolean
  import_execute: boolean
  export_artifact: boolean
  native_read: boolean
  native_write: boolean
  review_required_by_default: boolean
  artifact_kind: 'cad' | 'bim' | 'script' | 'mesh' | string
  import_delivery_mode: 'native' | 'fallback' | 'script' | 'derived' | null
  export_delivery_mode: 'native' | 'fallback' | 'script' | 'derived' | null
}

export type InteropCapabilitiesResponse = {
  formats: InteropCapability[]
}

export function getInteropCapabilities(): Promise<InteropCapabilitiesResponse> {
  return api.get<InteropCapabilitiesResponse>('/interop/capabilities')
}

export type InteropJobSummary = {
  id: string
  kind: 'import' | 'ifc_import' | string
  format: string
  status: string
  filename: string
  error: string | null
  created_at: string | null
  completed_at: string | null
}

export type InteropArtifactSummary = {
  id: string
  project_id: string
  filename: string
  mime_type: string
  type: string
  source_kind: string
  source_id: string | null
  format: string
  tags: string[]
  uploaded_at: string
  download_url: string
}

export function listInteropJobs(projectId: string): Promise<InteropJobSummary[]> {
  return api.get<InteropJobSummary[]>(`/projects/${projectId}/interop/jobs`)
}

export function listInteropArtifacts(projectId: string): Promise<InteropArtifactSummary[]> {
  return api.get<InteropArtifactSummary[]>(`/projects/${projectId}/interop/artifacts`)
}
