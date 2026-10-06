import type { ScreenPoint, Size } from '@/geometry'
import { formatHumidity, formatReadingTime, formatTemperature } from '@/sensors/format'
import type { Reading, Sensor } from '@/sensors'

import { MARKER_RADIUS_PX } from './SensorMarker'
import styles from './SensorTooltip.module.css'

const WIDTH = 168
const HEIGHT = 74
const GAP = 10
const LINE = 18

interface SensorTooltipProps {
  readonly sensor: Sensor
  readonly reading: Reading | undefined
  readonly at: ScreenPoint
  readonly viewer: Size
}

/** Hover card drawn in SVG next to its marker, flipped to stay inside the viewer. */
export function SensorTooltip({ sensor, reading, at, viewer }: SensorTooltipProps) {
  const right = at.x + MARKER_RADIUS_PX + GAP
  const x = right + WIDTH <= viewer.width ? right : at.x - MARKER_RADIUS_PX - GAP - WIDTH
  const below = at.y + MARKER_RADIUS_PX + GAP
  const y = below + HEIGHT <= viewer.height ? below : at.y - MARKER_RADIUS_PX - GAP - HEIGHT

  return (
    <g
      className={styles.tooltip}
      transform={`translate(${x} ${y})`}
      role="tooltip"
      data-testid="sensor-tooltip"
    >
      <rect width={WIDTH} height={HEIGHT} rx={6} className={styles.box} />
      <text x={10} y={LINE} className={styles.title}>
        {sensor.label}
      </text>
      {reading ? (
        <>
          <text x={10} y={LINE * 2} className={styles.line}>
            {formatTemperature(reading.temperatureC)} · {formatHumidity(reading.humidityPct)} RH
          </text>
          <text x={10} y={LINE * 3} className={styles.muted}>
            at {formatReadingTime(reading.timestamp)}
          </text>
        </>
      ) : (
        <text x={10} y={LINE * 2} className={styles.muted}>
          No reading yet
        </text>
      )}
    </g>
  )
}
