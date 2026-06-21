# M0 — Repo Scaffold + Fixed-Step Loop + Pages Deploy

> Milestone M0 of Meridian (plan.md §11). **Deploy-first**: prove the whole
> push → build → publish chain *before* any gameplay. Sources of truth:
> `plan.md` §10 (structure), §11 (M0 gate), §14/§15 (DoD / OSS delivery).
> Code conventions: `.trellis/spec/` — esp.
> `project/determinism-and-testing.md` and `engine/core-loop-and-input.md`.

## Goal

Stand up the Meridian repository and a reachable live deployment with **zero
gameplay**. Concretely: a Vite + TypeScript (strict) project whose `src/`
mirrors plan.md §10, a deterministic fixed-timestep core loop (update/render
decoupled) that is *visibly* running, and a public GitHub repo whose `main`
branch auto-builds to a live GitHub Pages URL. This de-risks the entire
delivery pipeline and erects the determinism spine the project's QA strategy
depends on — from the first commit, before any sim code exists.

## Requirements

### R1 — Scaffold (plan §10)
- Vite + TypeScript project, `tsconfig` **strict**, living in the `meridian/`
  subdirectory of the repo root `G:\June-Solstice-Game-Jam`.
- `src/` skeleton mirroring §10: `engine/ game/ render/ audio/ data/ ui/ dev/`
  + `main.ts`. Spine implemented (`engine/loop.ts`, `engine/input.ts`, minimal
  `engine/math.ts`); the other layers are created as stubs carrying a
  "plan-derived, M0 placeholder" banner so the tree is navigable but empty.
- npm scripts: `dev`, `build`, `preview`, `typecheck`, `check:determinism`.

### R2 — Core loop (spec `engine/core-loop-and-input.md` + `project/determinism-and-testing.md`)
- Fixed-timestep loop (`DT = 1/120`, tunable later): an accumulator drains in
  fixed `update(dt, input)` steps; `render(alpha)` is decoupled; the frame
  delta is **clamped** to avoid the spiral-of-death.
- Input is sampled **once per fixed step** into an immutable `InputSnapshot`.
- `update()` is pure w.r.t. wall-clock: **no** `Date.now` / `new Date` /
  `performance.now` / `Math.random`, and **no** canvas/DOM/audio reads. The
  clock (`now`) enters only at the loop boundary and never reaches `update()`.
- `main.ts` is wiring only — no game rules.
- Visible-but-trivial proof: clear the canvas, draw the horizon seam, and a
  marker whose motion is driven by the **integer sim-tick count** (not
  wall-clock), so the fixed-step spine is observable on screen.

### R3 — OSS + repo hygiene (plan §15)
- `git` repo rooted at `G:\June-Solstice-Game-Jam` (so `plan.md` + `.trellis/`
  travel with it); `main` is the default branch.
- `.gitignore` ignores `node_modules/`, build output (`meridian/dist/`), and
  **non-CC0 user music** under `meridian/public/music/` (keep a tracked CC0
  placeholder / `.gitkeep`).
- `LICENSE` (MIT) + minimal placeholder `README.md` (concept one-liner, how to
  run/build, live-demo link).

### R4 — Deploy (plan §11 hard gate, §15)
- Public GitHub repo named **`meridian`**.
- GitHub **Actions** workflow: on push to `main`, build `meridian/` and publish
  to Pages via the official `configure-pages` + `upload-pages-artifact` +
  `deploy-pages` actions.
- Vite `base: '/meridian/'` so asset URLs resolve under the project-pages path.

## Acceptance Criteria (M0 hard gate — plan §11)

- [x] AC1 `npm install` then `npm run dev` serves a page showing the horizon
      seam + a marker animated by the fixed-step loop (verified locally).
- [x] AC2 `npm run build` succeeds and `npm run typecheck` passes under strict TS.
- [x] AC3 `npm run check:determinism` reports **no** `Math.random` / `Date.now`
      / `new Date` / `performance.now` under `src/engine/` or `src/game/`.
