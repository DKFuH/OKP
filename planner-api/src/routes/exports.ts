import { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'
import { registerProjectDocument } from '../services/documentRegistry.js'
import { getInteropProvider } from '../services/interop/providers/registry.js'
import type { InteropExportArtifact, InteropFormat } from '../services/interop/providers/types.js'

type GltfBoundary = {
  wall_segments?: Array<{
    id: string
    kind?: 'line' | 'arc'
    x0_mm?: number
    y0_mm?: number
    x1_mm?: number
    y1_mm?: number
    start?: { x_mm: number; y_mm: number }
    end?: { x_mm: number; y_mm: number }
    center?: { x_mm: number; y_mm: number }
    radius_mm?: number
    clockwise?: boolean
    thickness_mm?: number
  }>
}

type GltfPlacement = {
  id: string
  wall_id: string
  offset_mm: number
  width_mm: number
  depth_mm: number
  height_mm?: number
  label?: string
}

const PointSchema = z.object({
  x_mm: z.number(),
  y_mm: z.number(),
})

const ExportRequestSchema = z.object({
  project_id: z.string().uuid().optional(),
  filename: z.string().min(1).max(255).optional(),
  allow_dxf_fallback: z.boolean().optional(),
  payload: z.object({
    room: z.object({
      boundary: z.array(
        z.object({
          id: z.string().min(1),
          x_mm: z.number(),
          y_mm: z.number(),
          index: z.number().int().nonnegative(),
        }),
      ).min(3),
    }),
    wallSegments: z.array(
      z.object({
        id: z.string().min(1),
        start: PointSchema,
        end: PointSchema,
        length_mm: z.number().positive(),
      }),
    ),
    openings: z.array(
      z.object({
        id: z.string().min(1),
        wall_id: z.string().min(1),
        offset_mm: z.number().min(0),
        width_mm: z.number().positive(),
        height_mm: z.number().positive().optional(),
        sill_height_mm: z.number().min(0).optional(),
        type: z.enum(['door', 'window', 'pass-through']).optional(),
        source: z.enum(['manual', 'cad_import']).optional(),
      }),
    ).default([]),
    furniture: z.array(
      z.object({
        id: z.string().min(1),
        footprintRect: z.object({
          min: PointSchema,
          max: PointSchema,
        }),
      }),
    ).default([]),
    includeFurniture: z.boolean().default(true),
  }),
})

const ExportProjectParamsSchema = z.object({
  projectId: z.string().uuid(),
})

const ExportFormatParamsSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(['dxf', 'dwg', 'skp', 'stl', 'step', 'obj', '3mf']),
})

function getTenantId(request: unknown): string | null {
  const scopedTenantId = (request as { tenantId?: string | null }).tenantId
  if (scopedTenantId) {
    return scopedTenantId
  }

  const header = (request as { headers?: Record<string, string | string[] | undefined> }).headers?.['x-tenant-id']
  if (!header) {
    return null
  }

  return Array.isArray(header) ? (header[0] ?? null) : header
}

async function assertProjectInTenantScope(reply: FastifyReply, tenantId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    select: { id: true },
  })

  if (!project) {
    sendNotFound(reply, 'Project not found in tenant scope')
    return null
  }

  return project
}

function mapWallSegmentsForCad(payload: z.infer<typeof ExportRequestSchema>['payload']) {
  return payload.wallSegments.map((segment) => ({
    id: segment.id,
    x0_mm: segment.start.x_mm,
    y0_mm: segment.start.y_mm,
    x1_mm: segment.end.x_mm,
    y1_mm: segment.end.y_mm,
  }))
}

function toArtifactDescriptor(artifact: InteropExportArtifact) {
  return {
    provider_id: artifact.provider_id,
    format: artifact.format,
    artifact_kind: artifact.artifact_kind,
    delivery_mode: artifact.delivery_mode,
    filename: artifact.filename,
    content_type: artifact.content_type,
    native: artifact.native,
    review_required: artifact.review_required,
    fallback_of: artifact.fallback_of ?? null,
    note: artifact.note ?? null,
  }
}

function applyArtifactHeaders(reply: FastifyReply, artifact: InteropExportArtifact): void {
  reply.header('x-okp-provider-id', artifact.provider_id)
  reply.header('x-okp-artifact-format', artifact.format)
  reply.header('x-okp-artifact-kind', artifact.artifact_kind)
  reply.header('x-okp-delivery-mode', artifact.delivery_mode)
  reply.header('x-okp-review-required', String(artifact.review_required))

  if (artifact.fallback_of) {
    reply.header('x-okp-export-fallback', `${artifact.fallback_of}->${artifact.format === 'dwg' ? 'dxf' : artifact.format}`)
  }
  if (artifact.note) {
    reply.header('x-okp-export-note', artifact.note)
  }
}

