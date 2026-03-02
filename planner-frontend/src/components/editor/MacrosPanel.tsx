import { useEffect, useState, type FormEvent } from 'react'
import type { Macro } from '@shared/types'
import { macrosApi } from '../../api/projectFeatures.js'
import type { Placement } from '../../api/placements.js'
import styles from './MacrosPanel.module.css'

interface Props {
  projectId: string
  currentPlacements?: Placement[]
}

export function MacrosPanel({ projectId, currentPlacements = [] }: Props) {
  const [macros, setMacros] = useState<Macro[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [newMacroName, setNewMacroName] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    macrosApi.list(projectId)
      .then(setMacros)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectId, open])

  async function handleSaveMacro(e: FormEvent) {
    e.preventDefault()
    if (!newMacroName.trim() || currentPlacements.length === 0) return
    setError(null)
    try {
      const macro = await macrosApi.create(projectId, {
        name: newMacroName.trim(),
        placements: currentPlacements as Macro['placements'],
      })
      setMacros((prev) => [...prev, macro])
      setNewMacroName('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  async function handleDelete(macroId: string) {
    if (!confirm('Makro wirklich löschen?')) return
    setError(null)
    try {
      await macrosApi.delete(projectId, macroId)
      setMacros((prev) => prev.filter((m) => m.id !== macroId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen')
    }
  }

  return (
    <div className={styles.section}>
      <button type="button" className={styles.collapseHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.sectionTitle}>Makros (Sprint 35)</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.muted}>Lade…</p>
          ) : macros.length === 0 ? (
            <p className={styles.muted}>Keine Makros vorhanden</p>
          ) : (
            <div className={styles.list}>
              {macros.map((macro) => (
                <div key={macro.id} className={styles.listItem}>
                  <strong>{macro.name}</strong>
                  <span>{macro.placements.length} Platzierungen</span>
                  {macro.created_at && (
                    <span>{new Date(macro.created_at).toLocaleDateString('de-DE')}</span>
                  )}
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => void handleDelete(macro.id)}
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.saveArea}>
            <p className={styles.hint}>
              Aktuelle Platzierungen ({currentPlacements.length}) als Makro speichern:
            </p>
            <form onSubmit={(e) => void handleSaveMacro(e)} className={styles.inlineForm}>
              <input
                type="text"
                placeholder="Makro-Name…"
                value={newMacroName}
                onChange={(e) => setNewMacroName(e.target.value)}
                className={styles.inlineInput}
                disabled={currentPlacements.length === 0}
              />
              <button
                type="submit"
                className={styles.btnAdd}
                disabled={!newMacroName.trim() || currentPlacements.length === 0}
              >
                Speichern
              </button>
            </form>
            {currentPlacements.length === 0 && (
              <p className={styles.hint}>Zuerst Elemente in diesem Raum platzieren.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
