import type { EditorActionStates, ResolvedActionState } from '../editor/actionStateResolver.js'

export interface BackendFeatureEntry {
  id: string
  labelKey: string
  targetPath: string
  enabled: boolean
  visible: boolean
  reasonIfDisabled?: string
}

interface ResolveBackendFeatureCoverageInput {
  projectId: string | null
  actionStates: EditorActionStates
}

function buildProjectPath(projectId: string | null, suffix: string): string {
  if (!projectId) {
    return '/'
  }

  return `/projects/${projectId}${suffix}`
}

function buildEditorPanelPath(projectId: string | null, panel: string): string {
  if (!projectId) {
    return '/'
  }

  return `/projects/${projectId}?panel=${panel}`
}

function fromActionState(
  id: string,
  labelKey: string,
  targetPath: string,
  actionState: ResolvedActionState,
  options?: { requiresProjectContext?: boolean; projectId?: string | null },
): BackendFeatureEntry {
  const requiresProjectContext = options?.requiresProjectContext === true
  const hasProjectContext = Boolean(options?.projectId)

  if (requiresProjectContext && !hasProjectContext) {
    return {
      id,
      labelKey,
      targetPath,
      enabled: false,
      visible: actionState.visible !== false,
      reasonIfDisabled: 'shell.reasons.projectContextMissing',
    }
  }

  return {
    id,
    labelKey,
    targetPath,
    enabled: actionState.enabled,
    visible: actionState.visible !== false,
    reasonIfDisabled: actionState.reasonIfDisabled,
  }
}

export function resolveBackendFeatureCoverage({
  projectId,
  actionStates,
}: ResolveBackendFeatureCoverageInput): BackendFeatureEntry[] {
  const entries: BackendFeatureEntry[] = [
    fromActionState(
      'quote-lines',
      'shell.backend.quoteLines',
      buildProjectPath(projectId, '/quote-lines'),
      actionStates.navQuoteLines,
    ),
    fromActionState(
      'panorama-tours',
      'shell.backend.panoramaTours',
      buildProjectPath(projectId, '/panorama-tours'),
      actionStates.navPanoramaTours,
    ),
    fromActionState(
      'specification-packages',
      'shell.backend.specificationPackages',
      buildProjectPath(projectId, '/specification-packages'),
      actionStates.navSpecificationPackages,
    ),
    fromActionState(
      'viewer-exports',
      'shell.backend.viewerExports',
      buildProjectPath(projectId, '/exports'),
      actionStates.navViewerExports,
    ),
    fromActionState(
      'presentation',
      'shell.backend.presentationMode',
      buildProjectPath(projectId, '/presentation'),
      actionStates.presentationMode,
    ),
    fromActionState(
      'panel-camera',
      'shell.backend.cameraPanel',
      buildEditorPanelPath(projectId, 'camera'),
      actionStates.panelCamera,
      { requiresProjectContext: true, projectId },
    ),
    fromActionState(
      'panel-capture',
      'shell.backend.capturePanel',
      buildEditorPanelPath(projectId, 'capture'),
      actionStates.panelCapture,
      { requiresProjectContext: true, projectId },
    ),
    fromActionState(
      'panel-render-environment',
      'shell.backend.renderEnvironmentPanel',
      buildEditorPanelPath(projectId, 'render'),
      actionStates.panelRenderEnvironment,
      { requiresProjectContext: true, projectId },
    ),
    fromActionState(
      'panel-daylight',
      'shell.backend.daylightPanel',
      buildEditorPanelPath(projectId, 'daylight'),
      actionStates.panelDaylight,
      { requiresProjectContext: true, projectId },
    ),
    fromActionState(
      'panel-materials',
      'shell.backend.materialPanel',
      buildEditorPanelPath(projectId, 'material'),
      actionStates.panelMaterial,
      { requiresProjectContext: true, projectId },
    ),
  ]

  return entries.filter((entry) => entry.visible)
}
