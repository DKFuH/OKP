import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tenantId = 'tenant-a'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    assetLibraryItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { assetLibraryRoutes } from './assetLibrary.js'

function assetFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    tenant_id: tenantId,
    name: 'Test Asset',
    category: 'custom',
    source_format: 'obj',
    file_url: 'asset://tenant/tenant-a/test',
    preview_url: null,
    bbox_json: { width_mm: 600, height_mm: 720, depth_mm: 560 },
    default_scale_json: { factor_to_mm: 1000, axis_scale: { x: 1, y: 1, z: 1 }, source_unit: 'm' },
    tags_json: ['korpus'],
    created_at: '2026-03-04T09:00:00.000Z',
    updated_at: '2026-03-04T09:00:00.000Z',
    ...overrides,
  }
}

async function createApp() {
  const app = Fastify()
  app.decorateRequest('tenantId', null)
  app.decorateRequest('branchId', null)
  app.addHook('preHandler', async (request) => {
    request.tenantId = tenantId
  })
  await app.register(assetLibraryRoutes, { prefix: '/api/v1' })
  return app
}

describe('assetLibraryRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.assetLibraryItem.findMany.mockResolvedValue([assetFixture()])
    prismaMock.assetLibraryItem.findUnique.mockResolvedValue(assetFixture())
    prismaMock.assetLibraryItem.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => assetFixture(data))
    prismaMock.assetLibraryItem.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => assetFixture(data))
    prismaMock.assetLibraryItem.delete.mockResolvedValue(assetFixture())
  })

  it('GET /tenant/assets lists tenant assets', async () => {
    const app = await createApp()

    const res = await app.inject({ method: 'GET', url: '/api/v1/tenant/assets' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
    expect(prismaMock.assetLibraryItem.findMany).toHaveBeenCalled()
    await app.close()
  })

  it('POST /tenant/assets/import imports OBJ and stores metadata', async () => {
    const app = await createApp()

    const obj = ['v 0 0 0', 'v 0.6 0 0', 'v 0 0.72 0', 'v 0 0 0.56'].join('\n')
    const payload = {
      file_name: 'unterschrank.obj',
      file_base64: Buffer.from(obj, 'utf-8').toString('base64'),
      category: 'base',
      tags: ['Korpus', 'MDF'],
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tenant/assets/import',
      payload,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({
      source_format: 'obj',
      category: 'base',
      bbox_json: { width_mm: 600, height_mm: 720, depth_mm: 560 },
    })
    await app.close()
  })

  it('POST /tenant/assets/import returns 400 for unsupported format', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tenant/assets/import',
      payload: {
        file_name: 'asset.glb',
        file_base64: Buffer.from('binary', 'utf-8').toString('base64'),
        category: 'custom',
        tags: [],
      },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('PATCH /tenant/assets/:id enforces tenant ownership', async () => {
    prismaMock.assetLibraryItem.findUnique.mockResolvedValue(assetFixture({ tenant_id: 'other-tenant' }))

    const app = await createApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/tenant/assets/asset-1',
      payload: { name: 'Neu' },
    })

    expect(res.statusCode).toBe(404)
    await app.close()
  })

  it('DELETE /tenant/assets/:id deletes existing tenant asset', async () => {
    const app = await createApp()

    const res = await app.inject({ method: 'DELETE', url: '/api/v1/tenant/assets/asset-1' })

    expect(res.statusCode).toBe(204)
    expect(prismaMock.assetLibraryItem.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } })
    await app.close()
  })
})
