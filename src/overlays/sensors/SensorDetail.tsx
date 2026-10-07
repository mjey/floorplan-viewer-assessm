import { useEffect } from 'react'

import { formatHumidity, formatReadingTime, formatTemperature } from '@/sensors/format'
import type { Sensor, SensorReading } from '@/sensors'

import styles from './SensorDetail.module.css'
import { temperatureColor } from './temperatureScale'

interface SensorDetailProps {
  readonly sensor: Sensor
  readonly entry: SensorReading | undefined
  readonly onClose: () => void
  /** Centres the map on this sensor. Omit to hide the button. */
  readonly onLocate?: () => void
}

/** The pinned detail card for the selected sensor. Re-renders as readings arrive. */
export function SensorDetail({ sensor, entry, onClose, onLocate }: SensorDetailProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const reading = entry?.reading

  return (
    <aside
      className={styles.panel}
      aria-labelledby="sensor-detail-title"
      data-testid="sensor-detail"
    >
      <header className={styles.header}>
        <span
          className={styles.swatch}
          style={{ background: reading ? temperatureColor(reading.temperatureC) : undefined }}
          aria-hidden="true"
        />
        <h2 id="sensor-detail-title" className={styles.title}>
          {sensor.label}
        </h2>
        {onLocate && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onLocate}
            aria-label="Locate on map"
            title="Centre the map on this sensor"
          >
            &#9678;
          </button>
        )}
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Close details"
        >
          &times;
        </button>
      </header>

      {reading ? (
        <dl className={styles.facts}>
          <dt>Temperature</dt>
          <dd>{formatTemperature(reading.temperatureC)}</dd>
          <dt>Humidity</dt>
          <dd>{formatHumidity(reading.humidityPct)}</dd>
          <dt>Reading time</dt>
          <dd>
            <time dateTime={reading.timestamp}>{formatReadingTime(reading.timestamp)}</time>
          </dd>
          <dt>Position</dt>
          <dd>
            {sensor.position.x} mm, {sensor.position.y} mm
          </dd>
          <dt>Sensor id</dt>
          <dd>{sensor.id}</dd>
        </dl>
      ) : (
        <p className={styles.muted}>No reading received yet.</p>
      )}

      {entry?.stale && (
        <p className={styles.warning} role="note">
          Showing last known values; this sensor did not report in the latest poll.
        </p>
      )}
    </aside>
  )
}
