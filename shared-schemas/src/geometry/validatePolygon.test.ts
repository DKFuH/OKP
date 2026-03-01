import { describe, expect, it } from 'vitest';
import type { Vertex } from '../types';
import { validatePolygon } from './validatePolygon';

function createVertex(id: string, x_mm: number, y_mm: number, index: number): Vertex {
  return { id, x_mm, y_mm, index };
}

describe('validatePolygon', () => {
  it('accepts a rectangle', () => {
    const vertices = [
      createVertex('v1', 0, 0, 0),
      createVertex('v2', 3000, 0, 1),
      createVertex('v3', 3000, 2000, 2),
      createVertex('v4', 0, 2000, 3)
    ];

    expect(validatePolygon(vertices)).toEqual({ valid: true, errors: [] });
  });

  it('accepts a closed L-shaped polygon', () => {
    const vertices = [
      createVertex('v1', 0, 0, 0),
      createVertex('v2', 3000, 0, 1),
      createVertex('v3', 3000, 1000, 2),
      createVertex('v4', 1500, 1000, 3),
      createVertex('v5', 1500, 2500, 4),
      createVertex('v6', 0, 2500, 5),
      createVertex('v7', 0, 0, 6)
    ];

    expect(validatePolygon(vertices)).toEqual({ valid: true, errors: [] });
  });

  it('rejects a self-intersecting polygon', () => {
    const vertices = [
      createVertex('v1', 0, 0, 0),
      createVertex('v2', 3000, 3000, 1),
      createVertex('v3', 0, 3000, 2),
      createVertex('v4', 3000, 0, 3)
    ];

    const result = validatePolygon(vertices);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('intersect'))).toBe(true);
  });

  it('rejects polygons with short edges', () => {
    const vertices = [
      createVertex('v1', 0, 0, 0),
      createVertex('v2', 50, 0, 1),
      createVertex('v3', 1000, 1000, 2),
      createVertex('v4', 0, 1000, 3)
    ];

    const result = validatePolygon(vertices, 100);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Edge 0 is shorter than 100 mm.');
  });

  it('rejects polygons with fewer than three points', () => {
    const vertices = [createVertex('v1', 0, 0, 0), createVertex('v2', 1000, 0, 1)];

    expect(validatePolygon(vertices)).toEqual({
      valid: false,
      errors: ['Polygon must contain at least 3 vertices.']
    });
  });
});
