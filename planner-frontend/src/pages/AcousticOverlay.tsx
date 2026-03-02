import { Layer, Rect } from 'react-konva'
import type { GeoJsonGrid } from '../api/acoustics.js'

interface Props {
  grid: GeoJsonGrid | null
  opacity: number
  visible: boolean
  stageScale: number
}

export function AcousticOverlay({ grid, opacity, visible, stageScale }: Props) {
  const _stageScale = stageScale
  void _stageScale

  if (!visible || !grid) {
    return null
  }

  return (
    <Layer opacity={opacity} listening={false}>
      {grid.features.map((feature, idx) => {
        const ring = feature.geometry.coordinates[0]
        if (!ring || ring.length < 4) {
          return null
        }

        const [x0, y0] = ring[0]
        const [x1] = ring[1]
        const [, y2] = ring[2]

        return (
          <Rect
            key={`acoustic-cell-${idx}`}
            x={x0}
            y={y0}
            width={x1 - x0}
            height={y2 - y0}
            fill={feature.properties.color}
            listening={false}
          />
        )
      })}
    </Layer>
  )
}