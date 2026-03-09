import { parseSkp } from '@okp/skp-import'
import { buildSkpRubyScript } from '../skpExport.js'
import {
  applySkpComponentMapping,
  createSkpProtocol,
  type ComponentMappingEntry,
} from './cadProviderUtils.js'
import type { InteropProvider } from './types.js'

export const skpProvider: InteropProvider = {
  format: 'skp',
  getCapabilities() {
    return {
      format: 'skp',
      import_preview: true,
      import_execute: true,
      export_artifact: true,
      native_read: false,
      native_write: false,
      review_required_by_default: true,
      artifact_kind: 'script',
    }
  },
  async importPreview(request) {
    const payloadBuffer = typeof request.payload === 'string' ? Buffer.from(request.payload, 'utf8') : request.payload
    return parseSkp(payloadBuffer, request.filename)
  },
  async importExecute(request) {
    const payloadBuffer = typeof request.payload === 'string' ? Buffer.from(request.payload, 'utf8') : request.payload
    const parsedModel = parseSkp(payloadBuffer, request.filename)
    const mappedModel = applySkpComponentMapping(
      {
        ...parsedModel,
        project_id: request.projectId ?? '',
        import_job_id: request.importJobId ?? '',
      },
      request.mapping as Record<string, ComponentMappingEntry> | undefined,
    )
    const protocol = createSkpProtocol(mappedModel)

    return {
      format: 'skp',
      import_asset: mappedModel,
      protocol,
      warnings: [],
    }
  },
  async exportArtifact(request) {
    const payload = request.payload as {
      projectName: string
      wall_segments: Array<{ x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }>
      placements: Array<{ offset_mm: number; width_mm: number; depth_mm: number; height_mm?: number }>
      ceiling_height_mm: number
    }
    const body = buildSkpRubyScript(payload)
    const trimmed = request.filename?.trim() || 'okp-export.skp.rb'
    const filename = trimmed.toLowerCase().endsWith('.skp.rb')
      ? trimmed
      : trimmed.toLowerCase().endsWith('.skp')
        ? `${trimmed}.rb`
        : trimmed.toLowerCase().endsWith('.rb')
          ? trimmed
          : `${trimmed}.skp.rb`

    return {
      format: 'skp',
      content_type: 'application/ruby; charset=utf-8',
      filename,
      body,
      native: false,
      note: 'skp endpoint returns a SketchUp Ruby import script',
    }
  },
}
