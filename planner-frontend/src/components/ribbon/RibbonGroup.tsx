import { Caption1, Divider, makeStyles, tokens } from '@fluentui/react-components'
import { useTranslation } from 'react-i18next'
import { RibbonCommand } from './RibbonCommand.js'
import type { RibbonCommand as RibbonCommandType, RibbonGroup as RibbonGroupType } from './ribbonStateResolver.js'

interface RibbonGroupProps {
  group: RibbonGroupType
  onExecute: (command: RibbonCommandType) => void
  compact?: boolean
  showDivider?: boolean
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalXXS,
  },
  commands: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    flexWrap: 'wrap',
  },
  label: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    paddingTop: tokens.spacingVerticalXXS,
    userSelect: 'none',
  },
  divider: {
    alignSelf: 'stretch',
    marginLeft: tokens.spacingHorizontalXS,
    marginRight: tokens.spacingHorizontalXS,
  },
})

export function RibbonGroup({ group, onExecute, compact = false, showDivider = false }: RibbonGroupProps) {
  const styles = useStyles()
  const { t } = useTranslation()

  if (group.commands.length === 0) return null

  return (
    <div
      className={styles.root}
      role='group'
      aria-label={t(group.labelKey)}
      data-testid={`ribbon-group-${group.id}`}
    >
      <div className={styles.commands}>
        {group.commands.map((command) => (
          <RibbonCommand
            key={command.id}
            command={command}
            onExecute={onExecute}
            compact={compact}
          />
        ))}
        {showDivider && <Divider vertical className={styles.divider} />}
      </div>
      {!compact && (
        <Caption1 className={styles.label}>{t(group.labelKey)}</Caption1>
      )}
    </div>
  )
}
