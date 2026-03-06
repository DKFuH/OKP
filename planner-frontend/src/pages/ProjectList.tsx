import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  CardHeader,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Subtitle2,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { platformApi, type GlobalSearchResult } from '../api/platform.js'
import { projectsApi, type Project, type ProjectLockState } from '../api/projects.js'
import { OnboardingWizard, shouldShowOnboarding } from '../components/OnboardingWizard.js'
import { useLocale } from '../hooks/useLocale.js'
import { formatDate as fmtDateRaw } from '../i18n/formatters.js'

const BOARD_COLUMNS: Array<{ id: Project['project_status']; label: string }> = [
  { id: 'lead', label: 'Lead' },
  { id: 'planning', label: 'Planung' },
  { id: 'quoted', label: 'Angebot' },
  { id: 'contract', label: 'Auftrag' },
  { id: 'production', label: 'Produktion' },
  { id: 'installed', label: 'Montage' },
]

const PRIORITY_LABELS: Record<Project['priority'], string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
}

type GanttProject = Project & { start_at: string; end_at: string | null }

function getTimelineRange(projects: GanttProject[]) {
  const timestamps = projects.flatMap((p) => {
    const values = [new Date(p.start_at).getTime()]
    if (p.end_at) values.push(new Date(p.end_at).getTime())
    return values
  })
  if (timestamps.length === 0) {
    const today = Date.now()
    return { min: today, max: today + 86400000 }
  }
  const min = Math.min(...timestamps)
  const max = Math.max(...timestamps)
  return { min, max: max === min ? min + 86400000 : max }
}

const useStyles = makeStyles({
  page: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXXL,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  filters: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  filterField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: '160px',
  },
  searchRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  searchResults: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: tokens.spacingVerticalS,
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingVerticalM,
    minHeight: '120px',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalXS,
  },
  card: {
    cursor: 'grab',
    userSelect: 'none',
  },
  cardHeaderLayout: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXS,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalXS,
  },
  progressTrack: {
    height: '4px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralStroke1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    transition: 'width 0.3s ease',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
  cardControls: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalXS,
    borderTop: '1px solid',
    borderTopColor: tokens.colorNeutralStroke2,
  },
  controlField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  controlFullWidth: {
    gridColumn: '1 / -1',
  },
  rangeInput: {
    width: '100%',
    accentColor: tokens.colorBrandBackground,
  },
  lockBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorStatusWarningForeground1,
  },
  timelineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  timelineRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
  },
  timelineMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  timelineTrack: {
    position: 'relative',
    height: '28px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  timelineBar: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: tokens.spacingHorizontalXS,
  },
  timelineBarLabel: {
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase100,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  empty: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
})

