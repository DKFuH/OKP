import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { BlockDefinition, BOMLine, GlobalDiscountSettings, PriceSummary } from '@yakds/shared-schemas'

import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { getEligibleProgramBlocks } from '../services/blockProgramService.js'
import { evaluateBlock, findBestBlock } from '../services/blockEvaluator.js'
import { calculatePriceSummary } from '../services/priceCalculator.js'

const ProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
})

const BomLineSchema = z.object({
  id: z.string().min(1),
  project_id: z.string().min(1),
  type: z.enum(['cabinet', 'appliance', 'accessory', 'surcharge', 'assembly', 'freight', 'extra']),
  catalog_item_id: z.string().nullable(),
  description: z.string(),
  qty: z.number().positive(),
  unit: z.enum(['stk', 'm', 'm2', 'pauschal']),
  list_price_net: z.number(),
  dealer_price_net: z.number().optional(),
  variant_surcharge: z.number(),
  object_surcharges: z.number(),
  position_discount_pct: z.number().min(0).max(100),
  pricing_group_discount_pct: z.number().min(0).max(100),
  line_net_after_discounts: z.number(),
  tax_group_id: z.string().min(1),
  tax_rate: z.number().min(0),
})

const GlobalDiscountSettingsSchema = z.object({
  project_id: z.string().min(1),
  global_discount_pct: z.number().min(0).max(100),
  extra_costs: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      amount_net: z.number(),
      tax_group_id: z.string().min(1),
      type: z.enum(['freight', 'assembly', 'other']),
    }),
  ),
})

const PricingPreviewRequestSchema = z.object({
  bom_lines: z.array(BomLineSchema),
  settings: GlobalDiscountSettingsSchema,
})

const BlockDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  basis: z.enum(['purchase_price', 'sell_price', 'points']),
  tiers: z.array(
    z.object({
      min_value: z.number(),
      discount_pct: z.number().min(0).max(100),
    }),
  ).min(1),
})

const BlockPricingSummarySchema = z.object({
  dealer_price_net: z.number(),
  subtotal_net: z.number(),
  total_purchase_price_net: z.number().optional(),
  total_sell_price_net: z.number().optional(),
  total_points: z.number().optional(),
})

const BlockPreviewRequestSchema = z.object({
  price_summary: BlockPricingSummarySchema,
  blocks: z.array(BlockDefinitionSchema).min(1),
})

const EvaluateBlocksRequestSchema = z.object({
  price_summary: BlockPricingSummarySchema.optional(),
  program_id: z.string().uuid().optional(),
  blocks: z.array(BlockDefinitionSchema).min(1).optional(),
}).superRefine((value, ctx) => {
  if (!value.program_id && (!value.blocks || value.blocks.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either program_id or blocks must be provided',
      path: ['blocks'],
    })
  }

  if (value.program_id && value.blocks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Use either program_id or blocks, not both',
      path: ['program_id'],
    })
  }
})

function calculatePricingPreview(lines: BOMLine[], settings: GlobalDiscountSettings) {
  return calculatePriceSummary(lines, settings)
}

function calculateBlockPreview(priceSummary: PriceSummary, blocks: BlockDefinition[]) {
  const evaluations = blocks.map((block) => evaluateBlock(priceSummary, block))

  return {
    evaluations,
    best_block: evaluations.length > 0 ? findBestBlock(priceSummary, blocks) : null,
  }
}

function isPriceSummarySnapshot(value: unknown): value is PriceSummary {
  return typeof value === 'object' && value !== null && 'subtotal_net' in value && 'total_gross' in value
}

