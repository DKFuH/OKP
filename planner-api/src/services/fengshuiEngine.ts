import { randomUUID } from 'node:crypto'

export type FengShuiMode = 'west' | 'east' | 'both'

export interface FengShuiAnalyzeInput {
  mode: FengShuiMode
  compass_deg: number
  entry?: { x_mm: number; y_mm: number; room_id?: string; door_id?: string; placement_id?: string }
  bounds_mm: { x_min: number; y_min: number; x_max: number; y_max: number }
  kitchen?: {
    sink?: { x_mm: number; y_mm: number; placement_id?: string }
    hob?: { x_mm: number; y_mm: number; placement_id?: string }
    fridge?: { x_mm: number; y_mm: number; placement_id?: string }
  }
  doors?: Array<{ x_mm: number; y_mm: number; id?: string; room_id?: string }>
}

export interface FengShuiAnalyzeResult {
  zones_geojson: any // FeatureCollection
  findings: any[]    // FengShuiFinding[]
  score_total: number
  score_west: number
  score_east: number
}

/**
 * ÖSTLICH: Bagua 3×3 über bounds_mm.
 * V1: keine Polygon-Clipping, reine Rechtecke.
 */
export function buildBaguaZones(bounds: FengShuiAnalyzeInput['bounds_mm'], compass_deg: number) {
  const width = bounds.x_max - bounds.x_min
  const height = bounds.y_max - bounds.y_min
  const cellW = width / 3
  const cellH = height / 3

  const labels = [
    ['Wissen', 'Karriere', 'Hilfreiche Menschen'],
    ['Familie', 'Zentrum', 'Kinder/Kreativität'],
    ['Wohlstand', 'Ruhm', 'Partnerschaft'],
  ]

  const features: any[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x0 = bounds.x_min + c * cellW
      const y0 = bounds.y_min + r * cellH
      const x1 = x0 + cellW
      const y1 = y0 + cellH

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0],
          ]],
        },
        properties: {
          zone_type: 'bagua',
          label: labels[r][c],
          row: r,
          col: c,
          compass_deg,
        },
      })
    }
  }

  return {
    type: 'FeatureCollection',
    system: 'east',
    compass_deg,
    bounds_mm: bounds,
    features,
  }
}

/**
 * WESTLICH: Minimal-Checks V1
 * - Küchenarbeitsdreieck: Distanz-Summen & Abstände sink/hob/fridge
 */
export function buildWestFindings(input: FengShuiAnalyzeInput) {
  const findings: any[] = []
  let score = 100

  const { kitchen } = input
  const sink = kitchen?.sink
  const hob = kitchen?.hob
  const fridge = kitchen?.fridge

  if (sink && hob && fridge) {
    const d = (a: any, b: any) => Math.hypot(a.x_mm - b.x_mm, a.y_mm - b.y_mm)
    const d1 = d(sink, hob)
    const d2 = d(hob, fridge)
    const d3 = d(fridge, sink)
    const sum = d1 + d2 + d3

    const tooShort = [d1, d2, d3].some(x => x < 900)
    const tooLong = [d1, d2, d3].some(x => x > 3000)

    if (tooShort) {
      findings.push({
        id: randomUUID(),
        system: 'west',
        severity: 'warn',
        title: 'Küchenarbeitsdreieck: zu kurze Abstände',
        reason: 'Mindestens eine Strecke zwischen Spüle/Herd/Kühlschrank ist < 900 mm.',
        recommendation: 'Zonen etwas auseinanderziehen, damit Bewegungen nicht kollidieren (Öffnungsradien beachten).',
        score_impact: -8,
        object_refs: [
          { placement_id: sink.placement_id },
          { placement_id: hob.placement_id },
          { placement_id: fridge.placement_id },
        ],
        geometry: {
          type: 'LineString',
          coordinates: [[sink.x_mm, sink.y_mm], [hob.x_mm, hob.y_mm], [fridge.x_mm, fridge.y_mm], [sink.x_mm, sink.y_mm]],
        },
        tags: ['kitchen', 'ergonomie'],
      })
      score -= 8
    }

    if (tooLong) {
      findings.push({
        id: randomUUID(),
        system: 'west',
        severity: 'warn',
        title: 'Küchenarbeitsdreieck: zu lange Wege',
        reason: 'Mindestens eine Strecke zwischen Spüle/Herd/Kühlschrank ist > 3000 mm.',
        recommendation: 'Geräte/Spüle näher zusammenführen oder Laufwege durch Insel/Umstellung verkürzen.',
        score_impact: -6,
        object_refs: [
          { placement_id: sink.placement_id },
          { placement_id: hob.placement_id },
          { placement_id: fridge.placement_id },
        ],
        geometry: {
          type: 'LineString',
          coordinates: [[sink.x_mm, sink.y_mm], [hob.x_mm, hob.y_mm], [fridge.x_mm, fridge.y_mm], [sink.x_mm, sink.y_mm]],
        },
        tags: ['kitchen', 'flow'],
      })
      score -= 6
    }

    if (!tooShort && !tooLong && sum >= 3600 && sum <= 7800) {
      findings.push({
        id: randomUUID(),
        system: 'west',
        severity: 'info',
        title: 'Küchenarbeitsdreieck: gute Wegeführung',
        reason: 'Abstände zwischen Spüle/Herd/Kühlschrank liegen im sinnvollen Korridor.',
        recommendation: 'So belassen – beim Feintuning Öffnungsradien & Passagen prüfen.',
        tags: ['kitchen', 'ergonomie'],
      })
    }
  } else {
    findings.push({
      id: randomUUID(),
      system: 'west',
      severity: 'info',
      title: 'Küchenarbeitsdreieck: Daten fehlen',
      reason: 'Spüle/Herd/Kühlschrank konnten nicht sicher erkannt werden.',
      recommendation: 'Placements taggen (sink/hob/fridge) oder Zuordnung im UI auswählen.',
      tags: ['kitchen', 'setup'],
    })
    score -= 2
  }

  return { findings, score: Math.max(0, Math.min(100, score)) }
}

