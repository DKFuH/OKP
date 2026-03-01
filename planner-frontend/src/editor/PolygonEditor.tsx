import { useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Line, Circle, Group } from 'react-konva'
import type Konva from 'konva'
import type { Vertex } from '@shared/types'
import { usePolygonEditor, type EditorTool } from './usePolygonEditor.js'
import styles from './PolygonEditor.module.css'

// ─── Koordinaten-Umrechnung ───────────────────────────────────────────────────
// Welt (mm) ↔ Canvas (px): 1px = SCALE mm

const SCALE = 0.15 // 1px = ~6,67mm → 5m Raum = 750px

function worldToCanvas(mm: number): number { return mm * SCALE }
function canvasToWorld(px: number): number { return px / SCALE }

// ─── Farben ───────────────────────────────────────────────────────────────────

const COLOR = {
  polygon: '#6366f1',
  polygonFill: '#6366f120',
  preview: '#94a3b8',
  vertex: '#6366f1',
  vertexHover: '#ef4444',
  vertexSelected: '#f59e0b',
  error: '#ef4444',
  grid: '#e5e7eb',
} as const

// ─── Komponente ───────────────────────────────────────────────────────────────

interface Props {
  width: number
  height: number
  initialVertices?: Vertex[]
  onSave: (vertices: Vertex[]) => void
}

export function PolygonEditor({ width, height, initialVertices, onSave }: Props) {
  const stageRef = useRef<Konva.Stage>(null)
  const {
    state, isValid,
    addVertex, closePolygon, moveVertex,
    selectVertex, hoverVertex, deleteVertex,
    setTool, loadVertices, reset,
  } = usePolygonEditor(initialVertices)

  // initialVertices nachladen wenn Raum wechselt
  useEffect(() => {
    if (initialVertices && initialVertices.length >= 3) {
      loadVertices(initialVertices)
    } else {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVertices?.map(v => v.id).join(',')])

  // Mausklick auf Stage → Punkt setzen
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.tool !== 'draw') return
    if (e.target !== stageRef.current) return // Klick auf Vertex ignorieren

    const pos = stageRef.current!.getPointerPosition()!
    addVertex({ x_mm: canvasToWorld(pos.x), y_mm: canvasToWorld(pos.y) })
  }, [state.tool, addVertex])

  // Doppelklick → Polygon schließen
  const handleStageDblClick = useCallback(() => {
    if (state.tool === 'draw' && state.vertices.length >= 3) closePolygon()
  }, [state.tool, state.vertices.length, closePolygon])

  // Vertices als Konva-Koordinaten
  const pts = state.vertices.map(v => ({
    x: worldToCanvas(v.x_mm),
    y: worldToCanvas(v.y_mm),
  }))

  // Polygon-Punkte als flaches Array für <Line>
  const linePoints = pts.flatMap(p => [p.x, p.y])
  const closedLinePoints = state.closed
    ? [...linePoints, pts[0]?.x, pts[0]?.y].filter(Boolean) as number[]
    : linePoints

  const hasErrors = state.validationErrors.length > 0

  return (
    <div className={styles.container}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <ToolBtn active={state.tool === 'draw'} onClick={() => setTool('draw')}>Zeichnen</ToolBtn>
        <ToolBtn active={state.tool === 'select'} onClick={() => setTool('select')}>Auswählen</ToolBtn>
        {!state.closed && state.vertices.length >= 3 && (
          <button className={styles.closeBtn} onClick={closePolygon}>Polygon schließen</button>
        )}
        <button className={styles.resetBtn} onClick={reset}>Zurücksetzen</button>
        <div className={styles.spacer} />
        {state.validationErrors.length > 0 && (
          <span className={styles.errorBadge}>{state.validationErrors[0]}</span>
        )}
        {isValid && (
          <button className={styles.saveBtn} onClick={() => onSave(state.vertices)}>
            Speichern
          </button>
        )}
      </div>

      {/* ── Canvas ── */}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        style={{ cursor: state.tool === 'draw' ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Polygon-Fläche (nur wenn geschlossen) */}
          {state.closed && pts.length >= 3 && (
            <Line
              points={closedLinePoints}
              closed
              fill={hasErrors ? '#ef444415' : COLOR.polygonFill}
              stroke={hasErrors ? COLOR.error : COLOR.polygon}
              strokeWidth={2}
            />
          )}

          {/* Offene Linien */}
          {!state.closed && pts.length >= 2 && (
            <Line
              points={linePoints}
              stroke={COLOR.preview}
              strokeWidth={2}
              dash={[8, 4]}
            />
          )}

          {/* Vertices */}
          <Group>
            {pts.map((p, i) => {
              const isHover = state.hoverIndex === i
              const isSelected = state.selectedIndex === i
              const color = isSelected ? COLOR.vertexSelected
                : isHover ? COLOR.vertexHover
                : COLOR.vertex

              return (
                <Circle
                  key={state.vertices[i].id}
                  x={p.x}
                  y={p.y}
                  radius={isSelected || isHover ? 8 : 6}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                  draggable={state.tool === 'select'}
                  onMouseEnter={() => hoverVertex(i)}
                  onMouseLeave={() => hoverVertex(null)}
                  onClick={(e) => {
                    e.cancelBubble = true
                    if (state.tool === 'draw' && i === 0 && state.vertices.length >= 3) {
                      closePolygon()
                    } else {
                      selectVertex(isSelected ? null : i)
                    }
                  }}
                  onDblClick={(e) => {
                    e.cancelBubble = true
                    if (state.tool === 'select') deleteVertex(i)
                  }}
                  onDragEnd={(e) => {
                    moveVertex(i, {
                      x_mm: canvasToWorld(e.target.x()),
                      y_mm: canvasToWorld(e.target.y()),
                    })
                  }}
                />
              )
            })}
          </Group>
        </Layer>
      </Stage>

      {/* ── Info ── */}
      <div className={styles.info}>
        {state.tool === 'draw' && !state.closed && (
          <span>Klick: Punkt setzen · Doppelklick oder erster Punkt: Polygon schließen</span>
        )}
        {state.tool === 'select' && (
          <span>Ziehen: Punkt verschieben · Doppelklick auf Punkt: löschen</span>
        )}
        <span className={styles.vertexCount}>{state.vertices.length} Punkte</span>
      </div>
    </div>
  )
}

function ToolBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
