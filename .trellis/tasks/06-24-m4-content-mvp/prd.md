# M4 Content MVP

## Goal

Implement the `plan.md` M4 milestone on top of the completed M3 mechanics:
turn the existing replay-covered element fixtures into a complete MVP content
journey with Prologue + 7 beats + Reunion, deliberate light-cost choice points,
consequence-driven endings, adaptive narration, and graduated hints.

The player value is a complete emotional arc: the dual-world mechanics now have
authored progression, meaningful mid-journey cost, and an earned finale instead
of looping mechanic test rooms.

## Confirmed Facts

- The user explicitly requested M4, completion of Phase 1, and transition to
  `in_progress`.
- The current Codex session is configured as inline, but the user wants later
  work to be prepared for sub-agent style handoff. Planning therefore includes
  curated `implement.jsonl` and `check.jsonl`, while this session does not
  dispatch implement/check sub-agents.
- `plan.md` is the source of truth for M4: Prologue + 7 beats + Reunion, 2-3
  deliberate choice points, consequence state, ~4 endings, adaptive narration,
  and graduated hints are MVP scope.
- M0-M3 are archived. The current app lives under `meridian/`, using
  TypeScript + Vite + vanilla Canvas 2D.
- M3 delivered the MVP element vocabulary (`ice`, `vine`, `door`, `mote`) and
  segment-owned sun drift profiles with deterministic replay fixtures.
- Current `data/index.ts` exports five fixture segments: `m1-slice`,
  `m3-vine`, `m3-door`, `m3-mote`, and `m3-drift`.
- Current `game/journey.ts` advances a linear segment list but loops back to the
  first segment at chain end; M4 must replace this with a real journey end.
- Current `SegmentData` has terrain, elements, starts, exits, `initialSun`,
  `drift`, and mandatory `solutionPaths`, but no choice-point, finale, or
  narration metadata yet.
- Current replay verifies per-segment solution paths, but does not yet require
  both branches for choice points or prove all endings reachable.

## Requirements

- **R1. Formal MVP journey.** Replace the mechanic fixture chain with authored
  content for Prologue, Beat 1, Beat 2, consolidation interlude, Beat 3, Beat 4,
  Beat 5, Beat 6, Beat 7, and Reunion. Existing fixture files may be kept only
  as dev references if they are no longer exported as the playable journey.
- **R2. Segment data remains authoritative.** Each authored segment must be
  bounded, data-driven, readonly, and carry replayable `solutionPaths`.
- **R3. Choice points.** Add 2-3 deliberate choice points; M4 targets three
  small choice points so all four endings are naturally reachable. Each
  choice-point segment must provide at least one `whole` path and one
  `shortcut` path.
- **R4. Consequence state.** Add a small serializable consequence state that
  tracks Sol light, Luna light, and shortcut history. It is written only by
  deliberate choice-point shortcut triggers, never by incidental death, reset,
  or replay timeout.
- **R5. Ending resolution.** Add a pure ending resolver that maps accumulated
  consequence to the four planned endings: `one-sky`, `vow`, `afterglow`, and
  `long-dark`. There is no last-second finale choice.
- **R6. Reunion finale.** Add a mechanical reunion segment where both avatars
  must reach solstice marks and hold the sun in the required window before the
  journey resolves into the earned ending.
- **R7. Narration.** Add sparse English story text and selection logic for
  beat intros, choice prompts, consequence-adaptive lines, finale lines, and
  ending closers.
- **R8. Graduated hints.** Add a no-skip hint system that escalates at genuine
  stuck points without changing gameplay state or granting progress.
- **R9. UI/render presentation.** Surface narration, hints, core dimming, the
  finale state, and all four ending screens from simulation state. UI/render
  must remain read-only with respect to gameplay.
- **R10. Replay and quality gates.** Extend validation so every segment path
  passes, choice points cover both branches, and all four endings are provably
  reachable. Preserve existing M3 gates.

## Acceptance Criteria

- [ ] AC1. `meridian/src/data/index.ts` exports the formal M4 journey in
      intended order, ending with Reunion rather than looping mechanic fixtures
      as the player-facing content.
- [ ] AC2. Every exported segment has at least one passing `solutionPath`; every
      choice-point segment has passing `whole` and `shortcut` paths.
- [ ] AC3. Consequence writes occur only through explicit choice-point shortcut
      triggers; death, reset, segment timeout, and normal exits do not spend
      light.
- [ ] AC4. Sol and Luna both remain present and mirror-synced for the entire run;
      sacrifice is represented as light dimming/state, not avatar removal.
- [ ] AC5. `resolveEnding(consequence)` is deterministic, pure, and covers
      `one-sky`, `vow`, `afterglow`, and `long-dark` exhaustively.
- [ ] AC6. The Reunion segment is mechanically gated by both solstice marks and
      a sun window, then resolves to the already-earned ending with no player
      choice at the end.
- [ ] AC7. English narration exists for opening, beat progression, choice points,
      adaptive consequence state, pre-meridian, and all four endings.
- [ ] AC8. Graduated hints appear only as a stuck-point backstop and never expose
      a skip affordance.
- [ ] AC9. Ending screens render for all four endings and match the simulation's
      resolved `ending.id`.
- [ ] AC10. Core dimming is visible enough to communicate spent light while
      preserving the silhouette/glow style and avoiding hue-only meaning.
- [ ] AC11. From `meridian/`, these commands pass: `npm run typecheck`,
      `npm run check:determinism`, `npm run check:replay`, and
      `npm run build`.
- [ ] AC12. Replay output or an equivalent deterministic check proves all four
      endings are reachable from authored branch combinations or canonical
      consequence states.

## Out of Scope

- M5 audio/SFX and visual polish beyond presentation necessary for M4 state:
  no full procedural SFX set, bespoke ending tracks, aurora, or particle polish.
- Stretch mechanics: shadow-bridge, hazards/predator, full Offering verb,
  convergent playable branches, dynamic meridian, and hard-mode asymmetric
  visibility.
- Full save/continue, ending gallery, mobile/touch controls, level select, or a
  free skip system.
- Replacing the vanilla Canvas 2D / TypeScript architecture or introducing a
  game framework.

## Open Questions

None blocking. `plan.md`, archived M3 artifacts, and `.trellis/spec/` define
the M4 scope closely enough to proceed.

## Notes

This is a complex task. Phase 1 must include `design.md` and `implement.md`
before `task.py start`.
