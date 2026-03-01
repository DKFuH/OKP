import { useEffect, useMemo, useState } from 'react'
import {
  downloadBusinessJsonFile,
  exportBusinessCsv,
  exportBusinessJson,
  exportBusinessWebhook,
  getBusinessSummary,
  updateBusinessSummary,
  type BusinessJsonExportResponse,
  type BusinessSummary,
  type LeadStatus,
  type UpdateBusinessSummaryPayload,
} from '../../api/business.js'
import styles from './BusinessPanel.module.css'

interface Props {
  projectId: string
}

const LEAD_STATUS_OPTIONS: LeadStatus[] = ['new', 'qualified', 'quoted', 'won', 'lost']

function leadStatusLabel(value: LeadStatus): string {
  switch (value) {
    case 'new':
      return 'Neu'
    case 'qualified':
      return 'Qualifiziert'
    case 'quoted':
      return 'Angebot abgegeben'
    case 'won':
      return 'Gewonnen'
    case 'lost':
      return 'Verloren'
    default:
      return value
  }
}

function toUpdatePayload(summary: BusinessSummary): UpdateBusinessSummaryPayload {
  return {
    lead_status: summary.project.lead_status,
    quote_value: summary.project.quote_value,
    close_probability: summary.project.close_probability,
    customer_price_lists: summary.customer_price_lists.map((item) => ({
      name: item.name,
      price_adjustment_pct: item.price_adjustment_pct,
      notes: item.notes,
    })),
    customer_discounts: summary.customer_discounts.map((item) => ({
      label: item.label,
      discount_pct: item.discount_pct,
      scope: item.scope,
    })),
    project_line_items: summary.project_line_items.map((item) => ({
      source_type: item.source_type,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      unit_price_net: item.unit_price_net,
      tax_rate: item.tax_rate,
    })),
  }
}

