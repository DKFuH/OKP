import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'

type PlacementJson = {
  id: string
  visible?: boolean
  locked?: boolean
  lock_scope?: string | null
  [key: string]: unknown
}

type WallSegmentJson = {
  id: string
  is_hidden?: boolean
  visible?: boolean
  locked?: boolean
  lock_scope?: string | null
  [key: string]: unknown
}

type BoundaryJson = {
  wall_segments?: WallSegmentJson[]
  [key: string]: unknown
}

type MutableRoom = {
  id: string
  placements: PlacementJson[]
  boundary: BoundaryJson
}

const LockScopeSchema = z.enum(['manual', 'safe_edit', 'system'])

const VisibilityBodySchema = z.object({
  levels: z.array(z.object({ level_id: z.string().uuid(), visible: z.boolean() })).default([]),
  dimensions: z.array(z.object({ dimension_id: z.string().uuid(), visible: z.boolean() })).default([]),
  placements: z.array(z.object({ room_id: z.string().uuid(), placement_id: z.string().min(1), visible: z.boolean() })).default([]),
  walls: z.array(z.object({ room_id: z.string().uuid(), wall_id: z.string().min(1), visible: z.boolean() })).default([]),
})

const LocksBodySchema = z.object({
  levels: z.array(z.object({ level_id: z.string().uuid(), locked: z.boolean(), lock_scope: LockScopeSchema.optional() })).default([]),
  dimensions: z.array(z.object({ dimension_id: z.string().uuid(), locked: z.boolean(), lock_scope: LockScopeSchema.optional() })).default([]),
  placements: z.array(z.object({ room_id: z.string().uuid(), placement_id: z.string().min(1), locked: z.boolean(), lock_scope: LockScopeSchema.optional() })).default([]),
  walls: z.array(z.object({ room_id: z.string().uuid(), wall_id: z.string().min(1), locked: z.boolean(), lock_scope: LockScopeSchema.optional() })).default([]),
})

const AutoDollhousePatchSchema = z.object({
  enabled: z.boolean().optional(),
  alpha_front_walls: z.number().min(0.05).max(0.95).optional(),
  distance_threshold: z.number().int().min(300).max(12000).optional(),
  angle_threshold_deg: z.number().min(5).max(85).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
})

type AutoDollhouseSettings = {
  enabled: boolean
  alpha_front_walls: number
  distance_threshold: number
  angle_threshold_deg: number
}

const DEFAULT_AUTO_DOLLHOUSE_SETTINGS: AutoDollhouseSettings = {
  enabled: false,
  alpha_front_walls: 0.32,
  distance_threshold: 2400,
  angle_threshold_deg: 35,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function normalizeAutoDollhouseSettings(value: unknown): AutoDollhouseSettings {
  const config = asRecord(value)
  return {
    enabled: typeof config?.enabled === 'boolean' ? config.enabled : DEFAULT_AUTO_DOLLHOUSE_SETTINGS.enabled,
    alpha_front_walls:
      typeof config?.alpha_front_walls === 'number'
        ? Math.max(0.05, Math.min(0.95, config.alpha_front_walls))
        : DEFAULT_AUTO_DOLLHOUSE_SETTINGS.alpha_front_walls,
    distance_threshold:
      typeof config?.distance_threshold === 'number'
        ? Math.round(Math.max(300, Math.min(12000, config.distance_threshold)))
        : DEFAULT_AUTO_DOLLHOUSE_SETTINGS.distance_threshold,
    angle_threshold_deg:
      typeof config?.angle_threshold_deg === 'number'
        ? Math.max(5, Math.min(85, config.angle_threshold_deg))
        : DEFAULT_AUTO_DOLLHOUSE_SETTINGS.angle_threshold_deg,
  }
}

function resolveTenantId(request: {
  tenantId?: string | null
  headers?: Record<string, string | string[] | undefined>
}): string | null {
  if (request.tenantId) {
    return request.tenantId
  }

  const tenantHeader = request.headers?.['x-tenant-id']
  if (!tenantHeader) {
    return null
  }

  return Array.isArray(tenantHeader) ? (tenantHeader[0] ?? null) : tenantHeader
}

async function resolveScopedProject(projectId: string, tenantId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, tenant_id: true },
  })

  if (!project) {
    return null
  }

  if (project.tenant_id && project.tenant_id !== tenantId) {
    return null
  }

  return project
}

