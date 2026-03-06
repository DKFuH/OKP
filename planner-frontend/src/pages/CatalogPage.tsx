import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
  Caption1,
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
import { catalogApi } from '../api/catalog.js'
import { catalogIndicesApi, type CatalogIndexRecord } from '../api/catalogIndices.js'
import { projectsApi, type Project } from '../api/projects.js'
import { getTenantPlugins } from '../api/tenantSettings.js'
import { CatalogBrowser } from '../components/catalog/CatalogBrowser.js'
import { MaterialBrowser } from '../components/catalog/MaterialBrowser.js'

const TENANT_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000001'

interface BatchRow {
  id: string
  catalog_id: string
  purchase_index: string
  sales_index: string
}

interface CatalogOption {
  id: string
  sku: string
  label: string
  type: string
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function createBatchRow(overrides?: Partial<BatchRow>): BatchRow {
  return { id: uid(), catalog_id: '', purchase_index: '1.00', sales_index: '1.00', ...overrides }
}

function createSuggestedRows(options: CatalogOption[]): BatchRow[] {
  const baseCabinet = options.find((o) => o.type === 'base_cabinet')
  const worktop = options.find((o) => o.type === 'worktop')
  return [
    createBatchRow({ catalog_id: baseCabinet?.id ?? '' }),
    createBatchRow({ catalog_id: worktop?.id ?? '' }),
  ]
}

const useStyles = makeStyles({
  page: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXXL,
  },
  header: {
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
  },
  toolbar: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  batchRows: {
    display: 'grid',
    rowGap: tokens.spacingVerticalM,
  },
  batchRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-end',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    '@media (max-width: 700px)': {
      gridTemplateColumns: '1fr',
    },
  },
  batchActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalM,
  },
  historyList: {
    display: 'grid',
    rowGap: tokens.spacingVerticalS,
  },
  historyCard: {
    display: 'grid',
    rowGap: '2px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
})

