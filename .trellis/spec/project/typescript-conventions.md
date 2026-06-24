# TypeScript Conventions

> **Status: Reconcile after M4 (2026-06-24).** `tsconfig.json` is the full
> strict suite (`strict`, `noUncheckedIndexedAccess`,
> `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`,
> `noEmit`, `moduleResolution: bundler`, ES2022+DOM). M4 landed closed
> choice/ending unions and serializable consequence state.

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

Meridian has naturally-closed sets — **elements**, **choice points**, **choice
routes**, **consequence bands**, and **endings**. Model them as literal unions so
`switch` and record keys are exhaustive:

```ts
type ElementKind = "ice" | "vine" | "door" | "mote";
type ChoicePointId = "doors-cost" | "drift-cost" | "master-cost";
type ChoiceRoute = "whole" | "shortcut";
type ConsequenceBand = "whole" | "spent" | "lopsided" | "dark";
type EndingId = "one-sky" | "vow" | "afterglow" | "long-dark";
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
interface Consequence {
  readonly solLight: number;
  readonly lunaLight: number;
  readonly shortcutsTaken: number;
  readonly choices: Readonly<Record<ChoicePointId, ChoiceRoute | "unresolved">>;
}
```

- Clamp light in `game/consequence.ts`, not in render, UI, or ending consumers.
- Keep choice ids closed. Adding a choice point requires updating the union,
  `createConsequence`, story prompts, segment data, and replay reachability.

---

## Forbidden

- ❌ `any`, non-null `!` to silence the compiler instead of narrowing.
- ❌ String-typed element/ending dispatch without a discriminated union (loses exhaustiveness).
- ❌ Mutating `readonly` segment/palette data at runtime.
- ❌ Letting `s` escape `[0,1]` — clamp once, in `sun.ts`.
