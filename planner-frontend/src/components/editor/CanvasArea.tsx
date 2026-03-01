import { useRef, useEffect, useState, useCallback } from 'react'
import type { Vertex } from '@shared/types'
import type { RoomPayload } from '../../api/rooms.js'
import { roomsApi } from '../../api/rooms.js'
import { PolygonEditor } from '../../editor/PolygonEditor.js'
import styles from './CanvasArea.module.css'

interface Props {
  room: RoomPayload | null
  onRoomUpdated: (room: RoomPayload) => void
}

export function CanvasArea({ room, onRoomUpdated }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Canvas-Größe beim Resize anpassen
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleSave = useCallback(async (vertices: Vertex[]) => {
    if (!room) return
    setSaving(true)
    setSaveError(null)
    try {
      // wall_segments aus Vertices ableiten
      const wallSegments = vertices.map((v, i) => ({
        id: crypto.randomUUID(),
        index: i,
        start_vertex_id: v.id,
        end_vertex_id: vertices[(i + 1) % vertices.length].id,
      }))

      const updated = await roomsApi.update(room.id, {
        boundary: { vertices, wall_segments: wallSegments },
      })
      onRoomUpdated(updated)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }, [room, onRoomUpdated])

  const existingVertices = room?.boundary?.vertices as Vertex[] | undefined

  return (
    <main className={styles.canvas} ref={containerRef}>
      {saving && <div className={styles.overlay}>Speichere…</div>}
      {saveError && <div className={styles.errorOverlay}>{saveError}</div>}

      {room ? (
        <PolygonEditor
          width={dimensions.width}
          height={dimensions.height}
          initialVertices={existingVertices}
          onSave={handleSave}
        />
      ) : (
        <div className={styles.placeholder}>
          <p>Kein Raum ausgewählt</p>
          <p className={styles.hint}>Wähle einen Raum links oder lege einen neuen an.</p>
        </div>
      )}
    </main>
  )
}
