# Narration Text

> `src/data/story.ts` — the words. Selection logic lives in
> [`game/narration.ts`](../engine/segments-flow-and-endings.md); this file is the
> text table.

> **Status: Reconcile after M4 (2026-06-24).** `story.ts` now owns the text
> table; `game/narration.ts` owns deterministic selection for beat lines,
> adaptive lines, choice prompts, graduated hints, and ending text.

---

## Voice & rules (plan §6)

- **English**, sparse, poetic. Players skim — quality over quantity.
- **Mythic omniscient** voice ("Once, the sun and the moon…"), turning to
  **second person ("you")** at choice points and endings to land the cost.
- **Adaptive:** lines are keyed to `consequence` state so the journey's tone
  shifts with how the player has spent light.

## Structure the text as data

Keep `story.ts` a `readonly` table keyed by beat and (where adaptive) by
consequence/ending — so `narration.ts` just selects, and translators/editors
touch only this file.

```ts
interface EndingText {
  readonly title: string;
  readonly closer: string;
}

interface StoryTable {
  readonly openings: Readonly<Record<string, string>>;
  readonly beats: Readonly<Record<string, string>>;
  readonly choicePrompts: Readonly<Record<ChoicePointId, string>>;
  readonly adaptive: Readonly<Record<ConsequenceBand, string>>;
  readonly hints: Readonly<Record<string, readonly string[]>>;
  readonly endings: Readonly<Record<EndingId, EndingText>>;
}
```

Keep these fields as plain data. Do not import `game/narration.ts` from
`story.ts`, and do not bury player-facing prose in `narration.ts`.

## Selection logic (`game/narration.ts`)

`narration.ts` is the only selector layer between simulation state and text:

```ts
function beatLineFor(segmentId: string): string | undefined;
function adaptiveLineFor(consequence: Consequence): string;
function choicePromptFor(id: ChoicePointId): string;
function hintLineFor(segmentId: string, frameInSegment: number): string | undefined;
function endingTextFor(id: EndingId): EndingText;
```

- `beatLineFor` prefers `STORY.openings[segmentId]`, then
  `STORY.beats[segmentId]`.
- `adaptiveLineFor` uses `consequenceBand(consequence)`.
- `choicePromptFor` is keyed by closed `ChoicePointId`.
- `endingTextFor` is keyed by closed `EndingId`; UI must pass the resolved
  ending id, not recompute ending rules.

## Graduated failure hints (plan §9)

The humane backstop **instead of** a free skip: at a genuine stuck-point the lines
escalate in helpfulness. Keep them **gentle, not taunting**, and ordered from
subtle nudge → concrete tell.

### 1. Scope / Trigger

Hints are a presentation backstop for authored content, not a gameplay mechanic.
They are selected from `STORY.hints[segmentId]` by deterministic frame counters.

### 2. Signatures

- `SegmentState.frameInSegment: number`
- `hintLineFor(segmentId, frameInSegment): string | undefined`

### 3. Contracts

- Hints must depend only on segment id and deterministic fixed-step frame count.
- `resetSegment` resets `frameInSegment` for the current segment; it does not
  change consequence.
- `hintLineFor` returns `undefined` before the first threshold or when a segment
  has no hint ladder.
- Hints must never expose a skip, teleport, auto-solve, level-select, or ending
  override affordance.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| No hint ladder for segment | no hint |
| Frame count below first threshold | no hint |
| Frame count crosses thresholds | show the matching ladder entry, capped at last entry |
| Reset current segment | clear the hint timer by resetting `frameInSegment` |

### 5. Good/Base/Bad Cases

- Good: "Hold the sun near the edge of its window — not the center."
- Base: no hint shown during normal quick replay.
- Bad: "Press K to skip this segment."

### 6. Tests Required

- `npm run typecheck` for closed ids and text table shape.
- Manual browser review for readability and absence of skip affordances.

### 7. Wrong vs Correct

#### Wrong

```ts
if (frameInSegment > threshold) {
  state.status = "won";
}
```

#### Correct

```ts
return STORY.hints[segmentId]?.[hintIndex];
```

## Seed lines (plan §6 — refine in execution)

- Open: *"Once, the sun and the moon shared one sky."*
- After the split: *"Then came the longest day — and the longest night. And they were two."*
- Midway: *"What lifts one world drowns the other. Still — they move as one."*
- At a choice point: *"There is a faster way. It costs a piece of the light."*
- Before the meridian: *"All lines meet somewhere. Not all who reach them remain."*

---

## Forbidden

- ❌ Non-English player-facing text (plan §2 #13).
- ❌ Dialogue / faces — silhouettes and light carry the story (plan §6).
- ❌ Putting selection logic in `story.ts` (text only) or burying text in
  `narration.ts` (logic only).
- ❌ Taunting hints, or a hint that hands over a free skip.
