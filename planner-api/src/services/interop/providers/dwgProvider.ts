import { parseDwgBuffer } from '../dwgImport.js'
import { buildDwgBuffer } from '../dwgExport.js'
import { emptyCadImportAsset, type LayerMappingEntry } from './cadProviderUtils.js'
import type { InteropProtocolEntry, InteropProvider } from './types.js'

function mapLayerProtocol(layerMapping?: Record<string, LayerMappingEntry>): InteropProtocolEntry[] {
  return Object.entries(layerMapping ?? {}).map(([layerName, entry]) => ({
    entity_id: null,
    status: entry.action,
    reason: entry.reason ?? `Layer ${layerName} marked as ${entry.action}.`,
  }))
}

export const dwgProvider: InteropProvider = {
  format: 'dwg',
  getCapabilities() {
    return {
      format: 'dwg',
      import_preview: false,
      import_execute: true,
      export_artifact: true,
      native_read: false,
      native_write: false,
      review_required_by_default: true,
      artifact_kind: 'cad',
    }
  },
  async importExecute(request) {
    const payloadBuffer = typeof request.payload === 'string' ? Buffer.from(request.payload, 'utf8') : request.payload
    const parsedAsset = await parseDwgBuffer(payloadBuffer, request.filename)
    const protocol = [
      ...parsedAsset.warnings.map((warning) => ({
        entity_id: null,
        status: parsedAsset.needs_review ? ('needs_review' as const) : ('imported' as const),
        reason: warning,
      })),
      ...mapLayerProtocol(request.mapping as Record<string, LayerMappingEntry> | undefined),
    ]

    return {
      format: 'dwg',
      import_asset: {
        ...emptyCadImportAsset(
          request.importJobId ?? '',
          request.filename,
          'dwg',
          protocol,
          request.rawUploadBase64,
        ),
        wall_segments: parsedAsset.wall_segments,
        arc_entities_detected: parsedAsset.arc_entities_detected,
        needs_review: parsedAsset.needs_review,
        ...(request.mapping
          ? {
              mapping_state: {
                layers: request.mapping,
              },
            }
          : {}),
      },
      protocol,
      warnings: parsedAsset.warnings,
    }
  },
  async exportArtifact(request) {
    const payload = request.payload as {
      projectName: string
      wall_segments: Array<{ id: string; x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }>
      placements: Array<{ offset_mm: number; width_mm: number; depth_mm: number; wall_id: string }>
    }
    const body = buildDwgBuffer(payload)
    const trimmed = request.filename?.trim() || 'okp-export.dwg'
    const requestedFilename = trimmed.toLowerCase().endsWith('.dwg') ? trimmed : `${trimmed}.dwg`

    return {
      format: 'dwg',
      content_type: 'application/dxf; charset=utf-8',
      filename: requestedFilename.replace(/\.dwg$/i, '.dxf'),
      body,
      native: false,
      fallback_of: 'dwg',
      note: 'dwg endpoint currently returns ASCII DXF content for CAD compatibility',
    }
  },
}
