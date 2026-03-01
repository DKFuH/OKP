import { describe, expect, it } from 'vitest';
import type { Point2D, WallSegment2D } from '../types';
import {
  canPlaceOnWall,
  getPlacementWorldPos,
  getWallDirection,
  getWallInnerNormal,
  snapToWall
} from './wallPlacement';

describe('wallPlacement', () => {
  const wall: WallSegment2D = {
    id: 'w1',
    start: { x_mm: 0, y_mm: 0 },
    end: { x_mm: 3000, y_mm: 0 },
    length_mm: 3000
  };

  const polygon: Point2D[] = [
    { x_mm: 0, y_mm: 0 },
    { x_mm: 3000, y_mm: 0 },
    { x_mm: 3000, y_mm: 2000 },
    { x_mm: 0, y_mm: 2000 }
  ];

  it('computes normalized wall direction', () => {
    const direction = getWallDirection(wall);
    expect(direction.x).toBeCloseTo(1, 6);
    expect(direction.y).toBeCloseTo(0, 6);
  });

  it('computes inner normal that points inside polygon', () => {
    const normal = getWallInnerNormal(wall, polygon);
    expect(normal.x).toBeCloseTo(0, 6);
    expect(normal.y).toBeCloseTo(1, 6);
  });

  it('gets placement world position from offset', () => {
    const pos = getPlacementWorldPos(wall, 1200);
    expect(pos).toEqual({ x_mm: 1200, y_mm: 0 });
  });

  it('projects drag point to wall offset', () => {
    const offset = snapToWall({ x_mm: 1600, y_mm: 400 }, wall);
    expect(offset).toBeCloseTo(1600, 6);
  });

  it('checks placement overlap on same wall', () => {
    const canPlace = canPlaceOnWall(
      wall,
      700,
      600,
      [
        { id: 'i1', wall_id: 'w1', offset_mm: 0, width_mm: 800 },
        { id: 'i2', wall_id: 'w1', offset_mm: 1600, width_mm: 600 }
      ]
    );

    expect(canPlace).toBe(false);
  });
});
