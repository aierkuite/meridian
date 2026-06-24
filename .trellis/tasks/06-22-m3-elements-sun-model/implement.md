# M3 — Implementation Plan

> Active task: `.trellis/tasks/06-22-m3-elements-sun-model`. The user plans to
> continue implementation in Claude Code with sub-agents, so `implement.jsonl` and
> `check.jsonl` are curated even though the current Codex session is inline.

## Validation Commands

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`
- `npm run dev` for manual browser playtest

## Conventions

- Simulation (`engine/` + `game/`) stays deterministic and render-free.
- Presentation (`render/` + `ui` + `audio`) reads simulation only.
- No `any`; no non-null `!` to silence TypeScript.
- `sun.ts` is the only mutation/clamp point for `s`.
- Segment data is readonly and every segment has replayable `solutionPaths`.
- Code comments must be Chinese; new method/function comments document purpose,
  parameters, and return value.
- Do not implement M4 consequence, endings, adaptive narration, or choice points.

## Step 1 — Load Context

- In Claude Code, start with the active task path:
  `.trellis/tasks/06-22-m3-elements-sun-model`.
- Read `prd.md`, `design.md`, and this `implement.md`.
- Read every file listed in `implement.jsonl`.
- Use `check.jsonl` later for the verification sub-agent.

## Step 2 — Expand Element Types

- Update `meridian/src/game/element.ts`:
  - `ElementKind = "ice" | "vine" | "door" | "mote"`.
  - Add a `SunBand` type and optional band data on `ElementPlacement`.
  - Make `createElement` exhaustive.
- Preserve existing `ice` behavior and `m1-slice` replay.
- Validate: `npm run typecheck`.

## Step 3 — Add Element Implementations

- Add:
  - `meridian/src/game/elements/vine.ts`
  - `meridian/src/game/elements/door.ts`
  - `meridian/src/game/elements/mote.ts`
- Implement thresholds from `design.md`.
- Add band validation for mote construction.
- Keep all behavior deterministic and free of render imports.
- Validate: `npm run typecheck`, `npm run check:determinism`.

## Step 4 — Add Sun Drift Support

- Update `meridian/src/game/sun.ts`:
  - Add `DriftProfile`.
  - Change `apply(input, dt, drift?)`.
  - Validate drift rate and keep clamping centralized.
- Update `meridian/src/game/segment.ts`:
  - Add `initialSun?: Sun01` and `drift?: DriftProfile` to `SegmentData`.
  - Initialize/reset sun from `data.initialSun ?? 0.5`.
  - Pass `state.data.drift` into `state.sun.apply`.
- Validate: typecheck, determinism, replay.

## Step 5 — Add Replay-Covered M3 Fixtures

- Add minimal segment data under `meridian/src/data/segments/`.
- Cover every new element kind and at least one drift profile.
- Keep geometry bounded and small; split into two fixtures if one combined route is
  brittle.
- Each fixture needs at least one passing `SolutionPath`.
- Update `meridian/src/data/index.ts` to export the ordered segment list.
- Update `meridian/src/main.ts` and replay script imports if needed so gameplay and
  replay consume the same segment list.
- Validate: `npm run check:replay`.

## Step 6 — Render New Element Visuals

- Update `meridian/src/render/renderer.ts` to draw new kinds distinctly.
- Keep rendering decisions presentation-only.
- Do not add per-frame `shadowBlur`.
- Reuse or pre-render glow sprites if adding glow for mote/fungi.
- Validate: typecheck and manual browser readability.

## Step 7 — Update Debug Overlay

- Update `meridian/src/dev/debugOverlay.ts` to display active drift state.
- Keep it read-only and dev-only.
- Ensure `dev/replay.ts` still does not import debug/render/UI modules.
- Validate: typecheck, replay, build.

## Step 8 — Manual Browser Pass

- Run `npm run dev`.
- Check:
  - M1 ice segment remains playable.
  - New M3 fixture(s) are playable enough for tuning.
  - `R` resets to `initialSun`.
  - Drift visibly changes `s` and counter-input can hold/recover it.
  - Debug overlay shows drift info.
  - New elements are visually distinguishable.

## Step 9 — Final Quality Gate

- Run:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`
- Search touched render files for `shadowBlur`.
- Review diff for accidental M4 scope.
- If implementation surfaces a durable new rule, update `.trellis/spec/` during
  Phase 3.3 before committing.

## Risk Files

- `meridian/src/game/element.ts`
- `meridian/src/game/elements/*.ts`
- `meridian/src/game/sun.ts`
- `meridian/src/game/segment.ts`
- `meridian/src/data/index.ts`
- `meridian/src/data/segments/*.ts`
- `meridian/src/render/renderer.ts`
- `meridian/src/dev/debugOverlay.ts`
- `meridian/src/main.ts`
- `meridian/src/dev/replay.ts`

## Rollback Points

- Element type expansion + new element files.
- Sun drift contract.
- Fixture segment registration.
- Renderer/debug overlay presentation updates.
