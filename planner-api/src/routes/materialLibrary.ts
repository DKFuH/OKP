import type { FastifyInstance, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { resolveMaterialAssignment, type MaterialCategory } from '../services/materialResolver.js'

const MaterialCategorySchema = z.enum(['floor', 'wall', 'front', 'worktop', 'custom'])
const SurfaceTargetSchema = z.enum(['floor', 'ceiling', 'wall_north', 'wall_south', 'wall_east', 'wall_west'])

const MaterialListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  category: MaterialCategorySchema.optional(),
})

const MaterialCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(140),
  category: MaterialCategorySchema,
  texture_url: z.string().url().nullable().optional(),
  preview_url: z.string().url().nullable().optional(),
  scale_x_mm: z.number().positive().nullable().optional(),
  scale_y_mm: z.number().positive().nullable().optional(),
  rotation_deg: z.number().min(0).max(360).optional(),
  roughness: z.number().min(0).max(1).nullable().optional(),
  metallic: z.number().min(0).max(1).nullable().optional(),
  config_json: z.record(z.unknown()).optional(),
})

const MaterialPatchBodySchema = z.object({
  name: z.string().trim().min(1).max(140).optional(),
  category: MaterialCategorySchema.optional(),
  texture_url: z.string().url().nullable().optional(),
  preview_url: z.string().url().nullable().optional(),
  scale_x_mm: z.number().positive().nullable().optional(),
  scale_y_mm: z.number().positive().nullable().optional(),
  rotation_deg: z.number().min(0).max(360).optional(),
  roughness: z.number().min(0).max(1).nullable().optional(),
  metallic: z.number().min(0).max(1).nullable().optional(),
  config_json: z.record(z.unknown()).optional(),
})

const MaterialSurfaceAssignmentSchema = z.object({
  surface: SurfaceTargetSchema,
  material_item_id: z.string().uuid().nullable().optional(),
  uv_scale: z
    .object({
      x: z.number().positive(),
      y: z.number().positive(),
    })
    .optional(),
  rotation_deg: z.number().min(0).max(360).optional(),
})

const MaterialPlacementAssignmentSchema = z.object({
  placement_id: z.string().min(1),
  target_kind: z.enum(['placement', 'asset']).default('placement'),
  material_item_id: z.string().uuid().nullable().optional(),
  uv_scale: z
    .object({
      x: z.number().positive(),
      y: z.number().positive(),
    })
    .optional(),
  rotation_deg: z.number().min(0).max(360).optional(),
})

const ProjectMaterialAssignmentsBodySchema = z
  .object({
    room_id: z.string().uuid(),
    surface_assignments: z.array(MaterialSurfaceAssignmentSchema).max(16).default([]),
    placement_assignments: z.array(MaterialPlacementAssignmentSchema).max(500).default([]),
  })
  .refine(
    (value) => value.surface_assignments.length > 0 || value.placement_assignments.length > 0,
    'Mindestens eine Surface- oder Placement-Zuweisung ist erforderlich',
  )

type RoomSurfaceEntry = {
  surface: 'floor' | 'ceiling' | 'wall_north' | 'wall_south' | 'wall_east' | 'wall_west'
  color_hex?: string
  material_id?: string
  texture_url?: string
  uv_scale?: { x: number; y: number }
  rotation_deg?: number
  roughness?: number
  metallic?: number
}

type RoomColoringPayload = {
  surfaces: RoomSurfaceEntry[]
}

type PlacementPayload = {
  id?: string
  [key: string]: unknown
}

function ensureTenantScope(tenantId: string | null | undefined, reply: FastifyReply): tenantId is string {
  if (tenantId) return true
  reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
  return false
}

function categoryForSurface(surface: RoomSurfaceEntry['surface']): MaterialCategory {
  if (surface === 'floor') return 'floor'
  return 'wall'
}

function categoryForPlacement(targetKind: 'placement' | 'asset'): MaterialCategory {
  if (targetKind === 'asset') return 'custom'
  return 'front'
}

function parseRoomColoring(input: unknown): RoomColoringPayload {
  if (!input || typeof input !== 'object') {
    return { surfaces: [] }
  }
  const candidate = input as { surfaces?: unknown }
  if (!Array.isArray(candidate.surfaces)) {
    return { surfaces: [] }
  }
  return {
    surfaces: candidate.surfaces
      .filter(
        (entry): entry is RoomSurfaceEntry =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as RoomSurfaceEntry).surface === 'string',
      )
      .map((entry) => ({ ...entry })),
  }
}

