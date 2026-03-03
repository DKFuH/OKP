import { useEffect, useState } from 'react'
import { Layer, Rect, Text, Line, Circle } from 'react-konva'
import { fengshuiApi, type GeoJsonFeatureCollection, type FengShuiFinding } from '../api/fengshui.js'

interface Props {
  analysisId: string | null
  opacity: number
  visible: boolean
}

function pickZoneFill(label?: string) {
  switch ((label ?? '').toLowerCase()) {
    case 'zentrum': return 'rgba(255,255,255,0.15)'
    default: return 'rgba(0,150,255,0.12)'
  }
}

export function FengShuiOverlay({ analysisId, opacity, visible }: Props) {
  const [zones, setZones] = useState<GeoJsonFeatureCollection | null>(null)
  const [findings, setFindings] = useState<FengShuiFinding[] | null>(null)

  useEffect(() => {
    if (!analysisId || !visible) return
    fengshuiApi.getZones(analysisId).then(setZones).catch(console.error)
    fengshuiApi.getFindings(analysisId).then(setFindings).catch(console.error)
  }, [analysisId, visible])

  if (!visible || !analysisId || !zones) return null

  return (
    <Layer opacity={opacity} listening={false}>
      {zones.features
        .filter(f => f.geometry.type === 'Polygon')
        .map((f, i) => {
          const ring = f.geometry.coordinates[0]
          const x0 = ring[0][0]
          const y0 = ring[0][1]
          const x1 = ring[2][0]
          const y1 = ring[2][1]
          const label = f.properties?.label ?? ''

          return (
            <>
              <Rect
                key={`z-${i}`}
                x={x0}
                y={-y0}
                width={x1 - x0}
                height={y1 - y0}
                fill={pickZoneFill(label)}
              />
              <Text
                key={`t-${i}`}
                x={x0 + 10}
                y={-(y0 + 20)}
                text={label}
                fontSize={14}
                opacity={0.8}
              />
            </>
          )
        })}

      {findings?.map((fd, i) => {
        const g = fd.geometry
        if (!g) return null

        if (g.type === 'Point') {
          const [x, y] = g.coordinates
          return <Circle key={`p-${i}`} x={x} y={-y} radius={6} fill="rgba(255,120,0,0.8)" opacity={0.9} />
        }
        if (g.type === 'LineString') {
          const pts = g.coordinates.flatMap((p: number[]) => [p[0], -p[1]])
          return <Line key={`l-${i}`} points={pts} closed={false} stroke="rgba(255,120,0,0.8)" strokeWidth={2} opacity={0.7} />
        }
        return null
      })}
    </Layer>
  )
}
