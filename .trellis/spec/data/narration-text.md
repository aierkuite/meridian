# Narration Text

> `src/data/story.ts` — the words. Selection logic lives in
> [`game/narration.ts`](../engine/segments-flow-and-endings.md); this file is the
> text table.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §6. Reconcile
> after M4.

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
// shape only
export const STORY = {
  openings: { prologue: "Once, the sun and the moon shared one sky." },
  beats: { /* beatId -> line, some variants by consequence */ },
  choicePoints: { /* "There is a faster way. It costs a piece of the light." */ },
  endings: {
    "one-sky":   "Two became one light. And the sky forgot it was ever torn.",
    "vow":       "Until the next longest day.",
    "afterglow": "Whole again. One short.",
    "long-dark": "The line held. They did not cross.",
  },
  hints: [ /* graduated, escalating: "The sun need not be held so high." */ ],
} as const;
```

## Graduated failure hints (plan §9)

The humane backstop **instead of** a free skip: at a genuine stuck-point the lines
escalate in helpfulness. Keep them **gentle, not taunting**, and ordered from
subtle nudge → concrete tell.

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
