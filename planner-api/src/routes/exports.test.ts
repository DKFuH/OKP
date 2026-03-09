import Fastify from 'fastify'
import AdmZip from 'adm-zip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tenantId = '00000000-0000-0000-0000-000000000001'
const projectId = '11111111-1111-1111-1111-111111111111'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findFirst: vi.fn(),
    },
    alternative: {
      findFirst: vi.fn(),
    },
  },
}))

const { registerProjectDocumentMock } = vi.hoisted(() => ({
  registerProjectDocumentMock: vi.fn(),
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}))

vi.mock('../services/documentRegistry.js', () => ({
  registerProjectDocument: registerProjectDocumentMock,
}))

import { exportRoutes } from './exports.js'
import { tenantMiddleware } from '../tenantMiddleware.js'

function createPayload() {
  return {
    project_id: projectId,
    filename: 'kitchen-plan',
    payload: {
      room: {
        boundary: [
          { id: 'v1', x_mm: 0, y_mm: 0, index: 0 },
          { id: 'v2', x_mm: 4000, y_mm: 0, index: 1 },
          { id: 'v3', x_mm: 4000, y_mm: 3000, index: 2 },
          { id: 'v4', x_mm: 0, y_mm: 3000, index: 3 },
        ],
      },
      wallSegments: [
        {
          id: 'wall-1',
          start: { x_mm: 0, y_mm: 0 },
          end: { x_mm: 4000, y_mm: 0 },
          length_mm: 4000,
        },
      ],
      openings: [
        {
          id: 'opening-1',
          wall_id: 'wall-1',
          offset_mm: 800,
          width_mm: 900,
          source: 'manual',
        },
      ],
      furniture: [
        {
          id: 'furniture-1',
          footprintRect: {
            min: { x_mm: 500, y_mm: 500 },
            max: { x_mm: 1100, y_mm: 1100 },
          },
        },
      ],
      includeFurniture: true,
    },
  }
}

