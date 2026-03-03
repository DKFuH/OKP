import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'

const SheetBodySchema = z.object({
  name: z.string().min(1).max(100),
  sheet_type: z.enum(['floorplan', 'elevations', 'installation', 'detail', 'section']).default('floorplan'),
  position: z.number().int().default(0),
  config: z.record(z.unknown()).default({}),
})

const ViewBodySchema = z.object({
  view_type: z.enum(['floorplan', 'elevation', 'section', 'detail', 'isometric']),
  label: z.string().optional(),
  room_id: z.string().optional(),
  wall_id: z.string().optional(),
  clip_x_mm: z.number().optional(),
  clip_y_mm: z.number().optional(),
  clip_w_mm: z.number().optional(),
  clip_h_mm: z.number().optional(),
  scale: z.number().positive().default(1.0),
  x_on_sheet: z.number().default(0),
  y_on_sheet: z.number().default(0),
})

export async function layoutSheetRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/layout-sheets', async (request, reply) => {
    const project = await prisma.project.findUnique({ where: { id: request.params.id } })
    if (!project) return sendNotFound(reply, 'Project not found')

    const sheets = await prisma.layoutSheet.findMany({
      where: { project_id: request.params.id },
      include: { views: true },
      orderBy: { position: 'asc' },
    })
    return reply.send(sheets)
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof SheetBodySchema> }>(
    '/projects/:id/layout-sheets',
    async (request, reply) => {
      const project = await prisma.project.findUnique({ where: { id: request.params.id } })
      if (!project) return sendNotFound(reply, 'Project not found')

      const parsed = SheetBodySchema.safeParse(request.body)
      if (!parsed.success) return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')

      const sheet = await prisma.layoutSheet.create({
        data: {
          project_id: request.params.id,
          ...parsed.data,
          config: parsed.data.config as unknown as Prisma.InputJsonValue,
        },
      })
      return reply.status(201).send(sheet)
    },
  )

  app.delete<{ Params: { id: string } }>('/layout-sheets/:id', async (request, reply) => {
    const sheet = await prisma.layoutSheet.findUnique({ where: { id: request.params.id } })
    if (!sheet) return sendNotFound(reply, 'Layout sheet not found')

    await prisma.layoutSheet.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof ViewBodySchema> }>(
    '/layout-sheets/:id/views',
    async (request, reply) => {
      const sheet = await prisma.layoutSheet.findUnique({ where: { id: request.params.id } })
      if (!sheet) return sendNotFound(reply, 'Layout sheet not found')

      const parsed = ViewBodySchema.safeParse(request.body)
      if (!parsed.success) return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')

      const view = await prisma.layoutView.create({
        data: { sheet_id: request.params.id, ...parsed.data },
      })
      return reply.status(201).send(view)
    },
  )

  app.delete<{ Params: { id: string } }>('/layout-views/:id', async (request, reply) => {
    const view = await prisma.layoutView.findUnique({ where: { id: request.params.id } })
    if (!view) return sendNotFound(reply, 'Layout view not found')

    await prisma.layoutView.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })

  app.post<{ Params: { id: string } }>(
    '/projects/:id/layout-sheets/scaffold',
    async (request, reply) => {
      const project = await prisma.project.findUnique({ where: { id: request.params.id } })
      if (!project) return sendNotFound(reply, 'Project not found')

      const defaults = [
        { name: 'Grundriss', sheet_type: 'floorplan' as const, position: 0 },
        { name: 'Ansichten', sheet_type: 'elevations' as const, position: 1 },
        { name: 'Installationsplan', sheet_type: 'installation' as const, position: 2 },
      ]

      const created = await Promise.all(
        defaults.map((entry) =>
          prisma.layoutSheet.create({
            data: { project_id: request.params.id, ...entry, config: {} },
          }),
        ),
      )

      return reply.status(201).send(created)
    },
  )
}
