import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'
import type { RibbonCommand } from './ribbonStateResolver.js'

interface RibbonOverflowProps {
  commands: RibbonCommand[]
  onExecute: (command: RibbonCommand) => void
}

const useStyles = makeStyles({
  trigger: {
    minWidth: 'unset',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalXS}`,
  },
  itemDisabled: {
    color: tokens.colorNeutralForegroundDisabled,
  },
})

/**
 * RibbonOverflow renders a "More" overflow menu for commands that don't fit
 * into the ribbon content area at smaller viewports.
 */
export function RibbonOverflow({ commands, onExecute }: RibbonOverflowProps) {
  const styles = useStyles()
  const { t } = useTranslation()

  const visibleCommands = commands.filter((cmd) => cmd.visible)

  if (visibleCommands.length === 0) return null

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance='subtle'
          className={styles.trigger}
          data-testid='ribbon-overflow-trigger'
          aria-label={t('ribbon.overflow.more')}
        >
          {t('ribbon.overflow.more')}
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList data-testid='ribbon-overflow-menu'>
          {visibleCommands.map((cmd) => {
            const disabledReason = !cmd.enabled && cmd.reasonKey ? t(cmd.reasonKey) : undefined

            const item = (
              <MenuItem
                key={cmd.id}
                disabled={!cmd.enabled}
                data-testid={`ribbon-overflow-item-${cmd.id}`}
                onClick={() => {
                  if (cmd.enabled) {
                    onExecute(cmd)
                  }
                }}
              >
                {t(cmd.labelKey)}
              </MenuItem>
            )

            if (!disabledReason) return item

            return (
              <Tooltip key={cmd.id} content={disabledReason} relationship='label'>
                <span>{item}</span>
              </Tooltip>
            )
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}
