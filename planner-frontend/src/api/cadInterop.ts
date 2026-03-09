export interface CadImportResponse {
  room_id: string
  wall_segments_count: number
  needs_review: boolean
  warnings: string[]
}

export interface CadExportUrls {
  formats: string[]
  urls: {
    dxf: string
    dwg: string
    gltf: string
    ifc: string
    skp: string
  }
}

export interface CadInteropHint {
  format: 'dwg' | 'skp'
  label: string
  deliveryMode: 'fallback' | 'script'
  note: string
}

export function listCadInteropHints(): CadInteropHint[] {
  return [
    {
      format: 'dwg',
      label: 'DWG Export (DXF-kompatibel)',
      deliveryMode: 'fallback',
      note: 'Der DWG-Endpunkt liefert derzeit ASCII-DXF-Inhalt fuer CAD-Kompatibilitaet.',
    },
    {
      format: 'skp',
      label: 'SKP Export (Ruby-Skript)',
      deliveryMode: 'script',
      note: 'Der SKP-Endpunkt liefert derzeit ein SketchUp-Ruby-Importskript.',
    },
  ]
}

export const cadInteropApi = {
  importDwg: async (projectId: string, file: File): Promise<CadImportResponse> => {
    const buffer = await file.arrayBuffer()
    const response = await fetch(`/api/v1/projects/${projectId}/import/dwg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Filename': file.name,
      },
      body: buffer,
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<CadImportResponse>
  },

  exportDwg: (alternativeId: string): void => {
    window.open(`/api/v1/alternatives/${alternativeId}/export/dwg`, '_blank')
  },

  exportSkp: (alternativeId: string): void => {
    window.open(`/api/v1/alternatives/${alternativeId}/export/skp`, '_blank')
  },

  getExportUrls: async (alternativeId: string): Promise<CadExportUrls> => {
    const response = await fetch(`/api/v1/alternatives/${alternativeId}/export?format=all`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<CadExportUrls>
  },
}
