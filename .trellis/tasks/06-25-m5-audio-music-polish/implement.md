# M5 Audio and Music Polish — Implementation Plan

## Validation Commands

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
- `npm run dev` for manual audio checks

## Step 1 — Load Context

- Read this child task's `prd.md`, `design.md`, and `implement.md`.
- Read parent task `.trellis/tasks/06-25-m5-av-polish/prd.md`.
- Read specs:
  - `.trellis/spec/audio/audio-guidelines.md`
  - `.trellis/spec/project/directory-structure.md`
  - `.trellis/spec/project/determinism-and-testing.md`
  - `.trellis/spec/project/error-handling-and-perf.md`
- Inspect:
  - `meridian/src/audio/audio.ts`
  - `meridian/src/main.ts`
  - `meridian/src/game/journey.ts`
  - `meridian/src/game/segment.ts`
  - `meridian/src/game/element.ts`
  - `.gitignore`

## Step 2 — Add Audio Cue Contract

- Add `src/audio/cues.ts` or equivalent.
- Define `AudioFrame` and `AudioCue` with strict TypeScript unions.
- Add a presentation-only cue adapter that compares previous/current input and
  journey state.
- Keep the adapter out of `engine/`, `game/`, and `dev/`.
- Validate: `npm run typecheck`, `npm run check:determinism`.

## Step 3 — Update Main Audio Wiring

- Replace `audio.update(journey.active.sun.value)` with `audio.update(frame)`.
- Keep first-key `audio.unlock()` behavior working.
- Keep changes narrow so the title/UI child can later add start-state gating.
- Validate: typecheck and build.

## Step 4 — Rework Audio Engine

- Update `AudioEngine` to consume `AudioFrame`.
- Preserve low-pass + reverb routing.
- Add music/default-bed source and graceful no-op/fallback behavior before
  unlock or if loading fails.
- Add procedural SFX helpers and cue dispatch.
- Add rate limiting/coalescing.
- Validate: typecheck, build, manual audio check.

## Step 5 — Default Asset and Docs

- Add default redistributable audio under `meridian/public/music/`, preferably a
  generated original ambient loop if no external CC0 proof is available.
- Update `.gitignore` to whitelist the default and ignore local user tracks.
- Update README/NOTICE license notes.
- Validate with `git status` and browser playback with only the default asset.

## Step 6 — Final Gate

- Run full automated gate:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`
- Manual browser check:
  - first key unlock
  - filter response to sun
  - jump/sun/element/choice/fusion/ending cues
  - no obvious audio spam or clipping

## Risk Files

- `meridian/src/audio/audio.ts`
- `meridian/src/audio/cues.ts`
- `meridian/src/main.ts`
- `meridian/public/music/*`
- `.gitignore`
- `README.md` / `meridian/README.md` if added or updated

## Handoff Notes

- Active task prompt for a sub-agent should begin with:
  `Active task: .trellis/tasks/06-25-m5-audio-music-polish`
- If a sub-agent changes `main.ts`, it should describe the exact merge surface
  for the later title/UI child.
