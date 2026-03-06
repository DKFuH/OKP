import { Button, Tooltip, makeStyles, tokens } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'
import type { RibbonCommand as RibbonCommandType } from './ribbonStateResolver.js'

interface RibbonCommandProps {
  command: RibbonCommandType
  onExecute: (command: RibbonCommandType) => void
  compact?: boolean
}

const useStyles = makeStyles({
  button: {
    minWidth: 'unset',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  compactButton: {
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
  },
})

export function RibbonCommand({ command, onExecute, compact = false }: RibbonCommandProps) {
  const styles = useStyles()
  const { t } = useTranslation()

  if (!command.visible) return null

  const label = t(command.labelKey)
  const disabledReason = !command.enabled && command.reasonKey ? t(command.reasonKey) : undefined

  const button = (
    <Button
      appearance='subtle'
      className={compact ? styles.compactButton : styles.button}
      disabled={!command.enabled}
      data-testid={`ribbon-cmd-${command.id}`}
      onClick={() => {
        if (command.enabled) {
          onExecute(command)
        }
      }}
    >
      {label}
    </Button>
  )

  if (!disabledReason) {
    return button
  }

  return (
    <Tooltip content={disabledReason} relationship='label'>
      <span>{button}</span>
    </Tooltip>
  )
}
