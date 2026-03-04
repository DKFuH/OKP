import type { PrismaClient } from '@prisma/client'
import { resolveLocaleCode, type SupportedLocaleCode } from './localeSupport.js'

export interface SpecificationSectionResult {
  key: string
  title: string
  page_count: number
  artifact_type: 'pdf' | 'csv' | 'dxf' | 'json'
}

type PackageConfig = {
  sections?: string[]
  include_cover_page?: boolean
  include_company_profile?: boolean
}

function escapePdfText(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function toPdfBuffer(pageLines: string[][]): Buffer {
  const objects: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(
    `<< /Type /Pages /Count ${pageLines.length} /Kids [${pageLines
      .map((_, i) => `${4 + i * 2} 0 R`)
      .join(' ')}] >>`,
  )
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  for (const lines of pageLines) {
    const commands: string[] = ['BT', '/F1 13 Tf']
    let y = 790
    for (const line of lines) {
      commands.push(`1 0 0 1 50 ${y} Tm`)
      commands.push(`(${escapePdfText(line)}) Tj`)
      y -= 22
    }
    commands.push('ET')

    const stream = commands.join('\n')
    const pageObjectId = objects.length + 1
    const contentObjectId = pageObjectId + 1

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    )
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`)
  }

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
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

function resolveSections(config: PackageConfig): string[] {
  const defaults = ['quote', 'bom', 'cutlist', 'layout_sheets']
  const input = Array.isArray(config.sections) ? config.sections : defaults
  return input.filter((value): value is string => typeof value === 'string' && value.length > 0)
}

const SECTION_TITLES: Record<SupportedLocaleCode, Record<string, string>> = {
  de: {
    quote: 'Angebot',
    bom: 'Stueckliste',
    cutlist: 'Zuschnittliste',
    layout_sheets: 'Layout-Sheets',
    nesting: 'Nesting-Anlagen',
  },
  en: {
    quote: 'Quote',
    bom: 'Bill of Materials',
    cutlist: 'Cutlist',
    layout_sheets: 'Layout Sheets',
    nesting: 'Nesting Files',
  },
}

function titleForSection(section: string, localeCode: SupportedLocaleCode): string {
  return SECTION_TITLES[localeCode][section] ?? section
}

export async function generateSpecificationPackage(
  prisma: PrismaClient,
  projectId: string,
  packageId: string,
  config: PackageConfig,
  localeCodeInput?: string | null,
): Promise<{
  merged_pdf: Buffer
  sections: SpecificationSectionResult[]
}> {
  const localeCode = resolveLocaleCode({ requested: localeCodeInput })
  const sections = resolveSections(config)
  const summary: SpecificationSectionResult[] = []

  const quoteCount = await prisma.quote.count({ where: { project_id: projectId } })
  const roomCount = await prisma.room.count({ where: { project_id: projectId } })
  const cutlistCount = await prisma.cutlist.count({ where: { project_id: projectId } })
  const nestingCount = await prisma.nestingJob.count({ where: { project_id: projectId } })
  const sheetCount = await prisma.layoutSheet.count({ where: { project_id: projectId } })

  for (const section of sections) {
    if (section === 'quote' && quoteCount > 0) {
      summary.push({ key: 'quote', title: titleForSection('quote', localeCode), page_count: 1, artifact_type: 'pdf' })
      continue
    }

    if (section === 'bom' && roomCount > 0) {
      summary.push({ key: 'bom', title: titleForSection('bom', localeCode), page_count: 1, artifact_type: 'pdf' })
      continue
    }

    if (section === 'cutlist' && cutlistCount > 0) {
      summary.push({ key: 'cutlist', title: titleForSection('cutlist', localeCode), page_count: 1, artifact_type: 'pdf' })
      continue
    }

    if (section === 'layout_sheets' && sheetCount > 0) {
      summary.push({ key: 'layout_sheets', title: titleForSection('layout_sheets', localeCode), page_count: 1, artifact_type: 'pdf' })
      continue
    }

    if (section === 'nesting' && nestingCount > 0) {
      summary.push({ key: 'nesting', title: titleForSection('nesting', localeCode), page_count: 1, artifact_type: 'json' })
    }
  }

  const pages: string[][] = []

  if (config.include_cover_page !== false) {
    pages.push([
      localeCode === 'en' ? 'Workshop Package' : 'Werkstattpaket',
      `${localeCode === 'en' ? 'Project' : 'Projekt'}: ${projectId}`,
      `${localeCode === 'en' ? 'Package' : 'Paket'}: ${packageId}`,
      `${localeCode === 'en' ? 'Generated at' : 'Generiert am'}: ${new Date().toLocaleString(localeCode === 'en' ? 'en-GB' : 'de-DE')}`,
    ])
  }

  for (const item of summary) {
    if (item.artifact_type !== 'pdf') continue
    pages.push([
      item.title,
      `Section-Key: ${item.key}`,
      localeCode === 'en' ? 'V1 reference page for specification packages' : 'V1-Referenzseite fuer Spezifikationspakete',
    ])
  }

  if (pages.length === 0) {
    pages.push([
      localeCode === 'en' ? 'Workshop Package' : 'Werkstattpaket',
      localeCode === 'en' ? 'No printable sections available' : 'Keine druckbaren Abschnitte vorhanden',
      localeCode === 'en' ? 'Please review package configuration or project data' : 'Bitte Paketkonfiguration oder Projektdaten pruefen',
    ])
  }

  return {
    merged_pdf: toPdfBuffer(pages),
    sections: summary,
  }
}
