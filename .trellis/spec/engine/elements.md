# Elements

> `src/game/element.ts` (base) and `src/game/elements/*` (variants). The puzzle
> vocabulary, all driven by the shared sun `s`.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §4. Shapes are
> illustrative. Reconcile after M3.

---

## The base contract (`element.ts`)

Every element is a **dual pair** (a resource in one world / a threat-or-inverse
in the other), and subscribes to `s` to expose its collision + visual state. The
physics step asks `solidAt(s)`; the renderer reads `visualAt(s)`. Element logic
lives here, never in physics or render.

```ts
interface Element {
  readonly kind: ElementKind;          // "ice" | "vine" | "door" | "mote"
  readonly world: "day" | "night";     // which half it lives in
  solidAt(s: Sun01): boolean;          // physics queries this
  visualAt(s: Sun01): ElementVisual;   // render reads this (never mutates)
}
```

**Window-band elements** are solid only inside `[sMin, sMax]`. This is the
mechanism that stops the sun degenerating into a high/low switch — keep it
first-class (plan §3.3, §4 elem 4):

```ts
function solidInBand(s: Sun01, sMin: Sun01, sMax: Sun01) { return s >= sMin && s <= sMax; }
```

---

## MVP element set (plan §4)

| # | Element | Top (Day / Sol) | Bottom (Night / Luna) |
|---|---------|------------------|------------------------|
| 1 | **Ice ⇄ Water** | high `s` melts ice → gap; low `s` → solid platform | low `s` freezes water → ice **bridge**; high `s` melts → fall |
| 2 | **Vine ⇄ Fungi** | high `s` grows vine → climbable; low `s` → retracts | low `s` → glowing fungi solid; high `s` → wilt → gap |
| 3 | **Light-door ⇄ Dark-gate** | opens when `s` is **high** enough | opens when `s` is **low** enough |
| 4 | **Balance mote** (window) | solid only inside narrow band (≈0.5), mirrored both worlds | same band, simultaneously — find the shared survivable moment |

- The "hold-the-sun" verb is **not** an element — it lives in the sun model's
  drift zones and the finale (see [Dual-World & Sun](./dual-world-and-sun.md)).
- **Stretch elements** (post-freeze, do **not** build pre-MVP): shadow-bridge
  (`elements/shadow.ts`), threats/predator (`elements/hazard.ts`).

### Tuning note (valence asymmetry)

Watch that the top world doesn't read as "always harder." Element 1, for
example, makes the top *lose* a platform while the bottom *gains* one — balance
each beat with neutral/window elements (plan §4 tuning note).

---

## Forbidden

- ❌ Hardcoding element behavior in `physics.ts` or `renderer.ts` — it belongs in
  the element. Physics asks `solidAt(s)`; render asks `visualAt(s)`.
- ❌ Reducing every element to high/low — preserve window-band elements.
- ❌ Building stretch elements (shadow/hazard) before the MVP freeze (plan §12).
