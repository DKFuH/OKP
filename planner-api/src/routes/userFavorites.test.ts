/**
 * userFavorites.test.ts – Sprint 43
 *
 * Route-level tests for user favorites and model templates endpoints.
 * Uses Vitest + Fastify inject (no real database).
 */
import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = 'user-0001'
const TEMPLATE_ID = 'tmpl-0001'

// ─── Hoisted mocks ───────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        userFavorite: {
            upsert: vi.fn(),
            findUnique: vi.fn(),
            delete: vi.fn(),
            findMany: vi.fn(),
        },
        modelTemplate: {
            create: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { userFavoritesRoutes } from './userFavorites.js'

// ─── Helpers ─────────────────────────────────────────────────────

function makeApp() {
    const app = Fastify()
    app.register(userFavoritesRoutes, { prefix: '/api/v1' })
    return app
}

const sampleFavorite = {
    id: 'fav-001',
    user_id: USER_ID,
    tenant_id: null,
    entity_type: 'catalog_article',
    entity_id: 'art-42',
    created_at: new Date().toISOString(),
}

const sampleTemplate = {
    id: TEMPLATE_ID,
    user_id: USER_ID,
    tenant_id: null,
    name: 'Mein Küchenstil',
    model_settings: { manufacturer: 'Nolte', handle: 'Grifflos' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
}

// ─── POST /user/favorites ─────────────────────────────────────────

describe('POST /user/favorites', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates a favorite and returns 201', async () => {
        prismaMock.userFavorite.upsert.mockResolvedValue(sampleFavorite)

        const app = makeApp()
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/user/favorites?user_id=${USER_ID}`,
            payload: { entity_type: 'catalog_article', entity_id: 'art-42' },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json()).toMatchObject({ entity_type: 'catalog_article', entity_id: 'art-42' })
        expect(prismaMock.userFavorite.upsert).toHaveBeenCalledOnce()
        await app.close()
    })

    it('returns 400 when user_id is missing', async () => {
        const app = makeApp()
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/user/favorites',
            payload: { entity_type: 'catalog_article', entity_id: 'art-42' },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })

    it('returns 400 when entity_type is missing', async () => {
        const app = makeApp()
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/user/favorites?user_id=${USER_ID}`,
            payload: { entity_id: 'art-42' },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })
})

// ─── DELETE /user/favorites/:entityType/:entityId ─────────────────

describe('DELETE /user/favorites/:entityType/:entityId', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deletes a favorite and returns 204', async () => {
        prismaMock.userFavorite.findUnique.mockResolvedValue(sampleFavorite)
        prismaMock.userFavorite.delete.mockResolvedValue(sampleFavorite)

        const app = makeApp()
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/favorites/catalog_article/art-42?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(204)
        await app.close()
    })

    it('returns 404 when favorite not found', async () => {
        prismaMock.userFavorite.findUnique.mockResolvedValue(null)

        const app = makeApp()
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/favorites/catalog_article/art-99?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})

// ─── GET /user/favorites ──────────────────────────────────────────

describe('GET /user/favorites', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns list of favorites', async () => {
        prismaMock.userFavorite.findMany.mockResolvedValue([sampleFavorite])

        const app = makeApp()
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/user/favorites?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toHaveLength(1)
        await app.close()
    })

    it('filters by entity_type when query param provided', async () => {
        prismaMock.userFavorite.findMany.mockResolvedValue([sampleFavorite])

        const app = makeApp()
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/user/favorites?user_id=${USER_ID}&entity_type=catalog_article`,
        })

        expect(res.statusCode).toBe(200)
        expect(prismaMock.userFavorite.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ entity_type: 'catalog_article' }),
            }),
        )
        await app.close()
    })
})

// ─── POST /user/model-templates ───────────────────────────────────

describe('POST /user/model-templates', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates a model template and returns 201', async () => {
        prismaMock.modelTemplate.create.mockResolvedValue(sampleTemplate)

        const app = makeApp()
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/user/model-templates?user_id=${USER_ID}`,
            payload: {
                name: 'Mein Küchenstil',
                model_settings: { manufacturer: 'Nolte' },
            },
        })

        expect(res.statusCode).toBe(201)
        expect(res.json()).toMatchObject({ name: 'Mein Küchenstil' })
        expect(prismaMock.modelTemplate.create).toHaveBeenCalledOnce()
        await app.close()
    })

    it('returns 400 when name is missing', async () => {
        const app = makeApp()
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/user/model-templates?user_id=${USER_ID}`,
            payload: { model_settings: {} },
        })

        expect(res.statusCode).toBe(400)
        await app.close()
    })
})

// ─── GET /user/model-templates ────────────────────────────────────

describe('GET /user/model-templates', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns list of model templates', async () => {
        prismaMock.modelTemplate.findMany.mockResolvedValue([sampleTemplate])

        const app = makeApp()
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/user/model-templates?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toHaveLength(1)
        await app.close()
    })
})

// ─── GET /user/model-templates/:id ───────────────────────────────

describe('GET /user/model-templates/:id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns a single model template', async () => {
        prismaMock.modelTemplate.findFirst.mockResolvedValue(sampleTemplate)

        const app = makeApp()
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/user/model-templates/${TEMPLATE_ID}?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ id: TEMPLATE_ID, name: 'Mein Küchenstil' })
        await app.close()
    })

    it('returns 404 when template not found', async () => {
        prismaMock.modelTemplate.findFirst.mockResolvedValue(null)

        const app = makeApp()
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/user/model-templates/nonexistent?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})

// ─── DELETE /user/model-templates/:id ────────────────────────────

describe('DELETE /user/model-templates/:id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deletes a model template and returns 204', async () => {
        prismaMock.modelTemplate.findFirst.mockResolvedValue(sampleTemplate)
        prismaMock.modelTemplate.delete.mockResolvedValue(sampleTemplate)

        const app = makeApp()
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/model-templates/${TEMPLATE_ID}?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(204)
        await app.close()
    })

    it('returns 404 when template not found', async () => {
        prismaMock.modelTemplate.findFirst.mockResolvedValue(null)

        const app = makeApp()
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/model-templates/nonexistent?user_id=${USER_ID}`,
        })

        expect(res.statusCode).toBe(404)
        await app.close()
    })
})
