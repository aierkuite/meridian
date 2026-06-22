# M1 — Vertical Slice (the proof)

## Goal

Deliver **one playable segment end-to-end** that proves the entire Meridian concept:
dual-world render with a luminous horizon, two avatars (Sol / Luna) driven by
gravity-mirror sync with inverted gravity, a player-held sun dial `s ∈ [0,1]`, one
element (ice ⇄ water) whose solidity is shared by both worlds but whose **placement**
creates opposite needs, win detection + transition, a basic silhouette+glow look, and
a sun-driven procedural audio bed. **Deployable & playable on GitHub Pages.** This is
the de-risk milestone. (Source: `plan.md` §11 M1.)

## Resolved decisions (2026-06-22 brainstorm)

- **D1 — Scope boundary (approved wholesale).** M1 = holding sun dial + ice⇄water
  only; static one-screen camera; minimal AABB (no coyote/jump-buffer); fall-out/reset
  only; basic glow (no particles); sun-driven audio bed; no replay harness
  (forward-compat data shape only); no consequence/endings/narration.
- **D2 — Win flow = Option A.** Both avatars at exits → short transition (fade / glow
  bloom + one placeholder English line, *"And they moved as one."*) → auto-reset to the
  segment start (re-playable loop). Demonstrates win-event + advance-transition
  honestly without a second segment. Formal narration is M4.
- **D3 — Audio = Option A.** Web Audio procedural ambient bed (drone/pad) → sun-driven
  low-pass + reverb mapped to `s` (high = open/bright, low = muffled). No audio asset
  shipped in M1; the filter graph is the reusable deliverable. CC0 default track slots
  in at M5 by swapping the source node. Procedural SFX set is M5.
- **D4 — Puzzle layout (approved).** Top (Sol): continuous floor + an **ice wall**
  blocking the exit (solid at low `s`, melts open at high `s` → Sol wants **high**).
  Bottom (Luna): floor with a **chasm** spanned by an **ice bridge** (solid at low `s`,
  melts at high `s` → Luna wants **low**). Same `solidAt(s) = s < meltThreshold` in both
  worlds (per spec element table); the opposition comes from geometry, not per-world
  inversion. Solution: (1) low `s` → Luna crosses bridge to E₂, Sol waits at wall;
  (2) high `s` → wall melts, Sol reaches E₁, Luna safe at E₂. Mirror-sync works because
  collisions resolve per-avatar (same input can advance one while the other is blocked).

## Requirements

- **R1. Dual-world scene** in a fixed logical world (1280×720, horizon at y=360): Day
  top (gravity +y), Night bottom (gravity −y). Same integrator, per-world `gravitySign`.
- **R2. Two avatars** Sol (top, warm core) & Luna (bottom, cool core); one input
  snapshot drives both every step; horizontal identical; jump mirrored via
  `vel.y = -gravitySign * JUMP_SPEED`. No per-avatar special-casing.
- **R3. Sun dial** `s ∈ [0,1]`, **holding** model: `s += sunDelta * SUN_RATE * DT`,
  clamped in `sun.ts` (single owner). Rendered as an on-screen orb reflecting `s`.
- **R4. Ice element** with `solidAt(s) = s < MELT_THRESHOLD` (same both worlds),
  `visualAt(s)` for render. Placed as a wall (day) and a bridge (night).
- **R5. Segment runtime**: load one hand-wired `readonly SegmentData`; win = both
  avatars overlap their exit zones → win event + transition (D2) → reset; forward-
  compatible shape (slots `solutionPaths`/`drift`/`choicePoint` for M2/M3/M4).
- **R6. Reset**: `R` manual + fall-out-of-bounds / cross-horizon auto-reset to start.
- **R7. Basic silhouette + glow render**: sun-driven gradient sky (warm top / cool
  bottom), silhouette terrain + avatars, pre-rendered offscreen glow sprites + additive
  compositing for cores + horizon seam + sun orb. **No per-frame `shadowBlur`.**
- **R8. Audio**: Web Audio procedural ambient bed → `BiquadFilterNode` (lowpass) +
  `ConvolverNode` (reverb) with cutoff/wet mapped to `s`; unlock on first keypress.
- **R9. Deterministic simulation** (no `Math.random`/`Date.now`/`performance.now`/DOM/
  AudioContext reads in `update()`); `npm run check:determinism` green.
- **R10. Build + deploy**: `tsc --noEmit && vite build` clean; live on GitHub Pages.

## Acceptance Criteria

- [ ] AC1. Pages demo loads → split world (warm top / cool bottom), luminous horizon,
  two glow-core avatars, sun-dial orb.
- [ ] AC2. A/D or ←/→ moves **both** avatars (same input); Space jumps both — Sol up,
  Luna toward screen bottom (mirrored, derived from `gravitySign`).
- [ ] AC3. ↑/↓ raises/lowers the sun; releasing **holds** the value; orb + both worlds'
  ice state respond at the melt threshold.
- [ ] AC4. The ice puzzle is solvable by the 2-phase sequence (D4): low `s` → Luna to
  E₂; high `s` → Sol to E₁. No softlock.
- [ ] AC5. Falling into the horizon/out of bounds, or pressing `R`, resets cleanly.
- [ ] AC6. Both exits reached → win transition (fade + *"And they moved as one."*) →
  resets to a playable state.
- [ ] AC7. Sun-driven filter audibly opens at high `s` / muffles at low `s` (after first
  keypress unlocks audio).
- [ ] AC8. `npm run build` + `npm run check:determinism` green; demo live on Pages;
  renderer disabled leaves sim correct.

## Definition of Done

- `tsc --noEmit` clean; `vite build` clean; `check:determinism` green.
- No nondeterminism in `update()`; no per-frame `shadowBlur`; no per-frame allocation in
  the sim hot path (scratch `Vec2`/`AABB` reused).
- Renderer/audio read sim state only (never mutate); dependency arrow presentation →
  simulation only.
- Played through in-browser (golden path + fall/reset); ~60fps holds.
- Deploy verified live on GitHub Pages.
- Spec layers reconciled where M1 changes the prescribed model (Phase 3.3).

## Out of Scope (later milestones)

- Sun drift / hold-steady; vine⇄fungi, door⇄gate, balance mote (M3).
- Seamless camera scroll; segment loader; `solutionPath`; replay harness; coyote/jump-
  buffer feel; checkpoint plumbing (M2).
- Consequence state, endings, adaptive narration, choice points (M4).
- Procedural SFX set, particle layers, full palette/glow polish, title/ending screens,
  CC0 default track (M5).

## Technical Notes

- M0 delivered loop, input (incl. `sunDelta`), math (`vec2`,`clamp`), canvas/DPR, Pages
  deploy — reuse all.
- `solidAt(s)` polarity is shared across worlds (spec element table); ice opposition is
  geometric (wall vs bridge), keeping the element contract simple.
- World→screen: uniform scale-to-fit 1280×720 into the viewport, centered (letterbox);
  sim stays in world coords, deterministic and resolution-independent.
- Audio parameter updates live **outside** `update()` (in render/audio tick) since they
  read `s` but must not feed back into the sim.
