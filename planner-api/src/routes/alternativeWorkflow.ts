import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendConflict, sendForbidden, sendNotFound } from '../errors.js'
import {
  AlternativeLockedError,
  AlternativeNotFoundInTenantScopeError,
  AlternativeStatusService,
} from '../services/alternativeStatusService.js'

type AuthenticatedTenantRequest = {
  tenantId?: string | null
  headers?: Record<string, string | string[] | undefined>
}

const AlternativeParamsSchema = z.object({
  id: z.string().uuid(),
})

const QuotePositionParamsSchema = z.object({
  id: z.string().uuid(),
  posId: z.string().uuid(),
})

const AlternativeLockRequestSchema = z.object({}).strict()

const AlternativeBranchResponseSchema = z.object({
  id: z.string().uuid(),
})

const QuotePositionPurchasePricePatchSchema = z.object({
  purchase_price: z.number().min(0),
})

const PriceBreakdownResponseSchema = z.array(z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
  description: z.string().nullable(),
  sell_price: z.number(),
  purchase_price: z.number().nullable(),
  gross_profit: z.number().nullable(),
  contribution_margin: z.number().nullable(),
}))

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

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function findAlternativeInTenantScope(alternativeId: string, tenantId: string) {
  return prisma.alternative.findFirst({
    where: {
      id: alternativeId,
      area: {
        project: {
          tenant_id: tenantId,
        },
      },
    },
    include: {
      quote_positions: {
        orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
      },
    },
  })
}

export async function alternativeWorkflowRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/alternatives/:id/lock', async (request, reply) => {
    const tenantId = getTenantId(request)
    const userId = getUserId(request)
    if (!tenantId || !userId) {
      return sendForbidden(reply, 'Auth context and tenant scope are required')
    }

    const params = AlternativeParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid alternative id')
    }

    const body = AlternativeLockRequestSchema.safeParse(request.body ?? {})
    if (!body.success) {
      return sendBadRequest(reply, body.error.errors[0]?.message ?? 'Invalid payload')
    }

    try {
      const alternative = await prisma.$transaction((tx) =>
        AlternativeStatusService.lock(tx as never, params.data.id, tenantId, userId),
      )

      return reply.send(alternative)
    } catch (error) {
      if (error instanceof AlternativeLockedError) {
        return sendConflict(reply, error.message)
      }
      if (error instanceof AlternativeNotFoundInTenantScopeError) {
        return sendNotFound(reply, error.message)
      }
      throw error
    }
  })

  app.post<{ Params: { id: string } }>('/alternatives/:id/branch', async (request, reply) => {
    const tenantId = getTenantId(request)
    const userId = getUserId(request)
    if (!tenantId || !userId) {
      return sendForbidden(reply, 'Auth context and tenant scope are required')
    }

    const params = AlternativeParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid alternative id')
    }

    const source = await findAlternativeInTenantScope(params.data.id, tenantId)
    if (!source) {
      return sendNotFound(reply, 'Alternative not found in tenant scope')
    }

    const created = await prisma.$transaction(async (tx) => {
      const branchedAlternative = await tx.alternative.create({
        data: {
          area_id: source.area_id,
          name: source.name,
          is_active: source.is_active,
          sort_order: source.sort_order,
          status: 'draft',
          locked_at: null,
          locked_by: null,
        },
      })

      if (source.quote_positions.length > 0) {
        await tx.quotePosition.createMany({
          data: source.quote_positions.map((position) => ({
            alternative_id: branchedAlternative.id,
            position: position.position,
            description: position.description,
            sell_price: position.sell_price,
            purchase_price: position.purchase_price,
          })),
        })
      }

      return branchedAlternative
    })

    return reply.status(201).send(AlternativeBranchResponseSchema.parse({ id: created.id }))
  })

  app.patch<{ Params: { id: string; posId: string } }>(
    '/alternatives/:id/quote-positions/:posId/purchase-price',
    async (request, reply) => {
      const tenantId = getTenantId(request)
      const userId = getUserId(request)
      if (!tenantId || !userId) {
        return sendForbidden(reply, 'Auth context and tenant scope are required')
      }

      const params = QuotePositionParamsSchema.safeParse(request.params)
      if (!params.success) {
        return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid params')
      }

      const body = QuotePositionPurchasePricePatchSchema.safeParse(request.body)
      if (!body.success) {
        return sendBadRequest(reply, body.error.errors[0]?.message ?? 'Invalid payload')
      }

      const alternative = await findAlternativeInTenantScope(params.data.id, tenantId)
      if (!alternative) {
        return sendNotFound(reply, 'Alternative not found in tenant scope')
      }

      if (!AlternativeStatusService.canEditPurchasePrice(alternative.status)) {
        return sendForbidden(reply, 'Purchase price can only be updated when the alternative status is bestellt')
      }

      const quotePosition = await prisma.quotePosition.findFirst({
        where: {
          id: params.data.posId,
          alternative_id: params.data.id,
        },
      })

      if (!quotePosition) {
        return sendNotFound(reply, 'Quote position not found')
      }

      const updated = await prisma.quotePosition.update({
        where: { id: params.data.posId },
        data: { purchase_price: body.data.purchase_price },
      })

      return reply.send(updated)
    },
  )

  app.get<{ Params: { id: string } }>('/alternatives/:id/price-breakdown', async (request, reply) => {
    const tenantId = getTenantId(request)
    const userId = getUserId(request)
    if (!tenantId || !userId) {
      return sendForbidden(reply, 'Auth context and tenant scope are required')
    }

    const params = AlternativeParamsSchema.safeParse(request.params)
    if (!params.success) {
      return sendBadRequest(reply, params.error.errors[0]?.message ?? 'Invalid alternative id')
    }

    const alternative = await findAlternativeInTenantScope(params.data.id, tenantId)
    if (!alternative) {
      return sendNotFound(reply, 'Alternative not found in tenant scope')
    }

    const breakdown = alternative.quote_positions.map((position) => {
      if (position.purchase_price === null) {
        return {
          id: position.id,
          position: position.position,
          description: position.description ?? null,
          sell_price: position.sell_price,
          purchase_price: null,
          gross_profit: null,
          contribution_margin: null,
        }
      }

      const grossProfit = roundMoney(position.sell_price - position.purchase_price)
      const contributionMargin = position.sell_price === 0
        ? null
        : roundMoney((grossProfit / position.sell_price) * 100)

      return {
        id: position.id,
        position: position.position,
        description: position.description ?? null,
        sell_price: position.sell_price,
        purchase_price: position.purchase_price,
        gross_profit: grossProfit,
        contribution_margin: contributionMargin,
      }
    })

    return reply.send(PriceBreakdownResponseSchema.parse(breakdown))
  })
}
