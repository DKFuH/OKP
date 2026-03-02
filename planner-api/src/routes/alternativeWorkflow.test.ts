import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ALT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ALT2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const POS_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '11111111-1111-1111-1111-111111111111'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    alternative: {
      findFirst: vi.fn(),
    },
    quotePosition: {
      findFirst: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { alternativeWorkflowRoutes } from './alternativeWorkflow.js'

function makeApp() {
  const app = Fastify()
  app.register(alternativeWorkflowRoutes, { prefix: '/api/v1' })
  return app
}

function authHeaders() {
  return {
    'x-tenant-id': TENANT_ID,
    'x-user-id': USER_ID,
  }
}

const alternativeRecord = {
  id: ALT_ID,
  area_id: 'area-1',
  name: 'Alternative A',
  is_active: true,
  sort_order: 3,
  status: 'draft',
  locked_at: null,
  locked_by: null,
  quote_positions: [
    {
      id: POS_ID,
      alternative_id: ALT_ID,
      position: 1,
      description: 'Cabinet line',
      sell_price: 1000,
      purchase_price: 700,
      created_at: new Date('2026-03-02T08:00:00.000Z'),
      updated_at: new Date('2026-03-02T08:00:00.000Z'),
    },
  ],
}

describe('alternativeWorkflowRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /alternatives/:id/lock', () => {
    it('locks a draft alternative', async () => {
      prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
        $queryRaw: vi.fn().mockResolvedValue([
          { id: ALT_ID, status: 'draft', locked_at: null, locked_by: null },
        ]),
        alternative: {
          update: vi.fn().mockResolvedValue({
            id: ALT_ID,
            status: 'angebot_gesendet',
            locked_by: USER_ID,
            locked_at: new Date('2026-03-02T09:00:00.000Z'),
          }),
        },
      }))

      const app = makeApp()
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/lock`,
        headers: authHeaders(),
        payload: {},
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        id: ALT_ID,
        status: 'angebot_gesendet',
        locked_by: USER_ID,
      })
      await app.close()
    })

    it('returns 403 without auth context', async () => {
      const app = makeApp()
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/lock`,
        headers: { 'x-tenant-id': TENANT_ID },
        payload: {},
      })

      expect(response.statusCode).toBe(403)
      await app.close()
    })

    it('returns 409 for a concurrent second lock attempt', async () => {
      let locked = false

      prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
        $queryRaw: vi.fn().mockImplementation(async () => (locked
          ? [{ id: ALT_ID, status: 'angebot_gesendet', locked_at: new Date('2026-03-02T09:00:00.000Z'), locked_by: USER_ID }]
          : [{ id: ALT_ID, status: 'draft', locked_at: null, locked_by: null }])),
        alternative: {
          update: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
            locked = true
            return { id: ALT_ID, ...data }
          }),
        },
      }))

      const app = makeApp()
      const first = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/lock`,
        headers: authHeaders(),
        payload: {},
      })
      const second = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/lock`,
        headers: authHeaders(),
        payload: {},
      })

      expect(first.statusCode).toBe(200)
      expect(second.statusCode).toBe(409)
      await app.close()
    })

    it('returns 404 when the alternative is outside tenant scope', async () => {
      prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
        $queryRaw: vi.fn().mockResolvedValue([]),
        alternative: { update: vi.fn() },
      }))

      const app = makeApp()
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/lock`,
        headers: authHeaders(),
        payload: {},
      })

      expect(response.statusCode).toBe(404)
      await app.close()
    })
  })

  describe('POST /alternatives/:id/branch', () => {
    it('creates a new draft alternative with copied quote positions', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue(alternativeRecord)
      prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
        alternative: {
          create: vi.fn().mockResolvedValue({ id: ALT2_ID }),
        },
        quotePosition: {
          createMany: prismaMock.quotePosition.createMany.mockResolvedValue({ count: 1 }),
        },
      }))

      const app = makeApp()
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/branch`,
        headers: authHeaders(),
      })

      expect(response.statusCode).toBe(201)
      expect(response.json()).toEqual({ id: ALT2_ID })
      expect(prismaMock.quotePosition.createMany).toHaveBeenCalledWith({
        data: [
          {
            alternative_id: ALT2_ID,
            position: 1,
            description: 'Cabinet line',
            sell_price: 1000,
            purchase_price: 700,
          },
        ],
      })
      await app.close()
    })

    it('returns 403 without tenant and auth headers', async () => {
      const app = makeApp()
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/branch`,
      })

      expect(response.statusCode).toBe(403)
      await app.close()
    })

    it('returns 404 when the source alternative is missing', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue(null)

      const app = makeApp()
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/alternatives/${ALT_ID}/branch`,
        headers: authHeaders(),
      })

      expect(response.statusCode).toBe(404)
      await app.close()
    })
  })

  describe('PATCH /alternatives/:id/quote-positions/:posId/purchase-price', () => {
    it('blocks purchase price updates while the alternative is still draft', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue({
        ...alternativeRecord,
        quote_positions: [],
      })

      const app = makeApp()
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/alternatives/${ALT_ID}/quote-positions/${POS_ID}/purchase-price`,
        headers: authHeaders(),
        payload: { purchase_price: 650 },
      })

      expect(response.statusCode).toBe(403)
      await app.close()
    })

    it('allows purchase price updates once the alternative is bestellt', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue({
        ...alternativeRecord,
        status: 'bestellt',
        quote_positions: [],
      })
      prismaMock.quotePosition.findFirst.mockResolvedValue(alternativeRecord.quote_positions[0])
      prismaMock.quotePosition.update.mockResolvedValue({
        ...alternativeRecord.quote_positions[0],
        purchase_price: 650,
      })

      const app = makeApp()
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/alternatives/${ALT_ID}/quote-positions/${POS_ID}/purchase-price`,
        headers: authHeaders(),
        payload: { purchase_price: 650 },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ purchase_price: 650 })
      await app.close()
    })

    it('returns 404 when the alternative is outside tenant scope', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue(null)

      const app = makeApp()
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/alternatives/${ALT_ID}/quote-positions/${POS_ID}/purchase-price`,
        headers: authHeaders(),
        payload: { purchase_price: 650 },
      })

      expect(response.statusCode).toBe(404)
      await app.close()
    })

    it('returns 404 when the quote position does not belong to the alternative', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue({
        ...alternativeRecord,
        status: 'bestellt',
        quote_positions: [],
      })
      prismaMock.quotePosition.findFirst.mockResolvedValue(null)

      const app = makeApp()
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/alternatives/${ALT_ID}/quote-positions/${POS_ID}/purchase-price`,
        headers: authHeaders(),
        payload: { purchase_price: 650 },
      })

      expect(response.statusCode).toBe(404)
      await app.close()
    })

    it('returns 403 without auth context', async () => {
      const app = makeApp()
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/alternatives/${ALT_ID}/quote-positions/${POS_ID}/purchase-price`,
        headers: { 'x-tenant-id': TENANT_ID },
        payload: { purchase_price: 650 },
      })

      expect(response.statusCode).toBe(403)
      await app.close()
    })
  })

  describe('GET /alternatives/:id/price-breakdown', () => {
    it('returns price breakdown with gross profit and contribution margin', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue({
        ...alternativeRecord,
        status: 'bestellt',
        quote_positions: [
          alternativeRecord.quote_positions[0],
          {
            ...alternativeRecord.quote_positions[0],
            id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            position: 2,
            description: 'Service line',
            sell_price: 500,
            purchase_price: null,
          },
        ],
      })

      const app = makeApp()
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/alternatives/${ALT_ID}/price-breakdown`,
        headers: authHeaders(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([
        {
          id: POS_ID,
          position: 1,
          description: 'Cabinet line',
          sell_price: 1000,
          purchase_price: 700,
          gross_profit: 300,
          contribution_margin: 30,
        },
        {
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          position: 2,
          description: 'Service line',
          sell_price: 500,
          purchase_price: null,
          gross_profit: null,
          contribution_margin: null,
        },
      ])
      await app.close()
    })

    it('returns 403 without auth context', async () => {
      const app = makeApp()
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/alternatives/${ALT_ID}/price-breakdown`,
        headers: { 'x-tenant-id': TENANT_ID },
      })

      expect(response.statusCode).toBe(403)
      await app.close()
    })

    it('returns 404 when the alternative is not in tenant scope', async () => {
      prismaMock.alternative.findFirst.mockResolvedValue(null)

      const app = makeApp()
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/alternatives/${ALT_ID}/price-breakdown`,
        headers: authHeaders(),
      })

      expect(response.statusCode).toBe(404)
      await app.close()
    })
  })
})
