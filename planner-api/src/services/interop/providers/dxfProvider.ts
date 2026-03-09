import { exportToDxf } from '@okp/dxf-export'
import { parseDxf } from '@okp/dxf-import'
import type { ExportPayload } from '@okp/shared-schemas'
import {
  applyCadLayerMapping,
  createCadProtocol,
  type LayerMappingEntry,
} from './cadProviderUtils.js'
import type { InteropProvider } from './types.js'

export const dxfProvider: InteropProvider = {
  format: 'dxf',
  getCapabilities() {
    return {
      format: 'dxf',
      import_preview: true,
      import_execute: true,
      export_artifact: true,
      native_read: true,
      native_write: true,
      review_required_by_default: false,
      artifact_kind: 'cad',
    }
  },
  async importPreview(request) {
    const dxfText = typeof request.payload === 'string' ? request.payload : request.payload.toString('utf8')
    return parseDxf(dxfText, request.filename)
  },
  async importExecute(request) {
    const dxfText = typeof request.payload === 'string' ? request.payload : request.payload.toString('utf8')
    const parsedAsset = parseDxf(dxfText, request.filename)
    const mappedAsset = applyCadLayerMapping(
      {
        ...parsedAsset,
        import_job_id: request.importJobId ?? '',
        source_format: 'dxf',
      },
      request.mapping as Record<string, LayerMappingEntry> | undefined,
    )
    const protocol = createCadProtocol(mappedAsset, request.filename)

    return {
      format: 'dxf',
      import_asset: {
        ...mappedAsset,
        protocol,
      },
      protocol,
      warnings: [],
    }
  },
  async exportArtifact(request) {
    const dxf = exportToDxf(request.payload as ExportPayload)
    const trimmed = request.filename?.trim() || 'okp-export.dxf'
    const filename = trimmed.toLowerCase().endsWith('.dxf') ? trimmed : `${trimmed}.dxf`

    return {
      format: 'dxf',
      content_type: 'application/dxf; charset=utf-8',
      filename,
      body: dxf,
      native: true,
    }
  },
}
