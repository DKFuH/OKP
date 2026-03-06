import { Button, makeStyles, tokens } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'
import type { RibbonCommand } from './ribbonStateResolver.js'

interface QuickAccessBarProps {
  commands: RibbonCommand[]
  onExecute: (command: RibbonCommand) => void
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalM}`,
  },
  button: {
    minWidth: 'unset',
    height: '24px',
    padding: `0 ${tokens.spacingHorizontalXS}`,
    fontSize: tokens.fontSizeBase200,
    borderRadius: tokens.borderRadiusMedium,
  },
})

export function QuickAccessBar({ commands, onExecute }: QuickAccessBarProps) {
  const styles = useStyles()
  const { t } = useTranslation()

  return (
    <div
      className={styles.root}
      aria-label={t('ribbon.quickAccess.ariaLabel')}
      data-testid='ribbon-quick-access'
    >
      {commands
        .filter((cmd) => cmd.visible)
        .map((cmd) => (
          <Button
            key={cmd.id}
            appearance='subtle'
            className={styles.button}
            disabled={!cmd.enabled}
            title={!cmd.enabled && cmd.reasonKey ? t(cmd.reasonKey) : t(cmd.labelKey)}
            data-testid={`ribbon-qa-${cmd.id}`}
            onClick={() => {
              if (cmd.enabled) {
                onExecute(cmd)
              }
            }}
          >
            {t(cmd.labelKey)}
          </Button>
        ))}
    </div>
  )
}
