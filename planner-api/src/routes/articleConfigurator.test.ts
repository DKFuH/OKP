import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const articleId = '11111111-1111-1111-1111-111111111111'
const propertyId = '22222222-2222-2222-2222-222222222222'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    catalogArticle: {
      findUnique: vi.fn(),
    },
    catalogArticleProperty: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    catalogArticlePriceTable: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    userArticleProfile: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { articleConfiguratorRoutes } from './articleConfigurator.js'

describe('articleConfiguratorRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.catalogArticle.findUnique.mockResolvedValue({ id: articleId })
    prismaMock.catalogArticleProperty.findMany.mockResolvedValue([])
    prismaMock.catalogArticlePriceTable.findMany.mockResolvedValue([])
  })

  it('POST /catalog-articles/:articleId/properties returns 201', async () => {
    prismaMock.catalogArticleProperty.create.mockResolvedValue({
      id: propertyId,
      article_id: articleId,
      key: 'front_color',
      label: 'Frontfarbe',
      type: 'enum',
      options: [{ value: 'white', label: 'Weiß' }],
      depends_on: {},
      sort_order: 0,
    })

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/properties`,
      payload: {
        key: 'front_color',
        label: 'Frontfarbe',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
      },
    })

    expect(response.statusCode).toBe(201)
    await app.close()
  })

  it('GET /catalog-articles/:articleId/properties returns 200 array', async () => {
    prismaMock.catalogArticleProperty.findMany.mockResolvedValue([
      {
        id: propertyId,
        article_id: articleId,
        key: 'front_color',
        label: 'Frontfarbe',
        type: 'enum',
        options: [],
        depends_on: {},
        sort_order: 0,
      },
    ])

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/catalog-articles/${articleId}/properties`,
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)
    await app.close()
  })

  it('DELETE /catalog-articles/:articleId/properties/:propertyId returns 204', async () => {
    prismaMock.catalogArticleProperty.findUnique.mockResolvedValue({
      id: propertyId,
      article_id: articleId,
    })
    prismaMock.catalogArticleProperty.delete.mockResolvedValue({ id: propertyId })

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/catalog-articles/${articleId}/properties/${propertyId}`,
    })

    expect(response.statusCode).toBe(204)
    await app.close()
  })

  it('POST /catalog-articles/:articleId/validate-configuration returns valid=true for valid configuration', async () => {
    prismaMock.catalogArticleProperty.findMany.mockResolvedValue([
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: {},
        sort_order: 0,
      },
    ])

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/validate-configuration`,
      payload: {
        values: { front_color: 'white' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ valid: true })
    await app.close()
  })

  it('POST /catalog-articles/:articleId/validate-configuration returns valid=false for invalid configuration', async () => {
    prismaMock.catalogArticleProperty.findMany.mockResolvedValue([
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: {},
        sort_order: 0,
      },
    ])

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/validate-configuration`,
      payload: {
        values: { front_color: 'black' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ valid: false })
    await app.close()
  })

  it('POST /catalog-articles/:articleId/validate-configuration returns price_net from price lookup', async () => {
    prismaMock.catalogArticleProperty.findMany.mockResolvedValue([
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: {},
        sort_order: 0,
      },
    ])
    prismaMock.catalogArticlePriceTable.findMany.mockResolvedValue([
      {
        property_combination: { front_color: 'white', width_mm: 600 },
        price_net: 249.9,
      },
    ])

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/validate-configuration`,
      payload: {
        values: { front_color: 'white', width_mm: 600 },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ price_net: 249.9 })
    await app.close()
  })

  it('POST /catalog-articles/:articleId/price-table returns 201', async () => {
    prismaMock.catalogArticlePriceTable.create.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      article_id: articleId,
      property_combination: { front_color: 'white' },
      price_net: 199.9,
    })

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/price-table`,
      payload: {
        property_combination: { front_color: 'white' },
        price_net: 199.9,
      },
    })

    expect(response.statusCode).toBe(201)
    await app.close()
  })

  it('GET /catalog-articles/:articleId/price-table returns 200 array', async () => {
    prismaMock.catalogArticlePriceTable.findMany.mockResolvedValue([
      {
        id: '33333333-3333-3333-3333-333333333333',
        article_id: articleId,
        property_combination: { front_color: 'white' },
        price_net: 199.9,
      },
    ])

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/catalog-articles/${articleId}/price-table`,
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)
    await app.close()
  })

  it('POST /article-profiles returns 201', async () => {
    prismaMock.userArticleProfile.create.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      user_id: 'user-1',
      article_id: articleId,
      name: 'Profil A',
      property_values: { front_color: 'white' },
    })

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/article-profiles',
      payload: {
        article_id: articleId,
        user_id: 'user-1',
        name: 'Profil A',
        property_values: { front_color: 'white' },
      },
    })

    expect(response.statusCode).toBe(201)
    await app.close()
  })

  it('GET /article-profiles/:userId returns 200 array', async () => {
    prismaMock.userArticleProfile.findMany.mockResolvedValue([
      {
        id: '44444444-4444-4444-4444-444444444444',
        user_id: 'user-1',
        article_id: articleId,
        name: 'Profil A',
        property_values: { front_color: 'white' },
      },
    ])

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/article-profiles/user-1',
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)
    await app.close()
  })

  it('POST /catalog-articles/:articleId/validate-configuration returns 404 for unknown article', async () => {
    prismaMock.catalogArticle.findUnique.mockResolvedValue(null)

    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/validate-configuration`,
      payload: { values: { front_color: 'white' } },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ error: 'NOT_FOUND' })
    await app.close()
  })

  it('POST /catalog-articles/:articleId/properties returns 400 for invalid type', async () => {
    const app = Fastify()
    await app.register(articleConfiguratorRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/catalog-articles/${articleId}/properties`,
      payload: {
        key: 'front_color',
        label: 'Frontfarbe',
        type: 'unsupported',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })
    await app.close()
  })
})
