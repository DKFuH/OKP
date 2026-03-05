import { describe, expect, it } from 'vitest'
import { resolveAutoDollhouseOpacities, type AutoDollhouseConfig, type AutoDollhouseWall } from './autoDollhouse.js'

const defaultSettings: AutoDollhouseConfig = {
  enabled: true,
  alpha_front_walls: 0.3,
  distance_threshold: 2200,
  angle_threshold_deg: 35,
}

function wall(id: string, x0: number, y0: number, x1: number, y1: number, manualVisible = true): AutoDollhouseWall {
  return {
    id,
    start: { x_mm: x0, y_mm: y0 },
    end: { x_mm: x1, y_mm: y1 },
    manualVisible,
  }
}

describe('resolveAutoDollhouseOpacities', () => {
  it('keeps all walls opaque when auto mode is disabled', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [wall('front', 1000, -100, 1000, 100)],
      settings: { ...defaultSettings, enabled: false },
    })

    expect(result).toEqual({ front: 1 })
  })

  it('fades nearest front wall when looking towards it', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [
        wall('front', 1000, -120, 1000, 120),
        wall('back', -1000, -120, -1000, 120),
      ],
      settings: defaultSettings,
    })

    expect(result.front).toBeCloseTo(0.3)
    expect(result.back).toBe(1)
  })

  it('ignores walls outside distance threshold', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [wall('far', 4000, -120, 4000, 120)],
      settings: defaultSettings,
    })

    expect(result.far).toBe(1)
  })

  it('ignores walls outside angle threshold', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [wall('side', 0, 1000, 200, 1000)],
      settings: defaultSettings,
    })

    expect(result.side).toBe(1)
  })

  it('does not apply auto fade to manually hidden walls', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [wall('hidden-front', 900, -100, 900, 100, false)],
      settings: defaultSettings,
    })

    expect(result['hidden-front']).toBe(1)
  })

  it('fades second wall when it is almost equally near and aligned', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [
        wall('front-a', 1000, -120, 1000, 120),
        wall('front-b', 1160, -120, 1160, 120),
        wall('front-c', 1800, -120, 1800, 120),
      ],
      settings: defaultSettings,
    })

    expect(result['front-a']).toBeCloseTo(0.3)
    expect(result['front-b']).toBeCloseTo(0.3)
    expect(result['front-c']).toBe(1)
  })

  it('handles empty wall lists', () => {
    const result = resolveAutoDollhouseOpacities({
      camera: { x_mm: 0, y_mm: 0, yaw_rad: 0 },
      walls: [],
      settings: defaultSettings,
    })

    expect(result).toEqual({})
  })
})
