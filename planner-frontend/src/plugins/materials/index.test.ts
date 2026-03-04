import { describe, expect, it } from 'vitest'
import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_FALLBACK_COLORS,
  type MaterialCategory,
} from './index.js'

const MATERIAL_CATEGORIES: MaterialCategory[] = ['floor', 'wall', 'front', 'worktop', 'custom']

describe('materials plugin constants', () => {
  it('category labels cover all categories', () => {
    const labelKeys = Object.keys(MATERIAL_CATEGORY_LABELS).sort()
    expect(labelKeys).toEqual([...MATERIAL_CATEGORIES].sort())
  })

  it('fallback colors are valid hex colors', () => {
    for (const color of Object.values(MATERIAL_FALLBACK_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('has no duplicate category keys between labels and colors', () => {
    const labelKeys = Object.keys(MATERIAL_CATEGORY_LABELS)
    const colorKeys = Object.keys(MATERIAL_FALLBACK_COLORS)
    const combined = [...labelKeys, ...colorKeys]
    expect(new Set(combined).size).toBe(labelKeys.length)
    expect(labelKeys.sort()).toEqual(colorKeys.sort())
  })
})