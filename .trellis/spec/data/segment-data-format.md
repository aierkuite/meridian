# Segment Data Format

> `src/data/segments/*` — one beat per file.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3.4, §3.5,
> §10, M2. The schema below is illustrative — the real shape is settled in M2
> when the loader lands. Reconcile then.

---

## A segment declares (not executes)

Each segment is **data**: terrain for both worlds, element placements, exits, and
the recorded solution(s). Behavior is referenced by `kind`, never inlined.

```ts
// shape only — settle exact fields in M2
type SegmentData = {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];     // top world platforms
  readonly nightTerrain: readonly AABB[];   // bottom world platforms (independently designed)
  readonly elements: readonly ElementPlacement[]; // { kind, world, pos, band? }
  readonly exits: { readonly sol: AABB; readonly luna: AABB };
  readonly drift?: DriftProfile;            // back-third segments only
  readonly choicePoint?: ChoicePointData;   // ~2–3 segments only
  readonly solutionPaths: readonly InputSnapshot[][]; // ONE per branch — see below
};
```

## `solutionPath` — the solvability contract (mandatory)

Every segment ships **at least one** recorded `solutionPath`: a sequence of
per-step input snapshots known to bring **both** avatars to their exits with no
softlock. The replay harness (`dev/replay.ts`) auto-plays these on the
deterministic loop on every change (see
[Determinism & Testing](../project/determinism-and-testing.md)).

- A segment **without** a passing `solutionPath` is incomplete — do not merge it.
- A **choice-point** segment must ship a `solutionPath` for **both** branches
  (the cruel shortcut and the whole-hearted path), per plan §10 / M6.

## Choice points (plan §3.5)

The 2–3 deliberate branch drivers (target ~Beat 4 and ~Beat 6). The data declares
the two solvable routes and which one writes the light cost into
[`consequence`](../engine/segments-flow-and-endings.md). **Both routes must be
solvable**; the cruel one is faster but dims a core. Incidental death is never a
choice-point outcome.

## Authoring rules

- **Bounded & guaranteed-solvable** — keep segments small; that's what makes the
  harness reliable and resets cheap (plan §13).
- Two terrains that **echo** across the horizon but are **independently designed**
  (the puzzle is "find inputs that serve both").
- Mirror the day/night exits so the win check is symmetric.

---

## Forbidden

- ❌ A segment without a passing `solutionPath` (any branch).
- ❌ Inlining element/sun behavior in segment data — reference `kind`, keep
  behavior in `game/`.
- ❌ Mutating segment data at runtime (it's `readonly`).
- ❌ Unbounded / open-roam segments (plan §17: linear journey only).
