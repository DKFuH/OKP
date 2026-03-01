import { describe, expect, it } from 'vitest';
import type { CeilingConstraint, PlacedObject } from '../types';
import {
  checkApplianceSpacing,
  checkBaseDepthConsistency,
  checkCompleteness,
  checkCornerCollision,
  checkCounterHeight,
  checkDoorSlam,
  checkDoorWindowConflict,
  checkEndPanelNeed,
  checkErgonomicClearance,
  checkHandleAccessory,
  checkHeightConstraints,
  checkOverlapSameWall,
  checkPassageWidth,
  checkPlinthCoverage,
  checkTallToCeilingClearance,
  checkWallAlignment,
  checkWorkTriangleDistance
} from './rules_v2';

function placedObject(overrides: Partial<PlacedObject>): PlacedObject {
  return {
    id: 'obj',
    wall_id: 'wall-a',
    offset_mm: 0,
    width_mm: 600,
    depth_mm: 560,
    height_mm: 720,
    ...overrides
  };
}

describe('rules_v2', () => {
  it('checks door slam clearance', () => {
    const result = checkDoorSlam(placedObject({ id: 'a', offset_mm: 0 }), [placedObject({ id: 'b', offset_mm: 620 })], 50);
    expect(result?.code).toBe('RULE-DOOR-SLAM');
  });

  it('checks ergonomic clearance', () => {
    const result = checkErgonomicClearance(
      placedObject({ id: 'base', height_mm: 910 }),
      placedObject({ id: 'wall', height_mm: 700, worldPos: { x_mm: 0, y_mm: 1200 } }),
      450
    );
    expect(result?.code).toBe('RULE-ERG-CLEARANCE');
  });

  it('checks completeness for worktop, plinth and end panels', () => {
    const violations = checkCompleteness({
      id: 'project-1',
      objects: [placedObject({ id: 'base', height_mm: 900 })],
      generated_items: []
    });

    expect(violations).toHaveLength(3);
  });

  it('checks height constraints', () => {
    const constraints: CeilingConstraint[] = [
      {
        wall_id: 'wall-a',
        wall_start: { x_mm: 0, y_mm: 0 },
        wall_end: { x_mm: 3000, y_mm: 0 },
        kniestock_height_mm: 1200,
        slope_angle_deg: 20,
        depth_into_room_mm: 1000
      }
    ];

    const result = checkHeightConstraints(placedObject({ id: 'tall', height_mm: 1800, worldPos: { x_mm: 0, y_mm: 400 } }), constraints);
    expect(result?.code).toBe('RULE-HEIGHT-CONSTRAINT');
  });

  it('checks overlap on the same wall', () => {
    const result = checkOverlapSameWall(placedObject({ id: 'a', offset_mm: 0 }), [placedObject({ id: 'b', offset_mm: 500 })]);
    expect(result?.code).toBe('RULE-OVERLAP-WALL');
  });

  it('checks passage width', () => {
    const result = checkPassageWidth(placedObject({ id: 'a', offset_mm: 0 }), placedObject({ id: 'b', offset_mm: 650 }), 100);
    expect(result?.code).toBe('RULE-PASSAGE-WIDTH');
  });

  it('checks work triangle distance', () => {
    const result = checkWorkTriangleDistance(
      placedObject({ id: 'sink', worldPos: { x_mm: 0, y_mm: 0 } }),
      placedObject({ id: 'hob', worldPos: { x_mm: 4000, y_mm: 0 } }),
      2700
    );
    expect(result?.code).toBe('RULE-WORK-TRIANGLE');
  });

  it('checks counter height deviation', () => {
    const result = checkCounterHeight(placedObject({ id: 'base', height_mm: 1000 }), 910, 40);
    expect(result?.code).toBe('RULE-COUNTER-HEIGHT');
  });

  it('checks appliance spacing', () => {
    const result = checkApplianceSpacing(placedObject({ id: 'oven', offset_mm: 0 }), placedObject({ id: 'fridge', offset_mm: 610 }), 20);
    expect(result?.code).toBe('RULE-APPLIANCE-SPACING');
  });

  it('checks tall unit ceiling clearance', () => {
    const result = checkTallToCeilingClearance(placedObject({ id: 'tall', height_mm: 2385 }), 2400, 20);
    expect(result?.code).toBe('RULE-TALL-CEILING');
  });

  it('checks wall alignment depth', () => {
    const result = checkWallAlignment(placedObject({ id: 'wall', depth_mm: 390 }), [320, 350]);
    expect(result?.code).toBe('RULE-WALL-ALIGNMENT');
  });

  it('checks handle accessories', () => {
    const result = checkHandleAccessory(
      placedObject({ id: 'door', flags: { requires_customization: true, height_variant: null, labor_surcharge: false, special_trim_needed: false } }),
      { id: 'project-1', objects: [], generated_items: [] }
    );
    expect(result?.code).toBe('RULE-HANDLE-ACCESSORY');
  });

  it('checks end panel need', () => {
    const result = checkEndPanelNeed(placedObject({ id: 'end', offset_mm: 0 }), [placedObject({ id: 'mid', offset_mm: 600 })]);
    expect(result?.code).toBe('RULE-END-PANEL');
  });

  it('checks base depth consistency', () => {
    const result = checkBaseDepthConsistency([placedObject({ id: 'a', depth_mm: 560 }), placedObject({ id: 'b', depth_mm: 620 })], 5);
    expect(result?.code).toBe('RULE-BASE-DEPTH');
  });

  it('checks door/window conflicts', () => {
    const result = checkDoorWindowConflict(placedObject({ id: 'cab', offset_mm: 100, width_mm: 600 }), 500, 900);
    expect(result?.code).toBe('RULE-DOOR-WINDOW');
  });

  it('checks corner collisions', () => {
    const result = checkCornerCollision(
      placedObject({ id: 'a', worldPos: { x_mm: 0, y_mm: 0 } }),
      placedObject({ id: 'b', worldPos: { x_mm: 20, y_mm: 20 } }),
      50
    );
    expect(result?.code).toBe('RULE-CORNER-COLLISION');
  });

  it('checks plinth coverage', () => {
    const result = checkPlinthCoverage({ id: 'project-1', objects: [placedObject({ id: 'base', height_mm: 900 })], generated_items: [] });
    expect(result?.code).toBe('RULE-PLINTH-COVERAGE');
  });
});
