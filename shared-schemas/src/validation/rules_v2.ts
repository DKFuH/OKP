import type { CeilingConstraint, PlacedObject, Point2D, RuleViolation } from '../types.js';

export interface GeneratedProjectItem {
  id: string;
  type: 'worktop' | 'plinth' | 'end_panel' | 'handle' | string;
}

export interface Project {
  id: string;
  objects: PlacedObject[];
  generated_items?: GeneratedProjectItem[];
}

function createViolation(
  code: string,
  severity: RuleViolation['severity'],
  message: string,
  affected_ids: string[]
): RuleViolation {
  return {
    code,
    severity,
    message,
    affected_ids
  };
}

function intervalGap(left: PlacedObject, right: PlacedObject): number {
  return right.offset_mm - (left.offset_mm + left.width_mm);
}

function overlapOnWall(left: PlacedObject, right: PlacedObject): boolean {
  if (left.wall_id !== right.wall_id) {
    return false;
  }

  return left.offset_mm < right.offset_mm + right.width_mm && right.offset_mm < left.offset_mm + left.width_mm;
}

function absolutePointDistance(a?: Point2D, b?: Point2D): number | null {
  if (!a || !b) {
    return null;
  }

  return Math.hypot(a.x_mm - b.x_mm, a.y_mm - b.y_mm);
}

export function checkDoorSlam(obj: PlacedObject, others: PlacedObject[], minGapMm = 50): RuleViolation | null {
  const neighbor = others.find((other) => other.id !== obj.id && other.wall_id === obj.wall_id && intervalGap(obj, other) >= 0);
  if (!neighbor) {
    return null;
  }

  const gap = intervalGap(obj, neighbor);
  if (gap < minGapMm) {
    return createViolation('RULE-DOOR-SLAM', 'warning', `Door clearance is only ${gap} mm.`, [obj.id, neighbor.id]);
  }

  return null;
}

export function checkErgonomicClearance(
  floorObj: PlacedObject,
  wallObj: PlacedObject,
  minClearanceMm = 450
): RuleViolation | null {
  if (floorObj.wall_id !== wallObj.wall_id) {
    return null;
  }

  const wallBottomMm = wallObj.worldPos?.y_mm ?? wallObj.height_mm;
  const floorTopMm = floorObj.height_mm;
  const clearance = wallBottomMm - floorTopMm;

  if (clearance < minClearanceMm) {
    return createViolation(
      'RULE-ERG-CLEARANCE',
      'warning',
      `Vertical clearance is only ${clearance} mm.`,
      [floorObj.id, wallObj.id]
    );
  }

  return null;
}

export function checkCompleteness(project: Project): RuleViolation[] {
  const generatedTypes = new Set((project.generated_items ?? []).map((item) => item.type));
  const hasBaseObject = project.objects.some((object) => object.height_mm <= 1000);
  const violations: RuleViolation[] = [];

  if (hasBaseObject && !generatedTypes.has('worktop')) {
    violations.push(createViolation('RULE-COMP-WORKTOP', 'warning', 'Worktop is missing.', []));
  }

  if (hasBaseObject && !generatedTypes.has('plinth')) {
    violations.push(createViolation('RULE-COMP-PLINTH', 'warning', 'Plinth is missing.', []));
  }

  if (project.objects.length > 0 && !generatedTypes.has('end_panel')) {
    violations.push(createViolation('RULE-COMP-END-PANEL', 'hint', 'End panels should be reviewed.', []));
  }

  return violations;
}

function availableHeightAtObject(obj: PlacedObject, constraint: CeilingConstraint): number {
  const distanceIntoRoomMm = Math.max(0, obj.worldPos?.y_mm ?? obj.depth_mm);
  const slopeDropMm = Math.tan((constraint.slope_angle_deg * Math.PI) / 180) * distanceIntoRoomMm;
  return constraint.kniestock_height_mm + slopeDropMm;
}

export function checkHeightConstraints(
  obj: PlacedObject,
  constraints: CeilingConstraint[]
): RuleViolation | null {
  const relevantConstraint = constraints.find((constraint) => constraint.wall_id === obj.wall_id);
  if (!relevantConstraint) {
    return null;
  }

  const availableHeight = availableHeightAtObject(obj, relevantConstraint);
  if (obj.height_mm > availableHeight) {
    return createViolation(
      'RULE-HEIGHT-CONSTRAINT',
      'error',
      `Object height ${obj.height_mm} mm exceeds available height ${Math.round(availableHeight)} mm.`,
      [obj.id]
    );
  }

  return null;
}

export function checkOverlapSameWall(obj: PlacedObject, others: PlacedObject[]): RuleViolation | null {
  const conflicting = others.find((other) => other.id !== obj.id && overlapOnWall(obj, other));
  return conflicting
    ? createViolation('RULE-OVERLAP-WALL', 'error', 'Objects overlap on the same wall.', [obj.id, conflicting.id])
    : null;
}

export function checkPassageWidth(left: PlacedObject, right: PlacedObject, minPassageMm = 600): RuleViolation | null {
  if (left.wall_id !== right.wall_id) {
    return null;
  }

  const gap = intervalGap(left, right);
  if (gap >= 0 && gap < minPassageMm) {
    return createViolation('RULE-PASSAGE-WIDTH', 'warning', `Passage width is only ${gap} mm.`, [left.id, right.id]);
  }

  return null;
}

