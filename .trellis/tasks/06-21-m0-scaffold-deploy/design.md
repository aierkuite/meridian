# M0 — Design

> Technical design for M0. Companion to `prd.md` (requirements) and
> `implement.md` (ordered steps). Honors `.trellis/spec/` — the
> **simulation ↔ presentation** boundary and the **determinism spine**.

## 1. Boundaries & contracts

The one architectural law M0 must establish (spec `README.md`,
`project/determinism-and-testing.md`):

```
            simulation (deterministic, render-free)   |  presentation (reads state)
  ┌──────────────────────────────────────────────┐   |  ┌───────────────────────────┐
  │ engine/  game/   ← update(dt, input) only     │   |  │ render/ audio/ ui/         │
  │   - fixed dt, no wall-clock, no Math.random    │  ─┼─▶│   - draw/play from state   │
  │   - no canvas/DOM/audio reads                  │   |  │   - never write sim state  │
  └──────────────────────────────────────────────┘   |  └───────────────────────────┘
                         ▲           main.ts = the ONLY meeting point (wiring)
                         └─ clock/RAF enters here, never crosses into update()
```

- **Data flow is one-way**: `update()` mutates sim state; presentation only
  *reads* it. No back-edges from render/audio/ui into the sim.
- **`main.ts`** owns the canvas, the `requestAnimationFrame` timestamp, input
  wiring, and constructs the loop. It contains no game rules.
- For M0 there is no real `game/` yet, so the placeholder sim-state + its
  trivial `update` live in `main.ts` as clearly-marked throwaway wiring; in M1
  they migrate into `game/`.

## 2. Repo layout (concrete)

Git root = `G:\June-Solstice-Game-Jam` (GitHub repo **`meridian`**):

```
June-Solstice-Game-Jam/            ← git root · GitHub repo "meridian"
  plan.md                          (tracked — source of truth)
  .trellis/                        (tracked — honors .trellis/.gitignore)
  .gitignore                       (root: node_modules, meridian/dist, user music)
  LICENSE                          (MIT)
  README.md                        (placeholder: concept + run/build + demo link)
  .github/workflows/deploy.yml     (Actions → Pages, builds meridian/)
  meridian/                        ← Vite app (the project)
    index.html
    package.json  tsconfig.json  vite.config.ts
    scripts/check-determinism.mjs  (CI guard, cross-platform Node)
    public/
      music/.gitkeep               (CC0 placeholder; user tracks gitignored)
    src/
      main.ts                      bootstrap: canvas + input + loop + M0 placeholder
      engine/
        loop.ts                    fixed-timestep driver (DT, clamp, drain, alpha)
        input.ts                   keyboard → immutable InputSnapshot (per-step)
        math.ts                    minimal vec2 / clamp helpers (seed only)
        camera.ts                  // STUB (M1/M2)
        physics.ts                 // STUB (M1)
      game/      .gitkeep + index banner   // STUB (M1)
      render/    .gitkeep + index banner   // STUB (M1)
      audio/     .gitkeep + index banner   // STUB (M1/M5)
      data/      .gitkeep + index banner   // STUB (M2)
      ui/        .gitkeep + index banner   // STUB (M1)
      dev/       .gitkeep + index banner   // STUB (M2 replay harness)
```

> Three same-named things, by design: local folder `June-Solstice-Game-Jam`
> (git root) ≠ GitHub repo `meridian` ≠ app subdir `meridian/`. The vite
> `base:'/meridian/'` derives from the **repo name**, not the subdir.

## 3. Core loop contract (`engine/loop.ts`)

Follows spec `engine/core-loop-and-input.md`. The clock enters only here; `dt`
handed to `update` is always the constant `DT`.

```ts
// shape only — final code in Phase 2
export const DT = 1 / 120;                 // fixed sim step (tunable in M2)
const MAX_FRAME_DELTA = 0.25;              // clamp: avoid spiral-of-death

export interface LoopCallbacks {
  readonly sampleInput: () => InputSnapshot;   // sampled once PER fixed step
  readonly update: (dt: number, input: InputSnapshot) => void;
  readonly render: (alpha: number) => void;    // alpha ∈ [0,1) for interpolation
}

export function startFixedLoop(cb: LoopCallbacks): () => void {
  let acc = 0, prev = 0, started = false, raf = 0;
  const frame = (now: number) => {            // `now` = RAF timestamp (presentation)
    if (!started) { prev = now; started = true; }
    acc += Math.min((now - prev) / 1000, MAX_FRAME_DELTA);
    prev = now;
    while (acc >= DT) { cb.update(DT, cb.sampleInput()); acc -= DT; }
    cb.render(acc / DT);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);     // disposer
}
```

- `requestAnimationFrame` (scheduling) lives in the loop driver; it is **not** a
  canvas/DOM *read* and never enters `update()`. The determinism guard greps for
  `Math.random` / `Date.now` / `new Date` / `performance.now` — none appear here.
- `update` receives only `(dt, input)`; it is the sole entry the M2 replay
  harness will drive.

