import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Title2,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { contactsApi, type Contact } from '../api/contacts.js'
import {
  dashboardsApi,
  type DashboardConfigResponse,
  type DashboardLayout,
  type DashboardLayoutItem,
  type DashboardWidgetConfig,
  type DashboardWidgetId,
  type SalesChartResponse,
} from '../api/dashboards.js'
import { projectsApi, type Project } from '../api/projects.js'
import { useLocale } from '../hooks/useLocale.js'

const TENANT_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000001'
const USER_ID_PLACEHOLDER = '11111111-1111-1111-1111-111111111111'

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'sales_chart', title: 'Umsatzverlauf' },
  { id: 'kpi_cards', title: 'KPI Karten' },
  { id: 'current_projects', title: 'Aktuelle Projekte' },
  { id: 'current_contacts', title: 'Kontakte / Leads' },
  { id: 'project_pipeline', title: 'Projektpipeline' },
]

const DEFAULT_LAYOUT: DashboardLayout = {
  columns: 12,
  items: [
    { widget_id: 'sales_chart', x: 0, y: 0, w: 8, h: 4 },
    { widget_id: 'kpi_cards', x: 8, y: 0, w: 4, h: 4 },
    { widget_id: 'current_projects', x: 0, y: 4, w: 6, h: 4 },
    { widget_id: 'current_contacts', x: 6, y: 4, w: 6, h: 4 },
    { widget_id: 'project_pipeline', x: 0, y: 8, w: 12, h: 4 },
  ],
}

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  sales_chart: 'Umsatzverlauf',
  current_projects: 'Aktuelle Projekte',
  current_contacts: 'Kontakte / Leads',
  kpi_cards: 'KPI Karten',
  project_pipeline: 'Projektpipeline',
}

type WidgetWidth = 4 | 6 | 8 | 12

const useStyles = makeStyles({
  page: {
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
  headerText: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
  },
  headerActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  controlBar: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
  workspace: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: tokens.spacingHorizontalL,
    alignItems: 'flex-start',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
  sidebar: {
    display: 'grid',
    rowGap: tokens.spacingVerticalM,
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configList: {
    display: 'grid',
    rowGap: tokens.spacingVerticalS,
  },
  configCard: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  configActions: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalXS,
  },
  miniButtonRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  widgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: tokens.spacingVerticalM,
  },
  widgetPanel: {
    display: 'grid',
    rowGap: tokens.spacingVerticalS,
  },
  widgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartWidget: {
    display: 'grid',
    rowGap: tokens.spacingVerticalS,
  },
  widgetMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    height: '120px',
  },
  chartBarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1 1 0',
    gap: '4px',
  },
  chartBarTrack: {
    width: '100%',
    height: '96px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: tokens.spacingVerticalS,
  },
  kpiCard: {
    display: 'grid',
    rowGap: '4px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  listWidget: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
  },
  listItem: {
    display: 'grid',
    rowGap: '2px',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  pipelineGrid: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  pipelineCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    minWidth: '80px',
  },
  emptyState: {
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  emptyInline: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
})

