export interface IfcImportResponse {
  job_id: string
  rooms_created: number
  warnings: string[]
}

export interface IfcJob {
  id: string
  project_id: string
  filename: string
  status: 'pending' | 'processing' | 'done' | 'failed' | string
  result: unknown
  error: string | null
  created_at: string
  updated_at: string
}

export interface IfcExportScope {
  level_id?: string
  section_line_id?: string
}

export const ifcInteropApi = {
  importIfc: async (projectId: string, file: File): Promise<IfcImportResponse> => {
    const buffer = await file.arrayBuffer()
    const response = await fetch(`/api/v1/projects/${projectId}/import/ifc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buffer,
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<IfcImportResponse>
  },

  exportIfc: async (alternativeId: string, scope?: IfcExportScope): Promise<void> => {
    const payload = {
      ...(scope?.level_id ? { level_id: scope.level_id } : {}),
      ...(scope?.section_line_id ? { section_line_id: scope.section_line_id } : {}),
    }

    const response = await fetch(`/api/v1/alternatives/${alternativeId}/export/ifc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alternative-${alternativeId}.ifc`
    link.click()
    URL.revokeObjectURL(url)
  },

  listJobs: async (projectId: string): Promise<IfcJob[]> => {
    const response = await fetch(`/api/v1/projects/${projectId}/ifc-jobs`)
    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<IfcJob[]>
  },
}
