# M4 — Implementation Plan

> Active task: `.trellis/tasks/06-24-m4-content-mvp`. The current Codex session
> is inline, but the user requested sub-agent-oriented handoff artifacts, so
> `implement.jsonl` and `check.jsonl` are curated.

## Validation Commands

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
- `npm run dev` for manual browser playtest

## Conventions

- Simulation (`engine/` + `game/`) stays deterministic and render-free.
- Presentation (`render/` + `ui` + `audio`) reads simulation only.
- Segment/story data is readonly and lives under `src/data/`.
- No `any`; no non-null `!` to silence TypeScript.
- Code comments must be Chinese; new method/function comments document purpose,
  parameters, and return value.
- Player-facing text is English.
- No stretch mechanics before MVP freeze.

## Step 1 — Load Context

- Read `prd.md`, `design.md`, and this file.
- Read every file listed in `implement.jsonl`.
- Inspect current source before editing, especially:
  - `meridian/src/game/segment.ts`
  - `meridian/src/game/journey.ts`
  - `meridian/src/game/sun.ts`
  - `meridian/src/dev/replay.ts`
  - `meridian/src/data/index.ts`
  - current segment fixtures under `meridian/src/data/segments/`
- Before verification, read every file listed in `check.jsonl`.

## Step 2 — Add Consequence and Ending Core

- Add `meridian/src/game/consequence.ts`.
- Add `meridian/src/game/ending.ts`.
- Define closed ending ids: `one-sky`, `vow`, `afterglow`, `long-dark`.
- Keep consequence writes behind explicit helper functions.
- Validate: `npm run typecheck`, `npm run check:determinism`.

## Step 3 — Extend Segment Data for Choices and Finale

- Update `SegmentData` with optional `choicePoint` and optional `finale`.
- Keep fields readonly.
- Add choice/finale types near their owner or in small modules if reuse demands it.
- Ensure no existing fixture breaks.
- Validate: `npm run typecheck`, `npm run check:replay`.

## Step 4 — Wire Consequence Through Journey

- Add `consequence` and optional `resolvedEnding` to `JourneyState`.
- Pass consequence into segment updates where choice points can spend light.
- Ensure `resetSegment` does not clear consequence.
- Stop looping at the end of the formal journey; enter an ending state.
- Validate: typecheck, determinism, replay.

## Step 5 — Implement Choice-Point Runtime

- Detect overlap with explicit shortcut zones.
- Spend cost once per choice id.
- Mark whole vs shortcut route deterministically for replay assertions.
- Do not write consequence from death, reset, or normal exits.
- Validate with at least one temporary or formal choice segment before adding all content.

## Step 6 — Add Narration and Hint Systems

- Add `meridian/src/data/story.ts` for English text tables.
- Add `meridian/src/game/narration.ts` for selection logic.
- Include opening, beat lines, choice prompts, adaptive lines, hint ladders, and endings.
- Use deterministic counters for stuck/hint progression.
- Validate: typecheck and manual text review.

## Step 7 — Author Formal M4 Segments

- Add formal segment files under `meridian/src/data/segments/`:
  - `prologue-splitting.ts`
  - `beat-1-day-ice.ts`
  - `beat-2-night-bridge.ts`
  - `interlude-ice-echo.ts`
  - `beat-3-vine-fungi.ts`
  - `beat-4-doors-choice.ts`
  - `beat-5-balance-mote.ts`
  - `beat-6-drift-choice.ts`
  - `beat-7-master-choice.ts`
  - `reunion-meridian.ts`
- Each file needs passing solution paths.
- Choice segments need both `whole` and `shortcut` paths.
- Update `data/index.ts` to export the formal journey in order.
- Validate frequently with `npm run check:replay`.

## Step 8 — Extend Replay Checks

- Keep existing per-path win checks.
- Add branch coverage checks for segments with `choicePoint`.
- Add consequence assertions for whole vs shortcut paths.
- Add ending reachability checks so all four ending ids are observed.
- Validate: `npm run check:replay`, `npm run check:determinism`.

## Step 9 — Add Presentation for M4 State

- Update renderer to dim Sol/Luna cores based on consequence.
- Update UI/HUD to show narration, hints, finale progress, and ending screens.
- Keep UI/render read-only with respect to simulation.
- Do not add per-frame `shadowBlur`.
- Validate: typecheck, build, manual browser pass.

## Step 10 — Manual Browser Pass

- Run `npm run dev`.
- Check:
  - Full journey order is playable.
  - `R` resets the current segment without changing consequence.
  - Choice shortcut visibly dims the intended core.
  - Whole route leaves consequence unchanged.
  - Hints appear only after a stuck interval.
  - Reunion requires both marks and sun window.
  - All four ending screens can be reached via test states or authored paths.

## Step 11 — Final Quality Gate

- Run:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`
- Search touched render/UI files for `shadowBlur` and skip affordances.
- Review diff for accidental stretch scope.
- If implementation surfaces durable new contracts, update `.trellis/spec/`
  during Phase 3.3 before committing.

## Risk Files

- `meridian/src/game/journey.ts`
- `meridian/src/game/segment.ts`
- `meridian/src/game/consequence.ts`
- `meridian/src/game/ending.ts`
- `meridian/src/game/narration.ts`
- `meridian/src/data/index.ts`
- `meridian/src/data/story.ts`
- `meridian/src/data/segments/*.ts`
- `meridian/src/dev/replay.ts`
- `meridian/scripts/check-replay.mjs`
- `meridian/src/render/renderer.ts`
- `meridian/src/ui/hud.ts`
- `meridian/src/main.ts`

## Rollback Points

- Consequence/ending core.
- Segment schema additions.
- Choice-point runtime.
- Formal content export switch.
- Replay branch/ending checks.
- Presentation updates for narration, hints, dimming, and endings.
