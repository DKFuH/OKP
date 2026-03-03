import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { resolveAnnotativeStyle } from '../services/layoutStyleResolver.js'

const PresetBodySchema = z.object({
  name: z.string().min(1).max(120),
  text_height_mm: z.number().positive().default(3.5),
  arrow_size_mm: z.number().positive().default(2.5),
  line_width_mm: z.number().positive().default(0.25),
  centerline_dash_mm: z.number().positive().default(6),
  symbol_scale_mm: z.number().positive().default(10),
  font_family: z.string().max(120).nullable().optional(),
  config_json: z.record(z.unknown()).optional(),
})

const PreviewBodySchema = z.object({
  sheet_scale: z.string().optional(),
  style_preset_id: z.string().uuid().optional(),
})

type LayoutStyleStore = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>
  create: (args: unknown) => Promise<Record<string, unknown>>
  update: (args: unknown) => Promise<Record<string, unknown>>
  delete: (args: unknown) => Promise<Record<string, unknown>>
}

function getStyleStore(): LayoutStyleStore {
  return (prisma as unknown as { layoutStylePreset: LayoutStyleStore }).layoutStylePreset
}

function toPresetRecord(value: Record<string, unknown>) {
  return {
    id: String(value.id),
    tenant_id: String(value.tenant_id),
    name: String(value.name),
    text_height_mm: Number(value.text_height_mm ?? 3.5),
    arrow_size_mm: Number(value.arrow_size_mm ?? 2.5),
    line_width_mm: Number(value.line_width_mm ?? 0.25),
    centerline_dash_mm: Number(value.centerline_dash_mm ?? 6),
    symbol_scale_mm: Number(value.symbol_scale_mm ?? 10),
    font_family: value.font_family == null ? null : String(value.font_family),
    config_json: (value.config_json ?? {}) as Record<string, unknown>,
  }
}

function pickScaleFromSheetConfig(config: unknown): string | undefined {
  if (!config || typeof config !== 'object') return undefined
  const candidate = (config as Record<string, unknown>).sheet_scale
  return typeof candidate === 'string' ? candidate : undefined
}

function pickStylePresetFromSheetConfig(config: unknown): string | undefined {
  if (!config || typeof config !== 'object') return undefined
  const candidate = (config as Record<string, unknown>).style_preset_id
  return typeof candidate === 'string' ? candidate : undefined
}

export async function layoutStyleRoutes(app: FastifyInstance) {
  app.get('/tenant/layout-styles', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const store = getStyleStore()
    const items = await store.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    })

    return reply.send(items)
  })

  app.post('/tenant/layout-styles', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsed = PresetBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const store = getStyleStore()
    const created = await store.create({
      data: {
        tenant_id: tenantId,
        ...parsed.data,
        config_json: (parsed.data.config_json ?? {}) as Prisma.InputJsonValue,
      },
    })

    return reply.status(201).send(created)
  })

  app.put<{ Params: { id: string } }>('/tenant/layout-styles/:id', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsed = PresetBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const store = getStyleStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== tenantId) {
      return sendNotFound(reply, 'Layout style preset not found')
    }

    const updated = await store.update({
      where: { id: request.params.id },
      data: {
        ...parsed.data,
        config_json: (parsed.data.config_json ?? {}) as Prisma.InputJsonValue,
      },
    })

    return reply.send(updated)
  })

  app.delete<{ Params: { id: string } }>('/tenant/layout-styles/:id', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const store = getStyleStore()
    const existing = await store.findUnique({ where: { id: request.params.id } })
    if (!existing || String(existing.tenant_id) !== tenantId) {
      return sendNotFound(reply, 'Layout style preset not found')
    }

    await store.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })

  app.post<{ Params: { id: string } }>('/layout-sheets/:id/preview-style', async (request, reply) => {
    const tenantId = request.tenantId
    if (!tenantId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Missing tenant scope' })
    }

    const parsed = PreviewBodySchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return sendBadRequest(reply, parsed.error.errors[0]?.message ?? 'Invalid payload')
    }

    const sheet = await prisma.layoutSheet.findUnique({ where: { id: request.params.id } })
    if (!sheet) {
      return sendNotFound(reply, 'Layout sheet not found')
    }

    const styleStore = getStyleStore()
    const sheetConfig = sheet.config as Record<string, unknown> | null
    const resolvedPresetId = parsed.data.style_preset_id ?? pickStylePresetFromSheetConfig(sheetConfig)

    let preset = null as ReturnType<typeof toPresetRecord> | null

    if (resolvedPresetId) {
      const found = await styleStore.findUnique({ where: { id: resolvedPresetId } })
      if (found && String(found.tenant_id) === tenantId) {
        preset = toPresetRecord(found)
      }
    }

    if (!preset) {
      const first = await styleStore.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'asc' },
        take: 1,
      })
      if (first[0]) {
        preset = toPresetRecord(first[0])
      }
    }

    const effectivePreset = preset ?? {
      id: 'default',
      tenant_id: tenantId,
      name: 'Standard',
      text_height_mm: 3.5,
      arrow_size_mm: 2.5,
      line_width_mm: 0.25,
      centerline_dash_mm: 6,
      symbol_scale_mm: 10,
      font_family: null,
      config_json: {},
    }

    const sheetScale = parsed.data.sheet_scale ?? pickScaleFromSheetConfig(sheetConfig) ?? '1:20'
    const resolved = resolveAnnotativeStyle({
      sheet_scale: sheetScale,
      preset: {
        text_height_mm: effectivePreset.text_height_mm,
        arrow_size_mm: effectivePreset.arrow_size_mm,
        line_width_mm: effectivePreset.line_width_mm,
        centerline_dash_mm: effectivePreset.centerline_dash_mm,
        symbol_scale_mm: effectivePreset.symbol_scale_mm,
      },
    })

    return reply.send({
      sheet_id: sheet.id,
      sheet_scale: sheetScale,
      preset: effectivePreset,
      resolved,
    })
  })
}
