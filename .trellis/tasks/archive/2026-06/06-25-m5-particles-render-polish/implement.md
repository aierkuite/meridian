# M5 Particles and Render Polish — Implementation Plan

## Validation Commands

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
- `npm run dev` for manual visual checks

## Step 1 — Load Context

- Read this child task's `prd.md`, `design.md`, and `implement.md`.
- Read parent task `.trellis/tasks/06-25-m5-av-polish/prd.md`.
- Read specs:
  - `.trellis/spec/render/silhouette-glow-pipeline.md`
  - `.trellis/spec/render/particles.md`
  - `.trellis/spec/project/error-handling-and-perf.md`
  - `.trellis/spec/project/directory-structure.md`
- Inspect:
  - `meridian/src/render/renderer.ts`
  - `meridian/src/render/palette.ts`
  - `meridian/src/main.ts`
  - `meridian/src/ui/hud.ts`

## Step 2 — Add Particle System

- Create `meridian/src/render/particles.ts`.
- Implement fixed-capacity pools for day dust, night spores, and cross-horizon
  motes.
- Use preallocated slots or primitive arrays.
- Add update/draw methods with no hot-path allocation.
- Validate: `npm run typecheck`, `npm run build`.

## Step 3 — Integrate Particles

- Add particle system ownership to `Renderer` or a nearby render factory.
- Draw particles in a layer order that preserves readability.
- Pass only presentation-safe inputs such as sun value and camera position.
- Validate manually in browser for both top and bottom worlds.

## Step 4 — Glow and Palette Polish

- Tune sky gradients, sun orb, horizon glow, element glow, and core readability.
- Add additional pre-rendered glow sprites only if needed.
- Preserve consequence dimming semantics and colorblind-friendly brightness
  cues.
- Search touched render files for runtime `shadowBlur` assignments.
- Validate: typecheck, build, manual visual pass.

## Step 5 — Optional Ending Mood Hook

- If ending atmosphere is in scope for this child, add a tiny presentation mood
  type and pass it from `main.ts`.
- Keep ending rules out of render.
- Coordinate with the UI child if both touch ending presentation.

## Step 6 — Final Gate

- Run:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`
- Manual browser check:
  - particles visible in both worlds
  - cross-horizon mote reads at the seam
  - no obvious frame stutter
  - HUD/ending text remains legible

## Risk Files

- `meridian/src/render/particles.ts`
- `meridian/src/render/renderer.ts`
- `meridian/src/render/palette.ts`
- `meridian/src/main.ts` if render mood is added

## Handoff Notes

- Active task prompt for a sub-agent should begin with:
  `Active task: .trellis/tasks/06-25-m5-particles-render-polish`
- Avoid broad `main.ts` ownership. If render mood is added, keep it as a small
  derived value that the UI child can preserve.
