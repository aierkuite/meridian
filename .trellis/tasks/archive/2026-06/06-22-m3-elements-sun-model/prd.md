# M3 — Elements and Sun Model

## Goal

Implement the `plan.md` M3 milestone on top of the completed M2 spine: add the
remaining MVP sun-driven element vocabulary and the late-game sun drift model, then
prove the new behavior with deterministic replay-covered segment fixtures.

The user value is mechanical breadth: after M3, content authors can build Beat 3
through Beat 6 style puzzles using vine/fungi, door/gate, balance mote window
platforms, and drift-zone hold-steady sun control without changing the engine again.

## Confirmed Facts

- Current task was explicitly requested as M3, with Trellis Phase 1 completed and
  the task moved to `in_progress`.
- Codex is operating inline, but the user will later use Claude Code sub-agents;
  therefore `implement.jsonl` and `check.jsonl` must be curated as handoff context.
- M0, M1, and M2 are archived. The current `main` branch was clean before this task
  was created.
- The app lives under `meridian/` and uses TypeScript + Vite + vanilla Canvas 2D.
- M2 delivered `SegmentData.solutionPaths`, `dev/replay.ts`, `check:replay`,
  `game/journey.ts`, deterministic camera state, and a dev-only debug overlay.
- Current element runtime supports only `kind: "ice"`, with `solidAt(s)` and
  `visualAt(s)` read by physics and renderer respectively.
- Current `sun.ts` supports only a holding dial: player input changes `s`, and `s`
  holds when input is released.
- `.trellis/spec/engine/elements.md` supersedes the early `plan.md` ice wording:
  ice is per-world inverted and the existing behavior is intentional
  (`day` solid below `0.5`, `night` solid above `0.5`).
- Current renderer colors every element as ice; M3 must introduce visual
  differentiation for the new element kinds without moving behavior into render.
- Current `data/index.ts` and `game/index.ts` are still placeholder exports.

## Requirements

- **R1. Element union expansion.** Extend the element system from `"ice"` to the MVP
  closed set `"ice" | "vine" | "door" | "mote"` with exhaustive TypeScript
  dispatch.
- **R2. Vine/fungi pair.** Implement a sun-driven solid platform pair: day vine is
  solid/visible when `s` is high; night fungi are solid/visible when `s` is low.
  Do not add a new climb input in M3; represent the pair as collidable platforms
  compatible with current AABB physics.
- **R3. Light-door/dark-gate pair.** Implement barriers that are solid when closed:
  day light-door opens at high `s`, night dark-gate opens at low `s`.
- **R4. Balance mote.** Implement a window-band element solid only inside a configured
  `s` band, mirrored for both worlds. Invalid bands must fail fast in dev/runtime
  construction rather than silently producing impossible geometry.
- **R5. Sun drift zones.** Extend the sun model so segment data can opt into a slow
  drift toward a pole while player input still counters it. Segments without drift
  must keep the M1/M2 holding behavior exactly.
- **R6. Segment data contract.** Add typed segment fields needed by M3 (`initialSun`
  and/or `drift`, plus element band data) while preserving mandatory
  `solutionPaths`.
- **R7. Replay-covered fixtures.** Add minimal M3 segment fixture(s) so every new
  element kind and at least one drift profile are covered by `npm run check:replay`.
- **R8. Presentation support.** Render the new elements with distinct readable
  silhouette/glow-compatible visuals; renderer remains presentation-only and reads
  `ElementVisual` / element metadata without deciding gameplay.
- **R9. Debug visibility.** Update the dev overlay or debug state display so a
  developer can inspect the active segment's drift profile/state while tuning.
- **R10. Preserve M2 gates.** `typecheck`, `check:determinism`, `check:replay`, and
  `build` must stay green from `meridian/`.

## Acceptance Criteria

- [ ] AC1. `ElementKind` includes `ice`, `vine`, `door`, and `mote`; switches over
  element kinds are exhaustive and strict TypeScript passes.
- [ ] AC2. Vine/fungi, door/gate, and balance mote each have behavior isolated under
  `src/game/elements/` and are consumed through the existing `Element` contract.
- [ ] AC3. Balance mote supports configurable `s` bands and rejects invalid
  `sMin/sMax` data.
- [ ] AC4. `sun.ts` supports both holding and drift profiles; no-drift segments behave
  like M2, and drift segments can be held steady by counter-input.
- [ ] AC5. At least one replay-covered M3 fixture segment exercises all new element
  kinds, and at least one replay-covered path exercises a drift zone.
- [ ] AC6. Existing `m1-slice/main-hold-then-cross` still passes replay without
  changing the locked mirror-sync model.
- [ ] AC7. New elements render distinctly enough for manual debugging, with no
  per-frame `shadowBlur` and no simulation mutation from render/UI/dev overlay.
- [ ] AC8. Debug overlay exposes active drift configuration/state in development.
- [ ] AC9. From `meridian/`, these commands pass: `npm run typecheck`,
  `npm run check:determinism`, `npm run check:replay`, `npm run build`.

## Out of Scope

- M4 consequence state, choice-point light costs, adaptive narration, endings, and
  reunion finale.
- Full content authoring for Prologue + 7 beats; M3 only adds minimal fixtures needed
  to validate mechanics.
- New climb controls or ladder physics. M3 vine/fungi use current collidable platform
  semantics.
- Stretch elements: shadow-bridge, hazards, predators, offering verb, convergent
  playable branches.
- Audio/SFX polish beyond whatever remains necessary to keep existing sun-filter audio
  working.

## Open Questions

None blocking. `plan.md`, existing M2 artifacts, and `.trellis/spec/` define M3 scope.
