import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    quote: { findFirst: vi.fn() },
    projectVersion: { findFirst: vi.fn() },
    catalogIndex: { findMany: vi.fn() },
    blockProgram: { findUnique: vi.fn() },
    projectBlockEvaluation: { create: vi.fn() },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { pricingRoutes } from './pricing.js'

function createBomLine() {
  return {
    id: 'line-1',
    project_id: 'project-12',
    type: 'cabinet' as const,
    catalog_item_id: 'cab-60',
    description: 'Cabinet',
    qty: 1,
    unit: 'stk' as const,
    list_price_net: 1000,
    dealer_price_net: 700,
    variant_surcharge: 0,
    object_surcharges: 0,
    position_discount_pct: 0,
    pricing_group_discount_pct: 0,
    line_net_after_discounts: 1000,
    tax_group_id: 'tax-de',
    tax_rate: 0.19,
  }
}

function createPriceSummarySnapshot() {
  return {
    project_id: '11111111-1111-1111-1111-111111111111',
    calculated_at: '2026-03-01T10:00:00.000Z',
    total_list_price_net: 1000,
    total_variant_surcharges: 0,
    total_object_surcharges: 0,
    total_position_discounts: 0,
    total_group_discounts: 0,
    total_global_discount: 0,
    total_extra_costs: 0,
    subtotal_net: 1000,
    vat_amount: 190,
    total_gross: 1190,
    dealer_price_net: 700,
    contribution_margin_net: 300,
    markup_pct: 42.86,
    bom_lines: [],
    components: [],
    total_purchase_price_net: 700,
    total_sell_price_net: 1000,
    total_points: 80,
  }
}

