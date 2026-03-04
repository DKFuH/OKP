import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { panoramaToursApi, type PanoramaPoint } from '../api/panoramaTours.js'
import styles from './TenantSettingsPage.module.css'

export function PublicPanoramaTourPage() {
  const { token } = useParams<{ token: string }>()
  const [localeCode, setLocaleCode] = useState<'de' | 'en'>('de')
  const [tourName, setTourName] = useState<string>('')
  const [points, setPoints] = useState<PanoramaPoint[]>([])
  const [activePointId, setActivePointId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Ungueltiger Share-Token')
      setLoading(false)
      return
    }

    panoramaToursApi.getShared(token)
      .then((tour) => {
        setLocaleCode(tour.locale_code?.startsWith('en') ? 'en' : 'de')
        setTourName(tour.name)
        setPoints(tour.points_json)
        setActivePointId(tour.points_json[0]?.id ?? null)
      })
      .catch((err: Error) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [token])

  const active = useMemo(() => points.find((point) => point.id === activePointId) ?? null, [points, activePointId])

  const copy = localeCode === 'en'
    ? {
        loading: 'Loading panorama tour…',
        publicTour: 'Public tour',
        subtitle: 'Camera viewpoints and hotspot navigation.',
        viewpoints: 'Viewpoints',
        noPoints: 'This tour does not contain any points.',
        point: 'Point',
        camera: 'Camera',
        toPrefix: 'To',
      }
    : {
        loading: 'Lade Panorama-Tour…',
        publicTour: 'Oeffentliche Tour',
        subtitle: 'Kamerapunkte und Hotspot-Navigation.',
        viewpoints: 'Viewpoints',
        noPoints: 'Diese Tour enthaelt keine Punkte.',
        point: 'Punkt',
        camera: 'Kamera',
        toPrefix: 'Zu',
      }

  if (loading) return <div className={styles.center}>{copy.loading}</div>
  if (error) return <div className={styles.center}>{error}</div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{copy.publicTour}</p>
          <h1>{tourName}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{copy.viewpoints}</h2>
        {points.length === 0 ? (
          <p>{copy.noPoints}</p>
        ) : (
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>{copy.point}</span>
              <select value={activePointId ?? ''} onChange={(event) => setActivePointId(event.target.value)}>
                {points.map((point) => (
                  <option key={point.id} value={point.id}>{point.label}</option>
                ))}
              </select>
            </label>

            {active && (
              <div className={styles.field}>
                <span>{copy.camera}</span>
                <pre>
{JSON.stringify(active.camera, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {active && active.hotspots.length > 0 && (
          <div className={styles.actions}>
            {active.hotspots.map((hotspot) => (
              <button
                key={`${active.id}-${hotspot.target_point_id}`}
                type='button'
                className={styles.btnSecondary}
                onClick={() => setActivePointId(hotspot.target_point_id)}
              >
                {hotspot.label ?? `${copy.toPrefix} ${hotspot.target_point_id}`}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
