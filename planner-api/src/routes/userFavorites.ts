/**
 * userFavorites.ts – Sprint 43
 *
 * HTTP routes for user favorites and model templates.
 * All routes are scoped to the authenticated user (user_id query param)
 * and tenant (X-Tenant-Id header via tenantMiddleware).
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { sendBadRequest, sendNotFound } from '../errors.js'

// ─── Shared helpers ───────────────────────────────────────────────

const UserIdQuerySchema = z.object({
    user_id: z.string().min(1),
})

/** Returns a tenant_id filter if a tenantId is present on the request. */
function tenantFilter(tenantId: string | null): { tenant_id: string } | Record<string, never> {
    return tenantId ? { tenant_id: tenantId } : {}
}

// ─── Favorites schemas ────────────────────────────────────────────

const CreateFavoriteBodySchema = z.object({
    entity_type: z.string().min(1).max(50),
    entity_id: z.string().min(1),
})

const FavoriteParamsSchema = z.object({
    entityType: z.string().min(1).max(50),
    entityId: z.string().min(1),
})

const FavoritesQuerySchema = z.object({
    user_id: z.string().min(1),
    entity_type: z.string().min(1).max(50).optional(),
})

// ─── Model-templates schemas ──────────────────────────────────────

const CreateModelTemplateBodySchema = z.object({
    name: z.string().min(1).max(100),
    model_settings: z.record(z.unknown()).default({}),
})

const ModelTemplateIdParamsSchema = z.object({
    id: z.string().min(1),
})

// ─── Route Registration ───────────────────────────────────────────

export async function userFavoritesRoutes(app: FastifyInstance) {

    /**
     * POST /user/favorites
     * Create a new user favorite.
     */
    app.post('/user/favorites', async (request, reply) => {
        const query = UserIdQuerySchema.safeParse(request.query)
        if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

        const body = CreateFavoriteBodySchema.safeParse(request.body)
        if (!body.success) return sendBadRequest(reply, body.error.errors[0].message)

        const { user_id } = query.data
        const tenantId = request.tenantId ?? null

        // Upsert: silently ignore if already exists
        const favorite = await prisma.userFavorite.upsert({
            where: {
                user_id_entity_type_entity_id: {
                    user_id,
                    entity_type: body.data.entity_type,
                    entity_id: body.data.entity_id,
                },
            },
            create: {
                user_id,
                tenant_id: tenantId,
                entity_type: body.data.entity_type,
                entity_id: body.data.entity_id,
            },
            update: {},
        })

        return reply.status(201).send(favorite)
    })

    /**
     * DELETE /user/favorites/:entityType/:entityId
     * Remove a user favorite.
     */
    app.delete<{ Params: { entityType: string; entityId: string } }>(
        '/user/favorites/:entityType/:entityId',
        async (request, reply) => {
            const query = UserIdQuerySchema.safeParse(request.query)
            if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

            const params = FavoriteParamsSchema.safeParse(request.params)
            if (!params.success) return sendBadRequest(reply, params.error.errors[0].message)

            const { user_id } = query.data
            const tenantId = request.tenantId ?? null

            const existing = await prisma.userFavorite.findUnique({
                where: {
                    user_id_entity_type_entity_id: {
                        user_id,
                        entity_type: params.data.entityType,
                        entity_id: params.data.entityId,
                    },
                },
            })

            if (!existing) return sendNotFound(reply, 'Favorite not found')
            // Tenant guard: reject if record belongs to a different tenant
            if (tenantId && existing.tenant_id && existing.tenant_id !== tenantId) {
                return sendNotFound(reply, 'Favorite not found')
            }

            await prisma.userFavorite.delete({
                where: {
                    user_id_entity_type_entity_id: {
                        user_id,
                        entity_type: params.data.entityType,
                        entity_id: params.data.entityId,
                    },
                },
            })

            return reply.status(204).send()
        },
    )

    /**
     * GET /user/favorites
     * List user favorites, optionally filtered by entity_type.
     */
    app.get('/user/favorites', async (request, reply) => {
        const query = FavoritesQuerySchema.safeParse(request.query)
        if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

        const { user_id, entity_type } = query.data

        const favorites = await prisma.userFavorite.findMany({
            where: {
                user_id,
                ...tenantFilter(request.tenantId ?? null),
                ...(entity_type ? { entity_type } : {}),
            },
            orderBy: { created_at: 'desc' },
        })

        return reply.send(favorites)
    })

    /**
     * POST /user/model-templates
     * Save a new model template.
     */
    app.post('/user/model-templates', async (request, reply) => {
        const query = UserIdQuerySchema.safeParse(request.query)
        if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

        const body = CreateModelTemplateBodySchema.safeParse(request.body)
        if (!body.success) return sendBadRequest(reply, body.error.errors[0].message)

        const { user_id } = query.data
        const tenantId = request.tenantId ?? null

        const template = await prisma.modelTemplate.create({
            data: {
                user_id,
                tenant_id: tenantId,
                name: body.data.name,
                model_settings: body.data.model_settings as object,
            },
        })

        return reply.status(201).send(template)
    })

    /**
     * GET /user/model-templates
     * List all model templates for the user.
     */
    app.get('/user/model-templates', async (request, reply) => {
        const query = UserIdQuerySchema.safeParse(request.query)
        if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

        const templates = await prisma.modelTemplate.findMany({
            where: { user_id: query.data.user_id, ...tenantFilter(request.tenantId ?? null) },
            orderBy: { created_at: 'desc' },
        })

        return reply.send(templates)
    })

    /**
     * GET /user/model-templates/:id
     * Load a single model template (e.g. for the F7-Dialog).
     */
    app.get<{ Params: { id: string } }>(
        '/user/model-templates/:id',
        async (request, reply) => {
            const params = ModelTemplateIdParamsSchema.safeParse(request.params)
            if (!params.success) return sendBadRequest(reply, params.error.errors[0].message)

            const query = UserIdQuerySchema.safeParse(request.query)
            if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

            const template = await prisma.modelTemplate.findFirst({
                where: { id: params.data.id, user_id: query.data.user_id, ...tenantFilter(request.tenantId ?? null) },
            })

            if (!template) return sendNotFound(reply, 'Model template not found')

            return reply.send(template)
        },
    )

    /**
     * DELETE /user/model-templates/:id
     * Delete a model template.
     */
    app.delete<{ Params: { id: string } }>(
        '/user/model-templates/:id',
        async (request, reply) => {
            const params = ModelTemplateIdParamsSchema.safeParse(request.params)
            if (!params.success) return sendBadRequest(reply, params.error.errors[0].message)

            const query = UserIdQuerySchema.safeParse(request.query)
            if (!query.success) return sendBadRequest(reply, query.error.errors[0].message)

            const existing = await prisma.modelTemplate.findFirst({
                where: { id: params.data.id, user_id: query.data.user_id, ...tenantFilter(request.tenantId ?? null) },
            })

            if (!existing) return sendNotFound(reply, 'Model template not found')

            await prisma.modelTemplate.delete({ where: { id: params.data.id } })

            return reply.status(204).send()
        },
    )
}
