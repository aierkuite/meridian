# Determinism & Testing ★

> **The spine of this project.** Meridian's entire QA strategy — "every segment
> is provably beatable, no softlocks" — rests on the simulation being
> deterministic. Read this before touching anything under `engine/` or `game/`.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3.4, §10,
> §13, M2/M6. Reconcile after the harness exists.

---

## 1. Fixed-timestep simulation

The loop (`engine/loop.ts`) advances the simulation in **fixed `dt` steps**;
rendering is **decoupled** and may interpolate. Determinism comes from the fixed
step — variable `dt` would make physics frame-rate-dependent and the replay
harness unreliable.

```ts
// shape only (plan §10 "fixed-timestep loop")
let acc = 0;
function frame(now: number) {
  acc += clampFrameDelta(now - prev);
  while (acc >= DT) { update(DT, sampleInput()); acc -= DT; } // fixed sim steps
  render(/* optional interpolation alpha */ acc / DT);        // decoupled
}
```

- **Input is sampled once per fixed step** (`engine/input.ts`), not per render frame.
- `update()` is the only thing the replay harness runs.

## 2. Zero nondeterminism in the simulation path

Inside `engine/` and `game/` `update()` code, the following are **forbidden** —
they break replay reproducibility:

- ❌ `Math.random()`
- ❌ `Date.now()`, `new Date()`, `performance.now()`, any wall-clock read
- ❌ Reading the canvas, DOM, or AudioContext (presentation state)
- ❌ Iterating a `Set`/`Map`/object in insertion-or-hash order where order affects outcome — use arrays with explicit order

If you genuinely need randomness, use a **seedable PRNG** whose seed is stored
in the segment data, so a replay reproduces it exactly.

## 3. Simulation is render-free

The simulation must produce correct state with **no renderer and no audio
present** — that is exactly how `dev/replay.ts` runs it. Presentation reads
simulation state; it never feeds back into it.

---

## 4. The solvability replay harness (`dev/replay.ts`)

This is the primary regression test. Do not rely on manual playtest alone
(plan §13, reviewer gpt P2).

- Each segment stores a **`solutionPath`**: a recorded designer input sequence
  known to beat it (see `data/segment-data-format.md`).
- The harness replays each `solutionPath` on the deterministic loop and
  **asserts both avatars reach their exits with no softlock**.
- **It must cover BOTH branches of every choice point** (the cruel shortcut and
  the whole-hearted path) — plan §10, M6.
- It also verifies **all ~4 endings are reachable** from the appropriate
  accumulated `consequence` states.
- **Run it on every change** to `engine/`, `game/`, or `data/segments/`.

```ts
// contract (shape only)
for (const seg of allSegments) {
  for (const path of seg.solutionPaths) {      // includes both choice branches
    const result = replay(seg, path);
    assert(result.bothReachedExit && !result.softlocked, `${seg.id} unbeatable`);
  }
}
```

## 5. What counts as "tested"

A change to simulation or segment data is **not done** until:

- [ ] The replay harness is green for every segment, both branches.
- [ ] A manual softlock pass on any segment whose geometry/elements changed.
- [ ] No new nondeterminism introduced (grep your diff for the forbidden calls).

---

## Why this discipline exists

"One sun, opposite effects" with simultaneous mirror control is easy to make
*accidentally unsolvable*. Determinism + recorded `solutionPath`s turn
"is the game still beatable?" from a hope into an assertion that runs on every
commit. This is the cheapest insurance the project has — protect it.