export function ProjectList() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { t, locale } = useLocale()

  const formatDate = (value: string | null) => {
    if (!value) return t('projects.noDeadline')
    return fmtDateRaw(new Date(value), locale)
  }
  const formatDateTime = (value: string | null) => {
    if (!value) return 'unbekannt'
    return new Date(value).toLocaleString(locale)
  }

  const [projects, setProjects] = useState<Project[]>([])
  const [ganttProjects, setGanttProjects] = useState<GanttProject[]>([])
  const [lockStateByProject, setLockStateByProject] = useState<Record<string, ProjectLockState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Project['project_status']>('all')
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding)

  async function loadProjects(filter: 'all' | Project['project_status']) {
    setLoading(true)
    setError(null)
    try {
      const [board, gantt] = await Promise.all([
        projectsApi.board(filter === 'all' ? {} : { status_filter: filter }),
        projectsApi.gantt(),
      ])

      const lockStates = await Promise.all(
        board.map(async (project) => {
          try {
            const lockState = await projectsApi.lockState(project.id)
            return [project.id, lockState] as const
          } catch {
            return [project.id, {
              project_id: project.id,
              locked: false,
              alternative_id: null,
              locked_by_user: null,
              locked_by_host: null,
              locked_at: null,
            }] as const
          }
        }),
      )

      setProjects(board)
      setGanttProjects(gantt)
      setLockStateByProject(Object.fromEntries(lockStates))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden der Projekte')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects(statusFilter)
  }, [statusFilter])

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const project = await projectsApi.create({ name: newName.trim() })
      setCreateOpen(false)
      setNewName('')
      navigate('/projects/' + project.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Anlegen')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('projects.deleteConfirm'))) return
    await projectsApi.delete(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setGanttProjects((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleDuplicate(id: string) {
    try {
      const copy = await projectsApi.threeDots(id, 'duplicate')
      navigate('/projects/' + copy.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Duplizieren fehlgeschlagen')
    }
  }

  async function handleArchive(id: string) {
    try {
      await projectsApi.archive(id, { archive_reason: 'Archiviert über Projektboard' })
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setGanttProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Archivieren fehlgeschlagen')
    }
  }

  async function patchProject(projectId: string, action: () => Promise<Project>) {
    setSavingProjectId(projectId)
    setError(null)
    try {
      const updated = await action()
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
      setGanttProjects((prev) => prev.map((p) => (
        p.id === projectId
          ? { ...p, ...updated, start_at: p.start_at, end_at: updated.deadline }
          : p
      )))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Projekt konnte nicht aktualisiert werden')
    } finally {
      setSavingProjectId(null)
    }
  }

  async function handleStatusDrop(projectId: string, nextStatus: Project['project_status']) {
    const project = projects.find((p) => p.id === projectId)
    if (!project || project.project_status === nextStatus) return

    const progressByStatus: Partial<Record<Project['project_status'], number>> = {
      lead: 10, planning: 30, quoted: 55, contract: 70, production: 85, installed: 100, archived: 100,
    }

    await patchProject(projectId, () => projectsApi.updateStatus(projectId, {
      project_status: nextStatus,
      progress_pct: Math.max(project.progress_pct, progressByStatus[nextStatus] ?? project.progress_pct),
    }))
  }

  async function handleGlobalSearch() {
    if (searchTerm.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    setError(null)
    try {
      const response = await platformApi.search(searchTerm.trim())
      setSearchResults(response.results)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Suche fehlgeschlagen')
    } finally {
      setSearching(false)
    }
  }

  const groupedProjects = useMemo(() => {
    const groups = Object.fromEntries(
      BOARD_COLUMNS.map((col) => [col.id, [] as Project[]])
    ) as Record<Project['project_status'], Project[]>
    for (const project of projects) {
      if (project.project_status === 'archived') continue
      groups[project.project_status].push(project)
    }
    return groups
  }, [projects])

  const { min: timelineMin, max: timelineMax } = useMemo(
    () => getTimelineRange(ganttProjects),
    [ganttProjects]
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <Title2>Projektboard</Title2>
          <Body1 style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
            Kanban, Fristen, Prioritäten und Timeline in einer Ansicht.
          </Body1>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(_e, data) => {
            setCreateOpen(data.open)
            if (!data.open) setNewName('')
          }}
        >
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="primary">+ {t('projects.newProject')}</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>{t('projects.newProject')}</DialogTitle>
              <DialogContent>
                <Field label="Projektname" required>
                  <Input
                    autoFocus
                    value={newName}
                    placeholder="z. B. Küche Müller"
                    onChange={(_e, data) => setNewName(data.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
                  />
                </Field>
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Abbrechen</Button>
                </DialogTrigger>
                <Button
                  appearance="primary"
                  disabled={!newName.trim()}
                  onClick={() => void handleCreate()}
                >
                  Anlegen
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.filters}>
        <div className={styles.filterField}>
          <Caption1>Statusfilter</Caption1>
          <Select
            value={statusFilter}
            onChange={(_e, data) => setStatusFilter(data.value as 'all' | Project['project_status'])}
          >
            <Option value="all">Alle aktiven Phasen</Option>
            {BOARD_COLUMNS.map((col) => (
              <Option key={col.id} value={col.id}>{col.label}</Option>
            ))}
          </Select>
        </div>
        <div className={styles.filterField} style={{ flex: 1, minWidth: '260px' }}>
          <Caption1>Globale Suche</Caption1>
          <div className={styles.searchRow}>
            <Input
              style={{ flex: 1 }}
              type="search"
              value={searchTerm}
              placeholder="Projekt, Kontakt oder Dokument"
              onChange={(_e, data) => setSearchTerm(data.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleGlobalSearch() }}
            />
            <Button
              appearance="secondary"
              disabled={searching}
              onClick={() => void handleGlobalSearch()}
            >
              {searching ? <Spinner size="tiny" /> : 'Suchen'}
            </Button>
          </div>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.map((result) => (
            <Card
              key={result.type + '-' + result.id}
              appearance="filled-alternative"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(result.href)}
            >
              <CardHeader
                header={
                  <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>{result.title}</Body1>
                }
                description={
                  <Caption1>{result.type} · {result.subtitle ?? result.meta ?? 'Ohne Zusatzinfo'}</Caption1>
                }
              />
            </Card>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <div className={styles.empty}>
          <Body1>{t('projects.noProjects')}</Body1>
        </div>
      ) : (
        <>
          <section className={styles.board}>
            {BOARD_COLUMNS.map((col) => (
              <div
                key={col.id}
                className={styles.column}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const projectId = e.dataTransfer.getData('text/project-id')
                  if (projectId) void handleStatusDrop(projectId, col.id)
                }}
              >
                <div className={styles.columnHeader}>
                  <Subtitle2>{col.label}</Subtitle2>
                  <Badge appearance="tint" shape="circular">
                    {groupedProjects[col.id].length}
                  </Badge>
                </div>

                {groupedProjects[col.id].map((project) => (
                  <Card
                    key={project.id}
                    appearance="filled"
                    className={styles.card}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/project-id', project.id)
                    }}
                  >
                    <div className={styles.cardHeaderLayout}>
                      <Button
                        appearance="transparent"
                        style={{
                          fontWeight: tokens.fontWeightSemibold,
                          padding: 0,
                          minWidth: 0,
                          flex: 1,
                          justifyContent: 'flex-start',
                        }}
                        data-testid={'project-open-' + project.id}
                        onClick={() => navigate('/projects/' + project.id)}
                      >
                        {project.name}
                      </Button>
                      <Menu>
                        <MenuTrigger disableButtonEnhancement>
                          <Button appearance="subtle" aria-label="Projektmenu" size="small">
                            ⋯
                          </Button>
                        </MenuTrigger>
                        <MenuPopover>
                          <MenuList>
                            <MenuItem onClick={() => navigate('/projects/' + project.id)}>
                              Bearbeiten
                            </MenuItem>
                            <MenuItem onClick={() => void handleDuplicate(project.id)}>
                              Duplizieren
                            </MenuItem>
                            <MenuItem onClick={() => void handleArchive(project.id)}>
                              Archivieren
                            </MenuItem>
                            <MenuItem onClick={() => void handleDelete(project.id)}>
                              Löschen
                            </MenuItem>
                          </MenuList>
                        </MenuPopover>
                      </Menu>
                    </div>

                    <div className={styles.cardBody}>
                      {project.description && (
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                          {project.description}
                        </Caption1>
                      )}

                      {lockStateByProject[project.id]?.locked && (
                        <div className={styles.lockBadge}>
                          🔒 {lockStateByProject[project.id]?.locked_by_user ?? 'Unbekannt'}
                          {lockStateByProject[project.id]?.locked_by_host
                            ? ' @ ' + lockStateByProject[project.id]?.locked_by_host
                            : ''}
                          {' · ' + formatDateTime(lockStateByProject[project.id]?.locked_at ?? null)}
                        </div>
                      )}

                      <div>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                          {project.progress_pct}% Fortschritt
                        </Caption1>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{ width: project.progress_pct + '%' }}
                          />
                        </div>
                      </div>

                      <div className={styles.metaRow}>
                        <Caption1>Prio: {PRIORITY_LABELS[project.priority]}</Caption1>
                        <Caption1>Fällig: {formatDate(project.deadline)}</Caption1>
                        {project.assigned_to && <Caption1>@{project.assigned_to}</Caption1>}
                        <Caption1>
                          {project._count?.rooms ?? 0} R · {project._count?.quotes ?? 0} A
                        </Caption1>
                      </div>

                      <Button
                        appearance="subtle"
                        size="small"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={() => navigate('/documents?project=' + project.id)}
                      >
                        Dokumente
                      </Button>

                      <div className={styles.cardControls}>
                        <div className={styles.controlField}>
                          <Caption1>Priorität</Caption1>
                          <Select
                            size="small"
                            value={project.priority}
                            disabled={savingProjectId === project.id}
                            onChange={(_e, data) => {
                              void patchProject(project.id, () =>
                                projectsApi.assign(project.id, {
                                  priority: data.value as Project['priority'],
                                })
                              )
                            }}
                          >
                            {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                              <Option key={val} value={val}>{label}</Option>
                            ))}
                          </Select>
                        </div>

                        <div className={styles.controlField}>
                          <Caption1>Frist</Caption1>
                          <input
                            type="date"
                            value={project.deadline ? project.deadline.slice(0, 10) : ''}
                            disabled={savingProjectId === project.id}
                            style={{
                              borderRadius: tokens.borderRadiusMedium,
                              border: '1px solid ' + tokens.colorNeutralStroke1,
                              padding: '2px 6px',
                              fontSize: tokens.fontSizeBase200,
                              backgroundColor: tokens.colorNeutralBackground1,
                              color: tokens.colorNeutralForeground1,
                            }}
                            onChange={(e) => {
                              const nextDeadline = e.target.value
                                ? new Date(e.target.value + 'T00:00:00.000Z').toISOString()
                                : null
                              void patchProject(project.id, () =>
                                projectsApi.assign(project.id, { deadline: nextDeadline })
                              )
                            }}
                          />
                        </div>

                        <div className={styles.controlField + ' ' + styles.controlFullWidth}>
                          <Caption1>Verantwortlich</Caption1>
                          <Input
                            size="small"
                            value={project.assigned_to ?? ''}
                            placeholder="Name oder Rolle"
                            disabled={savingProjectId === project.id}
                            onBlur={(e) => {
                              const value = e.target.value.trim()
                              void patchProject(project.id, () =>
                                projectsApi.assign(project.id, {
                                  assigned_to: value === '' ? null : value,
                                })
                              )
                            }}
                            onChange={(_e, data) => {
                              setProjects((prev) =>
                                prev.map((entry) =>
                                  entry.id === project.id
                                    ? { ...entry, assigned_to: data.value }
                                    : entry
                                )
                              )
                            }}
                          />
                        </div>

                        <div className={styles.controlField + ' ' + styles.controlFullWidth}>
                          <Caption1>Fortschritt {project.progress_pct}%</Caption1>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            className={styles.rangeInput}
                            value={project.progress_pct}
                            disabled={savingProjectId === project.id}
                            onChange={(e) => {
                              const nextProgress = Number(e.target.value)
                              setProjects((prev) =>
                                prev.map((entry) =>
                                  entry.id === project.id
                                    ? { ...entry, progress_pct: nextProgress }
                                    : entry
                                )
                              )
                            }}
                            onMouseUp={(e) => {
                              const nextProgress = Number((e.target as HTMLInputElement).value)
                              void patchProject(project.id, () =>
                                projectsApi.assign(project.id, { progress_pct: nextProgress })
                              )
                            }}
                            onTouchEnd={(e) => {
                              const nextProgress = Number((e.target as HTMLInputElement).value)
                              void patchProject(project.id, () =>
                                projectsApi.assign(project.id, { progress_pct: nextProgress })
                              )
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </section>

          {ganttProjects.length > 0 && (
            <section className={styles.timelineSection}>
              <div className={styles.timelineHeader}>
                <Subtitle2>Timeline</Subtitle2>
                <Badge appearance="tint">{ganttProjects.length} Projekte</Badge>
              </div>
              <div className={styles.timelineList}>
                {ganttProjects.map((project) => {
                  const start = new Date(project.start_at).getTime()
                  const end = new Date(project.end_at ?? project.start_at).getTime()
                  const total = Math.max(1, timelineMax - timelineMin)
                  const left = ((start - timelineMin) / total) * 100
                  const width = (Math.max(end, start + 86400000) - start) / total * 100

                  return (
                    <div key={project.id} className={styles.timelineRow}>
                      <div className={styles.timelineMeta}>
                        <Caption1
                          style={{
                            fontWeight: tokens.fontWeightSemibold,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {project.name}
                        </Caption1>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                          {BOARD_COLUMNS.find((col) => col.id === project.project_status)?.label ??
                            project.project_status}
                        </Caption1>
                      </div>
                      <div className={styles.timelineTrack}>
                        <div
                          className={styles.timelineBar}
                          style={{ left: left + '%', width: Math.max(width, 8) + '%' }}
                        >
                          <span className={styles.timelineBarLabel}>
                            {formatDate(project.deadline)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {showOnboarding && <OnboardingWizard onDismiss={() => setShowOnboarding(false)} />}
    </div>
  )
}
