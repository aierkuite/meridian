# Segments, Flow & Endings

> `src/game/segment.ts`, `src/game/consequence.ts`, `src/game/ending.ts`,
> `src/game/narration.ts`. How the journey runs and how it ends.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3.4, §3.5,
> §5, §10. Shapes are illustrative. Reconcile after M2/M4.

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

## Consequence state (`consequence.ts`) — write rules matter

A tiny serializable state recording how much **light** each half kept and whether
spending was **even or lopsided** (plan §3.5, §2 #19):

```ts
type Consequence = { solLight: number; lunaLight: number; shortcutsTaken: number };
```

- Written **ONLY at the 2–3 deliberate choice points** (a *cruel shortcut* that
  dims a core vs. the harder whole-hearted solution).
- **Incidental death NEVER writes consequence** — trial-and-error must not
  silently doom the player's ending. This rule is the difference between
  "authored cost" and "feels unfair"; guard it carefully (plan §13 risk row).

## Endings (`ending.ts`) — pure function of accumulated state

There is **no separate finale decision**. `ending.ts` maps the accumulated
`consequence` → exactly one of ~4 endings (plan §3.5):

| Ending | Trigger (accumulated state) | Tone |
|--------|------------------------------|------|
| **One Sky** | light kept (almost) full | transcendent, hardest-earned |
| **The Vow** | a few shortcuts, partial | bittersweet (most common) |
| **The Afterglow** | spending lopsided, one core near out | tragic (uneven) |
| **The Long Dark** | light spent to nothing | bleak (squandered) |

```ts
function resolveEnding(c: Consequence): Ending["id"] { /* pure; no input */ }
```

The replay harness must verify **all four are reachable** from appropriate states
(see [Determinism & Testing](../project/determinism-and-testing.md)).

## Narration (`narration.ts`) — adaptive, sparse

- Sparse, poetic, **English** (plan §6). Beat lines between segments.
- **Adaptive:** lines shift with `consequence` state. Voice is mythic omniscient,
  turning to second person ("you") at choice points and endings.
- **Graduated failure hints:** at a genuine stuck-point, narration softens into
  escalating hints (e.g. *"The sun need not be held so high."*) — the humane
  backstop **instead of** a free skip (plan §9). Text lives in
  [`data/story.ts`](../data/narration-text.md); `narration.ts` selects lines.

---

## Beat order (plan §5, MVP = Prologue + 7 beats + Reunion)

Prologue (move + mirror jump) → B1 ice (top) → B2 inverted ice bridge → *interlude
(consolidate, no new element)* → B3 vine⇄fungi → B4 door⇄gate (timing) → B5
balance mote (window) → B6 drift zone (hold-steady) → B7 master combination →
**Reunion** (mechanical fusion → earned ending). Choice points target ~B4 and ~B6.

---

## Forbidden

- ❌ Writing `consequence` from incidental death, or anywhere but a choice point.
- ❌ A last-second finale choice — the ending is read from accumulated state.
- ❌ Divergent level geometry per branch in MVP (branching = narration + ending).
- ❌ A free "skip level" button (use graduated hints).
