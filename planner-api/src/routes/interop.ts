import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'

const ProjectParamsSchema = z.object({
  id: z.string().uuid(),
})

function getTenantId(request: { tenantId?: string | null; headers?: Record<string, string | string[] | undefined> }): string | null {
  if (request.tenantId) {
    return request.tenantId
  }

  const headerValue = request.headers?.['x-tenant-id']
  if (!headerValue) {
    return null
  }

  return Array.isArray(headerValue) ? (headerValue[0] ?? null) : headerValue
}

async function assertProjectInTenantScope(projectId: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    select: { id: true, tenant_id: true },
  })
}

function toInteropJob(job: {
  id: string
  status: string
  created_at?: Date | string
  completed_at?: Date | string | null
  source_format?: string | null
  source_filename?: string | null
  filename?: string | null
  error_message?: string | null
  error?: string | null
}) {
  const format = job.source_format ?? 'ifc'
  const filename = job.source_filename ?? job.filename ?? 'artifact'

  return {
    id: job.id,
    kind: format === 'ifc' ? 'ifc_import' : 'import',
    format,
    status: job.status,
    filename,
    error: job.error_message ?? job.error ?? null,
    created_at: job.created_at ?? null,
    completed_at: job.completed_at ?? null,
  }
}

function toInteropArtifact(document: {
  id: string
  project_id: string
  filename: string
  mime_type: string
  type: string
  source_kind: string
  source_id: string | null
  uploaded_at: Date | string
  tags: string[]
}) {
  const inferredFormat =
    document.filename.toLowerCase().endsWith('.ifc')
      ? 'ifc'
      : document.filename.toLowerCase().endsWith('.skp.rb') || document.filename.toLowerCase().endsWith('.rb')
        ? 'skp'
        : document.filename.toLowerCase().endsWith('.stl')
          ? 'stl'
          : document.filename.toLowerCase().endsWith('.step') || document.filename.toLowerCase().endsWith('.stp')
            ? 'step'
            : document.filename.toLowerCase().endsWith('.obj')
              ? 'obj'
              : document.filename.toLowerCase().endsWith('.3mf')
                ? '3mf'
        : document.filename.toLowerCase().endsWith('.dwg')
          ? 'dwg'
          : document.filename.toLowerCase().endsWith('.dxf')
            ? 'dxf'
            : 'unknown'

  return {
    id: document.id,
    project_id: document.project_id,
    filename: document.filename,
    mime_type: document.mime_type,
    type: document.type,
    source_kind: document.source_kind,
    source_id: document.source_id,
    format: inferredFormat,
    tags: document.tags,
    uploaded_at: document.uploaded_at,
    download_url: `/api/v1/projects/${document.project_id}/documents/${document.id}/download`,
  }
}

export async function interopRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/interop/jobs', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedParams = ProjectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid project id')
    }

    const project = await assertProjectInTenantScope(parsedParams.data.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const [importJobs, ifcJobs] = await Promise.all([
      prisma.importJob.findMany({
        where: { project_id: parsedParams.data.id },
        orderBy: { created_at: 'desc' },
      }),
      prisma.ifcImportJob.findMany({
        where: { project_id: parsedParams.data.id },
        orderBy: { created_at: 'desc' },
      }),
    ])

    const jobs = [
      ...importJobs.map(toInteropJob),
      ...ifcJobs.map((job) =>
        toInteropJob({
          id: job.id,
          status: job.status,
          filename: job.filename,
          error: job.error,
          created_at: job.created_at,
        }),
      ),
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))

    return reply.send(jobs)
  })

  app.get<{ Params: { id: string } }>('/projects/:id/interop/artifacts', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedParams = ProjectParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid project id')
    }

    const project = await assertProjectInTenantScope(parsedParams.data.id, tenantId)
    if (!project) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const documents = await prisma.document.findMany({
      where: {
        project_id: parsedParams.data.id,
        tenant_id: tenantId,
        OR: [
          { type: 'cad_import' },
          { tags: { has: 'dxf' } },
          { tags: { has: 'dwg' } },
          { tags: { has: 'skp' } },
          { tags: { has: 'ifc' } },
          { tags: { has: '3mf' } },
          { tags: { has: 'interop' } },
        ],
      },
      orderBy: [{ uploaded_at: 'desc' }, { version_no: 'desc' }],
      select: {
        id: true,
        project_id: true,
        filename: true,
        mime_type: true,
        type: true,
        source_kind: true,
        source_id: true,
        uploaded_at: true,
        tags: true,
      },
    })

    return reply.send(documents.map(toInteropArtifact))
  })
}
