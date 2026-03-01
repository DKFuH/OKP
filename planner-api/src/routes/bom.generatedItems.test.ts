import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    generatedItem: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { bomRoutes } from './bom.js'

describe('bomRoutes generated items integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads generated items from DB and adds priced extra lines', async () => {
    prismaMock.generatedItem.findMany.mockResolvedValue([
      {
        id: 'gi-1',
        label: 'Arbeitsplatte Premium',
        item_type: 'worktop',
        qty: 2000,
        unit: 'mm',
        catalog_article_id: 'article-1',
        catalog_article: {
          prices: [
            {
              list_net: 120,
              tax_group_id: 'tax-reduced',
            },
          ],
        },
      },
    ])

    const app = Fastify()
    await app.register(bomRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/bom/preview',
      payload: {
        project: {
          id: 'project-1',
          cabinets: [],
          appliances: [],
          accessories: [],
          articlePrices: [],
          priceListItems: [],
          taxGroups: [
            { id: 'tax-de', name: 'DE 19%', tax_rate: 0.19 },
            { id: 'tax-reduced', name: 'Reduced', tax_rate: 0.07 },
          ],
          quoteSettings: {
            freight_flat_rate: 89,
            assembly_rate_per_item: 45,
          },
        },
        options: {
          includeGeneratedItems: true,
          room_id: '22222222-2222-2222-2222-222222222222',
        },
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()

    const extraLine = body.lines.find((line: { type: string; description: string }) => (
      line.type === 'extra' && line.description === 'Arbeitsplatte Premium'
    ))

    expect(extraLine).toBeDefined()
    expect(extraLine.list_price_net).toBe(120)
    expect(extraLine.qty).toBeCloseTo(2)
    expect(extraLine.tax_rate).toBe(0.07)
    expect(prismaMock.generatedItem.findMany).toHaveBeenCalledTimes(1)

    await app.close()
  })
})
