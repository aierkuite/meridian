# M6 Tuning and QA

## Goal

Complete the `plan.md` M6 milestone: tune the finished MVP for fair difficulty,
readability, consequence balance, replay solvability, ending reachability,
performance, and browser QA before open-source polish begins.

M6 is a direct execution task, not a parent/child task tree. Future sub-agent
work should use this task path as the active task and follow `implement.md`.

## Confirmed Facts

- Source milestone: `plan.md` §11 M6 and §14 MVP acceptance criteria.
- App root: `meridian/`.
- Validation scripts already exist in `meridian/package.json`:
  `typecheck`, `check:determinism`, `check:replay`, and `build`.
- Baseline checked on 2026-06-26 with `npm.cmd` because PowerShell blocks
  `npm.ps1`; all four automated gates currently pass.
- Current replay baseline covers 13 authored paths, all three choice points with
  both `whole` and `shortcut` branches, and all four endings:
  `one-sky`, `vow`, `afterglow`, `long-dark`.
- M5 A/V polish is archived and established the current title/audio/render/UI
  contracts. M6 should tune and verify the integrated experience, not add new
  stretch mechanics.
- Local development is Windows-based. Chrome and Firefox can be locally checked;
  Safari requires an available Apple platform or an explicit QA deferral note.

## Requirements

- **R1. Preserve automated gates.** `typecheck`, determinism, replay, and build
  must stay green after any tuning or QA fixes.
- **R2. Verify solvability.** Every player-facing segment must have passing
  replay coverage; every choice point must keep both `whole` and `shortcut`
  branch coverage; all four endings must remain reachable.
- **R3. Tune fairness and readability.** Puzzles should be difficult but fair:
  hazards readable, drift/window segments understandable, reset cheap, no grind,
  and no hidden consequence from incidental death.
- **R4. Validate consequence balance.** Cruel shortcuts must be legible choices,
  cost only light through choice points, visibly dim cores, and map to endings in
  a way that matches the planned tones.
- **R5. Validate graduated hints.** Hints must appear only as a stuck-point
  backstop, remain English and non-taunting, reset with the segment timer, and
  never create a skip, level select, or auto-solve affordance.
- **R6. Manual softlock pass.** Manually play the formal journey, including both
  routes through each choice point, and verify reset/pause/finale behavior does
  not trap the player.
- **R7. Performance pass.** Keep the Canvas 2D renderer near 60fps on mid
  hardware; avoid per-frame `ctx.shadowBlur`, uncapped particles, per-frame
  allocation spikes, and loop logging.
- **R8. Browser/audio/UI pass.** Verify title start, audio unlock, sun filter,
  representative SFX, HUD, pause/reset, finale, and all four ending screens in
  available target browsers.
- **R9. Scope discipline.** Do not add stretch mechanics, level select, free
  skip, ending picker, save/progress, mobile controls, or new content beyond
  narrow fixes required by M6 QA.
- **R10. Closeout evidence.** Record commands run, manual coverage, unresolved
  browser limitations, and any spec updates needed before archive/commit.

## Acceptance Criteria

- [ ] AC1. From `meridian/`, the full automated gate passes:
      `npm.cmd run typecheck`, `npm.cmd run check:determinism`,
      `npm.cmd run check:replay`, and `npm.cmd run build`.
- [ ] AC2. Replay output confirms all formal segments win with zero resets, all
      choice points cover `whole` and `shortcut`, and all four endings are
      reachable.
- [ ] AC3. Manual softlock pass covers Prologue, Beats 1-7, all choice-point
      routes, Reunion, `R` reset, `Esc` pause, and ending restart.
- [ ] AC4. Difficulty/readability notes are resolved or explicitly deferred:
      drift, balance mote, light/dark door timing, shortcut signposting, and
      finale hold are understandable without twitch precision.
- [ ] AC5. Graduated hints are readable, useful after delay, reset correctly,
      and contain no skip/auto-solve behavior.
- [ ] AC6. Consequence and ending checks verify no incidental death affects
      branch state, shortcuts dim the correct core(s), and each ending screen
      matches the resolved ending id and tone.
- [ ] AC7. Performance QA finds no runtime `ctx.shadowBlur` additions, no obvious
      particle/allocation churn, no loop logging spam, and acceptable 60fps
      behavior in the tested scenes.
- [ ] AC8. Browser QA covers Chrome and Firefox locally; Safari is either
      verified on an available Apple platform or documented as an external QA
      limitation before closeout.
- [ ] AC9. Audio/UI integration is manually verified: title unlock, default
      procedural bed or local-track fallback, sun filter response, representative
      SFX, pause/reset, finale cues, and ending cues.
- [ ] AC10. No M6 changes introduce stretch scope, divergent branch geometry,
      level select, free skip, last-second ending choice, or presentation-owned
      gameplay rules.

## Out of Scope

- M7 open-source polish: README overhaul, screenshots/GIF, GitHub Pages final
  demo, license packaging beyond QA notes.
- Stretch mechanics: shadow-bridge, Offering verb, predators/threats, aurora,
  convergent playable branches, ending gallery, localStorage progress, mobile
  controls, or WebGL/Pixi replacement.
- Broad engine refactors unrelated to M6 defects.

## Open Questions

None blocking. Treat Safari as required only when an Apple-platform test target
is available; otherwise record the limitation and proceed with Chrome/Firefox
local QA.
