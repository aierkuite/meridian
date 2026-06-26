# M6 Tuning and QA — Implementation Plan

## Preconditions

- Active task: `.trellis/tasks/06-26-m6-tuning-qa`.
- Run commands from `meridian/`.
- On Windows, use `npm.cmd` instead of `npm` when PowerShell blocks `npm.ps1`.
- Do not add stretch scope. Fix only issues needed for M6 acceptance.

## Step 1 — Load Context

- Read this task's `prd.md`, `design.md`, `implement.md`,
  `implement.jsonl`, and `check.jsonl`.
- Read `plan.md` §11 M6, §12 MVP freeze line, and §14 acceptance criteria.
- Read the spec files listed in `implement.jsonl`.
- Check `git status` before editing and preserve unrelated user changes.

## Step 2 — Baseline Automated Gate

Run from `meridian/`:

- `npm.cmd run typecheck`
- `npm.cmd run check:determinism`
- `npm.cmd run check:replay`
- `npm.cmd run build`

If any gate fails, fix the narrow failing surface before manual QA. For replay
failures, update segment data and `solutionPaths` together.

## Step 3 — Replay and Data Review

- Inspect replay output for every formal segment.
- Confirm choice segments each have passing `whole` and `shortcut` paths.
- Confirm shortcut paths trigger their zones and whole paths do not.
- Confirm all four endings are reachable in the replay report.
- Review formal journey export so old fixture segments are not in the player
  chain.

## Step 4 — Manual Softlock and Difficulty Pass

Use `npm.cmd run dev` and play the formal journey:

- Prologue and Beats 1-3: movement, inverted gravity, ice, vine/fungi basics.
- Beat 4: door choice, whole route, shortcut route, signposting.
- Beat 5: balance mote window readability.
- Beat 6: drift hold-steady readability, whole route, shortcut route.
- Beat 7: master combination, whole route, shortcut route.
- Reunion: solstice marks, hold window, dissolve, ending transition.
- Reset/pause: `R` resets current segment during play; `Esc` pauses only during
  play; `R` on ending restarts the journey.

Record any softlock or unfairness with the exact segment and route.

## Step 5 — Tune Narrowly

For each confirmed issue:

- Prefer data tuning before engine changes.
- Keep controls and locked mechanics unchanged.
- Update hints only in `story.ts` / narration data shape, not by adding skip
  logic.
- Keep consequence writes limited to choice-point route resolution.
- After each data/simulation change, rerun `npm.cmd run check:determinism` and
  `npm.cmd run check:replay`.

## Step 6 — Consequence and Ending Pass

- Verify shortcut choices visibly dim the intended core(s).
- Verify incidental falls/deaths do not change `consequence`.
- Reach or force-test each authored ending path without adding shipped ending
  selectors.
- Confirm each ending screen text and audio mood matches `resolvedEnding`.

## Step 7 — Audio, Render, UI, and Performance Pass

- Verify first key gesture unlocks audio and title Space does not leak into a
  first-frame jump.
- Check sun filter response while raising/lowering the sun.
- Trigger representative jump, sun, element, choice-cost, fusion, and ending
  cues.
- Inspect render hot paths for runtime `ctx.shadowBlur`, uncapped particles,
  per-frame allocations, and loop logging.
- Check readability of HUD, hints, finale progress, and all four endings at
  common viewport sizes.
- Confirm the game feels near 60fps in dense glow/particle/finale scenes.

## Step 8 — Browser Pass

- Test locally in Chrome.
- Test locally in Firefox.
- Test Safari only if an Apple-platform target is available; otherwise document
  the limitation explicitly in the task closeout.
- For each browser tested, cover title/start, movement, sun control, audio
  unlock/filter, one choice point, pause/reset, and one ending.

## Step 9 — Final Gate and Closeout

Rerun from `meridian/`:

- `npm.cmd run typecheck`
- `npm.cmd run check:determinism`
- `npm.cmd run check:replay`
- `npm.cmd run build`

Then record:

- command results
- manual softlock coverage
- browser coverage and Safari status
- performance observations
- accepted deferrals, if any
- spec updates, if durable contracts changed

## Rollback Points

- Segment data and `solutionPaths`: revert only the specific tuned segment if
  replay coverage regresses.
- Presentation tuning: revert the smallest UI/render/audio file if manual QA
  worsens readability or performance.
- Engine/game changes: require replay + determinism green before keeping them.

## Future Sub-Agent Prompt Seed

`Active task: .trellis/tasks/06-26-m6-tuning-qa`

Read `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
Implement only the M6 tuning/QA work needed to satisfy acceptance criteria. Do
not add stretch mechanics or broaden scope.
