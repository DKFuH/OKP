import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendConflict, sendForbidden, sendNotFound } from '../errors.js'

const EntityRouteParamSchema = z.object({
  entity: z.enum(['customers', 'suppliers', 'locations']),
})

const RecordIdParamSchema = z.object({
  entity: z.enum(['customers', 'suppliers', 'locations']),
  id: z.string().uuid(),
})

const CreateRegistryRecordSchema = z.object({
  external_ref: z.string().min(1).max(200).optional(),
  payload_json: z.record(z.unknown()).default({}),
})

const UpdateRegistryRecordSchema = z.object({
  expected_version: z.number().int().min(1),
  external_ref: z.string().min(1).max(200).nullable().optional(),
  payload_json: z.record(z.unknown()).optional(),
  is_deleted: z.boolean().optional(),
})

const DeltaQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
})

const SyncAckSchema = z.object({
  target_system: z.string().min(1).max(120),
  last_sync_cursor: z.string().datetime().optional(),
  scope_json: z.record(z.unknown()).optional(),
})

const ConflictQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).optional(),
})

const ResolveConflictParamsSchema = z.object({
  id: z.string().uuid(),
})

const ResolveConflictBodySchema = z.object({
  resolution: z.enum(['resolved', 'dismissed']),
  resolved_by: z.string().min(1).max(120),
})

