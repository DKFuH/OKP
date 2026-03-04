import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { layoutStylesApi, type LayoutStylePreset } from '../../api/layoutStyles.js'
import styles from './LayoutSheetTabs.module.css'

export interface LayoutSheet {
  id: string
  name: string
  sheet_type: string
  position: number
  level_id?: string | null
  config?: {
    style_preset_id?: string | null
    sheet_scale?: '1:10' | '1:20' | '1:25' | '1:50'
    annotative_mode?: boolean
    show_north_arrow?: boolean
  }
}

interface Props {
  projectId: string
  activeLevelId?: string | null
  activeSheetId: string | null
  onSheetChange: (sheetId: string) => void
  showDaylightOptions?: boolean
}

const SHEET_LABELS: Record<string, string> = {
  floorplan: 'FP',
  elevations: 'EL',
  installation: 'IN',
  detail: 'DT',
  section: 'SC',
}

export function LayoutSheetTabs({ projectId, activeLevelId = null, activeSheetId, onSheetChange, showDaylightOptions = false }: Props) {
  const [sheets, setSheets] = useState<LayoutSheet[]>([])
  const [presets, setPresets] = useState<LayoutStylePreset[]>([])

  useEffect(() => {
    let cancelled = false
    const scopedQuery = activeLevelId ? `?level_id=${encodeURIComponent(activeLevelId)}` : ''
    api
      .get<LayoutSheet[]>(`/projects/${projectId}/layout-sheets${scopedQuery}`)
      .then((items) => {
        if (cancelled) return
        setSheets(items)
      })
      .catch(() => {
        if (cancelled) return
        setSheets([])
      })

    return () => {
      cancelled = true
    }
  }, [projectId, activeLevelId])

  useEffect(() => {
    let cancelled = false
    layoutStylesApi.list()
      .then((items) => {
        if (cancelled) return
        setPresets(items)
      })
      .catch(() => {
        if (cancelled) return
        setPresets([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (sheets.length === 0) return
    if (activeSheetId && sheets.some((sheet) => sheet.id === activeSheetId)) return
    onSheetChange(sheets[0].id)
  }, [activeSheetId, onSheetChange, sheets])

  if (sheets.length === 0) {
    return null
  }

  const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId) ?? null

  async function updateActiveSheetConfig(patch: Record<string, unknown>) {
    if (!activeSheet) return

    const updated = await api.put<LayoutSheet>(`/layout-sheets/${activeSheet.id}/config`, patch)
    setSheets((prev) => prev.map((sheet) => (sheet.id === activeSheet.id ? updated : sheet)))
  }

  return (
    <>
      <div className={styles.tabBar}>
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId
          return (
            <button
              key={sheet.id}
              type="button"
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => onSheetChange(sheet.id)}
            >
              <span className={styles.icon}>{SHEET_LABELS[sheet.sheet_type] ?? 'SH'}</span>
              {sheet.name}
            </button>
          )
        })}
      </div>

      {activeSheet && (
        <div className={styles.tabBar}>
          <label className={styles.tab}>
            Maßstab
            <select
              value={activeSheet.config?.sheet_scale ?? '1:20'}
              onChange={(event) => {
                void updateActiveSheetConfig({ sheet_scale: event.target.value, annotative_mode: true })
              }}
            >
              <option value="1:10">1:10</option>
              <option value="1:20">1:20</option>
              <option value="1:25">1:25</option>
              <option value="1:50">1:50</option>
            </select>
          </label>

          <label className={styles.tab}>
            Stil
            <select
              value={activeSheet.config?.style_preset_id ?? ''}
              onChange={(event) => {
                const value = event.target.value
                void updateActiveSheetConfig({
                  style_preset_id: value.length > 0 ? value : null,
                  annotative_mode: true,
                })
              }}
            >
              <option value="">Standard</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </label>

          {showDaylightOptions && (
            <label className={styles.tab}>
              <input
                type='checkbox'
                checked={Boolean(activeSheet.config?.show_north_arrow)}
                onChange={(event) => {
                  void updateActiveSheetConfig({
                    show_north_arrow: event.target.checked,
                  })
                }}
              />
              Nordpfeil
            </label>
          )}
        </div>
      )}
    </>
  )
}
