import { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { ExportPayload } from '@yakds/shared-schemas'
import { exportToDxf } from '@yakds/dxf-export'

import { sendBadRequest } from '../errors.js'

const PointSchema = z.object({
  x_mm: z.number(),
  y_mm: z.number(),
})

const ExportRequestSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  payload: z.object({
    room: z.object({
      boundary: z.array(
        z.object({
          id: z.string().min(1),
          x_mm: z.number(),
          y_mm: z.number(),
          index: z.number().int().nonnegative(),
        }),
      ).min(3),
    }),
    wallSegments: z.array(
      z.object({
        id: z.string().min(1),
        start: PointSchema,
        end: PointSchema,
        length_mm: z.number().positive(),
      }),
    ),
    openings: z.array(
      z.object({
        id: z.string().min(1),
        wall_id: z.string().min(1),
        offset_mm: z.number().min(0),
        width_mm: z.number().positive(),
        height_mm: z.number().positive().optional(),
        sill_height_mm: z.number().min(0).optional(),
        type: z.enum(['door', 'window', 'pass-through']).optional(),
        source: z.enum(['manual', 'cad_import']).optional(),
      }),
    ).default([]),
    furniture: z.array(
      z.object({
        id: z.string().min(1),
        footprintRect: z.object({
          min: PointSchema,
          max: PointSchema,
        }),
      }),
    ).default([]),
    includeFurniture: z.boolean().default(true),
  }),
})

function normalizeFilename(filename?: string): string {
  const trimmed = filename?.trim() || 'yakds-export.dxf'
  return trimmed.toLowerCase().endsWith('.dxf') ? trimmed : `${trimmed}.dxf`
}

export async function exportRoutes(app: FastifyInstance) {
  const handler = async (request: { body: unknown }, reply: FastifyReply) => {
    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const dxf = exportToDxf(parsed.data.payload as ExportPayload)
    const filename = normalizeFilename(parsed.data.filename)

    reply.header('content-disposition', `attachment; filename="${filename}"`)
    reply.type('application/dxf; charset=utf-8')
    return reply.send(dxf)
  }

  app.post('/exports/dxf', handler)
  app.post('/projects/:projectId/export-dxf', handler)
}
