import { describe, expect, it } from 'vitest'
import { resolveEditorActionStates } from '../editor/actionStateResolver.js'
import { resolveBackendFeatureCoverage } from './backendCapabilityMap.js'

function buildActionStates(hasProjectId: boolean) {
  return resolveEditorActionStates({
    hasProjectId,
    compactLayout: false,
    hasSelectedRoom: true,
    hasSelectedSectionLine: true,
    hasSelectedAlternative: hasProjectId,
    presentationEnabled: true,
    daylightEnabled: true,
    hasProjectEnvironment: true,
    materialsEnabled: true,
    autoCompleteLoading: false,
    previewPopoutOpen: false,
    gltfExportLoading: false,
    bulkDeliveredLoading: false,
    screenshotBusy: false,
    export360Busy: false,
  })
}

describe('backendCapabilityMap', () => {
  it('resolves backend entries with project routes', () => {
    const actionStates = buildActionStates(true)

    const entries = resolveBackendFeatureCoverage({
      projectId: 'project-123',
      actionStates,
    })

    expect(entries.some((entry) => entry.id === 'quote-lines' && entry.targetPath === '/projects/project-123/quote-lines')).toBe(true)
    expect(entries.some((entry) => entry.id === 'panel-camera' && entry.targetPath === '/projects/project-123?panel=camera')).toBe(true)
  })

  it('disables project-scoped panel entries without project context', () => {
    const actionStates = buildActionStates(false)

    const entries = resolveBackendFeatureCoverage({
      projectId: null,
      actionStates,
    })

    const cameraEntry = entries.find((entry) => entry.id === 'panel-camera')
    expect(cameraEntry).toBeDefined()
    expect(cameraEntry?.enabled).toBe(false)
    expect(cameraEntry?.reasonIfDisabled).toBe('shell.reasons.projectContextMissing')
  })
})
