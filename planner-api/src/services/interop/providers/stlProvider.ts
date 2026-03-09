import { buildStlString } from '../stlExport.js'
import type { InteropProvider } from './types.js'

export const stlProvider: InteropProvider = {
  format: 'stl',
  getCapabilities() {
    return {
      provider_id: 'core.stl',
      provider_kind: 'embedded',
      availability: 'stable',
      format: 'stl',
      import_preview: false,
      import_execute: false,
      export_artifact: true,
      native_read: false,
      native_write: true,
      review_required_by_default: false,
      artifact_kind: 'mesh',
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
        start?: { x_mm: number; y_mm: number }
        end?: { x_mm: number; y_mm: number }
        center?: { x_mm: number; y_mm: number }
        radius_mm?: number
        clockwise?: boolean
        thickness_mm?: number
      }>
      placements: Array<{ id?: string; offset_mm: number; width_mm: number; depth_mm: number; height_mm?: number }>
      ceiling_height_mm: number
    }
    const body = buildStlString(payload)
    const trimmed = request.filename?.trim() || 'okp-export.stl'
    const filename = trimmed.toLowerCase().endsWith('.stl') ? trimmed : `${trimmed}.stl`

    return {
      provider_id: 'core.stl',
      format: 'stl',
      artifact_kind: 'mesh',
      delivery_mode: 'native',
      content_type: 'model/stl; charset=utf-8',
      filename,
      body,
      native: true,
      review_required: false,
    }
  },
}
