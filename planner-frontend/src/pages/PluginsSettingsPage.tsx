import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Checkbox,
  MessageBar,
  MessageBarBody,
  Spinner,
  Title2,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { getTenantPlugins, updateTenantPlugins, type TenantPluginInfo } from '../api/tenantSettings.js'

const useStyles = makeStyles({
  page: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'grid',
    rowGap: tokens.spacingVerticalXXL,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  headerText: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
  },
  pluginGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalM,
    padding: `${tokens.spacingVerticalS} 0`,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
})

export function PluginsSettingsPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const [available, setAvailable] = useState<TenantPluginInfo[]>([])
  const [enabled, setEnabled] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getTenantPlugins()
      .then((data) => {
        setAvailable(data.available)
        setEnabled(data.enabled)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const enabledSet = useMemo(() => new Set(enabled), [enabled])

  function togglePlugin(pluginId: string, checked: boolean) {
    setEnabled((prev) => {
      if (checked) {
        if (prev.includes(pluginId)) return prev
        return [...prev, pluginId]
      }
      return prev.filter((id) => id !== pluginId)
    })
    setSuccess(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await updateTenantPlugins(enabled)
      setEnabled(updated.enabled)
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Spinner label='Lade Plugins\u2026' style={{ marginTop: 64 }} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Title2>Plugins</Title2>
          <Subtitle2>Aktiviere optionale Fachmodule pro Tenant.</Subtitle2>
        </div>
        <Button appearance='subtle' onClick={() => navigate('/settings/company')}>
          &larr; Firmenprofil
        </Button>
      </div>

      {error && (
        <MessageBar intent='error'>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {success && (
        <MessageBar intent='success'>
          <MessageBarBody>Plugin-Einstellungen gespeichert.</MessageBarBody>
        </MessageBar>
      )}

      <Card>
        <CardHeader header={<Body1Strong>Verf&uuml;gbare Plugins</Body1Strong>} />
        {available.length === 0 && <Body1>Keine Plugins verf&uuml;gbar.</Body1>}
        <div className={styles.pluginGrid}>
          {available.map((plugin) => (
            <Checkbox
              key={plugin.id}
              checked={enabledSet.has(plugin.id)}
              onChange={(_ev, data) => togglePlugin(plugin.id, Boolean(data.checked))}
              label={plugin.name}
            />
          ))}
        </div>
      </Card>

      <div className={styles.actions}>
        <Button appearance='primary' disabled={saving} onClick={() => void save()}>
          {saving ? 'Speichern\u2026' : 'Plugins speichern'}
        </Button>
      </div>
    </div>
  )
}
