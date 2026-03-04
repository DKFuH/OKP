import { describe, expect, it } from 'vitest'
import { solveConstraints } from './constraintEngine.js'

describe('solveConstraints', () => {
  it('applies horizontal and equal_length constraints', () => {
    const result = solveConstraints({
      constraints: [
        {
          id: 'c1',
          type: 'horizontal',
          target_refs: ['w1'],
          value_json: {},
          enabled: true,
        },
        {
          id: 'c2',
          type: 'equal_length',
          target_refs: ['w1', 'w2'],
          value_json: {},
          enabled: true,
        },
      ],
      wallSegments: [
        { id: 'w1', x0: 0, y0: 0, x1: 800, y1: 120 },
        { id: 'w2', x0: 0, y0: 100, x1: 200, y1: 300 },
      ],
      placements: [],
    })

    const w1 = result.wallSegments.find((wall) => wall.id === 'w1')!
    const w2 = result.wallSegments.find((wall) => wall.id === 'w2')!

    expect(w1.y1).toBe(0)
    const w1Length = Math.hypot(w1.x1 - w1.x0, w1.y1 - w1.y0)
    const w2Length = Math.hypot(w2.x1 - w2.x0, w2.y1 - w2.y0)
    expect(w2Length).toBeCloseTo(w1Length, 3)
  })

  it('applies coincident constraints to placement positions', () => {
    const result = solveConstraints({
      constraints: [
        {
          id: 'c3',
          type: 'coincident',
          target_refs: ['p1', 'w1'],
          value_json: { offset_mm: 500 },
          enabled: true,
        },
      ],
      wallSegments: [{ id: 'w1', x0: 0, y0: 0, x1: 1000, y1: 0 }],
      placements: [{ id: 'p1', x: 0, y: 0 }],
    })

    expect(result.placements[0]).toMatchObject({ x: 500, y: 0, wall_id: 'w1' })
  })

  it('returns warnings for invalid references', () => {
    const result = solveConstraints({
      constraints: [
        {
          id: 'c4',
          type: 'vertical',
          target_refs: ['missing-wall'],
          value_json: {},
          enabled: true,
        },
      ],
      wallSegments: [],
      placements: [],
    })

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('missing wall target')
  })
})
