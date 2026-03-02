/**
 * sprint44.ts – Sprint 44 Zod schemas
 *
 * Shared validation schemas for PrintBatchProfile and ShareLink.
 * Used by planner-api routes and can be imported by any consuming package.
 */
import { z } from 'zod'

// ─── PrintBatchProfile ────────────────────────────────────────────

export const PrintBatchProfileSchema = z.object({
    id: z.string().uuid().optional(),
    user_id: z.string().min(1),
    tenant_id: z.string().min(1),
    name: z.string().min(1).max(100),
    form_ids: z.array(z.string().min(1)).default([]),
})

export type PrintBatchProfile = z.infer<typeof PrintBatchProfileSchema>

// ─── BatchPrintRequest ────────────────────────────────────────────

export const BatchPrintRequestSchema = z.object({
    form_ids: z.array(z.string().min(1)).min(1),
    grayscale: z.boolean().default(false),
})

export type BatchPrintRequest = z.infer<typeof BatchPrintRequestSchema>

// ─── ShareLink ────────────────────────────────────────────────────

export const ShareLinkCreateSchema = z.object({
    tenant_id: z.string().min(1),
    entity_type: z.string().min(1),
    entity_id: z.string().min(1),
    expires_in_days: z.number().int().positive().optional(),
})

export type ShareLinkCreate = z.infer<typeof ShareLinkCreateSchema>

export const ShareLinkPatchSchema = z.object({
    expires_in_days: z.number().int().positive(),
})

export type ShareLinkPatch = z.infer<typeof ShareLinkPatchSchema>
