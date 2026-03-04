import { describe, expect, it } from 'vitest'
import { resolveMaterialAssignment, type MaterialLibraryRecord } from './materialResolver.js'

function materialFixture(overrides?: Partial<MaterialLibraryRecord>): MaterialLibraryRecord {
  return {
    id: 'mat-1',
    name: 'Eiche Natur',
    category: 'front',
    texture_url: 'https://cdn.example/materials/oak.jpg',
    preview_url: 'https://cdn.example/materials/oak-preview.jpg',
    scale_x_mm: 800,
    scale_y_mm: 800,
    rotation_deg: 15,
    roughness: 0.44,
    metallic: 0.03,
    ...overrides,
  }
}

describe('resolveMaterialAssignment', () => {
  it('uses material library data when available', () => {
    const resolved = resolveMaterialAssignment({
      materialItem: materialFixture(),
      assignment: { material_item_id: 'mat-1' },
      fallbackCategory: 'wall',
    })

    expect(resolved.source).toBe('library')
    expect(resolved.material_item_id).toBe('mat-1')
    expect(resolved.category).toBe('front')
    expect(resolved.texture_url).toContain('oak.jpg')
    expect(resolved.uv_scale.x).toBe(0.8)
    expect(resolved.uv_scale.y).toBe(0.8)
    expect(resolved.rotation_deg).toBe(15)
  })

  it('falls back to category defaults when no material item is present', () => {
    const resolved = resolveMaterialAssignment({
      assignment: { material_item_id: null },
      fallbackCategory: 'floor',
    })

    expect(resolved.source).toBe('fallback')
    expect(resolved.material_item_id).toBeNull()
    expect(resolved.color_hex).toBe('#334155')
    expect(resolved.texture_url).toBeNull()
    expect(resolved.uv_scale).toEqual({ x: 1, y: 1 })
  })

  it('honors assignment-level overrides for texture, color and uv scale', () => {
    const resolved = resolveMaterialAssignment({
      materialItem: materialFixture(),
      assignment: {
        texture_url: 'https://cdn.example/custom/front.jpg',
        color_hex: '#112233',
        uv_scale: { x: 2, y: 1.5 },
        rotation_deg: 33,
      },
      fallbackCategory: 'front',
    })

    expect(resolved.texture_url).toBe('https://cdn.example/custom/front.jpg')
    expect(resolved.color_hex).toBe('#112233')
    expect(resolved.uv_scale).toEqual({ x: 2, y: 1.5 })
    expect(resolved.rotation_deg).toBe(33)
  })

  it('clamps invalid ranges and ignores malformed color values', () => {
    const resolved = resolveMaterialAssignment({
      materialItem: materialFixture({ roughness: 5, metallic: -2, rotation_deg: 980, category: 'worktop' }),
      assignment: {
        color_hex: 'bad-color',
        uv_scale: { x: -7, y: 0 },
      },
      fallbackCategory: 'custom',
    })

    expect(resolved.roughness).toBe(1)
    expect(resolved.metallic).toBe(0)
    expect(resolved.rotation_deg).toBe(360)
    expect(resolved.color_hex).toBe('#64748b')
    expect(resolved.uv_scale).toEqual({ x: 0.8, y: 0.8 })
  })
})
