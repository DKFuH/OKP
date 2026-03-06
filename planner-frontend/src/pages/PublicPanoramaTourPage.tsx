import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Body1,
  Body1Strong,
  Button,
  Card,
  CardHeader,
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
import { panoramaToursApi, type PanoramaPoint } from '../api/panoramaTours.js'

const useStyles = makeStyles({
  page: { maxWidth: '700px', margin: '0 auto', display: 'grid', rowGap: tokens.spacingVerticalXXL },
  header: { display: 'grid', rowGap: tokens.spacingVerticalXS },
  hotspots: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', marginTop: tokens.spacingVerticalS },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontFamily: 'monospace',
    fontSize: '13px',
    whiteSpace: 'pre',
    overflowX: 'auto',
  },
})

export function PublicPanoramaTourPage() {
  const styles = useStyles()
  const { token } = useParams<{ token: string }>()
  const [localeCode, setLocaleCode] = useState<'de' | 'en'>('de')
  const [tourName, setTourName] = useState<string>('')
  const [points, setPoints] = useState<PanoramaPoint[]>([])
  const [activePointId, setActivePointId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setError('Ungueltiger Share-Token'); setLoading(false); return }
    panoramaToursApi.getShared(token)
      .then((tour) => {
        setLocaleCode(tour.locale_code?.startsWith('en') ? 'en' : 'de')
        setTourName(tour.name)
        setPoints(tour.points_json)
        setActivePointId(tour.points_json[0]?.id ?? null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const active = useMemo(() => points.find((p) => p.id === activePointId) ?? null, [points, activePointId])
  const copy = localeCode === 'en'
    ? { loading: 'Loading panorama tour\u2026', publicTour: 'Public tour', subtitle: 'Camera viewpoints and hotspot navigation.', viewpoints: 'Viewpoints', noPoints: 'This tour does not contain any points.', point: 'Point', camera: 'Camera', toPrefix: 'To' }
    : { loading: 'Lade Panorama-Tour\u2026', publicTour: '\u00d6ffentliche Tour', subtitle: 'Kamerapunkte und Hotspot-Navigation.', viewpoints: 'Viewpoints', noPoints: 'Diese Tour enth\u00e4lt keine Punkte.', point: 'Punkt', camera: 'Kamera', toPrefix: 'Zu' }

  if (loading) return <Spinner label={copy.loading} style={{ marginTop: 64 }} />
  if (error) return <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title2>{tourName}</Title2>
        <Subtitle2>{copy.subtitle}</Subtitle2>
      </div>

      <Card>
        <CardHeader header={<Body1Strong>{copy.viewpoints}</Body1Strong>} />
        {points.length === 0 ? (
          <Body1>{copy.noPoints}</Body1>
        ) : (
          <>
            <Select
              aria-label={copy.point}
              value={activePointId ?? ''}
              onChange={(_e, d) => setActivePointId(d.value)}
            >
              {points.map((point) => (
                <Option key={point.id} value={point.id}>{point.label}</Option>
              ))}
            </Select>

            {active && (
              <pre className={styles.codeBlock}>{JSON.stringify(active.camera, null, 2)}</pre>
            )}

            {active && active.hotspots.length > 0 && (
              <div className={styles.hotspots}>
                {active.hotspots.map((hotspot) => (
                  <Button
                    key={`${active.id}-${hotspot.target_point_id}`}
                    appearance='secondary'
                    onClick={() => setActivePointId(hotspot.target_point_id)}
                  >
                    {hotspot.label ?? `${copy.toPrefix} ${hotspot.target_point_id}`}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
