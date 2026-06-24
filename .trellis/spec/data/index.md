# Data Layer — Content & Schema

> `src/data/` (segment definitions + narration text). The **content** the
> simulation consumes. Data is `readonly` to the runtime — the simulation reads
> it, never rewrites it.

> **Status: Reconcile after M4 (2026-06-24).** M2 settled segment data,
> starts/exits, and compact `solutionPaths`. M4 landed formal journey exports,
> choice-point data, finale data, narration text, adaptive lines, and hints.

---

## What lives here

| Guide | What it covers |
|-------|----------------|
| [Segment Data Format](./segment-data-format.md) | Segment schema: terrain top+bottom, elements, exits, **`solutionPath`**, choice points |
| [Narration Text](./narration-text.md) | `story.ts`: English beat lines, adaptive-to-consequence, graduated hints |

---

## Pre-Development Checklist

- [ ] Does every new/edited segment carry a **`solutionPath`** for each branch?
- [ ] Is the segment **bounded and guaranteed-solvable** (will the harness pass)?
- [ ] Is all narration **English** and sparse (plan §6, §2 #13)?
- [ ] Is data typed `readonly` so the runtime can't mutate it?

## Quality Check

- [ ] `dev/replay.ts` passes for the new/edited segment, both branches.
- [ ] Choice points write **consequence** correctly; no incidental-death writes.
- [ ] Narration lines exist for the relevant `consequence` states.

---

## Principle: content is data, behavior is code

Segments are **data-driven** (plan §10): a segment file declares terrain,
element placements, exits, and a recorded `solutionPath` — it does **not** contain
behavior. Element behavior lives in [`game/elements/`](../engine/elements.md);
the sun model lives in [`game/sun.ts`](../engine/dual-world-and-sun.md). This is
what keeps "one sun, opposite effects" data-clean and the journey easy to extend
without touching engine code.
