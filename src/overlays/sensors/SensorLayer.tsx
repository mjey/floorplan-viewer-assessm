import { useMemo, useState } from 'react'

import { modelToScreen, type ScreenPoint } from '@/geometry'
import type { Reading, Sensor, SensorId } from '@/sensors'
import { useViewport } from '@/viewer'

import { SensorMarker } from './SensorMarker'
import { SensorTooltip } from './SensorTooltip'

export interface SensorLayerProps {
  readonly sensors: readonly Sensor[]
  /** Latest reading per sensor id; `null` before the first poll succeeds. */
  readonly readings: ReadonlyMap<SensorId, Reading> | null
  /** True when the readings shown are from an earlier poll than the latest attempt. */
  readonly stale: boolean
  readonly selectedId: SensorId | null
  readonly onSelect: (id: SensorId | null) => void
}

interface PlacedSensor {
  readonly sensor: Sensor
  readonly at: ScreenPoint
}

/**
 * The sensor overlay. It joins two independent data sets at render time, by id:
 * static `sensors` (positions, labels) and the live `readings` map. Positions are
 * converted with the viewer's current mapping, so markers track the floorplan
 * exactly under pan and zoom while staying a constant size on screen.
 *
 * This is the template for any further overlay: take domain data as props, read the
 * viewport from context, draw in screen space.
 */
export function SensorLayer({ sensors, readings, stale, selectedId, onSelect }: SensorLayerProps) {
  const { viewport, size } = useViewport()
  const [hoveredId, setHoveredId] = useState<SensorId | null>(null)

  const placed = useMemo<readonly PlacedSensor[]>(
    () => sensors.map((sensor) => ({ sensor, at: modelToScreen(sensor.position, viewport) })),
    [sensors, viewport],
  )
  const hovered = placed.find((p) => p.sensor.id === hoveredId)

  return (
    <g data-testid="sensor-layer">
      {placed.map(({ sensor, at }) => (
        <SensorMarker
          key={sensor.id}
          sensor={sensor}
          reading={readings?.get(sensor.id)}
          at={at}
          selected={sensor.id === selectedId}
          stale={stale}
          onSelect={() => onSelect(sensor.id === selectedId ? null : sensor.id)}
          onHoverChange={(hovering) => setHoveredId(hovering ? sensor.id : null)}
        />
      ))}
      {hovered && (
        <SensorTooltip
          sensor={hovered.sensor}
          reading={readings?.get(hovered.sensor.id)}
          at={hovered.at}
          viewer={size}
        />
      )}
    </g>
  )
}
