# Segments, Flow & Endings

> `src/game/segment.ts`, `src/game/consequence.ts`, `src/game/ending.ts`,
> `src/game/narration.ts`. How the journey runs and how it ends.

> **Status: Reconcile after M4 (2026-06-24).** M4 landed the formal journey,
> choice-point consequence state, pure ending resolver, adaptive narration,
> graduated hints, and terminal ending status. Stretch branch geometry and deeper
> finale gravity blending remain future scope.

---

## Segment runtime (`segment.ts`)

The journey is a **seamless linear chain** of bounded, guaranteed-solvable
segments (plan §3.4, §5). A segment:

- Loads its data (terrain top+bottom, element placements, exits, **`solutionPath`**)
  — see [Segment Data Format](../data/segment-data-format.md).
- Checks the **win condition**: **both** avatars reach their exits → seamless
  camera advance to the next segment.
- Handles **reset / checkpoint**: falls/death respawn the pair to the segment
  start. No grind, no progress loss beyond the current segment. Death is fair and
  readable; **it never feeds the branch** (plan §3.5).
- If a segment carries `finale`, the win condition is the finale gate, not
  normal exits. If it carries `choicePoint`, the segment only detects the
  shortcut zone; journey owns the cross-segment consequence write.

## Consequence state (`consequence.ts`) — write rules matter

