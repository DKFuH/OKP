import type { Point2D, Vertex } from '../types.js';
import { polygonArea, withoutDuplicateClosure } from './geometryUtils.js';

export interface SimplifiedRoom {
  shape: 'rectangle' | 'l-shape' | 'unsupported';
  width_mm: number;
  depth_mm: number;
  area_mm2: number;
  cutout?: {
    x_mm: number;
    y_mm: number;
    width_mm: number;
    depth_mm: number;
  };
}

function isAxisAligned(vertices: Point2D[]): boolean {
  return vertices.every((vertex, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return vertex.x_mm === next.x_mm || vertex.y_mm === next.y_mm;
  });
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function boundingBox(vertices: Point2D[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return vertices.reduce(
    (box, vertex) => ({
      minX: Math.min(box.minX, vertex.x_mm),
      minY: Math.min(box.minY, vertex.y_mm),
      maxX: Math.max(box.maxX, vertex.x_mm),
      maxY: Math.max(box.maxY, vertex.y_mm)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  );
}

function inferLShapeCutout(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  innerX: number,
  innerY: number,
  targetArea: number
): SimplifiedRoom['cutout'] | undefined {
  const candidates = [
    { x_mm: minX, y_mm: minY, width_mm: innerX - minX, depth_mm: innerY - minY },
    { x_mm: innerX, y_mm: minY, width_mm: maxX - innerX, depth_mm: innerY - minY },
    { x_mm: minX, y_mm: innerY, width_mm: innerX - minX, depth_mm: maxY - innerY },
    { x_mm: innerX, y_mm: innerY, width_mm: maxX - innerX, depth_mm: maxY - innerY }
  ];

  return candidates.find((candidate) => candidate.width_mm > 0 && candidate.depth_mm > 0 && candidate.width_mm * candidate.depth_mm === targetArea);
}

export function simplifyPolygonToWebplanner(vertices: Vertex[]): SimplifiedRoom {
  const ring = withoutDuplicateClosure(vertices);

  if (ring.length < 4 || !isAxisAligned(ring)) {
    return {
      shape: 'unsupported',
      width_mm: 0,
      depth_mm: 0,
      area_mm2: Math.abs(polygonArea(ring))
    };
  }

  const box = boundingBox(ring);
  const width = box.maxX - box.minX;
  const depth = box.maxY - box.minY;
  const area = Math.abs(polygonArea(ring));
  const uniqueX = uniqueSorted(ring.map((vertex) => vertex.x_mm));
  const uniqueY = uniqueSorted(ring.map((vertex) => vertex.y_mm));
  const outerArea = width * depth;

  if (ring.length === 4 || area === outerArea) {
    return {
      shape: 'rectangle',
      width_mm: width,
      depth_mm: depth,
      area_mm2: area
    };
  }

  if (ring.length === 6 && uniqueX.length === 3 && uniqueY.length === 3) {
    const cutoutArea = outerArea - area;
    const cutout = inferLShapeCutout(box.minX, box.minY, box.maxX, box.maxY, uniqueX[1], uniqueY[1], cutoutArea);

    if (cutout) {
      return {
        shape: 'l-shape',
        width_mm: width,
        depth_mm: depth,
        area_mm2: area,
        cutout
      };
    }
  }

  return {
    shape: 'unsupported',
    width_mm: width,
    depth_mm: depth,
    area_mm2: area
  };
}

export function isCompatibleForWizard(vertices: Vertex[]): boolean {
  const simplified = simplifyPolygonToWebplanner(vertices);
  return simplified.shape === 'rectangle' || simplified.shape === 'l-shape';
}
