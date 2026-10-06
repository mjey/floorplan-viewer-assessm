import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Drawing } from '@/dxf'
import { screenToModel, type Viewport } from '@/geometry'
import { restoreViewerLayout, stubViewerLayout } from '@/test/viewerLayout'

import { FloorplanViewer } from './FloorplanViewer'
import { useViewport } from './ViewportContext'

const VIEWER_SIZE = { width: 800, height: 600 }

const drawing: Drawing = {
  layers: [
    {
      name: '0',
      bounds: { minX: 0, minY: 0, maxX: 10_000, maxY: 5000 },
      segments: [{ kind: 'line', from: { x: 0, y: 0 }, to: { x: 10_000, y: 5000 } }],
    },
  ],
  bounds: { minX: 0, minY: 0, maxX: 10_000, maxY: 5000 },
  units: { factor: 1, source: 'header', declared: 'millimetres', note: '' },
  warnings: [],
  entityCount: 1,
}

/** Reads the viewport the floorplan layer is actually drawn with. */
function currentViewport(): Viewport {
  const transform = screen.getByTestId('floorplan-layer').getAttribute('transform') ?? ''
  const match = /^matrix\((\S+) 0 0 (\S+) (\S+) (\S+)\)$/.exec(transform)
  if (!match) throw new Error(`Unexpected transform: ${transform}`)
  return { scale: Number(match[1]), tx: Number(match[3]), ty: Number(match[4]) }
}

/** A minimal overlay to prove children receive the live viewport. */
function ViewportProbe() {
  const { viewport, size } = useViewport()
  return <text data-testid="probe">{`${viewport.scale}|${size.width}x${size.height}`}</text>
}

describe('FloorplanViewer', () => {
  beforeAll(() => stubViewerLayout(VIEWER_SIZE))
  afterAll(restoreViewerLayout)

  it('fits the drawing on first render and exposes the viewport to overlays', () => {
    render(
      <FloorplanViewer drawing={drawing}>
        <ViewportProbe />
      </FloorplanViewer>,
    )

    const vp = currentViewport()
    expect(vp.scale).toBeGreaterThan(0)
    expect(screen.getByTestId('probe')).toHaveTextContent(`${vp.scale}|800x600`)
    expect(screen.getByRole('button', { name: /fit to view/i })).toBeDisabled()
  })

  it('pans by the dragged distance and re-enables fit', () => {
    render(<FloorplanViewer drawing={drawing} />)
    const viewer = screen.getByTestId('floorplan-viewer')
    const before = currentViewport()

    fireEvent.pointerDown(viewer, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 150, clientY: 130 })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 160, clientY: 120 })
    fireEvent.pointerUp(viewer, { pointerId: 1 })

    const after = currentViewport()
    expect(after.scale).toBe(before.scale)
    expect(after.tx - before.tx).toBeCloseTo(60)
    expect(after.ty - before.ty).toBeCloseTo(20)
    expect(screen.getByRole('button', { name: /fit to view/i })).toBeEnabled()
  })

  it('ignores a press that moves less than the drag threshold', () => {
    render(<FloorplanViewer drawing={drawing} />)
    const viewer = screen.getByTestId('floorplan-viewer')
    const before = currentViewport()

    fireEvent.pointerDown(viewer, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 101, clientY: 102 })
    fireEvent.pointerUp(viewer, { pointerId: 1 })

    expect(currentViewport()).toEqual(before)
  })

  it('zooms with the wheel about the cursor position', () => {
    render(<FloorplanViewer drawing={drawing} />)
    const viewer = screen.getByTestId('floorplan-viewer')
    const cursor = { x: 300, y: 200 }
    const before = currentViewport()
    const modelUnderCursor = screenToModel(cursor, before)

    fireEvent.wheel(viewer, { deltaY: -100, clientX: cursor.x, clientY: cursor.y })

    const after = currentViewport()
    expect(after.scale).toBeGreaterThan(before.scale)
    const stillUnderCursor = screenToModel(cursor, after)
    expect(stillUnderCursor.x).toBeCloseTo(modelUnderCursor.x, 3)
    expect(stillUnderCursor.y).toBeCloseTo(modelUnderCursor.y, 3)
  })

  it('returns to the fit from the toolbar and from the keyboard', async () => {
    const user = userEvent.setup()
    render(<FloorplanViewer drawing={drawing} />)
    const viewer = screen.getByTestId('floorplan-viewer')
    const fitted = currentViewport()

    await user.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(currentViewport().scale).toBeGreaterThan(fitted.scale)

    await user.click(screen.getByRole('button', { name: /fit to view/i }))
    expect(currentViewport()).toEqual(fitted)

    viewer.focus()
    await user.keyboard('+')
    expect(currentViewport().scale).toBeGreaterThan(fitted.scale)
    await user.keyboard('0')
    expect(currentViewport()).toEqual(fitted)
  })
})
