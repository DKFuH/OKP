import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tenantA = 'tenant-a'
const tenantB = 'tenant-b'
const roomId = 'room-1'
const constraintId = 'constraint-1'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    geometryConstraint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

vi.mock('../services/dimensionResolver.js', () => ({
  refreshRoomDimensions: vi.fn(),
}))

import { constraintRoutes } from './constraints.js'

function constraintFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: constraintId,
    tenant_id: tenantA,
    room_id: roomId,
    type: 'horizontal',
    target_refs: ['w1'],
    value_json: {},
    enabled: true,
    created_at: '2026-03-04T01:35:00.000Z',
    updated_at: '2026-03-04T01:35:00.000Z',
    ...overrides,
  }
}

async function createApp() {
  const app = Fastify()
  app.decorateRequest('tenantId', null)
  app.addHook('preHandler', async (request) => {
    request.tenantId = tenantA
  })
  await app.register(constraintRoutes, { prefix: '/api/v1' })
  return app
}

describe('constraintRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.room.findUnique.mockResolvedValue({
      id: roomId,
      project: { tenant_id: tenantA },
      boundary: {
        vertices: [
          { id: 'v1', x_mm: 0, y_mm: 0 },
          { id: 'v2', x_mm: 1000, y_mm: 0 },
        ],
        wall_segments: [{ id: 'w1', start_vertex_id: 'v1', end_vertex_id: 'v2' }],
      },
      placements: [{ id: 'p1', wall_id: 'w1', worldPos: { x_mm: 200, y_mm: 0 } }],
    })
    prismaMock.room.update.mockResolvedValue({ id: roomId })

    prismaMock.geometryConstraint.findMany.mockResolvedValue([constraintFixture()])
    prismaMock.geometryConstraint.findUnique.mockResolvedValue(constraintFixture())
    prismaMock.geometryConstraint.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      constraintFixture(data),
    )
    prismaMock.geometryConstraint.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      constraintFixture(data),
    )
    prismaMock.geometryConstraint.delete.mockResolvedValue(constraintFixture())
  })

  it('GET /rooms/:id/constraints returns room constraints', async () => {
    const app = await createApp()

    const res = await app.inject({ method: 'GET', url: `/api/v1/rooms/${roomId}/constraints` })

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(prismaMock.geometryConstraint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: tenantA, room_id: roomId },
      }),
    )

    await app.close()
  })

  it('POST /rooms/:id/constraints creates a constraint', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/constraints`,
      payload: {
        type: 'driving_dimension',
        target_refs: ['w1'],
        value_json: { length_mm: 1200 },
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ type: 'driving_dimension' })

    await app.close()
  })

  it('POST /rooms/:id/constraints enforces tenant ownership via project tenant', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: roomId,
      project: { tenant_id: tenantB },
      boundary: { vertices: [], wall_segments: [] },
      placements: [],
    })
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/constraints`,
      payload: {
        type: 'horizontal',
        target_refs: ['w1'],
        value_json: {},
      },
    })

    expect(res.statusCode).toBe(404)
    expect(prismaMock.geometryConstraint.create).not.toHaveBeenCalled()

    await app.close()
  })

  it('PUT /constraints/:id enforces tenant ownership', async () => {
    prismaMock.geometryConstraint.findUnique.mockResolvedValue(constraintFixture({ tenant_id: tenantB }))
    const app = await createApp()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/constraints/${constraintId}`,
      payload: {
        type: 'horizontal',
        target_refs: ['w1'],
        value_json: {},
      },
    })

    expect(res.statusCode).toBe(404)

    await app.close()
  })

  it('POST /rooms/:id/constraints/solve returns solved geometry', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/constraints/solve`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      room_id: roomId,
      persisted: false,
      wall_segments: expect.any(Array),
      placements: expect.any(Array),
    })

    await app.close()
  })

  it('POST /rooms/:id/constraints/solve?persist=true writes room update', async () => {
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/constraints/solve?persist=true`,
    })

    expect(res.statusCode).toBe(200)
    expect(prismaMock.room.update).toHaveBeenCalledTimes(1)

    await app.close()
  })

  it('POST /rooms/:id/constraints/solve enforces tenant ownership via project tenant', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: roomId,
      project: { tenant_id: tenantB },
      boundary: { vertices: [], wall_segments: [] },
      placements: [],
    })
    const app = await createApp()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rooms/${roomId}/constraints/solve`,
    })

    expect(res.statusCode).toBe(404)

    await app.close()
  })
})
