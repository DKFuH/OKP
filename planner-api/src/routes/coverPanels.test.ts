/**
 * coverPanels.test.ts – Sprint 45
 *
 * Route-level tests for cover-panel rebuild, listing, and placement
 * properties endpoints.  Uses Vitest + Fastify inject (no real database).
 */
import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ALT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PLACEMENT_ID = 'placement-001'
const TENANT_ID = 'tenant-001'

// ─── Hoisted mocks ───────────────────────────────────────────────

const { serviceMock } = vi.hoisted(() => ({
    serviceMock: {
        rebuild: vi.fn(),
        list: vi.fn(),
        setPlacementProperties: vi.fn(),
    },
}))

vi.mock('../services/coverPanelService.js', () => ({
    CoverPanelService: serviceMock,
}))

const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        alternative: { findUnique: vi.fn() },
    },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { coverPanelRoutes } from './coverPanels.js'

// ─── Helpers ─────────────────────────────────────────────────────

function makeApp(tenantId?: string) {
    const app = Fastify()
    app.decorateRequest('tenantId', tenantId ?? null)
    app.decorateRequest('branchId', null)
    app.register(coverPanelRoutes, { prefix: '/api/v1' })
    return app
}

const sampleAlternative = { id: ALT_ID, area_id: 'area-1', name: 'Variante A', is_active: false }

const samplePanel = {
    id: 'cp-01',
    alternative_id: ALT_ID,
    cabinet_id: 'cab-1',
    width_mm: 600,
    depth_mm: 580,
    generated: true,
    created_at: new Date().toISOString(),
}

// ─── POST /alternatives/:id/cover-panels/rebuild ─────────────────

describe('POST /alternatives/:id/cover-panels/rebuild', () => {
    beforeEach(() => vi.clearAllMocks())

    it('rebuilds cover panels and returns summary', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)
        serviceMock.rebuild.mockResolvedValue({
            alternative_id: ALT_ID,
            deleted: 0,
            created: 1,
            items: [samplePanel],
        })

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels/rebuild`,
            payload: {
                cabinets: [{ cabinet_id: 'cab-1', width_mm: 600, depth_mm: 580 }],
            },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ alternative_id: ALT_ID, created: 1 })
        expect(serviceMock.rebuild).toHaveBeenCalledOnce()
        await app.close()
    })

    it('returns 200 with empty items when no cabinets provided', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)
        serviceMock.rebuild.mockResolvedValue({
            alternative_id: ALT_ID,
            deleted: 0,
            created: 0,
            items: [],
        })

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels/rebuild`,
            payload: { cabinets: [] },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ created: 0, items: [] })
        await app.close()
    })

    it('returns 400 for invalid cabinet entry (missing width_mm)', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels/rebuild`,
            payload: { cabinets: [{ cabinet_id: 'cab-1', depth_mm: 580 }] },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 404 when alternative not found', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels/rebuild`,
            payload: { cabinets: [] },
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })

    it('returns 400 for invalid UUID param', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/alternatives/not-a-uuid/cover-panels/rebuild',
            payload: { cabinets: [] },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 403 when tenant scope is missing', async () => {
        const app = makeApp(undefined)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels/rebuild`,
            payload: { cabinets: [] },
        })

        expect(res.statusCode).toBe(403)
        await app.close()
    })
})

// ─── GET /alternatives/:id/cover-panels ──────────────────────────

describe('GET /alternatives/:id/cover-panels', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns list of cover panels', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)
        serviceMock.list.mockResolvedValue([samplePanel])

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual(expect.arrayContaining([
            expect.objectContaining({ cabinet_id: 'cab-1', width_mm: 600 }),
        ]))
        expect(serviceMock.list).toHaveBeenCalledWith(ALT_ID)
        await app.close()
    })

    it('returns empty array when no cover panels exist', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)
        serviceMock.list.mockResolvedValue([])

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual([])
        await app.close()
    })

    it('returns 404 when alternative not found', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/alternatives/${ALT_ID}/cover-panels`,
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})

// ─── PATCH /placements/:id/properties ────────────────────────────

describe('PATCH /placements/:id/properties', () => {
    beforeEach(() => vi.clearAllMocks())

    it('sets custom_depth_mm and returns the record', async () => {
        serviceMock.setPlacementProperties.mockResolvedValue({
            id: 'cp-props-01',
            placement_id: PLACEMENT_ID,
            custom_depth_mm: 540,
            cost_type: 'nicht_bauseits',
        })

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/placements/${PLACEMENT_ID}/properties`,
            payload: { custom_depth_mm: 540 },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ placement_id: PLACEMENT_ID, custom_depth_mm: 540 })
        expect(serviceMock.setPlacementProperties).toHaveBeenCalledWith(
            PLACEMENT_ID,
            { custom_depth_mm: 540 },
        )
        await app.close()
    })

    it('sets cost_type to bauseits', async () => {
        serviceMock.setPlacementProperties.mockResolvedValue({
            id: 'cp-props-02',
            placement_id: PLACEMENT_ID,
            custom_depth_mm: null,
            cost_type: 'bauseits',
        })

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/placements/${PLACEMENT_ID}/properties`,
            payload: { cost_type: 'bauseits' },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ cost_type: 'bauseits' })
        await app.close()
    })

    it('returns 400 when invalid cost_type is provided', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/placements/${PLACEMENT_ID}/properties`,
            payload: { cost_type: 'invalid_type' },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 400 when neither custom_depth_mm nor cost_type is provided', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/placements/${PLACEMENT_ID}/properties`,
            payload: {},
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 403 when tenant scope is missing', async () => {
        const app = makeApp(undefined)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/placements/${PLACEMENT_ID}/properties`,
            payload: { custom_depth_mm: 540 },
        })

        expect(res.statusCode).toBe(403)
        await app.close()
    })
})
