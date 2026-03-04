import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectId = '11111111-1111-1111-1111-111111111111'
const alternativeId = '22222222-2222-2222-2222-222222222222'
const levelId = '33333333-3333-3333-3333-333333333333'
const sectionLineId = '44444444-4444-4444-4444-444444444444'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findUnique: vi.fn(),
    },
    alternative: {
      findUnique: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    buildingLevel: {
      findFirst: vi.fn(),
    },
    ifcImportJob: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

vi.mock('../services/ifcEngine.js', () => ({
  parseIfcRooms: vi.fn().mockResolvedValue([
    {
      name: 'Küche',
      wall_segments: [{ x0_mm: 0, y0_mm: 0, x1_mm: 5000, y1_mm: 0 }],
      ceiling_height_mm: 2600,
    },
  ]),
  buildIfcBuffer: vi.fn().mockResolvedValue(Buffer.from('ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n')),
}))

import { ifcInteropRoutes } from './ifcInterop.js'
import { buildIfcBuffer } from '../services/ifcEngine.js'

const IFC_HEADER = Buffer.from('ISO-10303-21;\nDATA;\nENDSEC;\n')

async function createApp() {
  const app = Fastify()
  await app.register(ifcInteropRoutes, { prefix: '/api/v1' })
  return app
}

describe('ifcInteropRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.project.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === projectId) {
        return { id: projectId, name: 'Projekt IFC' }
      }

      return null
    })

    prismaMock.alternative.findUnique.mockResolvedValue({
      id: alternativeId,
      area: {
        project: {
          id: projectId,
          name: 'Projekt IFC',
        },
      },
    })

    prismaMock.room.findMany.mockResolvedValue([
      {
        id: 'room-1',
        name: 'Küche',
        level_id: levelId,
        boundary: { wall_segments: [{ x0_mm: 0, y0_mm: 0, x1_mm: 4000, y1_mm: 0 }] },
        placements: [{ id: 'pl-1', width_mm: 600, depth_mm: 560, article_id: 'ART-1', offset_mm: 50 }],
        section_lines: [
          {
            id: sectionLineId,
            start: { x_mm: 500, y_mm: 200 },
            end: { x_mm: 3200, y_mm: 200 },
            label: 'S-A',
            level_scope: 'single_level',
            level_id: levelId,
          },
        ],
      },
    ])

    prismaMock.buildingLevel.findFirst.mockImplementation(async ({ where }: { where: { id: string; project_id: string } }) => {
      if (where.id === levelId && where.project_id === projectId) {
        return { id: levelId, name: 'EG' }
      }
      return null
    })
    prismaMock.room.create.mockResolvedValue({ id: 'created-room' })

    prismaMock.ifcImportJob.create.mockResolvedValue({ id: 'job-1' })
    prismaMock.ifcImportJob.update.mockResolvedValue({ id: 'job-1', status: 'done' })
    prismaMock.ifcImportJob.findMany.mockResolvedValue([
      { id: 'job-1', project_id: projectId, status: 'done', created_at: new Date().toISOString() },
    ])
  })

  it('imports IFC with valid STEP header', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/ifc`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: IFC_HEADER,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      job_id: 'job-1',
      rooms_created: expect.any(Number),
    })

    await app.close()
  })

  it('rejects empty IFC body', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/ifc`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.alloc(0),
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })

    await app.close()
  })

  it('rejects non-IFC signature', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/ifc`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from('NOT-AN-IFC-FILE'),
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })

    await app.close()
  })

  it('returns 404 when importing for unknown project', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/33333333-3333-3333-3333-333333333333/import/ifc',
      headers: { 'content-type': 'application/octet-stream' },
      payload: IFC_HEADER,
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('exports IFC for alternative with correct content type', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alternatives/${alternativeId}/export/ifc`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/x-step')

    await app.close()
  })

  it('exports non-empty IFC payload', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alternatives/${alternativeId}/export/ifc`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body.includes('ISO-10303')).toBe(true)

    await app.close()
  })

  it('exports IFC with scoped metadata passed to builder', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alternatives/${alternativeId}/export/ifc`,
      payload: {
        level_id: levelId,
        section_line_id: sectionLineId,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.room.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        project_id: projectId,
        level_id: levelId,
      }),
    }))
    expect(buildIfcBuffer).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        level_id: levelId,
        level_name: 'EG',
        section_line: expect.objectContaining({
          id: sectionLineId,
          label: 'S-A',
        }),
      }),
    }))

    await app.close()
  })

  it('rejects IFC export when level_id is outside project scope', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alternatives/${alternativeId}/export/ifc`,
      payload: {
        level_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })

    await app.close()
  })

  it('rejects IFC export when scoped section_line_id is unknown', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alternatives/${alternativeId}/export/ifc`,
      payload: {
        level_id: levelId,
        section_line_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'BAD_REQUEST' })

    await app.close()
  })

  it('returns 404 for unknown alternative on export', async () => {
    prismaMock.alternative.findUnique.mockResolvedValueOnce(null)
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alternatives/44444444-4444-4444-4444-444444444444/export/ifc',
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('lists IFC jobs for project', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/ifc-jobs`,
    })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json())).toBe(true)

    await app.close()
  })

  it('returns created IFC job in list after import flow', async () => {
    const app = await createApp()

    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/import/ifc`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: IFC_HEADER,
    })

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/ifc-jobs`,
    })

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json().length).toBeGreaterThanOrEqual(1)

    await app.close()
  })

  it('returns 404 for unknown project when listing jobs', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/55555555-5555-5555-5555-555555555555/ifc-jobs',
    })

    expect(response.statusCode).toBe(404)

    await app.close()
  })
})
