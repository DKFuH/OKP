export interface ResolvedActionState {
  enabled: boolean
  reasonIfDisabled?: string
}

export interface EditorActionContext {
  compactLayout: boolean
  hasSelectedRoom: boolean
  hasSelectedSectionLine: boolean
  hasSelectedAlternative: boolean
  autoCompleteLoading: boolean
  previewPopoutOpen: boolean
  gltfExportLoading: boolean
  bulkDeliveredLoading: boolean
  screenshotBusy: boolean
  export360Busy: boolean
}

export interface EditorActionStates {
  viewSplit: ResolvedActionState
  viewElevation: ResolvedActionState
  viewSection: ResolvedActionState
  autoComplete: ResolvedActionState
  previewPopout: ResolvedActionState
  gltfExport: ResolvedActionState
  markAllDelivered: ResolvedActionState
  captureScreenshot: ResolvedActionState
  capture360: ResolvedActionState
}

export interface PolygonShortcutContext {
  safeEditMode: boolean
  selectedVertexIndex: number | null
  selectedEdgeIndex: number | null
  selectedVertexLocked: boolean
}

export interface PolygonShortcutStates {
  toolDraw: ResolvedActionState
  toolSelect: ResolvedActionState
  deleteVertex: ResolvedActionState
  clearSelection: ResolvedActionState
}

function state(enabled: boolean, reasonIfDisabled?: string): ResolvedActionState {
  return enabled ? { enabled: true } : { enabled: false, reasonIfDisabled }
}

export function resolveEditorActionStates(context: EditorActionContext): EditorActionStates {
  const viewSplit = state(!context.compactLayout, 'Split auf kleinen Displays nicht verfuegbar')
  const viewElevation = state(context.hasSelectedRoom, 'Raum fuer Elevation auswaehlen')

  const viewSection = state(
    context.hasSelectedRoom && context.hasSelectedSectionLine,
    !context.hasSelectedRoom
      ? 'Raum fuer Section auswaehlen'
      : 'Sektion auswaehlen',
  )

  const autoComplete = state(
    context.hasSelectedRoom && !context.autoCompleteLoading,
    !context.hasSelectedRoom
      ? 'Bitte zuerst einen Raum auswaehlen'
      : 'Auto-Vervollstaendigung laeuft bereits',
  )

  const previewPopout = state(context.hasSelectedRoom, '3D-Ansicht erfordert einen ausgewaehlten Raum')

  const gltfExport = state(
    context.hasSelectedAlternative && !context.gltfExportLoading,
    !context.hasSelectedAlternative
      ? 'Keine Alternative ausgewaehlt'
      : 'GLB-Export laeuft bereits',
  )

  const markAllDelivered = state(
    context.hasSelectedAlternative && !context.bulkDeliveredLoading,
    !context.hasSelectedAlternative
      ? 'Keine Alternative ausgewaehlt'
      : 'Lieferstatus wird bereits aktualisiert',
  )

  const captureScreenshot = state(!context.screenshotBusy, 'Screenshot-Erstellung laeuft bereits')
  const capture360 = state(!context.export360Busy, '360-Export laeuft bereits')

  return {
    viewSplit,
    viewElevation,
    viewSection,
    autoComplete,
    previewPopout,
    gltfExport,
    markAllDelivered,
    captureScreenshot,
    capture360,
  }
}

export function resolvePolygonShortcutStates(context: PolygonShortcutContext): PolygonShortcutStates {
  const hasSelection = context.selectedVertexIndex !== null || context.selectedEdgeIndex !== null

  const deleteVertex = state(
    context.selectedVertexIndex !== null && !context.safeEditMode && !context.selectedVertexLocked,
    context.selectedVertexIndex === null
      ? 'Kein Punkt ausgewaehlt'
      : context.safeEditMode
        ? 'Safe-Edit aktiv'
        : 'Punkt ist gesperrt',
  )

  const clearSelection = state(hasSelection, 'Keine Auswahl aktiv')

  return {
    toolDraw: state(true),
    toolSelect: state(true),
    deleteVertex,
    clearSelection,
  }
}
