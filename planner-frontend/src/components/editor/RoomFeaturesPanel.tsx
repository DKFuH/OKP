import { useEffect, useState } from 'react'
import type {
  MeasureLine,
  Comment,
  WorktopSchema,
  RoomColoring,
  RoomSurfaceColor,
  DecoObject,
  LightingProfile,
  LightSource,
} from '@shared/types'
import { annotationsApi, worktopsApi, roomDecorationApi, lightingApi } from '../../api/rooms.js'
import styles from './RoomFeaturesPanel.module.css'

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

const SURFACE_LABELS: Record<RoomSurfaceColor['surface'], string> = {
  floor: 'Boden',
  ceiling: 'Decke',
  wall_north: 'Wand Nord',
  wall_south: 'Wand Süd',
  wall_east: 'Wand Ost',
  wall_west: 'Wand West',
}

const SURFACE_KEYS: RoomSurfaceColor['surface'][] = [
  'floor', 'ceiling', 'wall_north', 'wall_south', 'wall_east', 'wall_west',
]

// ─── Haupt-Komponente ────────────────────────────────────────────────────────

interface Props {
  roomId: string
}

export function RoomFeaturesPanel({ roomId }: Props) {
  return (
    <>
      <WorktopsSection roomId={roomId} />
      <AnnotationsSection roomId={roomId} />
      <RoomDecorationSection roomId={roomId} />
      <LightingSection roomId={roomId} />
    </>
  )
}

// ─── Arbeitsflächen (Sprint 36) ──────────────────────────────────────────────

