import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendConflict, sendForbidden, sendNotFound } from '../errors.js'
import {
  WorkflowDefinitionValidationError,
  WorkflowGraphSchema,
  WorkflowGuardFailedError,
  WorkflowTransitionError,
  assertProjectStatusGuard,
  findTransition,
  getNodeById,
  getStartNodeId,
  validateWorkflowGraph,
  workflowEntityTypeValues,
} from '../services/workflowEngineService.js'

type AuthenticatedTenantRequest = {
  tenantId?: string | null
  headers?: Record<string, string | string[] | undefined>
}

const WorkflowDefinitionCreateSchema = z.object({
  name: z.string().min(1).max(200),
  version: z.number().int().min(1).optional(),
  graph: WorkflowGraphSchema,
})

const WorkflowDefinitionPublishParamsSchema = z.object({
  id: z.string().uuid(),
})

const WorkflowInstanceCreateSchema = z.object({
  definition_id: z.string().uuid(),
  entity_type: z.enum(workflowEntityTypeValues),
  entity_id: z.string().uuid(),
  metadata_json: z.record(z.unknown()).optional(),
})

const WorkflowInstanceParamsSchema = z.object({
  id: z.string().uuid(),
})

const WorkflowTransitionRequestSchema = z.object({
  to_node_id: z.string().min(1).max(120),
  reason: z.string().min(1).max(500).optional(),
})

function headerValue(value: string | string[] | undefined): string | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function getTenantId(request: AuthenticatedTenantRequest): string | null {
  return request.tenantId ?? headerValue(request.headers?.['x-tenant-id'])
}

function getUserId(request: AuthenticatedTenantRequest): string | null {
  return headerValue(request.headers?.['x-user-id'])
}

