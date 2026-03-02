/**
 * shareLinks.test.ts – Sprint 44
 *
 * Route-level tests for the share-link endpoints.
 * Uses Vitest + Fastify inject (no real database).
 */
import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT_ID = 'tenant-001'
const TOKEN = 'abc123def456'

// ─── Hoisted mocks ───────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        shareLink: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
        },
    },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { shareLinkRoutes } from './shareLinks.js'

// ─── Helpers ─────────────────────────────────────────────────────

function makeApp(tenantId?: string) {
    const app = Fastify()
    app.decorateRequest('tenantId', tenantId ?? null)
    app.decorateRequest('branchId', null)
    app.register(shareLinkRoutes, { prefix: '/api/v1' })
    return app
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

const sampleLink = {
    id: 'link-uuid-0001',
    token: TOKEN,
    tenant_id: TENANT_ID,
    entity_type: 'alternative',
    entity_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    expires_at: futureDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

// ─── POST /share-links ────────────────────────────────────────────

describe('POST /share-links', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates a share link with expiry and returns 201', async () => {
        prismaMock.shareLink.create.mockResolvedValue(sampleLink)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/share-links',
            payload: {
                entity_type: 'alternative',
                entity_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                expires_in_days: 7,
            },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json()).toMatchObject({ token: TOKEN, entity_type: 'alternative' })
        expect(prismaMock.shareLink.create).toHaveBeenCalledOnce()
        await app.close()
    })

    it('creates a share link without expiry', async () => {
        const noExpiryLink = { ...sampleLink, expires_at: null }
        prismaMock.shareLink.create.mockResolvedValue(noExpiryLink)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/share-links',
            payload: {
                entity_type: 'alternative',
                entity_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json()).toMatchObject({ expires_at: null })
        await app.close()
    })

    it('returns 400 when entity_type is missing', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/share-links',
            payload: { entity_id: 'some-id' },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 403 when tenant scope is missing', async () => {
        const app = makeApp(undefined)
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/share-links',
            payload: { entity_type: 'alternative', entity_id: 'some-id' },
        })

        expect(res.statusCode).toBe(403)
        await app.close()
    })
})

// ─── GET /share-links/:token ──────────────────────────────────────

describe('GET /share-links/:token', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns the share link when it is still valid', async () => {
        prismaMock.shareLink.findUnique.mockResolvedValue(sampleLink)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/share-links/${TOKEN}`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ token: TOKEN })
        await app.close()
    })

    it('returns 410 Gone when the link has expired', async () => {
        const expiredLink = { ...sampleLink, expires_at: pastDate }
        prismaMock.shareLink.findUnique.mockResolvedValue(expiredLink)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/share-links/${TOKEN}`,
        })

        expect(res.statusCode).toBe(410)
        expect(res.json()).toMatchObject({ error: 'GONE' })
        await app.close()
    })

    it('returns the link when expires_at is null (no expiry set)', async () => {
        const noExpiryLink = { ...sampleLink, expires_at: null }
        prismaMock.shareLink.findUnique.mockResolvedValue(noExpiryLink)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/share-links/${TOKEN}`,
        })

        expect(res.statusCode).toBe(200)
        await app.close()
    })

    it('returns 404 when the token does not exist', async () => {
        prismaMock.shareLink.findUnique.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/share-links/nonexistent-token',
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})

// ─── PATCH /share-links/:token ────────────────────────────────────

describe('PATCH /share-links/:token', () => {
    beforeEach(() => vi.clearAllMocks())

    it('extends the expiry of an existing link', async () => {
        prismaMock.shareLink.findFirst.mockResolvedValue(sampleLink)
        prismaMock.shareLink.update.mockResolvedValue({
            ...sampleLink,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/share-links/${TOKEN}`,
            payload: { expires_in_days: 30 },
        })

        expect(res.statusCode).toBe(200)
        expect(prismaMock.shareLink.update).toHaveBeenCalledOnce()
        await app.close()
    })

    it('returns 404 when link not found', async () => {
        prismaMock.shareLink.findFirst.mockResolvedValue(null)

        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/share-links/${TOKEN}`,
            payload: { expires_in_days: 30 },
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })

    it('returns 400 when expires_in_days is missing', async () => {
        const app = makeApp(TENANT_ID)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/share-links/${TOKEN}`,
            payload: {},
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 403 when tenant scope is missing', async () => {
        const app = makeApp(undefined)
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/share-links/${TOKEN}`,
            payload: { expires_in_days: 7 },
        })

        expect(res.statusCode).toBe(403)
        await app.close()
    })
})
