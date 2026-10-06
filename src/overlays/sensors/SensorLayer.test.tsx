import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Drawing } from '@/dxf'
import { modelToScreen, type Viewport } from '@/geometry'
import type { Reading, Sensor, SensorId } from '@/sensors'
import { restoreViewerLayout, stubViewerLayout } from '@/test/viewerLayout'
import { FloorplanViewer } from '@/viewer'

import { SensorLayer } from './SensorLayer'

const drawing: Drawing = {
  layers: [],
  bounds: { minX: 3806, minY: -3531, maxX: 14_145, maxY: 4711 },
  units: { factor: 1, source: 'header', declared: 'millimetres', note: '' },
  warnings: [],
  entityCount: 0,
}

const sensors: Sensor[] = [
  { id: 's1', label: 'Aisle A-01', position: { x: 5200, y: -2300 } },
  { id: 's6', label: 'Aisle C-02', position: { x: 12_800, y: 3200 } },
]

const readings = new Map<SensorId, Reading>([
  ['s1', { timestamp: '2026-08-24T08:00:00Z', temperatureC: 20.5, humidityPct: 45 }],
  // s6 deliberately has no reading
])

function floorplanViewport(): Viewport {
  const transform = screen.getByTestId('floorplan-layer').getAttribute('transform') ?? ''
  const m = /^matrix\((\S+) 0 0 \S+ (\S+) (\S+)\)$/.exec(transform)
  if (!m) throw new Error(`Unexpected transform: ${transform}`)
  return { scale: Number(m[1]), tx: Number(m[2]), ty: Number(m[3]) }
}

function markerPosition(id: SensorId): { x: number; y: number } {
  const transform = screen.getByTestId(`sensor-marker-${id}`).getAttribute('transform') ?? ''
  const m = /^translate\((\S+) (\S+)\)$/.exec(transform)
  if (!m) throw new Error(`Unexpected transform: ${transform}`)
  return { x: Number(m[1]), y: Number(m[2]) }
}

function renderLayer(props: Partial<React.ComponentProps<typeof SensorLayer>> = {}) {
  const onSelect = vi.fn()
  const view = render(
    <FloorplanViewer drawing={drawing}>
      <SensorLayer
        sensors={sensors}
        readings={readings}
        stale={false}
        selectedId={null}
        onSelect={onSelect}
        {...props}
      />
    </FloorplanViewer>,
  )
  return { ...view, onSelect }
}

describe('SensorLayer', () => {
  beforeAll(() => stubViewerLayout())
  afterAll(restoreViewerLayout)

  it('places every marker exactly where the floorplan transform puts its model position', () => {
    renderLayer()
    const vp = floorplanViewport()

    for (const sensor of sensors) {
      const expected = modelToScreen(sensor.position, vp)
      const actual = markerPosition(sensor.id)
      expect(actual.x).toBeCloseTo(expected.x, 6)
      expect(actual.y).toBeCloseTo(expected.y, 6)
    }
  })

  it('keeps markers aligned with the floorplan after a pan and a zoom', () => {
    renderLayer()
    const viewer = screen.getByTestId('floorplan-viewer')

    fireEvent.pointerDown(viewer, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 300,
      clientY: 300,
    })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 380, clientY: 250 })
    fireEvent.pointerUp(viewer, { pointerId: 1 })
    fireEvent.wheel(viewer, { deltaY: -240, clientX: 500, clientY: 320 })

    const vp = floorplanViewport()
    for (const sensor of sensors) {
      const expected = modelToScreen(sensor.position, vp)
      const actual = markerPosition(sensor.id)
      expect(actual.x).toBeCloseTo(expected.x, 6)
      expect(actual.y).toBeCloseTo(expected.y, 6)
    }
  })

  it('shows the temperature on markers that have a reading and "no data" otherwise', () => {
    renderLayer()

    expect(screen.getByRole('button', { name: 'Aisle A-01: 20.5 °C' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aisle C-02: no data' })).toBeInTheDocument()
  })

  it('shows a tooltip with label, temperature and humidity on hover', async () => {
    const user = userEvent.setup()
    renderLayer()

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.hover(screen.getByTestId('sensor-marker-s1'))

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Aisle A-01')
    expect(tooltip).toHaveTextContent('20.5 °C')
    expect(tooltip).toHaveTextContent('45 %')

    await user.unhover(screen.getByTestId('sensor-marker-s1'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('selects on click and keyboard, and toggles off when the selected marker is clicked again', async () => {
    const user = userEvent.setup()
    const { onSelect, rerender } = renderLayer()

    await user.click(screen.getByTestId('sensor-marker-s1'))
    expect(onSelect).toHaveBeenLastCalledWith('s1')

    screen.getByTestId('sensor-marker-s6').focus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith('s6')

    rerender(
      <FloorplanViewer drawing={drawing}>
        <SensorLayer
          sensors={sensors}
          readings={readings}
          stale={false}
          selectedId="s1"
          onSelect={onSelect}
        />
      </FloorplanViewer>,
    )
    expect(screen.getByTestId('sensor-marker-s1')).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByTestId('sensor-marker-s1'))
    expect(onSelect).toHaveBeenLastCalledWith(null)
  })

  it('does not pan the map when a marker is merely clicked', async () => {
    const user = userEvent.setup()
    renderLayer()
    const before = floorplanViewport()

    await user.click(screen.getByTestId('sensor-marker-s1'))

    expect(floorplanViewport()).toEqual(before)
  })
})
