import { describe, expect, it } from 'vitest'
import { lookupPrice, validatePropertyCombination, type PropertyDefinition } from './ofmlEngine.js'

describe('ofmlEngine.validatePropertyCombination', () => {
  it('returns valid=true for a valid combination without dependencies', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'front_color',
        type: 'enum',
        options: [
          { value: 'white', label: 'Weiß' },
          { value: 'black', label: 'Schwarz' },
        ],
        depends_on: {},
      },
    ]

    const result = validatePropertyCombination(properties, { front_color: 'white' })

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns valid=true when dependency is fulfilled', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: { corpus_color: ['oak'] },
      },
    ]

    const result = validatePropertyCombination(properties, {
      corpus_color: 'oak',
      front_color: 'white',
    })

    expect(result.valid).toBe(true)
  })

  it('returns valid=false when dependency is not fulfilled', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: { corpus_color: ['oak'] },
      },
    ]

    const result = validatePropertyCombination(properties, {
      corpus_color: 'black',
      front_color: 'white',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
  })

  it('returns valid=false for unknown enum value', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: {},
      },
    ]

    const result = validatePropertyCombination(properties, { front_color: 'blue' })

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
  })

  it('returns available options per property', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'front_color',
        type: 'enum',
        options: [
          { value: 'white', label: 'Weiß' },
          { value: 'black', label: 'Schwarz' },
        ],
        depends_on: {},
      },
    ]

    const result = validatePropertyCombination(properties, {})

    expect(result.available.front_color).toEqual(['white', 'black'])
  })

  it('returns valid=true for empty property list', () => {
    const result = validatePropertyCombination([], { front_color: 'white' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('evaluates multiple dependencies correctly', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'handle_type',
        type: 'enum',
        options: [{ value: 'bar', label: 'Bügelgriff' }],
        depends_on: {
          corpus_color: ['oak'],
          front_color: ['white'],
        },
      },
    ]

    const result = validatePropertyCombination(properties, {
      corpus_color: 'oak',
      front_color: 'white',
      handle_type: 'bar',
    })

    expect(result.valid).toBe(true)
  })

  it('returns error message including property key', () => {
    const properties: PropertyDefinition[] = [
      {
        key: 'front_color',
        type: 'enum',
        options: [{ value: 'white', label: 'Weiß' }],
        depends_on: {},
      },
    ]

    const result = validatePropertyCombination(properties, { front_color: 'invalid' })
    expect(result.errors[0]?.property).toBe('front_color')
  })
})

describe('ofmlEngine.lookupPrice', () => {
  it('returns matching price for exact property combination', () => {
    const price = lookupPrice(
      [
        {
          property_combination: { front_color: 'white', width_mm: 600 },
          price_net: 349.9,
        },
      ],
      { front_color: 'white', width_mm: 600 },
    )

    expect(price).toBe(349.9)
  })

  it('returns null when no matching combination exists', () => {
    const price = lookupPrice(
      [
        {
          property_combination: { front_color: 'white', width_mm: 600 },
          price_net: 349.9,
        },
      ],
      { front_color: 'black', width_mm: 600 },
    )

    expect(price).toBeNull()
  })
})
