# Meridian Spec — Game-Native Layers

> Coding guidelines for **Meridian**, a browser dual-pole puzzle-platformer
> (TypeScript + vanilla Canvas 2D + Vite, no game framework). The single source
> of truth for *what to build* is the root [`plan.md`](../../plan.md); this
> `spec/` is the source of truth for *how the code is written*.

> **Status: Plan-derived (pre-implementation).** There is no `src/` yet — every
> guideline is extracted from `plan.md` and flagged with a per-file banner.
> Reconcile each layer with the real code as it lands (M0 → M7), then drop the
> banners.

---

## Why these layers (not backend/frontend)

`trellis init` scaffolded generic `backend/` + `frontend/` spec buckets that
assume a server + DB + React app. Meridian is a **pure client-side Canvas game**
with no server, no database, and no component framework. We replaced those
buckets with **game-native layers** that mirror `plan.md` §10 and, crucially, the
one architectural boundary the project enforces: **simulation vs. presentation**.

Trellis discovers spec layers by directory scan (`spec/<layer>/`, single-repo
mode), so no tooling change was needed — `get_context.py --mode packages` lists
these automatically.

## The layers

| Layer | Concern | `src/` it governs |
|-------|---------|-------------------|
| [`project/`](./project/index.md) | Cross-cutting: directory structure, TypeScript, **★ determinism & testing**, error handling & perf | all |
| [`engine/`](./engine/index.md) | **Simulation** — deterministic, render-free | `engine/` + `game/` |
| [`render/`](./render/index.md) | Presentation — silhouette + glow on Canvas 2D | `render/` |
| [`audio/`](./audio/index.md) | Presentation — Web Audio: music, sun filter, procedural SFX | `audio/` |
| [`data/`](./data/index.md) | Content & schema — segments (+ `solutionPath`), narration text | `data/` |
| [`ui/`](./ui/index.md) | Presentation — HUD, pause/reset, title, ×4 endings | `ui/` |
| [`guides/`](./guides/index.md) | Cross-package *thinking* guides (pre-populated, not game-specific) | — |

**Start here:** [`project/`](./project/index.md) — and especially
[Determinism & Testing](./project/determinism-and-testing.md), the spine of the
project.

---

## Wiring layers into a task (jsonl manifests)

For sub-agent-capable platforms, each task's `implement.jsonl` / `check.jsonl`
lists which spec files to inject. Add entries with `task.py add-context`,
pointing at the **new layer paths**:

```bash
# implement context for a task touching the sun model:
python ./.trellis/scripts/task.py add-context <task-dir> implement \
  .trellis/spec/project/determinism-and-testing.md "Sim must stay deterministic"
python ./.trellis/scripts/task.py add-context <task-dir> implement \
  .trellis/spec/engine/dual-world-and-sun.md "Sun model contract"

# check context (always include the determinism + perf gates):
python ./.trellis/scripts/task.py add-context <task-dir> check \
  .trellis/spec/project/determinism-and-testing.md "Verify replay harness green"
```

**Rule of thumb for which layers to load:**

- *Any* simulation/data change → `project/determinism-and-testing.md` (always).
- Sun / world / physics / elements / segments → `engine/*` + `data/*`.
- Visual work → `render/*` (+ `project/error-handling-and-perf.md` for the 60fps budget).
- Audio → `audio/*`. UI/menus → `ui/*`. Content authoring → `data/*`.
