import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendForbidden, sendNotFound } from '../errors.js'
import {
  extractBoundaryVertices,
  renderHtmlViewer,
  renderLayoutSheetSvg,
  renderPlanSvg,
} from '../services/vectorExportService.js'

type SheetConfig = {
  show_arc_annotations?: unknown
  arc_dimension_style?: unknown
  show_north_arrow?: unknown
  level_id?: unknown
  section_line_id?: unknown
}

type SectionLineExport = {
  id: string
  label?: string
  start: { x_mm: number; y_mm: number }
  end: { x_mm: number; y_mm: number }
  direction?: string
  depth_mm?: number
  level_scope?: string
  level_id?: string
  sheet_visibility?: string
}

const PlanSvgBodySchema = z.object({
  level_id: z.string().uuid().optional(),
  section_line_id: z.string().uuid().optional(),
})

const LayoutSheetSvgBodySchema = z.object({
  level_id: z.string().uuid().optional(),
  section_line_id: z.string().uuid().optional(),
})

function parseConfig(value: unknown): SheetConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as SheetConfig
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as SheetConfig
      }
    } catch {
      return {}
    }
  }

  return {}
}

function getTenantId(request: {
  tenantId?: string | null
  headers?: Record<string, string | string[] | undefined>
}): string | null {
  if (request.tenantId) {
    return request.tenantId
  }

  const tenantHeader = request.headers?.['x-tenant-id']
  if (!tenantHeader) {
    return null
  }

  return Array.isArray(tenantHeader) ? (tenantHeader[0] ?? null) : tenantHeader
}

function buildHtmlFilename(projectId: string): string {
  return `project-${projectId}.html`
}

function buildSvgFilename(suffix: string, id: string): string {
  return `${suffix}-${id}.svg`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function parsePoint(value: unknown): { x_mm: number; y_mm: number } | null {
  const point = asRecord(value)
  if (!point) return null
  if (typeof point.x_mm !== 'number' || !Number.isFinite(point.x_mm)) return null
  if (typeof point.y_mm !== 'number' || !Number.isFinite(point.y_mm)) return null
  return { x_mm: point.x_mm, y_mm: point.y_mm }
}

function parseSectionLine(value: unknown): SectionLineExport | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.id !== 'string' || record.id.trim().length === 0) return null

  const start = parsePoint(record.start)
  const end = parsePoint(record.end)
  if (!start || !end) return null

  return {
    id: record.id,
    ...(typeof record.label === 'string' ? { label: record.label } : {}),
    start,
    end,
    ...(typeof record.direction === 'string' ? { direction: record.direction } : {}),
    ...(typeof record.depth_mm === 'number' && Number.isFinite(record.depth_mm) ? { depth_mm: record.depth_mm } : {}),
    ...(typeof record.level_scope === 'string' ? { level_scope: record.level_scope } : {}),
    ...(typeof record.level_id === 'string' ? { level_id: record.level_id } : {}),
    ...(typeof record.sheet_visibility === 'string' ? { sheet_visibility: record.sheet_visibility } : {}),
  }
}

function parseSectionLines(value: unknown): SectionLineExport[] {
  if (!Array.isArray(value)) return []
  const parsed: SectionLineExport[] = []
  for (const entry of value) {
    const line = parseSectionLine(entry)
    if (line) parsed.push(line)
  }
  return parsed
}

function resolveSectionLine(lines: SectionLineExport[], sectionLineId?: string): SectionLineExport | null {
  if (!sectionLineId) return lines[0] ?? null
  return lines.find((line) => line.id === sectionLineId) ?? null
}

