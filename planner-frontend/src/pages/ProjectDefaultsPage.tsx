import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Body1,
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { getProjectDefaults, updateProjectDefaults, type ProjectDefaults } from '../api/tenantSettings.js'

const useStyles = makeStyles({
  page: { display: 'grid', rowGap: tokens.spacingVerticalXL },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
  },
  section: { display: 'grid', rowGap: tokens.spacingVerticalM },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: tokens.spacingVerticalM,
  },
})

export function ProjectDefaultsPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProjectDefaults>({
    default_advisor: null,
    default_processor: null,
    default_area_name: null,
    default_alternative_name: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getProjectDefaults()
      .then((data) => setForm(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function updateField(field: keyof ProjectDefaults, value: string) {
    setForm((prev) => ({ ...prev, [field]: value.trim() ? value : null }))
    setSuccess(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const updated = await updateProjectDefaults(form)
      setForm(updated); setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Defaults konnten nicht gespeichert werden')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spinner label="Lade Projekt-Defaults…" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <Title2>Projekt-Defaults</Title2>
          <Body1 style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
            Standardwerte für neue Projekte: Berater, Bearbeiter, Bereich und Alternative.
          </Body1>
        </div>
        <Button appearance="secondary" onClick={() => navigate('/settings')}>← Zurück</Button>
      </div>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {success && <MessageBar intent="success"><MessageBarBody>Projekt-Defaults gespeichert.</MessageBarBody></MessageBar>}

      <form onSubmit={(event) => void handleSubmit(event)}>
        <section className={styles.section}>
          <Subtitle2>Standardbelegung</Subtitle2>
          <div className={styles.grid}>
            <Field label="Standardberater">
              <Input value={form.default_advisor ?? ''} placeholder="z. B. Anna Berger" onChange={(e) => updateField('default_advisor', e.target.value)} />
            </Field>
            <Field label="Standardbearbeiter">
              <Input value={form.default_processor ?? ''} placeholder="z. B. Planung Team" onChange={(e) => updateField('default_processor', e.target.value)} />
            </Field>
            <Field label="Standardbereich">
              <Input value={form.default_area_name ?? ''} placeholder="z. B. Bereich 1" onChange={(e) => updateField('default_area_name', e.target.value)} />
            </Field>
            <Field label="Standardalternative">
              <Input value={form.default_alternative_name ?? ''} placeholder="z. B. Variante A" onChange={(e) => updateField('default_alternative_name', e.target.value)} />
            </Field>
          </div>
        </section>
        <div style={{ marginTop: tokens.spacingVerticalL }}>
          <Button appearance="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="tiny" /> : 'Speichern'}
          </Button>
        </div>
      </form>
    </div>
  )
}