/**
 * ÖSTLICH: Minimal-Findings V1
 * - Eingang vorhanden? sonst info
 * - Eingang liegt in welcher Bagua-Zelle?
 */
export function buildEastFindings(input: FengShuiAnalyzeInput, baguaGeoJson: any) {
  const findings: any[] = []
  let score = 100

  if (!input.entry) {
    findings.push({
      id: randomUUID(),
      system: 'east',
      severity: 'info',
      title: 'Eingang nicht gesetzt',
      reason: 'Für klassische Feng-Shui-Auswertung ist der Haupt-Eingang ein zentraler Referenzpunkt.',
      recommendation: 'Im FengShui-Panel den Haupt-Eingang (Tür) wählen oder Punkt setzen.',
      tags: ['entry', 'setup'],
    })
    score -= 5
    return { findings, score }
  }

  const pt = input.entry
  const zone = baguaGeoJson.features.find((f: any) => {
    const ring = f.geometry.coordinates[0]
    const x0 = ring[0][0], y0 = ring[0][1]
    const x1 = ring[2][0], y1 = ring[2][1]
    return pt.x_mm >= x0 && pt.x_mm <= x1 && pt.y_mm >= y0 && pt.y_mm <= y1
  })

  if (zone) {
    findings.push({
      id: randomUUID(),
      system: 'east',
      severity: 'info',
      title: `Eingang-Zuordnung: ${zone.properties.label}`,
      reason: 'Bagua-Zuordnung basiert auf Bounding-Box (V1).',
      recommendation: 'Für exaktere Zuordnung später: Polygon-Clipping auf Raumkontur aktivieren.',
      geometry: { type: 'Point', coordinates: [pt.x_mm, pt.y_mm] },
      tags: ['bagua', 'entry'],
    })
  }

  return { findings, score: Math.max(0, Math.min(100, score)) }
}

export function analyzeFengShui(input: FengShuiAnalyzeInput): FengShuiAnalyzeResult {
  const zones: any[] = []
  const findings: any[] = []

  let scoreWest = 0
  let scoreEast = 0

  let bagua: any | null = null
  if (input.mode === 'east' || input.mode === 'both') {
    bagua = buildBaguaZones(input.bounds_mm, input.compass_deg)
    zones.push(...bagua.features)
    const east = buildEastFindings(input, bagua)
    findings.push(...east.findings)
    scoreEast = east.score
  }

  if (input.mode === 'west' || input.mode === 'both') {
    const west = buildWestFindings(input)
    findings.push(...west.findings)
    scoreWest = west.score
  }

  const total =
    input.mode === 'both'
      ? Math.round((scoreWest + scoreEast) / 2)
      : (input.mode === 'west' ? scoreWest : scoreEast)

  return {
    zones_geojson: { type: 'FeatureCollection', features: zones, mode: input.mode, compass_deg: input.compass_deg, bounds_mm: input.bounds_mm },
    findings,
    score_total: total,
    score_west: scoreWest,
    score_east: scoreEast,
  }
}
