import Drawing from 'dxf-writer';

import { withoutDuplicateClosure } from '@yakds/shared-schemas';
import type { ExportPayload, Opening, Point2D, WallSegment2D } from '@yakds/shared-schemas';

const ROOM_LAYER = 'YAKDS_ROOM';
const WALLS_LAYER = 'YAKDS_WALLS';
const OPENINGS_LAYER = 'YAKDS_OPENINGS';
const FURNITURE_LAYER = 'YAKDS_FURNITURE';

function wallDirection(wall: WallSegment2D): { x: number; y: number } {
  const dx = wall.end.x_mm - wall.start.x_mm;
  const dy = wall.end.y_mm - wall.start.y_mm;
  const length = wall.length_mm || Math.hypot(dx, dy);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: dx / length,
    y: dy / length
  };
}

function pointOnWall(wall: WallSegment2D, offsetMm: number): Point2D {
  const direction = wallDirection(wall);
  return {
    x_mm: wall.start.x_mm + direction.x * offsetMm,
    y_mm: wall.start.y_mm + direction.y * offsetMm
  };
}

function drawOpening(drawing: Drawing, wall: WallSegment2D, opening: Opening): void {
  const start = pointOnWall(wall, opening.offset_mm);
  const end = pointOnWall(wall, opening.offset_mm + opening.width_mm);

  drawing.drawLine(start.x_mm, start.y_mm, end.x_mm, end.y_mm);
}

export function exportToDxf(payload: ExportPayload): string {
  const drawing = new Drawing();

  drawing.setUnits('Millimeters');
  drawing.addLayer(ROOM_LAYER, Drawing.ACI.WHITE, 'CONTINUOUS');
  drawing.addLayer(WALLS_LAYER, 8, 'CONTINUOUS');
  drawing.addLayer(OPENINGS_LAYER, Drawing.ACI.CYAN, 'CONTINUOUS');
  drawing.addLayer(FURNITURE_LAYER, Drawing.ACI.YELLOW, 'CONTINUOUS');

  const roomBoundary = withoutDuplicateClosure(payload.room.boundary);
  if (roomBoundary.length >= 3) {
    drawing.setActiveLayer(ROOM_LAYER);
    drawing.drawPolyline(
      roomBoundary.map((vertex) => [vertex.x_mm, vertex.y_mm]),
      true
    );
  }

  drawing.setActiveLayer(WALLS_LAYER);
  payload.wallSegments.forEach((wall) => {
    drawing.drawLine(wall.start.x_mm, wall.start.y_mm, wall.end.x_mm, wall.end.y_mm);
  });

  drawing.setActiveLayer(OPENINGS_LAYER);
  const wallsById = new Map(payload.wallSegments.map((wall) => [wall.id, wall]));
  payload.openings.forEach((opening) => {
    const wall = wallsById.get(opening.wall_id);
    if (wall) {
      drawOpening(drawing, wall, opening);
    }
  });

  if (payload.includeFurniture) {
    drawing.setActiveLayer(FURNITURE_LAYER);
    payload.furniture.forEach((item) => {
      drawing.drawRect(
        item.footprintRect.min.x_mm,
        item.footprintRect.min.y_mm,
        item.footprintRect.max.x_mm,
        item.footprintRect.max.y_mm
      );
    });
  }

  return drawing.toDxfString();
}
