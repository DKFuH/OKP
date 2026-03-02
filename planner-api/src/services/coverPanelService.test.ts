/**
 * coverPanelService.test.ts – Sprint 45
 *
 * Unit tests for CoverPanelService and the niche wall-offset helper.
 * Uses Vitest (no real database).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ALT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

// ─── Hoisted mocks ───────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        coverPanel: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
            findMany: vi.fn(),
        },
        cabinetProperties: {
            upsert: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}))

vi.mock('../db.js', () => ({ prisma: prismaMock }))

import { CoverPanelService, computeNicheWallOffset } from './coverPanelService.js'

// ─── computeNicheWallOffset ───────────────────────────────────────

describe('computeNicheWallOffset', () => {
    it('subtracts niche panel depth from original offset', () => {
        expect(computeNicheWallOffset(600, 150)).toBe(450)
    })

    it('clamps result to 0 when niche panel is deeper than offset', () => {
        expect(computeNicheWallOffset(100, 200)).toBe(0)
    })

    it('returns original offset when niche panel depth is 0', () => {
        expect(computeNicheWallOffset(500, 0)).toBe(500)
    })
})

// ─── CoverPanelService.rebuild ────────────────────────────────────

describe('CoverPanelService.rebuild', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deletes existing and creates new cover panels, returns summary', async () => {
        prismaMock.coverPanel.deleteMany.mockResolvedValue({ count: 2 })
        prismaMock.coverPanel.createMany.mockResolvedValue({ count: 1 })
        const panel = {
            id: 'cp-01',
            alternative_id: ALT_ID,
            cabinet_id: 'cab-1',
            width_mm: 600,
            depth_mm: 580,
            generated: true,
            created_at: new Date(),
        }
        prismaMock.coverPanel.findMany.mockResolvedValue([panel])

        const result = await CoverPanelService.rebuild(ALT_ID, {
            cabinets: [{ cabinet_id: 'cab-1', width_mm: 600, depth_mm: 580 }],
        })

        expect(result).toMatchObject({ alternative_id: ALT_ID, deleted: 2, created: 1 })
        expect(result.items).toHaveLength(1)
        expect(prismaMock.coverPanel.deleteMany).toHaveBeenCalledOnce()
        expect(prismaMock.coverPanel.createMany).toHaveBeenCalledOnce()
    })

    it('returns empty items when no cabinets are provided', async () => {
        prismaMock.coverPanel.deleteMany.mockResolvedValue({ count: 0 })

        const result = await CoverPanelService.rebuild(ALT_ID, { cabinets: [] })

        expect(result).toMatchObject({ alternative_id: ALT_ID, deleted: 0, created: 0, items: [] })
        expect(prismaMock.coverPanel.createMany).not.toHaveBeenCalled()
    })
})

// ─── CoverPanelService.list ───────────────────────────────────────

describe('CoverPanelService.list', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns all cover panels for an alternative', async () => {
        const panel = {
            id: 'cp-02',
            alternative_id: ALT_ID,
            cabinet_id: 'cab-2',
            width_mm: 900,
            depth_mm: 600,
            generated: true,
            created_at: new Date(),
        }
        prismaMock.coverPanel.findMany.mockResolvedValue([panel])

        const items = await CoverPanelService.list(ALT_ID)

        expect(items).toHaveLength(1)
        expect(items[0]).toMatchObject({ cabinet_id: 'cab-2', width_mm: 900 })
        expect(prismaMock.coverPanel.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { alternative_id: ALT_ID } }),
        )
    })
})
