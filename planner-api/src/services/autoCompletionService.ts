/**
 * autoCompletionService.ts – Sprint 21 / TASK-21-A01
 *
 * Erzeugt automatisch Langteile (Arbeitsplatte / Sockel / Wange) für
 * zusammenhängende Schrank-Cluster (PlacedObjects an einer Wand).
 *
 * Rebuild-Strategie: Delete-and-recreate (MVP).
 * Spätere Versionen können diff-basiert vorgehen.
 */
import { prisma } from '../db.js'

// ─── Typen (vereinfacht, analog zu shared-schemas) ───────────────

interface PlacedObject {
    id: string
    wall_id: string
    offset_mm: number
    width_mm: number
    depth_mm: number
    height_mm: number
    type: 'base' | 'wall' | 'tall' | 'appliance'
}

interface AutoCompletionOptions {
    worktopOverhangFront_mm?: number   // Standard: 20 mm
    worktopOverhangSide_mm?: number    // Standard: 0 mm
    plinthHeight_mm?: number           // Standard: 150 mm
    plinthDepth_mm?: number            // Standard: 60 mm
    maxWorktopLength_mm?: number       // Standard: 3600 mm (Stoß bei Überschreitung)
    addSidePanels?: boolean            // Wangen an freien Abschlüssen
}

interface Cluster {
    wall_id: string
    placements: PlacedObject[]
    start_offset_mm: number
    end_offset_mm: number
    depth_mm: number
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildClusters(placements: PlacedObject[]): Cluster[] {
    // Gruppiere nach Wand
    const byWall = new Map<string, PlacedObject[]>()
    for (const p of placements) {
        if (p.type === 'base' || p.type === 'tall') {
            const existing = byWall.get(p.wall_id) ?? []
            existing.push(p)
            byWall.set(p.wall_id, existing)
        }
    }

    const clusters: Cluster[] = []

    for (const [wall_id, wallPlacements] of byWall.entries()) {
        // Sortiere nach Offset
        const sorted = [...wallPlacements].sort((a, b) => a.offset_mm - b.offset_mm)

        // Baue Cluster (Lücke > 10 mm → neuer Cluster)
        const GAP_TOLERANCE_MM = 10
        let cluster: PlacedObject[] = [sorted[0]]

        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]
            const curr = sorted[i]
            const gap = curr.offset_mm - (prev.offset_mm + prev.width_mm)
            if (gap <= GAP_TOLERANCE_MM) {
                cluster.push(curr)
            } else {
                clusters.push(toCluster(wall_id, cluster))
                cluster = [curr]
            }
        }
        clusters.push(toCluster(wall_id, cluster))
    }

    return clusters
}

function toCluster(wall_id: string, placements: PlacedObject[]): Cluster {
    const sorted = [...placements].sort((a, b) => a.offset_mm - b.offset_mm)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const maxDepth = Math.max(...placements.map((p) => p.depth_mm))

    return {
        wall_id,
        placements: sorted,
        start_offset_mm: first.offset_mm,
        end_offset_mm: last.offset_mm + last.width_mm,
        depth_mm: maxDepth,
    }
}

function calculateWorktopLength(cluster: Cluster, opts: Required<AutoCompletionOptions>): number {
    const rawLength = cluster.end_offset_mm - cluster.start_offset_mm
    return rawLength + opts.worktopOverhangSide_mm * 2
}

// ─── Main Service ─────────────────────────────────────────────────

