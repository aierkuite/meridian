# M1 — Implementation Plan

> Ordered execution for `06-22-m1-vertical-slice`. Each step is independently
> typecheckable and ends at a commit point. Design ref: `design.md`; requirements:
> `prd.md`. Work proceeds on `main` (matches M0 precedent).

## Validation commands

- `npm run typecheck` → `tsc --noEmit` (gate)
- `npm run check:determinism` → greps sim for nondeterminism (gate; the M1 test bar)
- `npm run build` → `tsc --noEmit && vite build` (pre-merge gate)
- `npm run dev` → manual playtest (browser)
- `grep -rn "shadowBlur" meridian/src/render` → must be empty (glow perf rule)

All commands run from `meridian/`.

## Conventions (non-negotiable, from spec)

- No `any`; no `!` non-null to silence TS — narrow instead.
- `update()` under `engine/`+`game/`: no `Math.random`/`Date.now`/`performance.now`/DOM/
  AudioContext reads. Audio/render parameter writes happen outside `update()`.
- Presentation (`render/`/`audio/`/`ui/`) reads sim state only — never mutates.
- No per-frame allocation in sim hot path (reuse scratch `Vec2`/`AABB`).
- Glow = offscreen sprites + additive compositing; **no per-frame `shadowBlur`**.
- `s` clamped only in `game/sun.ts`.

---

## Step 1 — Math primitives
- Add `AABB` type + `aabbOverlap(a,b)` to `engine/math.ts` (pure).
- **Validate:** `npm run typecheck`, `npm run check:determinism`.
- Commit.

## Step 2 — Sun system (`game/sun.ts`)
- `Sun01` type, `SUN_RATE`, `Sun` interface `{ get value(); apply(input, dt) }`.
- Holding dial: `s = clamp(s + input.sunDelta * SUN_RATE * dt, 0, 1)`.
- **Validate:** typecheck, determinism.
- Commit.

## Step 3 — Physics integrator (`engine/physics.ts`)
- `integrate(body, dt, solids)`: `vel.y += gravitySign * GRAVITY * dt`; axis-separated
  move+resolve against the solid AABB set; set `onGround` when blocked in the gravity
  direction. Reuse scratch objects.
- Constants: `MOVE_SPEED`, `JUMP_SPEED`, `GRAVITY`.
- **Validate:** typecheck, determinism.
- Commit.

## Step 4 — Player pair (`game/player.ts`)
- `Avatar` (pos/vel/half/onGround/gravitySign), `Player { sol, luna }`.
- `updatePlayer(player, input, dt, solids)`: same input → both; `vel.x = moveX *
  MOVE_SPEED`; jump `vel.y = -gravitySign * JUMP_SPEED` when `onGround`. Integrate both.
- **Validate:** typecheck, determinism.
- Commit.

## Step 5 — Element base + Ice (`game/element.ts`, `game/elements/ice.ts`)
- `ElementKind` union, `Element` contract (`solidAt`, `visualAt`), `ElementPlacement`.
- `IceElement`: `MELT=0.5`; `solidAt(s)=s<MELT`; `visualAt(s)={alpha: s<MELT?1:0}`.
- **Validate:** typecheck, determinism.
- Commit.

## Step 6 — Segment data (`data/segments/m1-slice.ts`)
- Author the concrete `readonly SegmentData` (§3.7 layout table). `solutionPaths`/
  `drift`/`choicePoint` absent (forward-compat).
- **Validate:** typecheck.
- Commit.

## Step 7 — Segment runtime (`game/segment.ts`)
- `SegmentState`, `createSegment`, `updateSegment(state, input, dt)`, `resetSegment`.
- `updateSegment`: `sun.apply` → recompute solid AABBs (terrain + `element.solidAt`) →
  `updatePlayer` → death check (horizon crossing / out of `[0,720]`) → win check (both
  in exit zones → `status="won"`).
- **Validate:** typecheck, determinism.
- Commit.

## ★ Review gate A — sim wired & playable (after Step 8)

## Step 8 — Wire simulation into `main.ts`
- Replace M0 demo (`DemoState`, `drawBackground/Horizon/TickMarker`) with real systems:
  build `SegmentState` from `m1-slice`, drive `updateSegment`/placeholder render from
  `startFixedLoop`. Minimal block rendering for now (rects) just to see motion.
- `R` → `resetSegment`. (Pause `Esc`: implement if trivial, else defer to M2 + note.)
- **Validate:** typecheck, determinism, **manual `npm run dev`**: both avatars move on
  A/D; Space jumps both (Sol up, Luna down); ↑/↓ moves a visible sun value; ice
  wall/bridge respond at the melt threshold; fall/R resets.
- Commit.

## Step 9 — Renderer (`render/palette.ts`, `render/renderer.ts`)
- `palette.skyGradient(ctx, s, bounds)`. Pre-render offscreen glow sprites at startup:
  Sol core, Luna core, horizon seam, sun orb. Per-frame: world→screen transform →
  gradient sky → silhouette terrain → ice (alpha) → avatars (silhouette + additive core)
  → additive horizon seam → sun orb.
- **Validate:** `grep -rn shadowBlur src/render` empty; typecheck; visual + ~60fps in
  browser.
- Commit.

## Step 10 — Audio (`audio/audio.ts`)
- Procedural drone/pad oscillators → lowpass `BiquadFilter` → `Convolver` reverb →
  master. Unlock (`new AudioContext` + `resume()`) on first keydown. In the render/audio
  tick, map `sun.value` → cutoff `lerp(MUTED_HZ, OPEN_HZ, s)`, wet `lerp(0.2,0.8,s)`.
- **Validate:** typecheck; manual: high `s` opens/brightens, low `s` muffles (after first
  key). Confirm no audio reads inside `update()`.
- Commit.

## Step 11 — Win card + full flow (`ui/hud.ts`)
- On `status==="won"`: show *"And they moved as one."* ~1.5s → `resetSegment`.
- **Validate:** full golden-path playthrough (low `s` → Luna to E₂; high `s` → Sol to
  E₁; win card; reset) + fall/reset + R reset; ~60fps; determinism + build green.
- Commit.

## ★ Review gate B — full slice green (after Step 11)

## Step 12 — Build, deploy, verify
- `npm run build` green; `npm run check:determinism` green.
- Commit on `main`; GitHub Pages auto-deploys (M0). Verify live URL playable.
- **Validate:** Pages demo meets AC1–AC8.

---

## Rollback

- Each step is one commit on `main`; `git revert <sha>` per step.
- Sim (Steps 1–7) is isolated from presentation — a broken renderer can be reverted
  independently while the sim keeps passing determinism.

## Definition of Done (matches prd.md)

- All gates green; played through in-browser; deployed live; spec layers reconciled in
  Phase 3.3.
