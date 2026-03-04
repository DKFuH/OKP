import { describe, expect, it } from 'vitest'

import {
  calcFinancialLine,
  calcSkontoAmount,
  recalculateFinancials,
  resolveEffectiveTaxRate,
  type DiscountProfileInput,
  type QuoteItemInput,
  type TaxProfileInput,
} from './financialProfileService.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<QuoteItemInput> = {}): QuoteItemInput {
  return {
    id: 'item-1',
    line_net: 1000,
    tax_rate: 0.19,
    ...overrides,
  }
}

function makeTaxProfile(overrides: Partial<TaxProfileInput> = {}): TaxProfileInput {
  return { id: 'tp-1', tax_rate: 0.19, ...overrides }
}

function makeDiscountProfile(overrides: Partial<DiscountProfileInput> = {}): DiscountProfileInput {
  return { id: 'dp-1', skonto_pct: 2, payment_days: 10, ...overrides }
}

// ─── resolveEffectiveTaxRate ─────────────────────────────────────────────────

describe('resolveEffectiveTaxRate', () => {
  it('FP-01: returns item tax_rate when no TaxProfile is given', () => {
    expect(resolveEffectiveTaxRate(0.19, null)).toBe(0.19)
  })

  it('FP-02: overrides item tax_rate with TaxProfile rate', () => {
    expect(resolveEffectiveTaxRate(0.19, makeTaxProfile({ tax_rate: 0.07 }))).toBe(0.07)
  })

  it('FP-03: TaxProfile with 0% results in zero tax rate', () => {
    expect(resolveEffectiveTaxRate(0.19, makeTaxProfile({ tax_rate: 0 }))).toBe(0)
  })
})

// ─── calcFinancialLine ───────────────────────────────────────────────────────

describe('calcFinancialLine', () => {
  it('FP-04: calculates tax_amount and line_gross correctly without profile', () => {
    const result = calcFinancialLine(makeItem({ line_net: 1000, tax_rate: 0.19 }), null)

    expect(result.tax_rate).toBe(0.19)
    expect(result.tax_amount).toBe(190)
    expect(result.line_gross).toBe(1190)
  })

  it('FP-05: applies TaxProfile rate override in line calculation', () => {
    const result = calcFinancialLine(
      makeItem({ line_net: 1000, tax_rate: 0.19 }),
      makeTaxProfile({ tax_rate: 0.07 }),
    )

    expect(result.tax_rate).toBe(0.07)
    expect(result.tax_amount).toBe(70)
    expect(result.line_gross).toBe(1070)
  })

  it('FP-06: zero tax rate produces zero tax_amount and line_gross equals line_net', () => {
    const result = calcFinancialLine(makeItem({ line_net: 500, tax_rate: 0 }), null)

    expect(result.tax_amount).toBe(0)
    expect(result.line_gross).toBe(500)
  })

  it('FP-07: item_id is preserved in the result', () => {
    const result = calcFinancialLine(makeItem({ id: 'qi-abc' }), null)

    expect(result.item_id).toBe('qi-abc')
  })
})

// ─── calcSkontoAmount ────────────────────────────────────────────────────────

describe('calcSkontoAmount', () => {
  it('FP-08: calculates 2% Skonto on total gross correctly', () => {
    expect(calcSkontoAmount(1190, 2)).toBe(23.8)
  })

  it('FP-09: zero skonto_pct returns 0', () => {
    expect(calcSkontoAmount(1190, 0)).toBe(0)
  })

  it('FP-10: negative skonto_pct is treated as no skonto', () => {
    expect(calcSkontoAmount(1190, -5)).toBe(0)
  })

  it('FP-11: rounds Skonto amount to two decimal places', () => {
    // 999.99 * 3% = 29.9997 → rounds to 30
    expect(calcSkontoAmount(999.99, 3)).toBe(30)
  })
})

// ─── recalculateFinancials ───────────────────────────────────────────────────

