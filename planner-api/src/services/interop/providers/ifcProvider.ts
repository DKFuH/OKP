import { buildIfcBuffer, parseIfcRooms } from '../../ifcEngine.js'
import type { InteropProvider } from './types.js'

export const ifcProvider: InteropProvider = {
  format: 'ifc',
  getCapabilities() {
    return {
      format: 'ifc',
      import_preview: false,
      import_execute: true,
      export_artifact: true,
      native_read: true,
      native_write: true,
      review_required_by_default: false,
      artifact_kind: 'bim',
    }
  },
  async importExecute(request) {
    const payloadBuffer = typeof request.payload === 'string' ? Buffer.from(request.payload, 'utf8') : request.payload
    const parsedRooms = await parseIfcRooms(payloadBuffer)
    const warnings = parsedRooms
      .filter((room) => room.wall_segments.length === 0)
      .map((room) => `Raum "${room.name}" hat keine Wandsegmente und benoetigt Review`)
    const protocol = warnings.map((warning) => ({
      entity_id: null,
      status: 'needs_review' as const,
      reason: warning,
    }))

    return {
      format: 'ifc',
      import_asset: {
        source_format: 'ifc',
        source_filename: request.filename,
        parsed_rooms: parsedRooms,
      },
      protocol,
      warnings,
    }
  },
  async exportArtifact(request) {
    const payload = request.payload as {
      projectName: string
      rooms: unknown[]
      metadata?: Record<string, unknown>
      alternativeId: string
    }
    const body = await buildIfcBuffer({
      projectName: payload.projectName,
      rooms: payload.rooms as never[],
      metadata: payload.metadata as never,
    })

    return {
      format: 'ifc',
      content_type: 'application/x-step',
      filename: `alternative-${payload.alternativeId}.ifc`,
      body,
      native: true,
    }
  },
}
