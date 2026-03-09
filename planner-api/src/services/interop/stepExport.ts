type StepWallSegment = {
  id: string
  kind?: 'line' | 'arc'
  x0_mm?: number
  y0_mm?: number
  x1_mm?: number
  y1_mm?: number
}

type StepPlacement = {
  id?: string
  offset_mm: number
  width_mm: number
  depth_mm: number
  height_mm?: number
}

export interface StepExportOptions {
  projectName: string
  wall_segments: StepWallSegment[]
  placements: StepPlacement[]
  ceiling_height_mm: number
}

type StepPoint = { x: number; y: number; z: number }

function sanitizeStepText(value: string): string {
  return value.replace(/'/g, '').replace(/[\r\n]+/g, ' ').trim()
}

function formatCoord(value: number): string {
  return Number.isInteger(value) ? `${value}.` : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0')
}

function pointKey(point: StepPoint): string {
  return `${point.x}|${point.y}|${point.z}`
}

export function buildStepString(options: StepExportOptions): string {
  let nextId = 1
  const lines: string[] = []
  const pointIds = new Map<string, number>()

  const pushEntity = (entity: string): number => {
    const id = nextId
    nextId += 1
    lines.push(`#${id}=${entity};`)
    return id
  }

  const ensurePoint = (point: StepPoint): number => {
    const key = pointKey(point)
    const existing = pointIds.get(key)
    if (existing) return existing

    const id = pushEntity(
      `CARTESIAN_POINT('',(${formatCoord(point.x)},${formatCoord(point.y)},${formatCoord(point.z)}))`,
    )
    pointIds.set(key, id)
    return id
  }

  const polylineIds: number[] = []
  const wallHeight = Math.max(1, options.ceiling_height_mm)

  for (const wall of options.wall_segments) {
    if (
      typeof wall.x0_mm !== 'number' ||
      typeof wall.y0_mm !== 'number' ||
      typeof wall.x1_mm !== 'number' ||
      typeof wall.y1_mm !== 'number'
    ) {
      continue
    }

    const baseA = ensurePoint({ x: wall.x0_mm, y: wall.y0_mm, z: 0 })
    const baseB = ensurePoint({ x: wall.x1_mm, y: wall.y1_mm, z: 0 })
    const topA = ensurePoint({ x: wall.x0_mm, y: wall.y0_mm, z: wallHeight })
    const topB = ensurePoint({ x: wall.x1_mm, y: wall.y1_mm, z: wallHeight })

    polylineIds.push(pushEntity(`POLYLINE('wall_${sanitizeStepText(wall.id)}',(#${baseA},#${baseB}))`))
    polylineIds.push(pushEntity(`POLYLINE('wall_top_${sanitizeStepText(wall.id)}',(#${topA},#${topB}))`))
    polylineIds.push(pushEntity(`POLYLINE('wall_left_${sanitizeStepText(wall.id)}',(#${baseA},#${topA}))`))
    polylineIds.push(pushEntity(`POLYLINE('wall_right_${sanitizeStepText(wall.id)}',(#${baseB},#${topB}))`))
  }

  options.placements.forEach((placement, index) => {
    const x0 = placement.offset_mm
    const x1 = placement.offset_mm + placement.width_mm
    const y0 = 0
    const y1 = placement.depth_mm
    const z1 = placement.height_mm ?? 720

    const p1 = ensurePoint({ x: x0, y: y0, z: 0 })
    const p2 = ensurePoint({ x: x1, y: y0, z: 0 })
    const p3 = ensurePoint({ x: x1, y: y1, z: 0 })
    const p4 = ensurePoint({ x: x0, y: y1, z: 0 })
    const p5 = ensurePoint({ x: x0, y: y0, z: z1 })
    const p6 = ensurePoint({ x: x1, y: y0, z: z1 })
    const p7 = ensurePoint({ x: x1, y: y1, z: z1 })
    const p8 = ensurePoint({ x: x0, y: y1, z: z1 })

    const label = sanitizeStepText(placement.id ?? `placement_${index + 1}`)
    polylineIds.push(pushEntity(`POLYLINE('${label}_base',(#${p1},#${p2},#${p3},#${p4},#${p1}))`))
    polylineIds.push(pushEntity(`POLYLINE('${label}_top',(#${p5},#${p6},#${p7},#${p8},#${p5}))`))
    polylineIds.push(pushEntity(`POLYLINE('${label}_v1',(#${p1},#${p5}))`))
    polylineIds.push(pushEntity(`POLYLINE('${label}_v2',(#${p2},#${p6}))`))
    polylineIds.push(pushEntity(`POLYLINE('${label}_v3',(#${p3},#${p7}))`))
    polylineIds.push(pushEntity(`POLYLINE('${label}_v4',(#${p4},#${p8}))`))
  })

  const appContextId = pushEntity(`APPLICATION_CONTEXT('configuration controlled 3d designs')`)
  pushEntity(`APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,#${appContextId})`)
  const productContextId = pushEntity(`MECHANICAL_CONTEXT('',#${appContextId},'mechanical')`)
  const productId = pushEntity(
    `PRODUCT('${sanitizeStepText(options.projectName)}','${sanitizeStepText(options.projectName)}','',(#${productContextId}))`,
  )
  const formationId = pushEntity(`PRODUCT_DEFINITION_FORMATION('1','',#${productId})`)
  const definitionContextId = pushEntity(`PRODUCT_DEFINITION_CONTEXT('part definition',#${appContextId},'design')`)
  const definitionId = pushEntity(`PRODUCT_DEFINITION('design','',#${formationId},#${definitionContextId})`)
  const shapeId = pushEntity(`PRODUCT_DEFINITION_SHAPE('','',#${definitionId})`)
  const lengthUnitId = pushEntity(`(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.))`)
  const angleUnitId = pushEntity(`(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.))`)
  const solidAngleUnitId = pushEntity(`(NAMED_UNIT(*) SOLID_ANGLE_UNIT() SI_UNIT($,.STERADIAN.))`)
  const uncertaintyId = pushEntity(
    `UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-6),#${lengthUnitId},'distance_accuracy_value','confusion accuracy')`,
  )
  const contextId = pushEntity(
    `(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${uncertaintyId})) GLOBAL_UNIT_ASSIGNED_CONTEXT((#${lengthUnitId},#${angleUnitId},#${solidAngleUnitId})) REPRESENTATION_CONTEXT('',''))`,
  )
  const curveSetId = pushEntity(`GEOMETRIC_CURVE_SET('',(${polylineIds.map((id) => `#${id}`).join(',')}))`)
  const representationId = pushEntity(`SHAPE_REPRESENTATION('',(#${curveSetId}),#${contextId})`)
  pushEntity(`SHAPE_DEFINITION_REPRESENTATION(#${shapeId},#${representationId})`)

  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('OKP STEP wireframe export'),'2;1');",
    `FILE_NAME('${sanitizeStepText(options.projectName)}.step','2026-03-09T00:00:00',('OKP'),('OKP'),'OKP Planner','OpenAI Codex','');`,
    "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));",
    'ENDSEC;',
    'DATA;',
    ...lines,
    'ENDSEC;',
    'END-ISO-10303-21;',
  ].join('\n')
}
