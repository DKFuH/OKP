/**
 * batchPrint.test.ts – Sprint 44
 *
 * Route-level tests for the batch-print and print-batch-profile endpoints.
 * Uses Vitest + Fastify inject (no real database).
 */
import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ALT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PROFILE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'

// ─── Hoisted mocks ───────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        alternative: { findUnique: vi.fn() },
        printBatchProfile: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { batchPrintRoutes } from './batchPrint.js'

// ─── Helpers ─────────────────────────────────────────────────────

function makeApp(tenantId?: string) {
    const app = Fastify()
    // Simulate tenantMiddleware
    app.decorateRequest('tenantId', tenantId ?? null)
    app.decorateRequest('branchId', null)
    app.register(batchPrintRoutes, { prefix: '/api/v1' })
    return app
}

const sampleAlternative = { id: ALT_ID, area_id: 'area-1', name: 'Variante A', is_active: false }

const sampleProfile = {
    id: PROFILE_ID,
    user_id: USER_ID,
    tenant_id: TENANT_ID,
    name: 'Mein Profil',
    form_ids: ['form-overview', 'form-dimensions'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

// ─── POST /alternatives/:id/batch-print ──────────────────────────

describe('POST /alternatives/:id/batch-print', () => {
    beforeEach(() => vi.clearAllMocks())

    it('generates and returns a merged PDF for a valid alternative', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/batch-print`,
            payload: { form_ids: ['form-overview', 'form-bom'], grayscale: false },
        })

        expect(res.statusCode).toBe(200)
        expect(res.headers['content-type']).toContain('application/pdf')
        expect(res.headers['x-batch-form-count']).toBe('2')
        // Verify PDF magic bytes
        expect(res.rawPayload.slice(0, 4).toString()).toBe('%PDF')
        await app.close()
    })

    it('generates a grayscale (B/W) PDF when grayscale=true', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/batch-print`,
            payload: { form_ids: ['form-overview'], grayscale: true },
        })

        expect(res.statusCode).toBe(200)
        expect(res.headers['content-disposition']).toContain('sw')
        await app.close()
    })

    it('returns 404 when alternative not found', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/batch-print`,
            payload: { form_ids: ['form-overview'] },
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })

    it('returns 400 when form_ids is empty', async () => {
        prismaMock.alternative.findUnique.mockResolvedValue(sampleAlternative)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/batch-print`,
            payload: { form_ids: [] },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 403 when tenant scope is missing', async () => {
        const app = makeApp(undefined)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/alternatives/${ALT_ID}/batch-print`,
            payload: { form_ids: ['form-overview'] },
        })

        expect(res.statusCode).toBe(403)
        await app.close()
    })
})

// ─── GET /user/print-batch-profiles ──────────────────────────────

describe('GET /user/print-batch-profiles', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns list of profiles for the given user', async () => {
        prismaMock.printBatchProfile.findMany.mockResolvedValue([sampleProfile])

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/user/print-batch-profiles?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Mein Profil' }),
        ]))
        await app.close()
    })

    it('returns 400 when user_id is missing', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/user/print-batch-profiles',
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })
})

// ─── POST /user/print-batch-profiles ─────────────────────────────

describe('POST /user/print-batch-profiles', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates a new profile and returns 201', async () => {
        prismaMock.printBatchProfile.create.mockResolvedValue(sampleProfile)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/user/print-batch-profiles?user_id=${USER_ID}`,
            payload: { name: 'Mein Profil', form_ids: ['form-overview', 'form-dimensions'] },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json()).toMatchObject({ name: 'Mein Profil' })
        await app.close()
    })

    it('returns 400 when name is missing', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/user/print-batch-profiles?user_id=${USER_ID}`,
            payload: { form_ids: ['form-overview'] },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })
})

// ─── PUT /user/print-batch-profiles/:id ──────────────────────────

describe('PUT /user/print-batch-profiles/:id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('updates an existing profile', async () => {
        prismaMock.printBatchProfile.findFirst.mockResolvedValue(sampleProfile)
        prismaMock.printBatchProfile.update.mockResolvedValue({
            ...sampleProfile,
            name: 'Geändertes Profil',
        })

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PUT',
            url: `/api/v1/user/print-batch-profiles/${PROFILE_ID}`,
            payload: { name: 'Geändertes Profil' },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ name: 'Geändertes Profil' })
        await app.close()
    })

    it('returns 404 when profile does not exist', async () => {
        prismaMock.printBatchProfile.findFirst.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PUT',
            url: `/api/v1/user/print-batch-profiles/${PROFILE_ID}`,
            payload: { name: 'Neuer Name' },
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})

// ─── DELETE /user/print-batch-profiles/:id ───────────────────────

describe('DELETE /user/print-batch-profiles/:id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deletes a profile and returns 204', async () => {
        prismaMock.printBatchProfile.findFirst.mockResolvedValue(sampleProfile)
        prismaMock.printBatchProfile.delete.mockResolvedValue(sampleProfile)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/print-batch-profiles/${PROFILE_ID}`,
        })

        expect(res.statusCode).toBe(204)
        await app.close()
    })

    it('returns 404 when profile does not exist', async () => {
        prismaMock.printBatchProfile.findFirst.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/print-batch-profiles/${PROFILE_ID}`,
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})
