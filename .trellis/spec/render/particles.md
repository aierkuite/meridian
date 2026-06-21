# Particles

> `src/render/particles.ts`.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §7, §10, §13.
> Reconcile after M5.

---

## Pooling is mandatory

Particles are the easiest way to blow the 60fps budget through GC churn. Every
particle layer is **pooled and capped** — allocate the pool once, reuse slots,
never `new` a particle inside the frame loop (plan §10, §13; see
[Error Handling & Performance](../project/error-handling-and-perf.md)).

```ts
// shape only
class ParticlePool {
  constructor(readonly cap: number) { /* pre-allocate cap slots */ }
  spawn(/* ... */): void;      // reuses a dead slot; no-op if full
  update(dt: number): void;    // deterministic if it ever affects gameplay — but these are cosmetic
  draw(ctx: CanvasRenderingContext2D): void;
}
```

## Layers (plan §7)

- **Dust motes** — warm, drifting, top/day world.
- **Spores** — cool bioluminescent, bottom/night world.
- **Cross-horizon mote** — a mote that visually crosses the seam (plan §7, ds #C).
- **Aurora ribbon** — night world, **stretch** (post-freeze).

## These are cosmetic — keep them out of the simulation

Particles live entirely in the presentation layer. They **must not** affect
gameplay state or the `solutionPath`. Because they're cosmetic, they may use
render-frame timing — but if a particle ever becomes gameplay-relevant, it moves
into the simulation and must obey
[Determinism & Testing](../project/determinism-and-testing.md).

---

## Forbidden

- ❌ Allocating particles per frame (use the pool).
- ❌ Uncapped emitters.
- ❌ Letting cosmetic particles influence simulation/solvability.
- ❌ Building the aurora before the MVP freeze (plan §12 stretch).
