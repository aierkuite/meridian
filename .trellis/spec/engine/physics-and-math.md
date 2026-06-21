# Physics & Math

> `src/engine/physics.ts`, `src/engine/math.ts`.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3.1–3.2, §9,
> §10. Shapes are illustrative. Reconcile after M1/M2.

---

## Math primitives (`engine/math.ts`)

Small, **pure**, allocation-conscious. Imported everywhere, so keep it minimal
and side-effect-free.

```ts
export type Vec2 = { x: number; y: number };
export type AABB = { x: number; y: number; w: number; h: number };

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
export const aabbOverlap = (a: AABB, b: AABB): boolean => /* ... */;
```

- Prefer writing into a passed-in target over returning fresh objects in hot
  paths (see [Error Handling & Performance](../project/error-handling-and-perf.md)).

## AABB platformer integration (`engine/physics.ts`)

A small custom integrator — **no physics engine** (plan §10). Axis-aligned boxes,
swept or step-resolved against segment terrain.

### Per-world gravity sign — the key idea

Gravity is the **same magnitude, opposite sign** per world (plan §3.1):

- Top (Day / Sol): gravity points **down**, `+y`.
- Bottom (Night / Luna): gravity points **up**, `−y`.

Model it as a per-world `gravitySign: +1 | -1` and run the *same* integrator for
both. A mirrored jump is simply the same jump impulse times the world's sign —
this is what makes "press jump → Sol up, Luna down" fall out naturally instead of
being special-cased.

```ts
// shape only
function integrate(body: Body, world: World, dt: number) {
  body.vel.y += world.gravitySign * GRAVITY * dt;
  // ... move + resolve against terrain AABBs and solid elements (Element.solidAt(s))
}
```

### Collision against elements

Solid surfaces include terrain **and** elements that are solid at the current
sun value — query `element.solidAt(s)` (see [Elements](./elements.md)). The
physics step asks elements for their current solidity; it does not hardcode
element behavior.

## Feel: forgiving, deliberate (plan §9)

A hard *puzzle* game, not a twitch game. Tune for readability:

- **Coyote-time:** allow a jump a few steps after leaving a ledge.
- **Jump-buffering:** a jump pressed just before landing still fires.
- **Generous collision**; deliberate (non-twitch) pacing.

Because these affect simulation outcome, they are **deterministic** (counted in
fixed steps, never wall-clock) and covered by the `solutionPath` harness.

---

## Forbidden

- ❌ A third-party physics engine (fights the dual-world / inverted-gravity model).
- ❌ Special-casing "Luna jumps down" — derive it from `gravitySign`.
- ❌ Time-based feel windows (coyote/buffer) measured in milliseconds of
  wall-clock; measure them in fixed steps.
