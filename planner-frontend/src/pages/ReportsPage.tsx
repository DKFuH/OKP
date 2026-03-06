import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Tab,
  TabList,
  Textarea,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import {
  reportsApi,
  type LeadFunnelResponse,
  type ReportDefinition,
  type ReportRun,
  type RevenueByPeriodResponse,
  type SalesRankingResponse,
} from '../api/reports.js'

type TabId = 'builtin' | 'builder' | 'history'
type Loadable<T> = { loading: boolean; error: string | null; data: T }

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const DIMENSIONS = ['period', 'branch', 'sales_rep', 'category'] as const
const METRICS = ['revenue', 'margin', 'conversion'] as const

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const useStyles = makeStyles({
  page: { display: 'grid', rowGap: tokens.spacingVerticalXL },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: tokens.spacingVerticalM,
  },
  contentSingle: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  cardBody: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  reportList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, listStyle: 'none', margin: 0, padding: 0 },
  reportItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalS + ' ' + tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    gap: tokens.spacingHorizontalM,
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: tokens.spacingVerticalXS + ' ' + tokens.spacingHorizontalM, borderBottom: '1px solid ' + tokens.colorNeutralStroke1, fontWeight: tokens.fontWeightSemibold },
  td: { padding: tokens.spacingVerticalXS + ' ' + tokens.spacingHorizontalM, borderBottom: '1px solid ' + tokens.colorNeutralStroke2 },
  chart: { width: '100%', maxWidth: '420px', height: '180px' },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  hint: { color: tokens.colorNeutralForeground3 },
  formGrid: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
})