describe('pricingRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.project.findUnique.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      lead_status: 'quoted',
    })
    prismaMock.quote.findFirst.mockResolvedValue(null)
    prismaMock.projectVersion.findFirst.mockResolvedValue(null)
    prismaMock.catalogIndex.findMany.mockResolvedValue([])
    prismaMock.blockProgram.findUnique.mockResolvedValue(null)
    prismaMock.projectBlockEvaluation.create.mockResolvedValue({ id: 'eval-1' })
  })

  it('applies catalog indices in /projects/:projectId/calculate-pricing responses', async () => {
    prismaMock.catalogIndex.findMany.mockResolvedValue([
      {
        id: 'ci-1',
        project_id: '11111111-1111-1111-1111-111111111111',
        catalog_id: 'cab-60',
        purchase_index: 0.9,
        sales_index: 1.1,
        applied_at: new Date('2026-03-01T10:00:00.000Z'),
        applied_by: 'pricing-user',
      },
    ])

    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/calculate-pricing',
      payload: {
        bom_lines: [createBomLine()],
        settings: {
          project_id: 'project-12',
          global_discount_pct: 0,
          extra_costs: [],
        },
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.total_list_price_net).toBe(1100)
    expect(body.dealer_price_net).toBe(630)
    expect(body.catalog_indices_applied).toEqual([
      expect.objectContaining({
        catalog_id: 'cab-60',
        purchase_index: 0.9,
        sales_index: 1.1,
      }),
    ])

    await app.close()
  })

  it('returns a pricing summary for preview requests', async () => {
    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pricing/preview',
      payload: {
        bom_lines: [createBomLine()],
        settings: {
          project_id: 'project-12',
          global_discount_pct: 0,
          extra_costs: [],
        },
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.subtotal_net).toBe(1000)
    expect(body.vat_amount).toBe(190)
    expect(body.total_gross).toBe(1190)

    await app.close()
  })

  it('returns block evaluations and a recommended block', async () => {
    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pricing/block-preview',
      payload: {
        price_summary: {
          dealer_price_net: 800,
          subtotal_net: 1200,
          total_purchase_price_net: 1000,
          total_sell_price_net: 1200,
          total_points: 90,
        },
        blocks: [
          {
            id: 'block-purchase',
            name: 'EK Block',
            basis: 'purchase_price',
            tiers: [{ min_value: 900, discount_pct: 8 }],
          },
          {
            id: 'block-sell',
            name: 'VK Block',
            basis: 'sell_price',
            tiers: [{ min_value: 1000, discount_pct: 5 }],
          },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.evaluations).toHaveLength(2)
    expect(body.best_block).toEqual(
      expect.objectContaining({
        block_id: 'block-purchase',
        applied_discount_pct: 8,
        recommended: true,
      }),
    )

    await app.close()
  })

  it('returns the latest stored project price summary snapshot', async () => {
    prismaMock.quote.findFirst.mockResolvedValue({
      price_snapshot: createPriceSummarySnapshot(),
    })

    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/price-summary',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(createPriceSummarySnapshot())

    await app.close()
  })

  it('evaluates blocks for a project using the stored price snapshot', async () => {
    prismaMock.quote.findFirst.mockResolvedValue({
      price_snapshot: createPriceSummarySnapshot(),
    })

    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/evaluate-blocks',
      payload: {
        blocks: [
          {
            id: 'block-purchase',
            name: 'EK Block',
            basis: 'purchase_price',
            tiers: [{ min_value: 600, discount_pct: 10 }],
          },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      evaluations: [
        {
          block_id: 'block-purchase',
          block_name: 'EK Block',
          basis_value: 700,
          applied_discount_pct: 10,
          price_advantage_net: 70,
          recommended: false,
        },
      ],
      best_block: {
        block_id: 'block-purchase',
        block_name: 'EK Block',
        basis_value: 700,
        applied_discount_pct: 10,
        price_advantage_net: 70,
        recommended: true,
      },
    })

    await app.close()
  })

  it('evaluates and persists a stored block program for a project', async () => {
    prismaMock.quote.findFirst.mockResolvedValue({
      price_snapshot: createPriceSummarySnapshot(),
    })
    prismaMock.blockProgram.findUnique.mockResolvedValue({
      id: 'aaaaaaaa-1111-1111-1111-111111111111',
      name: 'Hersteller Block',
      groups: [],
      conditions: [],
      definitions: [
        {
          id: 'block-def-1',
          name: 'Qualified Block',
          basis: 'purchase_price',
          tiers: [{ min_value: 600, discount_pct: 12 }],
          sort_order: 0,
          group: null,
          conditions: [{ id: 'cond-1', block_definition_id: 'block-def-1', field: 'lead_status', operator: 'eq', value: 'quoted' }],
        },
        {
          id: 'block-def-2',
          name: 'Lost Block',
          basis: 'purchase_price',
          tiers: [{ min_value: 600, discount_pct: 20 }],
          sort_order: 1,
          group: null,
          conditions: [{ id: 'cond-2', block_definition_id: 'block-def-2', field: 'lead_status', operator: 'eq', value: 'lost' }],
        },
      ],
    })
    prismaMock.projectBlockEvaluation.create.mockResolvedValue({
      id: 'eval-program-1',
    })

    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/evaluate-blocks',
      payload: {
        program_id: 'aaaaaaaa-1111-1111-1111-111111111111',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      evaluation_id: 'eval-program-1',
      program: {
        id: 'aaaaaaaa-1111-1111-1111-111111111111',
        name: 'Hersteller Block',
      },
      evaluations: [
        {
          block_id: 'block-def-1',
          block_name: 'Qualified Block',
          basis_value: 700,
          applied_discount_pct: 12,
          price_advantage_net: 84,
          recommended: false,
        },
      ],
      best_block: {
        block_id: 'block-def-1',
        block_name: 'Qualified Block',
        basis_value: 700,
        applied_discount_pct: 12,
        price_advantage_net: 84,
        recommended: true,
      },
    })
    expect(prismaMock.projectBlockEvaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        project_id: '11111111-1111-1111-1111-111111111111',
        program_id: 'aaaaaaaa-1111-1111-1111-111111111111',
        best_block_definition_id: 'block-def-1',
      }),
    })

    await app.close()
  })

  it('rejects invalid preview payloads', async () => {
    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pricing/preview',
      payload: {
        bom_lines: [],
        settings: {
          project_id: 'project-12',
          global_discount_pct: 150,
          extra_costs: [],
        },
      },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })

  it('rejects block preview payloads without block definitions', async () => {
    const app = Fastify()
    await app.register(pricingRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pricing/block-preview',
      payload: {
        price_summary: {
          dealer_price_net: 800,
          subtotal_net: 1200,
        },
        blocks: [],
      },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })
})
