import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Badge,
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Dropdown,
  Label,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import {
  Warning20Regular,
  ErrorCircle20Regular,
  Info20Regular,
  Delete20Regular,
  Add20Regular,
} from '@fluentui/react-icons'
import { projectsApi, type Project } from '../api/projects.js'
import { roomsApi } from '../api/rooms.js'
import {
  fengshuiApi,
  type FengShuiMode,
  type FengShuiAnalysisMeta,
  type FengShuiFinding,
} from '../api/fengshui.js'

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingHorizontalXL,
    maxWidth: '960px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
  },
  header: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  subtitle: { color: tokens.colorNeutralForeground3 },
  badgeRow: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  form: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, alignItems: 'flex-end' },
  formField: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  compassInput: {
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    padding: '5px 8px',
    fontSize: tokens.fontSizeBase300,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    width: '100px',
  },
  analysisList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  analysisRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusSmall,
    border: '1px solid ' + tokens.colorNeutralStroke1,
    cursor: 'pointer',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  analysisRowActive: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  analysisRowLeft: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  scoreRow: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  findingsList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  finding: { display: 'flex', gap: tokens.spacingHorizontalM, padding: tokens.spacingVerticalM },
  findingIcon: { flexShrink: 0, marginTop: '2px' },
  findingBody: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, flex: '1' },
  findingMeta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  iconCritical: { color: tokens.colorPaletteRedForeground1 },
  iconWarn: { color: tokens.colorPaletteYellowForeground2 },
  iconInfo: { color: tokens.colorBrandForeground1 },
  baguaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tokens.spacingHorizontalM },
  baguaCard: {
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalM, minHeight: '110px',
  },
  baguaEmoji: { fontSize: '24px', lineHeight: '1' },
  baguaName: { fontWeight: tokens.fontWeightSemibold },
  baguaTip: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  centerCard: { backgroundColor: tokens.colorBrandBackground2 },
  emptyHint: { color: tokens.colorNeutralForeground3, textAlign: 'center', padding: tokens.spacingVerticalL },
})

interface BaguaZone { emoji: string; name: string; direction: string; tip: string; center?: boolean }
const BAGUA_ZONES: BaguaZone[] = [
  { emoji: '💰', name: 'Wohlstand', direction: 'Südost', tip: 'Pflanzen und Wasserobjekte stärken die Energie.' },
  { emoji: '🏆', name: 'Ruhm & Ruf', direction: 'Süd', tip: 'Feuer-Elemente und rote Akzente fördern Anerkennung.' },
  { emoji: '❤️', name: 'Partnerschaft', direction: 'Südwest', tip: 'Paarweise Objekte und Erdtöne stärken Beziehungen.' },
  { emoji: '🌿', name: 'Gesundheit', direction: 'Ost', tip: 'Pflanzen und Holzelemente fördern Vitalität.' },
  { emoji: '☯️', name: 'Mitte', direction: 'Mitte', tip: 'Gleichgewicht – dieser Bereich sollte offen bleiben.', center: true },
  { emoji: '✨', name: 'Kreativität', direction: 'West', tip: 'Metall-Elemente und helle Farben fördern Kreativität.' },
  { emoji: '📚', name: 'Wissen', direction: 'Nordost', tip: 'Ruhige Ecke mit Büchern oder Meditationsobjekten.' },
  { emoji: '💼', name: 'Karriere', direction: 'Nord', tip: 'Wasser-Elemente und dunkle Farben stärken den Berufsweg.' },
  { emoji: '🤝', name: 'Helfer', direction: 'Nordwest', tip: 'Metall und Grau ziehen hilfreiche Energie an.' },
]

function FindingIcon({ severity, className }: { severity: FengShuiFinding['severity']; className?: string }) {
  if (severity === 'critical') return <ErrorCircle20Regular className={className} />
  if (severity === 'warn') return <Warning20Regular className={className} />
  return <Info20Regular className={className} />
}

function severityLabel(s: FengShuiFinding['severity']) {
  return s === 'critical' ? 'Kritisch' : s === 'warn' ? 'Hinweis' : 'Info'
}

function severityColor(s: FengShuiFinding['severity']): 'danger' | 'warning' | 'brand' {
  return s === 'critical' ? 'danger' : s === 'warn' ? 'warning' : 'brand'
}

function modeLabel(m: FengShuiMode) {
  return m === 'west' ? 'Westliches System' : m === 'east' ? 'Östliches System' : 'Beide Systeme'
}