export async function viewerExportsRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/projects/:id/export/html-viewer', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const project = await prisma.project.findUnique({
      where: { id: request.params.id },
      select: { id: true, name: true, tenant_id: true },
    })

    if (!project || project.tenant_id !== tenantId) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const rooms = await prisma.room.findMany({
      where: { project_id: project.id },
      select: { name: true, boundary: true },
      take: 1,
      orderBy: { created_at: 'asc' },
    })

    const firstRoom = rooms[0] ?? null
    const vertices = extractBoundaryVertices(firstRoom?.boundary)

    const html = renderHtmlViewer({
      projectId: project.id,
      projectName: project.name,
      roomName: firstRoom?.name ?? null,
      vertices,
    })

    reply.header('content-disposition', `attachment; filename="${buildHtmlFilename(project.id)}"`)
    reply.type('text/html; charset=utf-8')
    return reply.send(html)
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof PlanSvgBodySchema> }>('/projects/:id/export/plan-svg', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedBody = PlanSvgBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: parsedBody.error.errors[0]?.message ?? 'Invalid payload' })
    }

    const project = await prisma.project.findUnique({
      where: { id: request.params.id },
      select: { id: true, name: true, tenant_id: true },
    })

    if (!project || project.tenant_id !== tenantId) {
      return sendNotFound(reply, 'Project not found in tenant scope')
    }

    const rooms = await prisma.room.findMany({
      where: { project_id: project.id },
      select: {
        name: true,
        boundary: true,
        section_lines: true,
        level_id: true,
        level: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'asc' },
    })

    const selectedRoom = parsedBody.data.level_id
      ? rooms.find((room) => room.level_id === parsedBody.data.level_id) ?? rooms[0] ?? null
      : rooms[0] ?? null

    const vertices = extractBoundaryVertices(selectedRoom?.boundary)
    const sectionLines = parseSectionLines(selectedRoom?.section_lines)
    const sectionLine = resolveSectionLine(sectionLines, parsedBody.data.section_line_id)

    const svg = renderPlanSvg({
      projectName: project.name,
      roomName: selectedRoom?.name ?? null,
      vertices,
      levelId: selectedRoom?.level?.id ?? selectedRoom?.level_id ?? parsedBody.data.level_id ?? null,
      levelName: selectedRoom?.level?.name ?? null,
      sectionLine,
    })

    reply.header('content-disposition', `attachment; filename="${buildSvgFilename('project-plan', project.id)}"`)
    reply.type('image/svg+xml')
    return reply.send(svg)
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof LayoutSheetSvgBodySchema> }>('/layout-sheets/:id/export/svg', async (request, reply) => {
    const tenantId = getTenantId(request)
    if (!tenantId) {
      return sendForbidden(reply, 'Tenant scope is required')
    }

    const parsedBody = LayoutSheetSvgBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: parsedBody.error.errors[0]?.message ?? 'Invalid payload' })
    }

    const sheet = await prisma.layoutSheet.findUnique({
      where: { id: request.params.id },
      select: { id: true, name: true, project_id: true, config: true },
    })

    if (!sheet) {
      return sendNotFound(reply, 'Layout sheet not found')
    }

    const project = await prisma.project.findFirst({
      where: {
        id: sheet.project_id,
        tenant_id: tenantId,
      },
      select: { id: true },
    })

    if (!project) {
      return sendNotFound(reply, 'Layout sheet not found in tenant scope')
    }

    const config = parseConfig(sheet.config)
    const showArc = Boolean(config.show_arc_annotations)
    const showNorthArrow = Boolean(config.show_north_arrow)
    const arcStyle = String(config.arc_dimension_style ?? 'radius-first')
    const arcLabel = arcStyle === 'length-first' ? 'L=1571 mm' : 'R=1000 mm'
    const configuredLevelId = typeof config.level_id === 'string' ? config.level_id : undefined
    const configuredSectionId = typeof config.section_line_id === 'string' ? config.section_line_id : undefined

    const effectiveLevelId = parsedBody.data.level_id ?? configuredLevelId
    const effectiveSectionId = parsedBody.data.section_line_id ?? configuredSectionId

    const environment = showNorthArrow
      ? await prisma.projectEnvironment.findUnique({
          where: { project_id: project.id },
          select: { north_angle_deg: true },
        })
      : null

    const level = effectiveLevelId
      ? await prisma.buildingLevel.findFirst({
          where: {
            id: effectiveLevelId,
            project_id: project.id,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : null

    let sectionLabel: string | null = null
    if (effectiveSectionId) {
      const rooms = await prisma.room.findMany({
        where: {
          project_id: project.id,
          ...(effectiveLevelId ? { level_id: effectiveLevelId } : {}),
        },
        select: {
          section_lines: true,
        },
      })

      for (const room of rooms) {
        const line = resolveSectionLine(parseSectionLines(room.section_lines), effectiveSectionId)
        if (line) {
          sectionLabel = line.label ?? line.id
          break
        }
      }
    }

    const svg = renderLayoutSheetSvg({
      sheetName: sheet.name,
      showArcAnnotation: showArc,
      arcLabel,
      showNorthArrow,
      northAngleDeg: environment?.north_angle_deg ?? 0,
      levelId: level?.id ?? effectiveLevelId ?? null,
      levelName: level?.name ?? null,
      sectionLineId: effectiveSectionId ?? null,
      sectionLabel,
    })

    reply.header('content-disposition', `attachment; filename="${buildSvgFilename('layout-sheet', sheet.id)}"`)
    reply.type('image/svg+xml')
    return reply.send(svg)
  })
}
