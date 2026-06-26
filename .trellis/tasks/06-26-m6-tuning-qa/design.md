# M6 Tuning and QA — Technical Design

## 1. Scope

M6 is the final gameplay-quality gate before M7 open-source polish. It may make
narrow fixes to tuning, replay data, hints, consequence readability, performance,
or browser integration, but it should not expand the playable feature set.

The task is intentionally direct rather than split into children: the output is
one verified, tuned MVP build with documented coverage.

## 2. System Boundaries

- **Simulation (`engine/`, `game/`, `data/segments/`).** Owns physics, sun,
  element behavior, segment flow, choice detection, consequence, endings, and
  replay solvability. Any change here must preserve determinism and replay.
- **Presentation (`render/`, `audio/`, `ui/`, `main.ts`).** Reads simulation
  state and presents it. It may send player intent such as pause/reset/start,
  but must not decide gameplay outcomes or duplicate ending rules.
- **QA scripts (`scripts/`, `src/dev/replay.ts`).** Provide the objective gate:
  typecheck, determinism scan, replay coverage, branch coverage, ending
  reachability, and production build.

## 3. Current Baseline

On 2026-06-26, these commands passed from `meridian/`:

- `npm.cmd run typecheck`
- `npm.cmd run check:determinism`
- `npm.cmd run check:replay`
- `npm.cmd run build`

Replay baseline: 13 paths won with zero resets, every choice point has both
`whole` and `shortcut` coverage, and all four endings are reachable.

This means M6 should be treated as tuning and manual verification over a green
baseline, not as recovery from a broken build.

## 4. Tuning Approach

Tune only against observed issues from manual play or objective checks:

- Adjust segment geometry, `solutionPaths`, sun drift/window values, hint timing,
  or signposting only when a concrete fairness/readability issue is found.
- Keep difficulty puzzle-driven and consequence-driven, not twitch-driven.
- Preserve cheap segment reset and never charge consequence from death, timeout,
  or replay failure.
- If a segment data change affects a route, update its `solutionPaths` in the
  same iteration and rerun `check:replay`.

## 5. QA Matrix

| Area | Minimum coverage |
|------|------------------|
| Replay | Every formal segment, every choice branch, all endings |
| Manual journey | Prologue, Beats 1-7, Reunion, reset, pause, ending restart |
| Choice points | Whole route readable, shortcut route signposted, correct core dimming |
| Hints | Appear late enough, help without solving, reset with segment |
| Audio | First gesture unlock, sun filter, jump/sun/element/choice/fusion/ending cues |
| Render | Warm/cool worlds, horizon, core dimming, particles, no hue-only meaning |
| UI | Title, HUD, pause, hints, finale progress, four ending screens |
| Performance | 60fps sanity, no runtime blur, no particle/allocation/log spam |
| Browser | Chrome and Firefox locally; Safari if available, otherwise documented |

## 6. Performance Design

Performance work should first measure and inspect, then apply the smallest fix:

- Search hot render paths before changing values.
- Preserve pre-rendered glow sprites and additive draw calls.
- Keep particles pooled and capped.
- Keep cosmetic timing out of replay/deterministic simulation.
- Do not introduce WebGL/Pixi unless Canvas 2D is proven insufficient after the
  existing pooling/glow discipline is maintained.

## 7. Browser Strategy

Use `npm.cmd run dev` for interactive QA and `npm.cmd run preview` after build
when production behavior matters. Chrome and Firefox are required local checks.
Safari is required only when a Safari-capable device/browser is available; if
not available in this Windows environment, record the limitation in closeout.

## 8. Risk Files

- `meridian/src/data/segments/*`
- `meridian/src/dev/replay.ts`
- `meridian/src/game/segment.ts`
- `meridian/src/game/journey.ts`
- `meridian/src/game/consequence.ts`
- `meridian/src/game/ending.ts`
- `meridian/src/game/narration.ts`
- `meridian/src/data/story.ts`
- `meridian/src/main.ts`
- `meridian/src/audio/*`
- `meridian/src/render/*`
- `meridian/src/ui/*`

## 9. Handoff Contract

Future sub-agent prompts should begin with:

`Active task: .trellis/tasks/06-26-m6-tuning-qa`

Then instruct the sub-agent to read this task's `prd.md`, `design.md`,
`implement.md`, `implement.jsonl`, and `check.jsonl` before editing.
