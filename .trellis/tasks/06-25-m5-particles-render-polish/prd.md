# M5 Particles and Render Polish

## Goal

Implement M5's visual polish layer: pooled atmospheric particles, stronger
horizon/sun/element glow, palette refinement, and optional ending atmosphere
hooks. The game should feel richer while preserving Canvas 2D performance and
the M4 consequence-dimming contract.

## Confirmed Facts

- Parent task: `.trellis/tasks/06-25-m5-av-polish`.
- Current `src/render/renderer.ts` already draws warm/cool skies, terrain,
  exits, elements, avatar silhouettes, core dimming, horizon glow, and sun orb.
- Current renderer uses pre-rendered glow sprites and additive compositing; it
  does not rely on runtime blur for core dimming.
- Current `src/render/palette.ts` has simple day/night gradient pairs.
- There is no `src/render/particles.ts` yet.
- Particles are cosmetic and must not affect simulation, replay, collision, or
  solution paths.

## Dependencies

- Can be implemented independently of audio as long as it does not take
  ownership of title/start flow.
- If render wants ending-dependent mood, it should accept a small
  presentation-only value from `main.ts` and avoid recomputing ending rules.
- UI child may later refine ending text/layout; render child should keep ending
  atmosphere separable from UI text drawing.

## Requirements

- **R1. Particle system.** Add capped, pooled particles for day dust, night
  spores, and cross-horizon motes.
- **R2. No hot-path allocation.** Particle slots are allocated once and reused.
  No particle objects, arrays, or canvases should be allocated per frame.
- **R3. Cosmetic only.** Particles live in render/presentation code and cannot
  influence physics, replay, segment data, or solution paths.
- **R4. Glow polish.** Improve sun orb, horizon seam, element glow, finale marks
  if needed, and avatar core readability using pre-rendered glow sprites and
  additive compositing.
- **R5. Palette polish.** Refine warm day and cool night readability while
  preserving position/brightness as the primary world distinction.
- **R6. Ending atmosphere.** If added, ending mood must read
  `journey.resolvedEnding` from presentation and never recompute ending logic.
- **R7. Performance discipline.** Avoid runtime `ctx.shadowBlur` for repeated
  objects and preserve 60fps sanity.

## Acceptance Criteria

- [ ] AC1. `src/render/particles.ts` or equivalent exists with capped pools for
      day dust, night spores, and cross-horizon motes.
- [ ] AC2. Particle update/draw is integrated into the renderer and visibly
      enriches both worlds without obscuring hazards, exits, avatars, text, or
      the horizon.
- [ ] AC3. Particle code does not allocate particle objects or grow particle
      arrays in the per-frame path.
- [ ] AC4. Render polish improves horizon/sun/element glow and keeps avatar
      cores readable at both full and dim light.
- [ ] AC5. Render code does not add runtime `ctx.shadowBlur` on repeated/moving
      objects or recreate glow canvases per frame.
- [ ] AC6. Any ending atmosphere is selected from presentation-provided ending
      state and does not call `resolveEnding`.
- [ ] AC7. From `meridian/`, `npm run typecheck`, `npm run check:determinism`,
      `npm run check:replay`, and `npm run build` pass.
- [ ] AC8. Manual browser review confirms particles/glow are readable at common
      viewport sizes and do not cause obvious frame stutter.

## Out of Scope

- Aurora ribbon; it remains stretch.
- WebGL/Pixi rewrite unless Canvas 2D fails after this scoped polish.
- UI title/end screen text layout.
- Audio SFX or music.
- Gameplay-affecting particles, shadow-bridge mechanics, or new level content.

## Open Questions

None blocking. The render spec defines the particle/glow constraints closely
enough to proceed.
