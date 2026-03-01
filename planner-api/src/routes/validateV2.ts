/**
 * validateV2.ts – Sprint 22 / TASK-22-A01
 * POST /projects/:id/validate-v2
 * Orchestriert die Rule Engine v2 für ein Projekt.
 */
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'
import { RuleEngineV2, type PlacedObjectV2 } from '../services/ruleEngineV2.js'

const ProjectParamsSchema = z.object({ id: z.string().uuid() })

const PlacedObjectSchema = z.object({
    id: z.string().min(1),
    wall_id: z.string().min(1),
    offset_mm: z.number(),
    width_mm: z.number().positive(),
    depth_mm: z.number().positive(),
    height_mm: z.number().positive(),
    type: z.enum(['base', 'wall', 'tall', 'appliance']).default('base'),
    door_swing: z.enum(['left', 'right', 'none']).optional(),
    has_handle_boring: z.boolean().optional(),
    worldPos: z.object({ x_mm: z.number(), y_mm: z.number() }).optional(),
})

const ValidateV2BodySchema = z.object({
    room_id: z.string().uuid(),
    placements: z.array(PlacedObjectSchema).max(500).default([]),
    ceiling_height_mm: z.number().positive().default(2500),
    min_clearance_mm: z.number().nonnegative().default(50),
})

const RuleDefCreateSchema = z.object({
    rule_key: z.string().regex(/^[A-Z]+-\d{3}$/),
    category: z.enum(['collision', 'clearance', 'ergonomics', 'completeness', 'accessory']),
    severity: z.enum(['error', 'warning', 'hint']).default('warning'),
    params_json: z.record(z.unknown()).default({}),
    enabled: z.boolean().default(true),
    tenant_id: z.string().uuid().optional(),
})

export async function validateV2Routes(app: FastifyInstance) {

    function getTenantId(request: unknown): string | null {
        const tenantId = (request as { tenantId?: string | null }).tenantId
        return tenantId ?? null
    }

    /**
     * POST /projects/:id/validate-v2
     * Führt alle aktiven Regeln aus und persistiert das Ergebnis.
     */
    app.post<{ Params: { id: string } }>('/projects/:id/validate-v2', async (request, reply) => {
        const tenantId = getTenantId(request)
        if (!tenantId) return sendForbidden(reply, 'Tenant scope is required')

        const params = ProjectParamsSchema.safeParse(request.params)
        if (!params.success) return sendBadRequest(reply, params.error.errors[0].message)

        const body = ValidateV2BodySchema.safeParse(request.body)
        if (!body.success) return sendBadRequest(reply, body.error.errors[0].message)

        // Verify project exists
        const project = await prisma.project.findFirst({
            where: { id: params.data.id, tenant_id: tenantId },
            select: { id: true, tenant_id: true },
        })
        if (!project) return sendNotFound(reply, 'Project not found in tenant scope')

        // Load generated items for worktop / plinth from DB
        const generatedItems = await prisma.generatedItem.findMany({
            where: { project_id: params.data.id, room_id: body.data.room_id },
            select: { id: true, item_type: true, qty: true },
        })

        const snapshot = {
            project_id: params.data.id,
            room_id: body.data.room_id,
            placements: body.data.placements as PlacedObjectV2[],
            worktop_items: generatedItems.filter((i) => i.item_type === 'worktop'),
            plinth_items: generatedItems.filter((i) => i.item_type === 'plinth'),
            ceiling_height_mm: body.data.ceiling_height_mm,
            min_clearance_mm: body.data.min_clearance_mm,
        }

        const result = await RuleEngineV2.run(snapshot, tenantId)
        return reply.send(result)
    })

    /**
     * GET /projects/:id/validate-v2/history
     * Prüf-Historie für Finalfreigabe.
     */
    app.get<{ Params: { id: string } }>('/projects/:id/validate-v2/history', async (request, reply) => {
        const tenantId = getTenantId(request)
        if (!tenantId) return sendForbidden(reply, 'Tenant scope is required')

        const params = ProjectParamsSchema.safeParse(request.params)
        if (!params.success) return sendBadRequest(reply, params.error.errors[0].message)

        const project = await prisma.project.findFirst({
            where: { id: params.data.id, tenant_id: tenantId },
            select: { id: true },
        })
        if (!project) return sendNotFound(reply, 'Project not found in tenant scope')

        const history = await RuleEngineV2.history(params.data.id)
        return reply.send(history)
    })

    // ── Rule Definitions CRUD ────────────────────────────────────

    /** GET /rule-definitions */
    app.get('/rule-definitions', async (_request, reply) => {
        const tenantId = getTenantId(_request)
        if (!tenantId) return sendForbidden(reply, 'Tenant scope is required')

        const defs = await prisma.ruleDefinition.findMany({
            where: {
                OR: [{ tenant_id: null }, { tenant_id: tenantId }],
            },
            orderBy: [{ category: 'asc' }, { rule_key: 'asc' }],
        })
        return reply.send(defs)
    })

    /** POST /rule-definitions */
    app.post('/rule-definitions', async (request, reply) => {
        const tenantId = getTenantId(request)
        if (!tenantId) return sendForbidden(reply, 'Tenant scope is required')

        const parsed = RuleDefCreateSchema.safeParse(request.body)
        if (!parsed.success) return sendBadRequest(reply, parsed.error.errors[0].message)

        const def = await prisma.ruleDefinition.create({
            data: {
                ...parsed.data,
                tenant_id: tenantId,
                params_json: parsed.data.params_json as Prisma.InputJsonValue,
            },
        })
        return reply.status(201).send(def)
    })

    /** PATCH /rule-definitions/:id */
    app.patch<{ Params: { id: string } }>('/rule-definitions/:id', async (request, reply) => {
        const tenantId = getTenantId(request)
        if (!tenantId) return sendForbidden(reply, 'Tenant scope is required')

        const params = z.object({ id: z.string().uuid() }).safeParse(request.params)
        if (!params.success) return sendBadRequest(reply, params.error.errors[0].message)

        const body = RuleDefCreateSchema.partial().safeParse(request.body)
        if (!body.success) return sendBadRequest(reply, body.error.errors[0].message)

        const existing = await prisma.ruleDefinition.findFirst({
            where: {
                id: params.data.id,
                tenant_id: tenantId,
            },
            select: { id: true },
        })
        if (!existing) return sendNotFound(reply, 'Rule definition not found in tenant scope')

        const updateData = {
            ...body.data,
            ...(body.data.tenant_id !== undefined ? { tenant_id: tenantId } : {}),
            ...(body.data.params_json !== undefined
                ? { params_json: body.data.params_json as Prisma.InputJsonValue }
                : {}),
        }
        const def = await prisma.ruleDefinition.update({
            where: { id: params.data.id },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: updateData as any,
        })
        return reply.send(def)
    })

    /** POST /rule-definitions/seed – Seed-Endpunkt für Standard-Regeln */
    app.post('/rule-definitions/seed', async (_request, reply) => {
        const tenantId = getTenantId(_request)
        if (!tenantId) return sendForbidden(reply, 'Tenant scope is required')

        const result = await RuleEngineV2.seedDefaultRules()
        return reply.status(201).send(result)
    })
}
