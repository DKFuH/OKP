import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectId = '11111111-1111-1111-1111-111111111111'
const analysisId = '22222222-2222-2222-2222-222222222222'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findUnique: vi.fn(),
    },
    fengShuiAnalysis: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { fengshuiRoutes } from './fengshui.js'

const BOUNDS = { x_min: 0, y_min: 0, x_max: 6000, y_max: 4000 }

const ANALYSIS_FIXTURE = {
  id: analysisId,
  project_id: projectId,
  tenant_id: 'tenant-1',
  mode: 'both' as const,
  entry_refs: null,
  compass_deg: 0,
  bounds_mm: BOUNDS,
  zones_geojson: {
    type: 'FeatureCollection',
    features: Array.from({ length: 9 }, (_, i) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { zone_type: 'bagua', label: `Zone ${i}`, row: Math.floor(i / 3), col: i % 3, compass_deg: 0 },
    })),
  },
  findings: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      system: 'east',
      severity: 'info',
      title: 'Eingang nicht gesetzt',
      reason: 'reason',
      recommendation: 'rec',
      tags: ['entry', 'setup'],
    },
  ],
  score_total: 97,
  score_west: 98,
  score_east: 95,
  created_at: new Date('2026-03-02T10:00:00.000Z'),
  updated_at: new Date('2026-03-02T10:00:00.000Z'),
}

async function createApp() {
  const app = Fastify()
  await app.register(fengshuiRoutes, { prefix: '/api/v1' })
  return app
}

describe('fengshuiRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.project.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === projectId) {
        return { id: projectId, tenant_id: 'tenant-1' }
      }
      return null
    })

    prismaMock.fengShuiAnalysis.create.mockResolvedValue({
      id: analysisId,
      mode: 'both',
      score_total: 97,
      score_west: 98,
      score_east: 95,
      created_at: new Date('2026-03-02T10:00:00.000Z'),
    })

    prismaMock.fengShuiAnalysis.findMany.mockResolvedValue([
      {
        id: analysisId,
        mode: 'both',
        score_total: 97,
        score_west: 98,
        score_east: 95,
        compass_deg: 0,
        created_at: new Date('2026-03-02T10:00:00.000Z'),
      },
    ])

    prismaMock.fengShuiAnalysis.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === analysisId) {
        return ANALYSIS_FIXTURE
      }
      return null
    })

    prismaMock.fengShuiAnalysis.delete.mockResolvedValue({ id: analysisId })
  })

  // Test 1: POST valid → 201 + id
  it('POST /projects/:id/analyze/fengshui valid → 201 + id', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/analyze/fengshui`,
      payload: { mode: 'both', compass_deg: 0, bounds_mm: BOUNDS },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ id: analysisId })

    await app.close()
  })

  // Test 2: POST mode=both → score_total gesetzt
  it('POST mode=both → score_total gesetzt', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/analyze/fengshui`,
      payload: { mode: 'both', compass_deg: 0, bounds_mm: BOUNDS },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ score_total: 97 })

    await app.close()
  })

  // Test 3: POST mode=east ohne entry → findings enthält "Eingang nicht gesetzt"
  it('POST mode=east ohne entry → findings enthält "Eingang nicht gesetzt"', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/analyze/fengshui`,
      payload: { mode: 'east', compass_deg: 0, bounds_mm: BOUNDS },
    })

    expect(response.statusCode).toBe(201)
    // Verify engine was called correctly by checking create was called with findings containing the entry message
    const createCall = prismaMock.fengShuiAnalysis.create.mock.calls[0][0]
    const findings = createCall.data.findings as Array<{ title: string }>
    expect(findings.some(f => f.title === 'Eingang nicht gesetzt')).toBe(true)

    await app.close()
  })

  // Test 4: POST mode=west ohne kitchen → findings enthält "Daten fehlen"
  it('POST mode=west ohne kitchen → findings enthält "Daten fehlen"', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/analyze/fengshui`,
      payload: { mode: 'west', compass_deg: 0, bounds_mm: BOUNDS },
    })

    expect(response.statusCode).toBe(201)
    const createCall = prismaMock.fengShuiAnalysis.create.mock.calls[0][0]
    const findings = createCall.data.findings as Array<{ title: string }>
    expect(findings.some(f => f.title.includes('Daten fehlen'))).toBe(true)

    await app.close()
  })

  // Test 5: POST compass_deg out of range → 400
  it('POST compass_deg out of range → 400', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/analyze/fengshui`,
      payload: { mode: 'both', compass_deg: 999, bounds_mm: BOUNDS },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })

  // Test 6: POST unknown project_id → 404
  it('POST unknown project_id → 404', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/44444444-4444-4444-4444-444444444444/analyze/fengshui',
      payload: { mode: 'both', compass_deg: 0, bounds_mm: BOUNDS },
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  // Test 7: GET /projects/:id/fengshui-analyses → 200 Array
  it('GET /projects/:id/fengshui-analyses → 200 Array', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/fengshui-analyses`,
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)

    await app.close()
  })

  // Test 8: GET /fengshui-analyses/:id → 200 meta
  it('GET /fengshui-analyses/:id → 200 meta', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/fengshui-analyses/${analysisId}`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ id: analysisId, mode: 'both' })

    await app.close()
  })

  // Test 9: GET /fengshui-analyses/:id/zones → FeatureCollection mit 9 Bagua-Features
  it('GET /fengshui-analyses/:id/zones → FeatureCollection mit 9 Bagua-Features', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/fengshui-analyses/${analysisId}/zones`,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json() as { type: string; features: unknown[] }
    expect(body.type).toBe('FeatureCollection')
    expect(body.features.length).toBe(9)

    await app.close()
  })

  // Test 10: GET /fengshui-analyses/:id/findings → Array
  it('GET /fengshui-analyses/:id/findings → Array', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/fengshui-analyses/${analysisId}/findings`,
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)

    await app.close()
  })

  // Test 11: DELETE /fengshui-analyses/:id → 204
  it('DELETE /fengshui-analyses/:id → 204', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/fengshui-analyses/${analysisId}`,
    })

    expect(response.statusCode).toBe(204)

    await app.close()
  })

  // Test 12: GET /fengshui-analyses/unknown/zones → 404
  it('GET /fengshui-analyses/unknown/zones → 404', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/fengshui-analyses/55555555-5555-5555-5555-555555555555/zones',
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })
})
