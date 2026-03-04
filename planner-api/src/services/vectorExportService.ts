type NumericPoint = {
  x: number
  y: number
}

type RoomVertex = {
  x_mm?: unknown
  y_mm?: unknown
  x?: unknown
  y?: unknown
}

type RoomBoundaryShape = {
  vertices?: unknown
}

type PlanSvgInput = {
  projectName: string
  roomName?: string | null
  vertices: NumericPoint[]
  localeCode: 'de' | 'en'
  levelId?: string | null
  levelName?: string | null
  sectionLine?: {
    id: string
    label?: string
    start: { x_mm: number; y_mm: number }
    end: { x_mm: number; y_mm: number }
    direction?: string
    depth_mm?: number
    level_scope?: string
    level_id?: string
    sheet_visibility?: string
  } | null
}

type LayoutSheetSvgInput = {
  sheetName: string
  localeCode: 'de' | 'en'
  showArcAnnotation: boolean
  arcLabel?: string
  showNorthArrow: boolean
  northAngleDeg: number
  levelId?: string | null
  levelName?: string | null
  sectionLineId?: string | null
  sectionLabel?: string | null
}

type HtmlViewerInput = {
  projectId: string
  projectName: string
  roomName?: string | null
  vertices: NumericPoint[]
  localeCode: 'de' | 'en'
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return value
}

