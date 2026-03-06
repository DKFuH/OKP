import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { QuoteLine, PricingGroup } from '@shared/types'
import { quoteLinesApi, pricingGroupsApi } from '../api/projectFeatures.js'
import { projectsApi } from '../api/projects.js'
import { resequenceQuoteLines } from '../api/quotes.js'
import {
  Badge,
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Card,
  CardHeader,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(value)
}

const UNIT_LABELS: Record<QuoteLine['unit'], string> = {
  stk: 'Stk.', m: 'lfm', m2: 'm²', pauschal: 'pauschal',
}

const TYPE_LABELS: Record<QuoteLine['type'], string> = {
  standard: 'Standard', custom: 'Individuell', text: 'Textzeile',
}

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  topRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM, flexWrap: 'wrap',
  },
  actionRow: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', alignItems: 'center' },
  groupList: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  groupChip: {
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    background: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: tokens.fontSizeBase300 },
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
    verticalAlign: 'middle',
  },
  trText: { background: tokens.colorNeutralBackground2, fontStyle: 'italic' },
  trEditing: { background: tokens.colorBrandBackground2 },
  trExcluded: { opacity: 0.5 },
  cellInput: {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    fontSize: tokens.fontSizeBase300,
    background: tokens.colorNeutralBackground1,
  },
  cellSelect: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
    fontSize: tokens.fontSizeBase300,
    background: tokens.colorNeutralBackground1,
  },
  numCol: { textAlign: 'right' as const },
  summaryGrid: {
    display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap',
    padding: tokens.spacingVerticalM,
    background: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  savingsText: { color: tokens.colorPaletteGreenForeground2 },
})

