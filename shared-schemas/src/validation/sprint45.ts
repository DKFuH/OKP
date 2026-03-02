/**
 * sprint45.ts – Sprint 45 Zod schemas
 *
 * Shared validation schemas for CoverPanel and CabinetProperties.
 * Used by planner-api routes and can be imported by any consuming package.
 */
import { z } from 'zod'

// ─── CoverPanel ───────────────────────────────────────────────────

export const CoverPanelCabinetSchema = z.object({
    cabinet_id: z.string().min(1),
    width_mm: z.number().int().positive(),
    depth_mm: z.number().int().positive(),
})

export type CoverPanelCabinet = z.infer<typeof CoverPanelCabinetSchema>

export const RebuildCoverPanelsBodySchema = z.object({
    cabinets: z.array(CoverPanelCabinetSchema).default([]),
})

export type RebuildCoverPanelsBody = z.infer<typeof RebuildCoverPanelsBodySchema>

// ─── CabinetProperties ────────────────────────────────────────────

export const CostTypeSchema = z.enum(['bauseits', 'nicht_bauseits'])

export type CostType = z.infer<typeof CostTypeSchema>

export const PatchPlacementPropertiesSchema = z.object({
    custom_depth_mm: z.number().int().positive().optional(),
    cost_type: CostTypeSchema.optional(),
})

export type PatchPlacementProperties = z.infer<typeof PatchPlacementPropertiesSchema>
