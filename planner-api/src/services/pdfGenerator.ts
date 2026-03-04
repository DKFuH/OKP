import { resolveLocaleCode, type SupportedLocaleCode } from './localeSupport.js'

type QuotePdfItem = {
  position: number
  description: string
  qty: number
  unit: string
  unit_price_net: number
  line_net: number
  tax_rate: number
  line_gross?: number
  show_on_quote: boolean
}

type QuotePdfSnapshot = {
  subtotal_net?: number
  vat_amount?: number
  total_gross?: number
} | null | undefined

export type PdfSender = {
  company_name: string
  street?: string
  zip?: string
  city?: string
  phone?: string
  email?: string
  web?: string
  vat_id?: string
  tax_number?: string
  iban?: string
  bic?: string
  bank_name?: string
}

export type PdfRecipient = {
  name: string
  street?: string
  zip?: string
  city?: string
  email?: string
}

export type QuotePdfInput = {
  locale_code?: string | null
  quote_number: string
  version: number
  valid_until: string | Date
  free_text: string | null
  footer_text: string | null
  items: QuotePdfItem[]
  price_snapshot?: QuotePdfSnapshot
  sender?: PdfSender
  recipient?: PdfRecipient
}

export type CutlistPdfPart = {
  label: string
  width_mm: number
  height_mm: number
  quantity: number
  material_code: string
  grain_direction: 'none' | 'length' | 'width'
  article_name: string
}

export type CutlistPdfSummary = {
  total_parts: number
  by_material: Record<string, { count: number; area_sqm: number; material_label: string }>
}

export type CutlistPdfInput = {
  locale_code?: string | null
  project_name: string
  room_name?: string
  generated_at: string | Date
  parts: CutlistPdfPart[]
  summary: CutlistPdfSummary
}

type PdfLine = {
  text: string
  size: number
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

function escapePdfText(value: string): string {
  return sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function formatDate(value: string | Date, localeCode: SupportedLocaleCode): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return localeCode === 'en' ? 'unknown' : 'unbekannt'
  }

  return date.toLocaleDateString(localeCode === 'en' ? 'en-GB' : 'de-DE')
}

function formatAmount(value: number, localeCode: SupportedLocaleCode): string {
  const fixed = value.toFixed(2)
  if (localeCode === 'en') {
    return `EUR ${fixed}`
  }

  return `${fixed} EUR`
}

const QUOTE_COPY: Record<SupportedLocaleCode, {
  heading: string
  validUntil: string
  positions: string
  noVisibleItems: string
  subtotalNet: string
  vat: string
  totalGross: string
  unitPriceShort: string
  linePriceShort: string
  vatId: string
  taxNumber: string
}> = {
  de: {
    heading: 'ANGEBOT',
    validUntil: 'Gueltig bis',
    positions: 'Positionen',
    noVisibleItems: 'Keine sichtbaren Positionen vorhanden.',
    subtotalNet: 'Zwischensumme netto',
    vat: 'MwSt 19%',
    totalGross: 'Gesamtbetrag brutto',
    unitPriceShort: 'EP',
    linePriceShort: 'GP',
    vatId: 'USt-IdNr',
    taxNumber: 'St-Nr',
  },
  en: {
    heading: 'QUOTE',
    validUntil: 'Valid until',
    positions: 'Items',
    noVisibleItems: 'No visible items available.',
    subtotalNet: 'Subtotal net',
    vat: 'VAT 19%',
    totalGross: 'Total gross',
    unitPriceShort: 'Unit',
    linePriceShort: 'Line',
    vatId: 'VAT ID',
    taxNumber: 'Tax No',
  },
}

function wrapText(value: string, maxChars: number): string[] {
  const sanitized = sanitizePdfText(value)
  if (!sanitized) {
    return []
  }

  const words = sanitized.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (candidate.length <= maxChars) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }
    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function toVisibleItems(items: QuotePdfItem[]): QuotePdfItem[] {
  return items.filter((item) => item.show_on_quote !== false)
}

function resolveTotals(items: QuotePdfItem[], snapshot?: QuotePdfSnapshot) {
  if (
    snapshot &&
    typeof snapshot.subtotal_net === 'number' &&
    typeof snapshot.vat_amount === 'number' &&
    typeof snapshot.total_gross === 'number'
  ) {
    return {
      subtotalNet: snapshot.subtotal_net,
      vatAmount: snapshot.vat_amount,
      totalGross: snapshot.total_gross,
    }
  }

  const subtotalNet = items.reduce((sum, item) => sum + item.line_net, 0)
  const totalGross = items.reduce(
    (sum, item) => sum + (typeof item.line_gross === 'number' ? item.line_gross : item.line_net * (1 + item.tax_rate)),
    0,
  )

  return {
    subtotalNet,
    vatAmount: totalGross - subtotalNet,
    totalGross,
  }
}