async function ensureDimensionInProject(dimensionId: string, projectId: string) {
  const dimension = await prisma.dimension.findUnique({
    where: { id: dimensionId },
    select: { id: true, room_id: true },
  })
  if (!dimension) {
    return null
  }

  const room = await prisma.room.findUnique({
    where: { id: dimension.room_id },
    select: { id: true, project_id: true },
  })

  if (!room || room.project_id !== projectId) {
    return null
  }

  return dimension
}

async function ensureMutableRoomInProject(
  roomCache: Map<string, MutableRoom>,
  roomId: string,
  projectId: string,
): Promise<MutableRoom | null> {
  const cached = roomCache.get(roomId)
  if (cached) {
    return cached
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, project_id: true, placements: true, boundary: true },
  })

  if (!room || room.project_id !== projectId) {
    return null
  }

  const mutable: MutableRoom = {
    id: room.id,
    placements: ((room.placements as PlacementJson[] | null) ?? []) as PlacementJson[],
    boundary: ((room.boundary as BoundaryJson | null) ?? {}) as BoundaryJson,
  }

  roomCache.set(roomId, mutable)
  return mutable
}

async function persistMutableRooms(roomCache: Map<string, MutableRoom>) {
  for (const room of roomCache.values()) {
    await prisma.room.update({
      where: { id: room.id },
      data: {
        placements: room.placements as unknown as object[],
        boundary: room.boundary as unknown as object,
      },
    })
  }
}

