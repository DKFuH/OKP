import { describe, expect, it } from 'vitest'
import { resolveEditorActionStates, resolvePolygonShortcutStates } from './actionStateResolver.js'

describe('actionStateResolver', () => {
  it('disables room-bound actions when no room is selected', () => {
    const states = resolveEditorActionStates({
      compactLayout: false,
      hasSelectedRoom: false,
      hasSelectedSectionLine: false,
      hasSelectedAlternative: false,
      autoCompleteLoading: false,
      previewPopoutOpen: false,
      gltfExportLoading: false,
      bulkDeliveredLoading: false,
      screenshotBusy: false,
      export360Busy: false,
    })

    expect(states.viewElevation.enabled).toBe(false)
    expect(states.viewSection.enabled).toBe(false)
    expect(states.autoComplete.enabled).toBe(false)
    expect(states.previewPopout.enabled).toBe(false)
  })

  it('disables split view on compact layouts', () => {
    const states = resolveEditorActionStates({
      compactLayout: true,
      hasSelectedRoom: true,
      hasSelectedSectionLine: true,
      hasSelectedAlternative: true,
      autoCompleteLoading: false,
      previewPopoutOpen: false,
      gltfExportLoading: false,
      bulkDeliveredLoading: false,
      screenshotBusy: false,
      export360Busy: false,
    })

    expect(states.viewSplit.enabled).toBe(false)
    expect(states.viewSplit.reasonIfDisabled).toContain('Split')
  })

  it('disables export actions without selected alternative', () => {
    const states = resolveEditorActionStates({
      compactLayout: false,
      hasSelectedRoom: true,
      hasSelectedSectionLine: true,
      hasSelectedAlternative: false,
      autoCompleteLoading: false,
      previewPopoutOpen: false,
      gltfExportLoading: false,
      bulkDeliveredLoading: false,
      screenshotBusy: false,
      export360Busy: false,
    })

    expect(states.gltfExport.enabled).toBe(false)
    expect(states.markAllDelivered.enabled).toBe(false)
  })

  it('returns all actions enabled in happy path', () => {
    const states = resolveEditorActionStates({
      compactLayout: false,
      hasSelectedRoom: true,
      hasSelectedSectionLine: true,
      hasSelectedAlternative: true,
      autoCompleteLoading: false,
      previewPopoutOpen: false,
      gltfExportLoading: false,
      bulkDeliveredLoading: false,
      screenshotBusy: false,
      export360Busy: false,
    })

    expect(states.viewSplit.enabled).toBe(true)
    expect(states.viewElevation.enabled).toBe(true)
    expect(states.viewSection.enabled).toBe(true)
    expect(states.autoComplete.enabled).toBe(true)
    expect(states.previewPopout.enabled).toBe(true)
    expect(states.gltfExport.enabled).toBe(true)
    expect(states.markAllDelivered.enabled).toBe(true)
    expect(states.captureScreenshot.enabled).toBe(true)
    expect(states.capture360.enabled).toBe(true)
  })

  it('disables delete shortcut in safe-edit mode', () => {
    const states = resolvePolygonShortcutStates({
      safeEditMode: true,
      selectedVertexIndex: 2,
      selectedEdgeIndex: null,
      selectedVertexLocked: false,
    })

    expect(states.deleteVertex.enabled).toBe(false)
    expect(states.deleteVertex.reasonIfDisabled).toContain('Safe-Edit')
  })

  it('enables delete shortcut only when unlocked vertex is selected', () => {
    const enabledStates = resolvePolygonShortcutStates({
      safeEditMode: false,
      selectedVertexIndex: 1,
      selectedEdgeIndex: null,
      selectedVertexLocked: false,
    })
    const lockedStates = resolvePolygonShortcutStates({
      safeEditMode: false,
      selectedVertexIndex: 1,
      selectedEdgeIndex: null,
      selectedVertexLocked: true,
    })

    expect(enabledStates.deleteVertex.enabled).toBe(true)
    expect(lockedStates.deleteVertex.enabled).toBe(false)
    expect(lockedStates.deleteVertex.reasonIfDisabled).toContain('gesperrt')
  })

  it('enables clear-selection only with an active selection', () => {
    const noSelection = resolvePolygonShortcutStates({
      safeEditMode: false,
      selectedVertexIndex: null,
      selectedEdgeIndex: null,
      selectedVertexLocked: false,
    })
    const withEdgeSelection = resolvePolygonShortcutStates({
      safeEditMode: false,
      selectedVertexIndex: null,
      selectedEdgeIndex: 0,
      selectedVertexLocked: false,
    })

    expect(noSelection.clearSelection.enabled).toBe(false)
    expect(withEdgeSelection.clearSelection.enabled).toBe(true)
  })
})
