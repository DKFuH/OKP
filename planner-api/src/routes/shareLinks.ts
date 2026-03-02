/**
 * shareLinks.ts – Sprint 44
 *
 * Routes for time-limited share links:
 *   POST  /share-links             – create a share link (with optional expiry)
 *   GET   /share-links/:token      – resolve; HTTP 410 if expired
 *   PATCH /share-links/:token      – extend expiry
 *
 * All routes are tenant-scoped via the x-tenant-id header.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '../db.js'
import { sendBadRequest, sendForbidden, sendNotFound } from '../errors.js'

// ─── Schemas ─────────────────────────────────────────────────────

const CreateShareLinkBodySchema = z.object({
    entity_type: z.string().min(1),
    entity_id: z.string().min(1),
    expires_in_days: z.number().int().positive().optional(),
})

const PatchShareLinkBodySchema = z.object({
    expires_in_days: z.number().int().positive(),
})

const TokenParamsSchema = z.object({
    token: z.string().min(1),
})

// ─── Helpers ─────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

function generateToken(): string {
    return randomBytes(24).toString('hex')
}

// ─── Route Registration ───────────────────────────────────────────

export async function shareLinkRoutes(app: FastifyInstance) {

    /**
     * POST /share-links
     *
     * Creates a new share link for the given entity.  If expires_in_days is
     * supplied the link will expire after that many days from now.
     */
    app.post('/share-links', async (request, reply) => {
        const tenantId = request.tenantId
        if (!tenantId) {
            return sendForbidden(reply, 'Tenant scope is required')
        }

        const body = CreateShareLinkBodySchema.safeParse(request.body)
        if (!body.success) {
            return sendBadRequest(reply, body.error.errors[0].message)
        }

        const expiresAt = body.data.expires_in_days
            ? addDays(new Date(), body.data.expires_in_days)
            : null

        const link = await prisma.shareLink.create({
            data: {
                token: generateToken(),
                tenant_id: tenantId,
                entity_type: body.data.entity_type,
                entity_id: body.data.entity_id,
                ...(expiresAt ? { expires_at: expiresAt } : {}),
            },
        })

        return reply.status(201).send(link)
    })

    /**
     * GET /share-links/:token
     *
     * Resolves a share link by token.  Returns HTTP 410 (Gone) when the link
     * has an expiry date that is in the past.
     */
    app.get<{ Params: { token: string } }>(
        '/share-links/:token',
        async (request, reply) => {
            const params = TokenParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const link = await prisma.shareLink.findUnique({
                where: { token: params.data.token },
            })

            if (!link) {
                return sendNotFound(reply, 'Share link not found')
            }

            if (link.expires_at && link.expires_at < new Date()) {
                return reply.status(410).send({
                    error: 'GONE',
                    message: 'This share link has expired',
                })
            }

            return reply.send(link)
        },
    )

    /**
     * PATCH /share-links/:token
     *
     * Extends the expiry of an existing share link by the given number of
     * days from now.
     */
    app.patch<{ Params: { token: string } }>(
        '/share-links/:token',
        async (request, reply) => {
            const tenantId = request.tenantId
            if (!tenantId) {
                return sendForbidden(reply, 'Tenant scope is required')
            }

            const params = TokenParamsSchema.safeParse(request.params)
            if (!params.success) {
                return sendBadRequest(reply, params.error.errors[0].message)
            }

            const body = PatchShareLinkBodySchema.safeParse(request.body)
            if (!body.success) {
                return sendBadRequest(reply, body.error.errors[0].message)
            }

            const existing = await prisma.shareLink.findFirst({
                where: { token: params.data.token, tenant_id: tenantId },
            })
            if (!existing) {
                return sendNotFound(reply, 'Share link not found')
            }

            const newExpiry = addDays(new Date(), body.data.expires_in_days)

            const updated = await prisma.shareLink.update({
                where: { token: params.data.token },
                data: { expires_at: newExpiry },
            })

            return reply.send(updated)
        },
    )
}
