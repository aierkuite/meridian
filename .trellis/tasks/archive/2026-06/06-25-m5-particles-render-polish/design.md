# M5 Particles and Render Polish — Technical Design

## 1. Boundary

Render polish is presentation-only. It reads `SegmentState`, camera,
consequence, sun value, and optional presentation mood. It never mutates
simulation, segment data, consequence, or endings.

## 2. Particle Model

Add `src/render/particles.ts` with small fixed-capacity pools.

Suggested shape:

```ts
interface ParticleLayer {
  update(dt: number, sun: Sun01, cameraX: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

interface ParticleSystem {
  update(dt: number, sun: Sun01, cameraX: number): void;
  drawDay(ctx: CanvasRenderingContext2D): void;
  drawNight(ctx: CanvasRenderingContext2D): void;
  drawHorizon(ctx: CanvasRenderingContext2D): void;
}
```

Each pool stores primitive arrays or preallocated slot objects:

- `x`, `y`, `vx`, `vy`, `life`, `age`, `size`, `alpha`, `kind`
- dead slots are reused
- spawn is a no-op when full

## 3. Layers

- Day dust: warm small particles in the top half. Slow drift, subtle alpha,
  slightly more visible at high `s`.
- Night spores: cool particles in the bottom half. Slight upward/inverted-world
  drift, more visible at low `s`.
- Cross-horizon motes: sparse particles around `HORIZON_Y`, occasionally moving
  across the seam to reinforce the meridian.

All layers are cosmetic. They may use render-frame timing but cannot become
gameplay queries.

## 4. Integration With Renderer

`Renderer` can own a `particles` field created once in `createRenderer()`.
`renderScene` can update/draw the particle system after sky/background and
before foreground glow, or split day/night/horizon draw calls if layering reads
better.

If `renderScene` needs `dt` for particles, either:

- pass a presentation render delta from `main.ts`, or
- update particles inside the fixed render call using a small constant visual
  step that is independent of simulation determinism.

Because particles are cosmetic, visual timing does not affect replay.

## 5. Glow and Palette

Keep using pre-rendered glow sprites:

- tune `createRadialGlow` inputs for sun/core/element readability
- add or adjust horizon glow sprites once, not per frame
- avoid `ctx.shadowBlur`
- keep `globalCompositeOperation = "lighter"` localized and reset after use

Palette adjustments should improve contrast without making hue the only signal.
The top/bottom split and brightness remain the primary world distinction.

## 6. Ending Atmosphere

If implemented here, define a small presentation mood:

```ts
type RenderMood =
  | { readonly kind: "journey" }
  | { readonly kind: "ending"; readonly ending: EndingId };
```

`main.ts` derives it from `journey.status` and `journey.resolvedEnding`.
Renderer may use it for overlay glow intensity, particle color bias, or horizon
fade. Renderer must not call `resolveEnding`.

## 7. Validation

Automated:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

Manual:

- verify particles visible but not noisy
- verify core dimming still readable
- verify no text/element overlap problems caused by stronger glow
- sanity-check frame smoothness in dev server

Search:

- no runtime `ctx.shadowBlur =` additions in touched render files
- no per-frame `new Particle` / array growth in particle update/draw
