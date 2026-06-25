# Silhouette + Glow Pipeline

> `src/render/renderer.ts`, `src/render/palette.ts`.

> **Status: Reconcile after M5 (2026-06-25).** Canvas 2D silhouette/glow is
> live. M4 added consequence-driven core dimming; **M5 added richer pre-rendered
> glow sprites (white-hot core center, sun orb, sharper horizon seam, a cool
> fungi glow split from the warm mote glow) and pooled particles — still no
> per-frame `shadowBlur`, and `coreBrightness`/`CORE_DIM_FLOOR=0.18` unchanged.**

---

## Pipeline order (`renderer.ts`)

Drama comes from lighting, not sprites (plan §7). Each frame, draw back-to-front:

1. **Gradient sky** — warm top, cool bottom, from the sun-driven palette.
2. **Silhouette fills** — terrain and avatars as flat dark shapes.
3. **Glow** — additive compositing of **pre-rendered offscreen glow sprites**
   (cores, fungi, horizon seam), not live blur.
4. **Particles** — pooled layers (see [Particles](./particles.md)).
5. **Horizon seam** — the luminous mirror line.

## Glow without the `shadowBlur` trap (the central perf rule)

Canvas 2D `ctx.shadowBlur` is **slow** and must not run per-frame per-object
(plan §7, §10, §13). Instead:

- Pre-render each glow shape **once** to an **offscreen canvas** (a glow sprite).
- Each frame, draw the sprite with `globalCompositeOperation = "lighter"`
  (additive) at the object's position/scale.
- Re-render a glow sprite only when its *shape* changes, not every frame.

```ts
// shape only
const glow = renderGlowSprite(radius, color);     // once, offscreen
// per frame:
ctx.globalCompositeOperation = "lighter";
ctx.drawImage(glow, x - glow.width / 2, y - glow.height / 2);
ctx.globalCompositeOperation = "source-over";
```

If Canvas 2D still misses 60fps after this, **then** consider a WebGL/Pixi glow
pass — not before (plan §3 #3, §7).

## Sun-driven palette (`palette.ts`)

- Owns the warm/cool palettes and the **sky gradient as a function of `s`**
  (read from the sim, never written).
- Avatar **core brightness** reflects spent light (consequence) — dimmer cores
  for cruel paths. This is where art and theme meet (plan §2 #19, §7).
- **Colorblind-friendly by construction:** worlds are distinguished by
  **position (top/bottom) and brightness**, not hue alone (plan §9). Don't
  introduce a mechanic readable only by color.

## Core dimming contract (M4)

M4 represents sacrifice as a dimmer glowing core, never as avatar removal or a
hue-only signal.

### 1. Scope / Trigger

Any renderer/UI change that displays spent light must read
`JourneyState.consequence` and use brightness/alpha. It must not recalculate
ending rules or mutate consequence.

### 2. Signatures

```ts
function renderScene(
  ctx: CanvasRenderingContext2D,
  state: SegmentState,
  camera: CameraState,
  renderer: Renderer,
  view: { width: number; height: number; dpr: number },
  consequence: Consequence,
): void;
```

Implementation detail currently owned by `renderer.ts`:

```ts
const CORE_DIM_FLOOR = 0.18;
function coreBrightness(light: number): number;
```

### 3. Contracts

- Sol core brightness reads `consequence.solLight`; Luna core brightness reads
  `consequence.lunaLight`.
- `coreBrightness(light)` clamps `light` to `[0,1]` and maps it into
  `[CORE_DIM_FLOOR, 1]`.
- The avatar silhouette is always drawn at full silhouette opacity; only the
  pre-rendered core glow changes alpha.
- Spent light must remain readable by brightness/alpha and position, not by hue
  alone.
- Glow sprites are created up front and composited with `drawImage` plus
  additive blending. Do not add per-frame `ctx.shadowBlur` for core dimming.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| `light === 1` | core glow alpha `1` |
| `light === 0` | core glow alpha `0.18`; silhouette still visible |
| Light outside `[0,1]` | renderer clamps before mapping |
| Consequence changes | next render frame reflects brightness only |

### 5. Good/Base/Bad Cases

- Good: `globalAlpha = coreBrightness(consequence.solLight)` while drawing the
  Sol core sprite.
- Base: full-light run renders both cores at full alpha.
- Bad: changing Sol to a different hue to mean "spent" while keeping brightness
  unchanged.

### 6. Tests Required

- Search touched render files for `shadowBlur` before commit.
- Manual browser review must confirm dimmed cores remain visible and do not
  depend on hue-only meaning.
- `npm run build` must remain green after render changes.

### 7. Wrong vs Correct

#### Wrong

```ts
ctx.shadowBlur = 32;
ctx.fillStyle = spent ? "#ff0000" : "#ffb86b";
```

#### Correct

```ts
ctx.globalAlpha = coreBrightness(consequence.solLight);
ctx.drawImage(renderer.solCore, x, y);
```

---

## Forbidden

- ❌ Per-frame `ctx.shadowBlur` on moving/repeated objects.
- ❌ Reallocating offscreen glow canvases every frame.
- ❌ Encoding any required information in hue alone.
- ❌ Reaching back into `game/` state to mutate it — render only reads.