export function BusinessPanel({ projectId }: Props) {
  const [snapshot, setSnapshot] = useState<BusinessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingJson, setExportingJson] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingWebhook, setExportingWebhook] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [jsonExport, setJsonExport] = useState<BusinessJsonExportResponse | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    setLoading(true)
    setError(null)

    void getBusinessSummary(projectId)
      .then((data) => {
        if (disposed) {
          return
        }
        setSnapshot(data)
      })
      .catch((caughtError: unknown) => {
        if (disposed) {
          return
        }
        setError(caughtError instanceof Error ? caughtError.message : 'Business-Snapshot konnte nicht geladen werden.')
      })
      .finally(() => {
        if (disposed) {
          return
        }
        setLoading(false)
      })

    return () => {
      disposed = true
    }
  }, [projectId])

  const totalsText = useMemo(() => {
    if (!snapshot) {
      return 'Keine Daten'
    }
    return `${snapshot.project_line_items.length} Line-Items · ${snapshot.totals.project_line_items_net.toFixed(2)} € netto`
  }, [snapshot])

  function updateLeadStatus(next: LeadStatus) {
    if (!snapshot) {
      return
    }
    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        lead_status: next,
      },
    })
  }

  function updateQuoteValue(raw: string) {
    if (!snapshot) {
      return
    }

    const nextValue = raw.trim() === '' ? null : Number(raw)
    if (nextValue !== null && !Number.isFinite(nextValue)) {
      return
    }

    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        quote_value: nextValue,
      },
    })
  }

  function updateCloseProbability(raw: string) {
    if (!snapshot) {
      return
    }

    const nextValue = raw.trim() === '' ? null : Number(raw)
    if (nextValue !== null && (!Number.isFinite(nextValue) || nextValue < 0 || nextValue > 100)) {
      return
    }

    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        close_probability: nextValue,
      },
    })
  }

  async function handleSave() {
    if (!snapshot) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = await updateBusinessSummary(projectId, toUpdatePayload(snapshot))
      setSnapshot(saved)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Business-Snapshot konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExportJson() {
    setExportingJson(true)
    setError(null)

    try {
      const payload = await exportBusinessJson(projectId)
      setJsonExport(payload)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'JSON-Export fehlgeschlagen.')
    } finally {
      setExportingJson(false)
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true)
    setError(null)

    try {
      await exportBusinessCsv(projectId)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'CSV-Export fehlgeschlagen.')
    } finally {
      setExportingCsv(false)
    }
  }

  async function handleExportWebhook() {
    if (!webhookUrl.trim()) {
      setError('Webhook-URL darf nicht leer sein.')
      return
    }

    setExportingWebhook(true)
    setError(null)
    setWebhookStatus(null)

    try {
      const response = await exportBusinessWebhook(projectId, { target_url: webhookUrl.trim() })
      setWebhookStatus(`Webhook erfolgreich zugestellt (HTTP ${response.status}).`)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Webhook-Export fehlgeschlagen.')
    } finally {
      setExportingWebhook(false)
    }
  }

  if (loading) {
    return <section className={styles.panel}><p className={styles.empty}>Lade Business-Snapshot…</p></section>
  }

  if (!snapshot) {
    return <section className={styles.panel}><p className={styles.empty}>Kein Business-Snapshot verfügbar.</p></section>
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>Business / CRM</h3>
        <span className={styles.meta}>{totalsText}</span>
      </header>

      {error && <p className={styles.error}>{error}</p>}
      {webhookStatus && <p className={styles.success}>{webhookStatus}</p>}

      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Lead-Status</span>
          <select
            value={snapshot.project.lead_status}
            onChange={(event) => updateLeadStatus(event.target.value as LeadStatus)}
          >
            {LEAD_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {leadStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Quote Value (netto)</span>
          <input
            type="number"
            value={snapshot.project.quote_value ?? ''}
            onChange={(event) => updateQuoteValue(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Close Probability (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={snapshot.project.close_probability ?? ''}
            onChange={(event) => updateCloseProbability(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className={styles.saveBtn}
        onClick={() => { void handleSave() }}
        disabled={saving}
      >
        {saving ? 'Speichere…' : 'Snapshot speichern'}
      </button>

      <div className={styles.listBlock}>
        <h4>Customer Price Lists ({snapshot.customer_price_lists.length})</h4>
        {snapshot.customer_price_lists.length === 0 ? (
          <p className={styles.empty}>Keine Preislisten vorhanden.</p>
        ) : (
          <ul>
            {snapshot.customer_price_lists.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.name}</strong> · {entry.price_adjustment_pct}%
                {entry.notes ? ` · ${entry.notes}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.listBlock}>
        <h4>Customer Discounts ({snapshot.customer_discounts.length})</h4>
        {snapshot.customer_discounts.length === 0 ? (
          <p className={styles.empty}>Keine Rabatte vorhanden.</p>
        ) : (
          <ul>
            {snapshot.customer_discounts.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.label}</strong> · {entry.discount_pct}% · Scope: {entry.scope}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.listBlock}>
        <h4>Project Line Items ({snapshot.project_line_items.length})</h4>
        {snapshot.project_line_items.length === 0 ? (
          <p className={styles.empty}>Keine Line-Items vorhanden.</p>
        ) : (
          <ul>
            {snapshot.project_line_items.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.description}</strong> · {entry.qty} {entry.unit} · {entry.unit_price_net.toFixed(2)} €
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.exportBlock}>
        <h4>Export</h4>
        <div className={styles.exportActions}>
          <button
            type="button"
            onClick={() => { void handleExportJson() }}
            disabled={exportingJson}
          >
            {exportingJson ? 'JSON lade…' : 'JSON exportieren'}
          </button>
          <button
            type="button"
            onClick={() => { void handleExportCsv() }}
            disabled={exportingCsv}
          >
            {exportingCsv ? 'CSV lade…' : 'CSV exportieren'}
          </button>
        </div>

        {jsonExport && (
          <>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={() => downloadBusinessJsonFile(projectId, jsonExport)}
            >
              JSON herunterladen
            </button>
            <pre className={styles.jsonPreview}>{JSON.stringify(jsonExport, null, 2)}</pre>
          </>
        )}

        <div className={styles.webhookRow}>
          <input
            type="url"
            placeholder="https://example.com/webhook"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
          />
          <button
            type="button"
            onClick={() => { void handleExportWebhook() }}
            disabled={exportingWebhook}
          >
            {exportingWebhook ? 'Webhook sende…' : 'Webhook senden'}
          </button>
        </div>
      </div>
    </section>
  )
}
