import { useMemo, useState } from 'react'

import { FIT_PADDING_PX } from '@/config'
import type { Drawing } from '@/dxf'
import { fitBounds, type Viewport } from '@/geometry'

import { FloorplanLayer } from './FloorplanLayer'
import styles from './FloorplanViewer.module.css'
import { useElementSize } from './useElementSize'

interface FloorplanViewerProps {
  readonly drawing: Drawing
}

/** A viewport the user has set by interacting, remembered against the drawing it was set for. */
interface UserViewport {
  readonly drawing: Drawing
  readonly viewport: Viewport
}

/**
 * The viewer owns the `Viewport` and the SVG surface. Layers receive the viewport and
 * draw themselves; the viewer never knows what a layer contains.
 *
 * Until the user pans or zooms, the viewport is *derived*: fit the whole drawing to
 * whatever space is available. A user-set viewport is kept only for the drawing it was
 * set on, so loading a different drawing fits again without an effect or a reset.
 */
export function FloorplanViewer({ drawing }: FloorplanViewerProps) {
  const { ref, size } = useElementSize<HTMLDivElement>()
  const [userViewport] = useState<UserViewport | null>(null)

  const fitted = useMemo(() => fitBounds(drawing.bounds, size, FIT_PADDING_PX), [drawing, size])
  const viewport = userViewport?.drawing === drawing ? userViewport.viewport : fitted

  return (
    <div ref={ref} className={styles.viewer} data-testid="floorplan-viewer">
      <svg
        className={styles.surface}
        width={size.width}
        height={size.height}
        role="img"
        aria-label="Floorplan"
      >
        <FloorplanLayer drawing={drawing} viewport={viewport} />
      </svg>
    </div>
  )
}
