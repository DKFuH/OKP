import type { Point2D } from '@shared/types';

export interface SnapSegment {
  start: Point2D;
  end: Point2D;
}

function normalizeAngle(angleDeg: number): number {
  const normalized = angleDeg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function shortestAngleDistance(aDeg: number, bDeg: number): number {
  const diff = Math.abs(normalizeAngle(aDeg) - normalizeAngle(bDeg));
  return Math.min(diff, 360 - diff);
}

export function snapToAngle(point: Point2D, origin: Point2D, allowedAngles: number[]): Point2D {
  const dx = point.x_mm - origin.x_mm;
  const dy = point.y_mm - origin.y_mm;
  const radius = Math.hypot(dx, dy);

  if (radius === 0 || allowedAngles.length === 0) {
    return { ...point };
  }

  const currentAngle = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  const snappedAngle = allowedAngles.reduce((closestAngle, candidateAngle) => {
    const closestDistance = shortestAngleDistance(currentAngle, closestAngle);
    const candidateDistance = shortestAngleDistance(currentAngle, candidateAngle);
    return candidateDistance < closestDistance ? candidateAngle : closestAngle;
  }, normalizeAngle(allowedAngles[0]));
  const angleRad = (normalizeAngle(snappedAngle) * Math.PI) / 180;

  return {
    x_mm: origin.x_mm + Math.cos(angleRad) * radius,
    y_mm: origin.y_mm + Math.sin(angleRad) * radius
  };
}

export function snapToGrid(point: Point2D, gridSizeMm: number): Point2D {
  if (gridSizeMm <= 0) {
    return { ...point };
  }

  return {
    x_mm: Math.round(point.x_mm / gridSizeMm) * gridSizeMm,
    y_mm: Math.round(point.y_mm / gridSizeMm) * gridSizeMm
  };
}

export function constrainOrthogonally(point: Point2D, origin: Point2D): Point2D {
  const dx = point.x_mm - origin.x_mm;
  const dy = point.y_mm - origin.y_mm;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x_mm: point.x_mm, y_mm: origin.y_mm };
  }

  return { x_mm: origin.x_mm, y_mm: point.y_mm };
}

export function constrainToNearestSegmentAxis(
  point: Point2D,
  origin: Point2D,
  segments: SnapSegment[]
): Point2D {
  if (segments.length === 0) {
    return { ...point };
  }

  const vx = point.x_mm - origin.x_mm;
  const vy = point.y_mm - origin.y_mm;

  let best: Point2D | null = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (const segment of segments) {
    const dx = segment.end.x_mm - segment.start.x_mm;
    const dy = segment.end.y_mm - segment.start.y_mm;
    const len = Math.hypot(dx, dy);
    if (len === 0) {
      continue;
    }

    const ux = dx / len;
    const uy = dy / len;
    const projectedLength = vx * ux + vy * uy;
    const candidate = {
      x_mm: origin.x_mm + ux * projectedLength,
      y_mm: origin.y_mm + uy * projectedLength,
    };

    const cx = candidate.x_mm - point.x_mm;
    const cy = candidate.y_mm - point.y_mm;
    const distanceSq = cx * cx + cy * cy;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = candidate;
    }
  }

  return best ?? { ...point };
}

function projectPointToSegment(point: Point2D, segment: SnapSegment): Point2D {
  const dx = segment.end.x_mm - segment.start.x_mm;
  const dy = segment.end.y_mm - segment.start.y_mm;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { ...segment.start };
  }

  const tx = point.x_mm - segment.start.x_mm;
  const ty = point.y_mm - segment.start.y_mm;
  const t = Math.max(0, Math.min(1, (tx * dx + ty * dy) / lenSq));

  return {
    x_mm: segment.start.x_mm + dx * t,
    y_mm: segment.start.y_mm + dy * t,
  };
}

