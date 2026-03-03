import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerPlugin, getPlugins, clearPlugins, type OkpPlugin } from './pluginRegistry.js'

describe('pluginRegistry', () => {
  beforeEach(() => {
    clearPlugins()
  })

  it('starts empty', () => {
    expect(getPlugins()).toHaveLength(0)
  })

  it('registers a plugin and returns it via getPlugins', () => {
    const plugin: OkpPlugin = { id: 'test', name: 'Test', register: vi.fn() }
    registerPlugin(plugin)
    expect(getPlugins()).toHaveLength(1)
    expect(getPlugins()[0]).toBe(plugin)
  })

  it('throws when the same plugin id is registered twice', () => {
    const plugin: OkpPlugin = { id: 'dup', name: 'Dup', register: vi.fn() }
    registerPlugin(plugin)
    expect(() => registerPlugin({ ...plugin })).toThrow("Plugin 'dup' ist bereits registriert.")
  })

  it('registers multiple plugins in order', () => {
    const a: OkpPlugin = { id: 'a', name: 'A', register: vi.fn() }
    const b: OkpPlugin = { id: 'b', name: 'B', register: vi.fn() }
    registerPlugin(a)
    registerPlugin(b)
    const ids = getPlugins().map((p) => p.id)
    expect(ids).toEqual(['a', 'b'])
  })

  it('getPlugins returns a snapshot that does not mutate the registry', () => {
    const plugin: OkpPlugin = { id: 'ro', name: 'RO', register: vi.fn() }
    registerPlugin(plugin)
    const snap = getPlugins() as OkpPlugin[]
    snap.push({ id: 'injected', name: 'X', register: vi.fn() })
    // The registry itself must still have only the original plugin
    expect(getPlugins()).toHaveLength(1)
  })
})
