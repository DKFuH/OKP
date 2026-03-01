import { describe, expect, it } from 'vitest';
import type { Opening, PlacedObject, Point2D, WallSegment2D } from '../types';
import {
  checkMinClearance,
  checkObjectInRoom,
  checkObjectOverlap,
  checkObjectVsOpening,
  detectCostHints
} from './collisionDetector';

function obj(id: string, offset_mm: number, width_mm: number, wall_id = 'w1'): PlacedObject {
  return {
    id,
    wall_id,
    offset_mm,
    width_mm,
    depth_mm: 600,
    height_mm: 900,
    worldPos: { x_mm: 1000, y_mm: 1000 }
  };
}

describe('collisionDetector', () => {
  it('detects overlap on same wall', () => {
    const violation = checkObjectOverlap(obj('a', 0, 800), obj('b', 700, 800));
    expect(violation?.code).toBe('OBJECT_OVERLAP');
  });

  it('detects object outside room', () => {
    const room: Point2D[] = [
      { x_mm: 0, y_mm: 0 },
      { x_mm: 3000, y_mm: 0 },
      { x_mm: 3000, y_mm: 3000 },
      { x_mm: 0, y_mm: 3000 }
    ];
    const outside = { ...obj('a', 0, 800), worldPos: { x_mm: 5000, y_mm: 5000 } };
    const violation = checkObjectInRoom(outside, room);
    expect(violation?.code).toBe('OBJECT_OUTSIDE_ROOM');
  });

  it('detects object vs opening conflict', () => {
    const openings: Opening[] = [{ id: 'o1', wall_id: 'w1', offset_mm: 1000, width_mm: 900 }];
    const violation = checkObjectVsOpening(obj('a', 1200, 500), openings);
    expect(violation?.code).toBe('OBJECT_BLOCKS_OPENING');
  });

  it('detects minimum clearance violations', () => {
    const violation = checkMinClearance(obj('a', 0, 800), [obj('b', 850, 600)], 100);
    expect(violation?.code).toBe('MIN_CLEARANCE_VIOLATED');
  });

  it('creates cost hints for special trim and angled walls', () => {
    const wall: WallSegment2D = {
      id: 'w1',
      start: { x_mm: 0, y_mm: 0 },
      end: { x_mm: 3000, y_mm: 1000 },
      length_mm: Math.hypot(3000, 1000)
    };

    const hints = detectCostHints(obj('a', 500, 600), wall, []);
    expect(hints.map((hint) => hint.code)).toContain('SPECIAL_TRIM_NEEDED');
    expect(hints.map((hint) => hint.code)).toContain('LABOR_SURCHARGE');
  });
});
