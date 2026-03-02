import { useEffect, useState } from 'react'
import type { WallObject, WallInstallation } from '@shared/types'
import { wallObjectsApi, installationsApi, wallsApi } from '../../api/rooms.js'
import styles from './WallFeaturesPanel.module.css'

// ─── Typen ──────────────────────────────────────────────────────────────────

const WALL_OBJECT_TYPE_LABELS: Record<WallObject['type'], string> = {
  door_single: 'Eintürig',
  door_double: 'Zweitürig',
  pass_through: 'Durchgang',
  window_single: 'Fenster einfach',
  window_double: 'Fenster doppelt',
  window_casement: 'Flügelfenster',
}

const INSTALLATION_TYPE_LABELS: Record<WallInstallation['installation_type'], string> = {
  socket_single: 'Steckdose (1-fach)',
  socket_double: 'Steckdose (2-fach)',
  socket_triple: 'Steckdose (3-fach)',
  water: 'Wasseranschluss',
  drain: 'Abfluss',
  gas: 'Gasanschluss',
  '400v_floor': ' 400V Bodendose',
}

interface Props {
  roomId: string
  wallId: string
  wallLengthMm: number
}

export function WallFeaturesPanel({ roomId, wallId, wallLengthMm }: Props) {
  const [wallObjects, setWallObjects] = useState<WallObject[]>([])
  const [installations, setInstallations] = useState<WallInstallation[]>([])
  const [loadingObjects, setLoadingObjects] = useState(false)
  const [loadingInstallations, setLoadingInstallations] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wand-Objekte & Installationen laden
  useEffect(() => {
    setError(null)
    setLoadingObjects(true)
    setLoadingInstallations(true)

    wallObjectsApi.listByRoom(roomId)
      .then((all) => setWallObjects(all.filter((o) => o.wall_id === wallId)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingObjects(false))

    installationsApi.listByRoom(roomId)
      .then((all) => setInstallations(all.filter((i) => i.wall_id === wallId)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingInstallations(false))
  }, [roomId, wallId])

  // ─── Wand-Objekte ────────────────────────────────────────────────────────

  async function handleAddWallObject() {
    setError(null)
    const defaultOffset = Math.max(0, Math.round((wallLengthMm - 900) / 2))
    try {
      const created = await wallObjectsApi.create(wallId, roomId, {
        type: 'door_single',
        offset_mm: defaultOffset,
        width_mm: 900,
        height_mm: 2100,
        hinge_side: 'left',
        door_direction: 'inward',
        show_in_plan: true,
        show_in_view: true,
      })
      setWallObjects((prev) => [...prev, created])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Anlegen')
    }
  }

  async function handleUpdateHinge(objId: string, hingeSide: 'left' | 'right') {
    setError(null)
    try {
      await wallObjectsApi.updateHingeSide(objId, roomId, hingeSide)
      setWallObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, hinge_side: hingeSide } : o)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  async function handleToggleVisibility(obj: WallObject) {
    setError(null)
    const next = { show_in_plan: !obj.show_in_plan, show_in_view: obj.show_in_view }
    try {
      await wallObjectsApi.updateVisibility(obj.id, roomId, next)
      setWallObjects((prev) => prev.map((o) => (o.id === obj.id ? { ...o, ...next } : o)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  // ─── Installationen ──────────────────────────────────────────────────────

  async function handleAddInstallation() {
    setError(null)
    try {
      const created = await installationsApi.create(wallId, roomId, {
        installation_type: 'socket_single',
        offset_mm: Math.round(wallLengthMm / 2),
        height_from_floor_mm: 300,
        show_in_plan: true,
        show_in_view: true,
        symbol_type: 'installation_symbol',
      })
      setInstallations((prev) => [...prev, created])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Anlegen')
    }
  }

  // ─── Wand-Operationen (Sprint 31) ────────────────────────────────────────

  async function handleShiftWall(deltaMm: number) {
    setError(null)
    try {
      await wallsApi.shift(wallId, roomId, deltaMm)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Verschieben')
    }
  }

  async function handleSplitWall() {
    setError(null)
    const offsetStr = window.prompt('Trennpunkt (mm vom Wandstart):', String(Math.round(wallLengthMm / 2)))
    if (!offsetStr) return
    const offsetMm = parseFloat(offsetStr)
    if (!Number.isFinite(offsetMm) || offsetMm <= 0 || offsetMm >= wallLengthMm) {
      setError('Ungültiger Trennpunkt')
      return
    }
    try {
      await wallsApi.split(wallId, roomId, offsetMm)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Teilen')
    }
  }

  return (
    <>
      {/* Wand-Operationen (Sprint 31) */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Wand-Operationen</h3>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.buttonRow}>
          <button type="button" className={styles.btnSmall} onClick={() => void handleShiftWall(-100)}>
            ← 100mm
          </button>
          <button type="button" className={styles.btnSmall} onClick={() => void handleShiftWall(100)}>
            100mm →
          </button>
          <button type="button" className={styles.btnSmall} onClick={() => void handleSplitWall()}>
            Wand teilen
          </button>
        </div>
      </div>

      {/* Wand-Objekte (Sprint 32) */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Türen & Fenster</h3>
        {loadingObjects ? (
          <p className={styles.muted}>Lade…</p>
        ) : wallObjects.length === 0 ? (
          <p className={styles.muted}>Keine Türen/Fenster an dieser Wand</p>
        ) : (
          <div className={styles.list}>
            {wallObjects.map((obj) => (
              <WallObjectRow
                key={obj.id}
                obj={obj}
                onUpdateHinge={handleUpdateHinge}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        )}
        <button type="button" className={styles.addBtn} onClick={() => void handleAddWallObject()}>
          + Tür/Fenster hinzufügen
        </button>
      </div>

      {/* Installationen (Sprint 33) */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Installationen</h3>
        {loadingInstallations ? (
          <p className={styles.muted}>Lade…</p>
        ) : installations.length === 0 ? (
          <p className={styles.muted}>Keine Installationen an dieser Wand</p>
        ) : (
          <div className={styles.list}>
            {installations.map((inst) => (
              <div key={inst.id} className={styles.listItem}>
                <strong>{INSTALLATION_TYPE_LABELS[inst.installation_type] ?? inst.installation_type}</strong>
                <span>Abstand: {inst.offset_mm} mm</span>
                {inst.height_from_floor_mm != null && (
                  <span>Höhe: {inst.height_from_floor_mm} mm</span>
                )}
              </div>
            ))}
          </div>
        )}
        <button type="button" className={styles.addBtn} onClick={() => void handleAddInstallation()}>
          + Installation hinzufügen
        </button>
      </div>
    </>
  )
}

// ─── WallObjectRow ───────────────────────────────────────────────────────────

function WallObjectRow({ obj, onUpdateHinge, onToggleVisibility }: {
  obj: WallObject
  onUpdateHinge: (id: string, side: 'left' | 'right') => void
  onToggleVisibility: (obj: WallObject) => void
}) {
  return (
    <div className={styles.listItem}>
      <strong>{WALL_OBJECT_TYPE_LABELS[obj.type] ?? obj.type}</strong>
      <span>Abstand: {obj.offset_mm} mm · Breite: {obj.width_mm} mm</span>
      {obj.hinge_side != null && (
        <div className={styles.inlineRow}>
          <span>Angel:</span>
          <select
            value={obj.hinge_side}
            onChange={(e) => onUpdateHinge(obj.id, e.target.value as 'left' | 'right')}
          >
            <option value="left">Links</option>
            <option value="right">Rechts</option>
          </select>
        </div>
      )}
      <button
        type="button"
        className={styles.btnTiny}
        onClick={() => onToggleVisibility(obj)}
      >
        {obj.show_in_plan ? 'Im Plan sichtbar' : 'Im Plan ausgeblendet'}
      </button>
    </div>
  )
}
