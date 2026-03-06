import { describe, expect, it } from 'vitest'
import { resolveMcpQuickActions } from './mcpActionBridge.js'

describe('mcpActionBridge', () => {
  it('returns project-aware actions when project id is available', () => {
    const actions = resolveMcpQuickActions({ projectId: 'abc-123' })

    const projectContext = actions.find((action) => action.id === 'mcp-hub-project-context')
    const promptAction = actions.find((action) => action.id === 'mcp-copy-validation-prompt')

    expect(projectContext?.enabled).toBe(true)
    expect(projectContext?.targetPath).toBe('/settings/mcp?projectId=abc-123')

    expect(promptAction?.enabled).toBe(true)
    expect(promptAction?.prompt).toContain('abc-123')
  })

  it('disables project-dependent actions when project id is missing', () => {
    const actions = resolveMcpQuickActions({ projectId: null })

    const projectContext = actions.find((action) => action.id === 'mcp-hub-project-context')
    const promptAction = actions.find((action) => action.id === 'mcp-copy-validation-prompt')

    expect(projectContext?.enabled).toBe(false)
    expect(projectContext?.reasonIfDisabled).toBe('shell.reasons.projectContextMissing')

    expect(promptAction?.enabled).toBe(false)
    expect(promptAction?.reasonIfDisabled).toBe('shell.reasons.projectContextMissing')
  })
})
