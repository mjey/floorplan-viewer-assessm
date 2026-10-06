# Working notes (feeds the README, not a deliverable)

Running log of decisions, AI-assist usage, rejected ideas and scope cuts. Folded into the README at the end.

## DXF findings (2026-10-05)

- Header `$INSUNITS = 4` (millimetres) but geometry extents are x 3.8..14.1, y -3.5..4.7. That is metres. `sensors.json` is in mm (x 5200..12800). Drawing must be scaled x1000 on load.
- DXF is Y-up; screen is Y-down. Flip once in the transform.
- ENTITIES: 849 LINE + 102 ARC on layer `0`, 1 closed LWPOLYLINE on layer `h01_z01` (hall boundary rectangle, all 6 sensors inside it). Layer `h01_r01` defined but unused.
- BLOCKS section has ~3.5k entities but zero INSERT references. Orphaned; ignored.
- 96 arcs have radius 0.005 (5 mm detail), 6 arcs radius 0.9 (door swings). Non-scaling stroke keeps them visible.
- No TEXT/MTEXT/dimensions.
- Aisle C sensors (x = 12 800) sit OUTSIDE the `h01_z01` zone polyline (which ends at x ≈ 12 245) but inside the overall drawing. The zone is a sub-area, not the hall boundary. Found via a failing test in step 3.

## Decisions

- Vite + React 19 + TS strict + Vitest/RTL. No state lib, no CSS framework.
- `dxf-parser` for raw parse + own normaliser. Rejected `dxf-viewer` (three.js, owns camera, hard to overlay accurately).
- Hand-rolled pan/zoom with pure `zoomAt`. Rejected d3-zoom (hides the maths being assessed).
- Hand-rolled polling hook. Rejected TanStack Query (hides the update cycle being assessed).
- Floorplan in a transformed SVG group; sensors in screen-space layer via `modelToScreen`. Keeps markers constant size and makes the transform testable.

## AI assistant usage

- Claude Code used to inspect the DXF structure (awk over sections), scaffold, and pair on implementation step by step.
- Step 2 (geometry): drafted the pure viewport/bounds functions and their tests with Claude; reviewed the zoom-about-cursor derivation by hand (tx = anchor.x - m.x*s, ty = anchor.y + m.y*s because of the Y flip).
- Step 3 (DXF): Claude probed dxf-parser's output (radians for arcs, `shape` flag for closed polylines, numeric `$INSUNITS`) before writing the normaliser, and drafted the unit heuristic + SVG arc conversion. The sweep-flag reasoning (CCW in model space stays sweep=1 inside the Y-flipped group) was checked by hand.
- Step 4 (pan/zoom): Claude drafted the gesture hook, viewport-controls hook, context, toolbar and scale bar plus the interaction tests. The "capture the pointer only after the drag threshold" detail was chosen deliberately so clicks still reach overlay markers (pointer capture would otherwise redirect the click to the viewer).
- Step 5 (sensors): Claude drafted the `SensorApi` interface, the hand-written JSON validator, the cursor-based mock with injectable latency/failure/random, and the polling reducer hook plus fake-timer tests. The "setTimeout chain, not setInterval" and "keep last snapshot, flag stale" behaviours were deliberate design choices made before the code was written.
- Step 7 (status/loading/error): done before step 6 at the user's request. Claude drafted the StatusBar, the generic `useAsyncLoad` (extracted from `useDrawing` so the sensor list could reuse it), visibility-based pause, and the App integration tests with an injected scripted `SensorApi`.
- Step 6 (sensor overlay): Claude drafted `SensorLayer`/`SensorMarker`/`SensorTooltip`/`SensorDetail`, the temperature colour scale and the alignment tests. The key test ("markers stay exactly where the floorplan transform puts them after a pan and a zoom") was specified before the components were written.
- (append as we go)

## Rejected / reworked

- Step 3: first drafts of `useDrawing` and `FloorplanViewer` called `setState` synchronously inside `useEffect` (set loading / fit on resize). Lint flagged it; reworked both to _derive_ state instead: the load state is derived from a settled result tagged with (url, attempt), and the viewport is derived from `fitBounds` until the user interacts. Fewer renders, no effect-reset dance.
- Step 3: a test asserted all sensors lie inside the zone polyline. It failed because aisle C is outside the zone. Kept the finding, fixed the assumption.
- Step 4: React's synthetic `onWheel` is registered passive, so `preventDefault()` is ignored and the page scrolls while zooming. Reworked to a native non-passive listener attached in an effect.
- Step 4: a `useCallback` that read `ref.current` tripped the React Compiler memoisation lint. Replaced with a plain helper that takes the element from the event instead of the ref.
- Step 4: split `ViewportContext` (context + hook) from `ViewportProvider` (component) so Fast Refresh works; moved the scale-bar maths to its own module for the same reason, which also made it trivially testable.
- Step 5: the first `refresh()` implementation bumped a counter the polling effect did not depend on, so it did nothing. Caught by the `refresh() polls immediately` test. Fixed by making the counter an effect dependency, which also made a separate "generation" ref redundant (the AbortController already guards late responses).
- Step 5: considered TanStack Query for polling. Rejected: it would hide exactly the update cycle, stale handling and overlap-avoidance the brief wants to see, and adds a dependency for one hook.
- Step 5: mock feed wraps around when a series ends (only 30 s of data per sensor); documented in the mock's doc comment and the README.
- Step 7: `App` originally created the mock API internally. Moved construction to `main.tsx` (composition root) and injected `SensorApi` as a prop: App is now testable with a scripted API and knows nothing about the transport (dependency inversion).
- Step 7: `useDrawing` and the new `useSensors` were near-duplicates; extracted `useAsyncLoad` so both are one-liners.
- Step 6: considered rendering markers inside the Y-flipped floorplan group (zero extra maths). Rejected: text would render mirrored and marker size would scale with zoom. Screen-space overlay via `useViewport()` + `modelToScreen` instead; the alignment is proven by test rather than by construction.
- Step 6: hover tooltip is SVG (inside the same surface, no portal, no z-index games); the pinned detail card is HTML outside the SVG because it holds a `<dl>` and a close button. Different tools for different jobs.
- Step 6: selection state lives in `App`, not in the layer, because the detail card is a sibling of the viewer, not a child of the overlay.

## Scope cuts

- No layer toggles, minimap, touch pinch, per-sensor history chart, real transport.
