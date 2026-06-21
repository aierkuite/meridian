# Core Loop & Input

> `src/main.ts`, `src/engine/loop.ts`, `src/engine/input.ts`, `src/engine/camera.ts`.

> **Status: Reconciled with M0 (2026-06-22).** `src/engine/loop.ts`,
> `input.ts`, `math.ts` and `src/main.ts` landed. The shapes below match the
> shipped code; one refinement — the loop is exposed as
> `startFixedLoop({ sampleInput, update, render }): () => void` returning a
> disposer (for HMR teardown), rather than a bare `frame()` closure. Camera
> (`engine/camera.ts`) remains a stub until M1/M2.

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
  readonly jump: boolean;       // edge-detected for buffering
  readonly sunDelta: -1 | 0 | 1; // ↑ / ↓
};
```

## Camera (`engine/camera.ts`)

- **Seamless scroll** between segments — no "level complete" UI, no level select
  (plan §3.4, §5). The camera smoothly advances when both avatars clear their
  exits.
- The camera is part of simulation-adjacent state but only ever **reads**
  world/player position; it never alters gameplay.

---

## Forbidden

- ❌ Variable-`dt` physics (breaks determinism + the replay harness).
- ❌ Reading input per render frame instead of per fixed step.
- ❌ Putting game rules in `main.ts` or the loop — they belong in `game/`.
