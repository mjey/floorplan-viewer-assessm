import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { ReadingsSnapshot, Sensor, SensorApi } from '@/sensors'
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

function mockFetch(handler: (url: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => Promise.resolve(handler(String(input)))),
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
