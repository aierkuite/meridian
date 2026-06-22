# M2 — Technical Design

> Source requirements: `prd.md`. Scope: harden the M1 slice into the deterministic,
> replay-tested journey spine required before M3/M4 content work.

---

## 1. Architecture Boundary

M2 keeps the same boundary established in M1:

| Area | Files | Rule |
|------|-------|------|
| Simulation | `src/engine/`, `src/game/`, `src/data/` consumers | deterministic, render-free, no DOM/audio/canvas reads |
| Presentation | `src/render/`, `src/ui/`, `src/audio/` | reads simulation, sends reset/pause/debug intent only |
| Tooling | `src/dev/`, `scripts/` | replay/debug helpers; may import simulation and data, never presentation for replay |

The main new shape is a `JourneyState` around `SegmentState`: segments remain bounded
local data, while the journey owns the active segment index, camera transition state,
and current checkpoint reset target.

---

## 2. Segment Data Contract

Current `SegmentData` already has most M1 fields:

```ts
interface SegmentData {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];
  readonly nightTerrain: readonly AABB[];
  readonly elements: readonly ElementPlacement[];
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: ExitZones;
  readonly solutionPaths?: readonly InputSnapshot[][];
}
```

M2 makes solution paths mandatory and changes them from raw per-frame arrays to a
compact, named run list:

```ts
type SolutionInput = Pick<InputSnapshot, "moveX" | "jump" | "sunDelta">;

interface SolutionStep {
  readonly frames: number;
  readonly input: SolutionInput;
}

interface SolutionPath {
  readonly id: string;
  readonly branch?: "main" | "whole" | "shortcut";
  readonly maxFrames: number;
  readonly steps: readonly SolutionStep[];
}

interface SegmentData {
  readonly id: string;
  readonly dayTerrain: readonly AABB[];
  readonly nightTerrain: readonly AABB[];
  readonly elements: readonly ElementPlacement[];
  readonly starts: { readonly sol: Vec2; readonly luna: Vec2 };
  readonly exits: ExitZones;
  readonly solutionPaths: readonly SolutionPath[];
}
```

`restart` and `pause` stay out of `SolutionInput`; replay should test the authored route,
not UI affordances. Future M4 choice-point data can add branch metadata without changing
the harness loop.

---

## 3. Journey Runtime and Camera

Add `game/journey.ts` as the owner of linear progression:

```ts
interface JourneyState {
  readonly segments: readonly SegmentData[];
  readonly active: SegmentState;
  activeIndex: number;
  status: "playing" | "transitioning";
  readonly camera: CameraState;
}
```

`updateJourney(state, input, dt)`:

1. Handles `restart` intent by resetting the active segment checkpoint.
2. If playing, delegates to `updateSegment`.
3. When the active segment is won, enters `transitioning`.
4. Advances camera transition by fixed-step counters.
5. On transition completion, loads the next segment. If no next segment exists in the
   M2 fixture chain, loop/reset for development playability.

`engine/camera.ts` becomes a deterministic state module:

```ts
interface CameraState {
  x: number;
  targetX: number;
  transitionFramesRemaining: number;
}
```

The renderer receives camera state and applies an x-offset. Gameplay collision remains
in segment-local coordinates to avoid making segment authoring depend on world offsets.

For validating seamless advance without pulling in M4 content, M2 may add a minimal
second segment that reuses existing ice/no-new-element behavior. Its purpose is to prove
the loader/camera chain; it is not final MVP content.

---

## 4. Physics Feel and Edge Cases

`player.ts` owns deterministic feel windows because they are player-control semantics,
not raw collision math:

- `coyoteFramesRemaining` per avatar or shared per avatar state
- `jumpBufferFramesRemaining` on the player, set from the jump edge
- constants expressed in frames at `DT = 1 / 120`

Jump fires when:

- the buffer is active, and
- the avatar is grounded or still inside its coyote window

The same buffered jump decision is applied to both avatars through the same input edge;
there is still no independent control. Grounding continues to derive from
`gravitySign`, so Luna remains the same integrator with inverted gravity.

Physics hardening should also cover:

- stable collision resolution when landing on undersides in the night world
- no tunneling through thin M1 platforms at current velocities
- no sticky wall state after side collisions
- clean velocity reset when a checkpoint reset occurs

---

## 5. Replay Harness

Add `src/dev/replay.ts` with pure simulation entry points:

```ts
interface ReplayResult {
  readonly segmentId: string;
  readonly pathId: string;
  readonly reachedExit: boolean;
  readonly resetCount: number;
  readonly framesRun: number;
  readonly reason: "won" | "timeout" | "reset" | "missing-path";
}
```

Core loop:

1. Create a fresh segment/journey fixture from readonly data.
2. Expand compact `SolutionStep` runs into fixed-step snapshots.
3. Call the same simulation update path used by gameplay.
4. Stop when both exits are reached, a reset is detected, or `maxFrames` expires.
5. Throw/report failure for missing paths, timeouts, unexpected resets, or paths that do
   not produce the won state.

Node cannot import TypeScript source directly with the current dependency set. Use Vite's
existing dev dependency from `scripts/check-replay.mjs`:

```js
import { createServer } from "vite";
const server = await createServer({ server: { middlewareMode: true } });
const mod = await server.ssrLoadModule("/src/dev/replay.ts");
await mod.runReplaySuite();
await server.close();
```

This avoids adding a new CLI dependency just to execute TypeScript.

---

## 6. Debug Overlay

Add `src/dev/debugOverlay.ts`:

- loaded only when `import.meta.env.DEV`
- toggled by a tracked debug key, recommended backquote (`Backquote`) to avoid player
  controls
- draws text and boxes after the main renderer
- reads `JourneyState`/`SegmentState`/camera only

Minimum display:

- active segment id/index and journey status
- `s` value
- Sol/Luna positions, velocities, and grounded/coyote/buffer state
- day/night terrain, currently solid element boxes, exits, world bounds
- camera x/target/transition frames

No `console.log` inside loops; all diagnostics stay visual and opt-in.

---

## 7. Main Wiring

`main.ts` should stay wiring-only:

- create input, journey, renderer, audio, debug overlay
- update pause/reset/debug intent
- call `updateJourney` when not paused
- render scene from current journey/segment and camera
- remove the M1 win-card-as-progression path

Audio remains presentation and continues to read `active.sun.value`.

---

## 8. Tradeoffs

- **Compact solution steps instead of per-frame arrays.** Easier to author and review;
  replay still expands to fixed-step snapshots so determinism stays exact.
- **Segment-local gameplay coordinates.** Keeps existing M1 data usable and makes camera
  a presentation/transition concern; later content can author each beat in the same
  bounded 1280×720 local frame.
- **Vite SSR for replay scripts.** Reuses installed tooling and avoids adding `tsx` or
  a bundling step during M2.
- **Minimal second segment allowed.** This is the smallest way to prove camera advance
  without treating M2 as content production.

---

## 9. Rollback Shape

M2 can be reverted by subsystem:

- replay harness and package script can be removed without changing runtime gameplay
- debug overlay can be removed without changing simulation
- journey/camera changes are the riskiest runtime seam; keep commits small enough that
  M1's single-segment flow can be restored with one revert if needed

