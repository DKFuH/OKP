export interface DiscountChainInput {
  basePrice: number
  itemDiscountValue?: number
  categoryDiscountValue?: number
  totalDiscountValue?: number
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function applySignedDiscount(amount: number, discountValue = 0): number {
  return roundMoney(amount * (1 - discountValue / 100))
}

export function applyDiscountChain(input: DiscountChainInput) {
  const afterItem = applySignedDiscount(input.basePrice, input.itemDiscountValue ?? 0)
  const afterCategory = applySignedDiscount(afterItem, input.categoryDiscountValue ?? 0)
  const afterTotal = applySignedDiscount(afterCategory, input.totalDiscountValue ?? 0)

  return {
    afterItem,
    afterCategory,
    finalPrice: afterTotal,
  }
}
