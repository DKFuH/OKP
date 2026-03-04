import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { calculateSunPreview } from '../services/sunPositionService.js'

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

const EnvironmentBodySchema = z.object({
  north_angle_deg: z.number().min(0).max(360).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  timezone: z.string().trim().min(1).max(60).nullable().optional(),
  default_datetime: z.string().datetime().nullable().optional(),
  daylight_enabled: z.boolean().optional(),
  config_json: z.record(z.unknown()).optional(),
})

const SunPreviewBodySchema = z.object({
  datetime: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  north_angle_deg: z.number().min(0).max(360).optional(),
})

async function ensureProjectInTenant(projectId: string, tenantId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      tenant_id: true,
    },
  })

  if (!project || project.tenant_id !== tenantId) {
    return null
  }

  return project
}

export async function projectEnvironmentRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/environment', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsedParams = ParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Ungültige Projekt-ID')
    }

    const project = await ensureProjectInTenant(parsedParams.data.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Projekt nicht gefunden')
    }

    const environment = await prisma.projectEnvironment.findUnique({
      where: { project_id: project.id },
    })

    if (environment) {
      return reply.send(environment)
    }

    return reply.send({
      tenant_id: tenantId,
      project_id: project.id,
      north_angle_deg: 0,
      latitude: null,
      longitude: null,
      timezone: null,
      default_datetime: null,
      daylight_enabled: true,
      config_json: {},
    })
  })

  app.put<{ Params: { id: string } }>('/projects/:id/environment', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsedParams = ParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Ungültige Projekt-ID')
    }

    const parsedBody = EnvironmentBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Environment-Daten')
    }

    const project = await ensureProjectInTenant(parsedParams.data.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Projekt nicht gefunden')
    }

    const existing = await prisma.projectEnvironment.findUnique({ where: { project_id: project.id } })
    const currentConfig = (existing?.config_json as Record<string, unknown> | null) ?? {}
    const nextConfig = parsedBody.data.config_json ? { ...currentConfig, ...parsedBody.data.config_json } : currentConfig

    const updated = await prisma.projectEnvironment.upsert({
      where: { project_id: project.id },
      update: {
        ...(parsedBody.data.north_angle_deg !== undefined ? { north_angle_deg: parsedBody.data.north_angle_deg } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'latitude') ? { latitude: parsedBody.data.latitude } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'longitude') ? { longitude: parsedBody.data.longitude } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'timezone') ? { timezone: parsedBody.data.timezone } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'default_datetime')
          ? { default_datetime: parsedBody.data.default_datetime ? new Date(parsedBody.data.default_datetime) : null }
          : {}),
        ...(parsedBody.data.daylight_enabled !== undefined ? { daylight_enabled: parsedBody.data.daylight_enabled } : {}),
        config_json: nextConfig as Prisma.InputJsonValue,
      },
      create: {
        tenant_id: tenantId,
        project_id: project.id,
        north_angle_deg: parsedBody.data.north_angle_deg ?? 0,
        latitude: Object.prototype.hasOwnProperty.call(parsedBody.data, 'latitude') ? parsedBody.data.latitude : null,
        longitude: Object.prototype.hasOwnProperty.call(parsedBody.data, 'longitude') ? parsedBody.data.longitude : null,
        timezone: Object.prototype.hasOwnProperty.call(parsedBody.data, 'timezone') ? parsedBody.data.timezone : null,
        default_datetime:
          Object.prototype.hasOwnProperty.call(parsedBody.data, 'default_datetime') && parsedBody.data.default_datetime
            ? new Date(parsedBody.data.default_datetime)
            : null,
        daylight_enabled: parsedBody.data.daylight_enabled ?? true,
        config_json: nextConfig as Prisma.InputJsonValue,
      },
    })

    return reply.send(updated)
  })

  app.post<{ Params: { id: string } }>('/projects/:id/environment/sun-preview', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsedParams = ParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Ungültige Projekt-ID')
    }

    const parsedBody = SunPreviewBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Preview-Daten')
    }

    const project = await ensureProjectInTenant(parsedParams.data.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Projekt nicht gefunden')
    }

    const environment = await prisma.projectEnvironment.findUnique({ where: { project_id: project.id } })

    const latitude = parsedBody.data.latitude ?? environment?.latitude ?? null
    const longitude = parsedBody.data.longitude ?? environment?.longitude ?? null
    const northAngleDeg = parsedBody.data.north_angle_deg ?? environment?.north_angle_deg ?? 0
    const daylightEnabled = environment?.daylight_enabled ?? true
    const datetime =
      (parsedBody.data.datetime ? new Date(parsedBody.data.datetime) : null) ??
      environment?.default_datetime ??
      new Date()

    if (latitude == null || longitude == null) {
      return sendBadRequest(reply, 'Latitude und Longitude erforderlich')
    }

    const preview = calculateSunPreview({
      datetime,
      latitude,
      longitude,
      northAngleDeg,
      daylightEnabled,
    })

    return reply.send({
      datetime: datetime.toISOString(),
      latitude,
      longitude,
      north_angle_deg: northAngleDeg,
      ...preview,
    })
  })
}
