import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT_ID = 'tenant-a'
const MATERIAL_ID = '33333333-3333-4333-8333-333333333333'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    materialLibraryItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { materialLibraryRoutes } from './materialLibrary.js'

function materialFixture(overrides?: Record<string, unknown>) {
  return {
    id: MATERIAL_ID,
    tenant_id: TENANT_ID,
    name: 'Eiche Natur',
    category: 'front',
    texture_url: 'https://cdn.example/materials/oak.jpg',
    preview_url: null,
    scale_x_mm: 800,
    scale_y_mm: 800,
    rotation_deg: 0,
    roughness: 0.45,
    metallic: 0.02,
    config_json: {},
    created_at: '2026-03-04T12:00:00.000Z',
    updated_at: '2026-03-04T12:00:00.000Z',
    ...overrides,
  }
}

function roomFixture(overrides?: Record<string, unknown>) {
  return {
    id: 'room-a',
    project_id: 'project-a',
    coloring: {
      surfaces: [
        { surface: 'floor', color_hex: '#334155' },
      ],
    },
    placements: [
      {
        id: 'placement-a',
        catalog_item_id: 'catalog-a',
        wall_id: 'wall-a',
        offset_mm: 100,
        width_mm: 600,
        depth_mm: 560,
        height_mm: 720,
      },
    ],
    ...overrides,
  }
}

async function createApp() {
  const app = Fastify()
  app.decorateRequest('tenantId', null)
  app.decorateRequest('branchId', null)
  app.addHook('preHandler', async (request) => {
    request.tenantId = TENANT_ID
  })
  await app.register(materialLibraryRoutes, { prefix: '/api/v1' })
  return app
}

describe('materialLibraryRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.materialLibraryItem.findMany.mockResolvedValue([materialFixture()])
    prismaMock.materialLibraryItem.findUnique.mockResolvedValue(materialFixture())
    prismaMock.materialLibraryItem.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      materialFixture(data),
    )
    prismaMock.materialLibraryItem.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      materialFixture(data),
    )
    prismaMock.materialLibraryItem.delete.mockResolvedValue(materialFixture())
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: TENANT_ID })
    prismaMock.room.findUnique.mockResolvedValue(roomFixture())
    prismaMock.room.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'room-a',
      coloring: data.coloring,
      placements: data.placements,
    }))
  })

  it('GET /tenant/materials lists materials for tenant', async () => {
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: '/api/v1/tenant/materials' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(1)
    expect(prismaMock.materialLibraryItem.findMany).toHaveBeenCalled()
    await app.close()
  })

  it('POST /tenant/materials creates a material item', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tenant/materials',
      payload: {
        name: 'Beton Hell',
        category: 'floor',
        texture_url: 'https://cdn.example/materials/concrete.jpg',
        roughness: 0.9,
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      name: 'Beton Hell',
      category: 'floor',
    })
    await app.close()
  })

  it('PATCH /tenant/materials/:id enforces tenant ownership', async () => {
    prismaMock.materialLibraryItem.findUnique.mockResolvedValue(materialFixture({ tenant_id: 'tenant-b' }))

    const app = await createApp()
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tenant/materials/${MATERIAL_ID}`,
      payload: {
        name: 'Nicht erlaubt',
      },
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it('DELETE /tenant/materials/:id deletes existing tenant item', async () => {
    const app = await createApp()

    const response = await app.inject({ method: 'DELETE', url: `/api/v1/tenant/materials/${MATERIAL_ID}` })

    expect(response.statusCode).toBe(204)
    expect(prismaMock.materialLibraryItem.delete).toHaveBeenCalledWith({ where: { id: MATERIAL_ID } })
    await app.close()
  })

  it('POST /projects/:id/material-assignments updates surface and placement assignments', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/material-assignments',
      payload: {
        room_id: '22222222-2222-2222-2222-222222222222',
        surface_assignments: [
          {
            surface: 'floor',
            material_item_id: MATERIAL_ID,
            uv_scale: { x: 1.2, y: 1.1 },
          },
        ],
        placement_assignments: [
          {
            placement_id: 'placement-a',
            target_kind: 'placement',
            material_item_id: MATERIAL_ID,
            rotation_deg: 25,
          },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json()
    expect(payload.room_id).toBe('room-a')
    expect(payload.resolved.surfaces).toHaveLength(1)
    expect(payload.resolved.placements).toHaveLength(1)
    expect(prismaMock.room.update).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('POST /projects/:id/material-assignments rejects unknown material ids', async () => {
    prismaMock.materialLibraryItem.findMany.mockResolvedValue([])

    const app = await createApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/material-assignments',
      payload: {
        room_id: '22222222-2222-2222-2222-222222222222',
        surface_assignments: [{ surface: 'floor', material_item_id: '44444444-4444-4444-8444-444444444444' }],
      },
    })

    expect(response.statusCode).toBe(400)
    await app.close()
  })

  it('POST /projects/:id/material-assignments rejects rooms outside project scope', async () => {
    prismaMock.room.findUnique.mockResolvedValue(roomFixture({ project_id: 'project-b' }))

    const app = await createApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/material-assignments',
      payload: {
        room_id: '22222222-2222-2222-2222-222222222222',
        placement_assignments: [{ placement_id: 'placement-a', material_item_id: MATERIAL_ID }],
      },
    })

    expect(response.statusCode).toBe(400)
    await app.close()
  })
})
