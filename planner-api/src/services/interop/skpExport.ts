export interface SkpExportOptions {
  projectName: string
  wall_segments: Array<{ x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }>
  placements: Array<{ offset_mm: number; width_mm: number; depth_mm: number; height_mm?: number }>
  ceiling_height_mm: number
}

/**
 * Exports a SketchUp Ruby script (.rb) that reconstructs walls and placements.
 * Native .skp binary writing needs proprietary SDKs and is not implemented here.
 */
export function buildSkpRubyScript(options: SkpExportOptions): string {
  const lines = [
    '# OKP Planner – SketchUp Import Script',
    `# Projekt: ${options.projectName}`,
    '# Ausführen in SketchUp: Extensions > Ruby-Konsole',
    '',
    'model = Sketchup.active_model',
    'entities = model.active_entities',
    'model.start_operation("OKP Import", true)',
    '',
    'MM2INCH = 0.0393701',
    '',
    '# Wände',
  ]

  for (const segment of options.wall_segments) {
    const height = options.ceiling_height_mm
    lines.push(
      'pts = [',
      `  Geom::Point3d.new(${segment.x0_mm} * MM2INCH, ${segment.y0_mm} * MM2INCH, 0),`,
      `  Geom::Point3d.new(${segment.x1_mm} * MM2INCH, ${segment.y1_mm} * MM2INCH, 0),`,
      `  Geom::Point3d.new(${segment.x1_mm} * MM2INCH, ${segment.y1_mm} * MM2INCH, ${height} * MM2INCH),`,
      `  Geom::Point3d.new(${segment.x0_mm} * MM2INCH, ${segment.y0_mm} * MM2INCH, ${height} * MM2INCH),`,
      ']',
      'entities.add_face(pts)',
    )
  }

  lines.push('', '# Möbel')

  for (const placement of options.placements) {
    const height = placement.height_mm ?? 720
    lines.push(
      'face = entities.add_face([',
      `  Geom::Point3d.new(${placement.offset_mm} * MM2INCH, 0, 0),`,
      `  Geom::Point3d.new(${placement.offset_mm + placement.width_mm} * MM2INCH, 0, 0),`,
      `  Geom::Point3d.new(${placement.offset_mm + placement.width_mm} * MM2INCH, 0, ${height} * MM2INCH),`,
      `  Geom::Point3d.new(${placement.offset_mm} * MM2INCH, 0, ${height} * MM2INCH),`,
      '])',
      `face.pushpull(${placement.depth_mm} * MM2INCH) if face`,
    )
  }

  lines.push('', 'model.commit_operation', 'puts "OKP Import fertig"')
  return lines.join('\n')
}
