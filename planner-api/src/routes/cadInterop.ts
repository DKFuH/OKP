import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'
import { parseDwgBuffer } from '../services/interop/dwgImport.js'
import { buildDwgBuffer } from '../services/interop/dwgExport.js'
import { buildSkpRubyScript } from '../services/interop/skpExport.js'
import { arcToLineSegments, isArcWallSegment } from '../services/arcInterop.js'

const IdParamsSchema = z.object({
  id: z.string().uuid(),
})

const BatchExportQuerySchema = z.object({
  format: z.enum(['dxf', 'dwg', 'gltf', 'ifc', 'skp', 'all']).default('all'),
})

const CadExportBodySchema = z.object({
  level_id: z.string().uuid().optional(),
  section_line_id: z.string().uuid().optional(),
})

type BoundaryWall = {
  id?: string
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
}

type RoomBoundary = {
  wall_segments?: BoundaryWall[]
}

type RoomPlacement = {
  wall_id?: string
  offset_mm?: number
  width_mm?: number
  depth_mm?: number
  height_mm?: number
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

type CadExportMetadata = {
  level_id: string | null
  level_name: string | null
  section_line: {
    id: string
    label: string | null
    direction: string | null
    depth_mm: number | null
    level_scope: string | null
    level_id: string | null
    sheet_visibility: string | null
    start: { x_mm: number; y_mm: number }
    end: { x_mm: number; y_mm: number }
  } | null
}

function ensureBuffer(raw: unknown): Buffer | null {
  if (Buffer.isBuffer(raw)) {
    return raw
  }

  if (raw instanceof Uint8Array) {
    return Buffer.from(raw)
  }

  return null
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

function toCadMetadata(level: { id: string; name: string } | null, sectionLine: SectionLineExport | null): CadExportMetadata {
  return {
    level_id: level?.id ?? sectionLine?.level_id ?? null,
    level_name: level?.name ?? null,
    section_line: sectionLine
      ? {
          id: sectionLine.id,
          label: sectionLine.label ?? null,
          direction: sectionLine.direction ?? null,
          depth_mm: sectionLine.depth_mm ?? null,
          level_scope: sectionLine.level_scope ?? null,
          level_id: sectionLine.level_id ?? null,
          sheet_visibility: sectionLine.sheet_visibility ?? null,
          start: sectionLine.start,
          end: sectionLine.end,
        }
      : null,
  }
}

function mapRoomsForCadExport(
  rooms: Array<{ boundary: unknown; placements: unknown; ceiling_height_mm: number }>,
) {
  const wallSegments: Array<{
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
  }> = []
  const skpWallSegments: Array<{ x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }> = []
  const dwgPlacements: Array<{ offset_mm: number; width_mm: number; depth_mm: number; wall_id: string }> = []
  const skpPlacements: Array<{ offset_mm: number; width_mm: number; depth_mm: number; height_mm?: number }> = []

  let ceilingHeight = 2600

  for (const room of rooms) {
    ceilingHeight = room.ceiling_height_mm

    const boundary = (room.boundary as RoomBoundary | null) ?? null
    const placements = (room.placements as RoomPlacement[] | null) ?? []

    const localWalls = boundary?.wall_segments ?? []

    localWalls.forEach((wall, index) => {
      const wallId = wall.id ?? `wall-${wallSegments.length + index + 1}`

      if (isArcWallSegment(wall)) {
        wallSegments.push({
          id: wallId,
          kind: 'arc',
          start: wall.start,
          end: wall.end,
          center: wall.center,
          radius_mm: wall.radius_mm,
          clockwise: wall.clockwise,
          thickness_mm: wall.thickness_mm,
        })

        const approximated = arcToLineSegments({
          id: wallId,
          kind: 'arc',
          start: wall.start,
          end: wall.end,
          center: wall.center,
          radius_mm: wall.radius_mm,
          clockwise: wall.clockwise,
          thickness_mm: wall.thickness_mm,
        })
        for (const segment of approximated) {
          skpWallSegments.push(segment)
        }
        return
      }

      if (
        typeof wall.x0_mm !== 'number' ||
        typeof wall.y0_mm !== 'number' ||
        typeof wall.x1_mm !== 'number' ||
        typeof wall.y1_mm !== 'number'
      ) {
        return
      }

      wallSegments.push({
        id: wallId,
        kind: 'line',
        x0_mm: wall.x0_mm,
        y0_mm: wall.y0_mm,
        x1_mm: wall.x1_mm,
        y1_mm: wall.y1_mm,
      })
      skpWallSegments.push({
        x0_mm: wall.x0_mm,
        y0_mm: wall.y0_mm,
        x1_mm: wall.x1_mm,
        y1_mm: wall.y1_mm,
      })
    })

    const defaultWallId = localWalls[0]?.id ?? wallSegments[wallSegments.length - 1]?.id
    for (const placement of placements) {
      dwgPlacements.push({
        wall_id: placement.wall_id ?? defaultWallId ?? '',
        offset_mm: placement.offset_mm ?? 0,
        width_mm: placement.width_mm ?? 600,
        depth_mm: placement.depth_mm ?? 560,
      })

      skpPlacements.push({
        offset_mm: placement.offset_mm ?? 0,
        width_mm: placement.width_mm ?? 600,
        depth_mm: placement.depth_mm ?? 560,
        height_mm: placement.height_mm,
      })
    }
  }

  return {
    wallSegments,
    skpWallSegments,
    dwgPlacements: dwgPlacements.filter((placement) => placement.wall_id.length > 0),
    skpPlacements,
    ceilingHeight,
  }
}

export async function cadInteropRoutes(app: FastifyInstance) {
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_request, payload, done) => {
    done(null, payload)
  })

  app.post<{ Params: { id: string } }>('/projects/:id/import/dwg', async (request, reply) => {
    const parsedParams = IdParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid project id')
    }

    const project = await prisma.project.findUnique({ where: { id: parsedParams.data.id } })
    if (!project) {
      return sendNotFound(reply, 'Project not found')
    }

    const contentType = request.headers['content-type'] ?? ''
    if (!contentType.includes('application/octet-stream')) {
      return sendBadRequest(reply, 'Expected Content-Type: application/octet-stream')
    }

    const buffer = ensureBuffer(request.body)
    if (!buffer || buffer.length < 6) {
      return sendBadRequest(reply, 'Empty file')
    }

    const filenameHeader = request.headers['x-filename']
    const filename = typeof filenameHeader === 'string' ? filenameHeader : 'upload.dxf'

    let parsedImport
    try {
      parsedImport = await parseDwgBuffer(buffer, filename)
    } catch (error) {
      return sendBadRequest(reply, `Parse error: ${String(error)}`)
    }

    if (parsedImport.wall_segments.length === 0 && !parsedImport.needs_review) {
      return sendBadRequest(reply, 'No wall segments found in file')
    }

    const room = await prisma.room.create({
      data: {
        project_id: parsedParams.data.id,
        name: `Importiert aus ${filename}`,
        ceiling_height_mm: 2600,
        boundary: { wall_segments: parsedImport.wall_segments },
        placements: [],
      },
    })

    return reply.status(201).send({
      room_id: room.id,
      wall_segments_count: parsedImport.wall_segments.length,
      arc_entities_detected: parsedImport.arc_entities_detected,
      needs_review: parsedImport.needs_review,
      warnings: parsedImport.warnings,
    })
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof CadExportBodySchema> }>('/alternatives/:id/export/dxf', async (request, reply) => {
    const parsedParams = IdParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid alternative id')
    }

    const parsedBody = CadExportBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
    }

    const alternative = await prisma.alternative.findUnique({
      where: { id: parsedParams.data.id },
      include: { area: { include: { project: true } } },
    })

    if (!alternative) {
      return sendNotFound(reply, 'Alternative not found')
    }

    const level = parsedBody.data.level_id
      ? await prisma.buildingLevel.findFirst({
          where: {
            id: parsedBody.data.level_id,
            project_id: alternative.area.project.id,
          },
          select: { id: true, name: true },
        })
      : null

    if (parsedBody.data.level_id && !level) {
      return sendBadRequest(reply, 'level_id must reference a level in project scope')
    }

    const rooms = await prisma.room.findMany({
      where: {
        project_id: alternative.area.project.id,
        ...(parsedBody.data.level_id ? { level_id: parsedBody.data.level_id } : {}),
      },
      orderBy: { created_at: 'asc' },
    })

    const sectionLines = rooms.flatMap((room) => parseSectionLines(room.section_lines))
    const sectionLine = parsedBody.data.section_line_id
      ? sectionLines.find((line) => line.id === parsedBody.data.section_line_id) ?? null
      : sectionLines[0] ?? null

    if (parsedBody.data.section_line_id && !sectionLine) {
      return sendBadRequest(reply, 'section_line_id must reference a section line in project scope')
    }

    const { wallSegments, dwgPlacements } = mapRoomsForCadExport(rooms)

    const buffer = buildDwgBuffer({
      projectName: alternative.area.project.name,
      wall_segments: wallSegments,
      placements: dwgPlacements,
      metadata: toCadMetadata(level, sectionLine),
    })

    reply.header('Content-Type', 'application/dxf')
    reply.header('Content-Disposition', `attachment; filename="alternative-${parsedParams.data.id}.dxf"`)
    return reply.send(buffer)
  })

  app.post<{ Params: { id: string }; Body: z.infer<typeof CadExportBodySchema> }>('/alternatives/:id/export/dwg', async (request, reply) => {
    const parsedParams = IdParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid alternative id')
    }

    const parsedBody = CadExportBodySchema.safeParse(request.body ?? {})
    if (!parsedBody.success) {
      return sendBadRequest(reply, parsedBody.error.errors[0]?.message ?? 'Invalid payload')
    }

    const alternative = await prisma.alternative.findUnique({
      where: { id: parsedParams.data.id },
      include: { area: { include: { project: true } } },
    })

    if (!alternative) {
      return sendNotFound(reply, 'Alternative not found')
    }

    const level = parsedBody.data.level_id
      ? await prisma.buildingLevel.findFirst({
          where: {
            id: parsedBody.data.level_id,
            project_id: alternative.area.project.id,
          },
          select: { id: true, name: true },
        })
      : null

    if (parsedBody.data.level_id && !level) {
      return sendBadRequest(reply, 'level_id must reference a level in project scope')
    }

    const rooms = await prisma.room.findMany({
      where: {
        project_id: alternative.area.project.id,
        ...(parsedBody.data.level_id ? { level_id: parsedBody.data.level_id } : {}),
      },
      orderBy: { created_at: 'asc' },
    })

    const sectionLines = rooms.flatMap((room) => parseSectionLines(room.section_lines))
    const sectionLine = parsedBody.data.section_line_id
      ? sectionLines.find((line) => line.id === parsedBody.data.section_line_id) ?? null
      : sectionLines[0] ?? null

    if (parsedBody.data.section_line_id && !sectionLine) {
      return sendBadRequest(reply, 'section_line_id must reference a section line in project scope')
    }

    const { wallSegments, dwgPlacements } = mapRoomsForCadExport(rooms)

    const buffer = buildDwgBuffer({
      projectName: alternative.area.project.name,
      wall_segments: wallSegments,
      placements: dwgPlacements,
      metadata: toCadMetadata(level, sectionLine),
    })

    reply.header('Content-Type', 'application/dxf')
    reply.header('Content-Disposition', `attachment; filename="alternative-${parsedParams.data.id}.dxf"`)
    return reply.send(buffer)
  })

  app.post<{ Params: { id: string } }>('/alternatives/:id/export/skp', async (request, reply) => {
    const parsedParams = IdParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid alternative id')
    }

    const alternative = await prisma.alternative.findUnique({
      where: { id: parsedParams.data.id },
      include: { area: { include: { project: true } } },
    })

    if (!alternative) {
      return sendNotFound(reply, 'Alternative not found')
    }

    const rooms = await prisma.room.findMany({ where: { project_id: alternative.area.project.id } })
    const { skpWallSegments, skpPlacements, ceilingHeight } = mapRoomsForCadExport(rooms)

    const script = buildSkpRubyScript({
      projectName: alternative.area.project.name,
      wall_segments: skpWallSegments,
      placements: skpPlacements,
      ceiling_height_mm: ceilingHeight,
    })

    reply.header('Content-Type', 'application/ruby')
    reply.header('Content-Disposition', `attachment; filename="alternative-${parsedParams.data.id}.rb"`)
    return reply.send(script)
  })

  app.post<{ Params: { id: string }; Querystring: { format?: string } }>(
    '/alternatives/:id/export',
    async (request, reply) => {
      const parsedParams = IdParamsSchema.safeParse(request.params)
      if (!parsedParams.success) {
        return sendBadRequest(reply, parsedParams.error.errors[0]?.message ?? 'Invalid alternative id')
      }

      const parsedQuery = BatchExportQuerySchema.safeParse(request.query)
      if (!parsedQuery.success) {
        return sendBadRequest(reply, 'Invalid format parameter')
      }

      const alternative = await prisma.alternative.findUnique({
        where: { id: parsedParams.data.id },
        include: { area: { include: { project: true } } },
      })
      if (!alternative) {
        return sendNotFound(reply, 'Alternative not found')
      }

      const format = parsedQuery.data.format
      if (format === 'all') {
        return reply.send({
          formats: ['dxf', 'dwg', 'gltf', 'ifc', 'skp'],
          urls: {
            dxf: `/api/v1/alternatives/${parsedParams.data.id}/export/dxf`,
            dwg: `/api/v1/alternatives/${parsedParams.data.id}/export/dwg`,
            gltf: `/api/v1/alternatives/${parsedParams.data.id}/export/gltf`,
            ifc: `/api/v1/alternatives/${parsedParams.data.id}/export/ifc`,
            skp: `/api/v1/alternatives/${parsedParams.data.id}/export/skp`,
          },
        })
      }

      return reply.redirect(`/api/v1/alternatives/${parsedParams.data.id}/export/${format}`, 302)
    },
  )
}
