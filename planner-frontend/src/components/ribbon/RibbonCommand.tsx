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
import type { RibbonCommand as RibbonCommandType } from './ribbonStateResolver.js'
import { RIBBON_ICONS } from './ribbonIcons.js'

interface RibbonCommandProps {
  command: RibbonCommandType
  onExecute: (command: RibbonCommandType) => void
  compact?: boolean
}

const useStyles = makeStyles({
  // Large button: icon (24px) stacked above label — Office ribbon style
  button: {
    minWidth: '48px',
    height: '52px',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
  },
  // Compact/small button: icon inline with label
  compactButton: {
    minWidth: 'unset',
    height: '24px',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `0 ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
  },
  // Icon sizing
  icon: {
    fontSize: '20px',
    width: '20px',
    height: '20px',
    flexShrink: 0,
  },
  compactIcon: {
    fontSize: '16px',
    width: '16px',
    height: '16px',
    flexShrink: 0,
  },
  label: {
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '72px',
  },
  compactLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
})

export function RibbonCommand({ command, onExecute, compact = false }: RibbonCommandProps) {
  const styles = useStyles()
  const { t } = useTranslation()

  if (!command.visible) return null

  const label = t(command.labelKey)
  const disabledReason = !command.enabled && command.reasonKey ? t(command.reasonKey) : undefined
  const Icon = RIBBON_ICONS[command.id]
  const btnClass = compact ? styles.compactButton : styles.button
  const iconClass = compact ? styles.compactIcon : styles.icon
  const labelClass = compact ? styles.compactLabel : styles.label

  // Dropdown menu button (e.g. MCP actions)
  if (command.subCommands && command.subCommands.length > 0) {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            appearance='subtle'
            className={btnClass}
            data-testid={`ribbon-cmd-${command.id}`}
          >
            {Icon && <Icon className={iconClass} />}
            <span className={labelClass}>{label}</span>
          </Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {command.subCommands.map((sub) => {
              const SubIcon = RIBBON_ICONS[sub.id]
              return (
                <MenuItem
                  key={sub.id}
                  disabled={!sub.enabled}
                  icon={SubIcon ? <SubIcon /> : undefined}
                  onClick={() => { if (sub.enabled) onExecute(sub) }}
                >
                  {t(sub.labelKey)}
                </MenuItem>
              )
            })}
          </MenuList>
        </MenuPopover>
      </Menu>
    )
  }

  const button = (
    <Button
      appearance='subtle'
      className={btnClass}
      disabled={!command.enabled}
      data-testid={`ribbon-cmd-${command.id}`}
      onClick={() => {
        if (command.enabled) onExecute(command)
      }}
    >
      {Icon && <Icon className={iconClass} />}
      <span className={labelClass}>{label}</span>
    </Button>
  )

  if (!disabledReason) return button

  return (
    <Tooltip content={disabledReason} relationship='label'>
      <span>{button}</span>
    </Tooltip>
  )
}