describe('exportRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.project.findFirst.mockResolvedValue({ id: projectId, rooms: [] })
    prismaMock.alternative.findFirst.mockResolvedValue({
      area: {
        project_id: projectId,
      },
    })
    registerProjectDocumentMock.mockResolvedValue({ id: 'doc-export-1' })
  })

  it('returns a DXF document as attachment', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dxf',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.dxf')
    expect(response.headers['content-type']).toContain('application/dxf')
    expect(response.headers['x-okp-provider-id']).toBe('core.dxf')
    expect(response.headers['x-okp-document-id']).toBe('doc-export-1')
    expect(response.headers['x-okp-download-url']).toBe(`/api/v1/projects/${projectId}/documents/doc-export-1/download`)
    expect(response.headers['x-okp-artifact-kind']).toBe('cad')
    expect(response.headers['x-okp-delivery-mode']).toBe('native')
    expect(response.body).toContain('OKP_ROOM')
    expect(response.body).toContain('OKP_OPENINGS')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      tenantId,
      type: 'other',
      sourceId: `interop-export:dxf:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', 'dxf', 'cad']),
    }))

    await app.close()
  })

  it('rejects malformed export payloads', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dxf',
      headers: { 'x-tenant-id': tenantId },
      payload: {
        project_id: projectId,
        payload: {
          room: { boundary: [] },
          wallSegments: [],
          openings: [],
          furniture: [],
          includeFurniture: true,
        },
      },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })

  it('returns a DWG download request as DXF-compatible CAD attachment', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dwg',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-okp-export-fallback']).toBe('dwg->dxf')
    expect(response.headers['x-okp-provider-id']).toBe('core.dwg')
    expect(response.headers['x-okp-delivery-mode']).toBe('fallback')
    expect(response.headers['content-disposition']).toContain('kitchen-plan.dxf')
    expect(response.headers['content-type']).toContain('application/dxf')
    expect(response.body).toContain('ENTITIES')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: `interop-export:dwg:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', 'dwg']),
    }))

    await app.close()
  })

  it('returns DXF-compatible CAD attachment for project-scoped DWG exports', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/11111111-1111-1111-1111-111111111111/export-dwg',
      headers: { 'x-tenant-id': tenantId },
      payload: {
        ...createPayload(),
        filename: 'kitchen-plan.dwg',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['x-okp-export-fallback']).toBe('dwg->dxf')
    expect(response.headers['content-disposition']).toContain('kitchen-plan.dxf')
    expect(response.headers['content-type']).toContain('application/dxf')
    expect(response.body).toContain('ENTITIES')
    expect(response.body).toContain('\nLINE\n')

    await app.close()
  })

  it('returns a SketchUp Ruby import script for SKP exports', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/skp',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.skp.rb')
    expect(response.headers['content-type']).toContain('application/ruby')
    expect(response.headers['x-okp-provider-id']).toBe('core.skp')
    expect(response.headers['x-okp-artifact-kind']).toBe('script')
    expect(response.headers['x-okp-delivery-mode']).toBe('script')
    expect(response.body).toContain('Sketchup.active_model')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: `interop-export:skp:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', 'skp', 'script']),
    }))

    await app.close()
  })

  it('returns an STL mesh export', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/stl',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.stl')
    expect(response.headers['content-type']).toContain('model/stl')
    expect(response.headers['x-okp-provider-id']).toBe('core.stl')
    expect(response.headers['x-okp-artifact-kind']).toBe('mesh')
    expect(response.headers['x-okp-delivery-mode']).toBe('native')
    expect(response.body).toContain('solid kitchen-plan')
    expect(response.body).toContain('facet normal')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: `interop-export:stl:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', 'stl', 'mesh']),
    }))

    await app.close()
  })

  it('returns a STEP wireframe export', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/step',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.step')
    expect(response.headers['content-type']).toContain('application/step')
    expect(response.headers['x-okp-provider-id']).toBe('core.step')
    expect(response.headers['x-okp-artifact-kind']).toBe('cad')
    expect(response.headers['x-okp-delivery-mode']).toBe('native')
    expect(response.body).toContain('ISO-10303-21')
    expect(response.body).toContain('GEOMETRIC_CURVE_SET')
    expect(response.body).toContain('POLYLINE')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: `interop-export:step:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', 'step', 'cad']),
    }))

    await app.close()
  })

  it('returns an OBJ mesh export', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/obj',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.obj')
    expect(response.headers['content-type']).toContain('model/obj')
    expect(response.headers['x-okp-provider-id']).toBe('core.obj')
    expect(response.headers['x-okp-artifact-kind']).toBe('mesh')
    expect(response.headers['x-okp-delivery-mode']).toBe('native')
    expect(response.body).toContain('# OKP OBJ export')
    expect(response.body).toContain('\nv ')
    expect(response.body).toContain('\nf ')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: `interop-export:obj:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', 'obj', 'mesh']),
    }))

    await app.close()
  })

  it('returns a 3MF mesh export', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/3mf',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('kitchen-plan.3mf')
    expect(response.headers['content-type']).toContain('model/3mf')
    expect(response.headers['x-okp-provider-id']).toBe('core.3mf')
    expect(response.headers['x-okp-artifact-kind']).toBe('mesh')
    expect(response.headers['x-okp-delivery-mode']).toBe('native')

    const archive = new AdmZip(Buffer.from(response.rawPayload))
    const modelEntry = archive.getEntry('3D/3dmodel.model')
    expect(modelEntry).toBeTruthy()
    expect(archive.getEntry('[Content_Types].xml')).toBeTruthy()
    expect(archive.getEntry('_rels/.rels')).toBeTruthy()
    expect(modelEntry?.getData().toString('utf8')).toContain('<model unit="millimeter"')
    expect(modelEntry?.getData().toString('utf8')).toContain('<triangle ')
    expect(registerProjectDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: `interop-export:3mf:${projectId}`,
      tags: expect.arrayContaining(['interop', 'export', '3mf', 'mesh']),
    }))

    await app.close()
  })

  it('returns 403 without tenant header', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dxf',
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'FORBIDDEN' })

    await app.close()
  })

  it('returns a JSON export descriptor for project-scoped DWG artifacts', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export-descriptor/dwg`,
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider_id: 'core.dwg',
      format: 'dwg',
      artifact_kind: 'cad',
      delivery_mode: 'fallback',
      filename: 'kitchen-plan.dxf',
      content_type: 'application/dxf; charset=utf-8',
      native: false,
      review_required: false,
      fallback_of: 'dwg',
    })

    await app.close()
  })

  it('returns a JSON export descriptor for project-scoped STL artifacts', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export-descriptor/stl`,
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider_id: 'core.stl',
      format: 'stl',
      artifact_kind: 'mesh',
      delivery_mode: 'native',
      filename: 'kitchen-plan.stl',
      content_type: 'model/stl; charset=utf-8',
      native: true,
      review_required: false,
      fallback_of: null,
    })

    await app.close()
  })

  it('returns a JSON export descriptor for project-scoped STEP artifacts', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export-descriptor/step`,
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider_id: 'core.step',
      format: 'step',
      artifact_kind: 'cad',
      delivery_mode: 'native',
      filename: 'kitchen-plan.step',
      content_type: 'application/step; charset=utf-8',
      native: true,
      review_required: false,
      fallback_of: null,
      note: 'step endpoint currently returns a wireframe STEP exchange model',
    })

    await app.close()
  })

  it('returns a JSON export descriptor for project-scoped OBJ artifacts', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export-descriptor/obj`,
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider_id: 'core.obj',
      format: 'obj',
      artifact_kind: 'mesh',
      delivery_mode: 'native',
      filename: 'kitchen-plan.obj',
      content_type: 'model/obj; charset=utf-8',
      native: true,
      review_required: false,
      fallback_of: null,
    })

    await app.close()
  })

  it('returns a JSON export descriptor for project-scoped 3MF artifacts', async () => {
    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/export-descriptor/3mf`,
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      provider_id: 'core.3mf',
      format: '3mf',
      artifact_kind: 'mesh',
      delivery_mode: 'native',
      filename: 'kitchen-plan.3mf',
      content_type: 'model/3mf',
      native: true,
      review_required: false,
      fallback_of: null,
    })

    await app.close()
  })

  it('returns 404 when project is outside tenant scope', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce(null)

    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/exports/dxf',
      headers: { 'x-tenant-id': tenantId },
      payload: createPayload(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Project not found in tenant scope',
    })

    await app.close()
  })

  it('exports GLB for an alternative', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: projectId,
      rooms: [
        {
          ceiling_height_mm: 2500,
          boundary: {
            wall_segments: [
              { id: 'w1', x0_mm: 0, y0_mm: 0, x1_mm: 4000, y1_mm: 0 },
            ],
          },
          placements: [
            { id: 'p1', wall_id: 'w1', offset_mm: 0, width_mm: 600, depth_mm: 600, height_mm: 720 },
          ],
        },
      ],
    })

    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alternatives/alt-1/export/gltf',
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('model/gltf-binary')
    expect(response.headers['content-disposition']).toContain('alternative-alt-1.glb')
    expect(response.rawPayload.readUInt32LE(0)).toBe(0x46546c67)

    await app.close()
  })

  it('exports GLB when room contains arc wall segment', async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: projectId,
      rooms: [
        {
          ceiling_height_mm: 2500,
          boundary: {
            wall_segments: [
              {
                id: 'arc-1',
                kind: 'arc',
                start: { x_mm: 1000, y_mm: 0 },
                end: { x_mm: 0, y_mm: 1000 },
                center: { x_mm: 0, y_mm: 0 },
                radius_mm: 1000,
                clockwise: false,
                thickness_mm: 100,
              },
            ],
          },
          placements: [],
        },
      ],
    })

    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alternatives/alt-1/export/gltf',
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.rawPayload.readUInt32LE(0)).toBe(0x46546c67)

    await app.close()
  })

  it('returns 404 when alternative does not exist for tenant scope', async () => {
    prismaMock.alternative.findFirst.mockResolvedValueOnce(null)

    const app = Fastify()
    await app.register(tenantMiddleware)
    await app.register(exportRoutes, { prefix: '/api/v1' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alternatives/missing-alt/export/gltf',
      headers: { 'x-tenant-id': tenantId },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Alternative not found',
    })

    await app.close()
  })
})
