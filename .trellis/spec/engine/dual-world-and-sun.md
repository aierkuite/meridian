# Dual-World & Sun

> `src/game/world.ts`, `src/game/sun.ts`, `src/game/player.ts`. The signature
> mechanic of Meridian.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3.1–3.4,
> §3.3, §4. Shapes are illustrative. Reconcile after M1.

---

## Dual world (`world.ts`)

One logical scene, **horizon at the vertical center** (plan §3.1):

- **Top = Day world (Sol).** Gravity **+y** (down).
- **Bottom = Night world (Luna).** Gravity **−y** (up). Rendered mirrored across
  the horizon.
- Each segment authors **two terrains** (top + bottom). They visually echo across
  the horizon but have **independently designed platforms** — that's what makes
  the puzzle real ("find inputs that work for both").
- `world.ts` owns the per-world `gravitySign` consumed by physics, and (finale
  only) the **gravity blend** when the horizon dissolves (plan §3.4).

## Control coupling — mirror-sync (`player.ts`)

The two avatars are **linked**; one input snapshot drives both **every step**
(plan §3.2):

- Horizontal: **identical** (right → both right).
- Vertical/jump: **mirrored by inverted gravity** (jump → Sol up, Luna "down"
  toward screen bottom). Don't special-case this — it falls out of the per-world
  `gravitySign` (see [Physics & Math](./physics-and-math.md)).
- **No independent control, no turn-taking.** Both avatars exist and stay synced
  for the entire journey — sacrifice dims a core, it never removes a body
  (plan §3.5, §2 #19). Protecting this invariant is why there's no "solo" content.

## Shared sun `s ∈ [0,1]` (`sun.ts`)

One value, **opposite** effects top vs bottom. `sun.ts` is the **single owner**
of `s` and the only place it is clamped (see
[TypeScript Conventions](../project/typescript-conventions.md)).

Three behaviors, all in the main line (plan §3.3):

1. **Holding dial (teaching beats 1–4):** `s` holds its value when keys are
   released. Friendly, learnable; lets players reason about the inversion calmly.
2. **Drift zones (back third):** `s` **drifts** on its own (a slow pull toward a
   pole); the player must **counter-press to hold it steady**. This is the
   signature *"make the sun stand still"* (solstice) verb, and it supplies the
   time-tension a static dial lacks.
3. **Window queries:** some elements are valid only inside a **narrow `s` band**
   (e.g. dusk/noon ≈ 0.5). `sun.ts` exposes the current `s`; elements decide
   solidity via their own band (see [Elements](./elements.md)).

```ts
// shape only
class Sun {
  get value(): Sun01;                 // clamped [0,1]
  apply(input: InputSnapshot, dt: number, drift?: DriftProfile): void; // hold or drift+counter
  isHeldStill(target: Sun01, eps: number): boolean; // finale "solstice mark" query
}
```

### Finale (plan §3.4)

In the reunion segment the sun **drifts**; only when **both avatars stand on
their solstice marks** does the sun stand still, which **dissolves the horizon**
and **blends the two gravities**. This is mechanical, not a cutscene — and there
is **no last-second choice**; the ending was already earned (see
[Segments, Flow & Endings](./segments-flow-and-endings.md)).

---

## Forbidden

- ❌ Independent per-avatar input, or any turn-taking.
- ❌ Removing an avatar mid-run (breaks the dual-sync core; use core dimming).
- ❌ Mutating `s` anywhere but `sun.ts`; letting `s` leave `[0,1]`.
- ❌ Making the sun a binary high/low switch — preserve window-band puzzles.
