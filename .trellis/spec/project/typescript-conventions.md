# TypeScript Conventions

> **Status: Partially reconciled with M0 (2026-06-22).** `tsconfig.json` is the
> full strict suite (`strict`, `noUncheckedIndexedAccess`,
> `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`,
> `noEmit`, `moduleResolution: bundler`, ES2022+DOM); `tsc --noEmit` is a CI
> gate. `engine/math.ts` ships `Vec2` + `clamp`/`vec2` exactly as below. The
> element/ending/consequence unions (§discriminated unions, element contract,
> `Consequence`) remain illustrative — they land in M1+ (`game/`).

---

## Compiler & build

- **Vite + TypeScript**, `strict: true`. Treat `tsc --noEmit` as a gate.
- No `any`. If a type is genuinely unknown, use `unknown` and narrow.
- Prefer `readonly` for data that the simulation should not mutate in place
  (segment definitions, palettes, narration tables).

---

## Core shared types (`engine/math.ts`)

Keep the math primitives tiny and pure — they are imported everywhere.

```ts
export type Vec2 = { x: number; y: number };
export type AABB = { x: number; y: number; w: number; h: number };
// pure helpers only: add, scale, aabbOverlap(a, b), clamp(v, lo, hi)...
```

## The sun value is a domain invariant

`s` is always in `[0, 1]`. Model it explicitly and clamp at the single mutation
point (the sun system), never scattered:

```ts
export type Sun01 = number; // invariant: 0 ≤ s ≤ 1, clamped in sun.ts only
```

## Discriminated unions for closed sets

Meridian has two naturally-closed sets — **elements** and **endings**. Model
them as discriminated unions so `switch` is exhaustive (the compiler catches a
missing case when a new variant is added):

```ts
type ElementKind = "ice" | "vine" | "door" | "mote"; // (+ stretch: "shadow" | "hazard")

type Ending =
  | { id: "one-sky" }       // light kept (almost) full
  | { id: "vow" }           // a few shortcuts, partial
  | { id: "afterglow" }     // lopsided spending
  | { id: "long-dark" };    // light spent to nothing
```

## Element contract

Every element subscribes to `s` and exposes its solidity/visual state. Window-
band elements (the "balance mote") are solid only inside `[sMin, sMax]`:

```ts
interface Element {
  readonly kind: ElementKind;
  /** Is this element a solid surface at the current sun value? */
  solidAt(s: Sun01): boolean;
  /** Visual state for the renderer to read (never mutated by render). */
  visualAt(s: Sun01): ElementVisual;
}
```

## Consequence state is small & serializable

The branch state written *only* by choice points (never by incidental death):

```ts
type Consequence = {
  solLight: number;   // 0..1 remaining
  lunaLight: number;  // 0..1 remaining
  shortcutsTaken: number;
};
```

---

## Forbidden

- ❌ `any`, non-null `!` to silence the compiler instead of narrowing.
- ❌ String-typed element/ending dispatch without a discriminated union (loses exhaustiveness).
- ❌ Mutating `readonly` segment/palette data at runtime.
- ❌ Letting `s` escape `[0,1]` — clamp once, in `sun.ts`.
