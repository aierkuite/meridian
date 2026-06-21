# Silhouette + Glow Pipeline

> `src/render/renderer.ts`, `src/render/palette.ts`.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §7, §10, §13.
> Reconcile after M1/M5.

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

---

## Forbidden

- ❌ Per-frame `ctx.shadowBlur` on moving/repeated objects.
- ❌ Reallocating offscreen glow canvases every frame.
- ❌ Encoding any required information in hue alone.
- ❌ Reaching back into `game/` state to mutate it — render only reads.
