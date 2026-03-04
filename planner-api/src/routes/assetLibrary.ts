import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { extractModelImportMeta } from '../services/modelImportService.js'

type AssetListEntry = {
  name: string
  tags_json: unknown
}

const CategorySchema = z.enum(['base', 'wall', 'appliance', 'decor', 'custom'])

const AssetListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  category: CategorySchema.optional(),
})

const AssetImportBodySchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  category: CategorySchema.default('custom'),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  file_name: z.string().trim().min(1).max(240),
  file_base64: z.string().trim().min(1),
})

const AssetPatchBodySchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  category: CategorySchema.optional(),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
  preview_url: z.string().url().nullable().optional(),
})

function normalizeTags(input: string[]): string[] {
  return [...new Set(input.map((entry) => entry.trim().toLowerCase()).filter(Boolean))]
}

function ensureTenant(
  tenantId: string | null | undefined,
  reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
): tenantId is string {
  if (tenantId) return true
  reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
  return false
}

function stripExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  return index > 0 ? fileName.slice(0, index) : fileName
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

export async function assetLibraryRoutes(app: FastifyInstance) {
  app.get('/tenant/assets', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedQuery = AssetListQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return sendBadRequest(reply, parsedQuery.error.errors[0]?.message ?? 'Ungültige Filter')
    }

    const where = {
      tenant_id: tenantId,
      ...(parsedQuery.data.category ? { category: parsedQuery.data.category } : {}),
    }

    const items = await prisma.assetLibraryItem.findMany({
      where,
      orderBy: { updated_at: 'desc' },
    })

    const query = parsedQuery.data.q?.toLowerCase()
    if (!query) {
      return reply.send(items)
    }

    const filtered = (items as AssetListEntry[]).filter((item) => {
      const tags = Array.isArray(item.tags_json)
        ? item.tags_json.filter((entry: unknown): entry is string => typeof entry === 'string').join(' ')
        : ''
      return `${item.name} ${tags}`.toLowerCase().includes(query)
    })

    return reply.send(filtered)
  })

  app.post('/tenant/assets/import', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedBody = AssetImportBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Importdaten')
    }

    let decoded: Buffer
    try {
      decoded = Buffer.from(parsedBody.data.file_base64, 'base64')
    } catch {
      return sendBadRequest(reply, 'Dateiinhalt konnte nicht gelesen werden')
    }

    if (!decoded || decoded.length === 0) {
      return sendBadRequest(reply, 'Datei ist leer')
    }

    if (decoded.length > 8 * 1024 * 1024) {
      return sendBadRequest(reply, 'Datei zu groß (max. 8 MB)')
    }

    const content = decoded.toString('utf-8')

    let importMeta
    try {
      importMeta = extractModelImportMeta(parsedBody.data.file_name, content)
    } catch (error) {
      return sendBadRequest(reply, error instanceof Error ? error.message : 'Modell konnte nicht verarbeitet werden')
    }

    const name = parsedBody.data.name ?? stripExtension(parsedBody.data.file_name)
    const safeName = slugify(name || parsedBody.data.file_name || 'asset')

    const created = await prisma.assetLibraryItem.create({
      data: {
        tenant_id: tenantId,
        name,
        category: parsedBody.data.category,
        source_format: importMeta.sourceFormat,
        file_url: `asset://tenant/${tenantId}/${Date.now()}-${safeName}`,
        preview_url: null,
        bbox_json: importMeta.bboxMm as unknown as Prisma.InputJsonValue,
        default_scale_json: importMeta.defaultScale as unknown as Prisma.InputJsonValue,
        tags_json: normalizeTags(parsedBody.data.tags) as Prisma.InputJsonValue,
      },
    })

    return reply.status(201).send(created)
  })

  app.patch<{ Params: { id: string } }>('/tenant/assets/:id', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const parsedBody = AssetPatchBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Ungültige Asset-Daten')
    }

    const existing = await prisma.assetLibraryItem.findUnique({ where: { id: request.params.id } })
    if (!existing || existing.tenant_id !== tenantId) {
      return sendNotFound(reply, 'Asset nicht gefunden')
    }

    const updated = await prisma.assetLibraryItem.update({
      where: { id: request.params.id },
      data: {
        ...(parsedBody.data.name ? { name: parsedBody.data.name } : {}),
        ...(parsedBody.data.category ? { category: parsedBody.data.category } : {}),
        ...(parsedBody.data.tags ? { tags_json: normalizeTags(parsedBody.data.tags) as Prisma.InputJsonValue } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsedBody.data, 'preview_url')
          ? { preview_url: parsedBody.data.preview_url }
          : {}),
      },
    })

    return reply.send(updated)
  })

  app.delete<{ Params: { id: string } }>('/tenant/assets/:id', async (request, reply) => {
    if (!ensureTenant(request.tenantId, reply)) return
    const tenantId = request.tenantId

    const existing = await prisma.assetLibraryItem.findUnique({ where: { id: request.params.id } })
    if (!existing || existing.tenant_id !== tenantId) {
      return sendNotFound(reply, 'Asset nicht gefunden')
    }

    await prisma.assetLibraryItem.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })
}
