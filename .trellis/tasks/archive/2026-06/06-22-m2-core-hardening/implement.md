# M2 — Implementation Plan

> Active task: `.trellis/tasks/06-22-m2-core-hardening`. Work proceeds inline in Codex
> after `task.py start`. All commands run from `meridian/`.

## Validation Commands

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
- `npm run dev` for manual browser playtest

`check:replay` is added during this task and becomes the primary M2 gate.

## Conventions

- Simulation (`engine/` + `game/`) stays deterministic and render-free.
- Presentation (`render/` + `ui/` + `audio`) reads sim state only.
- No `any`; no non-null `!` to silence TypeScript.
- Fixed-step feel windows use frame counters, never wall-clock timestamps.
- Code comments must be Chinese and method/function comments must document purpose,
  parameters, and return values.
- Do not implement M3/M4 scope while hardening M2.

---

## Step 1 — Load pre-dev specs

- Load `trellis-before-dev`.
- Read relevant detailed specs before edits:
  - `project/determinism-and-testing.md`
  - `project/directory-structure.md`
  - `project/typescript-conventions.md`
  - `engine/core-loop-and-input.md`
  - `engine/physics-and-math.md`
  - `engine/segments-flow-and-endings.md`
  - `data/segment-data-format.md`
  - `ui/ui-guidelines.md`
- Validate that no new task-scope question has appeared.

## Step 2 — Settle `SolutionPath` schema

- Add `SolutionInput`, `SolutionStep`, and `SolutionPath` types near the segment data
  owner.
- Make `SegmentData.solutionPaths` mandatory.
- Update `m1-slice` to use the schema.
- Add a first authored path for `m1-slice`.
- Validate: `npm run typecheck`, `npm run check:determinism`.

## Step 3 — Add replay harness

- Add `src/dev/replay.ts` with pure simulation replay helpers and `runReplaySuite()`.
- Add `scripts/check-replay.mjs` using Vite SSR to load the TS replay module.
- Add `check:replay` to `package.json`.
- Validate the M1 path passes and intentional local path failures fail while developing.
- Validate: `npm run typecheck`, `npm run check:determinism`, `npm run check:replay`.

## Step 4 — Harden player feel

- Add deterministic coyote-time and jump-buffer frame counters.
- Keep one input vector and the same jump edge for both avatars.
- Reset all feel counters on checkpoint reset.
- Tune conservatively for puzzle pacing.
- Validate: typecheck, determinism, replay.
- Manual check: jump forgiveness works for Sol and Luna without independent control.

## Step 5 — Harden physics/reset edge cases

- Review and fix collision edge cases exposed by replay/manual testing:
  - underside grounding for Luna
  - side collision stickiness
  - reset velocity/ground/counter cleanup
  - thin-platform stability at current speeds
- Keep changes localized to `physics.ts`, `player.ts`, and reset helpers where possible.
- Validate: typecheck, determinism, replay.

## Step 6 — Implement journey runtime

- Add `game/journey.ts` for active segment index, active segment state, reset, and
  progression.
- Move win-progress handling out of `main.ts` into the journey layer.
- Keep `SegmentState` focused on one bounded segment.
- Validate: typecheck, determinism, replay.

## Step 7 — Implement deterministic camera transition

- Replace `engine/camera.ts` placeholder with `CameraState` and fixed-frame transition
  helpers.
- Wire renderer/main so camera offset affects drawing, not gameplay collision data.
- Add a minimal second segment or fixture chain only if needed to prove advance.
- Validate: typecheck, determinism, replay.
- Manual check: reaching both exits advances seamlessly instead of showing the M1 win card.

## Step 8 — Add debug overlay

- Add `src/dev/debugOverlay.ts`.
- Track a debug toggle key in input or main wiring.
- Draw diagnostic text/boxes only in dev and only when enabled.
- Ensure overlay reads state only and is absent from replay.
- Validate: typecheck, determinism, replay, build.

## Step 9 — Main integration and browser pass

- Keep `main.ts` as wiring:
  - input sampling
  - pause/restart/debug edge handling
  - journey update
  - render/audio update
- Remove or demote M1 win card from progression.
- Manual `npm run dev` checks:
  - M1 ice puzzle still solvable
  - `R` resets active checkpoint
  - `Esc` pauses
  - debug overlay toggles in dev
  - transition/camera advance works

## Step 10 — Final quality gate

- Run:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`
- Search render hot path for `shadowBlur`; it should remain absent.
- Review diff for scope creep into M3/M4.
- If implementation taught a durable convention, update specs in Phase 3.3 before commit.

## Risk Files

- `meridian/src/game/segment.ts`
- `meridian/src/game/player.ts`
- `meridian/src/engine/physics.ts`
- `meridian/src/engine/camera.ts`
- `meridian/src/main.ts`
- `meridian/src/data/segments/m1-slice.ts`

## Rollback Points

- Schema + replay harness can be reverted independently before runtime integration.
- Player feel and physics changes should be committed separately from journey/camera.
- Debug overlay is isolated and can be dropped without touching gameplay.
