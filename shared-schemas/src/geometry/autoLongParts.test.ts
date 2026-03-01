import { describe, expect, it } from 'vitest';
import { calculatePlinthSegments, calculateWorktopSegments, clusterCabinetsByWall } from './autoLongParts';

describe('autoLongParts', () => {
  it('clusters contiguous cabinets per wall', () => {
    const clusters = clusterCabinetsByWall([
      { id: 'c1', wall_id: 'wall-a', offset_mm: 0, width_mm: 600, depth_mm: 560, kind: 'base' },
      { id: 'c2', wall_id: 'wall-a', offset_mm: 600, width_mm: 800, depth_mm: 560, kind: 'base' },
      { id: 'c3', wall_id: 'wall-a', offset_mm: 1600, width_mm: 600, depth_mm: 560, kind: 'base' },
      { id: 'c4', wall_id: 'wall-b', offset_mm: 0, width_mm: 900, depth_mm: 560, kind: 'base' }
    ]);

    expect(clusters).toHaveLength(3);
    expect(clusters[0]).toMatchObject({
      wall_id: 'wall-a',
      start_offset_mm: 0,
      end_offset_mm: 1400
    });
  });

  it('creates worktop segments for a straight run with overhangs', () => {
    const [cluster] = clusterCabinetsByWall([
      { id: 'c1', wall_id: 'wall-a', offset_mm: 0, width_mm: 600, depth_mm: 560, kind: 'base' },
      { id: 'c2', wall_id: 'wall-a', offset_mm: 600, width_mm: 800, depth_mm: 560, kind: 'base' }
    ]);

    const segments = calculateWorktopSegments(cluster, {
      front_overhang_mm: 20,
      side_overhang_mm: 10,
      max_segment_length_mm: 3000
    });

    expect(segments).toEqual([
      {
        wall_id: 'wall-a',
        segment_index: 1,
        start_mm: -10,
        end_mm: 1410,
        length_mm: 1420,
        depth_mm: 580,
        joint_left: false,
        joint_right: false
      }
    ]);
  });

  it('splits worktop segments and keeps minimal L-joint allowances', () => {
    const [cluster] = clusterCabinetsByWall([
      {
        id: 'c1',
        wall_id: 'wall-l',
        offset_mm: 0,
        width_mm: 1200,
        depth_mm: 600,
        kind: 'base'
      },
      {
        id: 'c2',
        wall_id: 'wall-l',
        offset_mm: 1200,
        width_mm: 1400,
        depth_mm: 600,
        kind: 'base',
        joins_right_corner: true
      }
    ]);

    const segments = calculateWorktopSegments(cluster, {
      front_overhang_mm: 20,
      side_overhang_mm: 30,
      max_segment_length_mm: 1500,
      corner_joint_allowance_mm: 10
    });

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ length_mm: 1500, joint_left: false, joint_right: true });
    expect(segments[1]).toMatchObject({ length_mm: 1150, joint_left: true, joint_right: true });
  });

  it('creates plinth segments for L configurations without side overhang', () => {
    const [cluster] = clusterCabinetsByWall([
      {
        id: 'c1',
        wall_id: 'wall-b',
        offset_mm: 0,
        width_mm: 900,
        depth_mm: 560,
        kind: 'base',
        joins_left_corner: true
      },
      { id: 'c2', wall_id: 'wall-b', offset_mm: 900, width_mm: 600, depth_mm: 560, kind: 'base' }
    ]);

    const segments = calculatePlinthSegments(cluster, {
      height_mm: 150,
      recess_mm: 60
    });

    expect(segments).toEqual([
      {
        wall_id: 'wall-b',
        segment_index: 1,
        start_mm: 0,
        end_mm: 1500,
        length_mm: 1500,
        height_mm: 150,
        recess_mm: 60,
        joint_left: true,
        joint_right: false
      }
    ]);
  });
});
