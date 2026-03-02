export interface DwgImportResult {
  wall_segments: Array<{ x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }>
  needs_review: boolean
  warnings: string[]
}

const KNOWN_DWG_HEADERS = new Set(['AC1015', 'AC1018', 'AC1021', 'AC1024', 'AC1027', 'AC1032'])

const LINE_ENTITY_REGEX =
  /\s*0\s*\nLINE\s*\n(?:[\s\S]*?)10\s*\n\s*([\d.+-]+)\s*\n\s*20\s*\n\s*([\d.+-]+)\s*\n(?:[\s\S]*?)11\s*\n\s*([\d.+-]+)\s*\n\s*21\s*\n\s*([\d.+-]+)/gm

/**
 * Parses DWG/DXF content and extracts line-based wall segments.
 * DWG binary parsing is best-effort only and always flagged for review.
 */
export async function parseDwgBuffer(buffer: Buffer, filename: string): Promise<DwgImportResult> {
  const warnings: string[] = []
  const lower = filename.toLowerCase()
  const isDwg = lower.endsWith('.dwg')

  if (isDwg) {
    warnings.push('DWG-Binärformat: Konvertierung nach DXF (Best-Effort, needs_review=true)')

    const header = buffer.subarray(0, 6).toString('ascii')
    if (!KNOWN_DWG_HEADERS.has(header)) {
      throw new Error('Unbekannte DWG-Version oder kein DWG-Format')
    }

    return {
      wall_segments: [],
      needs_review: true,
      warnings: [...warnings, 'DWG-Binary-Parse nicht vollständig implementiert – bitte DXF verwenden'],
    }
  }

  const dxfText = buffer.toString('utf-8')
  const wallSegments: Array<{ x0_mm: number; y0_mm: number; x1_mm: number; y1_mm: number }> = []

  let match: RegExpExecArray | null
  while ((match = LINE_ENTITY_REGEX.exec(dxfText)) !== null) {
    const x0 = Number.parseFloat(match[1] ?? '')
    const y0 = Number.parseFloat(match[2] ?? '')
    const x1 = Number.parseFloat(match[3] ?? '')
    const y1 = Number.parseFloat(match[4] ?? '')

    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
      continue
    }

    wallSegments.push({
      x0_mm: Math.round(x0),
      y0_mm: Math.round(y0),
      x1_mm: Math.round(x1),
      y1_mm: Math.round(y1),
    })
  }

  if (wallSegments.length === 0) {
    warnings.push('Keine LINE-Entities in DXF gefunden')
  }

  return {
    wall_segments: wallSegments,
    needs_review: false,
    warnings,
  }
}
