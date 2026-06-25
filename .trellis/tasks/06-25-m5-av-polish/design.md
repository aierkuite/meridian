# M5 Parent — Coordination Design

> Scope: parent-level coordination only. Implementation belongs to child tasks.

## 1. Task Tree

`06-25-m5-av-polish` is the parent. It should normally remain a planning and
final integration reference rather than the active implementation task.

Children:

1. `06-25-m5-audio-music-polish`
2. `06-25-m5-particles-render-polish`
3. `06-25-m5-title-ending-ui-polish`
4. `06-25-m5-integration-qa`

## 2. Shared Boundary Contract

Simulation stays deterministic and render-free. The child tasks may touch
presentation and app-shell code, but not gameplay decision ownership:

- Audio reads `JourneyState`, `SegmentState`, input edges, and previous
  presentation snapshots.
- Render reads `SegmentState`, camera, consequence, and optional presentation
  mood.
- UI reads `JourneyState` and routes only player intent such as start, pause,
  and reset.
- Only `game/journey.ts` owns ending resolution. Audio/UI/render read
  `journey.resolvedEnding`; they do not call `resolveEnding` for presentation.

## 3. Dependency Order

1. Audio first: establishes the presentation cue adapter and `AudioEngine`
   interface. UI title work must preserve this unlock/update flow.
2. Render second or parallel after audio planning: particle/render work should
   avoid owning title-state changes.
3. UI third: integrates title/start and ending presentation after audio and
   render hooks are known.
4. Integration QA last: verifies merged behavior and docs/license hygiene.

If multiple sub-agents work in parallel, they must keep `main.ts` changes narrow
and document expected merge points in their child `implement.md` files.

## 4. Shared Validation

Every child that changes TypeScript should run at least:

- `npm run typecheck`
- `npm run build`

Any child touching simulation-adjacent imports or journey update wiring should
also run:

- `npm run check:determinism`
- `npm run check:replay`

The integration child runs the full gate and manual browser pass.

## 5. Rollback Shape

- Audio can fall back to the existing minimal bed if SFX/music integration
  regresses.
- Render can disable particle layers while keeping existing M4 glow/dimming.
- UI can fall back to immediate start and minimal M4 ending screens.
- Integration can defer nonessential polish while preserving M5's no-regression
  automated gates.
