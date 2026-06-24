# M3 Codebase Baseline

Date: 2026-06-22

## Current Runtime Shape

- App root: `meridian/`
- Stack: TypeScript + Vite + Canvas 2D
- Current journey entry: `meridian/src/main.ts` imports `m1Slice` directly and calls
  `createJourney([m1Slice])`
- Segment runtime: `meridian/src/game/segment.ts`
- Current sun model: `meridian/src/game/sun.ts`
- Current element contract: `meridian/src/game/element.ts`
- Existing element implementation: `meridian/src/game/elements/ice.ts`
- Existing replay harness: `meridian/src/dev/replay.ts`
- Current fixture: `meridian/src/data/segments/m1-slice.ts`

## Observed M2 Baseline

- `SegmentData.solutionPaths` is mandatory and compact:
  `SolutionPath -> SolutionStep[] -> SolutionInput`.
- `updateSegment` mutates the current sun, gathers solid terrain/elements, updates
  both avatars, handles death reset, then checks exits.
- `gatherSolids` already queries `e.solidAt(s)` for each element.
- `renderScene` already reads `e.visualAt(s).alpha`, but currently draws every
  element with the ice fill color.
- `debugOverlay.ts` already renders active segment id, `s`, player state, camera
  state, boxes, and currently-solid element boxes.
- `data/index.ts` and `game/index.ts` remain placeholder exports.

## Important Existing Behavior

- Ice is intentionally per-world inverted per `.trellis/spec/engine/elements.md`:
  - day ice solid when `s < 0.5`
  - night ice solid when `s > 0.5`
  - exactly `0.5` is the meridian gap where neither side is solid
- This differs from the earliest `plan.md` wording for bottom ice and should be
  preserved unless implementation surfaces a defect.

## M3 Implementation Implications

- Adding `vine`, `door`, and `mote` should not require physics changes if they are
  represented as AABB solids/barriers.
- Mote requires new placement band data.
- Drift belongs in `sun.ts` and is passed from segment data through `updateSegment`.
- Runtime and replay should consume the same ordered segment list exported by
  `data/index.ts` to avoid fixture drift.
- Renderer needs kind/world-aware drawing or visual metadata so new elements are
  not all ice-colored.

## Validation Baseline

Expected M3 gate from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
