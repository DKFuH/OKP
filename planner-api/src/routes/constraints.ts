import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { refreshRoomDimensions } from '../services/dimensionResolver.js'
import {
  solveConstraints,
  type Constraint,
  type PlacementPoint,
  type WallSegment,
} from '../services/constraintEngine.js'

const ConstraintTypeSchema = z.enum([
  'horizontal',
  'vertical',
  'parallel',
  'perpendicular',
  'coincident',
  'equal_length',
  'symmetry_axis',
  'driving_dimension',
])

const ConstraintBodySchema = z.object({
  type: ConstraintTypeSchema,
  target_refs: z.array(z.string().min(1)).min(1).max(8),
  value_json: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true),
})

const SolveQuerySchema = z.object({
  persist: z.coerce.boolean().optional().default(false),
})

type BoundaryJson = {
  vertices?: Array<{ id: string; x_mm: number; y_mm: number }>
  wall_segments?: Array<{
    id: string
    start_vertex_id?: string
    end_vertex_id?: string
  }>
}

type GeometryConstraintStore = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>
  create: (args: unknown) => Promise<Record<string, unknown>>
  update: (args: unknown) => Promise<Record<string, unknown>>
  delete: (args: unknown) => Promise<Record<string, unknown>>
}

function getConstraintStore(): GeometryConstraintStore {
  return (prisma as unknown as { geometryConstraint: GeometryConstraintStore }).geometryConstraint
}

async function loadRoomInTenant(roomId: string, tenantId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      project: {
        select: {
          tenant_id: true,
        },
      },
    },
  })

  if (!room) return null
  if (room.project?.tenant_id && room.project.tenant_id !== tenantId) return null
  return room
}

function toConstraintRecord(value: Record<string, unknown>): Constraint {
  const parsedType = ConstraintTypeSchema.safeParse(value.type)
  return {
    id: String(value.id),
    type: parsedType.success ? parsedType.data : 'horizontal',
    target_refs: Array.isArray(value.target_refs) ? value.target_refs.map((entry) => String(entry)) : [],
    value_json: (value.value_json as Record<string, unknown>) ?? {},
    enabled: Boolean(value.enabled ?? true),
  }
}

function extractWallSegments(boundary: BoundaryJson): WallSegment[] {
  const vertices = boundary.vertices ?? []
  const vertexMap = new Map(vertices.map((vertex) => [vertex.id, vertex]))
  const walls = boundary.wall_segments ?? []

  return walls
    .map((wall) => {
      const start = wall.start_vertex_id ? vertexMap.get(wall.start_vertex_id) : null
      const end = wall.end_vertex_id ? vertexMap.get(wall.end_vertex_id) : null
      if (!start || !end) {
        return null
      }
      return {
        id: wall.id,
        x0: start.x_mm,
        y0: start.y_mm,
        x1: end.x_mm,
        y1: end.y_mm,
      }
    })
    .filter((wall): wall is WallSegment => wall !== null)
}

function extractPlacements(rawPlacements: unknown): PlacementPoint[] {
  const placements = Array.isArray(rawPlacements) ? rawPlacements : []
  return placements.map((candidate) => {
    const value = (candidate ?? {}) as Record<string, unknown>
    const worldPos = (value.worldPos ?? {}) as Record<string, unknown>

    return {
      id: String(value.id ?? ''),
      x: Number(worldPos.x_mm ?? 0),
      y: Number(worldPos.y_mm ?? 0),
      wall_id: value.wall_id == null ? null : String(value.wall_id),
    }
  })
}

function applySolvedWallsToBoundary(boundary: BoundaryJson, solvedWalls: WallSegment[]): BoundaryJson {
  const vertices = [...(boundary.vertices ?? [])]
  const vertexIndexById = new Map(vertices.map((vertex, index) => [vertex.id, index]))
  const solvedMap = new Map(solvedWalls.map((wall) => [wall.id, wall]))

  for (const wall of boundary.wall_segments ?? []) {
    const solved = solvedMap.get(wall.id)
    if (!solved) continue

    if (wall.start_vertex_id) {
      const startIndex = vertexIndexById.get(wall.start_vertex_id)
      if (startIndex !== undefined) {
        vertices[startIndex] = { ...vertices[startIndex], x_mm: solved.x0, y_mm: solved.y0 }
      }
    }

    if (wall.end_vertex_id) {
      const endIndex = vertexIndexById.get(wall.end_vertex_id)
      if (endIndex !== undefined) {
        vertices[endIndex] = { ...vertices[endIndex], x_mm: solved.x1, y_mm: solved.y1 }
      }
    }
  }

  return {
    ...boundary,
    vertices,
  }
}

