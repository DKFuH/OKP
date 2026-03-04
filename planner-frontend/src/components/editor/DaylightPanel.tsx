import type { ProjectEnvironment, SunPreview } from '../../plugins/daylight/index.js'
import styles from './DaylightPanel.module.css'

interface Props {
  environment: ProjectEnvironment
  preview: SunPreview | null
  loadingPreview: boolean
  savingEnvironment: boolean
  onChange: (patch: Partial<ProjectEnvironment>) => void
  onSave: () => void
  onRefreshPreview: () => void
}

function toLocalDatetimeInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

function fromLocalDatetimeInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toNumber(value: string): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function DaylightPanel({
  environment,
  preview,
  loadingPreview,
  savingEnvironment,
  onChange,
  onSave,
  onRefreshPreview,
}: Props) {
  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>Tageslicht</h3>

      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.fieldFull}`}>
          Nordrichtung: {Math.round(environment.north_angle_deg)}°
          <input
            className={styles.slider}
            type='range'
            min={0}
            max={360}
            step={1}
            value={environment.north_angle_deg}
            onChange={(event) => onChange({ north_angle_deg: Number(event.target.value) })}
          />
        </label>

        <label className={styles.field}>
          Breitengrad
          <input
            type='number'
            step='0.0001'
            min='-90'
            max='90'
            value={environment.latitude ?? ''}
            onChange={(event) => onChange({ latitude: toNumber(event.target.value) })}
            placeholder='z. B. 48.137'
          />
        </label>

        <label className={styles.field}>
          Längengrad
          <input
            type='number'
            step='0.0001'
            min='-180'
            max='180'
            value={environment.longitude ?? ''}
            onChange={(event) => onChange({ longitude: toNumber(event.target.value) })}
            placeholder='z. B. 11.576'
          />
        </label>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          Datum/Uhrzeit
          <input
            type='datetime-local'
            value={toLocalDatetimeInput(environment.default_datetime)}
            onChange={(event) => onChange({ default_datetime: fromLocalDatetimeInput(event.target.value) })}
          />
        </label>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          Zeitzone
          <input
            value={environment.timezone ?? ''}
            onChange={(event) => onChange({ timezone: event.target.value || null })}
            placeholder='Europe/Berlin'
          />
        </label>
      </div>

      <label className={styles.toggle}>
        <input
          type='checkbox'
          checked={environment.daylight_enabled}
          onChange={(event) => onChange({ daylight_enabled: event.target.checked })}
        />
        Tageslicht aktiv
      </label>

      <div className={styles.actions}>
        <button type='button' className={styles.btnPrimary} disabled={savingEnvironment} onClick={onSave}>
          {savingEnvironment ? 'Speichert…' : 'Speichern'}
        </button>
        <button type='button' className={styles.btnSecondary} disabled={loadingPreview} onClick={onRefreshPreview}>
          {loadingPreview ? 'Berechnet…' : 'Sonnenstand berechnen'}
        </button>
      </div>

      {preview && (
        <div className={styles.meta}>
          <span className={styles.pill}>Azimut {preview.azimuth_deg.toFixed(1)}°</span>
          <span className={styles.pill}>Elevation {preview.elevation_deg.toFixed(1)}°</span>
          <span className={styles.pill}>Intensität {(preview.intensity * 100).toFixed(0)}%</span>
        </div>
      )}
    </section>
  )
}
