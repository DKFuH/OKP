export type InteropFormat = 'dxf' | 'dwg' | 'skp' | 'ifc' | 'stl' | 'step' | 'obj' | '3mf'
export type InteropArtifactKind = 'cad' | 'bim' | 'script' | 'mesh'
export type InteropDeliveryMode = 'native' | 'fallback' | 'script' | 'derived'
export type InteropProviderKind = 'embedded' | 'plugin' | 'external'
export type InteropAvailability = 'stable' | 'experimental' | 'disabled'

export type InteropProtocolEntry = {
  entity_id: string | null
  status: 'imported' | 'ignored' | 'needs_review'
  reason: string
}

export type InteropCapability = {
  provider_id: string
  provider_kind: InteropProviderKind
  availability: InteropAvailability
  format: InteropFormat
  import_preview: boolean
  import_execute: boolean
  export_artifact: boolean
  native_read: boolean
  native_write: boolean
  review_required_by_default: boolean
  artifact_kind: InteropArtifactKind
  import_delivery_mode: InteropDeliveryMode | null
  export_delivery_mode: InteropDeliveryMode | null
}

export type InteropImportRequest = {
  projectId?: string
  importJobId?: string
  filename: string
  payload: Buffer | string
  mapping?: Record<string, unknown>
  rawUploadBase64?: string
}

export type InteropImportResult = {
  format: InteropFormat
  import_asset: unknown
  protocol: InteropProtocolEntry[]
  warnings: string[]
}

export type InteropExportRequest = {
  projectId: string
  filename?: string
  payload: unknown
}

export type InteropExportArtifact = {
  provider_id: string
  format: InteropFormat
  artifact_kind: InteropArtifactKind
  delivery_mode: InteropDeliveryMode
  content_type: string
  filename: string
  body: Buffer | string
  native: boolean
  review_required: boolean
  fallback_of?: InteropFormat
  note?: string
}

export interface InteropProvider {
  readonly format: InteropFormat
  getCapabilities(): InteropCapability
  importPreview?(request: Omit<InteropImportRequest, 'projectId' | 'importJobId' | 'mapping' | 'rawUploadBase64'>): Promise<unknown>
  importExecute?(request: InteropImportRequest): Promise<InteropImportResult>
  exportArtifact?(request: InteropExportRequest): Promise<InteropExportArtifact>
}
