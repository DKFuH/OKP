import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { layoutStylesApi, type LayoutStylePreset } from '../api/layoutStyles.js'

type StyleForm = {
  name: string; text_height_mm: number; arrow_size_mm: number
  line_width_mm: number; centerline_dash_mm: number; symbol_scale_mm: number
}

const DEFAULT_FORM: StyleForm = {
  name: 'Standard', text_height_mm: 3.5, arrow_size_mm: 2.5,
  line_width_mm: 0.25, centerline_dash_mm: 6, symbol_scale_mm: 10,
}
const PREVIEW_SCALES = ['1:20', '1:25', '1:50'] as const

const useStyles = makeStyles({
  page: { maxWidth: '800px', margin: '0 auto', display: 'grid', rowGap: tokens.spacingVerticalXXL },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  headerText: { display: 'grid', rowGap: tokens.spacingVerticalXS },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: tokens.spacingVerticalM },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalM },
  th: { textAlign: 'left', padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`, backgroundColor: tokens.colorNeutralBackground3, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  td: { padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
})

export function LayoutStylesPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const [items, setItems] = useState<LayoutStylePreset[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [form, setForm] = useState<StyleForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = useMemo(() => items.find((e) => e.id === activeId) ?? null, [items, activeId])

  useEffect(() => {
    layoutStylesApi.list()
      .then((data) => { setItems(data); if (data[0]) setActiveId(data[0].id) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!active) { setForm(DEFAULT_FORM); return }
    setForm({
      name: active.name, text_height_mm: active.text_height_mm, arrow_size_mm: active.arrow_size_mm,
      line_width_mm: active.line_width_mm, centerline_dash_mm: active.centerline_dash_mm, symbol_scale_mm: active.symbol_scale_mm,
    })
  }, [active])

  function updateField<K extends keyof StyleForm>(key: K, value: StyleForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function createPreset() {
    setSaving(true); setError(null)
    try {
      const created = await layoutStylesApi.create(form)
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveId(created.id)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler') } finally { setSaving(false) }
  }

  async function savePreset() {
    if (!active) return
    setSaving(true); setError(null)
    try {
      const updated = await layoutStylesApi.update(active.id, form)
      setItems((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler') } finally { setSaving(false) }
  }

  async function deletePreset() {
    if (!active || !confirm('Layout-Stil wirklich l\u00f6schen?')) return
    setSaving(true); setError(null)
    try {
      await layoutStylesApi.remove(active.id)
      setItems((prev) => { const next = prev.filter((e) => e.id !== active.id); setActiveId(next[0]?.id ?? null); return next })
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Fehler') } finally { setSaving(false) }
  }

  function previewValue(scale: (typeof PREVIEW_SCALES)[number], paperMm: number): number {
    const denominator = Number(scale.split(':')[1] ?? '20')
    return Number(((paperMm * denominator * 4) / 20).toFixed(2))
  }

  if (loading) return <Spinner label='Lade Layout-Stile\u2026' style={{ marginTop: 64 }} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Title2>Layout-Stile</Title2>
          <Subtitle2>Annotative Presets f\u00fcr Text, Pfeile und Linien pro Blattma\u00dfstab.</Subtitle2>
        </div>
        <Button appearance='subtle' onClick={() => navigate('/settings')}>\u2190 Zur\u00fcck</Button>
      </div>

      {error && <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <Card>
        <CardHeader header={<Body1Strong>Presets</Body1Strong>} />
        <div className={styles.formGrid}>
          <Field label='Stil w\u00e4hlen'>
            <Select value={activeId ?? ''} onChange={(_e, d) => setActiveId(d.value || null)}>
              <Option value=''>Neu erstellen</Option>
              {items.map((e) => <Option key={e.id} value={e.id}>{e.name}</Option>)}
            </Select>
          </Field>
          <Field label='Name'><Input value={form.name} onChange={(_e, d) => updateField('name', d.value)} /></Field>
          <Field label='Textgr\u00f6\u00dfe (mm)'><Input type='number' value={String(form.text_height_mm)} onChange={(_e, d) => updateField('text_height_mm', Number(d.value) || 0)} /></Field>
          <Field label='Pfeilgr\u00f6\u00dfe (mm)'><Input type='number' value={String(form.arrow_size_mm)} onChange={(_e, d) => updateField('arrow_size_mm', Number(d.value) || 0)} /></Field>
          <Field label='Linienst\u00e4rke (mm)'><Input type='number' value={String(form.line_width_mm)} onChange={(_e, d) => updateField('line_width_mm', Number(d.value) || 0)} /></Field>
          <Field label='Centerline Dash (mm)'><Input type='number' value={String(form.centerline_dash_mm)} onChange={(_e, d) => updateField('centerline_dash_mm', Number(d.value) || 0)} /></Field>
          <Field label='Symbolskalierung (mm)'><Input type='number' value={String(form.symbol_scale_mm)} onChange={(_e, d) => updateField('symbol_scale_mm', Number(d.value) || 0)} /></Field>
        </div>
        <div className={styles.actions}>
          <Button appearance='primary' disabled={saving} onClick={() => void (active ? savePreset() : createPreset())}>
            {saving ? <Spinner size='tiny' /> : active ? 'Preset speichern' : 'Preset erstellen'}
          </Button>
          {active && <Button appearance='secondary' disabled={saving} onClick={() => void deletePreset()}>Preset l\u00f6schen</Button>}
        </div>
      </Card>

      <Card>
        <CardHeader header={<Body1Strong>Live-Vorschau</Body1Strong>} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Scale', 'Text px', 'Pfeil px', 'Linie px', 'Dash px', 'Symbol px'].map((h) => (
                <th key={h} className={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PREVIEW_SCALES.map((scale) => (
              <tr key={scale}>
                {[scale, previewValue(scale, form.text_height_mm), previewValue(scale, form.arrow_size_mm), previewValue(scale, form.line_width_mm), previewValue(scale, form.centerline_dash_mm), previewValue(scale, form.symbol_scale_mm)].map((v, i) => (
                  <td key={i} className={styles.td}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