function parseJsonValue<T>(value: unknown): T | null {
  if (typeof value !== 'string') {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function parseBoundaryShape(boundary: unknown): RoomBoundaryShape | null {
  if (boundary && typeof boundary === 'object' && !Array.isArray(boundary)) {
    return boundary as RoomBoundaryShape
  }

  return parseJsonValue<RoomBoundaryShape>(boundary)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtml(value: string): string {
  return escapeXml(value)
}

function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

function toSvgPoints(vertices: NumericPoint[]): string {
  return vertices.map((vertex) => `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`).join(' ')
}

function normalizePlanVertices(vertices: NumericPoint[]): NumericPoint[] {
  if (vertices.length < 3) {
    return []
  }

  const minX = Math.min(...vertices.map((point) => point.x))
  const maxX = Math.max(...vertices.map((point) => point.x))
  const minY = Math.min(...vertices.map((point) => point.y))
  const maxY = Math.max(...vertices.map((point) => point.y))
  const width = maxX - minX
  const height = maxY - minY

  if (width <= 0 || height <= 0) {
    return []
  }

  const canvasWidth = 800
  const canvasHeight = 500
  const margin = 40
  const scale = Math.min(
    (canvasWidth - margin * 2) / width,
    (canvasHeight - margin * 2) / height,
  )

  return vertices.map((vertex) => ({
    x: margin + (vertex.x - minX) * scale,
    y: margin + (vertex.y - minY) * scale,
  }))
}

export function extractBoundaryVertices(boundary: unknown): NumericPoint[] {
  const shape = parseBoundaryShape(boundary)
  const rawVertices = shape?.vertices
  if (!Array.isArray(rawVertices)) {
    return []
  }

  const parsed: NumericPoint[] = []

  for (const rawVertex of rawVertices) {
    if (!rawVertex || typeof rawVertex !== 'object') {
      continue
    }

    const vertex = rawVertex as RoomVertex
    const x = toFiniteNumber(vertex.x_mm) ?? toFiniteNumber(vertex.x)
    const y = toFiniteNumber(vertex.y_mm) ?? toFiniteNumber(vertex.y)

    if (x === null || y === null) {
      continue
    }

    parsed.push({ x, y })
  }

  return parsed
}

export function renderPlanSvg(input: PlanSvgInput): string {
  const normalized = normalizePlanVertices(input.vertices)
  const metadataPayload = {
    locale_code: input.localeCode,
    level_id: input.levelId ?? null,
    level_name: input.levelName ?? null,
    section_line: input.sectionLine
      ? {
          id: input.sectionLine.id,
          label: input.sectionLine.label ?? null,
          direction: input.sectionLine.direction ?? null,
          depth_mm: input.sectionLine.depth_mm ?? null,
          level_scope: input.sectionLine.level_scope ?? null,
          level_id: input.sectionLine.level_id ?? null,
          sheet_visibility: input.sectionLine.sheet_visibility ?? null,
          start: input.sectionLine.start,
          end: input.sectionLine.end,
        }
      : null,
  }

  if (normalized.length < 3) {
    const fallbackText = input.localeCode === 'en' ? 'No valid room geometry available' : 'Keine gueltige Raumgeometrie vorhanden'
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <metadata id="okp-metadata">${escapeXml(JSON.stringify(metadataPayload))}</metadata>
  <rect x="0" y="0" width="900" height="600" fill="#ffffff" />
  <text x="40" y="60" font-size="24" font-family="Arial">${escapeXml(input.projectName)}</text>
  <text x="40" y="100" font-size="16" font-family="Arial">${escapeXml(fallbackText)}</text>
</svg>`
  }

  const roomLabel = input.roomName ? ` \u2014 ${input.roomName}` : ''
  const levelLabel = input.levelName ? ` · ${input.levelName}` : ''

  const minX = Math.min(...input.vertices.map((point) => point.x))
  const maxX = Math.max(...input.vertices.map((point) => point.x))
  const minY = Math.min(...input.vertices.map((point) => point.y))
  const maxY = Math.max(...input.vertices.map((point) => point.y))
  const width = maxX - minX
  const height = maxY - minY
  const margin = 40
  const scale = width > 0 && height > 0
    ? Math.min((800 - margin * 2) / width, (500 - margin * 2) / height)
    : 1

  const sectionOverlay = input.sectionLine
    ? `<line
      x1="${(margin + (input.sectionLine.start.x_mm - minX) * scale).toFixed(2)}"
      y1="${(margin + (input.sectionLine.start.y_mm - minY) * scale).toFixed(2)}"
      x2="${(margin + (input.sectionLine.end.x_mm - minX) * scale).toFixed(2)}"
      y2="${(margin + (input.sectionLine.end.y_mm - minY) * scale).toFixed(2)}"
      stroke="#0ea5e9"
      stroke-width="2"
      stroke-dasharray="8 4"
    />
    <text x="40" y="68" font-size="13" font-family="Arial" fill="#0369a1">${input.localeCode === 'en' ? 'Section' : 'Schnitt'}: ${escapeXml(input.sectionLine.label ?? input.sectionLine.id)}</text>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <metadata id="okp-metadata">${escapeXml(JSON.stringify(metadataPayload))}</metadata>
  <rect x="0" y="0" width="900" height="600" fill="#ffffff" />
  <text x="40" y="40" font-size="20" font-family="Arial">${escapeXml(input.projectName + roomLabel + levelLabel)}</text>
  <polygon points="${toSvgPoints(normalized)}" fill="#e2e8f0" stroke="#0f172a" stroke-width="2" />
  ${sectionOverlay}
</svg>`
}

export function renderLayoutSheetSvg(input: LayoutSheetSvgInput): string {
  const northArrowSvg = input.showNorthArrow
    ? `<g transform="translate(760 90) rotate(${input.northAngleDeg})">
  <line x1="0" y1="18" x2="0" y2="-18" stroke="#0f172a" stroke-width="2" />
  <polygon points="0,-30 -7,-16 7,-16" fill="#0f172a" />
  <text x="0" y="-36" text-anchor="middle" font-size="14" font-family="Arial">N</text>
</g>`
    : ''

  const arcText = input.showArcAnnotation
    ? `<text x="300" y="250" font-size="14" font-family="Arial">${escapeXml(input.arcLabel ?? 'R=1000 mm')}</text>`
    : ''

  const metadataPayload = {
    locale_code: input.localeCode,
    level_id: input.levelId ?? null,
    level_name: input.levelName ?? null,
    section_line_id: input.sectionLineId ?? null,
    section_label: input.sectionLabel ?? null,
  }

  const scopeText = [
    input.levelName ? `${input.localeCode === 'en' ? 'Level' : 'Ebene'}: ${input.levelName}` : null,
    input.sectionLabel ? `${input.localeCode === 'en' ? 'Section' : 'Schnitt'}: ${input.sectionLabel}` : null,
  ].filter((entry): entry is string => Boolean(entry)).join(' · ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <metadata id="okp-metadata">${escapeXml(JSON.stringify(metadataPayload))}</metadata>
  <rect x="0" y="0" width="900" height="600" fill="#ffffff" />
  <text x="40" y="40" font-size="20" font-family="Arial">${escapeXml(input.sheetName)}</text>
  ${scopeText ? `<text x="40" y="64" font-size="13" font-family="Arial" fill="#475569">${escapeXml(scopeText)}</text>` : ''}
  <path d="M 200 300 A 120 120 0 0 1 440 300" stroke="#1f2937" fill="none" stroke-width="2" />
  ${arcText}
  ${northArrowSvg}
</svg>`
}

export function renderHtmlViewer(input: HtmlViewerInput): string {
  const payload = {
    locale_code: input.localeCode,
    project_id: input.projectId,
    project_name: input.projectName,
    room_name: input.roomName ?? null,
    vertices_mm: input.vertices,
  }

  const pageTitleSuffix = input.localeCode === 'en' ? 'Viewer Export' : 'Viewer-Export'
  const introText = input.localeCode === 'en' ? 'Read-only viewer export.' : 'Schreibgeschuetzter Viewer-Export.'
  const ariaLabel = input.localeCode === 'en' ? 'Plan preview placeholder' : 'Plangrundriss-Vorschau'
  const fallbackText = input.localeCode === 'en' ? 'No valid room geometry available' : 'Keine gueltige Raumgeometrie vorhanden'

  return `<!doctype html>
<html lang="${escapeHtml(input.localeCode)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.projectName)} \u2013 ${escapeHtml(pageTitleSuffix)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; background: #f8fafc; color: #0f172a; }
    .frame { background: #ffffff; border: 1px solid #cbd5e1; padding: 12px; }
    canvas { width: 100%; max-width: 900px; height: 440px; border: 1px dashed #94a3b8; background: #ffffff; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.projectName)}</h1>
  <p>${escapeHtml(introText)}</p>
  <div class="frame">
    <canvas id="viewer-canvas" width="900" height="440" aria-label="${escapeHtml(ariaLabel)}"></canvas>
  </div>
  <script id="viewer-data" type="application/json">${escapeJsonForHtml(payload)}</script>
  <script>
    const raw = document.getElementById('viewer-data')?.textContent || '{}';
    const data = JSON.parse(raw);
    const canvas = document.getElementById('viewer-canvas');
    const ctx = canvas.getContext('2d');
    if (ctx && Array.isArray(data.vertices_mm) && data.vertices_mm.length >= 3) {
      const xs = data.vertices_mm.map((p) => Number(p.x) || 0);
      const ys = data.vertices_mm.map((p) => Number(p.y) || 0);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);
      const margin = 24;
      const scale = Math.min((canvas.width - margin * 2) / width, (canvas.height - margin * 2) / height);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.vertices_mm.forEach((p, idx) => {
        const px = margin + ((Number(p.x) || 0) - minX) * scale;
        const py = margin + ((Number(p.y) || 0) - minY) * scale;
        if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (ctx) {
      ctx.fillStyle = '#334155';
      ctx.font = '16px Arial';
      ctx.fillText(${JSON.stringify(fallbackText)}, 24, 36);
    }
  </script>
</body>
</html>`
}
