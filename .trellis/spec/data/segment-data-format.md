# Segment Data Format

> `src/data/segments/*` — one beat per file.

> **Status: Reconcile after M4 (2026-06-24).** M2 settled compact
> `solutionPaths`; M4 added the formal journey export, choice-point metadata,
> finale metadata, branch coverage, and ending reachability.

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

interface ChoicePointData {
  readonly id: ChoicePointId;
  readonly shortcutZone: {
    readonly world: WorldId;
    readonly box: AABB;
  };
  readonly cost: LightCost;
  readonly storyKey: string;
}

interface FinaleData {
  readonly solsticeMarks: {
    readonly sol: AABB;
    readonly luna: AABB;
  };
  readonly sunWindow: { readonly min: Sun01; readonly max: Sun01 };
  readonly holdFrames: number;
  readonly dissolveFrames: number;
}

type SegmentData = {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];     // top world platforms
  readonly nightTerrain: readonly AABB[];   // bottom world platforms (independently designed)
  readonly elements: readonly ElementPlacement[]; // { kind, world, pos, band? }
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: { readonly sol: AABB; readonly luna: AABB };
  readonly initialSun?: Sun01;
  readonly drift?: DriftProfile;            // back-third segments only
  readonly choicePoint?: ChoicePointData;   // ~2–3 segments only
  readonly finale?: FinaleData;             // Reunion only
  readonly solutionPaths: readonly SolutionPath[];
};
```

## Formal journey export (M4)

`src/data/index.ts` is the player-facing journey order. It exports the formal M4
chain and must end with Reunion rather than a fixture loop:

1. `prologue-splitting`
2. `beat-1-day-ice`
3. `beat-2-night-bridge`
4. `interlude-ice-echo`
5. `beat-3-vine-fungi`
6. `beat-4-doors-choice`
7. `beat-5-balance-mote`
8. `beat-6-drift-choice`
9. `beat-7-master-choice`
10. `reunion-meridian`

M1/M3 fixture segment files may remain under `data/segments/` for developer
reference, but they must not appear in this exported player-facing chain.

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
- `branch` is optional for legacy fixtures, but formal M4 content should use
  `"main"` for non-choice routes and both `"whole"` and `"shortcut"` on every
  choice-point segment.

### 4. Validation & Error Matrix

| Condition | Replay result / gate behavior |
|-----------|-------------------------------|
| `solutionPaths.length === 0` | `reason="missing-path"`; `npm run check:replay` fails |
| Expanded path does not reach both exits before `maxFrames` | `reason="timeout"`; gate fails |
| Segment death/reset occurs during replay | `reason="reset"`; gate fails |
| Segment reaches both exits with `resetCount === 0` | `reason="won"`; gate passes |
| `choicePoint` segment lacks `whole` or `shortcut` path | branch coverage gate fails |
| `whole` path touches shortcut zone | branch coverage gate fails |
| `shortcut` path misses shortcut zone | branch coverage gate fails |

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

## Choice points (M4)

### 1. Scope / Trigger

Choice-point metadata is data-only. It declares where the authored cruel
shortcut is and how much light it costs, but it does not execute behavior.
Runtime detection lives in `game/segment.ts`; cross-segment consequence writes
live in `game/journey.ts` / `game/consequence.ts`.

### 2. Signatures

- `ChoicePointId = "doors-cost" | "drift-cost" | "master-cost"`
- `ChoicePointData.id: ChoicePointId`
- `ChoicePointData.shortcutZone: { world: WorldId; box: AABB }`
- `ChoicePointData.cost: LightCost`
- `ChoicePointData.storyKey: string`
- `SolutionPath.branch: "whole" | "shortcut"` for choice segments

### 3. Contracts

- A choice segment must carry exactly one `choicePoint`.
- It must provide at least one passing `branch: "whole"` path and one passing
  `branch: "shortcut"` path.
- The `shortcutZone` must be placed so the shortcut route overlaps it and the
  whole route does not.
- `cost` is authored data; clamping is owned by `game/consequence.ts`, not by
  segment files or render.
- `storyKey` should match the choice id unless there is a deliberate narration
  reuse need.

M4's authored choice points are:

| Segment | Choice id | Cost |
|---------|-----------|------|
| `beat-4-doors-choice` | `doors-cost` | `{ sol: 0.5, luna: 0 }` |
| `beat-6-drift-choice` | `drift-cost` | `{ sol: 0, luna: 0.5 }` |
| `beat-7-master-choice` | `master-cost` | `{ sol: 0.5, luna: 0.5 }` |

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| Choice segment has no whole path | `npm run check:replay` fails |
| Choice segment has no shortcut path | `npm run check:replay` fails |
| Whole path overlaps shortcut zone | branch coverage fails |
| Shortcut path misses shortcut zone | branch coverage fails |
| Shortcut cost makes one or both lights lower | allowed; ending resolver owns interpretation |

### 5. Good/Base/Bad Cases

- Good: a high jump over a closed door passes through a clearly separate
  `shortcutZone`, while opening the door and walking through stays outside it.
- Base: a non-choice beat uses `branch: "main"` and omits `choicePoint`.
- Bad: using `branch: "shortcut"` without any zone overlap; replay would claim a
  cost path that gameplay never records.

### 6. Tests Required

- `npm run check:replay` from `meridian/`.
- Manual review that the shortcut zone is signposted by text/level geometry and
  is not an accidental death/reset path.

### 7. Wrong vs Correct

#### Wrong

```ts
solutionPaths: [{ id: "fast", branch: "shortcut", maxFrames: 900, steps }]
```

#### Correct

```ts
choicePoint: {
  id: "doors-cost",
  shortcutZone: { world: "day", box },
  cost: { sol: 0.5, luna: 0 },
  storyKey: "doors-cost",
},
solutionPaths: [
  { id: "whole-open-the-door", branch: "whole", maxFrames: 1500, steps },
  { id: "shortcut-leap-the-door", branch: "shortcut", maxFrames: 1500, steps },
]
```

## Finale data (M4)

Only `reunion-meridian` should carry `finale`. The data declares solstice marks,
the accepted sun window, and deterministic frame counts for hold and dissolve.
See [Dual-World & Sun](../engine/dual-world-and-sun.md) for the runtime contract.

## Authoring rules

- **Bounded & guaranteed-solvable** — keep segments small; that's what makes the
  harness reliable and resets cheap (plan §13).
- Two terrains that **echo** across the horizon but are **independently designed**
  (the puzzle is "find inputs that serve both").
- Mirror the day/night exits so the win check is symmetric.

---

## Forbidden

- ❌ A segment without a passing `solutionPath` (any branch).
- ❌ Exporting mechanic fixtures as the formal player-facing journey.
- ❌ Inlining element/sun behavior in segment data — reference `kind`, keep
  behavior in `game/`.
- ❌ Mutating segment data at runtime (it's `readonly`).
- ❌ Unbounded / open-roam segments (plan §17: linear journey only).