export async function workflowRoutes(app: FastifyInstance) {
  app.post('/workflow/definitions', async (request, reply) => {
    const tenantId = getTenantId(request)
    const userId = getUserId(request)
    if (!tenantId || !userId) {
      return sendForbidden(reply, 'Auth context and tenant scope are required')
    }

    const parsed = WorkflowDefinitionCreateSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    try {
      validateWorkflowGraph(parsed.data.graph)
    } catch (error) {
      if (error instanceof WorkflowDefinitionValidationError) {
        return sendBadRequest(reply, error.message)
      }
      throw error
    }

    const created = await prisma.workflowDefinition.create({
      data: {
        tenant_id: tenantId,
        name: parsed.data.name,
        version: parsed.data.version ?? 1,
        graph_json: parsed.data.graph as Prisma.InputJsonValue,
        created_by: userId,
      },
    })

    return reply.status(201).send(created)
  })

  app.get('/workflow/definitions', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const definitions = await prisma.workflowDefinition.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ updated_at: 'desc' }],
    })

    return reply.send(definitions)
  })

  app.post<{ Params: { id: string } }>('/workflow/definitions/:id/publish', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const params = WorkflowDefinitionPublishParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid definition id')
    }

    const existing = await prisma.workflowDefinition.findFirst({
      where: { id: params.data.id, tenant_id: tenantId },
    })
    if (!existing) {
      return sendNotFound(reply, 'Workflow definition not found')
    }

    const published = await prisma.$transaction(async (tx) => {
      await tx.workflowDefinition.updateMany({
        where: {
          tenant_id: tenantId,
          name: existing.name,
          is_active: true,
        },
        data: { is_active: false },
      })

      return tx.workflowDefinition.update({
        where: { id: existing.id },
        data: { is_active: true },
      })
    })

    return reply.send(published)
  })

  app.post('/workflow/instances', async (request, reply) => {
    const tenantId = getTenantId(request)
    const userId = getUserId(request)
    if (!tenantId || !userId) {
      return sendForbidden(reply, 'Auth context and tenant scope are required')
    }

    const parsed = WorkflowInstanceCreateSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const definition = await prisma.workflowDefinition.findFirst({
      where: {
        id: parsed.data.definition_id,
        tenant_id: tenantId,
      },
    })
    if (!definition || !definition.is_active) {
      return sendNotFound(reply, 'Active workflow definition not found')
    }

    const graphParsed = WorkflowGraphSchema.safeParse(definition.graph_json)
    if (!graphParsed.success) {
      return sendConflict(reply, 'Workflow definition graph is invalid')
    }

    if (parsed.data.entity_type === 'project') {
      const project = await prisma.project.findFirst({
        where: { id: parsed.data.entity_id, tenant_id: tenantId },
        select: { id: true },
      })
      if (!project) {
        return sendNotFound(reply, 'Target project not found in tenant scope')
      }
    }

    const startNodeId = getStartNodeId(graphParsed.data)

    const created = await prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          tenant_id: tenantId,
          definition_id: definition.id,
          entity_type: parsed.data.entity_type,
          entity_id: parsed.data.entity_id,
          current_node_id: startNodeId,
          metadata_json: (parsed.data.metadata_json ?? {}) as Prisma.InputJsonValue,
        },
      })

      await tx.workflowEvent.create({
        data: {
          tenant_id: tenantId,
          instance_id: instance.id,
          from_node_id: null,
          to_node_id: startNodeId,
          transition_label: 'start',
          reason: 'Workflow instance started',
          actor_user_id: userId,
          guard_result: { ok: true, type: 'start' } as Prisma.InputJsonValue,
        },
      })

      return instance
    })

    return reply.status(201).send(created)
  })

  app.get<{ Params: { id: string } }>('/workflow/instances/:id', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const params = WorkflowInstanceParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid instance id')
    }

    const instance = await prisma.workflowInstance.findFirst({
      where: { id: params.data.id, tenant_id: tenantId },
      include: { definition: true },
    })

    if (!instance) {
      return sendNotFound(reply, 'Workflow instance not found')
    }

    return reply.send(instance)
  })

  app.post<{ Params: { id: string } }>('/workflow/instances/:id/transition', async (request, reply) => {
    const tenantId = getTenantId(request)
    const userId = getUserId(request)
    if (!tenantId || !userId) {
      return sendForbidden(reply, 'Auth context and tenant scope are required')
    }

    const params = WorkflowInstanceParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid instance id')
    }

    const body = WorkflowTransitionRequestSchema.safeParse(request.body)
    if (!body.success) {
      return sendBadRequest(reply, body.error.errors[0]?.message ?? 'Invalid payload')
    }

    const instance = await prisma.workflowInstance.findFirst({
      where: { id: params.data.id, tenant_id: tenantId },
      include: { definition: true },
    })
    if (!instance) {
      return sendNotFound(reply, 'Workflow instance not found')
    }

    const graphParsed = WorkflowGraphSchema.safeParse(instance.definition.graph_json)
    if (!graphParsed.success) {
      return sendConflict(reply, 'Workflow definition graph is invalid')
    }

    try {
      const transition = findTransition(graphParsed.data, instance.current_node_id, body.data.to_node_id)

      if (instance.entity_type === 'project' && transition.guard?.type === 'project_status_equals') {
        const project = await prisma.project.findFirst({
          where: {
            id: instance.entity_id,
            tenant_id: tenantId,
          },
          select: {
            project_status: true,
          },
        })

        if (!project) {
          return sendNotFound(reply, 'Target project not found in tenant scope')
        }

        assertProjectStatusGuard(transition, project.project_status)
      }

      const targetNode = getNodeById(graphParsed.data, body.data.to_node_id)
      const finishedAt = targetNode.is_terminal ? new Date() : null

      const updated = await prisma.$transaction(async (tx) => {
        const nextInstance = await tx.workflowInstance.update({
          where: { id: instance.id },
          data: {
            current_node_id: body.data.to_node_id,
            finished_at: finishedAt,
          },
        })

        await tx.workflowEvent.create({
          data: {
            tenant_id: tenantId,
            instance_id: instance.id,
            from_node_id: instance.current_node_id,
            to_node_id: body.data.to_node_id,
            transition_label: transition.label ?? null,
            reason: body.data.reason ?? null,
            actor_user_id: userId,
            guard_result: { ok: true, type: transition.guard?.type ?? 'none' } as Prisma.InputJsonValue,
          },
        })

        return nextInstance
      })

      return reply.send(updated)
    } catch (error) {
      if (error instanceof WorkflowTransitionError || error instanceof WorkflowGuardFailedError) {
        return sendConflict(reply, error.message)
      }
      throw error
    }
  })

  app.get<{ Params: { id: string } }>('/workflow/instances/:id/events', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const params = WorkflowInstanceParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid instance id')
    }

    const instance = await prisma.workflowInstance.findFirst({
      where: {
        id: params.data.id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
      },
    })

    if (!instance) {
      return sendNotFound(reply, 'Workflow instance not found')
    }

    const events = await prisma.workflowEvent.findMany({
      where: {
        tenant_id: tenantId,
        instance_id: params.data.id,
      },
      orderBy: [{ created_at: 'asc' }],
    })

    return reply.send(events)
  })
}
