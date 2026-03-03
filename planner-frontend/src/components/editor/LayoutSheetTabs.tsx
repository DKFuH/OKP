import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import styles from './LayoutSheetTabs.module.css'

export interface LayoutSheet {
  id: string
  name: string
  sheet_type: string
  position: number
}

interface Props {
  projectId: string
  activeSheetId: string | null
  onSheetChange: (sheetId: string) => void
}

const SHEET_LABELS: Record<string, string> = {
  floorplan: 'FP',
  elevations: 'EL',
  installation: 'IN',
  detail: 'DT',
  section: 'SC',
}

export function LayoutSheetTabs({ projectId, activeSheetId, onSheetChange }: Props) {
  const [sheets, setSheets] = useState<LayoutSheet[]>([])

  useEffect(() => {
    let cancelled = false
    api
      .get<LayoutSheet[]>(`/projects/${projectId}/layout-sheets`)
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
  }, [projectId])

  useEffect(() => {
    if (sheets.length === 0) return
    if (activeSheetId && sheets.some((sheet) => sheet.id === activeSheetId)) return
    onSheetChange(sheets[0].id)
  }, [activeSheetId, onSheetChange, sheets])

  if (sheets.length === 0) {
    return null
  }

  return (
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
  )
}
