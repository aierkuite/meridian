# Particles

> `src/render/particles.ts`.

> **Status: Implemented (M5, 2026-06-25).** Source: `plan.md` §7, §10, §13.
> As-built contract below is authoritative.

---

## As-built particle system (M5, `src/render/particles.ts`)

```ts
export const PARTICLE_VISUAL_STEP = 1 / 60;   // constant visual step (NOT sim DT)
export interface ParticleSystem {
  update(step: number, sun: Sun01, cameraX: number): void;
  drawDay(ctx: CanvasRenderingContext2D): void;     // dust, behind gameplay
  drawNight(ctx: CanvasRenderingContext2D): void;   // spores, behind gameplay
  drawHorizon(ctx: CanvasRenderingContext2D): void; // cross-seam motes, top layer
}
export function createParticleSystem(): ParticleSystem;
```

- **Owned by the renderer:** `createRenderer()` builds one `ParticleSystem`;
  `renderScene` calls `particles.update(PARTICLE_VISUAL_STEP, sun, camera.x)` then
  `drawDay`/`drawNight` after the sky (background) and `drawHorizon` after the
  horizon glow (top). The constant step means particles need no `dt` from `main.ts`
  and never touch replay/determinism.
- **Fixed caps, preallocated once:** dust 90 / spore 70 / mote 24. Slots are
  primitive-field objects allocated at construction; `update`/`draw` only mutate
  in place and reuse dead slots via `respawn` (spawn is a no-op when full).
- **Visibility tracks `s`:** dust brighter at high sun, spore brighter at low sun,
  cross-horizon mote peaks at `s ≈ 0.5`. `Math.random` is allowed here (render is
  not scanned by the determinism guard).

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