describe('recalculateFinancials', () => {
  it('FP-12: single item without profiles produces correct Brutto/Netto/MwSt', () => {
    const result = recalculateFinancials(
      'quote-1',
      [makeItem({ line_net: 1000, tax_rate: 0.19 })],
      null,
      null,
    )

    expect(result.subtotal_net).toBe(1000)
    expect(result.vat_amount).toBe(190)
    expect(result.total_gross).toBe(1190)
    expect(result.skonto_pct).toBe(0)
    expect(result.skonto_amount).toBe(0)
    expect(result.total_gross_after_skonto).toBe(1190)
  })

  it('FP-13: discount profile produces correct Skonto deduction', () => {
    const result = recalculateFinancials(
      'quote-2',
      [makeItem({ line_net: 1000, tax_rate: 0.19 })],
      null,
      makeDiscountProfile({ skonto_pct: 2, payment_days: 10 }),
    )

    expect(result.total_gross).toBe(1190)
    expect(result.skonto_pct).toBe(2)
    expect(result.skonto_amount).toBe(23.8)
    expect(result.total_gross_after_skonto).toBe(1166.2)
  })

  it('FP-14: tax profile overrides per-line tax rate for all items', () => {
    const items: QuoteItemInput[] = [
      makeItem({ id: 'i-1', line_net: 500, tax_rate: 0.19 }),
      makeItem({ id: 'i-2', line_net: 300, tax_rate: 0.19 }),
    ]

    const result = recalculateFinancials(
      'quote-3',
      items,
      makeTaxProfile({ tax_rate: 0.07 }),
      null,
    )

    // Each line: tax = line_net * 0.07
    expect(result.line_breakdown[0].tax_rate).toBe(0.07)
    expect(result.line_breakdown[1].tax_rate).toBe(0.07)
    expect(result.vat_amount).toBe(roundTo2(500 * 0.07 + 300 * 0.07))
    expect(result.total_gross).toBe(800 + roundTo2(800 * 0.07))
  })

  it('FP-15: multiple items with different native rates are aggregated correctly', () => {
    const items: QuoteItemInput[] = [
      makeItem({ id: 'i-1', line_net: 100, tax_rate: 0.19 }),
      makeItem({ id: 'i-2', line_net: 200, tax_rate: 0.07 }),
    ]

    const result = recalculateFinancials('quote-4', items, null, null)

    // VAT: 100*0.19 + 200*0.07 = 19 + 14 = 33
    expect(result.subtotal_net).toBe(300)
    expect(result.vat_amount).toBe(33)
    expect(result.total_gross).toBe(333)
  })

  it('FP-16: both tax and discount profiles combine correctly', () => {
    const result = recalculateFinancials(
      'quote-5',
      [makeItem({ line_net: 1000, tax_rate: 0.19 })],
      makeTaxProfile({ tax_rate: 0.07 }),
      makeDiscountProfile({ skonto_pct: 3, payment_days: 14 }),
    )

    // tax: 1000 * 0.07 = 70 → gross = 1070
    // skonto: 1070 * 3% = 32.10
    expect(result.vat_amount).toBe(70)
    expect(result.total_gross).toBe(1070)
    expect(result.skonto_amount).toBe(32.1)
    expect(result.total_gross_after_skonto).toBe(1037.9)
  })

  it('FP-17: quote_id is echoed back in the result', () => {
    const result = recalculateFinancials('my-quote-id', [], null, null)

    expect(result.quote_id).toBe('my-quote-id')
  })

  it('FP-18: empty item list produces all-zero totals', () => {
    const result = recalculateFinancials('quote-empty', [], null, null)

    expect(result.subtotal_net).toBe(0)
    expect(result.vat_amount).toBe(0)
    expect(result.total_gross).toBe(0)
    expect(result.skonto_amount).toBe(0)
  })
})

// helper used in tests above
function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
