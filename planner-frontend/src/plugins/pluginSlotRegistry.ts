import type { PluginSlotContext, PluginSlotEntry } from './pluginUiContract.js'

const PROJECT_SCOPED_PLUGIN_IDS = new Set([
  'presentation',
  'viewer-export',
  'tischler',
  'daylight',
  'materials',
  'stairs',
  'multilevel-docs',
  'feng-shui',
])

function resolvePluginPath(pluginId: string, projectId: string | null): string | null {
  switch (pluginId) {
    case 'presentation':
      return projectId ? `/projects/${projectId}/presentation` : null
    case 'viewer-export':
      return projectId ? `/projects/${projectId}/exports` : null
    case 'tischler':
      return projectId ? `/projects/${projectId}/cutlist` : null
    case 'daylight':
      return projectId ? `/projects/${projectId}?panel=daylight` : null
    case 'materials':
      return projectId ? `/projects/${projectId}?panel=material` : null
    case 'stairs':
      return projectId ? `/projects/${projectId}` : null
    case 'multilevel-docs':
      return projectId ? `/projects/${projectId}?panel=areas` : null
    case 'feng-shui':
      return projectId ? `/projects/${projectId}/feng-shui` : null
    case 'asset-library':
      return '/catalog'
    default:
      return null
  }
}

function resolveDisabledReason(
  pluginId: string,
  enabled: boolean,
  targetPath: string | null,
): string | undefined {
  if (!enabled) {
    return 'shell.reasons.pluginDisabledForTenant'
  }

  if (!targetPath && PROJECT_SCOPED_PLUGIN_IDS.has(pluginId)) {
    return 'shell.reasons.projectContextMissing'
  }

  if (!targetPath) {
    return 'shell.reasons.noDirectUiEntry'
  }

  return undefined
}

export function resolvePluginSlotEntries(context: PluginSlotContext): PluginSlotEntry[] {
  const enabledSet = new Set(context.enabledPluginIds)
  const entries: PluginSlotEntry[] = []

  if (context.slot === 'header') {
    entries.push({
      id: 'plugin-settings',
      slot: 'header',
      label: 'Plugin-Einstellungen',
      path: '/settings/plugins',
      enabled: true,
    })
  }

  for (const plugin of context.availablePlugins) {
    const targetPath = resolvePluginPath(plugin.id, context.projectId)
    const enabled = enabledSet.has(plugin.id)
    const reasonIfDisabled = resolveDisabledReason(plugin.id, enabled, targetPath)

    const entry: PluginSlotEntry = {
      id: `${context.slot}-${plugin.id}`,
      slot: context.slot,
      label: plugin.name,
      pluginId: plugin.id,
      path: targetPath ?? '/settings/plugins',
      enabled: enabled && Boolean(targetPath),
      reasonIfDisabled,
    }

    entries.push(entry)
  }

  return entries
}
