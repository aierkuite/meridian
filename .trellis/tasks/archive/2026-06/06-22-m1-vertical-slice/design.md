# M1 — Technical Design

> Vertical slice (the proof). Implements the locked decisions in `prd.md` (D1–D4) on
> top of the M0 spine. Reconciles the plan-derived engine/render/audio/data specs.
> Source of truth for `implement.md`.

---

## 1. Architecture & the one boundary that matters

The spec's hard rule ([directory-structure](../../spec/project/directory-structure.md)):
**simulation ← presentation**. The dependency arrow points presentation → simulation,
never the reverse. `dev/replay.ts` (M2) will run the sim with no renderer/audio, so the
sim must stay correct without them.

| Layer | Dir | Role | M1 lands |
|-------|-----|------|----------|
| Simulation | `engine/` + `game/` + `data/` | deterministic, render-free game rules | physics, world, sun, player, element(ice), segment |
| Presentation | `render/` + `audio/` + `ui/` | reads sim, draws/plays; never mutates | renderer (palette+glow), audio (filter graph), hud (sun orb + win card) |
| Bootstrap | `main.ts` | canvas, RAF, wires sim↔presentation | replaces M0 demo wiring |
| Tooling | `dev/` | dev-only | deferred (M2: replay; debug overlay optional) |

**main.ts rewrite:** the M0 demo (`DemoState`, `drawBackground/Horizon/TickMarker`) is
replaced by construction of the real systems and a single `update(dt, input)` /
`render(alpha)` pair handed to the existing `startFixedLoop`.

---

## 2. World model & coordinates

- **Logical world**: fixed `W=1280 × H=720`. **Horizon at `y=360`.** All simulation runs
  in these units — deterministic and screen-independent.
- **Day world (Sol)**: `y ∈ [0, 360]`, `gravitySign = +1` (falls toward horizon, +y).
  Sol stands on the **top** faces of platforms.
- **Night world (Luna)**: `y ∈ [360, 720]`, `gravitySign = −1` (falls toward horizon,
  −y, i.e. "up" on screen). Luna stands on the **underside** faces of platforms — the
  upside-down reading is the intended "mirrored across the horizon" look. **No explicit
  render-mirror transform**; unified coords + `gravitySign` produce it for free (spec
  [physics-and-math](../../spec/engine/physics-and-math.md)).
- **World→screen (render only)**: `scale = min(canvasCssW/1280, canvasCssH/720)`, center,
  letterbox. The sim never sees screen size.

```ts
// engine/math.ts additions (pure, allocation-conscious)
export type AABB = { x: number; y: number; w: number; h: number };
export const aabbOverlap = (a: AABB, b: AABB): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
```

---

## 3. Systems (simulation)

### 3.1 Sun (`game/sun.ts`) — sole owner of `s`

```ts
export type Sun01 = number; // invariant 0 ≤ s ≤ 1, clamped here only
const SUN_RATE = 0.8;       // full sweep ≈ 1.25s; tune in playtest
export interface Sun { get value(): Sun01; apply(input: InputSnapshot, dt: number): void; }
// apply: s = clamp(s + input.sunDelta * SUN_RATE * dt, 0, 1)  // HOLDING dial (M1)
```

No drift in M1 (M3). `sunDelta` already comes from `InputSnapshot` (M0). Single clamp
site per [typescript-conventions](../../spec/project/typescript-conventions.md).

### 3.2 Player (`game/player.ts`) — mirror-sync pair

One struct, two bodies, driven by one input. The mirror falls out of `gravitySign`
(spec [dual-world-and-sun](../../spec/engine/dual-world-and-sun.md)).

```ts
export interface Avatar { pos: Vec2; vel: Vec2; half: Vec2; onGround: boolean; gravitySign: 1 | -1; }
export interface Player { sol: Avatar; luna: Avatar; }
// each step, for BOTH avatars (same input):
//   vel.x = input.moveX * MOVE_SPEED
//   if input.jump && onGround: vel.y = -gravitySign * JUMP_SPEED   // mirrored jump
```

Constants (world units/s; tune in playtest): `MOVE_SPEED = 320`, `JUMP_SPEED = 760`,
`GRAVITY = 2200`, `AVATAR_HALF = {x:14, y:20}`.

### 3.3 Physics (`engine/physics.ts`) — AABB integrator, per-world gravity

Axis-separated move-and-resolve against terrain AABBs **and** solid elements. Solid set
is recomputed each step from `element.solidAt(sun.value)`.

```ts
export function integrate(body: Avatar, dt: number, solids: readonly AABB[]): void {
  body.vel.y += body.gravitySign * GRAVITY * dt;
  // X: move, resolve overlaps (push out, zero vel.x on block)
  // Y: move, resolve overlaps; onGround = blocked while moving in gravity direction
}
```

- **No coyote-time / jump-buffer in M1** (M2) — `jump` requires `onGround`.
- Reuse scratch `Vec2`/`AABB`; no per-step allocation (perf spec).
- Resolution is the standard "move X resolve X, move Y resolve Y" against the union of
  terrain + currently-solid elements.

