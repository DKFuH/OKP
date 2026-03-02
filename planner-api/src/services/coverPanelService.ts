/**
 * coverPanelService.ts – Sprint 45
 *
 * Service for:
 *   - Rebuilding cover panels (Abdeckboden) for an alternative
 *   - Niche wall-offset adjustment logic (Nischenverkleidung)
 *   - Placement property management (custom_depth_mm, cost_type)
 *
 * Follows the same rebuild-and-reconcile pattern as FillerService (Sprint 41).
 */
import { prisma } from '../db.js'

export interface CoverPanelInput {
    cabinet_id: string
    width_mm: number
    depth_mm: number
}

export interface RebuildOptions {
    cabinets: CoverPanelInput[]
}

export interface PlacementPropertiesInput {
    custom_depth_mm?: number
    cost_type?: string
}

/**
 * Computes the adjusted wall offset for an installation object that is
 * covered by a niche panel.  The niche panel depth reduces the available
 * distance between the wall and the installation object.
 *
 * @param originalOffsetMm  Current offset_from_wall_mm of the installation
 * @param nichePanelDepthMm Depth of the niche panel in mm
 * @returns Adjusted offset (never negative)
 */
export function computeNicheWallOffset(
    originalOffsetMm: number,
    nichePanelDepthMm: number,
): number {
    return Math.max(0, originalOffsetMm - nichePanelDepthMm)
}

export const CoverPanelService = {
    /**
     * (Re-)generates cover panels for all cabinets in the given alternative.
     * Deletes any existing cover panels first, then creates new ones.
     *
     * @returns Summary of deleted and created records.
     */
    async rebuild(alternative_id: string, options: RebuildOptions) {
        const { count: deleted } = await prisma.coverPanel.deleteMany({
            where: { alternative_id },
        })

        if (options.cabinets.length === 0) {
            return { alternative_id, deleted, created: 0, items: [] }
        }

        await prisma.coverPanel.createMany({
            data: options.cabinets.map((c) => ({
                alternative_id,
                cabinet_id: c.cabinet_id,
                width_mm: c.width_mm,
                depth_mm: c.depth_mm,
                generated: true,
            })),
        })

        const items = await prisma.coverPanel.findMany({
            where: { alternative_id },
            orderBy: { cabinet_id: 'asc' },
        })

        return {
            alternative_id,
            deleted,
            created: options.cabinets.length,
            items,
        }
    },

    /**
     * Returns all cover panels for a given alternative.
     */
    async list(alternative_id: string) {
        return prisma.coverPanel.findMany({
            where: { alternative_id },
            orderBy: { cabinet_id: 'asc' },
        })
    },

    /**
     * Upserts cabinet properties (custom_depth_mm, cost_type) for a placement.
     */
    async setPlacementProperties(placement_id: string, props: PlacementPropertiesInput) {
        const fields = {
            ...(props.custom_depth_mm !== undefined ? { custom_depth_mm: props.custom_depth_mm } : {}),
            ...(props.cost_type !== undefined ? { cost_type: props.cost_type } : {}),
        }
        return prisma.cabinetProperties.upsert({
            where: { placement_id },
            create: { placement_id, ...fields },
            update: fields,
        })
    },

    /**
     * Returns cabinet properties for a placement, or null if none exist.
     */
    async getPlacementProperties(placement_id: string) {
        return prisma.cabinetProperties.findUnique({
            where: { placement_id },
        })
    },
}