export function QuoteLinesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const styles = useStyles()
  const [lines, setLines] = useState<QuoteLine[]>([])
  const [pricingGroups, setPricingGroups] = useState<PricingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [latestQuoteId, setLatestQuoteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([quoteLinesApi.list(projectId), pricingGroupsApi.list(projectId), projectsApi.get(projectId)])
      .then(([ql, pg, project]) => {
        setLines(ql)
        setPricingGroups(pg)
        const latestQuote = [...project.quotes].sort((l, r) => r.version - l.version)[0] ?? null
        setLatestQuoteId(latestQuote?.id ?? null)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectId])

  async function handleResequenceFromPosition() {
    if (!latestQuoteId) { setError('Keine Angebotsversion vorhanden.'); return }
    const rawStart = window.prompt('Neue Start-Positionsnummer:', '1')
    if (rawStart == null) return
    const startPosition = Number.parseInt(rawStart, 10)
    if (!Number.isFinite(startPosition) || startPosition < 1) { setError('Bitte gueltige Zahl eingeben.'); return }
    setError(null); setSuccessMsg(null)
    try {
      const result = await resequenceQuoteLines(latestQuoteId, startPosition)
      setSuccessMsg(`Positionen neu nummeriert: ${result.updated_count} Zeilen, Start bei ${result.start_position}.`)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler') }
  }

  async function handleAddLine(type: QuoteLine['type']) {
    if (!projectId) return
    setError(null)
    try {
      const newLine = await quoteLinesApi.create(projectId, {
        type, description: type === 'text' ? 'Ueberschrift' : 'Neue Position',
        qty: 1, unit: 'stk', list_price_net: 0, position_discount_pct: 0, sort_order: lines.length,
      })
      setLines((prev) => [...prev, newLine])
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler beim Anlegen') }
  }

  async function handleUpdateLine(lineId: string, data: Partial<Omit<QuoteLine, 'id' | 'project_id'>>) {
    if (!projectId) return
    setError(null)
    try {
      const updated = await quoteLinesApi.update(projectId, lineId, data)
      setLines((prev) => prev.map((l) => (l.id === lineId ? updated : l)))
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler beim Speichern') }
  }

  async function handleDeleteLine(lineId: string) {
    if (!projectId || !confirm('Position wirklich loeschen?')) return
    setError(null)
    try {
      await quoteLinesApi.delete(projectId, lineId)
      setLines((prev) => prev.filter((l) => l.id !== lineId))
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler beim Loeschen') }
  }

  async function handleAddPricingGroup() {
    if (!projectId) return
    const name = window.prompt('Name der Preisgruppe:', 'Preisgruppe')
    if (!name?.trim()) return
    const discountStr = window.prompt('Rabatt in % (z.B. 10):', '0')
    const discount = parseFloat(discountStr ?? '0')
    if (!Number.isFinite(discount)) return
    setError(null)
    try {
      const group = await pricingGroupsApi.create(projectId, { name: name.trim(), discount_pct: discount })
      setPricingGroups((prev) => [...prev, group])
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler') }
  }

  const activeLines = lines.filter((l) => l.type !== 'text' && !l.exclude_from_quote)
  const totalListNet = activeLines.reduce((sum, l) => sum + l.list_price_net * l.qty, 0)
  const totalAfterDiscount = activeLines.reduce((sum, l) => {
    const group = pricingGroups.find((g) => g.id === l.pricing_group_id)
    const groupDiscount = group?.discount_pct ?? 0
    const totalDiscount = Math.min(100, l.position_discount_pct + groupDiscount)
    return sum + l.list_price_net * l.qty * (1 - totalDiscount / 100)
  }, 0)

  if (loading) return <Spinner label='Lade Angebotspositionen...' />

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div>
          <Title2>Angebotspositionen</Title2>
          <Caption1>Projekt {projectId?.slice(0, 8)}…</Caption1>
        </div>
        <div className={styles.actionRow}>
          <Button appearance='subtle' onClick={() => navigate(projectId ? `/projects/${projectId}` : '/')}>← Zurueck</Button>
          <Button appearance='subtle' onClick={() => void handleResequenceFromPosition()} disabled={!latestQuoteId}>
            Pos.-Nr. neu ab…
          </Button>
          <Button appearance='subtle' onClick={() => void handleAddLine('text')}>+ Textzeile</Button>
          <Button appearance='subtle' onClick={() => void handleAddLine('custom')}>+ Individuell</Button>
          <Button appearance='primary' onClick={() => void handleAddLine('standard')}>+ Standard</Button>
        </div>
      </div>

      {error && <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {successMsg && <MessageBar intent='success'><MessageBarBody>{successMsg}</MessageBarBody></MessageBar>}

      <Card>
        <CardHeader header={<Body1Strong>Preisgruppen</Body1Strong>}
          action={<Button size='small' appearance='subtle' onClick={() => void handleAddPricingGroup()}>+ Preisgruppe</Button>}
        />
        {pricingGroups.length === 0 ? (
          <Caption1>Keine Preisgruppen angelegt.</Caption1>
        ) : (
          <div className={styles.groupList}>
            {pricingGroups.map((group) => (
              <div key={group.id} className={styles.groupChip}>
                <Body1Strong>{group.name}</Body1Strong>
                <Caption1>{group.discount_pct}% Rabatt</Caption1>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        {lines.length === 0 ? (
          <Body1>Noch keine Angebotspositionen. Lege die erste Position oben an.</Body1>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Typ</th>
                  <th className={styles.th}>Beschreibung</th>
                  <th className={`${styles.th} ${styles.numCol}`}>Menge</th>
                  <th className={styles.th}>Einheit</th>
                  <th className={`${styles.th} ${styles.numCol}`}>Einzelpreis netto</th>
                  <th className={`${styles.th} ${styles.numCol}`}>Pos.-Rabatt</th>
                  <th className={styles.th}>Preisgruppe</th>
                  <th className={`${styles.th} ${styles.numCol}`}>Gesamt netto</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {[...lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((line) => (
                  <QuoteLineRow
                    key={line.id}
                    line={line}
                    pricingGroups={pricingGroups}
                    isEditing={editingId === line.id}
                    styles={styles}
                    onStartEdit={() => setEditingId(line.id)}
                    onEndEdit={() => setEditingId(null)}
                    onUpdate={(data) => void handleUpdateLine(line.id, data)}
                    onDelete={() => void handleDeleteLine(line.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {activeLines.length > 0 && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <Caption1>Listenpreis gesamt (netto)</Caption1>
            <Body1Strong>{formatEur(totalListNet)}</Body1Strong>
          </div>
          <div className={styles.summaryItem}>
            <Caption1>Nach Rabatten (netto)</Caption1>
            <Body1Strong>{formatEur(totalAfterDiscount)}</Body1Strong>
          </div>
          <div className={styles.summaryItem}>
            <Caption1>Ersparnis</Caption1>
            <Body1Strong className={styles.savingsText}>{formatEur(totalListNet - totalAfterDiscount)}</Body1Strong>
          </div>
          <div className={styles.summaryItem}>
            <Caption1>MwSt. 19%</Caption1>
            <Body1Strong>{formatEur(totalAfterDiscount * 0.19)}</Body1Strong>
          </div>
          <div className={styles.summaryItem}>
            <Caption1>Gesamtbetrag (brutto)</Caption1>
            <Body1Strong>{formatEur(totalAfterDiscount * 1.19)}</Body1Strong>
          </div>
        </div>
      )}
    </div>
  )
}

interface QuoteLineRowProps {
  line: QuoteLine
  pricingGroups: PricingGroup[]
  isEditing: boolean
  styles: ReturnType<typeof useStyles>
  onStartEdit: () => void
  onEndEdit: () => void
  onUpdate: (data: Partial<Omit<QuoteLine, 'id' | 'project_id'>>) => void
  onDelete: () => void
}

function QuoteLineRow({ line, pricingGroups, isEditing, styles, onStartEdit, onEndEdit, onUpdate, onDelete }: QuoteLineRowProps) {
  const [desc, setDesc] = useState(line.description)
  const [qty, setQty] = useState(String(line.qty))
  const [price, setPrice] = useState(String(line.list_price_net))
  const [discount, setDiscount] = useState(String(line.position_discount_pct))

  useEffect(() => {
    setDesc(line.description)
    setQty(String(line.qty))
    setPrice(String(line.list_price_net))
    setDiscount(String(line.position_discount_pct))
  }, [line.id])

  function commitAll() {
    const nextQty = parseFloat(qty)
    const nextPrice = parseFloat(price)
    const nextDiscount = parseFloat(discount)
    onUpdate({
      description: desc.trim() || line.description,
      qty: Number.isFinite(nextQty) && nextQty > 0 ? nextQty : line.qty,
      list_price_net: Number.isFinite(nextPrice) && nextPrice >= 0 ? nextPrice : line.list_price_net,
      position_discount_pct: Number.isFinite(nextDiscount) && nextDiscount >= 0 ? nextDiscount : line.position_discount_pct,
    })
    onEndEdit()
  }

  const group = pricingGroups.find((g) => g.id === line.pricing_group_id)
  const groupDiscount = group?.discount_pct ?? 0
  const totalDiscount = Math.min(100, line.position_discount_pct + groupDiscount)
  const lineTotal = line.type !== 'text' ? line.list_price_net * line.qty * (1 - totalDiscount / 100) : null
  const isTextLine = line.type === 'text'

  if (!isEditing) {
    return (
      <tr
        className={`${isTextLine ? styles.trText : ''} ${line.exclude_from_quote ? styles.trExcluded : ''}`}
        onDoubleClick={onStartEdit}
      >
        <td className={styles.td}><Badge appearance='tint'>{TYPE_LABELS[line.type]}</Badge></td>
        <td className={styles.td}>{line.description}</td>
        <td className={`${styles.td} ${styles.numCol}`}>{isTextLine ? '–' : line.qty}</td>
        <td className={styles.td}>{isTextLine ? '–' : UNIT_LABELS[line.unit]}</td>
        <td className={`${styles.td} ${styles.numCol}`}>{isTextLine ? '–' : formatEur(line.list_price_net)}</td>
        <td className={`${styles.td} ${styles.numCol}`}>{isTextLine ? '–' : `${line.position_discount_pct}%`}</td>
        <td className={styles.td}>{group?.name ?? '–'}</td>
        <td className={`${styles.td} ${styles.numCol}`}>{lineTotal != null ? formatEur(lineTotal) : '–'}</td>
        <td className={styles.td}>
          <Button size='small' appearance='subtle' onClick={onStartEdit} title='Bearbeiten'>✎</Button>
          <Button size='small' appearance='subtle' onClick={onDelete} title='Loeschen'>×</Button>
        </td>
      </tr>
    )
  }

  return (
    <tr className={styles.trEditing}>
      <td className={styles.td}><Badge appearance='tint'>{TYPE_LABELS[line.type]}</Badge></td>
      <td className={styles.td}>
        <input className={styles.cellInput} value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus />
      </td>
      <td className={styles.td}>
        {!isTextLine && <input className={styles.cellInput} type='number' min={0.001} step={0.001} value={qty} onChange={(e) => setQty(e.target.value)} />}
      </td>
      <td className={styles.td}>
        {!isTextLine && (
          <select className={styles.cellSelect} value={line.unit} onChange={(e) => onUpdate({ unit: e.target.value as QuoteLine['unit'] })}>
            {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
      </td>
      <td className={styles.td}>
        {!isTextLine && <input className={styles.cellInput} type='number' min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} />}
      </td>
      <td className={styles.td}>
        {!isTextLine && <input className={styles.cellInput} type='number' min={0} max={100} step={0.1} value={discount} onChange={(e) => setDiscount(e.target.value)} />}
      </td>
      <td className={styles.td}>
        {!isTextLine && (
          <select className={styles.cellSelect} value={line.pricing_group_id ?? ''} onChange={(e) => onUpdate({ pricing_group_id: e.target.value || undefined })}>
            <option value=''>Keine</option>
            {pricingGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </td>
      <td className={styles.td}></td>
      <td className={styles.td}>
        <Button size='small' appearance='primary' onClick={commitAll}>✓</Button>
        <Button size='small' appearance='subtle' onClick={onEndEdit}>✕</Button>
      </td>
    </tr>
  )
}
