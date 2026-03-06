import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Title2,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { specificationPackagesApi, type SpecificationPackage } from '../api/specificationPackages.js'
import { useLocale } from '../hooks/useLocale.js'

const DEFAULT_SECTIONS = ['quote', 'bom', 'cutlist', 'nesting', 'layout_sheets', 'installation_notes']

const useStyles = makeStyles({
  page: { maxWidth: '800px', margin: '0 auto', display: 'grid', rowGap: tokens.spacingVerticalXXL },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  headerText: { display: 'grid', rowGap: tokens.spacingVerticalXS },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: tokens.spacingVerticalM },
  sectionGrid: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalS },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', marginTop: tokens.spacingVerticalM },
})

export function SpecificationPackagesPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const { locale } = useLocale()

  const [items, setItems] = useState<SpecificationPackage[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [name, setName] = useState('Werkstattpaket Standard')
  const [localeCode, setLocaleCode] = useState<'de' | 'en'>(locale.startsWith('en') ? 'en' : 'de')
  const [selectedSections, setSelectedSections] = useState<string[]>(['quote', 'bom', 'cutlist', 'layout_sheets'])
  const [includeCoverPage, setIncludeCoverPage] = useState(true)
  const [includeCompanyProfile, setIncludeCompanyProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const active = useMemo(() => items.find((e) => e.id === activeId) ?? null, [items, activeId])

  useEffect(() => { if (projectId) void loadPackages() }, [projectId])

  async function loadPackages() {
    if (!projectId) return
    specificationPackagesApi.list(projectId)
      .then((data) => { setItems(data); setActiveId(data[0]?.id ?? null) })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!active) {
      setName('Werkstattpaket Standard'); setLocaleCode(locale.startsWith('en') ? 'en' : 'de')
      setSelectedSections(['quote', 'bom', 'cutlist', 'layout_sheets'])
      setIncludeCoverPage(true); setIncludeCompanyProfile(true); return
    }
    const config = active.config_json ?? {}
    setName(active.name)
    setLocaleCode(active.locale_code?.startsWith('en') ? 'en' : 'de')
    setSelectedSections(Array.isArray(config.sections) ? config.sections : ['quote', 'bom', 'cutlist', 'layout_sheets'])
    setIncludeCoverPage(config.include_cover_page !== false)
    setIncludeCompanyProfile(config.include_company_profile !== false)
  }, [active, locale])

  async function refreshList(selectId?: string | null) {
    if (!projectId) return
    const data = await specificationPackagesApi.list(projectId)
    setItems(data)
    if (selectId) { setActiveId(selectId); return }
    if (!data.some((e) => e.id === activeId)) setActiveId(data[0]?.id ?? null)
  }

  function toggleSection(section: string) {
    setSelectedSections((prev) => prev.includes(section) ? prev.filter((e) => e !== section) : [...prev, section])
  }

  async function createPackage() {
    if (!projectId) return
    setSaving(true); setError(null)
    try {
      const created = await specificationPackagesApi.create(projectId, {
        name, locale_code: localeCode,
        config_json: { sections: selectedSections, include_cover_page: includeCoverPage, include_company_profile: includeCompanyProfile },
      })
      await refreshList(created.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Fehler') } finally { setSaving(false) }
  }

  async function generateActive() {
    if (!active) return
    setSaving(true); setError(null)
    try { await specificationPackagesApi.generate(active.id, localeCode); await refreshList(active.id) }
    catch (err) { setError(err instanceof Error ? err.message : 'Fehler') } finally { setSaving(false) }
  }

  async function downloadActive() {
    if (!active) return
    setSaving(true); setError(null)
    try { await specificationPackagesApi.download(active.id, localeCode) }
    catch (err) { setError(err instanceof Error ? err.message : 'Fehler') } finally { setSaving(false) }
  }

  async function deleteActive() {
    if (!active || !confirm('Werkstattpaket wirklich l\u00f6schen?')) return
    setSaving(true); setError(null)
    try { await specificationPackagesApi.remove(active.id); await refreshList(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Fehler') } finally { setSaving(false) }
  }

  if (loading) return <Spinner label='Lade Werkstattpakete\u2026' style={{ marginTop: 64 }} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Title2>Spezifikationspakete</Title2>
          <Subtitle2>Quote, BOM, Cutlist, Nesting und Layout-Sheets als Werkstattpaket b\u00fcndeln.</Subtitle2>
        </div>
        <Button appearance='subtle' onClick={() => navigate(`/projects/${projectId}`)}>
          \u2190 Zur\u00fcck
        </Button>
      </div>

      {error && <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <Card>
        <CardHeader header={<Body1Strong>Paket konfigurieren</Body1Strong>} />
        <div className={styles.formGrid}>
          <Field label='Paket w\u00e4hlen'>
            <Select value={activeId ?? ''} onChange={(_e, d) => setActiveId(d.value || null)}>
              <Option value=''>Neu erstellen</Option>
              {items.map((e) => <Option key={e.id} value={e.id}>{e.name}</Option>)}
            </Select>
          </Field>
          <Field label='Name'><Input value={name} onChange={(_e, d) => setName(d.value)} /></Field>
          <Field label='Sprache'>
            <Select value={localeCode} onChange={(_e, d) => setLocaleCode(d.value === 'en' ? 'en' : 'de')}>
              <Option value='de'>Deutsch</Option>
              <Option value='en'>English</Option>
            </Select>
          </Field>
        </div>

        <div className={styles.sectionGrid}>
          {DEFAULT_SECTIONS.map((section) => (
            <Checkbox key={section} label={section} checked={selectedSections.includes(section)} onChange={() => toggleSection(section)} />
          ))}
          <Checkbox label='Deckblatt' checked={includeCoverPage} onChange={(_e, d) => setIncludeCoverPage(Boolean(d.checked))} />
          <Checkbox label='Firmenprofil' checked={includeCompanyProfile} onChange={(_e, d) => setIncludeCompanyProfile(Boolean(d.checked))} />
        </div>

        <div className={styles.actions}>
          <Button appearance='primary' disabled={saving} onClick={() => void createPackage()}>
            {saving ? <Spinner size='tiny' /> : 'Paket speichern'}
          </Button>
          {active && (
            <>
              <Button appearance='secondary' disabled={saving} onClick={() => void generateActive()}>Generieren</Button>
              <Button appearance='secondary' disabled={saving} onClick={() => void downloadActive()}>Download</Button>
              <Button appearance='secondary' disabled={saving} onClick={() => void deleteActive()}>L\u00f6schen</Button>
            </>
          )}
        </div>

        {active?.generated_at && (
          <MessageBar intent='success' style={{ marginTop: tokens.spacingVerticalS }}>
            <MessageBarBody>Zuletzt generiert: {new Date(active.generated_at).toLocaleString('de-DE')}</MessageBarBody>
          </MessageBar>
        )}
      </Card>
    </div>
  )
}
