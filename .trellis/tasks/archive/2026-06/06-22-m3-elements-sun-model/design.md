# M3 — Technical Design

> Source requirements: `prd.md`. Scope: add the remaining MVP element vocabulary and
> sun drift profiles on top of the M2 deterministic replay spine.

## 1. Architecture Boundary

M3 keeps the M2 simulation/presentation split:

| Area | Files | Rule |
|------|-------|------|
| Simulation | `meridian/src/engine/`, `meridian/src/game/` | deterministic, render-free, no DOM/canvas/audio reads |
| Data | `meridian/src/data/segments/` | readonly segment declarations, including element placements and solution paths |
| Presentation | `meridian/src/render/`, `meridian/src/ui/`, `meridian/src/audio/` | reads simulation state only |
| Tooling | `meridian/src/dev/`, `meridian/scripts/` | replay/debug helpers; replay imports simulation/data only |

Element behavior stays in `game/elements/*`. Physics asks `solidAt(s)`; render reads
`visualAt(s)` and kind/world metadata for drawing.

## 2. Element Contract Changes

Extend the closed element set:

```ts
export type ElementKind = "ice" | "vine" | "door" | "mote";
```

`ElementPlacement` gains optional band data for window elements:

```ts
export interface SunBand {
  readonly min: Sun01;
  readonly max: Sun01;
}

export interface ElementPlacement {
  readonly kind: ElementKind;
  readonly world: ElementWorld;
  readonly box: AABB;
  readonly band?: SunBand;
}
```

Rules:

- `"mote"` requires a valid `band`.
- Non-mote elements ignore `band` or reject it if strictness is simpler.
- `band.min` and `band.max` must both be inside `[0, 1]`, and `min <= max`.
- Invalid element data throws during `createElement`, so replay/build catches bad
  content early.

`ElementVisual` should remain small and render-oriented. It can be extended with
fields such as `alpha` and `glow` only if render needs them. Gameplay must not inspect
visual fields.

## 3. Element Behaviors

### Ice

Preserve the M2/spec behavior:

- Day: solid when `s < 0.5`.
- Night: solid when `s > 0.5`.
- At exactly `0.5`, neither side is solid.

### Vine/Fungi

Use one `kind: "vine"` pair whose world determines flavor:

- Day vine: solid/visible when `s >= 0.65`.
- Night fungi: solid/visible when `s <= 0.35`.

M3 represents this as AABB platforms, not ladder/climb physics. Future content can
author stair-step or ledge geometry when vertical traversal is needed.

### Door/Gate

Use one `kind: "door"` pair as solid barriers when closed:

- Day light-door: open when `s >= 0.7`, so `solidAt(s)` is true below that threshold.
- Night dark-gate: open when `s <= 0.3`, so `solidAt(s)` is true above that threshold.

The visual alpha should make closed barriers obvious and open barriers faint or absent.

### Balance Mote

Use `kind: "mote"` and the placement's `band`:

- Solid iff `band.min <= s && s <= band.max`.
- Same rule in both worlds.
- Default fixture band should be forgiving enough for replay and manual tuning, e.g.
  `[0.45, 0.55]` or wider if drift makes the first pass too fiddly.

## 4. Sun Drift Model

Add a segment-owned optional drift profile:

```ts
export interface DriftProfile {
  readonly direction: -1 | 1;
  readonly rate: number;
}

export interface SegmentData {
  readonly initialSun?: Sun01;
  readonly drift?: DriftProfile;
  // existing fields unchanged
}
```

`sun.ts` remains the only mutation point for `s`:

```ts
apply(input: InputSnapshot, dt: number, drift?: DriftProfile): void;
```

Update equation:

```ts
value = clamp(value + (input.sunDelta * SUN_INPUT_RATE + driftDelta) * dt, 0, 1);
```

where `driftDelta` is `drift.direction * drift.rate` when present, else `0`.

Design constraints:

- `rate` is in `s` units per second and must be non-negative.
- Player input rate must stay stronger than early drift fixture rates so
  counter-press can hold or recover.
- No-drift behavior is exactly M2 holding dial behavior.
- `resetSegment` resets to `data.initialSun ?? 0.5`.

## 5. Segment and Journey Data

M3 should add minimal fixture segments rather than full M4 content. A practical shape:

- Keep `m1-slice` first to preserve existing proof.
- Add a non-drift fixture using vine, door, and mote.
- Add a drift fixture using a mote/window or simple traversal that requires
  counter-input.

Every fixture must include at least one passing `solutionPath`. If a single combined
fixture becomes too brittle, split it into smaller fixtures; replay coverage matters
more than packing all mechanics into one room.

`main.ts` should instantiate `createJourney([...])` from a data export instead of
importing only `m1-slice` directly. `data/index.ts` can export the ordered segment list.

## 6. Rendering

Renderer should keep gameplay decisions out of presentation. Acceptable approaches:

- Switch on `e.kind` + `e.world` to choose fill/glow colors after reading
  `e.visualAt(s).alpha`.
- Or extend `ElementVisual` with display hints supplied by element implementations.

Do not use per-frame `shadowBlur`. If glow is needed for fungi/motes, pre-render a
small glow sprite once in `createRenderer()` and draw it additively, following the
existing avatar/core pattern.

Minimum visual differentiation:

- Ice: pale cyan slab.
- Vine day: warm/green vertical or horizontal silhouette.
- Fungi night: cyan/magenta bioluminescent platform.
- Door/gate: translucent barrier when closed.
- Mote: small bright platform/rectangle with stronger alpha inside its band.

## 7. Debug Overlay

The overlay already shows active segment id and `s`. M3 adds drift visibility:

- `drift=none` for no-drift segments.
- `drift=+rate` or `drift=-rate` for drift segments.
- Optional: show `initialSun` if useful for tuning.

The overlay remains read-only and dev-only.

## 8. Replay and Determinism

Replay continues to call the same `updateSegment` path as gameplay. Because drift is
segment data and `dt` is fixed, it is deterministic by construction.

Required gates:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

Manual browser playtest is still required for readability, but it does not replace
replay.

## 9. Tradeoffs

- **No ladder physics in M3.** This keeps the milestone focused and preserves the
  locked keyboard/control model. Vine/fungi are still useful as sun-controlled
  platforms.
- **Segment-owned drift.** This avoids global sun mode state and keeps no-drift
  teaching beats compatible.
- **Small fixture segments.** They are not final M4 content; they exist to prove the
  mechanics before full beat authoring.

## 10. Rollback Shape

- New element files can be reverted independently if one behavior proves wrong.
- Sun drift can be disabled by omitting `drift` from segment data.
- Fixture segments can be removed from the exported segment list without affecting
  existing `m1-slice`.
- Rendering differentiation is presentation-only and can be adjusted without changing
  replay results.