## 4. Input contract (`engine/input.ts`)

```ts
export interface InputSnapshot {
  readonly moveX: -1 | 0 | 1;     // A/D or ←/→
  readonly jump: boolean;         // Space (edge-detected later for buffering)
  readonly sunDelta: -1 | 0 | 1;  // ↑ / ↓
}
```

- A keyboard listener maintains live key state on the presentation side; the
  loop calls `sampleInput()` once per fixed step to freeze an immutable snapshot.
- M0 wires the listener and the snapshot but consumes only enough to prove the
  pipeline (the placeholder marker may ignore input, or nudge on `moveX` — TBD,
  trivial). Reset (`R`) / pause (`Esc`) keys are reserved, not yet handled.

## 5. M0 placeholder simulation (proof of life)

A deterministic, render-free tick demo — the smallest thing that proves the
spine. No gameplay.

```ts
// in main.ts (throwaway; moves to game/ in M1)
interface DemoState { tick: number; }                 // integer step count
const sim: DemoState = { tick: 0 };
const update = (_dt: number, _in: InputSnapshot) => { sim.tick++; };  // pure
const render = (_alpha: number) => {
  // clear; draw horizon seam at canvas mid-height; draw a marker whose x is a
  // function of sim.tick (e.g. a triangle wave) — motion proves fixed-step sim.
};
```

- Marker position is a pure function of `sim.tick` (integer), **not** of
  `Date.now`/RAF time — so two machines at different refresh rates show the same
  per-tick trajectory. This is the determinism guarantee, made visible.

## 6. Determinism guard (`meridian/scripts/check-determinism.mjs`)

- A tiny Node script (cross-platform; no shell `grep`, works on Windows + CI
  Ubuntu). Recursively scans `src/engine/**` and `src/game/**` for the forbidden
  patterns and exits non-zero on any hit, printing file:line.
- Patterns: `Math.random`, `Date.now`, `new Date`, `performance.now`.
- Wired as `npm run check:determinism` and run in CI before build. Trivially
  green in M0 (sim path is empty/placeholder), which is the point: the gate
  exists *before* the code it guards.

## 7. Deploy pipeline (`.github/workflows/deploy.yml`)

Official GitHub Pages + Actions flow; builds the `meridian/` subdir.

```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: meridian } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: meridian/package-lock.json }
      - run: npm ci
      - run: npm run check:determinism
      - run: npm run build            # tsc --noEmit && vite build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: meridian/dist }   # path is repo-root-relative
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- `working-directory: meridian` applies to `run` steps; `upload-pages-artifact`'s
  `path` is repo-root-relative, hence `meridian/dist`.
- `vite.config.ts`: `base: '/meridian/'` (constant; matches the project-pages
  URL path). `build` runs `tsc --noEmit` first so a type error fails CI.
- Pages source must be set to **GitHub Actions** once in repo settings (UI or
  `gh`), a one-time manual step recorded in `implement.md`.

## 8. Key config shapes

- **tsconfig** (strict): `"strict": true` + `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `isolatedModules`, `noEmit`, `moduleResolution:"bundler"`,
  `target/lib: ES2022 + DOM`.
- **package.json scripts**: `dev`/`build`/`preview`/`typecheck`/`check:determinism`.
- **.gitignore** (root): `node_modules/`, `meridian/dist/`, and
  `meridian/public/music/*` except `!meridian/public/music/.gitkeep` (and a
  future CC0 default track).

## 9. Tradeoffs & alternatives considered

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| App location | `meridian/` subdir | repo root | user choice; keeps plan.md/.trellis versioned at root |
| Deploy | Actions from `main` | `gh-pages` branch / `docs/` | no build artifacts in git; official, least-surprise pipeline |
| Determinism guard | Node script | shell `grep` / ESLint rule | cross-platform (Windows + CI); zero extra deps; ESLint is heavier than M0 needs |
| Loop RAF location | in `loop.ts` | in `main.ts` | matches spec shape; `now` still never reaches `update()` |
| Tests | none in M0 | Vitest now | plan puts the replay harness in M2; M0 gate = typecheck+build+deploy |

## 10. Compatibility, risks, rollback

- **Risk: wrong `base`** → blank Pages (404 assets). Mitigated by `base:'/meridian/'`
  matching the repo name; verified by AC6 (URL renders, not just 200).
- **Risk: Actions Pages not enabled** → deploy job fails. One-time settings step
  in `implement.md`; failure is visible/greppable in the Actions log.
- **Risk: git root already initialized / detached HEAD** (session reported
  detached-clean while env reported "not a git repo"). First implement step
  probes `git rev-parse` and branches: init if absent, else ensure `main`.
- **Rollback shape:** every step is additive and reversible before push. Hard
  rollback points: (a) before `git init`/first commit — delete `meridian/` +
  root OSS files; (b) before `git push` — local only, nothing public; (c) after
  push, if Pages misbehaves — revert the deploy workflow commit; the repo stays
  but Pages simply goes stale. No data migration, no external side effects beyond
  repo creation.
