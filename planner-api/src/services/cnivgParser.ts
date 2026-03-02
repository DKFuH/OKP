export interface CnivgHeader {
  version: string
  variable: string
  resolution_mm: number
  origin_x_mm: number
  origin_y_mm: number
  slice_height_mm: number
  cols: number
  rows: number
}

export interface CnivgParseResult {
  header: CnivgHeader
  values: number[][]
  min: number
  max: number
}

function parseLineValue(line: string): [string, string] | null {
  const idx = line.indexOf('=')
  if (idx < 0) {
    return null
  }

  const key = line.slice(0, idx).trim()
  const value = line.slice(idx + 1).trim()
  if (key.length === 0 || value.length === 0) {
    return null
  }

  return [key, value]
}

export function parseCnivg(content: string): CnivgParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const header: Partial<CnivgHeader> = {}
  let dataStartIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === 'DATA_START') {
      dataStartIdx = i + 1
      break
    }

    const keyValue = parseLineValue(line)
    if (!keyValue) {
      continue
    }

    const [key, value] = keyValue
    switch (key.toUpperCase()) {
      case 'CNIVG_VERSION':
        header.version = value
        break
      case 'VARIABLE':
        header.variable = value.toLowerCase()
        break
      case 'RESOLUTION_MM':
        header.resolution_mm = Number.parseFloat(value)
        break
      case 'ORIGIN_X':
        header.origin_x_mm = Number.parseFloat(value) * 1000
        break
      case 'ORIGIN_Y':
        header.origin_y_mm = Number.parseFloat(value) * 1000
        break
      case 'SLICE_HEIGHT':
        header.slice_height_mm = Number.parseFloat(value) * 1000
        break
      case 'COLS':
        header.cols = Number.parseInt(value, 10)
        break
      case 'ROWS':
        header.rows = Number.parseInt(value, 10)
        break
      default:
        break
    }
  }

  if (header.cols == null || header.rows == null) {
    throw new Error('CNIVG: COLS/ROWS fehlen im Header')
  }

  if (dataStartIdx < 0) {
    throw new Error('CNIVG: DATA_START nicht gefunden')
  }

  const values: number[][] = []
  let min = Infinity
  let max = -Infinity

  for (let rowIdx = 0; rowIdx < header.rows; rowIdx++) {
    const line = lines[dataStartIdx + rowIdx]
    if (!line || line === 'DATA_END') {
      break
    }

    const row = line
      .split(/\s+/)
      .map((entry) => Number.parseFloat(entry))

    values.push(row)

    for (const value of row) {
      if (!Number.isFinite(value)) {
        continue
      }

      if (value < min) {
        min = value
      }

      if (value > max) {
        max = value
      }
    }
  }

  return {
    header: {
      version: header.version ?? '1.0',
      variable: header.variable ?? 'spl_db',
      resolution_mm: header.resolution_mm ?? 500,
      origin_x_mm: header.origin_x_mm ?? 0,
      origin_y_mm: header.origin_y_mm ?? 0,
      slice_height_mm: header.slice_height_mm ?? 1200,
      cols: header.cols,
      rows: header.rows,
    },
    values,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  }
}

export function valueToColor(value: number, min: number, max: number): [number, number, number] {
  if (max === min) {
    return [128, 128, 128]
  }

  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))

  const red = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3))))
  const green = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2))))
  const blue = Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1))))

  return [red, green, blue]
}