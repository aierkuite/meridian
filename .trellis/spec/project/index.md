# Project-Wide Conventions

> Cross-cutting rules that apply to **every** layer of Meridian (a browser
> dual-pole puzzle-platformer; TypeScript + vanilla Canvas 2D + Vite, no game
> framework). Layer-specific rules live in `engine/`, `render/`, `audio/`,
> `data/`, `ui/`.

> **Status: Plan-derived (pre-implementation).** No `src/` exists yet. These
> conventions are extracted from `plan.md` — the single source of truth (esp.
> §3 mechanics, §10 architecture). Examples cite the file paths and signatures
> *prescribed* by the plan, not code that exists today. **Reconcile with the
> real code once M0/M1 land**, then delete this banner.

---

## What lives here

| Guide | What it covers |
|-------|----------------|
| [Directory Structure](./directory-structure.md) | The `src/` tree, the simulation↔presentation boundary, file naming |
| [TypeScript Conventions](./typescript-conventions.md) | Strict TS, core types (`vec2`/`AABB`), discriminated unions for elements & endings |
| [Determinism & Testing](./determinism-and-testing.md) | **★ The spine.** Fixed-timestep, zero nondeterminism in sim, `solutionPath` replay/solvability harness |
| [Error Handling & Performance](./error-handling-and-perf.md) | Assertions, softlock detection, fail-safe loop, 60fps budget, allocation discipline |

---

## Pre-Development Checklist (read before writing any code)

- [ ] Am I writing **simulation** (deterministic, render-free) or **presentation** (touches canvas/audio/DOM)? They never mix — see [Directory Structure](./directory-structure.md).
- [ ] If simulation: have I avoided `Math.random()` / `Date.now()` / `performance.now()` / wall-clock reads? See [Determinism & Testing](./determinism-and-testing.md).
- [ ] Does this change keep every segment beatable on its `solutionPath` (both choice-point branches)?
- [ ] Am I allocating inside the per-frame path? Pool it. See [Error Handling & Performance](./error-handling-and-perf.md).
- [ ] Is all player-facing text **English** (Decision Ledger §2 #13)?

## Quality Check (verify before reporting done)

- [ ] `dev/replay.ts` solvability harness passes for every segment, both branches.
- [ ] No softlocks (manual pass on touched segments).
- [ ] 60fps held on the touched scene (no per-frame `shadowBlur`, no per-frame GC churn).
- [ ] No new nondeterminism leaked into the simulation path.
- [ ] `tsc` strict passes; no `any` introduced.

---

## Locked decisions that constrain all code (from `plan.md` §2)

These are **fixed** unless execution surfaces a defect — do not relitigate them in code review:

- **Stack:** TypeScript + vanilla Canvas 2D + Vite. **No game framework** (our dual-world + inverted-gravity + shared-sun model would fight engine physics).
- **Core model:** two linked avatars (Sol top / Luna bottom), one input vector drives both every frame; horizontal identical, vertical mirrored by inverted gravity. **No independent control, no turn-taking.**
- **Shared sun `s ∈ [0,1]`:** one value, *opposite* effects top vs bottom; holds in teaching beats, drifts in the back third.
- **Single linear playable path.** Branching = narration + ending only, driven by accumulated `consequence` state. No divergent level geometry in MVP.
- **Procedural art/audio.** Silhouette + glow render; procedural Web Audio SFX. No sprite-art backbone.
- **Open-source / English.** MIT code, English player text, GitHub Pages demo.
