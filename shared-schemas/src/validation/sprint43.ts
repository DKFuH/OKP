/**
 * sprint43.ts – Sprint 43 Zod schemas
 *
 * Shared validation schemas for UserFavorite and ModelTemplate.
 * Used by planner-api routes and can be imported by any consuming package.
 */
import { z } from 'zod'

// ─── UserFavorite ─────────────────────────────────────────────────

export const CreateFavoriteSchema = z.object({
    user_id: z.string().min(1),
    entity_type: z.string().min(1).max(50),
    entity_id: z.string().min(1),
})

export type CreateFavorite = z.infer<typeof CreateFavoriteSchema>

export const FavoriteParamsSchema = z.object({
    entityType: z.string().min(1).max(50),
    entityId: z.string().min(1),
})

export type FavoriteParams = z.infer<typeof FavoriteParamsSchema>

// ─── ModelTemplate ────────────────────────────────────────────────

export const CreateModelTemplateSchema = z.object({
    user_id: z.string().min(1),
    name: z.string().min(1).max(100),
    model_settings: z.record(z.unknown()).default({}),
})

export type CreateModelTemplate = z.infer<typeof CreateModelTemplateSchema>
