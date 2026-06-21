# M0 — Implementation Plan

> Ordered, checkable build steps for M0. Companion to `prd.md` (the gate) and
> `design.md` (the how). **Status discipline:** this file is written during
> planning; execution begins only after `task.py start` (status → in_progress).
> Steps marked **[USER]** are interactive and run by the user via `! <cmd>`.

## Conventions
- All `npm`/`vite` commands run from `meridian/` unless noted.
- ✅ = validation command that must pass before moving on.
- 🔙 = rollback point (state is still cheaply reversible here).

---

## Stage A — Vite + TS scaffold  🔙 (delete `meridian/` to undo)

- [ ] A1. Probe git state at repo root: `git rev-parse --is-inside-work-tree`.
      Record result (env said "not a repo"; session said "detached/clean") —
      decides Stage E1.
- [ ] A2. Create `meridian/` and scaffold a Vite **vanilla-ts** project there
      (no framework). Pin to npm; generate `package-lock.json`.
- [ ] A3. Replace generated `tsconfig.json` with the strict config (design §8):
      `strict` + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
      `verbatimModuleSyntax`, `isolatedModules`, `noEmit`, `bundler` resolution,
      `ES2022` + `DOM` lib.
- [ ] A4. `vite.config.ts`: set `base: '/meridian/'`.
- [ ] A5. Edit `package.json` scripts: `dev`, `build` (`tsc --noEmit && vite build`),
      `preview`, `typecheck` (`tsc --noEmit`), `check:determinism`
      (`node scripts/check-determinism.mjs`).
- ✅ `npm install` && `npm run typecheck` (clean tree, passes).

## Stage B — `src/` skeleton (plan §10)  🔙

- [ ] B1. Create layer dirs: `engine/ game/ render/ audio/ data/ ui/ dev/`.
      Each non-spine layer gets a `.gitkeep` and/or an `index.ts` with a
      one-line "M0 placeholder — see plan.md §10" banner comment.
- [ ] B2. Remove Vite's sample files (`counter.ts`, `style.css` clutter,
      `typescript.svg`) — keep a clean `index.html` + `src/main.ts`.
- ✅ `npm run typecheck` still passes (stubs compile).

## Stage C — Determinism spine (the point of M0)

- [ ] C1. `engine/math.ts`: minimal `clamp`, `vec2` seed helpers (only what the
      loop/marker needs).
- [ ] C2. `engine/input.ts`: `InputSnapshot` type + keyboard listener + `sample()`
      returning an immutable snapshot (design §4). Reserve `R`/`Esc` keys (no-op).
- [ ] C3. `engine/loop.ts`: `startFixedLoop({ sampleInput, update, render })` with
      `DT = 1/120`, frame-delta clamp, fixed-step drain, `render(alpha)`, disposer
      (design §3). `now` stays at the boundary; never passed to `update`.
- [ ] C4. `main.ts`: get/create canvas (full-viewport, devicePixelRatio-aware),
      wire input, define the placeholder `DemoState`/`update`/`render` (horizon
      seam + tick-driven marker, design §5), `startFixedLoop(...)`.
- [ ] C5. `scripts/check-determinism.mjs`: scan `src/engine/**` + `src/game/**`
      for `Math.random` / `Date.now` / `new Date` / `performance.now`; non-zero
      exit + `file:line` on any hit (design §6).
- ✅ `npm run typecheck` — passes.
- ✅ `npm run check:determinism` — green (no hits).
- ✅ `npm run dev` — page shows the horizon seam + a marker moving via the
      fixed-step loop. **(AC1)**
- ✅ `npm run build` — succeeds; `npm run preview` serves the built app. **(AC2)**

## Stage D — OSS files (plan §15)  🔙

- [ ] D1. Root `.gitignore`: `node_modules/`, `meridian/dist/`,
      `meridian/public/music/*` with `!.gitkeep`; plus standard editor/OS noise.
