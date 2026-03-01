import { describe, expect, it } from 'vitest';
import type { CeilingConstraint } from '../types';
import { getAvailableHeight, getHeightAtPoint } from './ceilingHeight';

const baseConstraint: CeilingConstraint = {
  wall_id: 'wall-1',
  wall_start: { x_mm: 0, y_mm: 0 },
  wall_end: { x_mm: 4000, y_mm: 0 },
  kniestock_height_mm: 900,
  slope_angle_deg: 35,
  depth_into_room_mm: 2000
};

describe('ceilingHeight', () => {
  it('returns the knee wall height directly at the wall', () => {
    expect(getHeightAtPoint(baseConstraint, { x_mm: 1000, y_mm: 0 }, 2500)).toBeCloseTo(900, 5);
  });

  it('returns the nominal ceiling height beyond the constraint depth', () => {
    expect(getHeightAtPoint(baseConstraint, { x_mm: 1000, y_mm: 2500 }, 2500)).toBe(2500);
  });

  it('interpolates height inside the slope depth', () => {
    const height = getHeightAtPoint(baseConstraint, { x_mm: 1000, y_mm: 1000 }, 2500);

    expect(height).toBeCloseTo(900 + Math.tan((35 * Math.PI) / 180) * 1000, 5);
  });

  it('uses the minimum height across multiple constraints', () => {
    const secondConstraint: CeilingConstraint = {
      ...baseConstraint,
      wall_id: 'wall-2',
      wall_start: { x_mm: 0, y_mm: 3000 },
      wall_end: { x_mm: 4000, y_mm: 3000 },
      kniestock_height_mm: 700
    };

    const height = getAvailableHeight([baseConstraint, secondConstraint], { x_mm: 1000, y_mm: 500 }, 2500);

    expect(height).toBeCloseTo(900 + Math.tan((35 * Math.PI) / 180) * 500, 5);
  });
});