### 3.4 Element base + Ice (`game/element.ts`, `game/elements/ice.ts`)

```ts
export type ElementKind = "ice";            // M1: only ice
export interface ElementVisual { alpha: number; }   // render reads; melt → fade
export interface Element {
  readonly kind: ElementKind;
  readonly world: "day" | "night";
  solidAt(s: Sun01): boolean;               // physics
  visualAt(s: Sun01): ElementVisual;        // render
}
// Ice (same polarity both worlds per spec table):
const MELT = 0.5;
solidAt = (s) => s < MELT;
visualAt = (s) => ({ alpha: s < MELT ? 1 : 0 });   // sharp for M1; soften in M5
```

Discriminated union (`ElementKind`) so adding vine/door/mote in M3 is exhaustive
([typescript-conventions](../../spec/project/typescript-conventions.md)).

### 3.5 Segment (`game/segment.ts`) — runtime + win/reset

```ts
export interface ExitZones { sol: AABB; luna: AABB; }
export interface SegmentState {
  data: SegmentData;            // readonly, from data/
  player: Player;
  sun: Sun;
  elements: readonly Element[];
  status: "playing" | "won";
}
export function createSegment(data: SegmentData): SegmentState;
export function updateSegment(state: SegmentState, input: InputSnapshot, dt: number): void;
export function resetSegment(state: SegmentState): void;
```

- `updateSegment`: `sun.apply` → recompute solid AABBs → integrate both avatars →
  death check → win check.
- **Death**: avatar top crosses horizon (Sol `pos.y - half.y > 360`) or Luna bottom
  crosses horizon (`pos.y + half.y < 360`), or either leaves world `[0,720]` →
  `resetSegment`. Either avatar dying resets the **pair** (mirror-sync pair).
- **Win**: both avatars overlap their exit zones → `status = "won"`. The transition +
  auto-reset is driven by presentation (see §5.2), reading `status`.

### 3.6 Data (`data/segments/m1-slice.ts`) — forward-compatible shape

A `readonly SegmentData` matching the [segment-data-format](../../spec/data/segment-data-format.md)
schema, with M2/M3/M4 fields present-but-optional so the loader slots in without rework:

```ts
export interface SegmentData {
  readonly id: string;
  readonly worldBounds: AABB;                 // {0,0,1280,720}
  readonly horizonY: number;                  // 360
  readonly dayTerrain: readonly AABB[];
  readonly nightTerrain: readonly AABB[];
  readonly elements: readonly ElementPlacement[];   // { kind:"ice", world, box }
  readonly exits: { readonly sol: AABB; readonly luna: AABB };
  readonly solutionPaths?: readonly InputSnapshot[][]; // M2 (absent in M1)
  readonly drift?: never;                     // M3
  readonly choicePoint?: never;               // M4
}
```

### 3.7 The concrete slice (world coords, 1280×720, horizon 360)

```
DAY (Sol, gravity +y) — continuous floor, ice WALL blocks E₁
 ┌─────────────────────────────────────────────────────────┐ y=0
 │                                                           │
 │   ░░░░░░░░░ ice wall ░░░░░░░░                             │
 │  ████████████████████████████████████████████  ▄▄▄▄ [E₁]  │  E₁ ledge (jump up)
 └─────────────────────────────────────────────────────────┘ y=360 horizon
 ┌─────────────────────────────────────────────────────────┐
 │   ▄▄▄▄ [E₂]                                  ░░░░░░░░░░  │  E₂ ledge (Luna jump down)
 │           ████████   ░░░ ice bridge ░░░   ███████████████ │  chasm between
 │                                                           │
NIGHT (Luna, gravity −y) — chasm + ice BRIDGE, E₂ past it
 └─────────────────────────────────────────────────────────┘ y=720
```

Approximate layout (final pixels tuned in playtest, recorded in `m1-slice.ts`):

| Item | World | AABB `{x,y,w,h}` (approx) |
|------|-------|---------------------------|
| Day floor | day | `{0, 320, 1280, 40}` (top at 320, to horizon) |
| Ice wall (blocks E₁) | day | `{980, 230, 40, 90}` (sits on day floor) |
| E₁ ledge (jump up) | day | `{1180, 270, 100, 50}` |
| Night left floor | night | `{0, 360, 360, 40}` (just below horizon; Luna under it) |
| Ice bridge (chasm) | night | `{360, 360, 560, 40}` |
| Night right floor | night | `{920, 360, 360, 40}` |
| E₂ ledge (Luna jump down) | night | `{1180, 430, 100, 50}` |

> Authoring note: night platforms sit with their top at/below `horizonY=360`; Luna
> (gravity −y) lands on their **underside**, so Luna rests just beneath each platform —
> the mirrored reading. E₂ sits lower on screen (larger y) so Luna's jump (+y, "down")
> reaches it, mirroring Sol's jump-up to E₁.

**Solution path (proves D4):**
1. Start `s` mid. Hold `→`: Luna (free, bridge solid at low `s` if we first lower it)
   — lower `s` to `< 0.5` first, then hold `→`: Luna crosses bridge to the right floor,
   then `↓`-jump to E₂. Sol, moving right on continuous floor, is stopped by the ice
   wall (solid at low `s`).
