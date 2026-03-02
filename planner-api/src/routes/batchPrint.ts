/**
 * batchPrint.ts – Sprint 44
 *
 * Routes for:
 *   POST /alternatives/:id/batch-print          – generate merged PDF
 *   GET  /user/print-batch-profiles             – list profiles
 *   POST /user/print-batch-profiles             – create profile
 *   PUT  /user/print-batch-profiles/:id         – update profile
 *   DELETE /user/print-batch-profiles/:id       – delete profile
 *
 * All write operations are scoped to the authenticated tenant (x-tenant-id
 * header).
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'
import { buildBatchPdf } from '../services/batchPrintService.js'

// ─── Schemas ─────────────────────────────────────────────────────

const AlternativeParamsSchema = z.object({
    id: z.string().uuid(),
})

const ProfileIdParamsSchema = z.object({
    id: z.string().uuid(),
})

const BatchPrintBodySchema = z.object({
    form_ids: z.array(z.string().min(1)).min(1, 'At least one form_id is required'),
    grayscale: z.boolean().default(false),
})

const CreateProfileBodySchema = z.object({
    name: z.string().min(1).max(100),
    form_ids: z.array(z.string().min(1)).default([]),
})

const UpdateProfileBodySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    form_ids: z.array(z.string().min(1)).optional(),
})

// ─── Route Registration ───────────────────────────────────────────

export async function batchPrintRoutes(app: FastifyInstance) {

    /**
     * POST /alternatives/:id/batch-print
     *
     * Generates a merged PDF from the supplied form_ids in the given order.
     * Optionally renders in grayscale (B/W, contours only) when grayscale=true.
     */
    app.post<{ Params: { id: string } }>(
        '/alternatives/:id/batch-print',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = AlternativeParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const body = BatchPrintBodySchema.safeParse(request.body)
            if (!body.success) {
                return sendBadRequest(reply, body.error.errors[0].message)
            }

            const alternative = await prisma.alternative.findUnique({
                where: { id: params.data.id },
            })
            if (!alternative) {
                return sendNotFound(reply, 'Alternative not found')
            }

            const pdf = buildBatchPdf({
                formIds: body.data.form_ids,
                grayscale: body.data.grayscale,
            })

            const mode = body.data.grayscale ? 'sw' : 'color'
            const filename = `batch-${params.data.id.slice(0, 8)}-${mode}.pdf`

            reply.header('content-disposition', `attachment; filename="${filename}"`)
            reply.header('x-batch-form-count', String(body.data.form_ids.length))
            reply.type('application/pdf')
            return reply.send(pdf)
        },
    )

    /**
     * GET /user/print-batch-profiles
     *
     * Lists all batch-print profiles for the given user_id in the current
     * tenant scope.
     */
    app.get('/user/print-batch-profiles', async (request, reply) => {
        const tenantId = request.tenantId
        if (!tenantId) {
            return sendForbidden(reply, 'Tenant scope is required')
        }

        const userId = (request.query as { user_id?: string }).user_id
        if (!userId) {
            return sendBadRequest(reply, 'user_id is required')
        }

        const profiles = await prisma.printBatchProfile.findMany({
            where: { user_id: userId, tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        })

        return reply.send(profiles)
    })

    /**
     * POST /user/print-batch-profiles
     *
     * Creates a new batch-print profile for the given user_id.
     */
    app.post('/user/print-batch-profiles', async (request, reply) => {
        const tenantId = request.tenantId
        if (!tenantId) {
            return sendForbidden(reply, 'Tenant scope is required')
        }

        const userId = (request.query as { user_id?: string }).user_id
        if (!userId) {
            return sendBadRequest(reply, 'user_id is required')
        }

        const body = CreateProfileBodySchema.safeParse(request.body)
        if (!body.success) {
            return sendBadRequest(reply, body.error.errors[0].message)
        }

        const profile = await prisma.printBatchProfile.create({
            data: {
                user_id: userId,
                tenant_id: tenantId,
                name: body.data.name,
                form_ids: body.data.form_ids,
            },
        })

        return reply.status(201).send(profile)
    })

    /**
     * PUT /user/print-batch-profiles/:id
     *
     * Replaces (updates) a batch-print profile by ID.
     */
    app.put<{ Params: { id: string } }>(
        '/user/print-batch-profiles/:id',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = ProfileIdParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const body = UpdateProfileBodySchema.safeParse(request.body)
            if (!body.success) {
                return sendBadRequest(reply, body.error.errors[0].message)
            }

            const existing = await prisma.printBatchProfile.findFirst({
                where: { id: params.data.id, tenant_id: tenantId },
            })
            if (!existing) {
                return sendNotFound(reply, 'Print batch profile not found')
            }

            const updated = await prisma.printBatchProfile.update({
                where: { id: params.data.id },
                data: {
                    ...(body.data.name !== undefined ? { name: body.data.name } : {}),
                    ...(body.data.form_ids !== undefined ? { form_ids: body.data.form_ids } : {}),
                },
            })

            return reply.send(updated)
        },
    )

    /**
     * DELETE /user/print-batch-profiles/:id
     *
     * Deletes a batch-print profile by ID.
     */
    app.delete<{ Params: { id: string } }>(
        '/user/print-batch-profiles/:id',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = ProfileIdParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const existing = await prisma.printBatchProfile.findFirst({
                where: { id: params.data.id, tenant_id: tenantId },
            })
            if (!existing) {
                return sendNotFound(reply, 'Print batch profile not found')
            }

            await prisma.printBatchProfile.delete({ where: { id: params.data.id } })
            return reply.status(204).send()
        },
    )
}