export function checkWorkTriangleDistance(a: PlacedObject, b: PlacedObject, maxDistanceMm = 2700): RuleViolation | null {
  const distance = absolutePointDistance(a.worldPos, b.worldPos);
  if (distance !== null && distance > maxDistanceMm) {
    return createViolation(
      'RULE-WORK-TRIANGLE',
      'hint',
      `Functional distance is ${Math.round(distance)} mm.`,
      [a.id, b.id]
    );
  }

  return null;
}

export function checkCounterHeight(obj: PlacedObject, preferredHeightMm = 910, toleranceMm = 40): RuleViolation | null {
  const delta = Math.abs(obj.height_mm - preferredHeightMm);
  if (delta > toleranceMm) {
    return createViolation('RULE-COUNTER-HEIGHT', 'hint', `Counter height deviates by ${delta} mm.`, [obj.id]);
  }

  return null;
}

export function checkApplianceSpacing(left: PlacedObject, right: PlacedObject, minGapMm = 20): RuleViolation | null {
  if (left.wall_id !== right.wall_id) {
    return null;
  }

  const gap = intervalGap(left, right);
  if (gap >= 0 && gap < minGapMm) {
    return createViolation('RULE-APPLIANCE-SPACING', 'warning', `Appliance gap is only ${gap} mm.`, [left.id, right.id]);
  }

  return null;
}

export function checkTallToCeilingClearance(obj: PlacedObject, ceilingHeightMm: number, minGapMm = 20): RuleViolation | null {
  const gap = ceilingHeightMm - obj.height_mm;
  if (gap < minGapMm) {
    return createViolation('RULE-TALL-CEILING', 'warning', `Ceiling clearance is only ${gap} mm.`, [obj.id]);
  }

  return null;
}

export function checkWallAlignment(obj: PlacedObject, allowedDepthsMm: number[]): RuleViolation | null {
  if (!allowedDepthsMm.includes(obj.depth_mm)) {
    return createViolation('RULE-WALL-ALIGNMENT', 'hint', 'Depth is outside the standard alignment grid.', [obj.id]);
  }

  return null;
}

export function checkHandleAccessory(obj: PlacedObject, project: Project): RuleViolation | null {
  const hasHandleAccessory = (project.generated_items ?? []).some((item) => item.type === 'handle');
  const needsHandle = obj.flags?.requires_customization === true;

  if (needsHandle && !hasHandleAccessory) {
    return createViolation('RULE-HANDLE-ACCESSORY', 'hint', 'Handle accessory is missing.', [obj.id]);
  }

  return null;
}

export function checkEndPanelNeed(obj: PlacedObject, neighbors: PlacedObject[]): RuleViolation | null {
  const hasLeftNeighbor = neighbors.some(
    (other) => other.wall_id === obj.wall_id && other.id !== obj.id && other.offset_mm + other.width_mm === obj.offset_mm
  );
  const hasRightNeighbor = neighbors.some(
    (other) => other.wall_id === obj.wall_id && other.id !== obj.id && obj.offset_mm + obj.width_mm === other.offset_mm
  );

  if (!hasLeftNeighbor || !hasRightNeighbor) {
    return createViolation('RULE-END-PANEL', 'hint', 'Free cabinet side should be reviewed for end panel.', [obj.id]);
  }

  return null;
}

export function checkBaseDepthConsistency(objects: PlacedObject[], toleranceMm = 5): RuleViolation | null {
  if (objects.length < 2) {
    return null;
  }

  const minDepth = Math.min(...objects.map((object) => object.depth_mm));
  const maxDepth = Math.max(...objects.map((object) => object.depth_mm));

  if (maxDepth - minDepth > toleranceMm) {
    return createViolation(
      'RULE-BASE-DEPTH',
      'warning',
      `Base depth spread is ${maxDepth - minDepth} mm.`,
      objects.map((object) => object.id)
    );
  }

  return null;
}

export function checkDoorWindowConflict(obj: PlacedObject, openingOffsetMm: number, openingWidthMm: number): RuleViolation | null {
  const objectEnd = obj.offset_mm + obj.width_mm;
  const openingEnd = openingOffsetMm + openingWidthMm;

  if (obj.offset_mm < openingEnd && openingOffsetMm < objectEnd) {
    return createViolation('RULE-DOOR-WINDOW', 'error', 'Object conflicts with opening zone.', [obj.id]);
  }

  return null;
}

export function checkCornerCollision(a: PlacedObject, b: PlacedObject, minCornerDistanceMm = 50): RuleViolation | null {
  const distance = absolutePointDistance(a.worldPos, b.worldPos);
  if (distance !== null && distance < minCornerDistanceMm) {
    return createViolation('RULE-CORNER-COLLISION', 'warning', 'Corner collision risk detected.', [a.id, b.id]);
  }

  return null;
}

export function checkPlinthCoverage(project: Project): RuleViolation | null {
  const hasBaseObject = project.objects.some((object) => object.height_mm <= 1000);
  const hasPlinth = (project.generated_items ?? []).some((item) => item.type === 'plinth');

  if (hasBaseObject && !hasPlinth) {
    return createViolation('RULE-PLINTH-COVERAGE', 'warning', 'Generated plinth coverage is missing.', []);
  }

  return null;
}

export const ruleLibraryV2 = {
  checkDoorSlam,
  checkErgonomicClearance,
  checkCompleteness,
  checkHeightConstraints,
  checkOverlapSameWall,
  checkPassageWidth,
  checkWorkTriangleDistance,
  checkCounterHeight,
  checkApplianceSpacing,
  checkTallToCeilingClearance,
  checkWallAlignment,
  checkHandleAccessory,
  checkEndPanelNeed,
  checkBaseDepthConsistency,
  checkDoorWindowConflict,
  checkCornerCollision,
  checkPlinthCoverage
};
