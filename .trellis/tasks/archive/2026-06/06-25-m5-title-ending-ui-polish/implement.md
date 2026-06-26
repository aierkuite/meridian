# M5 Title and Ending UI Polish — Implementation Plan

## Validation Commands

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
- `npm run dev` for manual UI checks

## Step 1 — Load Context

- Read this child task's `prd.md`, `design.md`, and `implement.md`.
- Read parent task `.trellis/tasks/06-25-m5-av-polish/prd.md`.
- Read specs:
  - `.trellis/spec/ui/ui-guidelines.md`
  - `.trellis/spec/project/directory-structure.md`
  - `.trellis/spec/project/determinism-and-testing.md`
- Inspect:
  - `meridian/src/main.ts`
  - `meridian/src/ui/hud.ts`
  - `meridian/src/game/journey.ts`
  - `meridian/src/game/narration.ts`
  - `meridian/src/data/story.ts`
  - `meridian/src/audio/audio.ts`

## Step 2 — Add Title Drawing

- Add `drawTitleScreen` in `ui/hud.ts` or a new UI module.
- Keep text English, concise, and readable.
- Do not add level select, settings, or explanation-heavy copy.
- Validate: typecheck and build.

## Step 3 — Add App Phase in Main

- Add local `AppPhase` state in `main.ts`.
- Prevent `updateJourney` from running during title phase.
- Detect the start key edge and switch to playing.
- Integrate with the audio unlock path established by the audio child.
- Validate: typecheck, determinism, replay.

## Step 4 — Polish Ending Screens

- Improve `drawEndingScreen` visual treatment per ending while preserving
  `endingTextFor(ending)`.
- Keep `R` restart prompt and existing journey restart behavior.
- Do not call `resolveEnding` in UI.
- Validate all four endings visually through test states or replay-supported
  paths.

## Step 5 — Manual UI Pass

- Check:
  - title shows on initial load
  - start begins gameplay
  - audio unlock still works
  - pause overlay still works
  - `R` during play resets current segment
  - `R` on ending restarts full journey
  - all ending screens are readable and distinct

## Step 6 — Final Gate

- Run:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`

## Risk Files

- `meridian/src/main.ts`
- `meridian/src/ui/hud.ts`
- `meridian/src/ui/title.ts` if added
- `meridian/src/audio/audio.ts` only if audio unlock integration requires it

## Handoff Notes

- Active task prompt for a sub-agent should begin with:
  `Active task: .trellis/tasks/06-25-m5-title-ending-ui-polish`
- Before editing `main.ts`, inspect the audio child's final interface and avoid
  replacing it wholesale.
