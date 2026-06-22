# Segment Data Format

> `src/data/segments/*` — one beat per file.

> **Status: Reconcile after M1/M2 (2026-06-22).** M2 settled the
> loader/replay-facing schema: `solutionPaths` is mandatory and stores compact
> run lists instead of per-frame arrays. M4 choice-point consequence fields
> remain future scope.

---

## A segment declares (not executes)

Each segment is **data**: terrain for both worlds, element placements, exits, and
the recorded solution(s). Behavior is referenced by `kind`, never inlined.

```ts
type SolutionInput = Pick<InputSnapshot, "moveX" | "jump" | "sunDelta">;

interface SolutionStep {
  readonly frames: number;
  readonly input: SolutionInput;
}

interface SolutionPath {
  readonly id: string;
  readonly branch?: "main" | "whole" | "shortcut";
  readonly maxFrames: number;
  readonly steps: readonly SolutionStep[];
}

type SegmentData = {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];     // top world platforms
  readonly nightTerrain: readonly AABB[];   // bottom world platforms (independently designed)
  readonly elements: readonly ElementPlacement[]; // { kind, world, pos, band? }
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: { readonly sol: AABB; readonly luna: AABB };
  readonly drift?: DriftProfile;            // back-third segments only
  readonly choicePoint?: ChoicePointData;   // ~2–3 segments only
  readonly solutionPaths: readonly SolutionPath[];
};
```

## `solutionPaths` — the replay contract (mandatory)

### 1. Scope / Trigger

M2 changed the segment-to-replay contract. Every segment must ship **at least
one** compact `SolutionPath` known to bring **both** avatars to their exits with
no reset or timeout. The replay harness (`dev/replay.ts`) expands each path and
auto-plays it on the same deterministic `updateSegment` path as gameplay.

### 2. Signatures

- `SolutionInput = Pick<InputSnapshot, "moveX" | "jump" | "sunDelta">`
- `SolutionStep = { readonly frames: number; readonly input: SolutionInput }`
- `SolutionPath = { readonly id: string; readonly branch?: "main" | "whole" | "shortcut"; readonly maxFrames: number; readonly steps: readonly SolutionStep[] }`
- `SegmentData.solutionPaths: readonly SolutionPath[]`

### 3. Contracts

- `frames` is a positive fixed-step frame count for one held input run.
- `input` contains only in-segment gameplay intent: `moveX`, `jump`, and
  `sunDelta`.
- `restart` and `pause` are intentionally excluded from `SolutionInput`; replay
  proves the authored route, not UI affordances.
- `maxFrames` is the timeout ceiling for that path.
- `branch` is optional before M4 choice points. When choice points land, each
  authored branch must have its own passing path.

### 4. Validation & Error Matrix

| Condition | Replay result / gate behavior |
|-----------|-------------------------------|
| `solutionPaths.length === 0` | `reason="missing-path"`; `npm run check:replay` fails |
| Expanded path does not reach both exits before `maxFrames` | `reason="timeout"`; gate fails |
| Segment death/reset occurs during replay | `reason="reset"`; gate fails |
| Segment reaches both exits with `resetCount === 0` | `reason="won"`; gate passes |

- A segment **without** a passing `solutionPath` is incomplete — do not merge it.
- A **choice-point** segment must ship a `solutionPath` for **both** branches
  (the cruel shortcut and the whole-hearted path), per plan §10 / M6.

### 5. Good/Base/Bad Cases

- Good: `m1-slice/main-hold-then-cross` uses compact runs to hold sun low, cross,
  hold sun high, then cross, and replays to `won`.
- Base: a non-choice segment has one `"main"` path with enough `maxFrames` budget.
- Bad: a per-frame `InputSnapshot[]` path, or a path that includes `restart` /
  `pause`, duplicates UI state and must be rejected in review.

### 6. Tests Required

- `npm run check:replay` from `meridian/` must pass for every segment path.
- `npm run check:determinism` must stay green after any data/gameplay change.
- Manual play is still required for touched geometry, but it never replaces the
  replay gate.

### 7. Wrong vs Correct

#### Wrong

```ts
solutionPaths: [[
  { moveX: 1, jump: false, sunDelta: 0, restart: false, pause: false },
]]
```

#### Correct

```ts
solutionPaths: [
  {
    id: "main-hold-then-cross",
    branch: "main",
    maxFrames: 1500,
    steps: [
      { frames: 220, input: { moveX: 1, jump: false, sunDelta: 0 } },
    ],
  },
]
```

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
