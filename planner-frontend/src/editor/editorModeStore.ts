import { useCallback, useMemo, useState } from 'react'
import type { EditorTool } from './usePolygonEditor.js'

export type EditorMode =
  | 'selection'
  | 'pan'
  | 'wallCreate'
  | 'roomCreate'
  | 'polylineCreate'
  | 'dimCreate'
  | 'labelCreate'
  | 'calibrate'

export type DrawCreationMode = Extract<EditorMode, 'wallCreate' | 'roomCreate' | 'polylineCreate' | 'dimCreate' | 'labelCreate'>

const DRAW_CREATION_MODES: DrawCreationMode[] = ['wallCreate', 'roomCreate', 'polylineCreate', 'dimCreate', 'labelCreate']

export function isDrawCreationMode(mode: EditorMode): mode is DrawCreationMode {
  return DRAW_CREATION_MODES.includes(mode as DrawCreationMode)
}

export function mapModeToTool(mode: EditorMode): EditorTool {
  if (isDrawCreationMode(mode)) return 'draw'
  if (mode === 'calibrate') return 'calibrate'
  if (mode === 'pan') return 'move'
  return 'select'
}

export function deriveModeFromTool(tool: EditorTool, activeDrawMode: DrawCreationMode = 'wallCreate'): EditorMode {
  if (tool === 'draw') return activeDrawMode
  if (tool === 'calibrate') return 'calibrate'
  if (tool === 'move') return 'pan'
  return 'selection'
}

export function formatEditorModeLabel(mode: EditorMode): string {
  switch (mode) {
    case 'selection':
      return 'Auswahl'
    case 'pan':
      return 'Pan'
    case 'wallCreate':
      return 'Waende zeichnen'
    case 'roomCreate':
      return 'Raum zeichnen'
    case 'polylineCreate':
      return 'Polyline zeichnen'
    case 'dimCreate':
      return 'Bemaessung'
    case 'labelCreate':
      return 'Label setzen'
    case 'calibrate':
      return 'Kalibrieren'
    default:
      return 'Auswahl'
  }
}

interface UseEditorModeStoreOptions {
  currentTool: EditorTool
  setEditorTool: (tool: EditorTool) => void
  initialDrawMode?: DrawCreationMode
}

export function useEditorModeStore({
  currentTool,
  setEditorTool,
  initialDrawMode = 'wallCreate',
}: UseEditorModeStoreOptions) {
  const [activeDrawMode, setActiveDrawMode] = useState<DrawCreationMode>(initialDrawMode)

  const mode = useMemo(() => deriveModeFromTool(currentTool, activeDrawMode), [activeDrawMode, currentTool])

  const setMode = useCallback((nextMode: EditorMode) => {
    if (isDrawCreationMode(nextMode)) {
      setActiveDrawMode(nextMode)
      setEditorTool('draw')
      return
    }

    setEditorTool(mapModeToTool(nextMode))
  }, [setEditorTool])

  const setTool = useCallback((tool: EditorTool) => {
    if (tool === 'draw' && !isDrawCreationMode(mode)) {
      setActiveDrawMode(initialDrawMode)
    }
    setEditorTool(tool)
  }, [initialDrawMode, mode, setEditorTool])

  const resetToSelection = useCallback(() => {
    setMode('selection')
  }, [setMode])

  return {
    mode,
    modeLabel: formatEditorModeLabel(mode),
    activeDrawMode,
    setMode,
    setTool,
    resetToSelection,
  }
}

