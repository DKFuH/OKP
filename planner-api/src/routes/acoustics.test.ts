import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectId = '11111111-1111-1111-1111-111111111111'
const gridId = '22222222-2222-2222-2222-222222222222'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findUnique: vi.fn(),
    },
    acousticGrid: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    acousticLayer: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { acousticsRoutes } from './acoustics.js'
import { parseCnivg, valueToColor } from '../services/cnivgParser.js'

const CNIVG_CONTENT = [
  'CNIVG_VERSION=2.0',
  'VARIABLE=SPL_DB',
  'RESOLUTION_MM=500',
  'ORIGIN_X=0.0',
  'ORIGIN_Y=0.0',
  'SLICE_HEIGHT=1.2',
  'COLS=3',
  'ROWS=2',
  'DATA_START',
  '42.1 45.6 48.3',
  '40.0 43.2 50.1',
  'DATA_END',
].join('\n')

const GRID_FIXTURE = {
  id: gridId,
  project_id: projectId,
  tenant_id: 'tenant-1',
  filename: 'acoustics.cnivg',
  variable: 'spl_db',
  resolution_mm: 500,
  origin_x_mm: 0,
  origin_y_mm: 0,
  slice_height_mm: 1200,
  grid_cols: 3,
  grid_rows: 2,
  values: [
    [42.1, 45.6, 48.3],
    [40.0, 43.2, 50.1],
  ],
  min_value: 40,
  max_value: 50.1,
  created_at: new Date('2026-03-02T10:00:00.000Z'),
}

async function createApp() {
  const app = Fastify()
  await app.register(acousticsRoutes, { prefix: '/api/v1' })
  return app
}

describe('acoustics parser utilities', () => {
  it('parseCnivg parses COLS/ROWS and computes min/max', () => {
    const parsed = parseCnivg(CNIVG_CONTENT)

    expect(parsed.header.cols).toBe(3)
    expect(parsed.header.rows).toBe(2)
    expect(parsed.min).toBe(40)
    expect(parsed.max).toBe(50.1)
  })

  it('valueToColor maps min to blue-ish and max to red-ish', () => {
    const [minRed, minGreen, minBlue] = valueToColor(0, 0, 100)
    const [maxRed, maxGreen, maxBlue] = valueToColor(100, 0, 100)

    expect(minBlue).toBeGreaterThan(minRed)
    expect(maxRed).toBeGreaterThan(maxBlue)
    expect(minGreen).toBeLessThanOrEqual(255)
    expect(maxGreen).toBeLessThanOrEqual(255)
  })
})

describe('acousticsRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.project.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === projectId) {
        return { id: projectId, tenant_id: 'tenant-1' }
      }

      return null
    })

    prismaMock.acousticGrid.create.mockResolvedValue({
      ...GRID_FIXTURE,
      id: gridId,
    })

    prismaMock.acousticGrid.findMany.mockResolvedValue([
      {
        id: gridId,
        filename: 'acoustics.cnivg',
        variable: 'spl_db',
        resolution_mm: 500,
        grid_cols: 3,
        grid_rows: 2,
        min_value: 40,
        max_value: 50.1,
        created_at: new Date('2026-03-02T10:00:00.000Z'),
      },
    ])

    prismaMock.acousticGrid.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === gridId) {
        return GRID_FIXTURE
      }

      return null
    })

    prismaMock.acousticGrid.delete.mockResolvedValue({ id: gridId })

    prismaMock.acousticLayer.create.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      project_id: projectId,
      layer_type: 'source',
      label: 'Quelle A',
      object_refs: [{ room_id: 'room-1', x_mm: 1200, y_mm: 300 }],
      created_at: new Date('2026-03-02T10:00:00.000Z'),
    })
    prismaMock.acousticLayer.findMany.mockResolvedValue([])
  })

  it('POST /projects/:id/import/acoustics returns 201 for valid CNIVG', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/acoustics`,
      headers: {
        'content-type': 'text/plain',
        'x-filename': 'acoustics.cnivg',
      },
      payload: CNIVG_CONTENT,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ grid_id: gridId, cols: 3, rows: 2 })

    await app.close()
  })

  it('POST /projects/:id/import/acoustics computes min/max correctly', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/acoustics`,
      headers: {
        'content-type': 'text/plain',
      },
      payload: CNIVG_CONTENT,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ min: 40, max: 50.1 })

    await app.close()
  })

  it('POST /projects/:id/import/acoustics returns 400 when COLS missing', async () => {
    const app = await createApp()

    const broken = CNIVG_CONTENT.replace('COLS=3\n', '')

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/acoustics`,
      headers: {
        'content-type': 'text/plain',
      },
      payload: broken,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })

    await app.close()
  })

  it('POST /projects/:id/import/acoustics returns 400 for empty body', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/acoustics`,
      headers: {
        'content-type': 'text/plain',
      },
      payload: '',
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })

  it('POST /projects/:id/import/acoustics returns 404 for unknown project', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/44444444-4444-4444-4444-444444444444/import/acoustics',
      headers: {
        'content-type': 'text/plain',
      },
      payload: CNIVG_CONTENT,
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('GET /projects/:id/acoustic-grids returns array', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/acoustic-grids`,
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)

    await app.close()
  })

  it('GET /projects/:id/acoustic-grids returns 404 for unknown project', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/44444444-4444-4444-4444-444444444444/acoustic-grids',
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('GET /acoustic-grids/:id/tiles returns FeatureCollection', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/acoustic-grids/${gridId}/tiles`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ type: 'FeatureCollection', variable: 'spl_db' })

    await app.close()
  })

  it('GET /acoustic-grids/:id/tiles returns cols*rows features for complete grid', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/acoustic-grids/${gridId}/tiles`,
    })

    expect(response.statusCode).toBe(200)
    const payload = response.json() as { features: unknown[] }
    expect(payload.features.length).toBe(3 * 2)

    await app.close()
  })

  it('GET /acoustic-grids/:id/tiles returns 404 for unknown grid', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/acoustic-grids/55555555-5555-5555-5555-555555555555/tiles',
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('DELETE /acoustic-grids/:id returns 204', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/acoustic-grids/${gridId}`,
    })

    expect(response.statusCode).toBe(204)

    await app.close()
  })

  it('POST /projects/:id/acoustic-layers returns 201 for source layer', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/acoustic-layers`,
      payload: {
        layer_type: 'source',
        label: 'Quelle A',
        object_refs: [{ room_id: 'room-1', x_mm: 1200, y_mm: 300 }],
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ layer_type: 'source' })

    await app.close()
  })
})