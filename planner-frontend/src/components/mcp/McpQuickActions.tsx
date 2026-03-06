import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveMcpQuickActions } from '../../mcp/mcpActionBridge.js'

interface McpQuickActionsProps {
  projectId: string | null
  onNavigate: (path: string) => void
  variant?: 'menu' | 'panel'
  testIdPrefix?: string
}

const useStyles = makeStyles({
  panel: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
  },
})

export function McpQuickActions({
  projectId,
  onNavigate,
  variant = 'menu',
  testIdPrefix = 'mcp',
}: McpQuickActionsProps) {
  const styles = useStyles()
  const { t } = useTranslation()
  const [copiedLabelKey, setCopiedLabelKey] = useState<string | null>(null)

  const actions = resolveMcpQuickActions({ projectId })

  async function runAction(actionId: string) {
    const action = actions.find((entry) => entry.id === actionId)
    if (!action || !action.enabled) {
      return
    }

    if (action.kind === 'navigate' && action.targetPath) {
      onNavigate(action.targetPath)
      return
    }

    if (action.kind === 'copy-prompt' && action.prompt) {
      try {
        await navigator.clipboard.writeText(action.prompt)
        setCopiedLabelKey(action.labelKey)
        window.setTimeout(() => {
          setCopiedLabelKey(null)
        }, 2000)
      } catch {
        setCopiedLabelKey(null)
      }
    }
  }

  if (variant === 'panel') {
    return (
      <div className={styles.panel}>
        {actions.map((action) => {
          const isCopied = copiedLabelKey === action.labelKey

          return (
            <Button
              key={action.id}
              appearance='subtle'
              disabled={!action.enabled}
              title={action.reasonIfDisabled ? t(action.reasonIfDisabled) : undefined}
              data-testid={`${testIdPrefix}-${variant}-action-${action.id}`}
              onClick={() => {
                void runAction(action.id)
              }}
            >
              {isCopied ? t('shell.mcp.copied') : t(action.labelKey)}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button appearance='subtle' data-testid={`${testIdPrefix}-${variant}-trigger`}>{t('shell.mcp.menu')}</Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {actions.map((action) => {
            const isCopied = copiedLabelKey === action.labelKey

            return (
              <MenuItem
                key={action.id}
                disabled={!action.enabled}
                title={action.reasonIfDisabled ? t(action.reasonIfDisabled) : undefined}
                data-testid={`${testIdPrefix}-${variant}-action-${action.id}`}
                onClick={() => {
                  void runAction(action.id)
                }}
              >
                {isCopied ? t('shell.mcp.copied') : t(action.labelKey)}
              </MenuItem>
            )
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}
