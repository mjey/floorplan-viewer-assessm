import { useEffect, useState } from 'react'

/** The current time, re-rendering every `tickMs`. For "updated 12 s ago" style labels. */
export function useNow(tickMs: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), tickMs)
    return () => clearInterval(timer)
  }, [tickMs])

  return now
}
