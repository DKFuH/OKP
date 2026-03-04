import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { generateSpecificationPackage } from '../services/specificationPackageService.js'
import { normalizeLocaleCode, resolveLocaleCode } from '../services/localeSupport.js'

const PackageBodySchema = z.object({
  name: z.string().min(1).max(140),
  locale_code: z.string().min(2).max(10).optional(),
  config_json: z.object({
    sections: z.array(z.string()).optional(),
    include_cover_page: z.boolean().optional(),
    include_company_profile: z.boolean().optional(),
  }).default({}),
})

const PackageGenerateBodySchema = z.object({
  locale_code: z.string().min(2).max(10).optional(),
})

const PackageDownloadQuerySchema = z.object({
  locale_code: z.string().min(2).max(10).optional(),
})

type SpecificationPackageStore = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>
  create: (args: unknown) => Promise<Record<string, unknown>>
  update: (args: unknown) => Promise<Record<string, unknown>>
  delete: (args: unknown) => Promise<Record<string, unknown>>
}

function getStore(): SpecificationPackageStore {
  return (prisma as unknown as { specificationPackage: SpecificationPackageStore }).specificationPackage
}

function ensureTenant(tenantId: string | null, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) {
  if (tenantId) return true
  reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
  return false
}

export async function specificationPackageRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/specification-packages', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return

    const store = getStore()
    const items = await store.findMany({
      where: {
        tenant_id: request.tenantId,
        project_id: request.params.id,
      },
      orderBy: { created_at: 'asc' },
    })

    return reply.send(items)
  })

  app.post<{ Params: { id: string } }>('/projects/:id/specification-packages', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return

    const project = await prisma.project.findUnique({
      where: { id: request.params.id },
      select: { id: true, tenant_id: true },
    })
    if (!project || project.tenant_id !== request.tenantId) {
      return sendNotFound(reply, 'Project not found')
    }

    const parsed = PackageBodySchema.safeParse(request.body ?? {})
    if (!parsed.success) return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')

    const requestedLocale = normalizeLocaleCode(parsed.data.locale_code)
    if (parsed.data.locale_code && !requestedLocale) {
      return sendBadRequest(reply, 'locale_code must be one of: de, en')
    }

    const tenantLocaleSettings = request.tenantId
      ? await prisma.tenantSetting.findUnique({
          where: { tenant_id: request.tenantId },
          select: { preferred_locale: true },
        })
      : null

    const effectiveLocale = resolveLocaleCode({
      requested: requestedLocale,
      tenantPreferred: tenantLocaleSettings?.preferred_locale ?? null,
    })

    const store = getStore()
    const created = await store.create({
      data: {
        tenant_id: request.tenantId,
        project_id: request.params.id,
        name: parsed.data.name,
        locale_code: effectiveLocale,
        config_json: parsed.data.config_json as unknown as Prisma.InputJsonValue,
      },
    })

    return reply.status(201).send(created)
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof PackageGenerateBodySchema> }>('/specification-packages/:id/generate', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return

    const parsedBody = PackageGenerateBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')

    const requestedLocale = normalizeLocaleCode(parsedBody.data.locale_code)
    if (parsedBody.data.locale_code && !requestedLocale) {
      return sendBadRequest(reply, 'locale_code must be one of: de, en')
    }

    const store = getStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== request.tenantId) {
      return sendNotFound(reply, 'Specification package not found')
    }

    const tenantLocaleSettings = request.tenantId
      ? await prisma.tenantSetting.findUnique({
          where: { tenant_id: request.tenantId },
          select: { preferred_locale: true },
        })
      : null

    const effectiveLocale = resolveLocaleCode({
      requested: requestedLocale,
      persisted: String(existing.locale_code ?? ''),
      tenantPreferred: tenantLocaleSettings?.preferred_locale ?? null,
    })

    const generated = await generateSpecificationPackage(
      prisma,
      String(existing.project_id),
      String(existing.id),
      ((existing.config_json ?? {}) as Record<string, unknown>) ?? {},
      effectiveLocale,
    )

    const updated = await store.update({
      where: { id: request.params.id },
      data: {
        locale_code: effectiveLocale,
        generated_at: new Date(),
        artifact_json: {
          generated_at: new Date().toISOString(),
          locale_code: effectiveLocale,
          sections: generated.sections,
          filename: `specification-package-${String(existing.id).slice(0, 8)}.pdf`,
        } as unknown as Prisma.InputJsonValue,
      },
    })

    return reply.send({
      id: updated.id,
      sections: generated.sections,
      generated_at: updated.generated_at,
    })
  })

  app.get<{ Params: { id: string }; Querystring: z.infer<typeof PackageDownloadQuerySchema> }>('/specification-packages/:id/download', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return

    const parsedQuery = PackageDownloadQuerySchema.safeParse(request.query ?? {})
    if (!parsedQuery.success) return sendBadRequest(reply, parsedQuery.error.errors[0]?.message ?? 'Invalid query')

    const requestedLocale = normalizeLocaleCode(parsedQuery.data.locale_code)
    if (parsedQuery.data.locale_code && !requestedLocale) {
      return sendBadRequest(reply, 'locale_code must be one of: de, en')
    }

    const store = getStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== request.tenantId) {
      return sendNotFound(reply, 'Specification package not found')
    }

    const tenantLocaleSettings = request.tenantId
      ? await prisma.tenantSetting.findUnique({
          where: { tenant_id: request.tenantId },
          select: { preferred_locale: true },
        })
      : null

    const effectiveLocale = resolveLocaleCode({
      requested: requestedLocale,
      persisted: String(existing.locale_code ?? ''),
      tenantPreferred: tenantLocaleSettings?.preferred_locale ?? null,
    })

    const generated = await generateSpecificationPackage(
      prisma,
      String(existing.project_id),
      String(existing.id),
      ((existing.config_json ?? {}) as Record<string, unknown>) ?? {},
      effectiveLocale,
    )

    const filename = `specification-package-${String(existing.id).slice(0, 8)}.pdf`
    reply.header('content-disposition', `attachment; filename="${filename}"`)
    reply.type('application/pdf')
    return reply.send(generated.merged_pdf)
  })

  app.delete<{ Params: { id: string } }>('/specification-packages/:id', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return

    const store = getStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== request.tenantId) {
      return sendNotFound(reply, 'Specification package not found')
    }

    await store.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })
}
