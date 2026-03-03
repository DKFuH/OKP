export interface AnnotativeStyleInput {
  sheet_scale: string
  preset: {
    text_height_mm: number
    arrow_size_mm: number
    line_width_mm: number
    centerline_dash_mm: number
    symbol_scale_mm: number
  }
}

export interface ResolvedAnnotativeStyle {
  text_px: number
  arrow_px: number
  stroke_px: number
  centerline_dash_px: number[]
  symbol_px: number
}

const ALLOWED_SCALES = new Set(['1:10', '1:20', '1:25', '1:50'])
const FALLBACK_SCALE = '1:20'
const BASE_PX_PER_MM = 4

function normalizeScale(input: string): string {
  const value = typeof input === 'string' ? input.trim() : ''
  return ALLOWED_SCALES.has(value) ? value : FALLBACK_SCALE
}

function parseScaleDenominator(scale: string): number {
  const normalized = normalizeScale(scale)
  const [, denominator] = normalized.split(':')
  const asNumber = Number(denominator)
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 20
}

function toPx(paperMm: number, denominator: number): number {
  const safeMm = Number.isFinite(paperMm) && paperMm > 0 ? paperMm : 0
  const modelMm = safeMm * denominator
  return Number((modelMm * BASE_PX_PER_MM / 20).toFixed(2))
}

export function resolveAnnotativeStyle(input: AnnotativeStyleInput): ResolvedAnnotativeStyle {
  const denominator = parseScaleDenominator(input.sheet_scale)

  const textPx = toPx(input.preset.text_height_mm, denominator)
  const arrowPx = toPx(input.preset.arrow_size_mm, denominator)
  const strokePx = toPx(input.preset.line_width_mm, denominator)
  const dashPx = toPx(input.preset.centerline_dash_mm, denominator)
  const symbolPx = toPx(input.preset.symbol_scale_mm, denominator)

  return {
    text_px: textPx,
    arrow_px: arrowPx,
    stroke_px: strokePx,
    centerline_dash_px: [dashPx, Number((dashPx / 2).toFixed(2))],
    symbol_px: symbolPx,
  }
}