function formatEur(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function sortLayoutItems(items: DashboardLayoutItem[]) {
  return [...items].sort((left, right) => {
    if (left.y !== right.y) return left.y - right.y
    return left.x - right.x
  })
}

function packLayout(widgetIds: DashboardWidgetId[], widthByWidget: Partial<Record<DashboardWidgetId, WidgetWidth>>): DashboardLayout {
  let x = 0
  let y = 0
  let rowHeight = 4

  const items = widgetIds.map((widgetId) => {
    const w = widthByWidget[widgetId] ?? 6
    if (x + w > 12) { x = 0; y += rowHeight }
    const item = { widget_id: widgetId, x, y, w, h: 4 }
    x += w
    rowHeight = Math.max(rowHeight, item.h)
    if (x >= 12) { x = 0; y += rowHeight; rowHeight = 4 }
    return item
  })

  return { columns: 12, items }
}

function buildDefaultConfig(userId: string, tenantId: string): DashboardConfigResponse {
  return { id: null, user_id: userId, tenant_id: tenantId, widgets: DEFAULT_WIDGETS, layout: DEFAULT_LAYOUT }
}

function getWidgetOrder(config: DashboardConfigResponse): DashboardWidgetId[] {
  const layoutOrder = sortLayoutItems(config.layout.items).map((item) => item.widget_id)
  const fallback = config.widgets.map((widget) => widget.id)
  return Array.from(new Set([...layoutOrder, ...fallback])) as DashboardWidgetId[]
}

function getWidthMap(layout: DashboardLayout): Partial<Record<DashboardWidgetId, WidgetWidth>> {
  return layout.items.reduce((acc, item) => {
    acc[item.widget_id] = item.w as WidgetWidth
    return acc
  }, {} as Partial<Record<DashboardWidgetId, WidgetWidth>>)
}

function getWidgetConfigMap(config: DashboardConfigResponse): Record<DashboardWidgetId, DashboardWidgetConfig> {
  return config.widgets.reduce((acc, widget) => {
    acc[widget.id] = widget
    return acc
  }, {} as Record<DashboardWidgetId, DashboardWidgetConfig>)
}

export function BIDashboard() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { locale } = useLocale()
  const [tenantId, setTenantId] = useState(TENANT_ID_PLACEHOLDER)
  const [userId, setUserId] = useState(USER_ID_PLACEHOLDER)
  const [period, setPeriod] = useState<'month' | 'last_month' | 'year'>('month')
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfigResponse | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [salesChart, setSalesChart] = useState<SalesChartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard() {
    if (!tenantId.trim() || !userId.trim()) {
      setError('Tenant-ID und User-ID sind erforderlich.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [config, chart, board, contactList] = await Promise.all([
        dashboardsApi.getDashboard(userId.trim(), tenantId.trim()),
        dashboardsApi.getSalesChart(tenantId.trim(), period),
        projectsApi.board({ user_id: userId.trim() }),
        contactsApi.list(),
      ])
      setDashboardConfig(config)
      setSalesChart(chart)
      setProjects(board)
      setContacts(contactList)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Dashboard-Daten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [tenantId, userId, period])

  const workingConfig = dashboardConfig ?? buildDefaultConfig(userId, tenantId)
  const widgetOrder = getWidgetOrder(workingConfig)
  const widthMap = getWidthMap(workingConfig.layout)
  const widgetConfigMap = getWidgetConfigMap(workingConfig)

  const projectPipeline = useMemo(() => {
    const counts = new Map<Project['project_status'], number>()
    for (const project of projects) {
      counts.set(project.project_status, (counts.get(project.project_status) ?? 0) + 1)
    }
    return counts
  }, [projects])

  const kpis = useMemo(() => {
    const activeProjects = projects.length
    const leadProjects = projects.filter((p) => p.project_status === 'lead').length
    const totalQuoteValue = projects.reduce((sum, p) => sum + (p.quote_value ?? 0), 0)
    const avgQuoteValue = activeProjects > 0 ? totalQuoteValue / activeProjects : 0
    return [
      { label: 'Aktive Projekte', value: String(activeProjects) },
      { label: 'Leads', value: String(leadProjects) },
      { label: 'Kontakte', value: String(contacts.length) },
      { label: '\u00d8 Projektwert', value: formatEur(avgQuoteValue, locale) },
    ]
  }, [projects, contacts, locale])

  const salesBars = useMemo(() => {
    const points = salesChart?.points ?? []
    const maxValue = Math.max(...points.map((p) => p.value_net), 1)
    return points.map((p) => ({ ...p, pct: Math.max(8, Math.round((p.value_net / maxValue) * 100)) }))
  }, [salesChart])

  function updateLayout(nextOrder: DashboardWidgetId[], nextWidths: Partial<Record<DashboardWidgetId, WidgetWidth>>) {
    const visibleSet = new Set(nextOrder)
    const widgets = nextOrder
      .filter((id) => visibleSet.has(id))
      .map((id) => widgetConfigMap[id] ?? DEFAULT_WIDGETS.find((w) => w.id === id)!)
    const layout = packLayout(nextOrder, nextWidths)
    setDashboardConfig((current) => ({
      ...(current ?? buildDefaultConfig(userId, tenantId)),
      user_id: userId, tenant_id: tenantId, widgets, layout,
    }))
  }

  function moveWidget(widgetId: DashboardWidgetId, direction: -1 | 1) {
    const index = widgetOrder.indexOf(widgetId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= widgetOrder.length) return
    const swapped = [...widgetOrder]
    ;[swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]]
    updateLayout(swapped, widthMap)
  }

  function setWidgetWidth(widgetId: DashboardWidgetId, width: WidgetWidth) {
    updateLayout(widgetOrder, { ...widthMap, [widgetId]: width })
  }

  function toggleWidget(widgetId: DashboardWidgetId, checked: boolean) {
    if (checked) {
      if (!widgetOrder.includes(widgetId)) updateLayout([...widgetOrder, widgetId], widthMap)
      return
    }
    updateLayout(widgetOrder.filter((id) => id !== widgetId), widthMap)
  }

  async function handleSave() {
    if (!dashboardConfig) return
    setSaving(true)
    setError(null)
    try {
      const saved = await dashboardsApi.saveDashboard(userId.trim(), tenantId.trim(), {
        widgets: dashboardConfig.widgets,
        layout: dashboardConfig.layout,
      })
      setDashboardConfig(saved)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Dashboard-Konfiguration konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setDashboardConfig(buildDefaultConfig(userId.trim(), tenantId.trim()))
  }

  function renderWidget(widgetId: DashboardWidgetId) {
    if (widgetId === 'sales_chart') {
      return (
        <div className={styles.chartWidget}>
          <div className={styles.widgetMetaRow}>
            <Body1Strong>{formatEur(salesChart?.total_net ?? 0, locale)}</Body1Strong>
            <Body1>{salesChart?.period ?? period}</Body1>
          </div>
          <div className={styles.chartBars}>
            {salesBars.length === 0 ? (
              <Body1 className={styles.emptyInline}>Noch keine Umsatzdaten im Zeitraum.</Body1>
            ) : (
              salesBars.map((bar) => (
                <div key={bar.date} className={styles.chartBarCol}>
                  <div className={styles.chartBarTrack}>
                    <div className={styles.chartBarFill} style={{ height: `${bar.pct}%` }} />
                  </div>
                  <Body1 style={{ fontSize: '11px' }}>{bar.date}</Body1>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    if (widgetId === 'kpi_cards') {
      return (
        <div className={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className={styles.kpiCard}>
              <Body1>{kpi.label}</Body1>
              <Body1Strong style={{ fontSize: '20px' }}>{kpi.value}</Body1Strong>
            </div>
          ))}
        </div>
      )
    }

    if (widgetId === 'current_projects') {
      const topProjects = [...projects]
        .sort((l, r) => (r.updated_at ?? '').localeCompare(l.updated_at ?? ''))
        .slice(0, 5)
      return (
        <div className={styles.listWidget}>
          {topProjects.length === 0 ? (
            <Body1 className={styles.emptyInline}>Keine Projekte gefunden.</Body1>
          ) : (
            topProjects.map((project) => (
              <button key={project.id} type='button' className={styles.listItem} onClick={() => navigate(`/projects/${project.id}`)}>
                <Body1Strong>{project.name}</Body1Strong>
                <Body1>{project.project_status} &middot; {project.deadline ? new Date(project.deadline).toLocaleDateString(locale) : 'ohne Frist'}</Body1>
              </button>
            ))
          )}
        </div>
      )
    }

    if (widgetId === 'current_contacts') {
      const topContacts = [...contacts]
        .sort((l, r) => (r.updated_at ?? '').localeCompare(l.updated_at ?? ''))
        .slice(0, 5)
      return (
        <div className={styles.listWidget}>
          {topContacts.length === 0 ? (
            <Body1 className={styles.emptyInline}>Keine Kontakte gefunden.</Body1>
          ) : (
            topContacts.map((contact) => (
              <button key={contact.id} type='button' className={styles.listItem} onClick={() => navigate('/contacts')}>
                <Body1Strong>{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.last_name}</Body1Strong>
                <Body1>{contact.project_count} Projekte &middot; {contact.lead_source}</Body1>
              </button>
            ))
          )}
        </div>
      )
    }

    return (
      <div className={styles.pipelineGrid}>
        {Array.from(projectPipeline.entries()).map(([status, count]) => (
          <div key={status} className={styles.pipelineCard}>
            <Body1>{status}</Body1>
            <Body1Strong style={{ fontSize: '20px' }}>{count}</Body1Strong>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Title2>Dashboards / KPIs</Title2>
          <Subtitle2>Widget-Layout, Nutzerkonfiguration und KPI-Ansichten.</Subtitle2>
        </div>
        <div className={styles.headerActions}>
          <Button appearance='subtle' onClick={handleReset}>Layout zur\u00fccksetzen</Button>
          <Button appearance='primary' disabled={saving || !dashboardConfig} onClick={() => void handleSave()}>
            {saving ? <Spinner size='tiny' /> : 'Layout speichern'}
          </Button>
        </div>
      </div>

      <div className={styles.controlBar}>
        <Field label='Tenant-ID'>
          <Input value={tenantId} onChange={(_e, d) => setTenantId(d.value)} style={{ minWidth: '200px' }} />
        </Field>
        <Field label='User-ID'>
          <Input value={userId} onChange={(_e, d) => setUserId(d.value)} style={{ minWidth: '200px' }} />
        </Field>
        <Field label='Zeitraum'>
          <Select value={period} onChange={(_e, d) => setPeriod(d.value as 'month' | 'last_month' | 'year')}>
            <Option value='month'>Aktueller Monat</Option>
            <Option value='last_month'>Letzter Monat</Option>
            <Option value='year'>Aktuelles Jahr</Option>
          </Select>
        </Field>
        <Button appearance='subtle' onClick={() => void loadDashboard()}>Neu laden</Button>
      </div>

      {error && (
        <MessageBar intent='error'>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <Card>
            <CardHeader
              header={<Body1Strong>Widget-Konfiguration</Body1Strong>}
              action={<Badge appearance='tint'>{widgetOrder.length} aktiv</Badge>}
            />
            <div className={styles.configList}>
              {DEFAULT_WIDGETS.map((widget) => {
                const active = widgetOrder.includes(widget.id)
                const widgetConfig = widgetConfigMap[widget.id]
                return (
                  <div key={widget.id} className={styles.configCard}>
                    <Checkbox
                      checked={active}
                      onChange={(_ev, d) => toggleWidget(widget.id, Boolean(d.checked))}
                      label={widgetConfig?.title ?? widget.title ?? WIDGET_LABELS[widget.id]}
                    />
                    {active && (
                      <div className={styles.configActions}>
                        <div className={styles.miniButtonRow}>
                          <Button size='small' appearance='subtle' onClick={() => moveWidget(widget.id, -1)}>Nach oben</Button>
                          <Button size='small' appearance='subtle' onClick={() => moveWidget(widget.id, 1)}>Nach unten</Button>
                        </div>
                        <Field label='Breite'>
                          <Select
                            size='small'
                            value={String(widthMap[widget.id] ?? 6)}
                            onChange={(_e, d) => setWidgetWidth(widget.id, Number(d.value) as WidgetWidth)}
                          >
                            <Option value='4'>Kompakt</Option>
                            <Option value='6'>Halb</Option>
                            <Option value='8'>Breit</Option>
                            <Option value='12'>Voll</Option>
                          </Select>
                        </Field>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </aside>

        <main>
          {loading ? (
            <Spinner label='Dashboard wird geladen\u2026' style={{ marginTop: 64 }} />
          ) : widgetOrder.length === 0 ? (
            <div className={styles.emptyState}>
              <Body1>Keine Widgets aktiv. W\u00e4hle links mindestens ein Widget aus.</Body1>
            </div>
          ) : (
            <div className={styles.widgetGrid}>
              {sortLayoutItems(workingConfig.layout.items).map((item) => (
                <Card key={item.widget_id} style={{ gridColumn: `span ${item.w}` }}>
                  <CardHeader
                    header={<Body1Strong>{widgetConfigMap[item.widget_id]?.title ?? WIDGET_LABELS[item.widget_id]}</Body1Strong>}
                    action={<Badge appearance='outline'>{item.w}/12</Badge>}
                  />
                  {renderWidget(item.widget_id)}
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
