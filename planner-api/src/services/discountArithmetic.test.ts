import { describe, expect, it } from 'vitest'
import { applyDiscountChain, applySignedDiscount } from './discountArithmetic.js'

describe('discountArithmetic', () => {
  it('reduces price for a positive discount value', () => {
    expect(applySignedDiscount(1000, 10)).toBe(900)
  })

  it('increases price for a negative discount value', () => {
    expect(applySignedDiscount(1000, -10)).toBe(1100)
  })

  it('keeps price unchanged for zero discount value', () => {
    expect(applySignedDiscount(1000, 0)).toBe(1000)
  })

  it('applies item discount before category and total discount', () => {
    expect(
      applyDiscountChain({
        basePrice: 1000,
        itemDiscountValue: 10,
        categoryDiscountValue: 5,
        totalDiscountValue: 2,
      }),
    ).toEqual({
      afterItem: 900,
      afterCategory: 855,
      finalPrice: 837.9,
    })
  })

  it('treats a negative item discount as surcharge', () => {
    expect(
      applyDiscountChain({
        basePrice: 1000,
        itemDiscountValue: -10,
      }).finalPrice,
    ).toBe(1100)
  })

  it('treats a negative category discount as surcharge after the item discount', () => {
    expect(
      applyDiscountChain({
        basePrice: 1000,
        itemDiscountValue: 10,
        categoryDiscountValue: -10,
      }).finalPrice,
    ).toBe(990)
  })

  it('treats a negative total discount as surcharge after prior discounts', () => {
    expect(
      applyDiscountChain({
        basePrice: 1000,
        itemDiscountValue: 10,
        categoryDiscountValue: 5,
        totalDiscountValue: -10,
      }).finalPrice,
    ).toBe(940.5)
  })

  it('handles mixed discount and surcharge levels predictably', () => {
    expect(
      applyDiscountChain({
        basePrice: 500,
        itemDiscountValue: -20,
        categoryDiscountValue: 10,
        totalDiscountValue: -5,
      }).finalPrice,
    ).toBe(567)
  })
})