export async function visibilityRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/visibility/auto-dollhouse', async (request, reply) => {
    const tenantId = resolveTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const project = await resolveScopedProject(request.params.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const environment = await prisma.projectEnvironment.findUnique({
      where: { project_id: project.id },
      select: { config_json: true },
    })
    const configJson = asRecord(environment?.config_json)
    const settings = normalizeAutoDollhouseSettings(configJson?.auto_dollhouse)

    return reply.send({
      project_id: project.id,
      ...settings,
    })
  })

  app.patch<{ Params: { id: string } }>('/projects/:id/visibility/auto-dollhouse', async (request, reply) => {
    const tenantId = resolveTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = AutoDollhousePatchSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const project = await resolveScopedProject(request.params.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const existingEnvironment = await prisma.projectEnvironment.findUnique({
      where: { project_id: project.id },
      select: {
        config_json: true,
        north_angle_deg: true,
        latitude: true,
        longitude: true,
        timezone: true,
        default_datetime: true,
        daylight_enabled: true,
      },
    })

    const currentConfig = asRecord(existingEnvironment?.config_json) ?? {}
    const currentSettings = normalizeAutoDollhouseSettings(currentConfig.auto_dollhouse)
    const mergedSettings = normalizeAutoDollhouseSettings({
      ...currentSettings,
      ...parsed.data,
    })

    const nextConfig: Record<string, unknown> = {
      ...currentConfig,
      auto_dollhouse: mergedSettings,
    }

    await prisma.projectEnvironment.upsert({
      where: { project_id: project.id },
      update: {
        config_json: nextConfig as Prisma.InputJsonValue,
      },
      create: {
        tenant_id: tenantId,
        project_id: project.id,
        north_angle_deg: existingEnvironment?.north_angle_deg ?? 0,
        latitude: existingEnvironment?.latitude ?? null,
        longitude: existingEnvironment?.longitude ?? null,
        timezone: existingEnvironment?.timezone ?? null,
        default_datetime: existingEnvironment?.default_datetime ?? null,
        daylight_enabled: existingEnvironment?.daylight_enabled ?? true,
        config_json: nextConfig as Prisma.InputJsonValue,
      },
    })

    return reply.send({
      project_id: project.id,
      ...mergedSettings,
    })
  })

  app.post<{ Params: { id: string } }>('/projects/:id/visibility/apply', async (request, reply) => {
    const tenantId = resolveTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = VisibilityBodySchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const project = await resolveScopedProject(request.params.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const roomCache = new Map<string, MutableRoom>()
    const body = parsed.data

    for (const update of body.levels) {
      const level = await prisma.buildingLevel.findUnique({ where: { id: update.level_id } })
      if (!level || level.project_id !== project.id) {
        return sendNotFound(reply, `Level ${update.level_id} not found in project`) 
      }
      await prisma.buildingLevel.update({
        where: { id: update.level_id },
        data: { visible: update.visible },
      })
    }

    for (const update of body.dimensions) {
      const dimension = await ensureDimensionInProject(update.dimension_id, project.id)
      if (!dimension) {
        return sendNotFound(reply, `Dimension ${update.dimension_id} not found in project`)
      }

      await prisma.dimension.update({
        where: { id: dimension.id },
        data: { visible: update.visible },
      })
    }

    for (const update of body.placements) {
      const room = await ensureMutableRoomInProject(roomCache, update.room_id, project.id)
      if (!room) {
        return sendNotFound(reply, `Room ${update.room_id} not found in project`)
      }

      const idx = room.placements.findIndex((entry) => entry.id === update.placement_id)
      if (idx < 0) {
        return sendNotFound(reply, `Placement ${update.placement_id} not found in room ${update.room_id}`)
      }

      room.placements[idx] = {
        ...room.placements[idx],
        visible: update.visible,
      }
    }

    for (const update of body.walls) {
      const room = await ensureMutableRoomInProject(roomCache, update.room_id, project.id)
      if (!room) {
        return sendNotFound(reply, `Room ${update.room_id} not found in project`)
      }

      const segments = Array.isArray(room.boundary.wall_segments) ? room.boundary.wall_segments : []
      const idx = segments.findIndex((entry) => entry.id === update.wall_id)
      if (idx < 0) {
        return sendNotFound(reply, `Wall ${update.wall_id} not found in room ${update.room_id}`)
      }

      segments[idx] = {
        ...segments[idx],
        visible: update.visible,
        is_hidden: !update.visible,
      }
      room.boundary = { ...room.boundary, wall_segments: segments }
    }

    await persistMutableRooms(roomCache)

    return reply.send({
      updated: {
        levels: body.levels.length,
        dimensions: body.dimensions.length,
        placements: body.placements.length,
        walls: body.walls.length,
      },
    })
  })

  app.post<{ Params: { id: string } }>('/projects/:id/locks/apply', async (request, reply) => {
    const tenantId = resolveTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = LocksBodySchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const project = await resolveScopedProject(request.params.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const roomCache = new Map<string, MutableRoom>()
    const body = parsed.data

    for (const update of body.levels) {
      const level = await prisma.buildingLevel.findUnique({ where: { id: update.level_id } })
      if (!level || level.project_id !== project.id) {
        return sendNotFound(reply, `Level ${update.level_id} not found in project`)
      }

      await prisma.buildingLevel.update({
        where: { id: update.level_id },
        data: {
          locked: update.locked,
          lock_scope: update.locked ? (update.lock_scope ?? 'manual') : null,
        },
      })
    }

    for (const update of body.dimensions) {
      const dimension = await ensureDimensionInProject(update.dimension_id, project.id)
      if (!dimension) {
        return sendNotFound(reply, `Dimension ${update.dimension_id} not found in project`)
      }

      await prisma.dimension.update({
        where: { id: dimension.id },
        data: {
          locked: update.locked,
          lock_scope: update.locked ? (update.lock_scope ?? 'manual') : null,
        },
      })
    }

    for (const update of body.placements) {
      const room = await ensureMutableRoomInProject(roomCache, update.room_id, project.id)
      if (!room) {
        return sendNotFound(reply, `Room ${update.room_id} not found in project`)
      }

      const idx = room.placements.findIndex((entry) => entry.id === update.placement_id)
      if (idx < 0) {
        return sendNotFound(reply, `Placement ${update.placement_id} not found in room ${update.room_id}`)
      }

      room.placements[idx] = {
        ...room.placements[idx],
        locked: update.locked,
        lock_scope: update.locked ? (update.lock_scope ?? 'manual') : null,
      }
    }

    for (const update of body.walls) {
      const room = await ensureMutableRoomInProject(roomCache, update.room_id, project.id)
      if (!room) {
        return sendNotFound(reply, `Room ${update.room_id} not found in project`)
      }

      const segments = Array.isArray(room.boundary.wall_segments) ? room.boundary.wall_segments : []
      const idx = segments.findIndex((entry) => entry.id === update.wall_id)
      if (idx < 0) {
        return sendNotFound(reply, `Wall ${update.wall_id} not found in room ${update.room_id}`)
      }

      segments[idx] = {
        ...segments[idx],
        locked: update.locked,
        lock_scope: update.locked ? (update.lock_scope ?? 'manual') : null,
      }
      room.boundary = { ...room.boundary, wall_segments: segments }
    }

    await persistMutableRooms(roomCache)

    return reply.send({
      updated: {
        levels: body.levels.length,
        dimensions: body.dimensions.length,
        placements: body.placements.length,
        walls: body.walls.length,
      },
    })
  })
}
