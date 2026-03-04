import { useEffect, useMemo, useState } from 'react'
import { materialLibraryApi } from '../../api/materialLibrary.js'
import type { Placement } from '../../api/placements.js'
import type { RoomPayload } from '../../api/rooms.js'
import {
  MATERIAL_CATEGORY_LABELS,
  type MaterialAssignmentPayload,
  type MaterialLibraryItem,
  type MaterialSurfaceTarget,
} from '../../plugins/materials/index.js'
import styles from './MaterialPanel.module.css'

interface MaterialPanelProps {
  projectId: string
  room: RoomPayload | null
  onApplied: (roomId: string, patch: { coloring: unknown; placements: Placement[] }) => void
}

type TargetType = 'surface' | 'placement'

type StatusState =
  | { kind: 'idle'; message: string }
  | { kind: 'loading'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string }

interface PlacementOption {
  id: string
  label: string
}

const SURFACE_OPTIONS: Array<{ value: MaterialSurfaceTarget; label: string }> = [
  { value: 'floor', label: 'Boden' },
  { value: 'ceiling', label: 'Decke' },
  { value: 'wall_north', label: 'Wand Nord' },
  { value: 'wall_south', label: 'Wand Süd' },
  { value: 'wall_east', label: 'Wand Ost' },
  { value: 'wall_west', label: 'Wand West' },
]

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function asPositive(value: unknown, fallback: number): number {
  const parsed = asNumber(value, fallback)
  if (parsed <= 0) return fallback
  return parsed
}

function normalizeRotation(value: number): number {
  return ((value % 360) + 360) % 360
}

function readSurfacePrefill(room: RoomPayload | null, surface: MaterialSurfaceTarget) {
  const coloringRecord = asRecord(room?.coloring)
  const surfaceEntries = Array.isArray(coloringRecord?.surfaces) ? coloringRecord.surfaces : []

  const selected = surfaceEntries
    .map((entry) => asRecord(entry))
    .find((entry) => entry?.surface === surface)

  const uvScale = asRecord(selected?.uv_scale)

  const materialItemId = selected?.material_item_id ?? selected?.material_id
  return {
    materialItemId: typeof materialItemId === 'string' ? materialItemId : '',
    uvX: String(asPositive(uvScale?.x, 1)),
    uvY: String(asPositive(uvScale?.y, 1)),
    rotationDeg: String(normalizeRotation(asNumber(selected?.rotation_deg, 0))),
  }
}

function readPlacementPrefill(room: RoomPayload | null, placementId: string) {
  const roomPlacements = Array.isArray(room?.placements) ? room.placements : []
  const selectedPlacement = roomPlacements
    .map((entry) => asRecord(entry))
    .find((entry) => entry?.id === placementId)

  const assignment = asRecord(selectedPlacement?.material_assignment)
  const uvScale = asRecord(assignment?.uv_scale)

  return {
    materialItemId: typeof assignment?.material_item_id === 'string' ? assignment.material_item_id : '',
    uvX: String(asPositive(uvScale?.x, 1)),
    uvY: String(asPositive(uvScale?.y, 1)),
    rotationDeg: String(normalizeRotation(asNumber(assignment?.rotation_deg, 0))),
  }
}

function parsePlacementOptions(room: RoomPayload | null): PlacementOption[] {
  const roomPlacements = Array.isArray(room?.placements) ? room.placements : []

  return roomPlacements
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry.id === 'string')
    .map((entry) => {
      const description = typeof entry.description === 'string' && entry.description.trim()
        ? entry.description.trim()
        : null
      const catalogId = typeof entry.catalog_item_id === 'string' ? entry.catalog_item_id : null
      const id = entry.id as string
      const label = description ?? catalogId ?? id

      return {
        id,
        label,
      }
    })
}

