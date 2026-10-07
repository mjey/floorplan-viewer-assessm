import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { PolledReadings } from '@/sensors'

import { StatusBar } from './StatusBar'

function readings(overrides: Partial<PolledReadings>): PolledReadings {
  return {
    status: 'live',
    readings: new Map(),
    sequence: null,
    updatedAt: null,
    error: null,
    isFetching: false,
    refresh: () => {},
    ...overrides,
  }
}

describe('StatusBar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-08-24T08:00:30Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows Live with the age of the latest successful poll', () => {
    render(<StatusBar readings={readings({ updatedAt: Date.parse('2026-08-24T08:00:18Z') })} />)

    expect(screen.getByRole('status')).toHaveTextContent('Live')
    expect(screen.getByRole('status')).toHaveTextContent('updated 12 s ago')
  })

  it('shows Stale and says the values are old when the last poll failed', () => {
    render(
      <StatusBar
        readings={readings({
          status: 'stale',
          updatedAt: Date.parse('2026-08-24T08:00:00Z'),
          error: new Error('Simulated sensor API failure (poll #7)'),
        })}
      />,
    )

    const bar = screen.getByRole('status')
    expect(bar).toHaveTextContent('Stale')
    expect(bar).toHaveTextContent('updated 30 s ago')
    expect(bar).toHaveTextContent('showing last known values')
  })

  it('shows the error message when there has never been a successful poll', () => {
    render(<StatusBar readings={readings({ status: 'error', error: new Error('ECONNREFUSED') })} />)

    expect(screen.getByRole('status')).toHaveTextContent('Offline')
    expect(screen.getByRole('status')).toHaveTextContent('ECONNREFUSED')
  })

  it('shows Paused when polling is suspended', () => {
    render(<StatusBar readings={readings({})} paused />)

    expect(screen.getByRole('status')).toHaveTextContent('Paused')
  })

  it('triggers a refresh and disables the button while fetching', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const refresh = vi.fn()
    const { rerender } = render(<StatusBar readings={readings({ refresh })} />)

    await user.click(screen.getByRole('button', { name: /refresh readings/i }))
    expect(refresh).toHaveBeenCalledTimes(1)

    rerender(<StatusBar readings={readings({ refresh, isFetching: true })} />)
    expect(screen.getByRole('button', { name: /refresh readings/i })).toBeDisabled()
  })
})