async function getStoredPriceSummary(projectId: string): Promise<PriceSummary | null> {
  const latestQuote = await prisma.quote.findFirst({
    where: { project_id: projectId },
    orderBy: { version: 'desc' },
    select: { price_snapshot: true },
  })

  if (isPriceSummarySnapshot(latestQuote?.price_snapshot)) {
    return latestQuote.price_snapshot
  }

  const latestVersion = await prisma.projectVersion.findFirst({
    where: { project_id: projectId },
    orderBy: { version: 'desc' },
    select: { snapshot: true },
  })

  if (isPriceSummarySnapshot(latestVersion?.snapshot)) {
    return latestVersion.snapshot
  }

  const nestedPriceSummary =
    latestVersion?.snapshot && typeof latestVersion.snapshot === 'object' && latestVersion.snapshot !== null
      ? (latestVersion.snapshot as { price_summary?: unknown }).price_summary
      : null

  return isPriceSummarySnapshot(nestedPriceSummary) ? nestedPriceSummary : null
}

async function loadBlockProgram(programId: string) {
  return prisma.blockProgram.findUnique({
    where: { id: programId },
    include: {
      groups: true,
      conditions: true,
      definitions: {
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
        include: {
          group: true,
          conditions: true,
        },
      },
    },
  })
}

export async function pricingRoutes(app: FastifyInstance) {
  const handler = async (request: { body: unknown }, reply: { send: (payload: unknown) => unknown }) => {
    const parsed = PricingPreviewRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    return reply.send(
      calculatePricingPreview(parsed.data.bom_lines as BOMLine[], parsed.data.settings as GlobalDiscountSettings),
    )
  }

  const blockHandler = async (request: { body: unknown }, reply: { send: (payload: unknown) => unknown }) => {
    const parsed = BlockPreviewRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    return reply.send(
      calculateBlockPreview(
        parsed.data.price_summary as PriceSummary,
        parsed.data.blocks as BlockDefinition[],
      ),
    )
  }

  const projectBlockHandler = async (
    request: { params: unknown; body: unknown },
    reply: { send: (payload: unknown) => unknown },
  ) => {
    const parsedParams = ProjectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply as never, parsedParams.error.errors[0].message)
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
      select: { id: true, lead_status: true },
    })
    if (!project) {
      return sendNotFound(reply as never, 'Project not found')
    }

    const parsed = EvaluateBlocksRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const priceSummary =
      (parsed.data.price_summary as PriceSummary | undefined) ??
      (await getStoredPriceSummary(parsedParams.data.projectId))
    if (!priceSummary) {
      return sendNotFound(reply as never, 'Price summary snapshot not found')
    }

    let blocks = (parsed.data.blocks as BlockDefinition[] | undefined) ?? []
    let programName: string | null = null

    if (parsed.data.program_id) {
      const program = await loadBlockProgram(parsed.data.program_id)
      if (!program) {
        return sendNotFound(reply as never, 'Block program not found')
      }

      blocks = getEligibleProgramBlocks(program, priceSummary, project.lead_status)
      programName = program.name
    }

    const result = calculateBlockPreview(priceSummary, blocks)

    if (parsed.data.program_id) {
      const persisted = await prisma.projectBlockEvaluation.create({
        data: {
          project_id: parsedParams.data.projectId,
          program_id: parsed.data.program_id,
          best_block_definition_id: result.best_block?.block_id ?? null,
          price_summary: priceSummary as Prisma.InputJsonValue,
          evaluations: result.evaluations as unknown as Prisma.InputJsonValue,
          best_block: (result.best_block ?? null) as Prisma.InputJsonValue | null,
        },
      })

      return reply.send({
        ...result,
        evaluation_id: persisted.id,
        program: {
          id: parsed.data.program_id,
          name: programName,
        },
      })
    }

    return reply.send(result)
  }

  app.get<{ Params: { projectId: string } }>('/projects/:projectId/price-summary', async (request, reply) => {
    const parsedParams = ProjectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0].message)
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
      select: { id: true },
    })
    if (!project) {
      return sendNotFound(reply, 'Project not found')
    }

    const snapshot = await getStoredPriceSummary(parsedParams.data.projectId)
    if (!snapshot) {
      return sendNotFound(reply, 'Price summary snapshot not found')
    }

    return reply.send(snapshot)
  })

  app.post('/pricing/preview', handler)
  app.post('/pricing/block-preview', blockHandler)
  app.post('/projects/:projectId/calculate-pricing', handler)
  app.post('/projects/:projectId/evaluate-blocks', projectBlockHandler)
}
