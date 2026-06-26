# M7 Open Source Polish — Implementation Plan

## Preconditions

- Active task: `.trellis/tasks/06-26-m7-open-source-polish`.
- Run app commands from `meridian/`.
- On Windows, prefer `npm.cmd` if PowerShell blocks `npm.ps1`.
- Preserve unrelated user changes, especially the pre-existing
  `.trellis/config.yaml` modification.
- Do not add stretch scope.

## Step 1 — Load Context

- Read this task's `prd.md`, `design.md`, `implement.md`, `implement.jsonl`,
  and `check.jsonl`.
- Read `plan.md` §11 M7, §12 MVP freeze line, §14 definition of done, and §15
  open-source delivery.
- Read the spec files listed in `implement.jsonl`.
- Check `git status --short` before editing.

## Step 2 — Baseline Release Gate

Run from `meridian/`:

- `npm.cmd run typecheck`
- `npm.cmd run check:determinism`
- `npm.cmd run check:replay`
- `npm.cmd run build`

If any gate fails before M7 edits, fix only the narrow defect needed to restore
release readiness, then rerun the affected gate.

## Step 3 — README Rewrite

- Expand root `README.md` into the public release README.
- Include:
  - live demo URL;
  - concise hook and concept;
  - actual screenshot/GIF references;
  - controls/how-to-play;
  - local run/build commands;
  - quality commands;
  - local music override instructions;
  - credits and license notes.
- Keep player-facing prose English and avoid dumping internal planning detail.

## Step 4 — Capture and Optimize Release Media

- Start the game through dev server or production preview.
- Capture at least one still screenshot and one short animated preview from the
  actual game.
- Place media in a documentation path such as `docs/media/`.
- Optimize size enough for GitHub README use.
- Update README links to use repo-relative media paths.
- Smoke-check that the media renders in Markdown preview or by opening the files.

## Step 5 — License and Asset Hygiene

- Keep root `LICENSE` MIT.
- Decide whether README notes are sufficient or a small `NOTICE.md` is useful.
- If no external asset is added, document the procedural default bed as the
  clone-and-play default and leave `meridian/public/music/` with `.gitkeep`.
- If an external CC0 default asset is added, record its source/license proof and
  adjust `.gitignore` to whitelist only that asset while keeping local tracks
  ignored.
- Confirm no private user track or non-redistributable media is staged.

## Step 6 — Deployment Readiness

- Confirm `meridian/vite.config.ts` still uses `base: "/meridian/"`.
- Confirm `.github/workflows/deploy.yml` still builds from `meridian/` and
  uploads `meridian/dist`.
- Confirm README live URL matches the configured base and repository Pages URL.
- After push/deployment, verify `https://aierkuite.github.io/meridian/` when
  network/GitHub access is available. If it is not available, record the
  limitation and the local evidence.

## Step 7 — Manual Smoke Pass

Using the same build/dev server used for media capture, cover:

- title/start;
- movement and jump;
- sun raise/lower;
- one representative puzzle;
- pause and reset;
- finale or one ending path if reachable in the smoke window;
- audio unlock/default bed or documented browser limitation.

Record any issue and fix only release-blocking defects.

## Step 8 — Final Gate and Hygiene Review

Rerun from `meridian/`:

- `npm.cmd run typecheck`
- `npm.cmd run check:determinism`
- `npm.cmd run check:replay`
- `npm.cmd run build`

Then run `git status --short` and ensure the M7 diff contains only intended
documentation/media/config changes plus any narrow release fixes.

## Step 9 — Closeout

Record:

- automated command results;
- media files added;
- manual smoke coverage;
- license/asset decision;
- Pages verification result or limitation;
- any accepted deferrals.

After the task is fully implemented and checked, proceed through the normal
Trellis finish flow: spec update if durable contracts changed, commit, archive,
and mark MVP freeze complete.

## Rollback Points

- README/media changes can be reverted independently if the public story becomes
  inaccurate.
- Media files in `docs/media/` are safe to replace as a unit if capture quality
  or file size is poor.
- Any build/deploy config change must be reverted if local build or Pages
  workflow assumptions regress.
- Do not revert unrelated user changes.

## Future Sub-Agent Prompt Seed

`Active task: .trellis/tasks/06-26-m7-open-source-polish`

Read `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
Complete only the M7 open-source polish work: public README, real gameplay media,
license/asset hygiene, Pages readiness, release validation, and repo hygiene. Do
not add stretch mechanics or broad gameplay refactors.
