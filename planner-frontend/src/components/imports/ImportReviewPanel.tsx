import { useEffect, useMemo, useState } from 'react'
import {
  getImportJob,
  type ImportAsset,
  type ImportJob,
  type ImportProtocolEntry,
  type MappingState,
} from '../../api/imports.js'
import styles from './ImportReviewPanel.module.css'

interface Props {
  jobId: string
}

interface ProtocolGroups {
  imported: ImportProtocolEntry[]
  ignored: ImportProtocolEntry[]
  needs_review: ImportProtocolEntry[]
}

function isImportProtocolEntry(value: unknown): value is ImportProtocolEntry {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<ImportProtocolEntry>
  return (
    (candidate.status === 'imported' || candidate.status === 'ignored' || candidate.status === 'needs_review')
    && typeof candidate.reason === 'string'
  )
}

function normalizeProtocol(job: ImportJob | null): ImportProtocolEntry[] {
  const topLevelProtocol = Array.isArray(job?.protocol)
    ? job?.protocol.filter(isImportProtocolEntry)
    : []

  if (topLevelProtocol.length > 0) {
    return topLevelProtocol
  }

  const assetProtocol = Array.isArray(job?.import_asset?.protocol)
    ? job?.import_asset?.protocol.filter(isImportProtocolEntry)
    : []

  return assetProtocol
}

function groupProtocolEntries(entries: ImportProtocolEntry[]): ProtocolGroups {
  return entries.reduce<ProtocolGroups>((acc, entry) => {
    acc[entry.status].push(entry)
    return acc
  }, {
    imported: [],
    ignored: [],
    needs_review: [],
  })
}

function getMappingState(job: ImportJob | null, importAsset: ImportAsset | null): MappingState | null {
  return job?.mapping_state ?? importAsset?.mapping_state ?? null
}

function statusClassName(status: ImportProtocolEntry['status']): string {
  if (status === 'needs_review') {
    return styles.needsReview
  }
  if (status === 'ignored') {
    return styles.ignored
  }
  return styles.imported
}

function renderProtocolGroup(title: string, status: ImportProtocolEntry['status'], entries: ImportProtocolEntry[]) {
  return (
    <section className={styles.group}>
      <h4 className={styles.groupTitle}>
        {title} ({entries.length})
      </h4>
      {entries.length === 0 ? (
        <p className={styles.empty}>Keine Einträge</p>
      ) : (
        <ul className={styles.protocolList}>
          {entries.map((entry, index) => (
            <li key={`${entry.entity_id ?? 'null'}-${index}`} className={`${styles.protocolItem} ${statusClassName(status)}`}>
              <span className={styles.protocolReason}>{entry.reason}</span>
              {entry.entity_id && <span className={styles.protocolMeta}>Entity: {entry.entity_id}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ImportReviewPanel({ jobId }: Props) {
  const [job, setJob] = useState<ImportJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadJob() {
      if (!jobId) {
        setJob(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await getImportJob(jobId)
        if (!cancelled) {
          setJob(response)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Import-Job konnte nicht geladen werden.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadJob()

    return () => {
      cancelled = true
    }
  }, [jobId])

  const importAsset = job?.import_asset ?? null
  const protocol = useMemo(() => normalizeProtocol(job), [job])
  const grouped = useMemo(() => groupProtocolEntries(protocol), [protocol])
  const mappingState = useMemo(() => getMappingState(job, importAsset), [job, importAsset])

  return (
    <section className={styles.panel} aria-live="polite">
      <div className={styles.header}>
        <h3 className={styles.title}>Import Review</h3>
        <span className={styles.jobId}>Job: {jobId}</span>
      </div>

      {loading && <p className={styles.meta}>Lade Import-Job…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {job && (
        <>
          <div className={styles.metaGrid}>
            <p className={styles.metaItem}><strong>Datei:</strong> {job.source_filename}</p>
            <p className={styles.metaItem}><strong>Format:</strong> {job.source_format}</p>
            <p className={styles.metaItem}><strong>Status:</strong> {job.status}</p>
            <p className={styles.metaItem}><strong>Units:</strong> {importAsset?.units ?? '—'}</p>
          </div>

          {job.error_message && <p className={styles.error}>{job.error_message}</p>}

          <div className={styles.groups}>
            {renderProtocolGroup('Imported', 'imported', grouped.imported)}
            {renderProtocolGroup('Ignored', 'ignored', grouped.ignored)}
            {renderProtocolGroup('Needs review', 'needs_review', grouped.needs_review)}
          </div>

          {mappingState?.layers && (
            <section className={styles.mappingSection}>
              <h4 className={styles.groupTitle}>Layer-Mapping</h4>
              <ul className={styles.mappingList}>
                {Object.entries(mappingState.layers).map(([layerName, mapping]) => (
                  <li key={layerName} className={styles.mappingItem}>
                    <span className={styles.mappingKey}>{layerName}</span>
                    <span className={`${styles.mappingValue} ${statusClassName(mapping.action)}`}>{mapping.action}</span>
                    {mapping.reason && <span className={styles.mappingReason}>{mapping.reason}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mappingState?.components && (
            <section className={styles.mappingSection}>
              <h4 className={styles.groupTitle}>Komponenten-Mapping</h4>
              <ul className={styles.mappingList}>
                {Object.entries(mappingState.components).map(([componentId, mapping]) => (
                  <li key={componentId} className={styles.mappingItem}>
                    <span className={styles.mappingKey}>{componentId}</span>
                    <span className={styles.mappingValue}>{mapping.target_type}</span>
                    {mapping.label && <span className={styles.mappingReason}>{mapping.label}</span>}
                    {mapping.catalog_item_id && <span className={styles.mappingReason}>Catalog: {mapping.catalog_item_id}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  )
}
