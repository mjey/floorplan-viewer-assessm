import { useMemo } from 'react'

import { layerToPath, type Drawing, type DrawingLayer } from '@/dxf'
import { toSvgTransform, type Viewport } from '@/geometry'

import styles from './FloorplanLayer.module.css'

interface FloorplanLayerProps {
  readonly drawing: Drawing
  readonly viewport: Viewport
}

/**
 * Draws the floorplan geometry. Path data is computed once per drawing in model
 * coordinates; pan and zoom only ever change the `transform` on the wrapping group,
 * so the browser does no per-frame path work.
 */
export function FloorplanLayer({ drawing, viewport }: FloorplanLayerProps) {
  const layers = useMemo(() => drawing.layers.map(toRenderableLayer), [drawing])

  return (
    <g transform={toSvgTransform(viewport)} data-testid="floorplan-layer">
      {layers.map((layer) => (
        <g key={layer.name} data-layer={layer.name}>
          {layer.fillPath && <path d={layer.fillPath} className={styles.zone} />}
          <path d={layer.strokePath} className={styles.lines} />
        </g>
      ))}
    </g>
  )
}

interface RenderableLayer {
  readonly name: string
  readonly strokePath: string
  /** Closed polylines only, drawn underneath as a tinted area (rooms, zones). */
  readonly fillPath: string | null
}

function toRenderableLayer(layer: DrawingLayer): RenderableLayer {
  const closedShapes = layer.segments.filter((s) => s.kind === 'polyline' && s.closed)
  return {
    name: layer.name,
    strokePath: layerToPath(layer),
    fillPath: closedShapes.length > 0 ? layerToPath({ ...layer, segments: closedShapes }) : null,
  }
}
