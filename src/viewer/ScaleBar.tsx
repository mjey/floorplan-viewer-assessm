import styles from './ScaleBar.module.css'
import { formatLength, pickScaleBarLength } from './scaleBarLength'
import { useViewport } from './ViewportContext'

/**
 * A map-style scale bar. Doubles as a visible check that the viewport maths is right:
 * a 1 m bar must span exactly 1000 * scale pixels.
 */
export function ScaleBar() {
  const { viewport } = useViewport()
  const lengthMm = pickScaleBarLength(viewport.scale)
  const widthPx = lengthMm * viewport.scale

  return (
    <div className={styles.scaleBar} aria-label={`Scale bar: ${formatLength(lengthMm)}`}>
      <div className={styles.bar} style={{ width: `${widthPx}px` }} />
      <span className={styles.label}>{formatLength(lengthMm)}</span>
    </div>
  )
}
