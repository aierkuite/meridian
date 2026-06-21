# Engine Layer — Deterministic Simulation

> The heart of Meridian: the **render-free, deterministic** simulation. Covers
> `src/engine/` (loop, input, math, physics, camera) **and** `src/game/`
> (dual-world model, sun, player, elements, segment, consequence, ending,
> narration logic). Everything here must obey
> [Determinism & Testing](../project/determinism-and-testing.md).

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3, §10.
> Signatures are illustrative of the prescribed model. Reconcile after M1.

---

## What lives here

| Guide | What it covers |
|-------|----------------|
| [Core Loop & Input](./core-loop-and-input.md) | Fixed-timestep loop, update/render split, keyboard input sampling, camera |
| [Physics & Math](./physics-and-math.md) | AABB platformer, per-world gravity sign, coyote-time/jump-buffer, `vec2`/`AABB` helpers |
| [Dual-World & Sun](./dual-world-and-sun.md) | Dual-pole coordinates, gravity-mirror sync, shared sun `s` (hold / drift / window) |
| [Elements](./elements.md) | Element base contract (`solidAt(s)`), window bands, the MVP element set |
| [Segments, Flow & Endings](./segments-flow-and-endings.md) | Segment runtime, checkpoints, consequence state, accumulated → ~4 endings, adaptive narration |

---

## Pre-Development Checklist

- [ ] This is **simulation** code — it must be deterministic and render-free. Re-read [Determinism & Testing](../project/determinism-and-testing.md).
- [ ] Will this change keep every segment beatable on its `solutionPath`, both choice-point branches?
- [ ] Does it respect the **locked core** (plan §2): one input drives both avatars, horizontal identical, vertical mirrored; `s` single value with opposite effects?
- [ ] Am I adding state that the ending reads? It must be written **only at choice points**, never by incidental death.

## Quality Check

- [ ] `dev/replay.ts` green for every segment, both branches; all 4 endings reachable.
- [ ] No nondeterminism (`Math.random`/`Date.now`/`performance.now`/DOM reads) in `update()`.
- [ ] No per-frame allocation in the simulation hot path.
- [ ] Mirror-sync invariant intact: avatars receive the same input vector every step.

---

## The non-negotiable core (plan §3.1–3.4)

- **Dual world:** one logical scene, horizon at vertical center. Top = Day (Sol), gravity **+y**. Bottom = Night (Luna), gravity **−y**, rendered mirrored.
- **Control coupling:** one input vector drives **both** avatars every frame. Horizontal identical; jump mirrored by inverted gravity. No independent control.
- **Shared sun `s ∈ [0,1]`:** one value, **opposite** effects per world; holds in teaching beats, **drifts** in the back third (the "make the sun stand still" verb).
- **Win:** both avatars reach their exits → seamless camera advance. Death → segment checkpoint.
