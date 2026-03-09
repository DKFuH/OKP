import { api } from './client.js'

export type InteropCapability = {
  format: 'dxf' | 'dwg' | 'skp' | 'ifc' | string
  import_preview: boolean
  import_execute: boolean
  export_artifact: boolean
  native_read: boolean
  native_write: boolean
  review_required_by_default: boolean
  artifact_kind: 'cad' | 'bim' | 'script' | string
}

export type InteropCapabilitiesResponse = {
  formats: InteropCapability[]
}

export function getInteropCapabilities(): Promise<InteropCapabilitiesResponse> {
  return api.get<InteropCapabilitiesResponse>('/interop/capabilities')
}
