# M5 Audio and Music Polish

## Goal

Implement Meridian's M5 audio layer: clone-and-play music/default bed,
sun-driven filtering, presentation-derived audio cues, procedural SFX, and
ending-specific audio resolutions.

The result should make the sun value, element changes, deliberate light cost,
reunion, and endings audible while preserving the deterministic simulation and
existing replay gates.

## Confirmed Facts

- Parent task: `.trellis/tasks/06-25-m5-av-polish`.
- This is the first implementation child because title/start UI must preserve
  whatever audio unlock and update interface this task establishes.
- Current `meridian/src/audio/audio.ts` exposes `AudioEngine.unlock()` and
  `AudioEngine.update(s)`, creates `AudioContext` after a key gesture, and runs
  oscillator drones through low-pass + convolver reverb.
- There is no committed music asset in `meridian/public/music/`; `.gitignore`
  currently ignores all files there except `.gitkeep`.
- Current app loop calls `audio.update(journey.active.sun.value)` from
  `main.ts` after rendering.
- Current simulation already exposes enough state for presentation-side cue
  derivation: input edges, `JourneyState`, `SegmentState`, `consequence`,
  element visual/solid state, finale progress, and resolved ending id.

## Dependencies

- Must preserve all M4 behavior and validation gates.
- Must not rely on title UI work being complete. This child may keep immediate
  start and first-key unlock; the UI child will later refine the start screen.
- If this child changes `main.ts`, keep the changes narrow and documented so the
  UI child can merge title-state work without guessing.

## Requirements

- **R1. Audio frame contract.** Replace the single-`s` update call with a small
  presentation audio frame containing sun value, journey status, resolved ending,
  and short-lived cues.
- **R2. Cue derivation.** Add a presentation-only adapter that detects jump
  edges, sun movement/pressure, element state changes, light-cost shortcut
  changes, finale progress bands, and ending entry. It must not be imported by
  replay tooling.
- **R3. Music/default bed.** Add a redistributable default music or generated
  ambient loop under `meridian/public/music/`, or a documented generated bed if
  the asset path is intentionally procedural. Clone-and-play must produce
  audible audio after unlock.
- **R4. Local music hygiene.** Update `.gitignore` and docs so default audio can
  be committed while local user tracks remain private and swappable.
- **R5. Sun filter.** Route music/default bed through low-pass + wet/reverb and
  tune the map so low sun is muffled/dark and high sun is open/bright.
- **R6. Procedural SFX.** Synthesize SFX for jump, sun motion/pressure,
  ice/water, vine/fungi, door/gate, choice cost, reunion/fusion, and ending
  resolution.
- **R7. Ending audio.** Trigger ending resolution exactly once from
  `journey.resolvedEnding`: One Sky/Vow bloom; Afterglow/Long Dark thin or
  gutter.
- **R8. No gameplay writes.** Audio and cue code may read state but must not
  mutate journey, segment, consequence, ending, replay paths, or input state.

## Acceptance Criteria

- [ ] AC1. `AudioEngine.update` consumes an audio frame/cue shape rather than
      only raw `s`, and `main.ts` supplies that frame from presentation state.
- [ ] AC2. Cue derivation is presentation-only and does not introduce imports
      from audio/render/UI into `engine/`, `game/`, or `dev/replay.ts`.
- [ ] AC3. Audio unlock still happens only after a user key gesture; no autoplay
      errors or uncaught promise failures appear in normal browser use.
- [ ] AC4. A default redistributable music/ambient path exists and plays after
      unlock with no local user track present.
- [ ] AC5. Sun-driven low-pass/reverb response is audible across the `s` range.
- [ ] AC6. Representative procedural SFX fire for jump, sun motion, element
      state changes, light-cost shortcut, finale/fusion, and ending entry.
- [ ] AC7. Ending audio distinguishes bright endings from tragic endings using
      `journey.resolvedEnding`, with no recomputation of ending rules.
- [ ] AC8. `.gitignore` and docs/license notes allow the default asset while
      keeping local user tracks ignored.
- [ ] AC9. From `meridian/`, `npm run typecheck`, `npm run check:determinism`,
      `npm run check:replay`, and `npm run build` pass.

## Out of Scope

- Title/start screen polish beyond preserving first-key audio unlock.
- Render particles, glow polish, or ending screen visuals.
- Bespoke per-ending music tracks; M5 needs procedural ending resolutions only.
- Any gameplay, segment, consequence, or ending-rule changes.

## Open Questions

None blocking. Prefer a generated default loop if an external CC0 asset is not
already available with clear license proof.
