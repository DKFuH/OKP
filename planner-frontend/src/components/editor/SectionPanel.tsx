import { useEffect, useMemo, useState } from 'react'
import type { SectionLine } from '@shared/types'
import type { BuildingLevel } from '../../api/levels.js'
import styles from './SectionPanel.module.css'

type SectionDirection = 'left' | 'right' | 'both'
type SectionScope = 'room_level' | 'single_level' | 'range' | 'all_levels'
type SectionVisibility = 'all' | 'sheet_only' | 'hidden'

interface Props {
  enabled: boolean
  hasSelectedRoom: boolean
  activeLevelId: string | null
  levels: BuildingLevel[]
  sections: SectionLine[]
  selectedSectionId: string | null
  onSelect: (id: string | null) => void
  onCreate: (payload: {
    label?: string
    depth_mm?: number
    direction: SectionDirection
    level_scope: SectionScope
    sheet_visibility: SectionVisibility
  }) => Promise<void>
  onUpdate: (id: string, patch: {
    label?: string
    depth_mm?: number
    direction: SectionDirection
    level_scope: SectionScope
    sheet_visibility: SectionVisibility
  }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const SCOPE_OPTIONS: Array<{ value: SectionScope; label: string }> = [
  { value: 'room_level', label: 'Raumebene' },
  { value: 'single_level', label: 'Aktive Ebene' },
  { value: 'range', label: 'Ebenenbereich' },
  { value: 'all_levels', label: 'Alle Ebenen' },
]

const DIRECTION_OPTIONS: Array<{ value: SectionDirection; label: string }> = [
  { value: 'both', label: 'Beidseitig' },
  { value: 'left', label: 'Links' },
  { value: 'right', label: 'Rechts' },
]

const VISIBILITY_OPTIONS: Array<{ value: SectionVisibility; label: string }> = [
  { value: 'all', label: 'Alle Sheets' },
  { value: 'sheet_only', label: 'Nur aktives Sheet' },
  { value: 'hidden', label: 'Ausgeblendet' },
]

export function SectionPanel({
  enabled,
  hasSelectedRoom,
  activeLevelId,
  levels,
  sections,
  selectedSectionId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [label, setLabel] = useState('')
  const [depthMm, setDepthMm] = useState('1500')
  const [direction, setDirection] = useState<SectionDirection>('both')
  const [levelScope, setLevelScope] = useState<SectionScope>('room_level')
  const [sheetVisibility, setSheetVisibility] = useState<SectionVisibility>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSection = useMemo(
    () => sections.find((entry) => entry.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  )

  useEffect(() => {
    if (!selectedSection) {
      return
    }

    setLabel(selectedSection.label ?? '')
    setDepthMm(typeof selectedSection.depth_mm === 'number' ? String(selectedSection.depth_mm) : '1500')
    setDirection((selectedSection.direction as SectionDirection | undefined) ?? 'both')
    setLevelScope((selectedSection.level_scope as SectionScope | undefined) ?? 'room_level')
    setSheetVisibility((selectedSection.sheet_visibility as SectionVisibility | undefined) ?? 'all')
  }, [selectedSection])

  function resetForCreate() {
    onSelect(null)
    setLabel('')
    setDepthMm('1500')
    setDirection('both')
    setLevelScope('room_level')
    setSheetVisibility('all')
    setError(null)
  }

  function buildPayload() {
    const parsedDepth = Number(depthMm)

    return {
      ...(label.trim() ? { label: label.trim() } : {}),
      ...(Number.isFinite(parsedDepth) && parsedDepth > 0 ? { depth_mm: parsedDepth } : {}),
      direction,
      level_scope: levelScope,
      sheet_visibility: sheetVisibility,
    }
  }

  async function handleCreate() {
    if (!enabled || busy) return
    if (!hasSelectedRoom) {
      setError('Bitte zuerst einen Raum auswählen.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onCreate(buildPayload())
      resetForCreate()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Schnitt konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!enabled || busy || !selectedSectionId) return

    setBusy(true)
    setError(null)
    try {
      await onUpdate(selectedSectionId, buildPayload())
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Schnitt konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!enabled || busy || !selectedSectionId) return

    setBusy(true)
    setError(null)
    try {
      await onDelete(selectedSectionId)
      resetForCreate()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Schnitt konnte nicht gelöscht werden.')
    } finally {
      setBusy(false)
    }
  }

  const activeLevelName = activeLevelId
    ? levels.find((entry) => entry.id === activeLevelId)?.name ?? 'Unbekannte Ebene'
    : null

  if (!enabled) {
    return (
      <section className={styles.section}>
        <h3 className={styles.title}>Sektionen</h3>
        <p className={styles.hint}>Plugin deaktiviert</p>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>Sektionen</h3>
        <button type="button" className={styles.newButton} disabled={busy} onClick={resetForCreate}>
          Neu
        </button>
      </div>

      {sections.length === 0 ? (
        <p className={styles.hint}>Keine vertikalen Schnitte im Raum.</p>
      ) : (
        <ul className={styles.list}>
          {sections.map((entry) => {
            const isActive = entry.id === selectedSectionId
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`${styles.rowButton} ${isActive ? styles.rowButtonActive : ''}`}
                  onClick={() => {
                    onSelect(entry.id)
                    setError(null)
                  }}
                >
                  <span className={styles.rowLabel}>{entry.label?.trim() || `Schnitt ${entry.id.slice(0, 8)}`}</span>
                  <span className={styles.rowMeta}>{entry.level_scope ?? 'room_level'} · {entry.direction ?? 'both'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className={styles.form}>
        <label className={styles.label} htmlFor="section-label">Label</label>
        <input
          id="section-label"
          className={styles.input}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={busy}
          placeholder="z. B. S-A"
        />

        <label className={styles.label} htmlFor="section-depth">Schnitttiefe (mm)</label>
        <input
          id="section-depth"
          className={styles.input}
          type="number"
          min={1}
          value={depthMm}
          onChange={(event) => setDepthMm(event.target.value)}
          disabled={busy}
        />

        <label className={styles.label} htmlFor="section-direction">Richtung</label>
        <select
          id="section-direction"
          className={styles.input}
          value={direction}
          onChange={(event) => setDirection(event.target.value as SectionDirection)}
          disabled={busy}
        >
          {DIRECTION_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>

        <label className={styles.label} htmlFor="section-scope">Level-Scope</label>
        <select
          id="section-scope"
          className={styles.input}
          value={levelScope}
          onChange={(event) => setLevelScope(event.target.value as SectionScope)}
          disabled={busy}
        >
          {SCOPE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>

        <label className={styles.label} htmlFor="section-visibility">Sheet-Sichtbarkeit</label>
        <select
          id="section-visibility"
          className={styles.input}
          value={sheetVisibility}
          onChange={(event) => setSheetVisibility(event.target.value as SectionVisibility)}
          disabled={busy}
        >
          {VISIBILITY_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </div>

      {activeLevelName && <p className={styles.hint}>Aktive Ebene: {activeLevelName}</p>}
      {!hasSelectedRoom && <p className={styles.warn}>Zum Arbeiten mit Schnitten muss ein Raum ausgewählt sein.</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy || !hasSelectedRoom}
          onClick={() => {
            void handleCreate()
          }}
        >
          {busy ? 'Arbeite…' : 'Anlegen'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy || !selectedSectionId}
          onClick={() => {
            void handleSave()
          }}
        >
          Speichern
        </button>
        <button
          type="button"
          className={styles.deleteButton}
          disabled={busy || !selectedSectionId}
          onClick={() => {
            void handleDelete()
          }}
        >
          Löschen
        </button>
      </div>
    </section>
  )
}