function parsePlacements(input: unknown): PlacementPayload[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((entry): entry is PlacementPayload => !!entry && typeof entry === 'object')
    .map((entry) => ({ ...entry }))
}

function mergeConfigJson(
  existing: unknown,
  patch?: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base = existing && typeof existing === 'object' ? (existing as Record<string, unknown>) : {}
  if (!patch) return base as Prisma.InputJsonValue
  return {
    ...base,
    ...patch,
  } as Prisma.InputJsonValue
}

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

export async function materialLibraryRoutes(app: FastifyInstance) {
  app.get('/tenant/materials', async (request, reply) => {
    if (!ensureTenantScope(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedQuery = MaterialListQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return sendBadRequest(reply, parsedQuery.error.errors[0]?.message ?? 'Ungültige Filter')
    }

    const items = await prisma.materialLibraryItem.findMany({
      where: {
        tenant_id: tenantId,
        ...(parsedQuery.data.category ? { category: parsedQuery.data.category } : {}),
      },
      orderBy: { updated_at: 'desc' },
    })

    const query = parsedQuery.data.q?.toLowerCase()
    if (!query) {
      return reply.send(items)
    }

    const filtered = items.filter((item) => {
      return `${item.name} ${item.category}`.toLowerCase().includes(query)
    })

    return reply.send(filtered)
  })

  app.post('/tenant/materials', async (request, reply) => {
    if (!ensureTenantScope(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedBody = MaterialCreateBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Materialdaten')
    }

    const created = await prisma.materialLibraryItem.create({
      data: {
        tenant_id: tenantId,
        name: parsedBody.data.name,
        category: parsedBody.data.category,
        texture_url: parsedBody.data.texture_url ?? null,
        preview_url: parsedBody.data.preview_url ?? null,
        scale_x_mm: parsedBody.data.scale_x_mm ?? null,
        scale_y_mm: parsedBody.data.scale_y_mm ?? null,
        rotation_deg: parsedBody.data.rotation_deg ?? 0,
        roughness: parsedBody.data.roughness ?? null,
        metallic: parsedBody.data.metallic ?? null,
        config_json: mergeConfigJson({}, parsedBody.data.config_json),
      },
    })

    return reply.status(201).send(created)
  })

  app.patch<{ Params: { id: string } }>('/tenant/materials/:id', async (request, reply) => {
    if (!ensureTenantScope(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedBody = MaterialPatchBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Materialdaten')
    }

    const existing = await prisma.materialLibraryItem.findUnique({ where: { id: request.params.id } })
    if (!existing || existing.tenant_id !== tenantId) {
      return sendNotFound(reply, 'Material nicht gefunden')
    }

    const updated = await prisma.materialLibraryItem.update({
      where: { id: request.params.id },
      data: {
        ...(parsedBody.data.name ? { name: parsedBody.data.name } : {}),
        ...(parsedBody.data.category ? { category: parsedBody.data.category } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'texture_url')
          ? { texture_url: parsedBody.data.texture_url ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'preview_url')
          ? { preview_url: parsedBody.data.preview_url ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'scale_x_mm')
          ? { scale_x_mm: parsedBody.data.scale_x_mm ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'scale_y_mm')
          ? { scale_y_mm: parsedBody.data.scale_y_mm ?? null }
          : {}),
        ...(parsedBody.data.rotation_deg !== undefined ? { rotation_deg: parsedBody.data.rotation_deg } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'roughness')
          ? { roughness: parsedBody.data.roughness ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'metallic')
          ? { metallic: parsedBody.data.metallic ?? null }
          : {}),
        ...(parsedBody.data.config_json
          ? { config_json: mergeConfigJson(existing.config_json, parsedBody.data.config_json) }
          : {}),
      },
    })

    return reply.send(updated)
  })

  app.delete<{ Params: { id: string } }>('/tenant/materials/:id', async (request, reply) => {
    if (!ensureTenantScope(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const existing = await prisma.materialLibraryItem.findUnique({ where: { id: request.params.id } })
    if (!existing || existing.tenant_id !== tenantId) {
      return sendNotFound(reply, 'Material nicht gefunden')
    }

    await prisma.materialLibraryItem.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })

  app.post<{ Params: { id: string } }>('/projects/:id/material-assignments', async (request, reply) => {
    if (!ensureTenantScope(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedBody = ProjectMaterialAssignmentsBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Materialzuweisungen')
    }

    const project = await ensureProjectInTenant(request.params.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Projekt nicht gefunden')
    }

    const room = await prisma.room.findUnique({
      where: { id: parsedBody.data.room_id },
      select: {
        id: true,
        project_id: true,
        coloring: true,
        placements: true,
      },
    })

    if (!room || room.project_id !== project.id) {
      return sendBadRequest(reply, 'Raum gehört nicht zum Projekt')
    }

    const requestedMaterialIds = [
      ...parsedBody.data.surface_assignments.map((entry) => entry.material_item_id).filter((value): value is string => !!value),
      ...parsedBody.data.placement_assignments.map((entry) => entry.material_item_id).filter((value): value is string => !!value),
    ]

    const uniqueMaterialIds = [...new Set(requestedMaterialIds)]

    const materialItems = uniqueMaterialIds.length > 0
      ? await prisma.materialLibraryItem.findMany({
          where: {
            tenant_id: tenantId,
            id: { in: uniqueMaterialIds },
          },
        })
      : []

    const materialById = new Map(materialItems.map((entry) => [entry.id, entry]))
    const missing = uniqueMaterialIds.filter((id) => !materialById.has(id))
    if (missing.length > 0) {
      return sendBadRequest(reply, 'Mindestens ein Material gehört nicht zum Tenant oder existiert nicht')
    }

    const coloring = parseRoomColoring(room.coloring)
    const placements = parsePlacements(room.placements)

    const resolvedSurfaces: Array<{ surface: string; material: ReturnType<typeof resolveMaterialAssignment> }> = []
    const resolvedPlacements: Array<{ placement_id: string; material: ReturnType<typeof resolveMaterialAssignment> }> = []

    for (const assignment of parsedBody.data.surface_assignments) {
      const material = assignment.material_item_id ? materialById.get(assignment.material_item_id) ?? null : null
      const resolved = resolveMaterialAssignment({
        assignment,
        materialItem: material ?? undefined,
        fallbackCategory: categoryForSurface(assignment.surface),
      })

      const index = coloring.surfaces.findIndex((entry) => entry.surface === assignment.surface)
      const previous = index >= 0 ? coloring.surfaces[index] : { surface: assignment.surface }
      const nextEntry: RoomSurfaceEntry = {
        ...previous,
        surface: assignment.surface,
        material_id: resolved.material_item_id ?? undefined,
        texture_url: resolved.texture_url ?? undefined,
        color_hex: previous.color_hex ?? resolved.color_hex,
        uv_scale: resolved.uv_scale,
        rotation_deg: resolved.rotation_deg,
        roughness: resolved.roughness,
        metallic: resolved.metallic,
      }

      if (index >= 0) {
        coloring.surfaces[index] = nextEntry
      } else {
        coloring.surfaces.push(nextEntry)
      }

      resolvedSurfaces.push({ surface: assignment.surface, material: resolved })
    }

    for (const assignment of parsedBody.data.placement_assignments) {
      const targetIndex = placements.findIndex((placement) => placement.id === assignment.placement_id)
      if (targetIndex < 0) {
        return sendBadRequest(reply, `Placement ${assignment.placement_id} nicht gefunden`) 
      }

      const material = assignment.material_item_id ? materialById.get(assignment.material_item_id) ?? null : null
      const resolved = resolveMaterialAssignment({
        assignment,
        materialItem: material ?? undefined,
        fallbackCategory: categoryForPlacement(assignment.target_kind),
      })

      const placement = placements[targetIndex]
      const currentAssignment =
        placement.material_assignment && typeof placement.material_assignment === 'object'
          ? (placement.material_assignment as Record<string, unknown>)
          : {}

      placements[targetIndex] = {
        ...placement,
        material_assignment: {
          ...currentAssignment,
          target_kind: assignment.target_kind,
          material_item_id: resolved.material_item_id,
          texture_url: resolved.texture_url,
          color_hex: resolved.color_hex,
          roughness: resolved.roughness,
          metallic: resolved.metallic,
          uv_scale: resolved.uv_scale,
          rotation_deg: resolved.rotation_deg,
        },
      }

      resolvedPlacements.push({ placement_id: assignment.placement_id, material: resolved })
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: {
        coloring: coloring as unknown as Prisma.InputJsonValue,
        placements: placements as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        coloring: true,
        placements: true,
      },
    })

    return reply.send({
      room_id: updated.id,
      coloring: updated.coloring,
      placements: updated.placements,
      resolved: {
        surfaces: resolvedSurfaces,
        placements: resolvedPlacements,
      },
    })
  })
}
