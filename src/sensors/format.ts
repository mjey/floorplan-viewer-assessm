export function formatTemperature(celsius: number): string {
  return `${celsius.toFixed(1)} °C`
}

export function formatHumidity(percent: number): string {
  return `${Math.round(percent)} %`
}

/** ISO timestamp -> local wall-clock time; falls back to the raw string if unparseable. */
export function formatReadingTime(timestamp: string): string {
  const ms = Date.parse(timestamp)
  if (Number.isNaN(ms)) return timestamp
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