2. Raise `s` to `> 0.5`: wall melts (Sol proceeds) and bridge melts (Luna already safe
   at E₂). Hold `→` + jump: Sol reaches E₁. Both at exits → win.

(Tighter input sequence recorded when M2's `solutionPath` lands; M1 verifies by manual
play + build/determinism gates.)

---

## 4. Render (`render/renderer.ts`, `render/palette.ts`)

Reads `SegmentState` only; never mutates. Pipeline per [silhouette-glow-pipeline]:

1. **World→screen transform** (scale-to-fit + center, letterbox bars in sky color).
2. **Gradient sky** from `palette.skyGradient(s)` — warm amber→gold top, indigo→near-
   black bottom; `s` nudges warmth/coolness.
3. **Silhouette terrain** — flat dark fills (`#10131a`-ish) for day + night terrain.
4. **Elements** — ice drawn as silhouette fill × `visualAt(s).alpha` (melt = fade out).
5. **Avatars** — silhouette body + **pre-rendered offscreen glow-core sprite** drawn
   additively (`globalCompositeOperation = "lighter"`); Sol warm (`#ffb86b`), Luna cool
   (`#7bd4ff`).
6. **Horizon seam** — a pre-rendered luminous glow sprite, drawn additively along y=360.
7. **Sun orb** — pre-rendered radial glow sprite, screen position fixed (e.g. top-right),
   radius/brightness from `s`.

**Glow discipline (the perf rule):** every glow shape is rendered **once** to an
offscreen canvas at startup; per frame only `drawImage` + additive. **Zero
`shadowBlur`** in the hot path. Sprites re-rendered only if shape changes (it won't in
M1).

---

## 5. Audio (`audio/audio.ts`) & UI (`ui/hud.ts`)

### 5.1 Audio graph (reads `s`, outside `update()`)

```
Oscillators (drone/pad, procedural) → Gain(bed) → BiquadFilter(lowpass) → Convolver(reverb) → master → out
                                                       ↑ cutoff               ↑ wet
                                                 lerp(MUTED_HZ, OPEN_HZ, s)   lerp(0.2, 0.8, s)
```

- `AudioContext` created + `resume()`d on **first keydown** (browser gesture rule;
  [audio-guidelines](../../spec/audio/audio-guidelines.md)). Silent before then.
- Cutoff/wet updated in the render tick (or a dedicated audio tick), reading `sun.value`
  — **never** inside `update()`.
- No SFX set in M1 (M5). The win transition may trigger one procedural chord bloom
  (cheap, on the same graph) — optional, defer if time-boxed.

### 5.2 UI / overlay

- **Sun orb** is rendered (renderer §4.7) — no DOM. A minimal DOM/overlay layer
  (`ui/hud.ts`) handles only the **win card**: when `state.status === "won"`, show the
  placeholder line *"And they moved as one."* for ~1.5s, then call `resetSegment`.
- Pause (`Esc`) and reset (`R`) handled in input→main wiring (M1: `R` resets; `Esc`
  pause is a stretch — if trivial, freeze `update`, else defer to M2 and note it).

---

## 6. Determinism guardrails (M1 gate)

Per [determinism-and-testing](../../spec/project/determinism-and-testing.md):

- `update()` (everything under `engine/` + `game/`) uses **only** fixed `DT`, input,
  and segment data. No `Math.random`/`Date.now`/`performance.now`/DOM/AudioContext.
- The existing `scripts/check-determinism.mjs` greps `src/engine`+`src/game` for those
  calls — **must stay green** (it is the M1 test gate until M2's harness lands).
- `update()` is what M2's `dev/replay.ts` will call verbatim — keep its signature
  side-effect-free relative to presentation.
- Audio parameter writes happen in the render/audio tick, not `update()`.

---

## 7. Risks & tradeoffs

| Risk | Mitigation |
|------|-----------|
| Mirror-sync solvability (same input, opposite needs) | Bounded one-screen segment; collisions resolve per-avatar so one can advance while the other is blocked; manual solve pass before merge; M2 harness backfills the assertion. |
| Luna "stands on undersides" reads wrong / authoring confusion | Unified-coord model is spec-prescribed; tune platform y so Luna visibly rests beneath night platforms; verify in-browser. |
| `shadowBlur` perf creep | All glow via offscreen sprites + additive; grep render diff for `shadowBlur`. |
| Audio blocked before gesture | Unlock on first keydown; silent-then-on is acceptable for the slice. |
| Scope creep into M2 (feel, harness) | D1 out-of-scope list is explicit; resist pulling coyote/buffer or `solutionPath` in. |

---

## 8. Compatibility / forward-compat

- `ElementKind` union, `Element` contract, `SegmentData` shape, `Sun01`, `gravitySign` —
  all land in the spec-prescribed form so M2 (loader + `solutionPath` + harness), M3
  (drift + more elements), M4 (consequence/ending/narration) extend without rework.
- M0's loop/input/math are reused unchanged (math only gains `AABB` + `aabbOverlap`).
