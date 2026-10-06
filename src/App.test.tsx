import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'

import { restoreViewerLayout, stubViewerLayout } from '@/test/viewerLayout'

import { App } from './App'

const floorplanSource = readFileSync(resolve(__dirname, '../public/floorplan.dxf'), 'utf8')

function mockFetch(handler: (url: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => Promise.resolve(handler(String(input)))),
  )
}

describe('App', () => {
  beforeAll(() => stubViewerLayout())
  afterAll(restoreViewerLayout)

  it('shows a loading state and then renders the floorplan', async () => {
    mockFetch(() => new Response(floorplanSource, { status: 200 }))

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(/loading floorplan/i)
    expect(await screen.findByRole('img', { name: /floorplan/i })).toBeInTheDocument()
    expect(screen.getByText(/952 entities/)).toBeInTheDocument()
    expect(screen.getByText(/units: millimetres \(corrected\)/)).toBeInTheDocument()
  })

  it('shows an error with a retry button when the floorplan cannot be fetched', async () => {
    mockFetch(() => new Response('nope', { status: 404, statusText: 'Not Found' }))

    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not load the floorplan/i)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