function applySolvedPlacements(rawPlacements: unknown, solvedPlacements: PlacementPoint[]): Record<string, unknown>[] {
  const placements = Array.isArray(rawPlacements) ? (rawPlacements as Record<string, unknown>[]) : []
  const solvedMap = new Map(solvedPlacements.map((placement) => [placement.id, placement]))

  return placements.map((placement) => {
    const solved = solvedMap.get(String(placement.id ?? ''))
    if (!solved) return placement
    return {
      ...placement,
      wall_id: solved.wall_id ?? placement.wall_id,
      worldPos: {
        x_mm: solved.x,
        y_mm: solved.y,
      },
    }
  })
}

export async function constraintRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/rooms/:id/constraints', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const store = getConstraintStore()
    const items = await store.findMany({
      where: {
        tenant_id: tenantId,
        room_id: request.params.id,
      },
      orderBy: { created_at: 'asc' },
    })

    return reply.send(items)
  })

  app.post<{ Params: { id: string } }>('/rooms/:id/constraints', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const room = await loadRoomInTenant(request.params.id, tenantId)
    if (!room) return sendNotFound(reply, 'Room not found')

    const parsed = ConstraintBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const store = getConstraintStore()
    const created = await store.create({
      data: {
        tenant_id: tenantId,
        room_id: request.params.id,
        type: parsed.data.type,
        target_refs: parsed.data.target_refs as unknown as Prisma.InputJsonValue,
        value_json: parsed.data.value_json as unknown as Prisma.InputJsonValue,
        enabled: parsed.data.enabled,
      },
    })

    return reply.status(201).send(created)
  })

  app.put<{ Params: { id: string } }>('/constraints/:id', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsed = ConstraintBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const store = getConstraintStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== tenantId) {
      return sendNotFound(reply, 'Constraint not found')
    }

    const updated = await store.update({
      where: { id: request.params.id },
      data: {
        type: parsed.data.type,
        target_refs: parsed.data.target_refs as unknown as Prisma.InputJsonValue,
        value_json: parsed.data.value_json as unknown as Prisma.InputJsonValue,
        enabled: parsed.data.enabled,
      },
    })

    return reply.send(updated)
  })

  app.delete<{ Params: { id: string } }>('/constraints/:id', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const store = getConstraintStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== tenantId) {
      return sendNotFound(reply, 'Constraint not found')
    }

    await store.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })

  app.post<{ Params: { id: string }; Querystring: { persist?: boolean } }>(
    '/rooms/:id/constraints/solve',
    async (request, reply) => {
      const tenantId = request.tenantId
      if (!tenantId) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
      }

      const queryParsed = SolveQuerySchema.safeParse(request.query ?? {})
      if (!queryParsed.success) {
        return sendBadRequest(reply, queryParsed.error.errors[0]?.message ?? 'Invalid query')
      }

      const room = await loadRoomInTenant(request.params.id, tenantId)
      if (!room) return sendNotFound(reply, 'Room not found')

      const store = getConstraintStore()
      const rawConstraints = await store.findMany({
        where: {
          tenant_id: tenantId,
          room_id: request.params.id,
          enabled: true,
        },
        orderBy: { created_at: 'asc' },
      })

      const constraints = rawConstraints.map(toConstraintRecord)
      const boundary = ((room.boundary as BoundaryJson) ?? {}) as BoundaryJson
      const wallSegments = extractWallSegments(boundary)
      const placements = extractPlacements(room.placements)

      const solved = solveConstraints({
        constraints,
        wallSegments,
        placements,
      })

      if (queryParsed.data.persist) {
        const nextBoundary = applySolvedWallsToBoundary(boundary, solved.wallSegments)
        const nextPlacements = applySolvedPlacements(room.placements, solved.placements)

        await prisma.room.update({
          where: { id: request.params.id },
          data: {
            boundary: nextBoundary as unknown as Prisma.InputJsonValue,
            placements: nextPlacements as unknown as Prisma.InputJsonValue,
          },
        })
        await refreshRoomDimensions(prisma, request.params.id)
      }

      return reply.send({
        room_id: request.params.id,
        persisted: queryParsed.data.persist,
        wall_segments: solved.wallSegments,
        placements: solved.placements,
        warnings: solved.warnings,
      })
    },
  )
}
