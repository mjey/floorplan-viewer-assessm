import { useMemo, useState } from 'react'

import { modelToScreen, type ScreenPoint } from '@/geometry'
import type { Sensor, SensorId, SensorReadings } from '@/sensors'
import { useViewport } from '@/viewer'

import { SensorMarker } from './SensorMarker'
import { SensorTooltip } from './SensorTooltip'

export interface SensorLayerProps {
  readonly sensors: readonly Sensor[]
  /** Last known reading per sensor id, each with its own stale flag. */
  readonly readings: SensorReadings
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
export function SensorLayer({ sensors, readings, selectedId, onSelect }: SensorLayerProps) {
  const { viewport, size } = useViewport()
  const [hoveredId, setHoveredId] = useState<SensorId | null>(null)

  const placed = useMemo<readonly PlacedSensor[]>(
    () => sensors.map((sensor) => ({ sensor, at: modelToScreen(sensor.position, viewport) })),
    [sensors, viewport],
  )
  const hovered = placed.find((p) => p.sensor.id === hoveredId)

  return (
    <g data-testid="sensor-layer">
      {placed.map(({ sensor, at }) => {
        const entry = readings.get(sensor.id)
        return (
          <SensorMarker
            key={sensor.id}
            sensor={sensor}
            reading={entry?.reading}
            at={at}
            selected={sensor.id === selectedId}
            stale={entry?.stale ?? false}
            onSelect={() => onSelect(sensor.id === selectedId ? null : sensor.id)}
            onHoverChange={(hovering) => setHoveredId(hovering ? sensor.id : null)}
          />
        )
      })}
      {hovered && (
        <SensorTooltip
          sensor={hovered.sensor}
          entry={readings.get(hovered.sensor.id)}
          at={hovered.at}
          viewer={size}
        />
      )}
    </g>
  )
}
