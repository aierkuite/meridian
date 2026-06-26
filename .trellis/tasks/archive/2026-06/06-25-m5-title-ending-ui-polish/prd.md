# M5 Title and Ending UI Polish

## Goal

Add M5's title/start flow and polish the four ending screens without changing
gameplay progression. UI should make the experience feel complete while staying
thin: it reads journey state, routes start/pause/reset intent, and never owns
gameplay or ending rules.

## Confirmed Facts

- Parent task: `.trellis/tasks/06-25-m5-av-polish`.
- Current `src/main.ts` creates the canvas, journey, renderer, and audio
  immediately, then starts the fixed loop.
- Current UI draws HUD narration, hints, finale progress, ending screens, and
  pause overlay.
- Current ending screens are functional but minimal and all use
  `endingTextFor(ending)`.
- Current journey restart behavior is already correct: `R` on ending restarts
  the full journey; `R` during play resets only the current segment.
- Audio child is expected to establish the audio unlock/update frame. This UI
  child must preserve that flow and use the explicit start gesture to unlock
  audio.

## Dependencies

- Start after `06-25-m5-audio-music-polish` has defined the audio interface or
  coordinate the merge if working in parallel.
- Coordinate with `06-25-m5-particles-render-polish` if ending atmosphere or
  render mood is passed through `main.ts`.

## Requirements

- **R1. Title/start flow.** Add a title screen before journey progression starts.
  It should show "Meridian", concise controls, and a single start prompt.
- **R2. Audio unlock integration.** The same explicit start/key gesture should
  begin the journey and unlock/resume audio.
- **R3. No simulation drift before start.** The journey must not advance while
  the title screen is active.
- **R4. HUD preservation.** Existing narration, hints, finale progress, pause,
  and reset behavior must continue to work.
- **R5. Ending polish.** Make all four ending screens distinct, readable, and
  emotionally matched while still reading `journey.resolvedEnding` and
  `endingTextFor`.
- **R6. No new menus.** Do not add level select, ending gallery, skip buttons,
  or a post-finale ending choice.
- **R7. Text constraints.** Player-facing text remains English and minimal.

## Acceptance Criteria

- [ ] AC1. The app initially shows a polished title screen rather than
      immediately advancing gameplay.
- [ ] AC2. Pressing the documented start key begins the journey and triggers the
      audio unlock/resume path.
- [ ] AC3. While on the title screen, the simulation does not advance and no
      consequence/segment progress is written.
- [ ] AC4. In-game HUD narration, hints, finale progress, pause overlay, and
      reset behavior still work.
- [ ] AC5. All four ending screens are visually distinct, readable, English-only,
      and matched to `journey.resolvedEnding`.
- [ ] AC6. `R` on an ending screen still restarts the full journey; `R` during
      play still resets only the current segment.
- [ ] AC7. UI code does not call `resolveEnding` or mutate consequence/segment
      state.
- [ ] AC8. From `meridian/`, `npm run typecheck`, `npm run check:determinism`,
      `npm run check:replay`, and `npm run build` pass.

## Out of Scope

- Music/SFX implementation.
- Particle/glow implementation except consuming a render mood if already
  provided.
- Ending gallery, save/continue, level select, skip affordance, or new gameplay.
- Mobile/touch UI.

## Open Questions

None blocking. Use a concise start prompt and keep all text English.
