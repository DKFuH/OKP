import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Card,
  CardHeader,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { cutlistApi } from '../api/projectFeatures.js'

type CutlistPart = {
  label: string
  width_mm: number
  height_mm: number
  quantity: number
  material_code: string
  material_label: string
  grain_direction: 'none' | 'length' | 'width'
  article_name: string
  room_name?: string
}

type CutlistSummary = {
  total_parts: number
  by_material: Record<string, { count: number; area_sqm: number; material_label: string }>
}

type CutlistRecord = {
  id: string
  project_id: string
  room_id: string | null
  generated_at: string
  parts: CutlistPart[]
  summary: CutlistSummary
}

function grainLabel(value: CutlistPart['grain_direction']) {
  if (value === 'length') return 'laengs'
  if (value === 'width') return 'quer'
  return 'kein'
}

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  filterRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tokens.fontSizeBase300,
  },
  th: {
    textAlign: 'left',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  activeRow: {
    background: tokens.colorBrandBackground2,
  },
  summaryBlock: {
    padding: tokens.spacingVerticalS,
    background: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
})

export function CutlistPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const styles = useStyles()
  const [items, setItems] = useState<CutlistRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomFilter, setRoomFilter] = useState('all')
  const [materialFilter, setMaterialFilter] = useState('all')

  async function load() {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const rows = await cutlistApi.list(projectId) as CutlistRecord[]
      setItems(rows)
      setActiveId((prev) => prev ?? rows[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [projectId])

  const active = useMemo(() => items.find((entry) => entry.id === activeId) ?? null, [items, activeId])

  const roomOptions = useMemo(() => {
    const set = new Set<string>()
    for (const part of active?.parts ?? []) { if (part.room_name) set.add(part.room_name) }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [active])

  const materialOptions = useMemo(() => {
    const set = new Set<string>()
    for (const part of active?.parts ?? []) { set.add(part.material_code) }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [active])

  const filteredParts = useMemo(() => {
    const source = active?.parts ?? []
    return source.filter((part) => {
      const roomOk = roomFilter === 'all' || part.room_name === roomFilter
      const materialOk = materialFilter === 'all' || part.material_code === materialFilter
      return roomOk && materialOk
    })
  }, [active, roomFilter, materialFilter])

  async function onGenerate() {
    if (!projectId) return
    setGenerating(true)
    setError(null)
    try {
      const created = await cutlistApi.generate(projectId) as CutlistRecord
      setItems((prev) => [created, ...prev])
      setActiveId(created.id)
      setRoomFilter('all')
      setMaterialFilter('all')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren')
    } finally {
      setGenerating(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Zuschnittliste loeschen?')) return
    setError(null)
    try {
      await cutlistApi.remove(id)
      setItems((prev) => {
        const next = prev.filter((entry) => entry.id !== id)
        if (activeId === id) { setActiveId(next[0]?.id ?? null) }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Loeschen')
    }
  }

  if (!projectId) {
    return <div>Projekt-ID fehlt.</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div>
          <Title2>Zuschnittliste</Title2>
          <Caption1>Projekt {projectId.slice(0, 8)}...</Caption1>
        </div>
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
          <Button appearance='subtle' onClick={() => navigate(`/projects/${projectId}`)}>Zurueck</Button>
          <Button
            appearance='primary'
            onClick={() => void onGenerate()}
            disabled={generating}
            icon={generating ? <Spinner size='tiny' /> : undefined}
          >
            Zuschnittliste generieren
          </Button>
        </div>
      </div>

      {error && <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <Card>
        <CardHeader header={<Body1Strong>Gespeicherte Listen</Body1Strong>} />
        {loading && items.length === 0 ? (
          <Spinner label='Lade...' />
        ) : items.length === 0 ? (
          <Body1>Noch keine Zuschnittliste vorhanden.</Body1>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Datum</th>
                  <th className={styles.th}>Raum</th>
                  <th className={styles.th}>Teile</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id} className={activeId === entry.id ? styles.activeRow : ''}>
                    <td className={styles.td}>
                      <Button appearance='transparent' size='small' onClick={() => setActiveId(entry.id)}>
                        {new Date(entry.generated_at).toLocaleString('de-DE')}
                      </Button>
                    </td>
                    <td className={styles.td}>{entry.room_id ? 'Raum-Filter' : 'Projektweit'}</td>
                    <td className={styles.td}>{entry.summary?.total_parts ?? 0}</td>
                    <td className={styles.td}>
                      <Button appearance='subtle' size='small' onClick={() => void onDelete(entry.id)}>Loeschen</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {active && (
        <Card>
          <div className={styles.filterRow}>
            <Select
              value={roomFilter}
              onChange={(_e, d) => setRoomFilter(d.value)}
              style={{ minWidth: 160 }}
            >
              <Option value='all'>Alle Raeume</Option>
              {roomOptions.map((room) => <Option key={room} value={room}>{room}</Option>)}
            </Select>
            <Select
              value={materialFilter}
              onChange={(_e, d) => setMaterialFilter(d.value)}
              style={{ minWidth: 160 }}
            >
              <Option value='all'>Alle Materialien</Option>
              {materialOptions.map((material) => <Option key={material} value={material}>{material}</Option>)}
            </Select>
            <Button
              as='a'
              href={`/api/v1/cutlists/${active.id}/export.csv`}
              target='_blank'
              rel='noreferrer'
              appearance='subtle'
            >
              CSV Export
            </Button>
            <Button
              as='a'
              href={`/api/v1/cutlists/${active.id}/export.pdf`}
              target='_blank'
              rel='noreferrer'
              appearance='subtle'
            >
              PDF Export
            </Button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Bezeichnung</th>
                  <th className={styles.th}>Breite</th>
                  <th className={styles.th}>Hoehe</th>
                  <th className={styles.th}>Anzahl</th>
                  <th className={styles.th}>Material</th>
                  <th className={styles.th}>Korn</th>
                  <th className={styles.th}>Artikel</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part, index) => (
                  <tr key={`${part.article_name}-${index}`}>
                    <td className={styles.td}>{part.label}</td>
                    <td className={styles.td}>{part.width_mm}</td>
                    <td className={styles.td}>{part.height_mm}</td>
                    <td className={styles.td}>{part.quantity}</td>
                    <td className={styles.td}>{part.material_code}</td>
                    <td className={styles.td}>{grainLabel(part.grain_direction)}</td>
                    <td className={styles.td}>{part.article_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.summaryBlock}>
            <Body1Strong>Gesamtteile: {active.summary?.total_parts ?? 0}</Body1Strong>
            <ul style={{ margin: `${tokens.spacingVerticalXS} 0 0`, paddingLeft: tokens.spacingHorizontalL }}>
              {Object.entries(active.summary?.by_material ?? {}).map(([code, item]) => (
                <li key={code}>
                  <Caption1>{code}: {item.count} Teile · {item.area_sqm.toFixed(3)} m²</Caption1>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}
