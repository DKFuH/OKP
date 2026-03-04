import { describe, expect, it } from 'vitest'
import { calculateSunPreview } from './sunPositionService.js'

describe('calculateSunPreview', () => {
  it('returns high elevation near equinox noon at equator', () => {
    const result = calculateSunPreview({
      datetime: new Date('2026-03-20T12:00:00.000Z'),
      latitude: 0,
      longitude: 0,
      northAngleDeg: 0,
      daylightEnabled: true,
    })

    expect(result.elevation_deg).toBeGreaterThan(80)
    expect(result.intensity).toBeGreaterThan(0.9)
  })

  it('returns no daylight intensity at midnight', () => {
    const result = calculateSunPreview({
      datetime: new Date('2026-03-20T00:00:00.000Z'),
      latitude: 0,
      longitude: 0,
      northAngleDeg: 0,
      daylightEnabled: true,
    })

    expect(result.elevation_deg).toBeLessThan(0)
    expect(result.intensity).toBe(0)
  })

  it('rotates sun azimuth with project north angle', () => {
    const base = calculateSunPreview({
      datetime: new Date('2026-06-21T09:30:00.000Z'),
      latitude: 48.137,
      longitude: 11.576,
      northAngleDeg: 0,
      daylightEnabled: true,
    })

    const rotated = calculateSunPreview({
      datetime: new Date('2026-06-21T09:30:00.000Z'),
      latitude: 48.137,
      longitude: 11.576,
      northAngleDeg: 90,
      daylightEnabled: true,
    })

    const delta = (((rotated.azimuth_deg - base.azimuth_deg) % 360) + 360) % 360
    expect(delta).toBeGreaterThan(89)
    expect(delta).toBeLessThan(91)
  })

  it('keeps direction vector in normalized bounds', () => {
    const result = calculateSunPreview({
      datetime: new Date('2026-12-21T15:00:00.000Z'),
      latitude: 53.551,
      longitude: 9.993,
      northAngleDeg: 370,
      daylightEnabled: true,
    })

    expect(result.sun_direction.x).toBeGreaterThanOrEqual(-1)
    expect(result.sun_direction.x).toBeLessThanOrEqual(1)
    expect(result.sun_direction.y).toBeGreaterThanOrEqual(-1)
    expect(result.sun_direction.y).toBeLessThanOrEqual(1)
    expect(result.sun_direction.z).toBeGreaterThanOrEqual(-1)
    expect(result.sun_direction.z).toBeLessThanOrEqual(1)
  })
})