export function CatalogPage() {
  const styles = useStyles()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([])
  const [existingIndices, setExistingIndices] = useState<CatalogIndexRecord[]>([])
  const [batchRows, setBatchRows] = useState<BatchRow[]>([createBatchRow(), createBatchRow()])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materialsEnabled, setMaterialsEnabled] = useState(false)

  const catalogOptionMap = useMemo(
    () => Object.fromEntries(catalogOptions.map((o) => [o.id, o])),
    [catalogOptions],
  )

  async function loadCatalogIndexWorkspace(projectId?: string) {
    setLoading(true)
    setError(null)
    try {
      const [projectList, catalogItems] = await Promise.all([
        projectsApi.list(),
        catalogApi.list({ limit: 200, offset: 0 }),
      ])
      const activeProjects = projectList.filter((p) => p.status === 'active')
      const nextCatalogOptions = catalogItems.map((item) => ({
        id: item.id, sku: item.sku, label: `${item.sku} - ${item.name}`, type: item.type,
      }))
      setProjects(activeProjects)
      setCatalogOptions(nextCatalogOptions)
      setBatchRows((current) => (
        current.every((row) => row.catalog_id === '')
          ? createSuggestedRows(nextCatalogOptions)
          : current
      ))
      const nextProjectId = projectId || selectedProjectId || activeProjects[0]?.id || ''
      setSelectedProjectId(nextProjectId)
      if (nextProjectId) {
        const indices = await catalogIndicesApi.list(nextProjectId, TENANT_ID_PLACEHOLDER)
        setExistingIndices(indices)
      } else {
        setExistingIndices([])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Katalogindex-Daten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadCatalogIndexWorkspace() }, [])

  useEffect(() => {
    let active = true
    getTenantPlugins()
      .then((result) => { if (active) setMaterialsEnabled(result.enabled.includes('materials')) })
      .catch(() => { if (active) setMaterialsEnabled(false) })
    return () => { active = false }
  }, [])

  async function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId)
    if (!projectId) { setExistingIndices([]); return }
    await loadCatalogIndexWorkspace(projectId)
  }

  function updateRow(rowId: string, patch: Partial<BatchRow>) {
    setBatchRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  function addRow() { setBatchRows((current) => [...current, createBatchRow()]) }
  function removeRow(rowId: string) {
    setBatchRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current))
  }

  async function handleApplyBatch(event: FormEvent) {
    event.preventDefault()
    if (!selectedProjectId) { setError('Bitte zuerst ein Projekt ausw\u00e4hlen.'); return }
    const rows = batchRows
      .map((row) => ({
        catalog_id: row.catalog_id.trim(),
        purchase_index: Number(row.purchase_index),
        sales_index: Number(row.sales_index),
      }))
      .filter((row) => row.catalog_id !== '')
    if (rows.length === 0) { setError('Mindestens eine Katalogzeile mit Artikel-ID ist erforderlich.'); return }
    setSubmitting(true)
    setError(null)
    try {
      for (const row of rows) {
        await catalogIndicesApi.create(selectedProjectId, TENANT_ID_PLACEHOLDER, { ...row, applied_by: 'catalog-index-ui' })
      }
      await loadCatalogIndexWorkspace(selectedProjectId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Massen-Indexierung fehlgeschlagen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title2>Katalog &amp; Massen-Indexierung</Title2>
        <Subtitle2>Katalogbrowser plus projektbezogene EK-/VK-Indizes f\u00fcr mehrere Katalogartikel in einem Durchlauf.</Subtitle2>
      </div>

      {error && (
        <MessageBar intent='error'>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <Card>
        <CardHeader
          header={<Body1Strong>Projektbezogene Katalogindexe</Body1Strong>}
          action={<Badge appearance='tint'>{existingIndices.length} Eintr\u00e4ge</Badge>}
        />

        <div className={styles.toolbar}>
          <Field label='Projekt'>
            <Select value={selectedProjectId} onChange={(_e, d) => void handleProjectChange(d.value)}>
              <Option value=''>Projekt ausw\u00e4hlen...</Option>
              {projects.map((project) => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </Field>
          <Caption1>Indizes werden gegen die catalog_item_id der BOM-Linien angewendet.</Caption1>
        </div>

        <form onSubmit={handleApplyBatch}>
          <div className={styles.batchRows}>
            {batchRows.map((row) => (
              <div key={row.id} className={styles.batchRow}>
                <Field label='Katalogartikel'>
                  <Select value={row.catalog_id} onChange={(_e, d) => updateRow(row.id, { catalog_id: d.value })}>
                    <Option value=''>Artikel ausw\u00e4hlen...</Option>
                    {catalogOptions.map((option) => (
                      <Option key={option.id} value={option.id}>{option.label}</Option>
                    ))}
                  </Select>
                </Field>
                <Field label='EK-Index'>
                  <Input
                    type='number'
                    value={row.purchase_index}
                    onChange={(_e, d) => updateRow(row.id, { purchase_index: d.value })}
                    style={{ width: '100px' }}
                  />
                </Field>
                <Field label='VK-Index'>
                  <Input
                    type='number'
                    value={row.sales_index}
                    onChange={(_e, d) => updateRow(row.id, { sales_index: d.value })}
                    style={{ width: '100px' }}
                  />
                </Field>
                <Button appearance='subtle' onClick={() => removeRow(row.id)}>Entfernen</Button>
              </div>
            ))}
          </div>

          <div className={styles.batchActions}>
            <Button type='button' appearance='secondary' onClick={addRow}>Zeile hinzuf\u00fcgen</Button>
            <Button type='submit' appearance='primary' disabled={!selectedProjectId || submitting}>
              {submitting ? <Spinner size='tiny' /> : 'Batch anwenden'}
            </Button>
          </div>
        </form>

        <div>
          <Body1Strong>Verlauf</Body1Strong>
          {loading ? (
            <Spinner size='small' label='Lade Indexhistorie\u2026' style={{ marginTop: 16 }} />
          ) : existingIndices.length === 0 ? (
            <Body1>F\u00fcr dieses Projekt wurden noch keine Katalogindexe angelegt.</Body1>
          ) : (
            <div className={styles.historyList} style={{ marginTop: 12 }}>
              {existingIndices.map((record) => (
                <article key={record.id} className={styles.historyCard}>
                  <Body1Strong>{catalogOptionMap[record.catalog_id]?.label ?? record.catalog_id}</Body1Strong>
                  <Caption1>ID {record.catalog_id}</Caption1>
                  <Caption1>EK {record.purchase_index.toFixed(2)} &middot; VK {record.sales_index.toFixed(2)}</Caption1>
                  <Caption1>{new Date(record.applied_at).toLocaleString()} &middot; {record.applied_by}</Caption1>
                </article>
              ))}
            </div>
          )}
        </div>
      </Card>

      <CatalogBrowser />
      {materialsEnabled && <MaterialBrowser />}
    </div>
  )
}
