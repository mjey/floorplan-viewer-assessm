import { useLayoutEffect, useRef, useState } from 'react'

import type { Size } from '@/geometry'

const ZERO: Size = { width: 0, height: 0 }

/**
 * Tracks the rendered size of an element through `ResizeObserver`.
 * Returns `{ width: 0, height: 0 }` until the first measurement.
 */
export function useElementSize<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>
  size: Size
} {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<Size>(ZERO)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const rect = element.getBoundingClientRect()
      setSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}
