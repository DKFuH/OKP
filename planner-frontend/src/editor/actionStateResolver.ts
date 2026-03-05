export interface ResolvedActionState {
  enabled: boolean
  reasonIfDisabled?: string
}

export interface EditorActionContext {
  hasProjectId: boolean
  compactLayout: boolean
  hasSelectedRoom: boolean
  hasSelectedSectionLine: boolean
  hasSelectedAlternative: boolean
  presentationEnabled: boolean
  daylightEnabled: boolean
  hasProjectEnvironment: boolean
  materialsEnabled: boolean
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
  panelNavigation: ResolvedActionState
  panelCamera: ResolvedActionState
  panelCapture: ResolvedActionState
  panelRenderEnvironment: ResolvedActionState
  panelDaylight: ResolvedActionState
  panelMaterial: ResolvedActionState
  presentationMode: ResolvedActionState
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

  const panelNavigation = state(true)
  const panelCamera = state(true)
  const panelCapture = state(true)
  const panelRenderEnvironment = state(context.hasProjectId, 'Projekt ist noch nicht geladen')
  const panelDaylight = state(
    context.daylightEnabled && context.hasProjectEnvironment,
    !context.daylightEnabled
      ? 'Tageslicht-Plugin nicht aktiv'
      : 'Tageslichtdaten werden geladen',
  )
  const panelMaterial = state(
    context.materialsEnabled && context.hasSelectedRoom,
    !context.materialsEnabled
      ? 'Material-Plugin nicht aktiv'
      : 'Bitte zuerst einen Raum auswaehlen',
  )
  const presentationMode = state(context.presentationEnabled && context.hasProjectId, !context.presentationEnabled
    ? 'Praesentationsmodus nicht aktiv'
    : 'Projekt ist noch nicht geladen')

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
    panelNavigation,
    panelCamera,
    panelCapture,
    panelRenderEnvironment,
    panelDaylight,
    panelMaterial,
    presentationMode,
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
