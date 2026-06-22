# M2 — Core Hardening

## Goal

Harden the M1 vertical slice into a deterministic, data-driven gameplay spine that
can safely carry the rest of Meridian's MVP content. M2 delivers the infrastructure
called out in `plan.md` §11: physics feel and edge-case hardening, seamless segment
advance, segment loading with mandatory `solutionPaths`, an automated solvability
replay harness, reset/checkpoint behavior, and a debug overlay.

The user value is confidence: after M2, adding M3 elements and M4 content should not
depend on manual hope that a dual-world segment is still beatable.

## Confirmed Facts

- M0/M1 are complete and archived; the current branch is `main` and the working tree
  was clean when this task was created.
- The app lives under `meridian/` and uses TypeScript + Vite + vanilla Canvas 2D.
- M1 already ships one playable segment (`m1-slice`) with dual avatars, inverted
  gravity, holding sun dial, ice elements, reset, pause, basic renderer, audio, build,
  and determinism guard.
- Current `camera.ts` is still a placeholder, `solutionPaths` are optional and absent
  from `m1-slice`, and the win flow still uses an M1-style win card + reset loop.
- Project specs define the simulation/presentation boundary: `engine/` + `game/`
  stay deterministic and render-free; `render/`, `audio/`, and `ui/` only read sim
  state and send player intent.
- `plan.md` places new elements, drift zones, consequences, endings, narration, and
  full content authoring in later milestones; M2 must not pull them forward.

## Requirements

- **R1. Deterministic physics hardening.** Improve the AABB platformer feel and edge
  behavior without changing the locked mirror-sync model. Coyote-time and
  jump-buffering must be deterministic fixed-step state, not wall-clock timing.
- **R2. Segment chain runtime.** Replace the one-off M1 slice loop with a small
  data-driven journey runtime that can load a linear segment list, track the active
  segment, reset to the active checkpoint, and advance when both avatars reach exits.
- **R3. Seamless camera advance.** Implement a deterministic camera/transition path
  between segments with no level-select and no hard "level complete" screen. The M1 win
  card should no longer be the main progression affordance.
- **R4. Mandatory `solutionPaths`.** Settle the M2 segment data schema so every segment
  has at least one replayable solution path; future choice-point segments can carry one
  path per branch.
- **R5. Replay solvability harness.** Add an automated harness that replays every
  segment's `solutionPaths` through the same fixed-step update path used by gameplay
  and fails if a path does not reach both exits or hits a reset/softlock condition.
- **R6. Debug overlay.** Add a dev-only overlay, off by default, showing at minimum
  sun value, active segment id/index, player positions/grounded state, collision boxes,
  exits, world bounds, and camera state.
- **R7. Validation scripts.** Add the replay harness to package scripts so the M2 gate
  is `typecheck`, `check:determinism`, `check:replay`, and `build`.
- **R8. Preserve M1 playability.** The current ice puzzle remains playable and becomes
  the first replay-covered segment. Manual reset (`R`) and pause (`Esc`) still work.

## Acceptance Criteria

- [ ] AC1. `m1-slice` has a committed `solutionPath` that passes the replay harness.
- [ ] AC2. `npm run check:replay` runs headlessly from `meridian/` and fails on an
  unsolved path, path timeout, unexpected reset, or missing required path.
- [ ] AC3. `npm run typecheck`, `npm run check:determinism`, `npm run check:replay`,
  and `npm run build` are all green.
- [ ] AC4. Manual play in the browser still solves the M1 ice puzzle, and `R` resets to
  the current active segment checkpoint without changing sun/physics invariants outside
  the reset contract.
- [ ] AC5. Coyote-time and jump-buffering are visible in play, deterministic in replay,
  and do not give either avatar independent control.
- [ ] AC6. Reaching both exits advances through the segment chain via camera motion or a
  seamless transition, not the M1 win card.
- [ ] AC7. The debug overlay toggles only in development and does not mutate simulation
  state.
- [ ] AC8. Presentation can be disabled conceptually: the replay harness imports sim and
  data only, not renderer/audio/UI.

## Out of Scope

- New M3 gameplay elements: vine/fungi, door/gate, balance mote, sun drift.
- M4 systems: consequence state, choice-point cost writing, adaptive narration, endings,
  reunion finale.
- M5 polish: particles, procedural SFX set, title/ending screens, CC0 default music.
- Full MVP content authoring beyond the minimum segment-chain fixture needed to validate
  M2 infrastructure.

## Open Questions

None blocking. Repository evidence and `plan.md` fix M2's scope.
