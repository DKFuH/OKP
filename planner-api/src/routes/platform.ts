import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden } from '../errors.js'
import { createDailyTenantBackup } from '../services/backupService.js'
import { queueNotification } from '../services/notificationService.js'

const SearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(['project', 'contact', 'document']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

const ExportProjectsQuerySchema = z.object({
  status_filter: z.enum(['lead', 'planning', 'quoted', 'contract', 'production', 'installed', 'archived']).optional(),
})

const ExportContactsQuerySchema = z.object({
  search: z.string().min(1).max(200).optional(),
})

const NotificationPayloadSchema = z.object({
  event_type: z.enum(['project_status_changed', 'document_uploaded', 'document_deleted', 'quote_created', 'custom']),
  entity_type: z.string().min(1).max(80),
  entity_id: z.string().min(1).max(200),
  recipient_email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  metadata: z.record(z.unknown()).optional(),
})

const BackupBodySchema = z.object({
  triggered_by: z.string().min(1).max(120).default('system:daily-backup'),
})

function getTenantId(request: { tenantId?: string | null; headers?: Record<string, string | string[] | undefined> }): string | null {
  if (request.tenantId) {
    return request.tenantId
  }

  const header = request.headers?.['x-tenant-id']
  if (!header) {
    return null
  }

  return Array.isArray(header) ? (header[0] ?? null) : header
}

function escapeCsv(value: unknown): string {
  const normalized = value == null ? '' : String(value)
  if (/[",\n;]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0] ?? {})
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ].join('\n')
}

export async function platformRoutes(app: FastifyInstance) {
  app.get('/search', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedQuery = SearchQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return sendBadRequest(reply, parsedQuery.error.errors[0]?.message ?? 'Invalid query')
    }

    const query = parsedQuery.data.q.trim()
    const limit = parsedQuery.data.limit
    const includeProjects = !parsedQuery.data.type || parsedQuery.data.type === 'project'
    const includeContacts = !parsedQuery.data.type || parsedQuery.data.type === 'contact'
    const includeDocuments = !parsedQuery.data.type || parsedQuery.data.type === 'document'

    const [projects, contacts, documents] = await Promise.all([
      includeProjects
        ? prisma.project.findMany({
          where: {
            tenant_id: tenantId,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            project_status: true,
            updated_at: true,
          },
          take: limit,
          orderBy: { updated_at: 'desc' },
        })
        : Promise.resolve([]),
      includeContacts
        ? prisma.contact.findMany({
          where: {
            tenant_id: tenantId,
            OR: [
              { first_name: { contains: query, mode: 'insensitive' } },
              { last_name: { contains: query, mode: 'insensitive' } },
              { company: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company: true,
            email: true,
            updated_at: true,
          },
          take: limit,
          orderBy: { updated_at: 'desc' },
        })
        : Promise.resolve([]),
      includeDocuments
        ? prisma.document.findMany({
          where: {
            tenant_id: tenantId,
            OR: [
              { filename: { contains: query, mode: 'insensitive' } },
              { original_filename: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } },
            ],
          },
          select: {
            id: true,
            filename: true,
            type: true,
            project_id: true,
            uploaded_at: true,
            tags: true,
          },
          take: limit,
          orderBy: { uploaded_at: 'desc' },
        })
        : Promise.resolve([]),
    ])

    return reply.send({
      query,
      results: [
        ...projects.map((project) => ({
          type: 'project',
          id: project.id,
          title: project.name,
          subtitle: project.description,
          meta: project.project_status,
          href: `/projects/${project.id}`,
          updated_at: project.updated_at,
        })),
        ...contacts.map((contact) => ({
          type: 'contact',
          id: contact.id,
          title: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.last_name,
          subtitle: contact.company ?? contact.email,
          meta: contact.email,
          href: `/contacts`,
          updated_at: contact.updated_at,
        })),
        ...documents.map((document) => ({
          type: 'document',
          id: document.id,
          title: document.filename,
          subtitle: document.tags.join(', '),
          meta: document.type,
          href: `/documents?project=${document.project_id}`,
          updated_at: document.uploaded_at,
        })),
      ].slice(0, limit),
    })
  })

  app.post('/webhooks/email-notifications', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedBody = NotificationPayloadSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
    }

    const notification = await queueNotification({
      tenantId,
      eventType: parsedBody.data.event_type,
      entityType: parsedBody.data.entity_type,
      entityId: parsedBody.data.entity_id,
      recipientEmail: parsedBody.data.recipient_email,
      subject: parsedBody.data.subject,
      message: parsedBody.data.message,
      metadata: parsedBody.data.metadata,
    })

    return reply.status(202).send({
      status: 'queued',
      notification_id: (notification as { id?: string } | null)?.id ?? null,
    })
  })

  app.post('/backups/run-daily', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedBody = BackupBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
    }

    const backup = await createDailyTenantBackup(tenantId, parsedBody.data.triggered_by)
    return reply.status(201).send(backup)
  })

  app.get('/projects/export-csv', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedQuery = ExportProjectsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return sendBadRequest(reply, parsedQuery.error.errors[0]?.message ?? 'Invalid query')
    }

    const projects = await prisma.project.findMany({
      where: {
        tenant_id: tenantId,
        ...(parsedQuery.data.status_filter ? { project_status: parsedQuery.data.status_filter } : {}),
      },
      select: {
        id: true,
        name: true,
        project_status: true,
        priority: true,
        assigned_to: true,
        deadline: true,
        progress_pct: true,
        quote_value: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    })

    const csv = toCsv(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        project_status: project.project_status,
        priority: project.priority,
        assigned_to: project.assigned_to ?? '',
        deadline: project.deadline?.toISOString() ?? '',
        progress_pct: project.progress_pct,
        quote_value: project.quote_value ?? '',
        updated_at: project.updated_at.toISOString(),
      })),
    )

    reply.header('content-disposition', 'attachment; filename="projects-export.csv"')
    reply.type('text/csv; charset=utf-8')
    return reply.send(csv)
  })

  app.get('/contacts/export-csv', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedQuery = ExportContactsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return sendBadRequest(reply, parsedQuery.error.errors[0]?.message ?? 'Invalid query')
    }

    const search = parsedQuery.data.search?.trim()
    const contacts = await prisma.contact.findMany({
      where: {
        tenant_id: tenantId,
        ...(search
          ? {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
          : {}),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company: true,
        email: true,
        phone: true,
        lead_source: true,
        budget_estimate: true,
        updated_at: true,
      },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    })

    const csv = toCsv(
      contacts.map((contact) => ({
        id: contact.id,
        first_name: contact.first_name ?? '',
        last_name: contact.last_name,
        company: contact.company ?? '',
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        lead_source: contact.lead_source,
        budget_estimate: contact.budget_estimate ?? '',
        updated_at: contact.updated_at.toISOString(),
      })),
    )

    reply.header('content-disposition', 'attachment; filename="contacts-export.csv"')
    reply.type('text/csv; charset=utf-8')
    return reply.send(csv)
  })

  /**
   * POST /platform/seed-rules
   * Initialisiert den Regelkatalog in der Datenbank (Admin-Funktion).
   */
  app.post('/platform/seed-rules', async (request, reply) => {
    // In einer echten App: Nur fÃ¼r Super-Admins erlaubt
    const { RuleEngineV2 } = await import('../services/ruleEngineV2.js')
    const result = await RuleEngineV2.seedDefaultRules()
    return reply.send(result)
  })
}
