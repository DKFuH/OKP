import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { layoutStylesApi, type LayoutStylePreset } from '../api/layoutStyles.js'
import styles from './TenantSettingsPage.module.css'

type StyleForm = {
  name: string
  text_height_mm: number
  arrow_size_mm: number
  line_width_mm: number
  centerline_dash_mm: number
  symbol_scale_mm: number
}

const DEFAULT_FORM: StyleForm = {
  name: 'Standard',
  text_height_mm: 3.5,
  arrow_size_mm: 2.5,
  line_width_mm: 0.25,
  centerline_dash_mm: 6,
  symbol_scale_mm: 10,
}

const PREVIEW_SCALES = ['1:20', '1:25', '1:50'] as const

export function LayoutStylesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LayoutStylePreset[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [form, setForm] = useState<StyleForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = useMemo(() => items.find((entry) => entry.id === activeId) ?? null, [items, activeId])

  useEffect(() => {
    layoutStylesApi.list()
      .then((data) => {
        setItems(data)
        if (data[0]) {
          setActiveId(data[0].id)
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!active) {
      setForm(DEFAULT_FORM)
      return
    }

    setForm({
      name: active.name,
      text_height_mm: active.text_height_mm,
      arrow_size_mm: active.arrow_size_mm,
      line_width_mm: active.line_width_mm,
      centerline_dash_mm: active.centerline_dash_mm,
      symbol_scale_mm: active.symbol_scale_mm,
    })
  }, [active])

  function updateField<Key extends keyof StyleForm>(key: Key, value: StyleForm[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function createPreset() {
    setSaving(true)
    setError(null)
    try {
      const created = await layoutStylesApi.create(form)
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveId(created.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preset konnte nicht erstellt werden')
    } finally {
      setSaving(false)
    }
  }

  async function savePreset() {
    if (!active) return
    setSaving(true)
    setError(null)
    try {
      const updated = await layoutStylesApi.update(active.id, form)
      setItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preset konnte nicht gespeichert werden')
    } finally {
      setSaving(false)
    }
  }

  async function deletePreset() {
    if (!active) return
    if (!confirm('Layout-Stil wirklich l\u00f6schen?')) return

    setSaving(true)
    setError(null)
    try {
      await layoutStylesApi.remove(active.id)
      setItems((prev) => {
        const next = prev.filter((entry) => entry.id !== active.id)
        setActiveId(next[0]?.id ?? null)
        return next
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preset konnte nicht gel\u00f6scht werden')
    } finally {
      setSaving(false)
    }
  }

  function previewValue(scale: (typeof PREVIEW_SCALES)[number], paperMm: number): number {
    const denominator = Number(scale.split(':')[1] ?? '20')
    return Number(((paperMm * denominator * 4) / 20).toFixed(2))
  }

  if (loading) return <div className={styles.center}>Lade Layout-Stile\u2026</div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Einstellungen</p>
          <h1>Layout-Stile</h1>
          <p className={styles.subtitle}>Annotative Presets f\u00fcr Text, Pfeile und Linien pro Blattma\u00dfstab.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/settings')}>
            {'\u2190 Zur\u00fcck'}
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Presets</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Stil w\u00e4hlen</span>
            <select value={activeId ?? ''} onChange={(event) => setActiveId(event.target.value || null)}>
              <option value="">Neu erstellen</option>
              {items.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Textgr\u00f6\u00dfe (mm)</span>
            <input type="number" step="0.1" value={form.text_height_mm} onChange={(event) => updateField('text_height_mm', Number(event.target.value) || 0)} />
          </label>
          <label className={styles.field}>
            <span>Pfeilgr\u00f6\u00dfe (mm)</span>
            <input type="number" step="0.1" value={form.arrow_size_mm} onChange={(event) => updateField('arrow_size_mm', Number(event.target.value) || 0)} />
          </label>
          <label className={styles.field}>
            <span>Linienst\u00e4rke (mm)</span>
            <input type="number" step="0.05" value={form.line_width_mm} onChange={(event) => updateField('line_width_mm', Number(event.target.value) || 0)} />
          </label>
          <label className={styles.field}>
            <span>Centerline Dash (mm)</span>
            <input type="number" step="0.5" value={form.centerline_dash_mm} onChange={(event) => updateField('centerline_dash_mm', Number(event.target.value) || 0)} />
          </label>
          <label className={styles.field}>
            <span>Symbolskalierung (mm)</span>
            <input type="number" step="0.5" value={form.symbol_scale_mm} onChange={(event) => updateField('symbol_scale_mm', Number(event.target.value) || 0)} />
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => void (active ? savePreset() : createPreset())}>
            {saving ? 'Speichern\u2026' : active ? 'Preset speichern' : 'Preset erstellen'}
          </button>
          {active && (
            <button type="button" className={styles.btnSecondary} disabled={saving} onClick={() => void deletePreset()}>
              Preset l\u00f6schen
            </button>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Live-Vorschau</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Scale</th>
              <th>Text px</th>
              <th>Pfeil px</th>
              <th>Linie px</th>
              <th>Dash px</th>
              <th>Symbol px</th>
            </tr>
          </thead>
          <tbody>
            {PREVIEW_SCALES.map((scale) => (
              <tr key={scale}>
                <td>{scale}</td>
                <td>{previewValue(scale, form.text_height_mm)}</td>
                <td>{previewValue(scale, form.arrow_size_mm)}</td>
                <td>{previewValue(scale, form.line_width_mm)}</td>
                <td>{previewValue(scale, form.centerline_dash_mm)}</td>
                <td>{previewValue(scale, form.symbol_scale_mm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