function buildArtifactBuffer(artifact: InteropExportArtifact): Buffer {
  return typeof artifact.body === 'string' ? Buffer.from(artifact.body, 'utf8') : artifact.body
}

async function persistInteropArtifact(params: {
  projectId: string
  tenantId: string
  uploadedBy: string
  sourceId: string
  artifact: InteropExportArtifact
}) {
  const document = await registerProjectDocument({
    projectId: params.projectId,
    tenantId: params.tenantId,
    filename: params.artifact.filename,
    originalFilename: params.artifact.filename,
    mimeType: params.artifact.content_type,
    uploadedBy: params.uploadedBy,
    type: 'other',
    tags: [
      'interop',
      'export',
      params.artifact.format,
      params.artifact.artifact_kind,
      `provider:${params.artifact.provider_id}`,
      ...(params.artifact.fallback_of ? [`fallback-of:${params.artifact.fallback_of}`] : []),
    ],
    isPublic: false,
    sourceKind: 'manual_upload',
    sourceId: params.sourceId,
    versionMetadata: {
      interop: {
        provider_id: params.artifact.provider_id,
        format: params.artifact.format,
        artifact_kind: params.artifact.artifact_kind,
        delivery_mode: params.artifact.delivery_mode,
        native: params.artifact.native,
        review_required: params.artifact.review_required,
        fallback_of: params.artifact.fallback_of ?? null,
        note: params.artifact.note ?? null,
      },
    },
    buffer: buildArtifactBuffer(params.artifact),
  })

  return {
    documentId: document.id,
    downloadUrl: `/api/v1/projects/${params.projectId}/documents/${document.id}/download`,
  }
}

async function buildProjectScopedArtifact(
  format: Extract<InteropFormat, 'dxf' | 'dwg' | 'skp' | 'stl' | 'step' | 'obj' | '3mf'>,
  projectId: string,
  parsed: z.infer<typeof ExportRequestSchema>,
): Promise<InteropExportArtifact> {
  const provider = getInteropProvider(format)

  if (format === 'dxf') {
    const artifact = await provider.exportArtifact?.({
      projectId,
      filename: parsed.filename,
      payload: parsed.payload as Record<string, unknown>,
    })
    if (!artifact) {
      throw new Error('Export provider for dxf is not configured for artifacts.')
    }
    return artifact
  }

  if (format === 'dwg') {
    const artifact = await provider.exportArtifact?.({
      projectId,
      filename: parsed.filename,
      payload: {
        projectName: parsed.filename?.trim() || `project-${projectId}`,
        wall_segments: mapWallSegmentsForCad(parsed.payload),
        placements: [],
      },
    })
    if (!artifact) {
      throw new Error('Export provider for dwg is not configured for artifacts.')
    }
    return artifact
  }

  if (format === 'stl') {
    const artifact = await provider.exportArtifact?.({
      projectId,
      filename: parsed.filename,
      payload: {
        projectName: parsed.filename?.trim() || `project-${projectId}`,
        wall_segments: mapWallSegmentsForCad(parsed.payload),
        placements: parsed.payload.furniture.map((item) => ({
          id: item.id,
          offset_mm: item.footprintRect.min.x_mm,
          width_mm: Math.max(1, item.footprintRect.max.x_mm - item.footprintRect.min.x_mm),
          depth_mm: Math.max(1, item.footprintRect.max.y_mm - item.footprintRect.min.y_mm),
          height_mm: 720,
        })),
        ceiling_height_mm: 2600,
      },
    })
    if (!artifact) {
      throw new Error('Export provider for stl is not configured for artifacts.')
    }
    return artifact
  }

  if (format === 'step') {
    const artifact = await provider.exportArtifact?.({
      projectId,
      filename: parsed.filename,
      payload: {
        projectName: parsed.filename?.trim() || `project-${projectId}`,
        wall_segments: mapWallSegmentsForCad(parsed.payload),
        placements: parsed.payload.furniture.map((item) => ({
          id: item.id,
          offset_mm: item.footprintRect.min.x_mm,
          width_mm: Math.max(1, item.footprintRect.max.x_mm - item.footprintRect.min.x_mm),
          depth_mm: Math.max(1, item.footprintRect.max.y_mm - item.footprintRect.min.y_mm),
          height_mm: 720,
        })),
        ceiling_height_mm: 2600,
      },
    })
    if (!artifact) {
      throw new Error('Export provider for step is not configured for artifacts.')
    }
    return artifact
  }

  if (format === 'obj') {
    const artifact = await provider.exportArtifact?.({
      projectId,
      filename: parsed.filename,
      payload: {
        projectName: parsed.filename?.trim() || `project-${projectId}`,
        wall_segments: mapWallSegmentsForCad(parsed.payload),
        placements: parsed.payload.furniture.map((item) => ({
          id: item.id,
          offset_mm: item.footprintRect.min.x_mm,
          width_mm: Math.max(1, item.footprintRect.max.x_mm - item.footprintRect.min.x_mm),
          depth_mm: Math.max(1, item.footprintRect.max.y_mm - item.footprintRect.min.y_mm),
          height_mm: 720,
        })),
        ceiling_height_mm: 2600,
      },
    })
    if (!artifact) {
      throw new Error('Export provider for obj is not configured for artifacts.')
    }
    return artifact
  }

  if (format === '3mf') {
    const artifact = await provider.exportArtifact?.({
      projectId,
      filename: parsed.filename,
      payload: {
        projectName: parsed.filename?.trim() || `project-${projectId}`,
        wall_segments: mapWallSegmentsForCad(parsed.payload),
        placements: parsed.payload.furniture.map((item) => ({
          id: item.id,
          offset_mm: item.footprintRect.min.x_mm,
          width_mm: Math.max(1, item.footprintRect.max.x_mm - item.footprintRect.min.x_mm),
          depth_mm: Math.max(1, item.footprintRect.max.y_mm - item.footprintRect.min.y_mm),
          height_mm: 720,
        })),
        ceiling_height_mm: 2600,
      },
    })
    if (!artifact) {
      throw new Error('Export provider for 3mf is not configured for artifacts.')
    }
    return artifact
  }

  const artifact = await provider.exportArtifact?.({
    projectId,
    filename: parsed.filename,
    payload: {
      projectName: parsed.filename?.trim() || `project-${projectId}`,
      wall_segments: mapWallSegmentsForCad(parsed.payload),
      placements: [],
      ceiling_height_mm: 2600,
    },
  })
  if (!artifact) {
    throw new Error('Export provider for skp is not configured for artifacts.')
  }
  return artifact
}

