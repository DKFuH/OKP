import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Textarea,
  Title2,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import {
  languagePacksApi,
  type LanguagePack,
  type LanguagePackCreateBody,
} from '../api/languagePacks.js'
import { useLocale } from '../hooks/useLocale.js'

const useStyles = makeStyles({
  page: {
    maxWidth: '900px',
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: tokens.spacingVerticalM,
  },
  formGridFull: {
    gridColumn: '1 / -1',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  packMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalS,
  },
  packActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
})

export function LanguagePacksPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { t } = useLocale()

  const [items, setItems] = useState<LanguagePack[]>([])
  const [draftJson, setDraftJson] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [localeCode, setLocaleCode] = useState('de')
  const [name, setName] = useState('')
  const [messagesText, setMessagesText] = useState('{\n  "settings": {\n    "title": "Einstellungen (Custom)"\n  }\n}')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await languagePacksApi.list()
      setItems(result)
      setDraftJson(Object.fromEntries(result.map((pack) => [pack.id, JSON.stringify(pack.messages_json, null, 2)])))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('settings.languagePackLoadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const sortedItems = useMemo(() => (
    [...items].sort((left, right) => `${left.locale_code}:${left.name}`.localeCompare(`${right.locale_code}:${right.name}`))
  ), [items])

  function parseJson(input: string): Record<string, unknown> {
    const parsed = JSON.parse(input) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(t('settings.languagePackInvalidJson'))
    }
    return parsed as Record<string, unknown>
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: LanguagePackCreateBody = {
        locale_code: localeCode.trim().toLowerCase(),
        name: name.trim(),
        scope: 'tenant',
        messages_json: parseJson(messagesText),
        enabled: true,
      }
      if (!payload.name) throw new Error(t('settings.languagePackNameRequired'))
      await languagePacksApi.create(payload)
      setName('')
      setSuccess(t('settings.languagePackCreated'))
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('settings.languagePackSaveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(pack: LanguagePack, enabled: boolean) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const messages_json = parseJson(draftJson[pack.id] ?? '{}')
      await languagePacksApi.patch(pack.id, { enabled, messages_json })
      setSuccess(t('settings.languagePackSaved'))
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('settings.languagePackSaveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await languagePacksApi.remove(id)
      setSuccess(t('settings.languagePackDeleted'))
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('settings.languagePackSaveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Spinner label={t('common.loading')} style={{ marginTop: 64 }} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Title2>{t('settings.languagePacks')}</Title2>
          <Subtitle2>{t('settings.languagePacksSubtitle')}</Subtitle2>
        </div>
        <Button appearance='subtle' onClick={() => navigate('/settings')}>
          {t('common.back')}
        </Button>
      </div>

      {error && (
        <MessageBar intent='error'>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {success && (
        <MessageBar intent='success'>
          <MessageBarBody>{success}</MessageBarBody>
        </MessageBar>
      )}

      <Card>
        <CardHeader header={<Body1Strong>{t('settings.languagePackCreate')}</Body1Strong>} />
        <div className={styles.formGrid}>
          <Field label={t('settings.languagePackLocale')}>
            <Input value={localeCode} onChange={(_e, d) => setLocaleCode(d.value)} placeholder='de / en / fr / nl' />
          </Field>
          <Field label={t('settings.languagePackName')}>
            <Input value={name} onChange={(_e, d) => setName(d.value)} />
          </Field>
          <Field label={t('settings.languagePackJson')} className={styles.formGridFull}>
            <Textarea
              rows={8}
              value={messagesText}
              onChange={(_e, d) => setMessagesText(d.value)}
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
            />
          </Field>
        </div>
        <div className={styles.actions}>
          <Button appearance='primary' disabled={saving} onClick={() => void handleCreate()}>
            {saving ? t('common.saving') : t('settings.languagePackCreate')}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader header={<Body1Strong>{t('settings.languagePackList')}</Body1Strong>} />
        {sortedItems.length === 0 && <Body1>{t('settings.languagePackNoItems')}</Body1>}
        {sortedItems.map((pack) => (
          <div key={pack.id} style={{ borderTop: `1px solid ${tokens.colorNeutralStroke2}`, paddingTop: tokens.spacingVerticalM, marginTop: tokens.spacingVerticalM }}>
            <div className={styles.packMeta}>
              <Body1Strong>{pack.name}</Body1Strong>
              <Body1>{pack.locale_code.toUpperCase()}</Body1>
              <Body1>{pack.scope}</Body1>
              <Checkbox
                checked={pack.enabled}
                label='enabled'
                onChange={(_e, d) => setItems((prev) => prev.map((item) => item.id === pack.id ? { ...item, enabled: Boolean(d.checked) } : item))}
              />
            </div>
            <Field label={t('settings.languagePackJson')}>
              <Textarea
                rows={8}
                value={draftJson[pack.id] ?? '{}'}
                onChange={(_e, d) => setDraftJson((prev) => ({ ...prev, [pack.id]: d.value }))}
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
            </Field>
            <div className={styles.packActions}>
              <Button
                appearance='secondary'
                disabled={saving || pack.scope === 'system'}
                onClick={() => void handleSave(pack, items.find((entry) => entry.id === pack.id)?.enabled ?? pack.enabled)}
              >
                {t('settings.languagePackSave')}
              </Button>
              <Button
                appearance='secondary'
                disabled={saving || pack.scope === 'system'}
                onClick={() => void handleDelete(pack.id)}
              >
                {t('settings.languagePackDelete')}
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
