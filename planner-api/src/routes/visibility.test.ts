import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tenantId = '00000000-0000-0000-0000-000000000001'
const projectId = '11111111-1111-1111-1111-111111111111'
const levelId = '22222222-2222-2222-2222-222222222222'
const dimensionId = '33333333-3333-3333-3333-333333333333'
const roomId = '44444444-4444-4444-4444-444444444444'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findUnique: vi.fn(),
    },
    buildingLevel: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dimension: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectEnvironment: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { tenantMiddleware } from '../tenantMiddleware.js'
import { visibilityRoutes } from './visibility.js'

async function createApp() {
  const app = Fastify()
  await app.register(tenantMiddleware)
  await app.register(visibilityRoutes, { prefix: '/api/v1' })
  return app
}

describe('visibilityRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.project.findUnique.mockResolvedValue({ id: projectId, tenant_id: tenantId })
    prismaMock.buildingLevel.findUnique.mockResolvedValue({ id: levelId, project_id: projectId })
    prismaMock.buildingLevel.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      ...data,
    }))

    prismaMock.dimension.findUnique.mockResolvedValue({ id: dimensionId, room_id: roomId })
    prismaMock.dimension.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      ...data,
    }))

    prismaMock.room.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id !== roomId) {
        return null
      }
      return {
        id: roomId,
        project_id: projectId,
        placements: [{ id: 'pl-1', wall_id: 'wall-1', offset_mm: 100, width_mm: 600, depth_mm: 560, height_mm: 720 }],
        boundary: {
          vertices: [],
          wall_segments: [{ id: 'wall-1', start_vertex_id: 'a', end_vertex_id: 'b' }],
        },
      }
    })

    prismaMock.room.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      ...data,
    }))

    prismaMock.projectEnvironment.findUnique.mockResolvedValue(null)
    prismaMock.projectEnvironment.upsert.mockImplementation(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
      ...create,
      ...update,
    }))
  })

  it('GET /projects/:id/visibility/auto-dollhouse returns defaults when config is missing', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/visibility/auto-dollhouse`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      project_id: projectId,
      enabled: false,
      alpha_front_walls: 0.32,
      distance_threshold: 2400,
      angle_threshold_deg: 35,
    })

    await app.close()
  })

  it('GET /projects/:id/visibility/auto-dollhouse reads values from project environment config', async () => {
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({
      config_json: {
        auto_dollhouse: {
          enabled: true,
          alpha_front_walls: 0.25,
          distance_threshold: 1800,
          angle_threshold_deg: 28,
        },
      },
    })
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/visibility/auto-dollhouse`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      enabled: true,
      alpha_front_walls: 0.25,
      distance_threshold: 1800,
      angle_threshold_deg: 28,
    })

    await app.close()
  })

  it('PATCH /projects/:id/visibility/auto-dollhouse updates partial settings and merges existing config', async () => {
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({
      north_angle_deg: 0,
      latitude: null,
      longitude: null,
      timezone: null,
      default_datetime: null,
      daylight_enabled: true,
      config_json: {
        render: { quality: 'balanced' },
        auto_dollhouse: {
          enabled: false,
          alpha_front_walls: 0.3,
          distance_threshold: 2200,
          angle_threshold_deg: 32,
        },
      },
    })
    const app = await createApp()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/visibility/auto-dollhouse`,
      headers: { 'x-tenant-id': tenantId },
      payload: {
        enabled: true,
        alpha_front_walls: 0.2,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      project_id: projectId,
      enabled: true,
      alpha_front_walls: 0.2,
      distance_threshold: 2200,
      angle_threshold_deg: 32,
    })
    expect(prismaMock.projectEnvironment.upsert).toHaveBeenCalledTimes(1)
    expect(prismaMock.projectEnvironment.upsert.mock.calls[0][0]).toMatchObject({
      where: { project_id: projectId },
      update: {
        config_json: {
          render: { quality: 'balanced' },
          auto_dollhouse: {
            enabled: true,
            alpha_front_walls: 0.2,
            distance_threshold: 2200,
            angle_threshold_deg: 32,
          },
        },
      },
    })

    await app.close()
  })

  it('POST /projects/:id/visibility/apply updates all entity types', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/visibility/apply`,
      headers: { 'x-tenant-id': tenantId },
      payload: {
        levels: [{ level_id: levelId, visible: false }],
        dimensions: [{ dimension_id: dimensionId, visible: false }],
        placements: [{ room_id: roomId, placement_id: 'pl-1', visible: false }],
        walls: [{ room_id: roomId, wall_id: 'wall-1', visible: false }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      updated: { levels: 1, dimensions: 1, placements: 1, walls: 1 },
    })

    expect(prismaMock.buildingLevel.update).toHaveBeenCalledWith({
      where: { id: levelId },
      data: { visible: false },
    })
    expect(prismaMock.dimension.update).toHaveBeenCalledWith({
      where: { id: dimensionId },
      data: { visible: false },
    })

    expect(prismaMock.room.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.room.update.mock.calls[0][0].data.placements[0]).toMatchObject({ id: 'pl-1', visible: false })
    expect(prismaMock.room.update.mock.calls[0][0].data.boundary.wall_segments[0]).toMatchObject({
      id: 'wall-1',
      visible: false,
      is_hidden: true,
    })

    await app.close()
  })

  it('POST /projects/:id/locks/apply writes lock state and lock_scope', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/locks/apply`,
      headers: { 'x-tenant-id': tenantId },
      payload: {
        levels: [{ level_id: levelId, locked: true }],
        dimensions: [{ dimension_id: dimensionId, locked: false }],
        placements: [{ room_id: roomId, placement_id: 'pl-1', locked: true, lock_scope: 'safe_edit' }],
        walls: [{ room_id: roomId, wall_id: 'wall-1', locked: false }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.buildingLevel.update).toHaveBeenCalledWith({
      where: { id: levelId },
      data: { locked: true, lock_scope: 'manual' },
    })
    expect(prismaMock.dimension.update).toHaveBeenCalledWith({
      where: { id: dimensionId },
      data: { locked: false, lock_scope: null },
    })

    expect(prismaMock.room.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.room.update.mock.calls[0][0].data.placements[0]).toMatchObject({
      id: 'pl-1',
      locked: true,
      lock_scope: 'safe_edit',
    })
    expect(prismaMock.room.update.mock.calls[0][0].data.boundary.wall_segments[0]).toMatchObject({
      id: 'wall-1',
      locked: false,
      lock_scope: null,
    })

    await app.close()
  })

  it('returns 403 when tenant header is missing', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/visibility/apply`,
      payload: {},
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('returns 404 when placement is not found in room', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/visibility/apply`,
      headers: { 'x-tenant-id': tenantId },
      payload: {
        placements: [{ room_id: roomId, placement_id: 'missing-placement', visible: true }],
      },
    })

    expect(response.statusCode).toBe(404)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
    await app.close()
  })

  it('returns 400 for empty auto-dollhouse patch payload', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/visibility/auto-dollhouse`,
      headers: { 'x-tenant-id': tenantId },
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.projectEnvironment.upsert).not.toHaveBeenCalled()
    await app.close()
  })
})
