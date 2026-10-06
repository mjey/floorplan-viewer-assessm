# Working notes (feeds the README, not a deliverable)

Running log of decisions, AI-assist usage, rejected ideas and scope cuts. Folded into the README at the end.

## DXF findings (2026-10-05)

- Header `$INSUNITS = 4` (millimetres) but geometry extents are x 3.8..14.1, y -3.5..4.7. That is metres. `sensors.json` is in mm (x 5200..12800). Drawing must be scaled x1000 on load.
- DXF is Y-up; screen is Y-down. Flip once in the transform.
- ENTITIES: 849 LINE + 102 ARC on layer `0`, 1 closed LWPOLYLINE on layer `h01_z01` (hall boundary rectangle, all 6 sensors inside it). Layer `h01_r01` defined but unused.
- BLOCKS section has ~3.5k entities but zero INSERT references. Orphaned; ignored.
- 96 arcs have radius 0.005 (5 mm detail), 6 arcs radius 0.9 (door swings). Non-scaling stroke keeps them visible.
- No TEXT/MTEXT/dimensions.

## Decisions

- Vite + React 19 + TS strict + Vitest/RTL. No state lib, no CSS framework.
- `dxf-parser` for raw parse + own normaliser. Rejected `dxf-viewer` (three.js, owns camera, hard to overlay accurately).
- Hand-rolled pan/zoom with pure `zoomAt`. Rejected d3-zoom (hides the maths being assessed).
- Hand-rolled polling hook. Rejected TanStack Query (hides the update cycle being assessed).
- Floorplan in a transformed SVG group; sensors in screen-space layer via `modelToScreen`. Keeps markers constant size and makes the transform testable.

## AI assistant usage

- Claude Code used to inspect the DXF structure (awk over sections), scaffold, and pair on implementation step by step.
- (append as we go)

## Rejected / reworked

- (append as we go)

## Scope cuts

- No layer toggles, minimap, touch pinch, per-sensor history chart, real transport.