function getTenantId(request: { tenantId?: string | null; headers?: Record<string, string | string[] | undefined> }): string | null {
  if (request.tenantId) {
    return request.tenantId
  }

  const headerValue = request.headers?.['x-tenant-id']
  if (!headerValue) {
    return null
  }
  return Array.isArray(headerValue) ? (headerValue[0] ?? null) : headerValue
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toEntityType(entity: 'customers' | 'suppliers' | 'locations'): 'customer' | 'supplier' | 'location' {
  if (entity === 'customers') return 'customer'
  if (entity === 'suppliers') return 'supplier'
  return 'location'
}

type RegistryRecord = {
  id: string
  tenant_id: string
  external_ref: string | null
  payload_json: unknown
  version: number
  is_deleted: boolean
  updated_at: Date
}

function listRecords(entity: 'customers' | 'suppliers' | 'locations', tenantId: string) {
  switch (entity) {
    case 'customers':
      return prisma.masterCustomer.findMany({ where: { tenant_id: tenantId }, orderBy: [{ updated_at: 'desc' }] })
    case 'suppliers':
      return prisma.masterSupplier.findMany({ where: { tenant_id: tenantId }, orderBy: [{ updated_at: 'desc' }] })
    case 'locations':
      return prisma.masterLocation.findMany({ where: { tenant_id: tenantId }, orderBy: [{ updated_at: 'desc' }] })
  }
}

function createRecord(
  entity: 'customers' | 'suppliers' | 'locations',
  data: {
    tenant_id: string
    external_ref: string | null
    payload_json: Prisma.InputJsonValue
    version: number
  },
) {
  switch (entity) {
    case 'customers':
      return prisma.masterCustomer.create({ data })
    case 'suppliers':
      return prisma.masterSupplier.create({ data })
    case 'locations':
      return prisma.masterLocation.create({ data })
  }
}

function findRecord(entity: 'customers' | 'suppliers' | 'locations', id: string, tenantId: string) {
  switch (entity) {
    case 'customers':
      return prisma.masterCustomer.findFirst({ where: { id, tenant_id: tenantId } })
    case 'suppliers':
      return prisma.masterSupplier.findFirst({ where: { id, tenant_id: tenantId } })
    case 'locations':
      return prisma.masterLocation.findFirst({ where: { id, tenant_id: tenantId } })
  }
}

function updateRecord(
  entity: 'customers' | 'suppliers' | 'locations',
  id: string,
  data: {
    external_ref?: string | null
    payload_json?: Prisma.InputJsonValue
    is_deleted?: boolean
    version: number
  },
) {
  switch (entity) {
    case 'customers':
      return prisma.masterCustomer.update({ where: { id }, data })
    case 'suppliers':
      return prisma.masterSupplier.update({ where: { id }, data })
    case 'locations':
      return prisma.masterLocation.update({ where: { id }, data })
  }
}

export async function masterdataRoutes(app: FastifyInstance) {
  app.get<{ Params: { entity: 'customers' | 'suppliers' | 'locations' } }>(
    '/masterdata/:entity',
    async (request, reply) => {
      const tenantId = getTenantId(request)
      if (!tenantId) {
        return sendForbidden(reply, 'Tenant scope is required')
      }

      const params = EntityRouteParamSchema.safeParse(request.params)
      if (!params.success) {
        return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid entity route')
      }

      const records = await listRecords(params.data.entity, tenantId)

      return reply.send(records)
    },
  )

  app.post<{ Params: { entity: 'customers' | 'suppliers' | 'locations' } }>(
    '/masterdata/:entity',
    async (request, reply) => {
      const tenantId = getTenantId(request)
      if (!tenantId) {
        return sendForbidden(reply, 'Tenant scope is required')
      }

      const params = EntityRouteParamSchema.safeParse(request.params)
      if (!params.success) {
        return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid entity route')
      }

      const parsedBody = CreateRegistryRecordSchema.safeParse(request.body)
      if (!parsedBody.success) {
        return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
      }

      const created = await createRecord(params.data.entity, {
        tenant_id: tenantId,
        external_ref: normalizeNullableText(parsedBody.data.external_ref) ?? null,
        payload_json: parsedBody.data.payload_json as Prisma.InputJsonValue,
        version: 1,
      })

      return reply.status(201).send(created)
    },
  )

  app.patch<{ Params: { entity: 'customers' | 'suppliers' | 'locations'; id: string } }>(
    '/masterdata/:entity/:id',
    async (request, reply) => {
      const tenantId = getTenantId(request)
      if (!tenantId) {
        return sendForbidden(reply, 'Tenant scope is required')
      }

      const params = RecordIdParamSchema.safeParse(request.params)
      if (!params.success) {
        return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid route params')
      }

      const parsedBody = UpdateRegistryRecordSchema.safeParse(request.body)
      if (!parsedBody.success) {
        return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
      }

      const existing = await findRecord(params.data.entity, params.data.id, tenantId)

      if (!existing) {
        return sendNotFound(reply, 'Masterdata record not found in tenant scope')
      }

      if (existing.version !== parsedBody.data.expected_version) {
        await prisma.masterSyncConflict.create({
          data: {
            tenant_id: tenantId,
            entity_type: toEntityType(params.data.entity),
            entity_id: params.data.id,
            expected_version: parsedBody.data.expected_version,
            actual_version: existing.version,
            incoming_payload:
              parsedBody.data.payload_json !== undefined
                ? (parsedBody.data.payload_json as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            status: 'open',
          },
        })

        return sendConflict(
          reply,
          `Version mismatch for ${params.data.entity}: expected ${parsedBody.data.expected_version}, actual ${existing.version}`,
        )
      }

      const updated = await updateRecord(params.data.entity, params.data.id, {
        ...(parsedBody.data.external_ref !== undefined
          ? { external_ref: normalizeNullableText(parsedBody.data.external_ref) ?? null }
          : {}),
        ...(parsedBody.data.payload_json !== undefined
          ? { payload_json: parsedBody.data.payload_json as Prisma.InputJsonValue }
          : {}),
        ...(parsedBody.data.is_deleted !== undefined ? { is_deleted: parsedBody.data.is_deleted } : {}),
        version: existing.version + 1,
      })

      return reply.send(updated)
    },
  )

  app.get<{ Querystring: { cursor?: string; limit?: number } }>('/masterdata/sync/delta', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const query = DeltaQuerySchema.safeParse(request.query)
    if (!query.success) {
      return sendBadRequest(reply, query.error.errors[0]?.message ?? 'Invalid query')
    }

    const cursorDate = query.data.cursor ? new Date(query.data.cursor) : null
    if (cursorDate && Number.isNaN(cursorDate.getTime())) {
      return sendBadRequest(reply, 'Invalid cursor')
    }

    const baseWhere = cursorDate
      ? {
          tenant_id: tenantId,
          updated_at: { gt: cursorDate },
        }
      : {
          tenant_id: tenantId,
        }

    const [customers, suppliers, locations] = await Promise.all([
      prisma.masterCustomer.findMany({ where: baseWhere }),
      prisma.masterSupplier.findMany({ where: baseWhere }),
      prisma.masterLocation.findMany({ where: baseWhere }),
    ])

    const mapped = [
      ...customers.map((item) => ({ entity_type: 'customer' as const, ...item })),
      ...suppliers.map((item) => ({ entity_type: 'supplier' as const, ...item })),
      ...locations.map((item) => ({ entity_type: 'location' as const, ...item })),
    ]
      .sort((a, b) => a.updated_at.getTime() - b.updated_at.getTime())
      .slice(0, query.data.limit)

    const nextCursor = mapped.length > 0
      ? mapped[mapped.length - 1].updated_at.toISOString()
      : (cursorDate?.toISOString() ?? new Date(0).toISOString())

    return reply.send({
      cursor: query.data.cursor ?? null,
      next_cursor: nextCursor,
      changes: mapped,
    })
  })

  app.post('/masterdata/sync/ack', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedBody = SyncAckSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
    }

    const syncCursor = parsedBody.data.last_sync_cursor ? new Date(parsedBody.data.last_sync_cursor) : null
    if (syncCursor && Number.isNaN(syncCursor.getTime())) {
      return sendBadRequest(reply, 'Invalid last_sync_cursor')
    }

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.masterSyncSubscription.upsert({
        where: {
          tenant_id_target_system: {
            tenant_id: tenantId,
            target_system: parsedBody.data.target_system,
          },
        },
        update: {
          scope_json: (parsedBody.data.scope_json ?? {}) as Prisma.InputJsonValue,
          last_sync_cursor: syncCursor,
          status: 'active',
        },
        create: {
          tenant_id: tenantId,
          target_system: parsedBody.data.target_system,
          scope_json: (parsedBody.data.scope_json ?? {}) as Prisma.InputJsonValue,
          last_sync_cursor: syncCursor,
          status: 'active',
        },
      })

      const checkpoint = await tx.masterSyncCheckpoint.upsert({
        where: {
          tenant_id_target_system: {
            tenant_id: tenantId,
            target_system: parsedBody.data.target_system,
          },
        },
        update: {
          last_sync_cursor: syncCursor,
          status: 'active',
        },
        create: {
          tenant_id: tenantId,
          target_system: parsedBody.data.target_system,
          last_sync_cursor: syncCursor,
          status: 'active',
        },
      })

      return { subscription, checkpoint }
    })

    return reply.send(result)
  })

  app.get<{ Querystring: { status?: 'open' | 'resolved' | 'dismissed' } }>(
    '/masterdata/sync/conflicts',
    async (request, reply) => {
      const tenantId = getTenantId(request)
      if (!tenantId) {
        return sendForbidden(reply, 'Tenant scope is required')
      }

      const query = ConflictQuerySchema.safeParse(request.query)
      if (!query.success) {
        return sendBadRequest(reply, query.error.errors[0]?.message ?? 'Invalid query')
      }

      const conflicts = await prisma.masterSyncConflict.findMany({
        where: {
          tenant_id: tenantId,
          ...(query.data.status ? { status: query.data.status } : {}),
        },
        orderBy: [{ created_at: 'desc' }],
      })

      return reply.send(conflicts)
    },
  )

  app.post<{ Params: { id: string } }>('/masterdata/sync/conflicts/:id/resolve', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const params = ResolveConflictParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid conflict id')
    }

    const parsedBody = ResolveConflictBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
    }

    const conflict = await prisma.masterSyncConflict.findFirst({
      where: {
        id: params.data.id,
        tenant_id: tenantId,
      },
    })

    if (!conflict) {
      return sendNotFound(reply, 'Conflict not found in tenant scope')
    }

    const resolved = await prisma.masterSyncConflict.update({
      where: { id: params.data.id },
      data: {
        status: parsedBody.data.resolution,
        resolved_by: parsedBody.data.resolved_by,
        resolved_at: new Date(),
      },
    })

    return reply.send(resolved)
  })
}