export function FengShuiPage() {
  const { id } = useParams<{ id: string }>()
  const styles = useStyles()
  const [project, setProject] = useState<Project | null>(null)
  const [analyses, setAnalyses] = useState<FengShuiAnalysisMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [findings, setFindings] = useState<FengShuiFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingFindings, setLoadingFindings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<FengShuiMode>('both')
  const [compassDeg, setCompassDeg] = useState(0)

  useEffect(() => {
    if (!id) return
    Promise.all([projectsApi.get(id), fengshuiApi.listAnalyses(id)])
      .then(([proj, list]) => {
        setProject(proj)
        setAnalyses(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(() => setError('Laden fehlgeschlagen.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!selectedId) { setFindings([]); return }
    setLoadingFindings(true)
    fengshuiApi.getFindings(selectedId)
      .then(setFindings)
      .catch(() => setFindings([]))
      .finally(() => setLoadingFindings(false))
  }, [selectedId])

  const handleAnalyze = useCallback(async () => {
    if (!id) return
    setAnalyzing(true)
    setError(null)
    try {
      const rooms = await roomsApi.list(id).catch(() => [] as any[])
      let bounds_mm = { x_min: 0, y_min: 0, x_max: 10000, y_max: 8000 }
      if (rooms.length > 0 && (rooms[0] as any).polygon) {
        const pts = rooms.flatMap((r: any) => r.polygon ?? [])
        if (pts.length > 0) bounds_mm = {
          x_min: Math.min(...pts.map((p: any) => p.x)),
          y_min: Math.min(...pts.map((p: any) => p.y)),
          x_max: Math.max(...pts.map((p: any) => p.x)),
          y_max: Math.max(...pts.map((p: any) => p.y)),
        }
      }
      const result = await fengshuiApi.analyze(id, { mode, compass_deg: compassDeg, bounds_mm })
      setAnalyses(prev => [result, ...prev])
      setSelectedId(result.id)
    } catch (e: any) {
      setError('Analyse fehlgeschlagen: ' + String(e?.message ?? 'Unbekannter Fehler'))
    } finally {
      setAnalyzing(false)
    }
  }, [id, mode, compassDeg])

  const handleDelete = useCallback(async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fengshuiApi.deleteAnalysis(analysisId).catch(() => {})
    setAnalyses(prev => prev.filter(a => a.id !== analysisId))
    if (selectedId === analysisId) setSelectedId(null)
  }, [selectedId])

  if (loading) return <div className={styles.root}><Spinner label="Lade Feng Shui…" /></div>

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.badgeRow}>
          <Title2>Feng Shui Analyse</Title2>
          <Badge appearance="tint" color="brand" shape="rounded">Beta</Badge>
        </div>
        {project && <Body1 className={styles.subtitle}>Projekt: <Body1Strong>{project.name}</Body1Strong></Body1>}
      </div>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <Card>
        <CardHeader header={<Body1Strong>Neue Analyse</Body1Strong>} />
        <div className={styles.form} style={{ padding: `0 ${tokens.spacingHorizontalM} ${tokens.spacingVerticalM}` }}>
          <div className={styles.formField}>
            <Label>System</Label>
            <Dropdown value={modeLabel(mode)} onOptionSelect={(_, d) => setMode(d.optionValue as FengShuiMode)} style={{ minWidth: '180px' }}>
              <Option value="west">Westliches System</Option>
              <Option value="east">Östliches System</Option>
              <Option value="both">Beide Systeme</Option>
            </Dropdown>
          </div>
          <div className={styles.formField}>
            <Label>Nordrichtung (°)</Label>
            <input type="number" min={0} max={359} value={compassDeg}
              onChange={e => setCompassDeg(Number(e.target.value))} className={styles.compassInput} />
          </div>
          <Button appearance="primary" icon={<Add20Regular />} onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? 'Analysiere…' : 'Analyse starten'}
          </Button>
        </div>
      </Card>

      <div className={styles.section}>
        <Title3>Analysen</Title3>
        {analyses.length === 0
          ? <Body1 className={styles.emptyHint}>Noch keine Analysen – starten Sie eine neue Analyse oben.</Body1>
          : <div className={styles.analysisList}>
              {analyses.map(a => (
                <div key={a.id}
                  className={`${styles.analysisRow} ${selectedId === a.id ? styles.analysisRowActive : ''}`}
                  onClick={() => setSelectedId(a.id)}>
                  <div className={styles.analysisRowLeft}>
                    <Body1Strong>{modeLabel(a.mode)} · {a.compass_deg}°</Body1Strong>
                    <Body1 className={styles.subtitle}>{new Date(a.created_at).toLocaleString('de-DE')}</Body1>
                  </div>
                  <div className={styles.scoreRow}>
                    <Badge appearance="tint" color={a.score_total >= 70 ? 'success' : a.score_total >= 40 ? 'warning' : 'danger'}>
                      {a.score_total} Pkt.
                    </Badge>
                    <Button appearance="subtle" icon={<Delete20Regular />} size="small"
                      onClick={e => handleDelete(a.id, e)} title="Analyse löschen" />
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {selectedId && (
        <div className={styles.section}>
          <Title3>Befunde</Title3>
          {loadingFindings
            ? <Spinner size="small" label="Lade Befunde…" />
            : findings.length === 0
              ? <Body1 className={styles.emptyHint}>Keine Befunde für diese Analyse.</Body1>
              : <div className={styles.findingsList}>
                  {findings.map(f => (
                    <Card key={f.id}>
                      <div className={styles.finding}>
                        <div className={`${styles.findingIcon} ${f.severity === 'critical' ? styles.iconCritical : f.severity === 'warn' ? styles.iconWarn : styles.iconInfo}`}>
                          <FindingIcon severity={f.severity} />
                        </div>
                        <div className={styles.findingBody}>
                          <div className={styles.badgeRow}>
                            <Body1Strong>{f.title}</Body1Strong>
                            <Badge appearance="tint" color={severityColor(f.severity)} size="small">{severityLabel(f.severity)}</Badge>
                            {f.system && <Badge appearance="outline" size="small">{f.system === 'west' ? 'West' : 'Ost'}</Badge>}
                          </div>
                          <Body1>{f.reason}</Body1>
                          <Body1 className={styles.findingMeta}>{f.recommendation}</Body1>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
          }
        </div>
      )}

      <div className={styles.section}>
        <Title3>Bagua-Referenz</Title3>
        <Body1 className={styles.subtitle}>Die neun Lebensbereiche nach dem klassischen Bagua-Oktagramm.</Body1>
        <div className={styles.baguaGrid}>
          {BAGUA_ZONES.map(zone => (
            <Card key={zone.name} className={zone.center ? styles.centerCard : undefined}>
              <div className={styles.baguaCard}>
                <span className={styles.baguaEmoji}>{zone.emoji}</span>
                <Body1Strong className={styles.baguaName}>{zone.name}</Body1Strong>
                <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{zone.direction}</Body1>
                <span className={styles.baguaTip}>{zone.tip}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
