import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { useNow } from '@/lib/useNow'
import type { PolledReadings } from '@/sensors'

import styles from './StatusBar.module.css'

interface StatusBarProps {
  readonly readings: PolledReadings
  /** True when polling is paused (e.g. the tab is hidden). */
  readonly paused?: boolean
}

const LABELS: Record<PolledReadings['status'], string> = {
  loading: 'Connecting',
  live: 'Live',
  stale: 'Stale',
  error: 'Offline',
}

/**
 * Tells the operator how much to trust what they see: whether readings are live,
 * stale (last poll failed, showing older values) or missing, and how old they are.
 */
export function StatusBar({ readings, paused = false }: StatusBarProps) {
  const now = useNow(1000)
  const { status, updatedAt, error, isFetching, refresh } = readings
  const label = paused ? 'Paused' : LABELS[status]
  const tone = paused ? 'paused' : status

  return (
    <div className={styles.bar} role="status" aria-live="polite" data-testid="status-bar">
      <span
        className={`${styles.indicator} ${styles[tone]} ${isFetching ? styles.fetching : ''}`}
      />
      <span className={styles.label}>{label}</span>
      {updatedAt !== null && (
        <span className={styles.detail}>updated {formatRelativeTime(updatedAt, now)}</span>
      )}
      {error && (
        <span className={styles.error} title={error.message}>
          {status === 'stale' ? 'showing last known values' : error.message}
        </span>
      )}
      <button
        type="button"
        className={styles.refresh}
        onClick={refresh}
        disabled={isFetching}
        aria-label="Refresh readings"
        title="Refresh readings"
      >
        &#8635;
      </button>
    </div>
  )
}
