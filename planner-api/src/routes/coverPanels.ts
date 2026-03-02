/**
 * coverPanels.ts – Sprint 45
 *
 * Routes for:
 *   POST /alternatives/:id/cover-panels/rebuild   – rebuild cover panels
 *   GET  /alternatives/:id/cover-panels           – list cover panels
 *   PATCH /placements/:id/properties              – set custom_depth_mm, cost_type
 *
 * All write operations require an authenticated tenant (x-tenant-id header).
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'
import { CoverPanelService } from '../services/coverPanelService.js'

// ─── Schemas ─────────────────────────────────────────────────────

const AlternativeParamsSchema = z.object({
    id: z.string().uuid(),
})

const PlacementParamsSchema = z.object({
    id: z.string().min(1),
})

const CoverPanelCabinetSchema = z.object({
    cabinet_id: z.string().min(1),
    width_mm: z.number().int().positive(),
    depth_mm: z.number().int().positive(),
})

const RebuildBodySchema = z.object({
    cabinets: z.array(CoverPanelCabinetSchema).default([]),
})

const PatchPropertiesBodySchema = z.object({
    custom_depth_mm: z.number().int().positive().optional(),
    cost_type: z.enum(['bauseits', 'nicht_bauseits']).optional(),
})

// ─── Route Registration ───────────────────────────────────────────

export async function coverPanelRoutes(app: FastifyInstance) {

    /**
     * POST /alternatives/:id/cover-panels/rebuild
     *
     * (Re-)generates cover panels for the given alternative.
     * Replaces all existing cover panels.
     */
    app.post<{ Params: { id: string } }>(
        '/alternatives/:id/cover-panels/rebuild',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = AlternativeParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const body = RebuildBodySchema.safeParse(request.body ?? {})
            if (!body.success) {
                return sendBadRequest(reply, body.error.errors[0].message)
            }

            const alternative = await prisma.alternative.findUnique({
                where: { id: params.data.id },
            })
            if (!alternative) {
                return sendNotFound(reply, 'Alternative not found')
            }

            const result = await CoverPanelService.rebuild(params.data.id, body.data)
            return reply.status(200).send(result)
        },
    )

    /**
     * GET /alternatives/:id/cover-panels
     *
     * Returns all cover panels for the given alternative.
     */
    app.get<{ Params: { id: string } }>(
        '/alternatives/:id/cover-panels',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = AlternativeParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const alternative = await prisma.alternative.findUnique({
                where: { id: params.data.id },
            })
            if (!alternative) {
                return sendNotFound(reply, 'Alternative not found')
            }

            const items = await CoverPanelService.list(params.data.id)
            return reply.send(items)
        },
    )

    /**
     * PATCH /placements/:id/properties
     *
     * Sets custom_depth_mm and/or cost_type on a placement's cabinet properties.
     * Creates the record if it does not exist yet (upsert).
     */
    app.patch<{ Params: { id: string } }>(
        '/placements/:id/properties',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = PlacementParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const body = PatchPropertiesBodySchema.safeParse(request.body ?? {})
            if (!body.success) {
                return sendBadRequest(reply, body.error.errors[0].message)
            }

            if (body.data.custom_depth_mm === undefined && body.data.cost_type === undefined) {
                return sendBadRequest(reply, 'At least one of custom_depth_mm or cost_type must be provided')
            }

            const record = await CoverPanelService.setPlacementProperties(params.data.id, body.data)
            return reply.send(record)
        },
    )
}
