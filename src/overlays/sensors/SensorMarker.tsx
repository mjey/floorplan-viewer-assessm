import type { KeyboardEvent, MouseEvent } from 'react'

import type { ScreenPoint } from '@/geometry'
import { formatTemperature } from '@/sensors/format'
import type { Reading, Sensor } from '@/sensors'

import styles from './SensorMarker.module.css'
import { temperatureColor } from './temperatureScale'

export const MARKER_RADIUS_PX = 16

interface SensorMarkerProps {
  readonly sensor: Sensor
  readonly reading: Reading | undefined
  readonly at: ScreenPoint
  readonly selected: boolean
  readonly stale: boolean
  readonly onSelect: () => void
  readonly onHoverChange: (hovering: boolean) => void
}

/**
 * One sensor on the map: a coloured disc with the current temperature, drawn in
 * screen space so it keeps its size at every zoom level. Behaves as a button.
 */
export function SensorMarker({
  sensor,
  reading,
  at,
  selected,
  stale,
  onSelect,
  onHoverChange,
}: SensorMarkerProps) {
  const value = reading ? formatTemperature(reading.temperatureC) : 'no data'
  const fill = reading ? temperatureColor(reading.temperatureC) : 'var(--text-muted)'

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  // A double-click on a marker is not a request to zoom the map.
  const swallow = (event: MouseEvent<SVGGElement>) => event.stopPropagation()

  return (
    <g
      className={[styles.marker, selected && styles.selected, stale && styles.stale]
        .filter(Boolean)
        .join(' ')}
      transform={`translate(${at.x} ${at.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${sensor.label}: ${value}`}
      aria-pressed={selected}
      data-testid={`sensor-marker-${sensor.id}`}
      onClick={onSelect}
      onDoubleClick={swallow}
      onKeyDown={onKeyDown}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
    >
      <circle r={MARKER_RADIUS_PX + 4} className={styles.halo} />
      <circle r={MARKER_RADIUS_PX} className={styles.disc} style={{ fill }} />
      <text className={styles.value} textAnchor="middle" dy="0.35em">
        {reading ? reading.temperatureC.toFixed(1) : '–'}
      </text>
      <text className={styles.label} textAnchor="middle" y={MARKER_RADIUS_PX + 14}>
        {sensor.label}
      </text>
    </g>
  )
}