- [ ] D2. Root `LICENSE` — MIT, holder `aierkuite` (confirm with user) + year 2026.
- [ ] D3. Root `README.md` placeholder: one-liner, "how to run/build"
      (`cd meridian && npm i && npm run dev`), and a **live demo** link
      placeholder to fill after AC6.
- [ ] D4. `meridian/public/music/.gitkeep` (CC0 slot; user tracks ignored).
- ✅ Re-confirm a clean local build after adding config (`npm run build`).

## Stage E — Git + GitHub + Pages  🔙 (local-only until E4 push)

- [ ] E1. If not already a repo (per A1): `git init` at root; ensure default
      branch is `main` (`git branch -M main`). Inspect `.trellis/.gitignore` so
      nothing personal is staged unintentionally; first review `git status`.
- [ ] E2. First commit: stage `plan.md`, `.trellis/` (minus its ignores),
      `meridian/`, root OSS files, `.github/`. Conventional message
      (`chore: M0 scaffold + fixed-step loop + Pages deploy`).
- [ ] **[USER]** E3a. `gh auth login` (capture GitHub username → fill AC6 URL).
- [ ] **[USER]** E3b. `gh repo create meridian --public --source . --remote origin`
      (or create on github.com + `git remote add origin …`). 🔙 last point before
      anything is public.
- [ ] **[USER]** E4. `git push -u origin main`. **(AC4)**
- [ ] E5. `.github/workflows/deploy.yml` (design §7) — committed in E2 if ready,
      else commit now and push; the push triggers the workflow.
- [ ] **[USER]** E6. Enable Pages: repo Settings → Pages → Source = **GitHub
      Actions** (or `gh api` equivalent). One-time.

## Stage F — Verify the live gate

- [ ] F1. Watch the Actions run to green (`gh run watch` or the Actions tab). **(AC5)**
- [ ] F2. Open `https://<user>.github.io/meridian/`; confirm it **renders the
      running placeholder loop** (not a blank/404 — checks the `base` is right). **(AC6)**
- [ ] F3. Back-fill the live URL into `README.md`, `prd.md` (AC6), and the journal.

---

## Review gates
- **Gate 1 (after Stage C):** determinism spine reviewed — `update` pure, input
  sampled per step, guard green, loop visibly running. No gameplay crept in.
- **Gate 2 (before E4 push):** `git status` reviewed; no secrets / no non-CC0
  music / no `node_modules` or `dist` staged; LICENSE + README present.
- **Gate 3 (after F2):** AC1–AC6 all checked; URL recorded. → M0 done, ready for
  Phase 3 (finish-work: spec reconcile + commit) and then M1.

## Validation summary (run in order)
```bash
cd meridian
npm install
npm run typecheck         # AC2 (types)
npm run check:determinism # AC3
npm run build             # AC2 (build)
npm run dev               # AC1 (manual eyeball)
# … git/gh/push (USER) …  # AC4
# … Actions green …       # AC5
# open Pages URL          # AC6
```

## Rollback points (recap)
- 🔙 Before E2 commit: delete `meridian/` + root OSS files → repo untouched.
- 🔙 Before E3b repo-create: everything local; nothing public yet.
- 🔙 After push, Pages broken: revert the `deploy.yml` commit; repo persists,
  Pages goes stale. No external/data side effects beyond the GitHub repo itself.

## Notes for the implementer (spec compliance)
- Keep `update(dt, input)` pure: no `Date.now`/`performance.now`/`Math.random`/
  `new Date`, no canvas/DOM/audio reads (spec `project/determinism-and-testing.md`).
- `main.ts` = wiring only; the placeholder sim is explicitly throwaway (M1 → `game/`).
- All player-facing text English (plan §2 #13) — though M0 has ~none.
- Do **not** add Vitest / replay harness / physics / render glow — those are
  M1/M2 and out of scope here.
