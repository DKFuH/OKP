import { describe, expect, it } from 'vitest'
import { extractModelImportMeta } from './modelImportService.js'

describe('modelImportService', () => {
  it('parses OBJ in meter scale and converts bbox to mm', () => {
    const obj = [
      'v 0 0 0',
      'v 0.6 0 0',
      'v 0 0.72 0',
      'v 0 0 0.56',
    ].join('\n')

    const meta = extractModelImportMeta('korpus.obj', obj)

    expect(meta.sourceFormat).toBe('obj')
    expect(meta.defaultScale.factor_to_mm).toBe(1000)
    expect(meta.bboxMm).toEqual({ width_mm: 600, height_mm: 720, depth_mm: 560 })
    expect(meta.vertexCount).toBe(4)
  })

  it('parses OBJ in cm scale and converts bbox to mm', () => {
    const obj = [
      'v 0 0 0',
      'v 60 0 0',
      'v 0 72 0',
      'v 0 0 56',
    ].join('\n')

    const meta = extractModelImportMeta('korpus.obj', obj)

    expect(meta.defaultScale.factor_to_mm).toBe(10)
    expect(meta.defaultScale.source_unit).toBe('cm')
    expect(meta.bboxMm).toEqual({ width_mm: 600, height_mm: 720, depth_mm: 560 })
  })

  it('parses DAE position source arrays', () => {
    const dae = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<COLLADA>',
      '  <library_geometries>',
      '    <geometry id="geom-1">',
      '      <mesh>',
      '        <source id="geom-1-positions">',
      '          <float_array id="geom-1-positions-array" count="12">0 0 0 0.6 0 0 0 0.72 0 0 0 0.56</float_array>',
      '        </source>',
      '      </mesh>',
      '    </geometry>',
      '  </library_geometries>',
      '</COLLADA>',
    ].join('\n')

    const meta = extractModelImportMeta('asset.dae', dae)

    expect(meta.sourceFormat).toBe('dae')
    expect(meta.bboxMm).toEqual({ width_mm: 600, height_mm: 720, depth_mm: 560 })
  })

  it('throws for unsupported file extension', () => {
    expect(() => extractModelImportMeta('asset.glb', '...')).toThrow('Nur OBJ und DAE werden unterstützt')
  })

  it('throws for empty file content', () => {
    expect(() => extractModelImportMeta('asset.obj', '   ')).toThrow('Datei ist leer')
  })

  it('throws when no geometry vertices are found', () => {
    expect(() => extractModelImportMeta('asset.obj', 'o mesh\nf 1 2 3')).toThrow('Keine Geometriedaten im Modell gefunden')
  })

  it('throws when bbox has no volume', () => {
    const obj = [
      'v 0 0 0',
      'v 0 0 0',
      'v 0 0 0',
    ].join('\n')

    expect(() => extractModelImportMeta('flat.obj', obj)).toThrow('Ungültige Bounding-Box')
  })
})
