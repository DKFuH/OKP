import { describe, expect, it } from 'vitest';
import type { Vertex } from '../types';
import { isCompatibleForWizard, simplifyPolygonToWebplanner } from './webplannerUtils';

function vertex(id: string, x_mm: number, y_mm: number, index: number): Vertex {
  return { id, x_mm, y_mm, index };
}

describe('webplannerUtils', () => {
  it('simplifies rectangles for the wizard', () => {
    const room = simplifyPolygonToWebplanner([
      vertex('v1', 0, 0, 0),
      vertex('v2', 4000, 0, 1),
      vertex('v3', 4000, 3000, 2),
      vertex('v4', 0, 3000, 3)
    ]);

    expect(room).toEqual({
      shape: 'rectangle',
      width_mm: 4000,
      depth_mm: 3000,
      area_mm2: 12_000_000
    });
  });

  it('reduces orthogonal six-point rooms to L-shapes', () => {
    const room = simplifyPolygonToWebplanner([
      vertex('v1', 0, 0, 0),
      vertex('v2', 4000, 0, 1),
      vertex('v3', 4000, 1000, 2),
      vertex('v4', 2500, 1000, 3),
      vertex('v5', 2500, 3000, 4),
      vertex('v6', 0, 3000, 5)
    ]);

    expect(room.shape).toBe('l-shape');
    expect(room.width_mm).toBe(4000);
    expect(room.depth_mm).toBe(3000);
    expect(room.cutout).toEqual({
      x_mm: 2500,
      y_mm: 1000,
      width_mm: 1500,
      depth_mm: 2000
    });
  });

  it('marks complex polygons as incompatible', () => {
    const complexRoom = [
      vertex('v1', 0, 0, 0),
      vertex('v2', 3000, 500, 1),
      vertex('v3', 4000, 2000, 2),
      vertex('v4', 1500, 3500, 3),
      vertex('v5', 0, 2000, 4)
    ];

    expect(isCompatibleForWizard(complexRoom)).toBe(false);
    expect(simplifyPolygonToWebplanner(complexRoom).shape).toBe('unsupported');
  });
});
