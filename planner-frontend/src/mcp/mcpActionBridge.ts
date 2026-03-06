export type McpQuickActionKind = 'navigate' | 'copy-prompt'

export interface McpQuickAction {
  id: string
  labelKey: string
  kind: McpQuickActionKind
  targetPath?: string
  prompt?: string
  enabled: boolean
  reasonIfDisabled?: string
}

interface ResolveMcpQuickActionsInput {
  projectId: string | null
}

export function buildValidationPrompt(projectId: string): string {
  return [
    `Analysiere Projekt ${projectId} und erstelle eine priorisierte Validierungsliste.`,
    'Beachte Geometrie-Konsistenz, Oeffnungen, Placements und dokumentiere konkrete Korrekturvorschlaege.',
  ].join(' ')
}

export function resolveMcpQuickActions({ projectId }: ResolveMcpQuickActionsInput): McpQuickAction[] {
  const hasProject = Boolean(projectId)

  return [
    {
      id: 'mcp-hub',
      labelKey: 'shell.mcp.openHub',
      kind: 'navigate',
      targetPath: '/settings/mcp',
      enabled: true,
    },
    {
      id: 'mcp-hub-project-context',
      labelKey: 'shell.mcp.openProjectContext',
      kind: 'navigate',
      targetPath: projectId ? `/settings/mcp?projectId=${projectId}` : '/settings/mcp',
      enabled: hasProject,
      reasonIfDisabled: hasProject ? undefined : 'shell.reasons.projectContextMissing',
    },
    {
      id: 'mcp-copy-validation-prompt',
      labelKey: 'shell.mcp.copyValidationPrompt',
      kind: 'copy-prompt',
      prompt: projectId ? buildValidationPrompt(projectId) : undefined,
      enabled: hasProject,
      reasonIfDisabled: hasProject ? undefined : 'shell.reasons.projectContextMissing',
    },
  ]
}
