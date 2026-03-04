/**
 * Sprint 96 – MwSt-, Skonto- & Zusatzartikel-Profile
 *
 * Core calculation logic for tax profiles and discount (Skonto) profiles.
 * These functions are pure and side-effect-free to allow easy testing.
 */

export interface TaxProfileInput {
  id: string
  tax_rate: number
}

export interface DiscountProfileInput {
  id: string
  skonto_pct: number
  payment_days: number
}

export interface QuoteItemInput {
  id: string
  line_net: number
  tax_rate: number
}

export interface FinancialLineResult {
  item_id: string
  line_net: number
  tax_rate: number
  tax_amount: number
  line_gross: number
}

export interface RecalculatedFinancials {
  quote_id: string
  calculated_at: string
  line_breakdown: FinancialLineResult[]
  subtotal_net: number
  vat_amount: number
  total_gross: number
  skonto_pct: number
  skonto_amount: number
  total_gross_after_skonto: number
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Resolve the effective tax rate for a single line.
 * If a TaxProfile is provided, its rate overrides the item's own rate.
 */
export function resolveEffectiveTaxRate(
  itemTaxRate: number,
  taxProfile: TaxProfileInput | null,
): number {
  if (taxProfile !== null) {
    return taxProfile.tax_rate
  }
  return itemTaxRate
}

/**
 * Calculate the financial breakdown for a single quote item.
 */
export function calcFinancialLine(
  item: QuoteItemInput,
  taxProfile: TaxProfileInput | null,
): FinancialLineResult {
  const effectiveTaxRate = resolveEffectiveTaxRate(item.tax_rate, taxProfile)
  const taxAmount = roundCurrency(item.line_net * effectiveTaxRate)
  const lineGross = roundCurrency(item.line_net + taxAmount)

  return {
    item_id: item.id,
    line_net: item.line_net,
    tax_rate: effectiveTaxRate,
    tax_amount: taxAmount,
    line_gross: lineGross,
  }
}

/**
 * Calculate the Skonto (cash discount) amount.
 * Skonto is applied on the total gross amount.
 */
export function calcSkontoAmount(totalGross: number, skontoPct: number): number {
  if (skontoPct <= 0) {
    return 0
  }
  return roundCurrency(totalGross * skontoPct / 100)
}

/**
 * Full financial recalculation for a quote.
 * Applies an optional TaxProfile (overrides per-line tax rates) and
 * an optional DiscountProfile (computes Skonto on the gross total).
 *
 * Calculation order:
 *   1. Per-line net + tax (with optional TaxProfile override)
 *   2. subtotal_net  = sum of line_net values
 *   3. vat_amount    = sum of tax_amount values
 *   4. total_gross   = subtotal_net + vat_amount
 *   5. skonto_amount = total_gross × skonto_pct / 100
 *   6. total_gross_after_skonto = total_gross − skonto_amount
 */
export function recalculateFinancials(
  quoteId: string,
  items: QuoteItemInput[],
  taxProfile: TaxProfileInput | null,
  discountProfile: DiscountProfileInput | null,
): RecalculatedFinancials {
  const lineBreakdown = items.map((item) => calcFinancialLine(item, taxProfile))

  const subtotalNet = roundCurrency(
    lineBreakdown.reduce((sum, line) => sum + line.line_net, 0),
  )
  const vatAmount = roundCurrency(
    lineBreakdown.reduce((sum, line) => sum + line.tax_amount, 0),
  )
  const totalGross = roundCurrency(subtotalNet + vatAmount)

  const skontoPct = discountProfile?.skonto_pct ?? 0
  const skontoAmount = calcSkontoAmount(totalGross, skontoPct)
  const totalGrossAfterSkonto = roundCurrency(totalGross - skontoAmount)

  return {
    quote_id: quoteId,
    calculated_at: new Date().toISOString(),
    line_breakdown: lineBreakdown,
    subtotal_net: subtotalNet,
    vat_amount: vatAmount,
    total_gross: totalGross,
    skonto_pct: skontoPct,
    skonto_amount: skontoAmount,
    total_gross_after_skonto: totalGrossAfterSkonto,
  }
}