export function MaterialPanel({ projectId, room, onApplied }: MaterialPanelProps) {
  const [targetType, setTargetType] = useState<TargetType>('surface')
  const [surfaceKey, setSurfaceKey] = useState<MaterialSurfaceTarget>('floor')
  const [placementId, setPlacementId] = useState('')

  const [materialId, setMaterialId] = useState('')
  const [uvScaleX, setUvScaleX] = useState('1')
  const [uvScaleY, setUvScaleY] = useState('1')
  const [rotationDeg, setRotationDeg] = useState('0')

  const [materials, setMaterials] = useState<MaterialLibraryItem[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialsError, setMaterialsError] = useState<string | null>(null)

  const [status, setStatus] = useState<StatusState>({ kind: 'idle', message: 'Materialzuweisung auswählen und anwenden.' })

  const placementOptions = useMemo(() => parsePlacementOptions(room), [room])

  useEffect(() => {
    let active = true

    setMaterialsLoading(true)
    setMaterialsError(null)

    void materialLibraryApi
      .list()
      .then((result) => {
        if (!active) return
        setMaterials(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setMaterials([])
        setMaterialsError(requestError instanceof Error ? requestError.message : 'Materialliste konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!active) return
        setMaterialsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (targetType !== 'placement') return
    if (placementOptions.length === 0) {
      setPlacementId('')
      return
    }

    if (!placementOptions.some((option) => option.id === placementId)) {
      setPlacementId(placementOptions[0].id)
    }
  }, [targetType, placementOptions, placementId])

  useEffect(() => {
    if (!room) return

    if (targetType === 'surface') {
      const prefill = readSurfacePrefill(room, surfaceKey)
      setMaterialId(prefill.materialItemId)
      setUvScaleX(prefill.uvX)
      setUvScaleY(prefill.uvY)
      setRotationDeg(prefill.rotationDeg)
      return
    }

    if (!placementId) return

    const prefill = readPlacementPrefill(room, placementId)
    setMaterialId(prefill.materialItemId)
    setUvScaleX(prefill.uvX)
    setUvScaleY(prefill.uvY)
    setRotationDeg(prefill.rotationDeg)
  }, [room, targetType, surfaceKey, placementId])

  async function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!room) {
      setStatus({ kind: 'error', message: 'Bitte zuerst einen Raum auswählen.' })
      return
    }

    const parsedUvX = Number(uvScaleX)
    const parsedUvY = Number(uvScaleY)
    const parsedRotation = Number(rotationDeg)

    if (!Number.isFinite(parsedUvX) || parsedUvX <= 0 || !Number.isFinite(parsedUvY) || parsedUvY <= 0) {
      setStatus({ kind: 'error', message: 'UV-Skalierung muss größer als 0 sein.' })
      return
    }

    if (!Number.isFinite(parsedRotation)) {
      setStatus({ kind: 'error', message: 'Rotation muss eine gültige Zahl sein.' })
      return
    }

    const payload: MaterialAssignmentPayload = {
      room_id: room.id,
    }

    if (targetType === 'surface') {
      payload.surface_assignments = [
        {
          surface: surfaceKey,
          material_item_id: materialId || null,
          uv_scale: { x: parsedUvX, y: parsedUvY },
          rotation_deg: normalizeRotation(parsedRotation),
        },
      ]
    } else {
      if (!placementId) {
        setStatus({ kind: 'error', message: 'Bitte eine Platzierung auswählen.' })
        return
      }

      payload.placement_assignments = [
        {
          placement_id: placementId,
          target_kind: 'placement',
          material_item_id: materialId || null,
          uv_scale: { x: parsedUvX, y: parsedUvY },
          rotation_deg: normalizeRotation(parsedRotation),
        },
      ]
    }

    setStatus({ kind: 'loading', message: 'Materialzuweisung wird gespeichert…' })

    try {
      const result = await materialLibraryApi.assign(projectId, payload)
      const nextPlacements = Array.isArray(result.placements) ? (result.placements as Placement[]) : []
      onApplied(result.room_id, { coloring: result.coloring, placements: nextPlacements })
      setStatus({ kind: 'success', message: 'Materialzuweisung gespeichert.' })
    } catch (requestError: unknown) {
      setStatus({
        kind: 'error',
        message: requestError instanceof Error ? requestError.message : 'Materialzuweisung konnte nicht gespeichert werden.',
      })
    }
  }

  const applyDisabled =
    status.kind === 'loading' ||
    !room ||
    (targetType === 'placement' && !placementId)

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>Materialzuweisung</h3>

      <form className={styles.form} onSubmit={(event) => { void handleApply(event) }}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Zieltyp</span>
            <select
              className={styles.select}
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as TargetType)}
            >
              <option value="surface">Fläche</option>
              <option value="placement">Platzierung</option>
            </select>
          </label>

          {targetType === 'surface' ? (
            <label className={styles.field}>
              <span>Fläche</span>
              <select
                className={styles.select}
                value={surfaceKey}
                onChange={(event) => setSurfaceKey(event.target.value as MaterialSurfaceTarget)}
              >
                {SURFACE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={styles.field}>
              <span>Platzierung</span>
              <select
                className={styles.select}
                value={placementId}
                onChange={(event) => setPlacementId(event.target.value)}
                disabled={placementOptions.length === 0}
              >
                {placementOptions.length === 0 ? (
                  <option value="">Keine Platzierung verfügbar</option>
                ) : (
                  placementOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}

          <label className={styles.field}>
            <span>Material</span>
            <select
              className={styles.select}
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
              disabled={materialsLoading}
            >
              <option value="">kein Material</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {MATERIAL_CATEGORY_LABELS[item.category]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>UV Scale X</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={styles.input}
              value={uvScaleX}
              onChange={(event) => setUvScaleX(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>UV Scale Y</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={styles.input}
              value={uvScaleY}
              onChange={(event) => setUvScaleY(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Rotation (°)</span>
            <input
              type="number"
              step="0.1"
              className={styles.input}
              value={rotationDeg}
              onChange={(event) => setRotationDeg(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn} disabled={applyDisabled}>
            {status.kind === 'loading' ? 'Speichere…' : 'Zuweisung anwenden'}
          </button>
        </div>
      </form>

      {materialsLoading && <p className={styles.muted}>Materialliste wird geladen…</p>}
      {materialsError && <p className={styles.error}>{materialsError}</p>}

      {status.kind === 'error' && <p className={styles.error}>{status.message}</p>}
      {status.kind === 'success' && <p className={styles.success}>{status.message}</p>}
      {(status.kind === 'idle' || status.kind === 'loading') && <p className={styles.muted}>{status.message}</p>}
    </section>
  )
}