export function snapToNearestSegmentProjection(
  point: Point2D,
  segments: SnapSegment[],
  toleranceMm: number
): Point2D {
  if (toleranceMm <= 0 || segments.length === 0) {
    return { ...point };
  }

  let nearest: Point2D | null = null;
  let nearestDistanceSq = toleranceMm * toleranceMm;

  for (const segment of segments) {
    const projected = projectPointToSegment(point, segment);
    const dx = projected.x_mm - point.x_mm;
    const dy = projected.y_mm - point.y_mm;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= nearestDistanceSq) {
      nearest = projected;
      nearestDistanceSq = distanceSq;
    }
  }

  return nearest ? { ...nearest } : { ...point };
}

export function getMagnetizedLength(lengthMm: number, stepMm: number): number {
  if (!Number.isFinite(lengthMm) || lengthMm <= 0) {
    return lengthMm;
  }

  if (!Number.isFinite(stepMm) || stepMm <= 0) {
    return lengthMm;
  }

  return Math.round(lengthMm / stepMm) * stepMm;
}

export function snapToNearestPoint(
  point: Point2D,
  candidates: Point2D[],
  toleranceMm: number
): Point2D {
  if (toleranceMm <= 0 || candidates.length === 0) {
    return { ...point };
  }

  let nearest: Point2D | null = null;
  let nearestDistanceSq = toleranceMm * toleranceMm;

  for (const candidate of candidates) {
    const dx = candidate.x_mm - point.x_mm;
    const dy = candidate.y_mm - point.y_mm;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= nearestDistanceSq) {
      nearest = candidate;
      nearestDistanceSq = distanceSq;
    }
  }

  return nearest ? { ...nearest } : { ...point };
}

export function buildAllowedAngles(stepDeg: number): number[] {
  if (!Number.isFinite(stepDeg) || stepDeg <= 0) {
    return [0, 45, 90, 135, 180, 225, 270, 315];
  }

  const normalizedStep = Math.max(1, Math.min(180, Math.round(stepDeg)));
  const angles: number[] = [];
  for (let angle = 0; angle < 360; angle += normalizedStep) {
    angles.push(angle);
  }

  return angles.length > 0 ? angles : [0, 45, 90, 135, 180, 225, 270, 315];
}

export interface SnapPointOptions {
  allowedAnglesDeg?: number[];
  magnetismEnabled?: boolean;
  magnetismCandidates?: Point2D[];
  axisMagnetismEnabled?: boolean;
  magnetismSegments?: SnapSegment[];
  magnetismToleranceMm?: number;
}

export function snapPoint(
  point: Point2D,
  origin: Point2D | null,
  gridSizeMm: number,
  angleSnap: boolean,
  options: SnapPointOptions = {}
): Point2D {
  const gridSnapped = snapToGrid(point, gridSizeMm);
  const allowedAngles = options.allowedAnglesDeg ?? [0, 45, 90, 135, 180, 225, 270, 315];

  const angleSnapped = !angleSnap || origin === null
    ? gridSnapped
    : snapToAngle(gridSnapped, origin, allowedAngles);

  const tolerance = options.magnetismToleranceMm ?? 120;
  const pointMagnetized = options.magnetismEnabled
    ? snapToNearestPoint(
      angleSnapped,
      options.magnetismCandidates ?? [],
      tolerance,
    )
    : angleSnapped;

  const axisMagnetized = options.axisMagnetismEnabled
    ? snapToNearestSegmentProjection(
      angleSnapped,
      options.magnetismSegments ?? [],
      tolerance,
    )
    : angleSnapped;

  const pointDx = pointMagnetized.x_mm - angleSnapped.x_mm;
  const pointDy = pointMagnetized.y_mm - angleSnapped.y_mm;
  const pointDistanceSq = pointDx * pointDx + pointDy * pointDy;

  const axisDx = axisMagnetized.x_mm - angleSnapped.x_mm;
  const axisDy = axisMagnetized.y_mm - angleSnapped.y_mm;
  const axisDistanceSq = axisDx * axisDx + axisDy * axisDy;

  if (axisDistanceSq > 0 && (pointDistanceSq === 0 || axisDistanceSq < pointDistanceSq)) {
    return axisMagnetized;
  }

  return pointMagnetized;
}