function renderItemLines(item: QuotePdfItem, localeCode: SupportedLocaleCode): PdfLine[] {
  const copy = QUOTE_COPY[localeCode]
  const descriptionLines = wrapText(item.description, 42)
  const firstDescription = descriptionLines[0] ?? ''
  const remainingDescriptions = descriptionLines.slice(1)
  const prefix = `${String(item.position).padStart(2, '0')}  `
  const detail = `${item.qty} ${item.unit}  ${copy.unitPriceShort} ${formatAmount(item.unit_price_net, localeCode)}  ${copy.linePriceShort} ${formatAmount(item.line_net, localeCode)}`

  const lines: PdfLine[] = [
    {
      text: `${prefix}${firstDescription}  ${detail}`,
      size: 11,
    },
  ]

  remainingDescriptions.forEach((line) => {
    lines.push({
      text: `    ${line}`,
      size: 11,
    })
  })

  return lines
}

function renderQuoteLines(input: QuotePdfInput): PdfLine[] {
  const localeCode = resolveLocaleCode({ requested: input.locale_code })
  const copy = QUOTE_COPY[localeCode]
  const visibleItems = toVisibleItems(input.items)
  const totals = resolveTotals(visibleItems, input.price_snapshot)
  const lines: PdfLine[] = []

  // Kopfzeile mit Firmendaten (links) und Angebotsdaten (rechts)
  if (input.sender) {
    lines.push({ text: input.sender.company_name, size: 18 })
    const addrParts: string[] = []
    if (input.sender.street) addrParts.push(input.sender.street)
    const cityLine = [input.sender.zip, input.sender.city].filter(Boolean).join(' ')
    if (cityLine) addrParts.push(cityLine)
    if (input.sender.phone) addrParts.push(`Tel: ${input.sender.phone}`)
    if (input.sender.web) addrParts.push(input.sender.web)
    addrParts.forEach((part) => lines.push({ text: part, size: 9 }))
    lines.push({ text: '', size: 9 })
  }

  lines.push({ text: `${copy.heading} ${input.quote_number}`, size: 16 })
  lines.push({ text: `Version ${input.version}`, size: 11 })
  lines.push({ text: `${copy.validUntil}: ${formatDate(input.valid_until, localeCode)}`, size: 11 })
  lines.push({ text: '', size: 11 })

  // Empfängerblock
  if (input.recipient) {
    if (input.sender) {
      const senderMini = [input.sender.company_name, input.sender.street, [input.sender.zip, input.sender.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
      lines.push({ text: senderMini, size: 7 })
    }
    lines.push({ text: input.recipient.name, size: 10 })
    if (input.recipient.street) lines.push({ text: input.recipient.street, size: 10 })
    const recipientCity = [input.recipient.zip, input.recipient.city].filter(Boolean).join(' ')
    if (recipientCity) lines.push({ text: recipientCity, size: 10 })
    lines.push({ text: '', size: 10 })
  }

  wrapText(input.free_text ?? '', 88).forEach((line) => {
    lines.push({ text: line, size: 11 })
  })

  if (input.free_text) {
    lines.push({ text: '', size: 11 })
  }

  lines.push({ text: copy.positions, size: 13 })

  if (visibleItems.length === 0) {
    lines.push({ text: copy.noVisibleItems, size: 11 })
  } else {
    visibleItems.forEach((item) => {
      lines.push(...renderItemLines(item, localeCode))
    })
  }

  lines.push({ text: '', size: 11 })
  lines.push({ text: `${copy.subtotalNet}: ${formatAmount(totals.subtotalNet, localeCode)}`, size: 11 })
  lines.push({ text: `${copy.vat}: ${formatAmount(totals.vatAmount, localeCode)}`, size: 11 })
  lines.push({ text: `${copy.totalGross}: ${formatAmount(totals.totalGross, localeCode)}`, size: 12 })

  // Fußzeile: Bankverbindung + USt + quote_footer / footer_text
  const hasBankInfo = input.sender && (input.sender.bank_name || input.sender.iban || input.sender.bic)
  const hasTaxInfo = input.sender && (input.sender.vat_id || input.sender.tax_number)
  if (hasBankInfo || hasTaxInfo) {
    lines.push({ text: '', size: 11 })
    if (hasBankInfo && input.sender) {
      const bankParts: string[] = []
      if (input.sender.bank_name) bankParts.push(input.sender.bank_name)
      if (input.sender.iban) bankParts.push(`IBAN ${input.sender.iban}`)
      if (input.sender.bic) bankParts.push(`BIC ${input.sender.bic}`)
      lines.push({ text: bankParts.join(' · '), size: 9 })
    }
    if (hasTaxInfo && input.sender) {
      const taxParts: string[] = []
      if (input.sender.vat_id) taxParts.push(`${copy.vatId}: ${input.sender.vat_id}`)
      if (input.sender.tax_number) taxParts.push(`${copy.taxNumber}: ${input.sender.tax_number}`)
      lines.push({ text: taxParts.join(' | '), size: 9 })
    }
  }

  const effectiveFooter = input.footer_text ?? null
  const footerLines = wrapText(effectiveFooter ?? '', 88)
  if (footerLines.length > 0) {
    lines.push({ text: '', size: 11 })
    footerLines.forEach((line) => {
      lines.push({ text: line, size: 11 })
    })
  }

  return lines
}

function cutlistGrainLabel(value: CutlistPdfPart['grain_direction'], localeCode: SupportedLocaleCode): string {
  if (localeCode === 'en') {
    if (value === 'length') return 'length'
    if (value === 'width') return 'width'
    return 'none'
  }

  if (value === 'length') return 'laengs'
  if (value === 'width') return 'quer'
  return 'kein'
}

function renderCutlistLines(input: CutlistPdfInput): PdfLine[] {
  const localeCode = resolveLocaleCode({ requested: input.locale_code })
  const lines: PdfLine[] = []

  lines.push({ text: localeCode === 'en' ? 'CUTLIST' : 'ZUSCHNITTLISTE', size: 16 })
  lines.push({ text: `${localeCode === 'en' ? 'Project' : 'Projekt'}: ${input.project_name}`, size: 11 })
  if (input.room_name) {
    lines.push({ text: `${localeCode === 'en' ? 'Room' : 'Raum'}: ${input.room_name}`, size: 11 })
  }
  lines.push({ text: `${localeCode === 'en' ? 'Date' : 'Datum'}: ${formatDate(input.generated_at, localeCode)}`, size: 11 })
  lines.push({ text: '', size: 11 })
  lines.push({
    text: localeCode === 'en'
      ? 'No | Label | WxH mm | Quantity | Material | Grain'
      : 'Nr | Bezeichnung | BxH mm | Anzahl | Material | Korn',
    size: 11,
  })

  if (input.parts.length === 0) {
    lines.push({ text: localeCode === 'en' ? 'No parts available.' : 'Keine Teile vorhanden.', size: 11 })
  } else {
    input.parts.forEach((part, index) => {
      const line = `${index + 1} | ${part.label} | ${part.width_mm}x${part.height_mm} | ${part.quantity} | ${part.material_code} | ${cutlistGrainLabel(part.grain_direction, localeCode)}`
      wrapText(line, 88).forEach((wrapped) => lines.push({ text: wrapped, size: 10 }))
    })
  }

  lines.push({ text: '', size: 11 })
  lines.push({ text: `${localeCode === 'en' ? 'Total parts' : 'Gesamtteile'}: ${input.summary.total_parts}`, size: 11 })
  lines.push({ text: localeCode === 'en' ? 'Material summary:' : 'Material-Zusammenfassung:', size: 11 })

  const materialEntries = Object.entries(input.summary.by_material)
  if (materialEntries.length === 0) {
    lines.push({ text: localeCode === 'en' ? '- no materials -' : '- keine Materialien -', size: 10 })
  } else {
    for (const [code, data] of materialEntries) {
      lines.push({
        text: localeCode === 'en'
          ? `${code}: ${data.count} parts, ${data.area_sqm.toFixed(3)} m2`
          : `${code}: ${data.count} Teile, ${data.area_sqm.toFixed(3)} m2`,
        size: 10,
      })
    }
  }

  return lines
}

function paginate(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = []
  let currentPage: PdfLine[] = []
  let lineBudget = 0

  lines.forEach((line) => {
    const cost = line.size >= 16 ? 2 : 1

    if (lineBudget + cost > 42 && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      lineBudget = 0
    }

    currentPage.push(line)
    lineBudget += cost
  })

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

function buildContentStream(lines: PdfLine[]): string {
  const commands = ['BT']
  let y = 790

  lines.forEach((line) => {
    if (!line.text) {
      y -= 14
      return
    }

    commands.push(`/F1 ${line.size} Tf`)
    commands.push(`1 0 0 1 50 ${y} Tm`)
    commands.push(`(${escapePdfText(line.text)}) Tj`)
    y -= line.size >= 16 ? 22 : 14
  })

  commands.push('ET')
  return commands.join('\n')
}

function toPdfBuffer(contentStreams: string[]): Buffer {
  const objects: string[] = []
  const pageRefs: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Count ${contentStreams.length} /Kids [${contentStreams.map((_, index) => `${4 + index * 2} 0 R`).join(' ')}] >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  contentStreams.forEach((stream, index) => {
    const pageObjectId = 4 + index * 2
    const contentObjectId = pageObjectId + 1
    pageRefs.push(`${pageObjectId} 0 R`)

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    )
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}

export function buildQuotePdf(input: QuotePdfInput): Buffer {
  const lines = renderQuoteLines(input)
  const pages = paginate(lines)
  const contentStreams = pages.map((page) => buildContentStream(page))
  return toPdfBuffer(contentStreams)
}

export function buildCutlistPdf(input: CutlistPdfInput): Buffer {
  const lines = renderCutlistLines(input)
  const pages = paginate(lines)
  const contentStreams = pages.map((page) => buildContentStream(page))
  return toPdfBuffer(contentStreams)
}
