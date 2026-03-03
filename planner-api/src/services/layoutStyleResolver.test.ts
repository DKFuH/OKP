import { describe, expect, it } from 'vitest'
import { resolveAnnotativeStyle } from './layoutStyleResolver.js'

describe('resolveAnnotativeStyle', () => {
  it('converts paper style values for 1:20 in stable way', () => {
    const resolved = resolveAnnotativeStyle({
      sheet_scale: '1:20',
      preset: {
        text_height_mm: 3.5,
        arrow_size_mm: 2.5,
        line_width_mm: 0.25,
        centerline_dash_mm: 6,
        symbol_scale_mm: 10,
      },
    })

    expect(resolved).toMatchObject({
      text_px: 14,
      arrow_px: 10,
      stroke_px: 1,
      centerline_dash_px: [24, 12],
      symbol_px: 40,
    })
  })

  it('falls back to 1:20 for unknown scales', () => {
    const unknown = resolveAnnotativeStyle({
      sheet_scale: '1:33',
      preset: {
        text_height_mm: 3.5,
        arrow_size_mm: 2.5,
        line_width_mm: 0.25,
        centerline_dash_mm: 6,
        symbol_scale_mm: 10,
      },
    })

    const expected = resolveAnnotativeStyle({
      sheet_scale: '1:20',
      preset: {
        text_height_mm: 3.5,
        arrow_size_mm: 2.5,
        line_width_mm: 0.25,
        centerline_dash_mm: 6,
        symbol_scale_mm: 10,
      },
    })

    expect(unknown).toEqual(expected)
  })
})
