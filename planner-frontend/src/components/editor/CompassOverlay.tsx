import styles from './CompassOverlay.module.css'

interface Props {
  northAngleDeg: number
}

export function CompassOverlay({ northAngleDeg }: Props) {
  const normalized = ((northAngleDeg % 360) + 360) % 360

  return (
    <div className={styles.wrap} aria-hidden='true'>
      <svg className={styles.svg} viewBox='0 0 84 84' role='presentation'>
        <circle cx='42' cy='42' r='40' className={styles.ring} />
        <g transform={`rotate(${normalized} 42 42)`}>
          <line x1='42' y1='56' x2='42' y2='20' className={styles.arrowLine} />
          <polygon points='42,12 35,24 49,24' className={styles.arrowHead} />
        </g>
        <text x='42' y='16' textAnchor='middle' className={styles.label}>N</text>
      </svg>
      <div className={styles.deg}>{Math.round(normalized)}°</div>
    </div>
  )
}
