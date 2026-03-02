import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendBadRequest } from '../errors.js'
import { prisma } from '../db.js'
import {
  calculateBOM,
  sumBOMLines,
  type GeneratedItemInput,
  type ProjectSnapshotPricingInput,
} from '../services/bomCalculator.js'

const FlagsSchema = z.object({
  requires_customization: z.boolean(),
  height_variant: z.string().nullable(),
  labor_surcharge: z.boolean(),
  special_trim_needed: z.boolean(),
  variant_surcharge: z.number().optional(),
  object_surcharges: z.number().optional(),
  // Sprint 45 – Tiefenkürzung
  custom_depth_mm: z.number().int().positive().optional(),
  cost_type: z.enum(['bauseits', 'nicht_bauseits']).optional(),
})

const PlacementBaseSchema = z.object({
  id: z.string().min(1),
  catalog_item_id: z.string().min(1),
  catalog_article_id: z.string().min(1).optional(),
  article_variant_id: z.string().min(1).optional(),
  description: z.string().optional(),
  chosen_options: z.record(z.string(), z.string()).optional(),
  qty: z.number().positive().optional(),
  list_price_net: z.number().min(0).optional(),
  dealer_price_net: z.number().min(0).optional(),
  tax_group_id: z.string().min(1),
  pricing_group_discount_pct: z.number().min(0).max(100).optional(),
  position_discount_pct: z.number().min(0).max(100).optional(),
  flags: FlagsSchema,
})

const ProjectSnapshotSchema = z.object({
  id: z.string().min(1),
  cabinets: z.array(PlacementBaseSchema),
  appliances: z.array(PlacementBaseSchema),
  accessories: z.array(PlacementBaseSchema).optional(),
  articlePrices: z.array(
    z.object({
      article_id: z.string().min(1),
      article_variant_id: z.string().min(1).optional(),
      list_net: z.number().min(0),
      dealer_net: z.number().min(0),
      tax_group_id: z.string().min(1).optional(),
    }),
  ).optional(),
  priceListItems: z.array(
    z.object({
      catalog_item_id: z.string().min(1),
      list_price_net: z.number(),
      dealer_price_net: z.number(),
    }),
  ),
  taxGroups: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      tax_rate: z.number().min(0),
    }),
  ),
  quoteSettings: z.object({
    freight_flat_rate: z.number().min(0),
    assembly_rate_per_item: z.number().min(0),
  }),
})

const BomPreviewRequestSchema = z.object({
  project: ProjectSnapshotSchema,
  options: z.object({
    specialTrimSurchargeNet: z.number().min(0).optional(),
    includeGeneratedItems: z.boolean().optional(),
    room_id: z.string().uuid().optional(),
  }).optional(),
})

async function loadGeneratedItems(projectId: string, roomId: string): Promise<GeneratedItemInput[]> {
  const generatedItems = await prisma.generatedItem.findMany({
    where: {
      project_id: projectId,
      room_id: roomId,
      is_generated: true,
    },
    include: {
      catalog_article: {
        include: {
          prices: {
            orderBy: { valid_from: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  return generatedItems.map((item) => ({
    id: item.id,
    label: item.label,
    item_type: item.item_type,
    qty: item.qty,
    unit: item.unit,
    ...(item.catalog_article_id ? { catalog_article_id: item.catalog_article_id } : {}),
    ...(item.catalog_article?.prices?.[0]?.tax_group_id
      ? { tax_group_id: item.catalog_article.prices[0].tax_group_id }
      : {}),
    ...(item.catalog_article?.prices?.[0]
      ? { list_price_net: item.catalog_article.prices[0].list_net }
      : {}),
  }))
}

async function calculateBomPreview(
  project: ProjectSnapshotPricingInput,
  options: { specialTrimSurchargeNet?: number; includeGeneratedItems?: boolean; room_id?: string },
) {
  const generatedItems = options.includeGeneratedItems && options.room_id
    ? await loadGeneratedItems(project.id, options.room_id)
    : undefined

  const lines = calculateBOM(project, {
    specialTrimSurchargeNet: options.specialTrimSurchargeNet,
    generatedItems,
  })
  const totals = sumBOMLines(lines)
  return { lines, totals }
}

export async function bomRoutes(app: FastifyInstance) {
  const handler = async (request: { body: unknown }, reply: { send: (payload: unknown) => unknown }) => {
    const parsed = BomPreviewRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    return reply.send(await calculateBomPreview(
      parsed.data.project as ProjectSnapshotPricingInput,
      {
        specialTrimSurchargeNet: parsed.data.options?.specialTrimSurchargeNet,
        includeGeneratedItems: parsed.data.options?.includeGeneratedItems,
        room_id: parsed.data.options?.room_id,
      },
    ))
  }

  app.post('/bom/preview', handler)
  app.post('/projects/:projectId/calculate-bom', handler)
}