export function ReportsPage() {
  const styles = useStyles()
  const [activeTab, setActiveTab] = useState<TabId>('builtin')
  const [revenueState, setRevenueState] = useState<Loadable<RevenueByPeriodResponse>>({ loading: true, error: null, data: { rows: [] } })
  const [funnelState, setFunnelState] = useState<Loadable<LeadFunnelResponse>>({ loading: true, error: null, data: { stages: [] } })
  const [rankingState, setRankingState] = useState<Loadable<SalesRankingResponse>>({ loading: true, error: null, data: { rows: [] } })
  const [reports, setReports] = useState<ReportDefinition[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [runs, setRuns] = useState<ReportRun[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createDimensions, setCreateDimensions] = useState<string[]>(['period'])
  const [createMetrics, setCreateMetrics] = useState<string[]>(['revenue'])
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [runningReportId, setRunningReportId] = useState<string | null>(null)

  async function loadBuiltinReports() {
    setRevenueState((cur) => ({ ...cur, loading: true, error: null }))
    setFunnelState((cur) => ({ ...cur, loading: true, error: null }))
    setRankingState((cur) => ({ ...cur, loading: true, error: null }))
    try {
      const data = await reportsApi.revenueByPeriod(TENANT_ID, 'last_30_days')
      setRevenueState({ loading: false, error: null, data })
    } catch (e: unknown) {
      setRevenueState({ loading: false, error: e instanceof Error ? e.message : 'Laden fehlgeschlagen', data: { rows: [] } })
    }
    try {
      const data = await reportsApi.leadFunnel(TENANT_ID)
      setFunnelState({ loading: false, error: null, data })
    } catch (e: unknown) {
      setFunnelState({ loading: false, error: e instanceof Error ? e.message : 'Laden fehlgeschlagen', data: { stages: [] } })
    }
    try {
      const data = await reportsApi.salesRanking(TENANT_ID)
      setRankingState({ loading: false, error: null, data })
    } catch (e: unknown) {
      setRankingState({ loading: false, error: e instanceof Error ? e.message : 'Laden fehlgeschlagen', data: { rows: [] } })
    }
  }

  async function loadReportDefinitions() {
    setReportsLoading(true); setReportsError(null)
    try { setReports(await reportsApi.list(TENANT_ID)) }
    catch (e: unknown) { setReportsError(e instanceof Error ? e.message : 'Reports konnten nicht geladen werden') }
    finally { setReportsLoading(false) }
  }

  async function loadRuns() {
    setRunsLoading(true); setRunsError(null)
    try { setRuns(await reportsApi.listRuns(TENANT_ID)) }
    catch (e: unknown) { setRunsError(e instanceof Error ? e.message : 'Ausführungshistorie konnten nicht geladen werden') }
    finally { setRunsLoading(false) }
  }

  useEffect(() => {
    void loadBuiltinReports()
    void loadReportDefinitions()
    void loadRuns()
  }, [])

  const revenueMax = useMemo(() => Math.max(1, ...revenueState.data.rows.map((r) => r.revenue)), [revenueState.data.rows])
  const funnelMax = useMemo(() => Math.max(1, ...funnelState.data.stages.map((s) => s.count)), [funnelState.data.stages])

  function toggleInArray(current: string[], value: string): string[] {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  }

  async function handleCreateReport() {
    if (!createName.trim()) { setCreateError('Name ist erforderlich.'); return }
    setCreateError(null); setCreating(true)
    try {
      await reportsApi.create(TENANT_ID, { tenant_id: TENANT_ID, name: createName.trim(), description: createDescription.trim() || null, dimensions: createDimensions, metrics: createMetrics, filters: {}, created_by: 'reports-ui' })
      setCreateOpen(false); setCreateName(''); setCreateDescription(''); setCreateDimensions(['period']); setCreateMetrics(['revenue'])
      await loadReportDefinitions()
    } catch (e: unknown) { setCreateError(e instanceof Error ? e.message : 'Report konnte nicht erstellt werden') }
    finally { setCreating(false) }
  }

  async function handleRunReport(reportId: string) {
    setRunningReportId(reportId)
    try { await reportsApi.run(TENANT_ID, reportId); await loadRuns() }
    catch { /* errors shown via history */ }
    finally { setRunningReportId(null) }
  }

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: tokens.spacingHorizontalM }}>
        <Title2>Reports</Title2>
      </div>

      <TabList selectedValue={activeTab} onTabSelect={(_e, d) => setActiveTab(d.value as TabId)}>
        <Tab value="builtin">Standard-Reports</Tab>
        <Tab value="builder">Report-Builder</Tab>
        <Tab value="history">Ausführungshistorie</Tab>
      </TabList>

      {activeTab === 'builtin' && (
        <div className={styles.content}>
          <Card appearance="filled">
            <div className={styles.cardBody}>
              <Subtitle2>Umsatz nach Zeitraum</Subtitle2>
              {revenueState.loading && <Spinner size="small" />}
              {revenueState.error && <MessageBar intent="error"><MessageBarBody>{revenueState.error}</MessageBarBody></MessageBar>}
              {!revenueState.loading && !revenueState.error && (
                revenueState.data.rows.length === 0 ? (
                  <Caption1 className={styles.hint}>Keine Daten vorhanden.</Caption1>
                ) : (
                  <svg viewBox="0 0 420 180" className={styles.chart} role="img" aria-label="Umsatz als Balkendiagramm">
                    {revenueState.data.rows.map((row, index) => {
                      const bw = 32, gap = 16, x = 20 + index * (bw + gap)
                      const height = Math.max(6, Math.round((row.revenue / revenueMax) * 120))
                      const y = 145 - height
                      return (
                        <g key={row.period}>
                          <rect x={x} y={y} width={bw} height={height} rx={4} fill={tokens.colorBrandBackground} />
                          <text x={x + bw / 2} y={165} textAnchor="middle" fontSize="10" fill={tokens.colorNeutralForeground3}>{row.period.slice(5)}</text>
                        </g>
                      )
                    })}
                  </svg>
                )
              )}
            </div>
          </Card>

          <Card appearance="filled">
            <div className={styles.cardBody}>
              <Subtitle2>Lead-Trichter</Subtitle2>
              {funnelState.loading && <Spinner size="small" />}
              {funnelState.error && <MessageBar intent="error"><MessageBarBody>{funnelState.error}</MessageBarBody></MessageBar>}
              {!funnelState.loading && !funnelState.error && (
                funnelState.data.stages.length === 0 ? (
                  <Caption1 className={styles.hint}>Keine Daten vorhanden.</Caption1>
                ) : (
                  <svg viewBox="0 0 420 220" className={styles.chart} role="img" aria-label="Lead-Trichter">
                    {funnelState.data.stages.map((stage, index) => {
                      const width = Math.max(24, Math.round((stage.count / funnelMax) * 360))
                      const x = 20 + Math.round((360 - width) / 2), y = 18 + index * 32
                      return (
                        <g key={stage.status}>
                          <rect x={x} y={y} width={width} height={20} rx={8} fill={tokens.colorBrandBackground} />
                          <text x={25} y={y + 14} fontSize="10" fill={tokens.colorNeutralForeground3}>{stage.status}</text>
                          <text x={x + width - 6} y={y + 14} textAnchor="end" fontSize="10" fill={tokens.colorNeutralForeground3}>{stage.count}</text>
                        </g>
                      )
                    })}
                  </svg>
                )
              )}
            </div>
          </Card>

          <Card appearance="filled">
            <div className={styles.cardBody}>
              <Subtitle2>Verkäufer-Ranking</Subtitle2>
              {rankingState.loading && <Spinner size="small" />}
              {rankingState.error && <MessageBar intent="error"><MessageBarBody>{rankingState.error}</MessageBarBody></MessageBar>}
              {!rankingState.loading && !rankingState.error && (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Verkäufer</th>
                      <th className={styles.th}>Umsatz</th>
                      <th className={styles.th}>Projekte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingState.data.rows.length === 0 && (
                      <tr><td className={styles.td} colSpan={3}><Caption1 className={styles.hint}>Keine Daten vorhanden.</Caption1></td></tr>
                    )}
                    {rankingState.data.rows.map((row) => (
                      <tr key={row.sales_rep}>
                        <td className={styles.td}><Caption1>{row.sales_rep}</Caption1></td>
                        <td className={styles.td}><Caption1>{formatEur(row.revenue)}</Caption1></td>
                        <td className={styles.td}><Caption1>{row.projects}</Caption1></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'builder' && (
        <div className={styles.contentSingle}>
          <div className={styles.toolbar}>
            <Subtitle2>Gespeicherte Reports</Subtitle2>
            <Dialog open={createOpen} onOpenChange={(_e, d) => { setCreateOpen(d.open) }}>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="primary">Neuer Report</Button>
              </DialogTrigger>
              <DialogSurface>
                <DialogBody>
                  <DialogTitle>Neuer Report</DialogTitle>
                  <DialogContent>
                    <div className={styles.formGrid}>
                      <Field label="Name" required>
                        <Input value={createName} onChange={(_e, d) => setCreateName(d.value)} />
                      </Field>
                      <Field label="Beschreibung">
                        <Textarea value={createDescription} onChange={(_e, d) => setCreateDescription(d.value)} rows={3} />
                      </Field>
                      <div>
                        <Body1 style={{ fontWeight: tokens.fontWeightSemibold, display: 'block', marginBottom: tokens.spacingVerticalXS }}>Dimensionen</Body1>
                        <div className={styles.chipGrid}>
                          {DIMENSIONS.map((dim) => (
                            <Checkbox
                              key={dim}
                              label={dim}
                              checked={createDimensions.includes(dim)}
                              onChange={() => setCreateDimensions((cur) => toggleInArray(cur, dim))}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <Body1 style={{ fontWeight: tokens.fontWeightSemibold, display: 'block', marginBottom: tokens.spacingVerticalXS }}>Metriken</Body1>
                        <div className={styles.chipGrid}>
                          {METRICS.map((metric) => (
                            <Checkbox
                              key={metric}
                              label={metric}
                              checked={createMetrics.includes(metric)}
                              onChange={() => setCreateMetrics((cur) => toggleInArray(cur, metric))}
                            />
                          ))}
                        </div>
                      </div>
                      {createError && <MessageBar intent="error"><MessageBarBody>{createError}</MessageBarBody></MessageBar>}
                    </div>
                  </DialogContent>
                  <DialogActions>
                    <DialogTrigger disableButtonEnhancement>
                      <Button appearance="secondary">Abbrechen</Button>
                    </DialogTrigger>
                    <Button appearance="primary" disabled={creating} onClick={() => void handleCreateReport()}>
                      {creating ? <Spinner size="tiny" /> : 'Speichern'}
                    </Button>
                  </DialogActions>
                </DialogBody>
              </DialogSurface>
            </Dialog>
          </div>

          {reportsLoading && <Spinner label="Laden…" />}
          {reportsError && <MessageBar intent="error"><MessageBarBody>{reportsError}</MessageBarBody></MessageBar>}

          {!reportsLoading && !reportsError && (
            <ul className={styles.reportList}>
              {reports.length === 0 && (
                <li><Caption1 className={styles.hint}>Noch keine Report-Definitionen vorhanden.</Caption1></li>
              )}
              {reports.map((report) => (
                <li key={report.id} className={styles.reportItem}>
                  <div>
                    <Body1 style={{ fontWeight: tokens.fontWeightSemibold, display: 'block' }}>{report.name}</Body1>
                    {report.description && <Caption1 style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>{report.description}</Caption1>}
                    <Caption1 style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                      Dim: {report.dimensions.join(', ') || '–'} · Metriken: {report.metrics.join(', ') || '–'}
                    </Caption1>
                  </div>
                  <Button
                    appearance="secondary"
                    size="small"
                    disabled={runningReportId === report.id}
                    onClick={() => void handleRunReport(report.id)}
                  >
                    {runningReportId === report.id ? <Spinner size="tiny" /> : 'Ausführen'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className={styles.contentSingle}>
          <Subtitle2>Ausführungshistorie</Subtitle2>
          {runsLoading && <Spinner label="Laden…" />}
          {runsError && <MessageBar intent="error"><MessageBarBody>{runsError}</MessageBarBody></MessageBar>}
          {!runsLoading && !runsError && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Report</th>
                  <th className={styles.th}>Datum</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Download</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 && (
                  <tr><td className={styles.td} colSpan={4}><Caption1 className={styles.hint}>Noch keine Runs vorhanden.</Caption1></td></tr>
                )}
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className={styles.td}><Caption1>{run.report_name}</Caption1></td>
                    <td className={styles.td}><Caption1>{formatDateTime(run.generated_at)}</Caption1></td>
                    <td className={styles.td}><Badge appearance="tint" size="small">{run.status}</Badge></td>
                    <td className={styles.td}>
                      {run.file_url ? (
                        <Button as="a" appearance="subtle" size="small" href={run.file_url} target="_blank" rel="noreferrer">Download</Button>
                      ) : (
                        <Caption1 className={styles.hint}>–</Caption1>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
