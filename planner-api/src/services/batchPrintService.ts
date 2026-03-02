/**
 * batchPrintService.ts – Sprint 44
 *
 * Generates a merged PDF from a list of form template IDs for a given
 * alternative.  Each form_id becomes a labelled page in the output PDF.
 * When grayscale is true the page header marks the export as B/W (contours
 * only – no fill colours).
 *
 * The PDF is produced with the same minimal hand-written PDF approach used by
 * pdfGenerator.ts (no external PDF library required).
 */

function escapePdfText(value: string): string {
    return value
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
}

function buildPageStream(formId: string, pageIndex: number, grayscale: boolean): string {
    const mode = grayscale ? 'S/W-Ausdruck' : 'Farbausdruck'
    const label = `Formular ${pageIndex + 1}: ${formId}`
    const commands = [
        'BT',
        `/F1 14 Tf`,
        `1 0 0 1 50 790 Tm`,
        `(${escapePdfText(label)}) Tj`,
        `/F1 11 Tf`,
        `1 0 0 1 50 770 Tm`,
        `(${escapePdfText(mode)}) Tj`,
        'ET',
    ]
    return commands.join('\n')
}

function toPdfBuffer(contentStreams: string[]): Buffer {
    const objects: string[] = []

    objects.push('<< /Type /Catalog /Pages 2 0 R >>')
    objects.push(
        `<< /Type /Pages /Count ${contentStreams.length} /Kids [${contentStreams
            .map((_, i) => `${4 + i * 2} 0 R`)
            .join(' ')}] >>`,
    )
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

    contentStreams.forEach((stream) => {
        const pageObjectId = objects.length + 1
        const contentObjectId = pageObjectId + 1

        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
        )
        objects.push(
            `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
        )
    })

    let pdf = '%PDF-1.4\n'
    const offsets: number[] = [0]

    objects.forEach((obj, i) => {
        offsets.push(Buffer.byteLength(pdf, 'utf8'))
        pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
    })

    const xrefOffset = Buffer.byteLength(pdf, 'utf8')
    pdf += `xref\n0 ${objects.length + 1}\n`
    pdf += '0000000000 65535 f \n'
    offsets.slice(1).forEach((off) => {
        pdf += `${String(off).padStart(10, '0')} 00000 n \n`
    })
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

    return Buffer.from(pdf, 'utf8')
}

export interface BatchPrintOptions {
    formIds: string[]
    grayscale?: boolean
}

/**
 * Builds a merged PDF containing one page per form template ID.
 *
 * @param options  List of form template IDs and optional B/W flag
 * @returns        PDF as a Buffer
 */
export function buildBatchPdf(options: BatchPrintOptions): Buffer {
    const { formIds, grayscale = false } = options

    const streams = formIds.map((fid, i) => buildPageStream(fid, i, grayscale))
    return toPdfBuffer(streams)
}
