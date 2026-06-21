# Render Layer — Silhouette + Glow

> `src/render/` (renderer, palette, particles). The **presentation** of the
> simulation onto Canvas 2D. It **reads** simulation state and draws it; it never
> mutates simulation state (see
> [Directory Structure](../project/directory-structure.md)).

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §7, §10.
> Reconcile after M1/M5.

---

## What lives here

| Guide | What it covers |
|-------|----------------|
| [Silhouette + Glow Pipeline](./silhouette-glow-pipeline.md) | Gradient sky, silhouette fills, offscreen glow sprites + additive compositing, sun-driven palette |
| [Particles](./particles.md) | Pooled particle layers: dust motes, spores, cross-horizon mote, aurora (stretch) |

---

## Pre-Development Checklist

- [ ] This is **presentation** — am I only *reading* simulation state, never writing it?
- [ ] Am I about to use per-frame `ctx.shadowBlur`? Don't — pre-render glow (see pipeline guide).
- [ ] Am I allocating per frame? Pool it (see [Error Handling & Performance](../project/error-handling-and-perf.md)).
- [ ] Does the look stay **colorblind-friendly by construction** (worlds differ by position + brightness, not hue alone — plan §9)?

## Quality Check

- [ ] 60fps held on the scene with glow + particles active.
- [ ] No `shadowBlur` in the per-frame hot path.
- [ ] Renderer runs purely from simulation state; disabling it leaves the sim correct.
- [ ] Warm top / cool bottom / luminous horizon reads clearly.

---

## The look (plan §7)

- **Top (Day):** warm amber→gold gradient sky; long warm shadows; floating dust.
- **Bottom (Night):** deep indigo→near-black; cyan/magenta bioluminescence; thin
  aurora ribbon (stretch).
- **Horizon:** a luminous seam where the two worlds mirror and meet.
- **Avatars:** clean silhouettes with a **glowing core** — Sol warm, Luna cool.
  The core's brightness encodes spent light (consequence) — art carries theme.
- **Sun dial:** a subtle on-screen arc/orb reflecting `s` (rendered by `ui/`).
- AI/CC0 assets only for incidental texture — never the visual backbone.
