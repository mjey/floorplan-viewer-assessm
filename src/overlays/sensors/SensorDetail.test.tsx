import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Reading, Sensor } from '@/sensors'

import { SensorDetail } from './SensorDetail'

const sensor: Sensor = { id: 's3', label: 'Aisle B-01', position: { x: 9000, y: -2300 } }
const reading: Reading = { timestamp: '2026-08-24T08:00:10Z', temperatureC: 23.6, humidityPct: 39 }

describe('SensorDetail', () => {
  it('lists the sensor facts and the current reading', () => {
    render(<SensorDetail sensor={sensor} reading={reading} stale={false} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Aisle B-01' })).toBeInTheDocument()
    expect(screen.getByText('23.6 °C')).toBeInTheDocument()
    expect(screen.getByText('39 %')).toBeInTheDocument()
    expect(screen.getByText('9000 mm, -2300 mm')).toBeInTheDocument()
    expect(screen.getByText('s3')).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('updates in place when a newer reading arrives', () => {
    const { rerender } = render(
      <SensorDetail sensor={sensor} reading={reading} stale={false} onClose={() => {}} />,
    )

    rerender(
      <SensorDetail
        sensor={sensor}
        reading={{ ...reading, temperatureC: 23.9, humidityPct: 38 }}
        stale={false}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('23.9 °C')).toBeInTheDocument()
    expect(screen.queryByText('23.6 °C')).not.toBeInTheDocument()
  })

  it('flags stale values and copes with no reading at all', () => {
    const { rerender } = render(
      <SensorDetail sensor={sensor} reading={reading} stale onClose={() => {}} />,
    )
    expect(screen.getByRole('note')).toHaveTextContent(/last known values/i)

    rerender(<SensorDetail sensor={sensor} reading={undefined} stale onClose={() => {}} />)
    expect(screen.getByText(/no reading received yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('closes from the button and from the Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SensorDetail sensor={sensor} reading={reading} stale={false} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close details/i }))
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