A tiny serializable state recording how much **light** each half kept and whether
spending was **even or lopsided** (plan §3.5, §2 #19):

```ts
type ChoicePointId = "doors-cost" | "drift-cost" | "master-cost";
type ChoiceRoute = "whole" | "shortcut";

interface Consequence {
  readonly solLight: number;
  readonly lunaLight: number;
  readonly shortcutsTaken: number;
  readonly choices: Readonly<Record<ChoicePointId, ChoiceRoute | "unresolved">>;
}
```

### M4 consequence contract

#### 1. Scope / Trigger

Choice points are a cross-layer contract between `data/segments/*`,
`game/segment.ts`, `game/journey.ts`, `game/consequence.ts`, replay, narration,
and render. They are the only MVP branch driver and must stay authored,
deterministic, and replay-covered.

#### 2. Signatures

```ts
function createConsequence(): Consequence;
function spendShortcut(consequence: Consequence, id: ChoicePointId, cost: LightCost): Consequence;
function recordWhole(consequence: Consequence, id: ChoicePointId): Consequence;
function isResolved(consequence: Consequence, id: ChoicePointId): boolean;
```

#### 3. Contracts

- `createConsequence()` starts `solLight=1`, `lunaLight=1`,
  `shortcutsTaken=0`, and all three `choices` as `"unresolved"`.
- `spendShortcut(...)` is the **only** light-spending entry point. It clamps both
  lights to `[0,1]`, increments `shortcutsTaken`, and marks the choice
  `"shortcut"`.
- `recordWhole(...)` records that an authored whole route was completed. It does
  **not** spend light or increment `shortcutsTaken`.
- Normal exits never spend light. A choice segment may only write non-spending
  route bookkeeping (`recordWhole`) when it wins without a shortcut.
- Both route writers are idempotent. A resolved `ChoicePointId` must not be
  charged or reclassified later in the same run.
- `SegmentState.shortcutTriggered` is segment-local evidence. It may be cleared
  by `resetSegment`; `JourneyState.consequence` must not be cleared by segment
  reset, death, timeout, normal transition, or UI presentation.

#### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| Avatar overlaps `choicePoint.shortcutZone` | `shortcutTriggered=true`; journey calls `spendShortcut` once |
| Choice segment wins without shortcut | journey calls `recordWhole` once; no light spend |
| Choice id already resolved | route writer returns the existing state unchanged |
| Death / fall / replay reset | reset current segment only; no light spend |
| Non-choice segment wins | no `choices` entry changes |
| Replay timeout | test failure only; no gameplay consequence write |

#### 5. Good/Base/Bad Cases

- Good: Beat 4 shortcut overlaps `doors-cost`, spends Sol light once, then later
  resets preserve the spent light.
- Base: a non-choice teaching segment has no `choicePoint`; it never writes
  consequence.
- Bad: deducting light in `resetSegment`, from death, or from UI/replay timeout.

#### 6. Tests Required

- `npm run check:replay` must assert each `choicePoint` segment has passing
  `whole` and `shortcut` solution paths.
- Shortcut paths must trigger the shortcut zone; whole paths must not.
- `npm run check:replay` must prove all four ending ids are reachable from the
  authored choice combinations.
- `npm run check:determinism` must stay green after consequence or journey
  changes.

#### 7. Wrong vs Correct

##### Wrong

```ts
if (playerDied) {
  consequence = spendShortcut(consequence, "doors-cost", { sol: 0.5, luna: 0 });
}
```

##### Correct

```ts
if (segment.shortcutTriggered && consequence.choices[cp.id] === "unresolved") {
  consequence = spendShortcut(consequence, cp.id, cp.cost);
}
```

## Endings (`ending.ts`) — pure function of accumulated state

There is **no separate finale decision**. `ending.ts` maps the accumulated
`consequence` → exactly one of four endings (plan §3.5):

| Ending | Trigger (accumulated state) | Tone |
|--------|------------------------------|------|
| **One Sky** | light kept (almost) full | transcendent, hardest-earned |
| **The Vow** | a few shortcuts, partial | bittersweet (most common) |
| **The Afterglow** | spending lopsided, one core near out | tragic (uneven) |
| **The Long Dark** | light spent to nothing | bleak (squandered) |

```ts
type EndingId = "one-sky" | "vow" | "afterglow" | "long-dark";

function resolveEnding(consequence: Consequence): EndingId;
```

Thresholds are owned by `ending.ts`:

| Constant | Value | Meaning |
|----------|-------|---------|
| `NEAR_FULL` | `0.85` | one-sky full-light floor |
| `NEAR_ZERO` | `0.1` | long-dark depleted-light ceiling |
| `LOPSIDED_FLOOR` | `0.25` | afterglow one-half-nearly-out floor |
| `LOPSIDED_GAP` | `0.4` | afterglow imbalance gap |

Resolution order is part of the contract and must remain mutually exclusive:

1. `one-sky`: both lights `>= NEAR_FULL` and `shortcutsTaken === 0`
2. `long-dark`: both lights `<= NEAR_ZERO`
3. `afterglow`: lower light `<= LOPSIDED_FLOOR` or gap `>= LOPSIDED_GAP`
4. `vow`: every remaining partial-but-not-ruined state

Presentation reads `JourneyState.resolvedEnding`; it must not duplicate these
thresholds. The replay harness must verify **all four are reachable** from
authored choice combinations (see
[Determinism & Testing](../project/determinism-and-testing.md)).

## Journey terminal state and restart behavior

`JourneyStatus` is a closed union:

```ts
type JourneyStatus = "playing" | "transitioning" | "ending";
```

- Non-final wins enter `"transitioning"` and load the next formal segment.
- The final Reunion win resolves `resolveEnding(consequence)` once and enters
  `"ending"`. The journey must not loop back to segment 0 automatically.
- Pressing `R` while `"playing"` or `"transitioning"` resets only the current
  segment checkpoint and preserves consequence.
- Pressing `R` while `"ending"` restarts the whole journey from segment 0 with a
  fresh consequence and no resolved ending.

## Narration (`narration.ts`) — adaptive, sparse

- Sparse, poetic, **English** (plan §6). Beat lines between segments.
- **Adaptive:** lines shift with `consequence` state. Voice is mythic omniscient,
  turning to second person ("you") at choice points and endings.
- **Graduated failure hints:** at a genuine stuck-point, narration softens into
  escalating hints (e.g. *"The sun need not be held so high."*) — the humane
  backstop **instead of** a free skip (plan §9). Text lives in
  [`data/story.ts`](../data/narration-text.md); `narration.ts` selects lines.
- Hint selection is deterministic frame-count logic (`SegmentState.frameInSegment`)
  and must not mutate gameplay state.

---

## Beat order (plan §5, MVP = Prologue + 7 beats + Reunion)

Prologue (move + mirror jump) → B1 ice (top) → B2 inverted ice bridge → *interlude
(consolidate, no new element)* → B3 vine⇄fungi → B4 door⇄gate choice → B5
balance mote (window) → B6 drift choice → B7 master choice →
**Reunion** (mechanical fusion → earned ending). Choice points are B4
`doors-cost`, B6 `drift-cost`, and B7 `master-cost`.

---

## Forbidden

- ❌ Writing `consequence` from incidental death, or anywhere but a choice point.
- ❌ A last-second finale choice — the ending is read from accumulated state.
- ❌ Divergent level geometry per branch in MVP (branching = narration + ending).
- ❌ A free "skip level" button (use graduated hints).
