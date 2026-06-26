# M5 A/V Polish

## Goal

Coordinate the `plan.md` M5 milestone as a parent task suitable for follow-up
sub-agent execution. M5 makes the completed M4 journey feel audio-visually
complete through reactive procedural audio, music/filter support, pooled
particles, glow/palette polish, title flow, and stronger ending presentation.

This parent task owns the source requirement set, child-task map, cross-child
contracts, and final integration acceptance. Direct implementation belongs to
the child tasks.

## Confirmed Facts

- The user wants M5 prepared in a sub-agent-friendly task shape for later
  handling.
- M0-M4 are archived. M4 delivered the formal journey, choice points,
  consequence state, four endings, narration, hints, finale progress, and
  minimal ending screens.
- The app lives under `meridian/` and uses TypeScript + Vite + vanilla Canvas
  2D. Current validation gates are `npm run typecheck`,
  `npm run check:determinism`, `npm run check:replay`, and `npm run build`.
- Current audio is minimal: unlockable oscillators, low-pass filter, and
  procedural reverb. It has no music asset playback, event SFX set, or
  ending-specific resolution.
- Current render has pre-rendered glow sprites and consequence-driven core
  dimming, but no pooled particle system.
- Current UI has narration, hints, finale progress, pause overlay, and four
  ending screens, but no title/start flow and only minimal ending polish.
- `.gitignore` currently ignores `meridian/public/music/*` except `.gitkeep`;
  M5 must explicitly allow any committed default music asset.

## Child Task Map

| Child | Responsibility | Ordering |
|-------|----------------|----------|
| `06-25-m5-audio-music-polish` | Music/default asset, sun filter tuning, presentation cue derivation, procedural SFX, ending audio resolution | First, because UI/title start must preserve audio unlock |
| `06-25-m5-particles-render-polish` | Pooled particles, horizon/sun/element glow polish, ending atmosphere hooks | Can run after audio planning; avoid conflicting with UI over `main.ts` |
| `06-25-m5-title-ending-ui-polish` | Title/start flow, ending screen polish, controls/readability, no-skip UI constraints | After audio interface is known, because start gesture also unlocks audio |
| `06-25-m5-integration-qa` | Final merge check, cross-child regression pass, manual browser QA, docs/license verification | Last, depends on the three implementation children |

## Cross-Child Requirements

- **R1. Presentation only.** Audio/render/UI may read simulation and input state
  but must not mutate gameplay, consequence, ending resolution, collision, or
  replay paths.
- **R2. Determinism preserved.** Replay and determinism checks must stay green;
  presentation timing and audio state must not enter `engine/`, `game/`, or
  `dev/replay.ts`.
- **R3. A/V coherence.** Audio, particles, glow, and UI must reinforce the same
  sun/consequence/ending states rather than each deriving separate rules.
- **R4. Asset hygiene.** Default music or generated default loop must be
  redistributable and documented; local user music must remain private and
  gitignored.
- **R5. Performance discipline.** No runtime `ctx.shadowBlur` for repeated
  objects, no uncapped emitters, and no particle allocation in the render hot
  path.
- **R6. Seamless journey.** Add title and ending polish without level select,
  level-complete cards, skip affordances, or post-finale ending choice.

## Parent Acceptance Criteria

- [ ] AC1. All four child tasks have completed their own acceptance criteria or
      have documented deferrals approved by the user.
- [ ] AC2. Cross-child integration keeps one coherent start/audio/render/UI
      flow: title gesture starts the journey and unlocks audio; in-journey HUD,
      particles, SFX, finale, and endings all read from the same journey state.
- [ ] AC3. The final app has reactive music/filter, procedural SFX, pooled
      particles, render polish, title flow, and distinct ending presentation for
      all four endings.
- [ ] AC4. From `meridian/`, these commands pass in the final integrated state:
      `npm run typecheck`, `npm run check:determinism`,
      `npm run check:replay`, and `npm run build`.
- [ ] AC5. Manual browser QA covers title/start, audio unlock, sun filter,
      representative SFX, particles, pause/reset, finale, and all four ending
      presentations.
- [ ] AC6. README/NOTICE or equivalent docs accurately record default music
      licensing and how local user music is handled.

## Out of Scope

- Stretch mechanics: shadow-bridge, full Offering verb, threats/predator,
  convergent playable branches, dynamic meridian, hard-mode asymmetric
  visibility, save/continue, ending gallery, or level select.
- Aurora ribbon and bespoke per-ending music tracks beyond procedural ending
  resolutions.
- WebGL/Pixi replacement unless Canvas 2D measurably fails after pooling and
  glow-sprite discipline.
- Mobile/touch controls or new gameplay content.

## Open Questions

None blocking. Child tasks carry their own implementation details and explicit
dependencies.
