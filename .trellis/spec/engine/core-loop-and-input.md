# Core Loop & Input

> `src/main.ts`, `src/engine/loop.ts`, `src/engine/input.ts`, `src/engine/camera.ts`.

> **Status: Reconcile after M1/M2 (2026-06-22).** `src/engine/loop.ts`,
> `input.ts`, `math.ts`, `camera.ts`, and `src/main.ts` have landed. The loop is
> exposed as `startFixedLoop({ sampleInput, update, render }): () => void`
> returning a disposer for HMR teardown. M2 added deterministic camera
> transition state and journey wiring.

---

## Bootstrap (`main.ts`)

`main.ts` is the only place presentation and simulation meet: it creates the
canvas, instantiates the simulation systems and the renderer/audio/ui, and
starts the RAF loop. Keep it thin — wiring only, no game rules.

## Fixed-timestep loop (`engine/loop.ts`)

The loop advances the simulation in **fixed `DT` steps** and renders decoupled.
This is the foundation of determinism — see
[Determinism & Testing](../project/determinism-and-testing.md). Do not move
gameplay onto a variable `dt`.

```ts
// shape only
const DT = 1 / 120;           // fixed sim step (tune in M2)
let acc = 0, prev = 0;

function frame(now: number) {
  acc += clampFrameDelta(now - prev); prev = now;   // clamp to avoid spiral-of-death
  while (acc >= DT) {
    update(DT, input.sample());   // ← the ONLY thing dev/replay.ts runs
    acc -= DT;
  }
  render(acc / DT);               // decoupled; alpha for interpolation
  requestAnimationFrame(frame);
}
```

- `update(dt, input)` is pure with respect to wall-clock — it takes `dt` and an
  input snapshot, nothing else time-related.
- Clamp the accumulated delta so a stalled tab doesn't trigger a death-spiral of
  catch-up steps.

## Input (`engine/input.ts`)

- Tracks keyboard state; the loop **samples it once per fixed step** into an
  immutable snapshot passed to `update`.
- Controls (plan §9): move `A`/`D` or `←/→`; jump `Space`; sun `↑/↓`; reset `R`;
  pause `Esc`. The same snapshot drives **both** avatars (mirror-sync).
- Feel helpers (coyote-time, jump-buffer) read this snapshot — see
  [Physics & Math](./physics-and-math.md).

```ts
type InputSnapshot = {
  readonly moveX: -1 | 0 | 1;
  readonly jump: boolean;       // player-held jump; player.ts edge-detects for buffering
  readonly sunDelta: -1 | 0 | 1; // ↑ / ↓
  readonly restart: boolean;
  readonly pause: boolean;
};
```

## Camera (`engine/camera.ts`)

- **Presentation transform only.** Camera offset is a render concern: gameplay
  collision, exits, terrain, and elements always stay in segment-local
  coordinates. `render/renderer.ts` and `dev/debugOverlay.ts` apply
  `camera.x` as a drawing transform; `game/segment.ts` never sees world-space
  offsets.
- **Deterministic transition state.** `CameraState` is
  `{ x, targetX, transitionFramesRemaining }`; `stepCamera()` advances by fixed
  frame counters and never reads wall-clock time.
- **Journey owns transition bookkeeping.** `game/journey.ts` may start/step the
  camera after `SegmentState.status === "won"`, but it must not read canvas,
  DOM, audio, or renderer state to decide gameplay. In the M2 single-segment
  fixture, the loop-back transition uses `targetX=0`; that is allowed as
  infrastructure, not final polish.
- **No hard completion screen.** Seamless scroll/transition replaces the M1 win
  card as progression (plan §3.4, §5).

```ts
interface CameraState {
  x: number;
  targetX: number;
  transitionFramesRemaining: number;
}
```

---

## Forbidden

- ❌ Variable-`dt` physics (breaks determinism + the replay harness).
- ❌ Reading input per render frame instead of per fixed step.
- ❌ Putting game rules in `main.ts` or the loop — they belong in `game/`.
- ❌ Feeding camera/world offsets into collision or segment data.
