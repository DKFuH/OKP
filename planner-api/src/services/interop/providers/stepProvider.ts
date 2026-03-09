import { buildStepString } from '../stepExport.js'
import type { InteropProvider } from './types.js'

export const stepProvider: InteropProvider = {
  format: 'step',
  getCapabilities() {
    return {
      provider_id: 'core.step',
      provider_kind: 'embedded',
      availability: 'experimental',
      format: 'step',
      import_preview: false,
      import_execute: false,
      export_artifact: true,
      native_read: false,
      native_write: true,
      review_required_by_default: false,
      artifact_kind: 'cad',
      import_delivery_mode: null,
      export_delivery_mode: 'native',
    }
  },
  async exportArtifact(request) {
    const payload = request.payload as {
      projectName: string
      wall_segments: Array<{
        id: string
        kind?: 'line' | 'arc'
        x0_mm?: number
        y0_mm?: number
        x1_mm?: number
        y1_mm?: number
      }>
      placements: Array<{ id?: string; offset_mm: number; width_mm: number; depth_mm: number; height_mm?: number }>
      ceiling_height_mm: number
    }
    const body = buildStepString(payload)
    const trimmed = request.filename?.trim() || 'okp-export.step'
    const filename = /\.(step|stp)$/i.test(trimmed) ? trimmed : `${trimmed}.step`

    return {
      provider_id: 'core.step',
      format: 'step',
      artifact_kind: 'cad',
      delivery_mode: 'native',
      content_type: 'application/step; charset=utf-8',
      filename,
      body,
      native: true,
      review_required: false,
      note: 'step endpoint currently returns a wireframe STEP exchange model',
    }
  },
}
