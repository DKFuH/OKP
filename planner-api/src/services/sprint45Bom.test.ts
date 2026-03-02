/**
 * sprint45Bom.test.ts – Sprint 45
 *
 * Unit tests for the BOM calculator's Tiefenkürzung (custom depth) surcharge
 * line logic introduced in Sprint 45.
 */
import { describe, expect, it } from 'vitest'
import type { BOMLine, ProjectSnapshot } from '@okp/shared-schemas'
import { calculateBOM } from './bomCalculator.js'

function baseProject(): ProjectSnapshot {
    return {
        id: 'project-45',
        cabinets: [],
        appliances: [],
        accessories: [],
        priceListItems: [
            { catalog_item_id: 'cab-60', list_price_net: 500, dealer_price_net: 300 },
        ],
        taxGroups: [
            { id: 'tax-de', name: 'DE 19%', tax_rate: 0.19 },
        ],
        quoteSettings: {
            freight_flat_rate: 89,
            assembly_rate_per_item: 45,
        },
    }
}

describe('BOM surcharge_flag – Tiefenkürzung (Sprint 45)', () => {
    it('emits surcharge line with surcharge_flag=true when custom_depth_mm is set', () => {
        const project = baseProject()
        project.cabinets = [
            {
                id: 'cab-deep-1',
                catalog_item_id: 'cab-60',
                tax_group_id: 'tax-de',
                flags: {
                    requires_customization: false,
                    height_variant: null,
                    labor_surcharge: false,
                    special_trim_needed: false,
                    custom_depth_mm: 540,
                },
            },
        ]

        const lines = calculateBOM(project)
        const surchargeLine = lines.find(
            (l: BOMLine) => l.surcharge_flag === true,
        )

        expect(surchargeLine).toBeDefined()
        expect(surchargeLine?.type).toBe('surcharge')
        expect(surchargeLine?.surcharge_flag).toBe(true)
    })

    it('sets cost_type to nicht_bauseits by default when not specified', () => {
        const project = baseProject()
        project.cabinets = [
            {
                id: 'cab-deep-2',
                catalog_item_id: 'cab-60',
                tax_group_id: 'tax-de',
                flags: {
                    requires_customization: false,
                    height_variant: null,
                    labor_surcharge: false,
                    special_trim_needed: false,
                    custom_depth_mm: 400,
                },
            },
        ]

        const lines = calculateBOM(project)
        const surchargeLine = lines.find((l: BOMLine) => l.surcharge_flag === true)

        expect(surchargeLine?.cost_type).toBe('nicht_bauseits')
    })

    it('propagates cost_type=bauseits from placement flags to BOM line', () => {
        const project = baseProject()
        project.cabinets = [
            {
                id: 'cab-deep-3',
                catalog_item_id: 'cab-60',
                tax_group_id: 'tax-de',
                flags: {
                    requires_customization: false,
                    height_variant: null,
                    labor_surcharge: false,
                    special_trim_needed: false,
                    custom_depth_mm: 500,
                    cost_type: 'bauseits',
                },
            },
        ]

        const lines = calculateBOM(project)
        const surchargeLine = lines.find((l: BOMLine) => l.surcharge_flag === true)

        expect(surchargeLine?.cost_type).toBe('bauseits')
    })

    it('does not emit surcharge_flag line when custom_depth_mm is absent', () => {
        const project = baseProject()
        project.cabinets = [
            {
                id: 'cab-normal',
                catalog_item_id: 'cab-60',
                tax_group_id: 'tax-de',
                flags: {
                    requires_customization: false,
                    height_variant: null,
                    labor_surcharge: false,
                    special_trim_needed: false,
                },
            },
        ]

        const lines = calculateBOM(project)
        const surchargeLine = lines.find((l: BOMLine) => l.surcharge_flag === true)

        expect(surchargeLine).toBeUndefined()
    })

    it('includes surcharge_flag line description with custom_depth_mm value', () => {
        const project = baseProject()
        project.cabinets = [
            {
                id: 'cab-deep-4',
                catalog_item_id: 'cab-60',
                description: 'Unterschrank 60',
                tax_group_id: 'tax-de',
                flags: {
                    requires_customization: false,
                    height_variant: null,
                    labor_surcharge: false,
                    special_trim_needed: false,
                    custom_depth_mm: 480,
                },
            },
        ]

        const lines = calculateBOM(project)
        const surchargeLine = lines.find((l: BOMLine) => l.surcharge_flag === true)

        expect(surchargeLine?.description).toContain('480')
        expect(surchargeLine?.description).toContain('Unterschrank 60')
    })
})
