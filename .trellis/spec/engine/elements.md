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
| 1 | **Ice ⇄ Water** | low `s` (sun away) → ice solid; high `s` (sun in day) → melts → gap | **inverted:** high `s` (sun away from night) → ice **bridge** solid; low `s` → melts → fall |
| 2 | **Vine ⇄ Fungi** | high `s` grows vine → climbable; low `s` → retracts | low `s` → glowing fungi solid; high `s` → wilt → gap |
| 3 | **Light-door ⇄ Dark-gate** | opens when `s` is **high** enough | opens when `s` is **low** enough |
| 4 | **Balance mote** (window) | solid only inside narrow band (≈0.5), mirrored both worlds | same band, simultaneously — find the shared survivable moment |

- The "hold-the-sun" verb is **not** an element — it lives in the sun model's
  drift zones and the finale (see [Dual-World & Sun](./dual-world-and-sun.md)).
- **Stretch elements** (post-freeze, do **not** build pre-MVP): shadow-bridge
  (`elements/shadow.ts`), threats/predator (`elements/hazard.ts`).

### Tuning note (valence asymmetry)

> **M1 refinement (2026-06-22, execution-surfaced):** Ice is now **per-world
> inverted** — the sun warms whichever world it currently inhabits, so ice freezes
> in the world the sun is *not* in (`solidAt` = `world==="day" ? s<0.5 : s>0.5`).
> This supersedes the original plan §4 elem 1 wording ("low `s` freezes both").
> Rationale: now that the sun visually travels between worlds (renderer), same-
> polarity ice felt incoherent; the inverted model also matches elements 2 & 3,
> which were already per-world inverted. The "one sun, opposite effects" core is
> now literal: at any `s` exactly one world's ice is solid (at `s=0.5`, neither —
> the meridian).

Each element pair is a **dual** (resource in one world / threat in the other);
balance beats so neither world reads as "always harder" (plan §4 tuning note).

---

## Forbidden

- ❌ Hardcoding element behavior in `physics.ts` or `renderer.ts` — it belongs in
  the element. Physics asks `solidAt(s)`; render asks `visualAt(s)`.
- ❌ Reducing every element to high/low — preserve window-band elements.
- ❌ Building stretch elements (shadow/hazard) before the MVP freeze (plan §12).
