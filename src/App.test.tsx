import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { StrictMode } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  createMockSensorApi,
  loadSensorFeed,
  type ReadingsSnapshot,
  type Sensor,
  type SensorApi,
} from '@/sensors'
import { restoreViewerLayout, stubViewerLayout } from '@/test/viewerLayout'

import { App } from './App'

const floorplanSource = readFileSync(resolve(__dirname, '../public/floorplan.dxf'), 'utf8')

const sensors: Sensor[] = [{ id: 's1', label: 'Aisle A-01', position: { x: 5200, y: -2300 } }]

const snapshot: ReadingsSnapshot = {
  readings: new Map([
    ['s1', { timestamp: '2026-08-24T08:00:00Z', temperatureC: 20.5, humidityPct: 45 }],
  ]),
  sequence: 1,
}

/** A fetch stand-in that, like the real one, rejects with AbortError once its signal aborts. */
function mockFetch(handler: (url: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      await Promise.resolve()
      if (init?.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError')
      }
      return handler(String(input))
    }),
  )
}

function instantApi(overrides: Partial<SensorApi> = {}): SensorApi {
  return {
    listSensors: async () => sensors,
    getLatestReadings: async () => snapshot,
    ...overrides,
  }
}

describe('App', () => {
  beforeAll(() => stubViewerLayout())
  afterAll(restoreViewerLayout)

  it('shows a loading state, then the floorplan with live readings', async () => {
    mockFetch(() => new Response(floorplanSource, { status: 200 }))

    render(<App sensorApi={instantApi()} />)

    expect(screen.getByText(/loading floorplan/i)).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /floorplan/i })).toBeInTheDocument()
    expect(screen.getByText(/952 entities/)).toBeInTheDocument()
    expect(screen.getByText(/units: millimetres \(corrected\)/)).toBeInTheDocument()
    expect(await screen.findByText('Live')).toBeInTheDocument()
  })

  it('shows an error with a retry button when the floorplan cannot be fetched', async () => {
    mockFetch(() => new Response('nope', { status: 404, statusText: 'Not Found' }))

    render(<App sensorApi={instantApi()} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not load the floorplan/i)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('reports a sensor list failure and recovers on retry', async () => {
    mockFetch(() => new Response(floorplanSource, { status: 200 }))
    const listSensors = vi
      .fn<SensorApi['listSensors']>()
      .mockRejectedValueOnce(new Error('sensors.json: [0].id must be a non-empty string.'))
      .mockResolvedValue(sensors)
    const user = userEvent.setup()

    render(<App sensorApi={instantApi({ listSensors })} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not load sensors/i)
    expect(alert).toHaveTextContent(/\[0\]\.id/)

    await user.click(screen.getByRole('button', { name: /retry/i }))
    await screen.findByRole('img', { name: /floorplan/i })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(listSensors).toHaveBeenCalledTimes(2)
  })

  it('shows Offline when readings cannot be fetched at all', async () => {
    mockFetch(() => new Response(floorplanSource, { status: 200 }))
    const getLatestReadings = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })

    render(<App sensorApi={instantApi({ getLatestReadings })} />)

    expect(await screen.findByText('Offline')).toBeInTheDocument()
    expect(screen.getByTestId('status-bar')).toHaveTextContent('ECONNREFUSED')
  })
})

describe('App: sensor interaction path', () => {
  beforeAll(() => stubViewerLayout())
  afterAll(restoreViewerLayout)

  it('hover shows a tooltip; click pins a detail panel that closes again', async () => {
    mockFetch(() => new Response(floorplanSource, { status: 200 }))
    const user = userEvent.setup()

    render(<App sensorApi={instantApi()} />)

    const marker = await screen.findByTestId('sensor-marker-s1')
    await screen.findByText('Live')

    await user.hover(marker)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Aisle A-01')
    expect(tooltip).toHaveTextContent('20.5 °C')
    expect(tooltip).toHaveTextContent('45 %')

    await user.click(marker)
    const detail = screen.getByTestId('sensor-detail')
    expect(detail).toHaveTextContent('Aisle A-01')
    expect(detail).toHaveTextContent('20.5 °C')
    expect(detail).toHaveTextContent('45 %')
    expect(detail).toHaveTextContent('5200 mm, -2300 mm')

    await user.click(screen.getByRole('button', { name: /close details/i }))
    expect(screen.queryByTestId('sensor-detail')).not.toBeInTheDocument()
  })
})

describe('App: real mock API under StrictMode (dev-mode double mount)', () => {
  beforeAll(() => stubViewerLayout())
  afterAll(restoreViewerLayout)

  it('reaches Live and shows every sensor despite the simulated unmount/remount', async () => {
    const sensorsJson = readFileSync(resolve(__dirname, '../public/sensors.json'), 'utf8')
    mockFetch((url) =>
      url.endsWith('sensors.json')
        ? new Response(sensorsJson, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        : new Response(floorplanSource, { status: 200 }),
    )
    const api = createMockSensorApi({
      source: () => loadSensorFeed('/sensors.json'),
      latencyMs: { min: 0, max: 0 },
    })

    render(
      <StrictMode>
        <App sensorApi={api} />
      </StrictMode>,
    )

    expect(await screen.findByText('Live')).toBeInTheDocument()
    const markers = await screen.findAllByRole('button', { name: /^Aisle .* °C$/ })
    expect(markers).toHaveLength(6)
  })
})

describe('App: camera', () => {
  beforeAll(() => stubViewerLayout())
  afterAll(restoreViewerLayout)

  it('"Locate on map" centres the viewer on the selected sensor', async () => {
    mockFetch(() => new Response(floorplanSource, { status: 200 }))
    const user = userEvent.setup()

    render(<App sensorApi={instantApi()} />)
    const marker = await screen.findByTestId('sensor-marker-s1')
    await user.click(marker)
    await user.click(screen.getByRole('button', { name: /locate on map/i }))

    // The viewer is stubbed at 800 x 600, so its centre is (400, 300).
    const transform = screen.getByTestId('sensor-marker-s1').getAttribute('transform') ?? ''
    const m = /^translate\((\S+) (\S+)\)$/.exec(transform)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeCloseTo(400, 6)
    expect(Number(m![2])).toBeCloseTo(300, 6)
  })
})