function WorktopsSection({ roomId }: { roomId: string }) {
  const [worktops, setWorktops] = useState<WorktopSchema[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    worktopsApi.list(roomId)
      .then(setWorktops)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roomId, open])

  async function handleAdd() {
    setError(null)
    try {
      const created = await worktopsApi.create(roomId, {
        polygon: [
          { x_mm: 0, y_mm: 0 },
          { x_mm: 600, y_mm: 0 },
          { x_mm: 600, y_mm: 600 },
          { x_mm: 0, y_mm: 600 },
        ],
        edges: [],
        thickness_mm: 38,
        overhang_mm: 20,
      })
      setWorktops((prev) => [...prev, created])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  async function handleDelete(schemaId: string) {
    setError(null)
    try {
      await worktopsApi.delete(roomId, schemaId)
      setWorktops((prev) => prev.filter((w) => w.id !== schemaId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  return (
    <div className={styles.section}>
      <button type="button" className={styles.collapseHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.sectionTitle}>Arbeitsflächen</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.muted}>Lade…</p>
          ) : worktops.length === 0 ? (
            <p className={styles.muted}>Keine Arbeitsflächen</p>
          ) : (
            <div className={styles.list}>
              {worktops.map((w) => (
                <div key={w.id} className={styles.listItem}>
                  <span>{w.article_number ?? 'Ohne Artikelnummer'}</span>
                  <span className={styles.dim}>{w.thickness_mm ?? '–'} mm Stärke · {w.polygon.length} Eckpunkte</span>
                  <button type="button" className={styles.deleteBtn} onClick={() => void handleDelete(w.id)}>
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className={styles.addBtn} onClick={() => void handleAdd()}>
            + Arbeitsfläche hinzufügen
          </button>
        </>
      )}
    </div>
  )
}

// ─── Annotationen (Sprint 37) ────────────────────────────────────────────────

function AnnotationsSection({ roomId }: { roomId: string }) {
  const [measureLines, setMeasureLines] = useState<MeasureLine[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      annotationsApi.listMeasureLines(roomId),
      annotationsApi.listComments(roomId),
    ])
      .then(([lines, comms]) => {
        setMeasureLines(lines)
        setComments(comms)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roomId, open])

  async function handleAddMeasureLine() {
    setError(null)
    try {
      const line = await annotationsApi.createMeasureLine(roomId, {
        points: [{ x_mm: 0, y_mm: 0 }, { x_mm: 1000, y_mm: 0 }],
        label: 'Maßlinie',
        is_chain: false,
      })
      setMeasureLines((prev) => [...prev, line])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  async function handleDeleteMeasureLine(lineId: string) {
    setError(null)
    try {
      await annotationsApi.deleteMeasureLine(roomId, lineId)
      setMeasureLines((prev) => prev.filter((l) => l.id !== lineId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    setError(null)
    try {
      const comment = await annotationsApi.createComment(roomId, {
        position: { x_mm: 500, y_mm: 500 },
        text: newComment.trim(),
        show_in_plan: true,
        show_in_perspective: true,
      })
      setComments((prev) => [...prev, comment])
      setNewComment('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  async function handleDeleteComment(commentId: string) {
    setError(null)
    try {
      await annotationsApi.deleteComment(roomId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  return (
    <div className={styles.section}>
      <button type="button" className={styles.collapseHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.sectionTitle}>Annotationen</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.muted}>Lade…</p>
          ) : (
            <>
              <p className={styles.subTitle}>Maßlinien ({measureLines.length})</p>
              {measureLines.length === 0 ? (
                <p className={styles.muted}>Keine Maßlinien</p>
              ) : (
                <div className={styles.list}>
                  {measureLines.map((line) => (
                    <div key={line.id} className={styles.listItem}>
                      <span>{line.label ?? 'Maßlinie'} · {line.points.length} Punkte</span>
                      <button type="button" className={styles.deleteBtn} onClick={() => void handleDeleteMeasureLine(line.id)}>
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className={styles.addBtn} onClick={() => void handleAddMeasureLine()}>
                + Maßlinie hinzufügen
              </button>

              <p className={styles.subTitle} style={{ marginTop: '0.75rem' }}>Kommentare ({comments.length})</p>
              {comments.length === 0 ? (
                <p className={styles.muted}>Keine Kommentare</p>
              ) : (
                <div className={styles.list}>
                  {comments.map((c) => (
                    <div key={c.id} className={styles.listItem}>
                      <span>{c.text}</span>
                      <button type="button" className={styles.deleteBtn} onClick={() => void handleDeleteComment(c.id)}>
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => void handleAddComment(e)} className={styles.inlineForm}>
                <input
                  type="text"
                  placeholder="Kommentar…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className={styles.inlineInput}
                />
                <button type="submit" className={styles.btnAdd}>+</button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Raumgestaltung (Sprint 38) ──────────────────────────────────────────────

function RoomDecorationSection({ roomId }: { roomId: string }) {
  const [coloring, setColoring] = useState<RoomColoring | null>(null)
  const [decoObjects, setDecoObjects] = useState<DecoObject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      roomDecorationApi.getColoring(roomId),
      roomDecorationApi.listDecoObjects(roomId),
    ])
      .then(([c, d]) => {
        setColoring(c)
        setDecoObjects(d)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roomId, open])

  async function handleColorChange(surface: RoomSurfaceColor['surface'], colorHex: string) {
    setError(null)
    const currentSurfaces = coloring?.surfaces ?? []
    const nextSurfaces: RoomSurfaceColor[] = [
      ...currentSurfaces.filter((s) => s.surface !== surface),
      { surface, color_hex: colorHex },
    ]
    try {
      await roomDecorationApi.updateColoring(roomId, { surfaces: nextSurfaces })
      setColoring((prev) => prev ? { ...prev, surfaces: nextSurfaces } : { id: '', room_id: roomId, surfaces: nextSurfaces })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  async function handleDeleteDeco(decoId: string) {
    setError(null)
    try {
      await roomDecorationApi.deleteDecoObject(roomId, decoId)
      setDecoObjects((prev) => prev.filter((d) => d.id !== decoId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  return (
    <div className={styles.section}>
      <button type="button" className={styles.collapseHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.sectionTitle}>Raumgestaltung</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.muted}>Lade…</p>
          ) : (
            <>
              <p className={styles.subTitle}>Oberflächen</p>
              <div className={styles.colorGrid}>
                {SURFACE_KEYS.map((surfaceKey) => {
                  const entry = coloring?.surfaces.find((s) => s.surface === surfaceKey)
                  return (
                    <label key={surfaceKey} className={styles.colorRow}>
                      <span>{SURFACE_LABELS[surfaceKey]}</span>
                      <input
                        type="color"
                        value={entry?.color_hex ?? '#ffffff'}
                        onChange={(e) => void handleColorChange(surfaceKey, e.target.value)}
                        className={styles.colorInput}
                      />
                    </label>
                  )
                })}
              </div>

              <p className={styles.subTitle} style={{ marginTop: '0.75rem' }}>Dekoobjekte ({decoObjects.length})</p>
              {decoObjects.length === 0 ? (
                <p className={styles.muted}>Keine Dekoobjekte</p>
              ) : (
                <div className={styles.list}>
                  {decoObjects.map((d) => (
                    <div key={d.id} className={styles.listItem}>
                      <span>{d.catalog_item_id.slice(0, 8)}…</span>
                      <span className={styles.dim}>
                        X: {Math.round(d.position.x_mm)} · Y: {Math.round(d.position.y_mm)} · {d.rotation_deg}°
                      </span>
                      <button type="button" className={styles.deleteBtn} onClick={() => void handleDeleteDeco(d.id)}>
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Beleuchtung (Sprint 39) ─────────────────────────────────────────────────

function LightingSection({ roomId }: { roomId: string }) {
  const [profiles, setProfiles] = useState<LightingProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    lightingApi.listProfiles(roomId)
      .then(setProfiles)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roomId, open])

  async function handleAddProfile() {
    setError(null)
    const defaultLight: LightSource = {
      id: crypto.randomUUID(),
      type: 'general',
      position: { x_mm: 0, y_mm: 0, z_mm: 2400 },
      intensity: 1000,
      color_temp_k: 3000,
    }
    try {
      const profile = await lightingApi.createProfile(roomId, {
        name: 'Beleuchtungsprofil',
        lights: [defaultLight],
      })
      setProfiles((prev) => [...prev, profile])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  async function handleDeleteProfile(profileId: string) {
    setError(null)
    try {
      await lightingApi.deleteProfile(roomId, profileId)
      setProfiles((prev) => prev.filter((p) => p.id !== profileId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    }
  }

  return (
    <div className={styles.section}>
      <button type="button" className={styles.collapseHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.sectionTitle}>Beleuchtung</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.muted}>Lade…</p>
          ) : profiles.length === 0 ? (
            <p className={styles.muted}>Keine Beleuchtungsprofile</p>
          ) : (
            <div className={styles.list}>
              {profiles.map((profile) => (
                <div key={profile.id} className={styles.listItem}>
                  <strong>{profile.name}</strong>
                  <span className={styles.dim}>{profile.lights.length} Lichtquellen</span>
                  <div className={styles.lightDetails}>
                    {profile.lights.map((light) => (
                      <span key={light.id} className={styles.lightChip}>
                        {light.type} · {light.intensity} lm
                        {light.color_temp_k != null ? ` · ${light.color_temp_k}K` : ''}
                      </span>
                    ))}
                  </div>
                  <button type="button" className={styles.deleteBtn} onClick={() => void handleDeleteProfile(profile.id)}>
                    Profil löschen
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className={styles.addBtn} onClick={() => void handleAddProfile()}>
            + Beleuchtungsprofil hinzufügen
          </button>
        </>
      )}
    </div>
  )
}
