# Directory Structure

> How Meridian's code is organized, and the one boundary that matters most:
> **simulation vs. presentation.**

> **Status: Reconcile after M1/M2 (2026-06-22).** The app lives under
> `meridian/`; M1/M2 filled the gameplay, render, data, UI, and dev tooling
> spine. `dev/replay.ts` is the headless simulation gate, while
> `dev/debugOverlay.ts` is a dev-only visual diagnostic overlay.

---

## The `src/` tree (plan.md §10)

```
meridian/
  index.html
  package.json  tsconfig.json  vite.config.ts
  LICENSE  README.md  .gitignore        (ignores local user music)
  public/
    music/                              CC0 default track; user track gitignored
  src/
    main.ts                  bootstrap, canvas, RAF loop
    engine/                  ── SIMULATION (deterministic, render-free) ──
      loop.ts                fixed-timestep update + render split
      input.ts               keyboard state (sampled once per fixed step)
      math.ts                vec2, AABB helpers (pure)
      physics.ts             AABB platformer integration (per-world gravity sign)
      camera.ts              smooth scroll between segments
    game/                    ── SIMULATION (game rules) ──
      world.ts               dual-world model, mirror coupling, (finale) gravity blend
      sun.ts                 shared sun value: holding dial + drift zones + window queries
      player.ts              the two linked avatars (Sol & Luna)
      element.ts             base element: subscribe to s -> collision/visual (window bands)
      elements/              ice.ts vine.ts door.ts mote.ts  (stretch: shadow.ts hazard.ts)
      segment.ts             load data, check win, reset; stores a known solutionPath
      narration.ts           beat lines (adaptive to consequence) + graduated hints
      consequence.ts         tracked branch state (light spent at choice points only)
      ending.ts              selects 1 of ~4 endings purely from accumulated consequence
    render/                  ── PRESENTATION (canvas) ──
      renderer.ts            silhouette + glow pipeline
      palette.ts             warm/cool palettes, sun-driven sky gradient
      particles.ts           dust motes, spores, cross-horizon mote, aurora (stretch)
    audio/                   ── PRESENTATION (Web Audio) ──
      audio.ts               music load, sun-driven filter, procedural SFX
    data/                    ── CONTENT ──
      segments/              segment definitions (TS/JSON) + solutionPath
      story.ts               narration text (English)
    ui/                      ── PRESENTATION (DOM/overlay) ──
      hud.ts overlay.ts      pause, reset hint, graduated-hint backstop, title, endings (×4)
    dev/                     ── TOOLING ──
      replay.ts              auto-play each segment's solutionPath; assert solvable (CI/regression)
      debugOverlay.ts        s value, collision boxes, world bounds, drift state (toggle key)
```

---

## The boundary that matters: simulation ↔ presentation

This is the single most important structural rule, because it is **enforced by
the solvability harness** (`dev/replay.ts` runs the simulation *without* any
renderer or audio).

- **Simulation** = `engine/` + `game/` (+ it consumes `data/`). It is
  **deterministic** and **render-free**: it must never read the canvas, the
  DOM, the AudioContext, or wall-clock time. Given the same inputs it produces
  the same state every run. This is what makes the game testable and
  guaranteed-solvable.
- **Presentation** = `render/` + `audio/` + `ui/`. It **reads** simulation
  state and draws/plays it. It must **never mutate** simulation state, and the
  simulation must run correctly even if presentation is entirely absent.
- **`main.ts`** wires them together (canvas, RAF, instantiate systems).
- **`dev/`** is tooling — only loaded in dev builds.

If you find yourself importing `render/*` from `game/*`, stop: the dependency
arrow only points presentation → simulation, never the reverse.

> Maps onto the spec layers: `engine` layer = `src/engine/` + `src/game/`;
> `render`/`audio`/`ui`/`data` layers = the matching `src/` dirs.

## Dev tooling boundary

Development helpers may visualize or replay simulation state, but they must not
change the gameplay contract:

- `src/dev/replay.ts` imports simulation (`engine/`, `game/`) and data only. It
  must not import `render/`, `audio/`, `ui/`, canvas, DOM, or debug overlay code.
- `src/dev/debugOverlay.ts` is visual-only and read-only. It may read
  `JourneyState`, `SegmentState`, and `CameraState`, then draw diagnostics after
  the main renderer.
- The debug overlay toggle is `Backquote` and is tracked in `main.ts`, outside
  `InputSnapshot`. `InputSnapshot` is consumed directly by replay, so debug
  commands must not be added to it.
- The overlay is guarded by `import.meta.env.DEV`; production builds should
  tree-shake the call path. Do not rely on runtime-only flags for shipping
  builds.
- Rendering hot paths, including debug overlay diagnostics, must not use
  `shadowBlur`.

---

## Naming conventions

- One system per file; filename = the system, lowercase (`sun.ts`, `world.ts`).
- Element variants live under `game/elements/` named by the element
  (`ice.ts`, `vine.ts`, `door.ts`, `mote.ts`).
- Segment data files live under `data/segments/`, one beat per file.
- Types and helpers stay near their owner; only truly shared primitives
  (`vec2`, `AABB`) live in `engine/math.ts`.
