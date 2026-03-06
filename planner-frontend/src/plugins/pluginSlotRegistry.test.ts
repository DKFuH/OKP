import { describe, expect, it } from 'vitest'
import { resolvePluginSlotEntries } from './pluginSlotRegistry.js'

describe('pluginSlotRegistry', () => {
  it('adds plugin settings shortcut for header slot', () => {
    const entries = resolvePluginSlotEntries({
      slot: 'header',
      projectId: 'project-1',
      availablePlugins: [],
      enabledPluginIds: [],
    })

    expect(entries[0]?.id).toBe('plugin-settings')
    expect(entries[0]?.path).toBe('/settings/plugins')
    expect(entries[0]?.enabled).toBe(true)
  })

  it('marks project-scoped plugins disabled when project context is missing', () => {
    const entries = resolvePluginSlotEntries({
      slot: 'sidebar',
      projectId: null,
      availablePlugins: [
        { id: 'presentation', name: 'Praesentation' },
        { id: 'asset-library', name: 'Asset Library' },
      ],
      enabledPluginIds: ['presentation', 'asset-library'],
    })

    const presentation = entries.find((entry) => entry.pluginId === 'presentation')
    const assets = entries.find((entry) => entry.pluginId === 'asset-library')

    expect(presentation?.enabled).toBe(false)
    expect(presentation?.reasonIfDisabled).toBe('shell.reasons.projectContextMissing')

    expect(assets?.enabled).toBe(true)
    expect(assets?.path).toBe('/catalog')
  })
})
