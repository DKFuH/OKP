export type InteropFormat = 'dxf' | 'dwg' | 'skp' | 'ifc'

export type InteropProtocolEntry = {
  entity_id: string | null
  status: 'imported' | 'ignored' | 'needs_review'
  reason: string
}

export type InteropCapability = {
  format: InteropFormat
  import_preview: boolean
  import_execute: boolean
  export_artifact: boolean
  native_read: boolean
  native_write: boolean
  review_required_by_default: boolean
  artifact_kind: 'cad' | 'bim' | 'script'
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
  format: InteropFormat
  content_type: string
  filename: string
  body: Buffer | string
  native: boolean
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