export async function exportRoutes(app: FastifyInstance) {
  const dxfHandler = async (
    request: { body: unknown; params?: unknown; tenantId?: string | null },
    reply: FastifyReply,
  ) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    const bodyProjectId = parsed.data.project_id ?? null
    const projectId = routeProjectId ?? bodyProjectId

    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    if (routeProjectId && bodyProjectId && routeProjectId !== bodyProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('dxf', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:dxf',
      sourceId: `interop-export:dxf:${projectId}`,
      artifact,
    })

    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  }

  const dwgHandler = async (
    request: { body: unknown; params?: unknown; tenantId?: string | null },
    reply: FastifyReply,
  ) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    const bodyProjectId = parsed.data.project_id ?? null
    const projectId = routeProjectId ?? bodyProjectId

    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    if (routeProjectId && bodyProjectId && routeProjectId !== bodyProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('dwg', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:dwg',
      sourceId: `interop-export:dwg:${projectId}`,
      artifact,
    })

    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  }

  const skpHandler = async (
    request: { body: unknown; params?: unknown; tenantId?: string | null },
    reply: FastifyReply,
  ) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    const bodyProjectId = parsed.data.project_id ?? null
    const projectId = routeProjectId ?? bodyProjectId

    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    if (routeProjectId && bodyProjectId && routeProjectId !== bodyProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('skp', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:skp',
      sourceId: `interop-export:skp:${projectId}`,
      artifact,
    })

    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  }

  app.post('/projects/:projectId/export-descriptor/:format', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedBody = ExportRequestSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply as never, parsedBody.error.errors[0].message)
    }

    const parsedParams = ExportFormatParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply as never, parsedParams.error.errors[0].message)
    }

    if (parsedBody.data.project_id && parsedBody.data.project_id !== parsedParams.data.projectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, parsedParams.data.projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact(parsedParams.data.format, parsedParams.data.projectId, parsedBody.data)
    return reply.send(toArtifactDescriptor(artifact))
  })

  app.post('/exports/dxf', dxfHandler)
  app.post('/projects/:projectId/export-dxf', dxfHandler)
  app.post('/exports/dwg', dwgHandler)
  app.post('/projects/:projectId/export-dwg', dwgHandler)
  app.post('/exports/skp', skpHandler)
  app.post('/projects/:projectId/export-skp', skpHandler)
  app.post('/exports/stl', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const projectId = parsed.data.project_id
    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('stl', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:stl',
      sourceId: `interop-export:stl:${projectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/projects/:projectId/export-stl', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    if (!routeProjectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }
    if (parsed.data.project_id && parsed.data.project_id !== routeProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, routeProjectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('stl', routeProjectId, { ...parsed.data, project_id: routeProjectId })
    const persisted = await persistInteropArtifact({
      projectId: routeProjectId,
      tenantId,
      uploadedBy: 'system:interop-export:stl',
      sourceId: `interop-export:stl:${routeProjectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/exports/step', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const projectId = parsed.data.project_id
    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('step', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:step',
      sourceId: `interop-export:step:${projectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/projects/:projectId/export-step', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    if (!routeProjectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }
    if (parsed.data.project_id && parsed.data.project_id !== routeProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, routeProjectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('step', routeProjectId, { ...parsed.data, project_id: routeProjectId })
    const persisted = await persistInteropArtifact({
      projectId: routeProjectId,
      tenantId,
      uploadedBy: 'system:interop-export:step',
      sourceId: `interop-export:step:${routeProjectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/exports/obj', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const projectId = parsed.data.project_id
    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('obj', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:obj',
      sourceId: `interop-export:obj:${projectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/projects/:projectId/export-obj', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    if (!routeProjectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }
    if (parsed.data.project_id && parsed.data.project_id !== routeProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, routeProjectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('obj', routeProjectId, { ...parsed.data, project_id: routeProjectId })
    const persisted = await persistInteropArtifact({
      projectId: routeProjectId,
      tenantId,
      uploadedBy: 'system:interop-export:obj',
      sourceId: `interop-export:obj:${routeProjectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/exports/3mf', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const projectId = parsed.data.project_id
    if (!projectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, projectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('3mf', projectId, parsed.data)
    const persisted = await persistInteropArtifact({
      projectId,
      tenantId,
      uploadedBy: 'system:interop-export:3mf',
      sourceId: `interop-export:3mf:${projectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })
  app.post('/projects/:projectId/export-3mf', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsed = ExportRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply as never, parsed.error.errors[0].message)
    }

    const params = ExportProjectParamsSchema.safeParse(request.params)
    const routeProjectId = params.success ? params.data.projectId : null
    if (!routeProjectId) {
      return sendBadRequest(reply as never, 'project_id is required for tenant-scoped exports.')
    }
    if (parsed.data.project_id && parsed.data.project_id !== routeProjectId) {
      return sendBadRequest(reply as never, 'project_id in payload must match route parameter.')
    }

    const project = await assertProjectInTenantScope(reply, tenantId, routeProjectId)
    if (!project) {
      return reply
    }

    const artifact = await buildProjectScopedArtifact('3mf', routeProjectId, { ...parsed.data, project_id: routeProjectId })
    const persisted = await persistInteropArtifact({
      projectId: routeProjectId,
      tenantId,
      uploadedBy: 'system:interop-export:3mf',
      sourceId: `interop-export:3mf:${routeProjectId}`,
      artifact,
    })
    applyArtifactHeaders(reply, artifact)
    reply.header('x-okp-document-id', persisted.documentId)
    reply.header('x-okp-download-url', persisted.downloadUrl)
    reply.header('content-disposition', `attachment; filename="${artifact.filename}"`)
    reply.type(artifact.content_type)
    return reply.send(artifact.body)
  })

  app.post<{ Params: { id: string } }>('/alternatives/:id/export/gltf', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const { exportToGlb } = await import('../services/gltfExporter.js')

    const alternative = await prisma.alternative.findFirst({
      where: {
        id: request.params.id,
        area: {
          project: {
            tenant_id: tenantId,
          },
        },
      },
      select: {
        area: {
          select: {
            project_id: true,
          },
        },
      },
    })

    if (!alternative) {
      return sendNotFound(reply, 'Alternative not found')
    }

    const project = await prisma.project.findFirst({
      where: { id: alternative.area.project_id, tenant_id: tenantId },
      include: { rooms: { take: 1 } },
    })

    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const room = project.rooms[0]
    const boundary = (room?.boundary ?? null) as GltfBoundary | null
    const placements = (room?.placements ?? null) as GltfPlacement[] | null

    const glbBuffer = await exportToGlb({
      walls: boundary?.wall_segments ?? [],
      placements: placements ?? [],
      room_height_mm: room?.ceiling_height_mm ?? 2500,
    })

    reply.header('Content-Type', 'model/gltf-binary')
    reply.header('Content-Disposition', `attachment; filename="alternative-${request.params.id}.glb"`)
    return reply.send(glbBuffer)
  })
}
