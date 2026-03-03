import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tenantA = 'tenant-a'
const tenantB = 'tenant-b'
const styleId = '11111111-1111-1111-1111-111111111111'
const sheetId = '22222222-2222-2222-2222-222222222222'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    layoutStylePreset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    layoutSheet: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { layoutStyleRoutes } from './layoutStyles.js'

function styleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: styleId,
    tenant_id: tenantA,
    name: 'Default',
    text_height_mm: 3.5,
    arrow_size_mm: 2.5,
    line_width_mm: 0.25,
    centerline_dash_mm: 6,
    symbol_scale_mm: 10,
    font_family: null,
    config_json: {},
    created_at: '2026-03-03T10:00:00.000Z',
    updated_at: '2026-03-03T10:00:00.000Z',
    ...overrides,
  }
}

async function createApp() {
  const app = Fastify()
  app.decorateRequest('tenantId', null)
  app.addHook('preHandler', async (request) => {
    request.tenantId = tenantA
  })
  await app.register(layoutStyleRoutes, { prefix: '/api/v1' })
  return app
}

describe('layoutStyleRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.layoutStylePreset.findMany.mockResolvedValue([styleFixture()])
    prismaMock.layoutStylePreset.findUnique.mockResolvedValue(styleFixture())
    prismaMock.layoutStylePreset.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => styleFixture(data))
    prismaMock.layoutStylePreset.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => styleFixture(data))
    prismaMock.layoutStylePreset.delete.mockResolvedValue(styleFixture())

    prismaMock.layoutSheet.findUnique.mockResolvedValue({
      id: sheetId,
      config: { sheet_scale: '1:25', style_preset_id: styleId, annotative_mode: true },
    })
  })

  it('GET /tenant/layout-styles returns tenant styles', async () => {
    const app = await createApp()

    const res = await app.inject({ method: 'GET', url: '/api/v1/tenant/layout-styles' })

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(prismaMock.layoutStylePreset.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenant_id: tenantA },
    }))
    await app.close()
  })

  it('POST /tenant/layout-styles creates preset', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tenant/layout-styles',
      payload: { name: 'Werkstatt', text_height_mm: 4 },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ name: 'Werkstatt', text_height_mm: 4 })
    await app.close()
  })

  it('PUT /tenant/layout-styles/:id enforces tenant ownership', async () => {
    prismaMock.layoutStylePreset.findUnique.mockResolvedValue(styleFixture({ tenant_id: tenantB }))
    const app = await createApp()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/tenant/layout-styles/${styleId}`,
      payload: { name: 'Updated' },
    })

    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('POST /layout-sheets/:id/preview-style returns resolved pixel values', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/layout-sheets/${sheetId}/preview-style`,
      payload: { sheet_scale: '1:25' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      sheet_id: sheetId,
      sheet_scale: '1:25',
      resolved: {
        text_px: expect.any(Number),
        arrow_px: expect.any(Number),
        stroke_px: expect.any(Number),
        centerline_dash_px: expect.any(Array),
      },
    })
    await app.close()
  })
})
