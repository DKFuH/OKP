export interface AutoLongPartCabinet {
  id: string;
  wall_id: string;
  offset_mm: number;
  width_mm: number;
  depth_mm: number;
  height_mm?: number;
  kind?: 'base' | 'tall' | 'wall' | 'appliance';
  joins_left_corner?: boolean;
  joins_right_corner?: boolean;
}

export interface CabinetCluster {
  wall_id: string;
  cabinets: AutoLongPartCabinet[];
  start_offset_mm: number;
  end_offset_mm: number;
  max_depth_mm: number;
  joins_left_corner: boolean;
  joins_right_corner: boolean;
}

export interface WorktopParams {
  front_overhang_mm: number;
  side_overhang_mm: number;
  max_segment_length_mm: number;
  corner_joint_allowance_mm?: number;
}

export interface WorktopSegment {
  wall_id: string;
  segment_index: number;
  start_mm: number;
  end_mm: number;
  length_mm: number;
  depth_mm: number;
  joint_left: boolean;
  joint_right: boolean;
}

export interface PlinthParams {
  height_mm: number;
  recess_mm: number;
  max_segment_length_mm?: number;
  corner_joint_allowance_mm?: number;
}

export interface PlinthSegment {
  wall_id: string;
  segment_index: number;
  start_mm: number;
  end_mm: number;
  length_mm: number;
  height_mm: number;
  recess_mm: number;
  joint_left: boolean;
  joint_right: boolean;
}

const GAP_TOLERANCE_MM = 10;

function buildCluster(wall_id: string, cabinets: AutoLongPartCabinet[]): CabinetCluster {
  const sorted = [...cabinets].sort((left, right) => left.offset_mm - right.offset_mm);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return {
    wall_id,
    cabinets: sorted,
    start_offset_mm: first.offset_mm,
    end_offset_mm: last.offset_mm + last.width_mm,
    max_depth_mm: Math.max(...sorted.map((cabinet) => cabinet.depth_mm)),
    joins_left_corner: Boolean(first.joins_left_corner),
    joins_right_corner: Boolean(last.joins_right_corner)
  };
}

export function clusterCabinetsByWall(cabinets: AutoLongPartCabinet[]): CabinetCluster[] {
  const grouped = new Map<string, AutoLongPartCabinet[]>();

  cabinets
    .filter((cabinet) => cabinet.kind !== 'wall')
    .forEach((cabinet) => {
      const wallCabinets = grouped.get(cabinet.wall_id) ?? [];
      wallCabinets.push(cabinet);
      grouped.set(cabinet.wall_id, wallCabinets);
    });

  const clusters: CabinetCluster[] = [];

  [...grouped.entries()].forEach(([wall_id, wallCabinets]) => {
    const sorted = [...wallCabinets].sort((left, right) => left.offset_mm - right.offset_mm);
    let current: AutoLongPartCabinet[] = [];

    sorted.forEach((cabinet) => {
      if (current.length === 0) {
        current = [cabinet];
        return;
      }

      const previous = current[current.length - 1];
      const gap = cabinet.offset_mm - (previous.offset_mm + previous.width_mm);

      if (gap <= GAP_TOLERANCE_MM) {
        current.push(cabinet);
      } else {
        clusters.push(buildCluster(wall_id, current));
        current = [cabinet];
      }
    });

    if (current.length > 0) {
      clusters.push(buildCluster(wall_id, current));
    }
  });

  return clusters;
}

function calculateSpanWithSideOverhang(
  cluster: CabinetCluster,
  sideOverhangMm: number,
  cornerJointAllowanceMm: number
): { start_mm: number; end_mm: number; joint_left: boolean; joint_right: boolean } {
  const leftReduction = cluster.joins_left_corner ? Math.min(sideOverhangMm, cornerJointAllowanceMm) : 0;
  const rightReduction = cluster.joins_right_corner ? Math.min(sideOverhangMm, cornerJointAllowanceMm) : 0;

  return {
    start_mm: cluster.start_offset_mm - sideOverhangMm + leftReduction,
    end_mm: cluster.end_offset_mm + sideOverhangMm - rightReduction,
    joint_left: cluster.joins_left_corner,
    joint_right: cluster.joins_right_corner
  };
}

function splitLength(
  start_mm: number,
  totalLengthMm: number,
  maxSegmentLengthMm: number
): Array<{ start_mm: number; end_mm: number; length_mm: number; segment_index: number }> {
  if (maxSegmentLengthMm <= 0 || totalLengthMm <= maxSegmentLengthMm) {
    return [
      {
        start_mm,
        end_mm: start_mm + totalLengthMm,
        length_mm: totalLengthMm,
        segment_index: 1
      }
    ];
  }

  const segments: Array<{ start_mm: number; end_mm: number; length_mm: number; segment_index: number }> = [];
  let remaining = totalLengthMm;
  let cursor = start_mm;
  let segmentIndex = 1;

  while (remaining > 0) {
    const length = Math.min(remaining, maxSegmentLengthMm);
    segments.push({
      start_mm: cursor,
      end_mm: cursor + length,
      length_mm: length,
      segment_index: segmentIndex
    });
    cursor += length;
    remaining -= length;
    segmentIndex += 1;
  }

  return segments;
}

export function calculateWorktopSegments(cluster: CabinetCluster, params: WorktopParams): WorktopSegment[] {
  const cornerJointAllowanceMm = params.corner_joint_allowance_mm ?? 20;
  const span = calculateSpanWithSideOverhang(cluster, params.side_overhang_mm, cornerJointAllowanceMm);
  const totalLengthMm = Math.max(0, span.end_mm - span.start_mm);

  return splitLength(span.start_mm, totalLengthMm, params.max_segment_length_mm).map((segment, index, all) => ({
    wall_id: cluster.wall_id,
    segment_index: segment.segment_index,
    start_mm: segment.start_mm,
    end_mm: segment.end_mm,
    length_mm: segment.length_mm,
    depth_mm: cluster.max_depth_mm + params.front_overhang_mm,
    joint_left: index === 0 ? span.joint_left : true,
    joint_right: index === all.length - 1 ? span.joint_right : true
  }));
}

export function calculatePlinthSegments(cluster: CabinetCluster, params: PlinthParams): PlinthSegment[] {
  const maxSegmentLengthMm = params.max_segment_length_mm ?? Number.POSITIVE_INFINITY;
  const cornerJointAllowanceMm = params.corner_joint_allowance_mm ?? 0;
  const span = calculateSpanWithSideOverhang(cluster, 0, cornerJointAllowanceMm);
  const totalLengthMm = Math.max(0, span.end_mm - span.start_mm);

  return splitLength(span.start_mm, totalLengthMm, maxSegmentLengthMm).map((segment, index, all) => ({
    wall_id: cluster.wall_id,
    segment_index: segment.segment_index,
    start_mm: segment.start_mm,
    end_mm: segment.end_mm,
    length_mm: segment.length_mm,
    height_mm: params.height_mm,
    recess_mm: params.recess_mm,
    joint_left: index === 0 ? span.joint_left : true,
    joint_right: index === all.length - 1 ? span.joint_right : true
  }));
}