- [x] AC4 Code is pushed to **`main`** on the public GitHub repo `meridian`
      (`https://github.com/aierkuite/meridian`).
- [x] AC5 The GitHub Actions deploy workflow run is **green**. Run #1 failed at
      `configure-pages` (repo was private at push time → Pages unavailable);
      after flipping public + enabling Pages source = GitHub Actions, run #2's
      build (`npm ci` / `check:determinism` / `build` all success) + deploy
      succeeded — proven by AC6 (the only way Pages serves this content).
      *(Direct run-conclusion read was blocked by GitHub API rate limit on the
      proxy exit IP; Pages-live evidence is conclusive.)*
- [x] AC6 **The GitHub Pages URL `https://aierkuite.github.io/meridian/` is
      reachable** (HTTP 200, `<title>Meridian</title>`) and serves the built
      bundle at the correct base path (`/meridian/assets/index-BKHen-Jg.js` →
      200), so the placeholder loop runs client-side. ← defining gate of M0. ✅

## Definition of Done
- All acceptance criteria checked.
- `tsc` strict green; build green; determinism guard green; Actions green.
- README placeholder + MIT LICENSE present; `.gitignore` protects user music.
- **No** gameplay / art / audio introduced (scope discipline held).
- The live Pages URL is recorded back into this PRD and the developer journal.

## Out of Scope (M0)
- Any gameplay: avatars, mirror-sync, sun model `s`, elements, segments,
  narration, consequence/endings (M1+).
- Rendering beyond the horizon seam + a debug marker; no glow / particles /
  palette / silhouettes (M1/M5).
- Any audio — no Web Audio, no music loading, no sun-driven filter (M1/M5).
- The `solutionPath` replay/solvability harness and Vitest test runner (M2).
- Physics, camera scroll, coyote-time / jump-buffer (M1/M2).
- Custom domain, analytics, PWA, full cross-browser matrix (later).

## Decision (ADR-lite)
**Context:** plan §10 literally draws a `meridian/` wrapper, but the repo root
already holds `plan.md` + `.trellis/`; and M0's only gate is "pushed to `main`
+ reachable live URL."

**Decisions:**
1. **App in `meridian/` subdir; git root at the repo root.** Keeps `plan.md`
   (source of truth) and `.trellis/` versioned; Actions builds the subdir.
   *(user choice — overrode the "root" recommendation)*
2. **GitHub repo = `meridian`** → `base: '/meridian/'`, URL
   `https://<user>.github.io/meridian/`. *(user choice)*
3. **Deploy via GitHub Actions from `main`** (not a `gh-pages` branch or
   `docs/`): modern, keeps build artifacts out of git, official Pages pipeline.
   *(plan suggestion, confirmed)*
4. **Single task, no children.** M0's parts share one acceptance gate and are
   sequential/coupled — not independently verifiable deliverables.
5. **Determinism enforced from M0** via a CI grep guard scoped to
   `engine/` + `game/` — the cheapest insurance for "the spine"; set the
   discipline before any simulation code exists.

**Consequences:** Three names diverge and are documented to avoid confusion —
local folder `June-Solstice-Game-Jam` ≠ GitHub repo `meridian` ≠ app subdir
`meridian/`. The placeholder loop is throwaway; in M1 the sim moves into `game/`.

## Technical Notes
- Versions: Vite (latest), TypeScript strict, **npm**, CI **Node 20 LTS**.
- Interactive steps require the user (run via `! <cmd>` in-session):
  `gh auth login`, `gh repo create meridian --public ...`, the first
  `git push -u origin main`, and selecting Pages source = "GitHub Actions".
  The GitHub username is captured during `gh auth` and back-filled into AC6.
- MIT LICENSE holder defaults to `aierkuite` (git developer name) — confirm/edit.
- Full technical design → `design.md`; ordered build steps → `implement.md`.
- Spec anchors: `engine/core-loop-and-input.md`,
  `project/determinism-and-testing.md`, `project/directory-structure.md`,
  `project/index.md` (loaded into `implement.jsonl` / `check.jsonl`).
