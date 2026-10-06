/** "just now", "12 s ago", "3 min ago": coarse on purpose, it is a freshness hint. */
export function formatRelativeTime(timestampMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - timestampMs) / 1000))
  if (seconds < 2) return 'just now'
  if (seconds < 60) return `${seconds} s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ago`
}
