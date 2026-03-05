import { describe, expect, it } from 'vitest';
import {
  buildAllowedAngles,
  constrainOrthogonally,
  constrainToNearestSegmentAxis,
  getMagnetizedLength,
  snapPoint,
  snapToAngle,
  snapToGrid,
  snapToNearestPoint,
  snapToNearestSegmentProjection,
} from './snapUtils';

describe('snapUtils', () => {
  it('snaps to the nearest allowed angle', () => {
    const radius = 1000;
    const angleRad = (47 * Math.PI) / 180;
    const point = {
      x_mm: Math.cos(angleRad) * radius,
      y_mm: Math.sin(angleRad) * radius
    };

    const snapped = snapToAngle(point, { x_mm: 0, y_mm: 0 }, [0, 45, 90]);

    expect(snapped.x_mm).toBeCloseTo(Math.cos(Math.PI / 4) * radius, 5);
    expect(snapped.y_mm).toBeCloseTo(Math.sin(Math.PI / 4) * radius, 5);
  });

  it('snaps to the nearest grid point', () => {
    expect(snapToGrid({ x_mm: 1234, y_mm: 1766 }, 100)).toEqual({
      x_mm: 1200,
      y_mm: 1800
    });
  });

  it('combines grid and angle snapping', () => {
    const snapped = snapPoint({ x_mm: 980, y_mm: 1020 }, { x_mm: 0, y_mm: 0 }, 100, true);

    expect(snapped.x_mm).toBeCloseTo(1000, 6);
    expect(snapped.y_mm).toBeCloseTo(1000, 6);
  });

  it('snaps to nearest candidate point when within tolerance', () => {
    const snapped = snapToNearestPoint(
      { x_mm: 1985, y_mm: 980 },
      [{ x_mm: 2000, y_mm: 1000 }],
      30
    );

    expect(snapped).toEqual({ x_mm: 2000, y_mm: 1000 });
  });

  it('builds angle set from step', () => {
    expect(buildAllowedAngles(90)).toEqual([0, 90, 180, 270]);
  });

  it('applies point magnetism in snapPoint', () => {
    const snapped = snapPoint(
      { x_mm: 1985, y_mm: 980 },
      { x_mm: 0, y_mm: 0 },
      5,
      false,
      {
        magnetismEnabled: true,
        magnetismCandidates: [{ x_mm: 2000, y_mm: 1000 }],
        magnetismToleranceMm: 30,
      }
    );

    expect(snapped).toEqual({ x_mm: 2000, y_mm: 1000 });
  });

  it('constrains movement orthogonally to horizontal axis when dx dominates', () => {
    const constrained = constrainOrthogonally(
      { x_mm: 1600, y_mm: 1320 },
      { x_mm: 1000, y_mm: 1000 }
    );

    expect(constrained).toEqual({ x_mm: 1600, y_mm: 1000 });
  });

  it('constrains movement orthogonally to vertical axis when dy dominates', () => {
    const constrained = constrainOrthogonally(
      { x_mm: 1240, y_mm: 1900 },
      { x_mm: 1000, y_mm: 1000 }
    );

    expect(constrained).toEqual({ x_mm: 1000, y_mm: 1900 });
  });

  it('constrains movement to nearest segment angle axis', () => {
    const constrained = constrainToNearestSegmentAxis(
      { x_mm: 1600, y_mm: 1300 },
      { x_mm: 1000, y_mm: 1000 },
      [{ start: { x_mm: 0, y_mm: 0 }, end: { x_mm: 1000, y_mm: 1000 } }],
    );

    expect(constrained.x_mm).toBeCloseTo(1450, 0);
    expect(constrained.y_mm).toBeCloseTo(1450, 0);
  });

  it('snaps to nearest wall axis projection when enabled', () => {
    const snapped = snapToNearestSegmentProjection(
      { x_mm: 1010, y_mm: 780 },
      [{ start: { x_mm: 0, y_mm: 800 }, end: { x_mm: 2000, y_mm: 800 } }],
      30,
    );

    expect(snapped).toEqual({ x_mm: 1010, y_mm: 800 });
  });

  it('prefers axis magnetism in snapPoint when axis is closer than point candidates', () => {
    const snapped = snapPoint(
      { x_mm: 1010, y_mm: 782 },
      null,
      1,
      false,
      {
        magnetismEnabled: true,
        magnetismCandidates: [{ x_mm: 980, y_mm: 760 }],
        axisMagnetismEnabled: true,
        magnetismSegments: [{ start: { x_mm: 0, y_mm: 800 }, end: { x_mm: 2000, y_mm: 800 } }],
        magnetismToleranceMm: 30,
      },
    );

    expect(snapped).toEqual({ x_mm: 1010, y_mm: 800 });
  });

  it('magnetizes explicit lengths to configured step', () => {
    expect(getMagnetizedLength(1241, 50)).toBe(1250);
    expect(getMagnetizedLength(1224, 50)).toBe(1200);
    expect(getMagnetizedLength(1224, 0)).toBe(1224);
  });
});