export const AutoCompletionService = {

    /**
     * Führt Auto-Vervollständigung für ein Raum-Placement aus.
     * Löscht alle bisherigen generierten Elemente für diesen Raum und
     * erstellt neue auf Basis der aktuellen Placements.
     *
     * @returns Zusammenfassung der erzeugten Elemente
     */
    async rebuild(
        project_id: string,
        room_id: string,
        placements: PlacedObject[],
        opts: AutoCompletionOptions = {},
    ) {
        const options: Required<AutoCompletionOptions> = {
            worktopOverhangFront_mm: opts.worktopOverhangFront_mm ?? 20,
            worktopOverhangSide_mm: opts.worktopOverhangSide_mm ?? 0,
            plinthHeight_mm: opts.plinthHeight_mm ?? 150,
            plinthDepth_mm: opts.plinthDepth_mm ?? 60,
            maxWorktopLength_mm: opts.maxWorktopLength_mm ?? 3600,
            addSidePanels: opts.addSidePanels ?? true,
        }

        // 1. Lösche alte generated_items für diesen Raum
        const oldItems = await prisma.generatedItem.findMany({
            where: { project_id, room_id, is_generated: true },
            select: { id: true },
        })
        if (oldItems.length > 0) {
            await prisma.generatedItemSourceLink.deleteMany({
                where: { generated_item_id: { in: oldItems.map((i) => i.id) } },
            })
            await prisma.generatedItem.deleteMany({
                where: { id: { in: oldItems.map((i) => i.id) } },
            })
        }

        // 2. Berechne Cluster
        const clusters = buildClusters(placements)

        const created: { type: string; label: string; qty: number; unit: string }[] = []
        let buildNumber = 1

        for (const cluster of clusters) {
            const placementIds = cluster.placements.map((p) => p.id)

            // ── Arbeitsplatte ─────────────────────────────────────────
            const worktopLength = calculateWorktopLength(cluster, options)

            if (worktopLength > options.maxWorktopLength_mm) {
                // Stoß: mehrere Segmente
                let remaining = worktopLength
                let segIndex = 1
                while (remaining > 0) {
                    const segLen = Math.min(remaining, options.maxWorktopLength_mm)
                    const wt = await prisma.generatedItem.create({
                        data: {
                            project_id,
                            room_id,
                            item_type: 'worktop',
                            label: `Arbeitsplatte Segment ${segIndex} (Wand ${cluster.wall_id})`,
                            qty: segLen,
                            unit: 'mm',
                            build_number: buildNumber,
                            params_json: {
                                wall_id: cluster.wall_id,
                                depth_mm: cluster.depth_mm + options.worktopOverhangFront_mm,
                                segment_index: segIndex,
                            },
                            source_links: {
                                create: placementIds.map((pid) => ({ source_placement_id: pid })),
                            },
                        },
                    })
                    created.push({ type: 'worktop', label: wt.label, qty: segLen, unit: 'mm' })
                    remaining -= segLen
                    segIndex++
                }
            } else {
                const wt = await prisma.generatedItem.create({
                    data: {
                        project_id,
                        room_id,
                        item_type: 'worktop',
                        label: `Arbeitsplatte (Wand ${cluster.wall_id})`,
                        qty: worktopLength,
                        unit: 'mm',
                        build_number: buildNumber,
                        params_json: {
                            wall_id: cluster.wall_id,
                            depth_mm: cluster.depth_mm + options.worktopOverhangFront_mm,
                        },
                        source_links: {
                            create: placementIds.map((pid) => ({ source_placement_id: pid })),
                        },
                    },
                })
                created.push({ type: 'worktop', label: wt.label, qty: worktopLength, unit: 'mm' })
            }

            // ── Sockel ────────────────────────────────────────────────
            const plinthLength = cluster.end_offset_mm - cluster.start_offset_mm

            const pl = await prisma.generatedItem.create({
                data: {
                    project_id,
                    room_id,
                    item_type: 'plinth',
                    label: `Sockelbrett (Wand ${cluster.wall_id})`,
                    qty: plinthLength,
                    unit: 'mm',
                    build_number: buildNumber,
                    params_json: {
                        wall_id: cluster.wall_id,
                        height_mm: options.plinthHeight_mm,
                        depth_mm: options.plinthDepth_mm,
                    },
                    source_links: {
                        create: placementIds.map((pid) => ({ source_placement_id: pid })),
                    },
                },
            })
            created.push({ type: 'plinth', label: pl.label, qty: plinthLength, unit: 'mm' })

            // ── Seitenwangen ─────────────────────────────────────────
            if (options.addSidePanels) {
                for (const side of ['links', 'rechts'] as const) {
                    const sp = await prisma.generatedItem.create({
                        data: {
                            project_id,
                            room_id,
                            item_type: 'side_panel',
                            label: `Abschlussblende ${side} (Wand ${cluster.wall_id})`,
                            qty: 1,
                            unit: 'Stk',
                            build_number: buildNumber,
                            params_json: {
                                wall_id: cluster.wall_id,
                                side,
                                height_mm: Math.max(...cluster.placements.map((p) => p.height_mm)),
                                depth_mm: cluster.depth_mm,
                            },
                            source_links: {
                                create: [{ source_placement_id: placementIds[side === 'links' ? 0 : placementIds.length - 1] }],
                            },
                        },
                    })
                    created.push({ type: 'side_panel', label: sp.label, qty: 1, unit: 'Stk' })
                }
            }

            buildNumber++
        }

        return {
            project_id,
            room_id,
            deleted: oldItems.length,
            created: created.length,
            items: created,
        }
    },

    /**
     * Gibt alle generierten Elemente für einen Raum zurück.
     */
    async list(project_id: string, room_id: string) {
        return prisma.generatedItem.findMany({
            where: { project_id, room_id },
            include: { source_links: true, catalog_article: { select: { sku: true, name: true } } },
            orderBy: [{ item_type: 'asc' }, { created_at: 'asc' }],
        })
    },
}
