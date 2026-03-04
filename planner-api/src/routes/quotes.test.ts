import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    project: { findUnique: vi.fn() },
    quote: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    quoteItem: { update: vi.fn() },
    quoteSettings: { findUnique: vi.fn() },
    tenantSetting: { findUnique: vi.fn() },
    lead: { findFirst: vi.fn() },
    taxProfile: { findUnique: vi.fn() },
    discountProfile: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  }
  mock.$transaction.mockImplementation(async (cb: (tx: typeof mock) => Promise<unknown>) => cb(mock))
  return { prismaMock: mock }
})

const { registerProjectDocumentMock } = vi.hoisted(() => ({
  registerProjectDocumentMock: vi.fn(),
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

vi.mock('../services/documentRegistry.js', () => ({
  registerProjectDocument: registerProjectDocumentMock,
}))

import { quoteRoutes } from './quotes.js'

describe('quoteRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registerProjectDocumentMock.mockResolvedValue({ id: 'doc-1' })
    prismaMock.tenantSetting.findUnique.mockResolvedValue(null)
    prismaMock.lead.findFirst.mockResolvedValue(null)
    prismaMock.quote.update.mockResolvedValue({ id: 'quote-updated' })
  })

  it('creates a new quote with incremented version and items', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111' })
    prismaMock.quote.findFirst.mockResolvedValue({ version: 2 })
    prismaMock.quoteSettings.findUnique.mockResolvedValue({
      quote_number_prefix: 'ANG',
      default_validity_days: 30,
      default_free_text: 'Standardtext',
      default_footer_text: 'Standardfuss',
    })
    prismaMock.quote.create.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      project_id: '11111111-1111-1111-1111-111111111111',
      version: 3,
      quote_number: 'ANG-2026-0003',
      status: 'draft',
      valid_until: new Date('2026-03-31T00:00:00.000Z'),
      free_text: 'Standardtext',
      footer_text: 'Standardfuss',
      price_snapshot: { total_gross: 999 },
      created_at: new Date('2026-03-01T00:00:00.000Z'),
      items: [
        {
          id: 'it-1',
          quote_id: '22222222-2222-2222-2222-222222222222',
          position: 1,
          type: 'cabinet',
          description: 'Unterschrank 60',
          qty: 1,
          unit: 'stk',
          unit_price_net: 500,
          line_net: 500,
          tax_rate: 0.19,
          line_gross: 595,
          notes: null,
          show_on_quote: true,
        },
      ],
    })

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/create-quote',
      payload: {
        bom_lines: [
          {
            type: 'cabinet',
            description: 'Unterschrank 60',
            qty: 1,
            unit: 'stk',
            line_net_after_discounts: 500,
            tax_rate: 0.19,
          },
        ],
        price_summary: { total_gross: 999 },
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.version).toBe(3)
    expect(body.items).toHaveLength(1)

    expect(prismaMock.quote.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.quote.create.mock.calls[0][0].data.quote_number).toContain('ANG-')

    await app.close()
  })

  it('returns quote by id', async () => {
    prismaMock.quote.findUnique.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      project_id: '11111111-1111-1111-1111-111111111111',
      version: 1,
      quote_number: 'ANG-2026-0001',
      items: [],
    })

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/quotes/33333333-3333-3333-3333-333333333333',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().id).toBe('33333333-3333-3333-3333-333333333333')

    await app.close()
  })

  it('returns a pdf attachment for export endpoint', async () => {
    prismaMock.quote.findUnique.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      project_id: '11111111-1111-1111-1111-111111111111',
      version: 4,
      quote_number: 'ANG-2026-0004',
      valid_until: new Date('2026-03-31T00:00:00.000Z'),
      free_text: 'Projekt fuer Musterkunde',
      footer_text: 'Vielen Dank',
      price_snapshot: {
        subtotal_net: 500,
        vat_amount: 95,
        total_gross: 595,
      },
      items: [
        {
          id: 'it-1',
          quote_id: '44444444-4444-4444-4444-444444444444',
          position: 1,
          type: 'cabinet',
          description: 'Unterschrank 60',
          qty: 1,
          unit: 'stk',
          unit_price_net: 500,
          line_net: 500,
          tax_rate: 0.19,
          line_gross: 595,
          notes: null,
          show_on_quote: true,
        },
      ],
      project: {
        id: '11111111-1111-1111-1111-111111111111',
        tenant_id: '00000000-0000-0000-0000-000000000001',
      },
    })

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/44444444-4444-4444-4444-444444444444/export-pdf',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(response.headers['content-disposition']).toContain('ang-2026-0004.pdf')
    expect(response.body.startsWith('%PDF-1.4')).toBe(true)
    expect(response.body).toContain('ANG-2026-0004')
    expect(response.body).toContain('Unterschrank 60')
    expect(response.headers['x-document-id']).toBe('doc-1')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: '11111111-1111-1111-1111-111111111111',
        tenantId: '00000000-0000-0000-0000-000000000001',
        type: 'quote_pdf',
        sourceKind: 'quote_export',
        sourceId: '44444444-4444-4444-4444-444444444444',
      }),
    )

    await app.close()
  })

  it('returns 404 for pdf export when quote is missing', async () => {
    prismaMock.quote.findUnique.mockResolvedValue(null)

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/44444444-4444-4444-4444-444444444444/export-pdf',
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('resequences quote line positions starting at a given index', async () => {
    const quoteId = '55555555-5555-5555-5555-555555555555'

    prismaMock.quote.findFirst
      .mockResolvedValueOnce({
        id: quoteId,
        items: [
          { id: 'it-1', position: 1 },
          { id: 'it-2', position: 2 },
        ],
      })
      .mockResolvedValueOnce({
        id: quoteId,
        items: [
          { id: 'it-1', position: 100 },
          { id: 'it-2', position: 101 },
        ],
      })

    prismaMock.quoteItem.update.mockResolvedValue({})

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/quotes/${quoteId}/resequence-lines`,
      payload: { start_position: 100 },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      quote_id: quoteId,
      start_position: 100,
      updated_count: 2,
      items: [
        { id: 'it-1', position: 100 },
        { id: 'it-2', position: 101 },
      ],
    })
    expect(prismaMock.quoteItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'it-1' },
      data: { position: 100 },
    })
    expect(prismaMock.quoteItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'it-2' },
      data: { position: 101 },
    })

    await app.close()
  })

  it('returns 404 when resequence target quote is missing', async () => {
    prismaMock.quote.findFirst.mockResolvedValue(null)

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/55555555-5555-5555-5555-555555555555/resequence-lines',
      payload: { start_position: 10 },
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('returns 400 for invalid resequence payload', async () => {
    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/55555555-5555-5555-5555-555555555555/resequence-lines',
      payload: { start_position: 0 },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })

  it('returns zero updates when quote has no items to resequence', async () => {
    const quoteId = '55555555-5555-5555-5555-555555555555'
    prismaMock.quote.findFirst.mockResolvedValue({
      id: quoteId,
      items: [],
    })

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/quotes/${quoteId}/resequence-lines`,
      payload: {},
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      quote_id: quoteId,
      start_position: 1,
      updated_count: 0,
      items: [],
    })
    expect(prismaMock.quoteItem.update).not.toHaveBeenCalled()

    await app.close()
  })

  it('applies tenant scope in resequence endpoint', async () => {
    const quoteId = '55555555-5555-5555-5555-555555555555'
    const tenantId = '00000000-0000-0000-0000-000000000001'
    prismaMock.quote.findFirst.mockResolvedValue({
      id: quoteId,
      items: [],
    })

    const app = Fastify()
    app.decorateRequest('tenantId', null)
    app.addHook('preHandler', (request, _reply, done) => {
      request.tenantId = tenantId
      done()
    })
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/quotes/${quoteId}/resequence-lines`,
      payload: {},
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.quote.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: quoteId,
          project: { tenant_id: tenantId },
        }),
      }),
    )

    await app.close()
  })

  it('exports quote pdf in english when locale_code=en is requested', async () => {
    prismaMock.quote.findUnique.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      project_id: '11111111-1111-1111-1111-111111111111',
      version: 4,
      quote_number: 'ANG-2026-0004',
      locale_code: 'de',
      valid_until: new Date('2026-03-31T00:00:00.000Z'),
      free_text: 'Projekt fuer Musterkunde',
      footer_text: 'Vielen Dank',
      price_snapshot: {
        subtotal_net: 500,
        vat_amount: 95,
        total_gross: 595,
      },
      items: [
        {
          id: 'it-1',
          quote_id: '44444444-4444-4444-4444-444444444444',
          position: 1,
          type: 'cabinet',
          description: 'Base Cabinet 60',
          qty: 1,
          unit: 'pcs',
          unit_price_net: 500,
          line_net: 500,
          tax_rate: 0.19,
          line_gross: 595,
          notes: null,
          show_on_quote: true,
        },
      ],
      project: {
        id: '11111111-1111-1111-1111-111111111111',
        tenant_id: '00000000-0000-0000-0000-000000000001',
      },
    })

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/44444444-4444-4444-4444-444444444444/export-pdf',
      payload: { locale_code: 'en' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('QUOTE ANG-2026-0004')
    expect(response.body).toContain('VAT 19%: EUR 95.00')
    expect(prismaMock.quote.update).toHaveBeenCalledWith({
      where: { id: '44444444-4444-4444-4444-444444444444' },
      data: { locale_code: 'en' },
    })

    await app.close()
  })

  // ── Sprint 96: recalculate-financials ─────────────────────────────────

  function makeQuoteWithItems(overrides: Record<string, unknown> = {}) {
    return {
      id: '55555555-5555-5555-5555-555555555555',
      project_id: '11111111-1111-1111-1111-111111111111',
      version: 1,
      quote_number: 'ANG-2026-0001',
      status: 'draft',
      tax_profile_id: null,
      discount_profile_id: null,
      tax_profile: null,
      discount_profile: null,
      items: [
        {
          id: 'qi-001',
          position: 1,
          type: 'cabinet',
          description: 'Unterschrank',
          qty: 1,
          unit: 'stk',
          unit_price_net: 1000,
          line_net: 1000,
          tax_rate: 0.19,
          line_gross: 1190,
          notes: null,
          show_on_quote: true,
        },
      ],
      ...overrides,
    }
  }

  it('recalculate-financials returns correct Brutto/Netto/MwSt breakdown', async () => {
    prismaMock.quote.findUnique.mockResolvedValue(makeQuoteWithItems())
    prismaMock.taxProfile.findUnique.mockResolvedValue(null)
    prismaMock.discountProfile.findUnique.mockResolvedValue(null)

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/55555555-5555-5555-5555-555555555555/recalculate-financials',
      payload: {},
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.quote_id).toBe('55555555-5555-5555-5555-555555555555')
    expect(body.subtotal_net).toBe(1000)
    expect(body.vat_amount).toBe(190)
    expect(body.total_gross).toBe(1190)
    expect(body.skonto_pct).toBe(0)
    expect(body.skonto_amount).toBe(0)
    expect(body.total_gross_after_skonto).toBe(1190)

    await app.close()
  })

  it('recalculate-financials applies a TaxProfile override', async () => {
    prismaMock.quote.findUnique.mockResolvedValue(makeQuoteWithItems())
    prismaMock.taxProfile.findUnique.mockResolvedValue({
      id: 'tp-001',
      tenant_id: null,
      name: 'Reduzierter Satz',
      description: null,
      tax_rate: 0.07,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    prismaMock.discountProfile.findUnique.mockResolvedValue(null)

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/55555555-5555-5555-5555-555555555555/recalculate-financials',
      payload: { tax_profile_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    // tax overridden to 7%: 1000 * 0.07 = 70
    expect(body.vat_amount).toBe(70)
    expect(body.total_gross).toBe(1070)

    await app.close()
  })

  it('recalculate-financials applies a DiscountProfile (Skonto)', async () => {
    prismaMock.quote.findUnique.mockResolvedValue(makeQuoteWithItems())
    prismaMock.taxProfile.findUnique.mockResolvedValue(null)
    prismaMock.discountProfile.findUnique.mockResolvedValue({
      id: 'dp-001',
      tenant_id: null,
      name: '2% Skonto',
      description: null,
      skonto_pct: 2,
      payment_days: 10,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/55555555-5555-5555-5555-555555555555/recalculate-financials',
      payload: { discount_profile_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.skonto_pct).toBe(2)
    expect(body.skonto_amount).toBe(23.8)  // 1190 * 2%
    expect(body.total_gross_after_skonto).toBe(1166.2)

    await app.close()
  })

  it('recalculate-financials returns 404 when quote not found', async () => {
    prismaMock.quote.findUnique.mockResolvedValue(null)

    const app = Fastify()
    await app.register(quoteRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/quotes/55555555-5555-5555-5555-555555555555/recalculate-financials',
      payload: {},
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })
})
