# Data Centre Floorplan Viewer

OctaiPipe frontend take-home, Assessment 1 (DXF Viewer).

A React + TypeScript app that draws the data hall from `floorplan.dxf`, lets you pan and zoom around it, and places the sensors from `sensors.json` on top with their live temperature and humidity. Readings come from a mocked API that is polled every 5 seconds.

![Floorplan with six sensor markers](docs/screenshot.png)

## Running it

Needs Node 20.19 or newer (Vite 8).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run build    # type-check and production build
npm run lint
```

The loading and failure states are hard to catch with a fast mock, so you can force them from the URL:

- `?latency=2000-3000` makes every poll slow, so you can see "Connecting"
- `?failEvery=2` fails every second poll (Stale, last values kept)
- `?failEvery=1` fails every poll (Offline, with a retry button)

These only configure the mock in `main.tsx`. The rest of the app doesn't know they exist.

## How it fits together

```
src/
  geometry/   pure maths: the viewport, model <-> screen conversion, fit and zoom
  dxf/        DXF file -> Drawing in millimetres (parser wrapper, normaliser, unit check)
  viewer/     the map: viewport state, pan/zoom gestures, SVG surface, controls
  overlays/   things drawn on the map, currently the sensor markers, tooltip and detail card
  sensors/    the SensorApi interface, the mock, validation and the polling hook
  ui/, lib/   status bar and small helpers
```

Dependencies only point one way. `geometry` knows nothing about the app, the viewer knows nothing about sensors, and `main.tsx` is the only file that knows the readings come from a mock.

### Coordinate space

Model space is the drawing in millimetres with Y up. Screen space is pixels with Y down. The mapping between them is a viewport of three numbers, `{ scale, tx, ty }`:

```
screen.x =  model.x * scale + tx
screen.y = -model.y * scale + ty
```

The floorplan is drawn in model coordinates inside a single `<g transform="matrix(s 0 0 -s tx ty)">`, so panning and zooming only change one attribute. Sensor markers are drawn in screen space with `modelToScreen` using the same viewport. That keeps them a constant size with readable text, and they can't drift away from the floorplan because both come from the same three numbers. Zooming keeps the point under the cursor where it is.

### Live data

The UI only depends on this interface:

```ts
interface SensorApi {
  listSensors(signal?: AbortSignal): Promise<readonly Sensor[]>
  getLatestReadings(signal?: AbortSignal): Promise<ReadingsSnapshot>
}
```

The mock loads `sensors.json` once and returns the next reading for every sensor on each call, with random latency and a failure every 7th call. The series is only 30 seconds long, so it wraps around and shifts the timestamps forward so time doesn't jump back. Polling goes through the interface rather than HTTP, which is why the Network tab only shows the one `sensors.json` request.

`usePolledReadings` uses a `setTimeout` chain instead of `setInterval`, so a slow response never overlaps the next poll. It has four states: loading, live, stale (the last poll failed and the previous values are kept) and error (nothing to show yet). Staleness is tracked per sensor, so a sensor missing from a poll keeps its last value with a dashed marker instead of disappearing. Polling pauses while the tab is hidden.

Sensor placement (id, label, position) and readings are separate, and the overlay joins them by id when it renders.

### Adding an overlay

An overlay is a child of `FloorplanViewer` that reads the viewport from context:

```tsx
function CracUnitsLayer({ units }: { units: readonly CracUnit[] }) {
  const { viewport } = useViewport()
  return (
    <g>
      {units.map((unit) => {
        const { x, y } = modelToScreen(unit.position, viewport)
        return <rect key={unit.id} x={x - 8} y={y - 8} width={16} height={16} />
      })}
    </g>
  )
}
```

Nothing in the viewer or the sensor layer has to change. To move the camera from outside the viewer, pass a `ref` to `FloorplanViewer` and call `centerOn`. The "Locate on map" button in the detail card works that way.

## Decisions and trade-offs

- `dxf-parser` with my own normaliser, instead of a complete viewer like `dxf-viewer`. That one brings three.js and owns the camera, and placing sensors accurately on top would have meant fighting it.
- Pan/zoom and polling written by hand rather than with d3-zoom or TanStack Query. Both are small here, and they are the parts the brief asks about, so I didn't want them hidden behind a library's options.
- SVG rather than canvas. Around 950 entities and six markers is easy for SVG, and it gives me hit-testing, focus and CSS for free. At tens of thousands of entities I'd move to canvas or WebGL and keep the same viewport maths.
- Pointer capture starts only after a 4 px drag. Capturing on pointer down would swallow clicks meant for the markers.
- State is derived where possible (the fitted viewport, load states) instead of being synced in effects.
- `sensors.json` is validated at runtime with small hand-written checks and readable errors such as `[2].readings[0].temperatureC must be a finite number`. A schema library felt like too much for a shape this small.

## Tests

Run with `npm test`. I aimed them at the three areas the brief mentions:

- Coordinate conversion: the Y flip, round trips, zoom about the cursor, fit, the SVG matrix agreeing with `modelToScreen`, and markers staying on the floorplan after a real drag and wheel zoom.
- Polling: the interval, no overlapping requests, failures keeping values and recovering, pause, refresh and unmount, all with fake timers.
- A user path: hovering shows the tooltip, clicking pins the detail card, closing removes it.

There are also a few for the DXF handling (unit check, arc paths, the real file) and the mock.

## How I used AI

I used Claude Code for most of the drafting. Before any code I read the brief, looked through the DXF with shell tools (that's how I found the unit mismatch and the unused blocks) and settled on the structure. After that I built it one step at a time: draft with the assistant, review it, run typecheck, lint and tests.

What I rejected or reworked:

- Early drafts set state inside `useEffect` for loading and refitting. The linter flagged it and I changed both to derived state.
- `refresh()` on the polling hook bumped a counter the effect didn't depend on, so it did nothing. Its test caught that.
- React's `onWheel` is passive, so the page scrolled while zooming. I moved to a native non-passive listener.
- It suggested drawing the markers inside the flipped floorplan group. I didn't, because the text comes out mirrored and the markers grow with zoom.
- In dev, React StrictMode's throwaway first mount aborted the shared `sensors.json` load for the real mount, and the status got stuck on "Connecting". I untied the shared load from any single caller's abort signal, with a test that failed first.
- A review pass over the finished version led to four more fixes: per-sensor staleness, timestamps going backwards on wrap-around, the refresh button staying disabled after a pause, and no way to move the camera from outside the viewer.

## Scope cuts

- No layer toggles, minimap or touch pinch-zoom.
- No INSERT or polyline bulge support. This file uses neither.
- No reading history. The UI only shows the latest value.
- No real backend, just the interface and the mock.
- Plain styling, since the brief put interaction quality first.

## What I'd do next

1. Warning and critical thresholds that change the marker's shape as well as its colour, with a count in the status bar.
2. A small sparkline in the detail card, built from readings the app has already polled.
3. A point-in-polygon check to work out which zone each sensor is in, and per-zone averages.
4. A real `FetchSensorApi` with ETags so unchanged polls are cheap, and possibly WebSocket push behind the same interface.
5. Layer toggles and INSERT/bulge support, tested against a messier DXF.
6. Touch gestures, and limits so the drawing can't be panned completely off screen.
