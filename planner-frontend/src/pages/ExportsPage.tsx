import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { exportHtmlViewer, exportLayoutSheetSvg, exportPlanSvg } from '../api/viewerExports.js'
import { useLocale } from '../hooks/useLocale.js'
import {
  VIEWER_EXPORT_ARTIFACTS,
  type ViewerExportArtifactKind,
} from '../plugins/viewerExport/index.js'

function sanitizeFilePart(value: string): string {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'export'
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

const useStyles = makeStyles({
  page: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'grid',
    rowGap: tokens.spacingVerticalXXL,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  actionRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  sheetRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-end',
  },
})

export function ExportsPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const { locale } = useLocale()
  const [sheetId, setSheetId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [sectionLineId, setSectionLineId] = useState('')
  const [exportLocale, setExportLocale] = useState<'de' | 'en'>(locale.startsWith('en') ? 'en' : 'de')
  const [loadingKind, setLoadingKind] = useState<ViewerExportArtifactKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const labelByKind = useMemo(() => new Map(VIEWER_EXPORT_ARTIFACTS.map((a) => [a.kind, a.label])), [])

  useEffect(() => { setExportLocale(locale.startsWith('en') ? 'en' : 'de') }, [locale])

  if (!projectId) return <Navigate to='/' replace />

  const requiredProjectId = projectId
  const projectSlug = sanitizeFilePart(requiredProjectId)
  const sheetSlug = sanitizeFilePart(sheetId || 'sheet')
  const scopedPayload = {
    ...(levelId.trim() ? { level_id: levelId.trim() } : {}),
    ...(sectionLineId.trim() ? { section_line_id: sectionLineId.trim() } : {}),
  }

  async function runExport(kind: ViewerExportArtifactKind) {
    setLoadingKind(kind)
    setError(null)
    setSuccess(null)
    try {
      if (kind === 'html-viewer') {
        triggerDownload(await exportHtmlViewer(requiredProjectId, exportLocale), `project-${projectSlug}-viewer.html`)
      } else if (kind === 'plan-svg') {
        triggerDownload(await exportPlanSvg(requiredProjectId, scopedPayload, exportLocale), `project-${projectSlug}-grundriss.svg`)
      } else {
        const normalizedSheetId = sheetId.trim()
        if (!normalizedSheetId) throw new Error('Bitte eine Layout-Sheet-ID eingeben')
        triggerDownload(await exportLayoutSheetSvg(normalizedSheetId, scopedPayload, exportLocale), `layout-sheet-${sheetSlug}.svg`)
      }
      setSuccess(`${labelByKind.get(kind) ?? 'Export'} erfolgreich heruntergeladen`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Export fehlgeschlagen')
    } finally {
      setLoadingKind(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title2>Viewer-Exports</Title2>
        <Button appearance='subtle' onClick={() => navigate(`/projects/${requiredProjectId}`)}>
          \u2190 Zur\u00fcck zum Editor
        </Button>
      </div>

      {error && <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {success && <MessageBar intent='success'><MessageBarBody>{success}</MessageBarBody></MessageBar>}

      <Card>
        <CardHeader header={<Body1Strong>Exportoptionen</Body1Strong>} />
        <div className={styles.actionRow}>
          <Field label='Sprache'>
            <Select value={exportLocale} onChange={(_e, d) => setExportLocale(d.value === 'en' ? 'en' : 'de')}>
              <Option value='de'>Deutsch</Option>
              <Option value='en'>English</Option>
            </Select>
          </Field>
          <Button appearance='primary' disabled={loadingKind !== null} onClick={() => void runExport('html-viewer')}>
            {loadingKind === 'html-viewer' ? <Spinner size='tiny' /> : 'HTML Viewer'}
          </Button>
          <Button appearance='primary' disabled={loadingKind !== null} onClick={() => void runExport('plan-svg')}>
            {loadingKind === 'plan-svg' ? <Spinner size='tiny' /> : 'SVG Grundriss'}
          </Button>
        </div>

        <div className={styles.sheetRow} style={{ marginTop: tokens.spacingVerticalM }}>
          <Field label='Layout-Sheet-ID (optional)'>
            <Input value={sheetId} onChange={(_e, d) => setSheetId(d.value)} placeholder='sheet-id' />
          </Field>
          <Field label='Level-ID (optional)'>
            <Input value={levelId} onChange={(_e, d) => setLevelId(d.value)} placeholder='level-id' />
          </Field>
          <Field label='Section-Line-ID (optional)'>
            <Input value={sectionLineId} onChange={(_e, d) => setSectionLineId(d.value)} placeholder='section-line-id' />
          </Field>
          <Button appearance='secondary' disabled={loadingKind !== null} onClick={() => void runExport('layout-sheet-svg')}>
            {loadingKind === 'layout-sheet-svg' ? <Spinner size='tiny' /> : 'SVG Sheet'}
          </Button>
        </div>

        {loadingKind && <Body1>Export l\u00e4uft: {labelByKind.get(loadingKind) ?? loadingKind}</Body1>}
      </Card>
    </div>
  )
}
