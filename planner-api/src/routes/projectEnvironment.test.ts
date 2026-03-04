import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findUnique: vi.fn() },
    projectEnvironment: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { projectEnvironmentRoutes } from './projectEnvironment.js'

describe('projectEnvironmentRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function appWithTenant(tenantId = 'tenant-a') {
    const app = Fastify()
    app.addHook('preHandler', async (request) => {
      request.tenantId = tenantId
    })
    return app
  }

  it('returns forbidden without tenant scope', async () => {
    const app = Fastify()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment',
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('returns default environment when no row exists', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: 'tenant-a' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue(null)

    const app = appWithTenant()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(
      expect.objectContaining({
        project_id: 'project-a',
        tenant_id: 'tenant-a',
        north_angle_deg: 0,
        daylight_enabled: true,
      }),
    )

    await app.close()
  })

  it('returns existing environment when available', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: 'tenant-a' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({
      id: 'env-a',
      tenant_id: 'tenant-a',
      project_id: 'project-a',
      north_angle_deg: 24,
      latitude: 52.52,
      longitude: 13.405,
      timezone: 'Europe/Berlin',
      default_datetime: null,
      daylight_enabled: true,
      config_json: { source: 'test' },
    })

    const app = appWithTenant()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().id).toBe('env-a')
    expect(response.json().north_angle_deg).toBe(24)

    await app.close()
  })

  it('upserts environment and merges config_json', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: 'tenant-a' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({
      id: 'env-a',
      project_id: 'project-a',
      config_json: { existing: true },
    })
    prismaMock.projectEnvironment.upsert.mockResolvedValue({
      id: 'env-a',
      tenant_id: 'tenant-a',
      project_id: 'project-a',
      north_angle_deg: 35,
      latitude: 48.137,
      longitude: 11.576,
      timezone: 'Europe/Berlin',
      default_datetime: null,
      daylight_enabled: true,
      config_json: { existing: true, panel: 'compact' },
    })

    const app = appWithTenant()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment',
      payload: {
        north_angle_deg: 35,
        latitude: 48.137,
        longitude: 11.576,
        timezone: 'Europe/Berlin',
        config_json: { panel: 'compact' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.projectEnvironment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          config_json: { existing: true, panel: 'compact' },
        }),
      }),
    )

    await app.close()
  })

  it('returns sun preview from explicit payload values', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: 'tenant-a' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue(null)

    const app = appWithTenant()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment/sun-preview',
      payload: {
        datetime: '2026-06-21T10:00:00.000Z',
        latitude: 48.137,
        longitude: 11.576,
        north_angle_deg: 18,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(
      expect.objectContaining({
        latitude: 48.137,
        longitude: 11.576,
        north_angle_deg: 18,
      }),
    )
    expect(typeof response.json().azimuth_deg).toBe('number')
    expect(typeof response.json().elevation_deg).toBe('number')

    await app.close()
  })

  it('uses stored environment values for sun preview fallback', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: 'tenant-a' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({
      id: 'env-a',
      tenant_id: 'tenant-a',
      project_id: 'project-a',
      north_angle_deg: 45,
      latitude: 52.52,
      longitude: 13.405,
      timezone: 'Europe/Berlin',
      default_datetime: new Date('2026-08-15T09:00:00.000Z'),
      daylight_enabled: true,
      config_json: {},
    })

    const app = appWithTenant()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment/sun-preview',
      payload: {},
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().latitude).toBe(52.52)
    expect(response.json().north_angle_deg).toBe(45)

    await app.close()
  })

  it('returns bad request when sun preview has no location context', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-a', tenant_id: 'tenant-a' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({
      id: 'env-a',
      tenant_id: 'tenant-a',
      project_id: 'project-a',
      north_angle_deg: 0,
      latitude: null,
      longitude: null,
      timezone: null,
      default_datetime: null,
      daylight_enabled: true,
      config_json: {},
    })

    const app = appWithTenant()
    await app.register(projectEnvironmentRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/environment/sun-preview',
      payload: {},
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })
})
