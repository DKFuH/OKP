import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tenantId = '00000000-0000-0000-0000-000000000001'
const projectId = '11111111-1111-1111-1111-111111111111'
const otherProjectId = '99999999-9999-9999-9999-999999999999'
const sheetId = '22222222-2222-2222-2222-222222222222'
const levelId = '33333333-3333-3333-3333-333333333333'
const sectionLineId = '44444444-4444-4444-4444-444444444444'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
    },
    layoutSheet: {
      findUnique: vi.fn(),
    },
    buildingLevel: {
      findFirst: vi.fn(),
    },
    projectEnvironment: {
      findUnique: vi.fn(),
    },
    tenantSetting: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

import { viewerExportsRoutes } from './viewerExports.js'
import { tenantMiddleware } from '../tenantMiddleware.js'

function createRoom(boundary: unknown, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Kitchen',
    boundary,
    ...overrides,
  }
}

function validBoundary() {
  return {
    vertices: [
      { x_mm: 0, y_mm: 0 },
      { x_mm: 4000, y_mm: 0 },
      { x_mm: 4000, y_mm: 3000 },
      { x_mm: 0, y_mm: 3000 },
    ],
  }
}

async function createApp() {
  const app = Fastify()
  await app.register(tenantMiddleware)
  await app.register(viewerExportsRoutes, { prefix: '/api/v1' })
  return app
}

describe('viewerExportsRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      tenant_id: tenantId,
      name: 'Project Alpha',
    })
    prismaMock.project.findFirst.mockResolvedValue({ id: projectId })
    prismaMock.room.findMany.mockResolvedValue([
      createRoom(validBoundary(), {
        level_id: levelId,
        level: { id: levelId, name: 'EG' },
        section_lines: [
          {
            id: sectionLineId,
            start: { x_mm: 400, y_mm: 200 },
            end: { x_mm: 3200, y_mm: 200 },
            label: 'S-A',
            level_scope: 'single_level',
            level_id: levelId,
          },
        ],
      }),
    ])
    prismaMock.layoutSheet.findUnique.mockResolvedValue({
      id: sheetId,
      project_id: projectId,
      name: 'Layout Sheet A',
      config: {},
    })
    prismaMock.buildingLevel.findFirst.mockResolvedValue({ id: levelId, name: 'EG' })
    prismaMock.projectEnvironment.findUnique.mockResolvedValue({ north_angle_deg: 0 })
    prismaMock.tenantSetting.findUnique.mockResolvedValue({ preferred_locale: 'de' })
  })

  it('html-viewer forbidden without tenant', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/html-viewer`,
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'FORBIDDEN' })
    await app.close()
  })

  it('html-viewer 404 when project not in tenant', async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce({
      id: projectId,
      tenant_id: otherProjectId,
      name: 'Project Outside Scope',
    })

    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/html-viewer`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Project not found in tenant scope',
    })
    await app.close()
  })

  it('html-viewer success returns attachment + html', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/html-viewer`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('.html')
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toContain('<html')
    expect(response.body).toContain('viewer-data')
    expect(response.body).toContain('lang="de"')
    await app.close()
  })

  it('html-viewer accepts locale_code=en and renders english copy', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/html-viewer`,
      headers: { 'x-tenant-id': tenantId },
      payload: { locale_code: 'en' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('lang="en"')
    expect(response.body).toContain('Read-only viewer export.')
    await app.close()
  })

  it('plan-svg success returns svg', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/plan-svg`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('.svg')
    expect(response.headers['content-type']).toContain('image/svg+xml')
    expect(response.body).toContain('<svg')
    expect(response.body).toContain('<polygon')
    await app.close()
  })

  it('plan-svg includes metadata and section overlay when scoped by level and section id', async () => {
    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/plan-svg`,
      headers: { 'x-tenant-id': tenantId },
      payload: {
        level_id: levelId,
        section_line_id: sectionLineId,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('okp-metadata')
    expect(response.body).toContain(sectionLineId)
    expect(response.body).toContain('Schnitt: S-A')
    await app.close()
  })

  it('plan-svg returns fallback svg when no valid room vertices', async () => {
    prismaMock.room.findMany.mockResolvedValueOnce([createRoom({ vertices: [{ x_mm: 1000 }] })])

    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export/plan-svg`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Keine gueltige Raumgeometrie vorhanden')
    await app.close()
  })

  it('layout-sheet 404 when sheet missing', async () => {
    prismaMock.layoutSheet.findUnique.mockResolvedValueOnce(null)

    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/layout-sheets/${sheetId}/export/svg`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Layout sheet not found',
    })
    await app.close()
  })

  it('layout-sheet 404 when sheet project out of tenant', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(null)

    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/layout-sheets/${sheetId}/export/svg`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Layout sheet not found in tenant scope',
    })
    await app.close()
  })

  it('layout-sheet success includes north arrow when config show_north_arrow true', async () => {
    prismaMock.layoutSheet.findUnique.mockResolvedValueOnce({
      id: sheetId,
      project_id: projectId,
      name: 'Layout Sheet North',
      config: {
        show_north_arrow: true,
      },
    })
    prismaMock.projectEnvironment.findUnique.mockResolvedValueOnce({ north_angle_deg: 35 })

    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/layout-sheets/${sheetId}/export/svg`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('image/svg+xml')
    expect(response.body).toContain('>N<')
    expect(response.body).toContain('rotate(35)')
    await app.close()
  })

  it('layout-sheet export includes level and section metadata in svg', async () => {
    prismaMock.layoutSheet.findUnique.mockResolvedValueOnce({
      id: sheetId,
      project_id: projectId,
      name: 'Layout Scope Test',
      config: {
        level_id: levelId,
        section_line_id: sectionLineId,
      },
    })

    const app = await createApp()

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/layout-sheets/${sheetId}/export/svg`,
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('okp-metadata')
    expect(response.body).toContain(sectionLineId)
    expect(response.body).toContain('Ebene: EG')
    expect(response.body).toContain('Schnitt: S-A')
    await app.close()
  })
})
