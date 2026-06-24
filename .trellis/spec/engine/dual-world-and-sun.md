# Dual-World & Sun

> `src/game/world.ts`, `src/game/sun.ts`, `src/game/player.ts`. The signature
> mechanic of Meridian.

> **Status: Reconcile after M4 (2026-06-24).** Source: `plan.md` §3.1–3.4,
> §3.3, §4. M3 landed segment-owned drift profiles; M4 landed the Reunion
> hold-and-dissolve finale gate. Deeper gravity blending remains future scope.

---

## Dual world (`world.ts`)

One logical scene, **horizon at the vertical center** (plan §3.1):

- **Top = Day world (Sol).** Gravity **+y** (down).
- **Bottom = Night world (Luna).** Gravity **−y** (up). Rendered mirrored across
  the horizon.
- Each segment authors **two terrains** (top + bottom). They visually echo across
  the horizon but have **independently designed platforms** — that's what makes
  the puzzle real ("find inputs that work for both").
- `world.ts` owns the per-world `gravitySign` consumed by physics. The M4
  finale uses a hold-and-dissolve gate without changing the gravity model;
  deeper gravity blending remains post-MVP.

## Control coupling — mirror-sync (`player.ts`)

The two avatars are **linked**; one input snapshot drives both **every step**
(plan §3.2):

- Horizontal: **identical** (right → both right).
- Vertical/jump: **mirrored by inverted gravity** (jump → Sol up, Luna "down"
  toward screen bottom). Don't special-case this — it falls out of the per-world
  `gravitySign` (see [Physics & Math](./physics-and-math.md)).
- **No independent control, no turn-taking.** Both avatars exist and stay synced
  for the entire journey — sacrifice dims a core, it never removes a body
  (plan §3.5, §2 #19). Protecting this invariant is why there's no "solo" content.

## Shared sun `s ∈ [0,1]` (`sun.ts`)

One value, **opposite** effects top vs bottom. `sun.ts` is the **single owner**
of `s` and the only place it is clamped (see
[TypeScript Conventions](../project/typescript-conventions.md)).

Three behaviors, all in the main line (plan §3.3):

1. **Holding dial (teaching beats 1–4):** `s` holds its value when keys are
   released. Friendly, learnable; lets players reason about the inversion calmly.
2. **Drift zones (back third):** `s` **drifts** on its own (a slow pull toward a
   pole); the player must **counter-press to hold it steady**. This is the
   signature *"make the sun stand still"* (solstice) verb, and it supplies the
   time-tension a static dial lacks.
3. **Window queries:** some elements are valid only inside a **narrow `s` band**
   (e.g. dusk/noon ≈ 0.5). `sun.ts` exposes the current `s`; elements decide
   solidity via their own band (see [Elements](./elements.md)).

```ts
// shape only
class Sun {
  get value(): Sun01;                 // clamped [0,1]
  apply(input: InputSnapshot, dt: number, drift?: DriftProfile): void; // hold or drift+counter
  isHeldStill(target: Sun01, eps: number): boolean; // finale "solstice mark" query
}
```

## Drift profile contract (M3)

### 1. Scope / Trigger

Any segment that should pull the sun on its own declares a segment-owned
`DriftProfile`. This is a data contract between `data/segments/*`,
`game/segment.ts`, and `game/sun.ts`; replay depends on it staying deterministic.

### 2. Signatures

```ts
const SUN_INPUT_RATE = 0.8; // s units / second, owned by sun.ts

export interface DriftProfile {
  readonly direction: -1 | 1; // -1 => s moves toward 0, +1 => s moves toward 1
  readonly rate: number;      // s units / second
}

interface SegmentData {
  readonly initialSun?: Sun01;
  readonly drift?: DriftProfile;
}

interface Sun {
  apply(input: InputSnapshot, dt: number, drift?: DriftProfile): void;
}
```

### 3. Contracts

- `sun.ts` remains the only mutation/clamp point for `s`.
- No-drift segments omit `drift`; the holding dial behavior must remain exactly the
  M2 behavior.
- Drift segments pass `SegmentData.drift` into `Sun.apply(...)` every fixed step.
- `initialSun` controls both segment creation and checkpoint reset; fallback is
  `0.5`.
- `rate` is in `s` units per second and must be non-negative.
- Authored playable drift zones must use `rate < SUN_INPUT_RATE` (`0.8`) so a full
  counter-press can hold/recover the sun. Prefer a large tuning margin for early
  content; equality is not acceptable because it leaves no player authority.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| `drift` omitted | Holding dial; no autonomous movement |
| `rate < 0` | Throw during sun update / replay; invalid content |
| `rate >= SUN_INPUT_RATE` in authored content | Reject in review; replay may still be deterministic, but the player cannot counter-hold |
| `initialSun` omitted | Reset to `0.5` |
| `initialSun` outside `[0,1]` | Clamp in `sun.ts`; do not scatter clamping into data consumers |

### 5. Good/Base/Bad Cases

- Good: `drift: { direction: 1, rate: 0.12 }` with replay input that occasionally
  counter-presses `sunDelta: -1`.
- Base: no `drift` field on teaching segments; player sets `s`, then it holds.
- Bad: `drift: { direction: -1, rate: 0.8 }`; counter-input only cancels drift and
  cannot recover from overshoot.

### 6. Tests Required

- `npm run check:replay` must include at least one segment with a drift profile.
- The drift path must reach both exits with `resetCount === 0`.
- `npm run check:determinism` must stay green after adding/changing drift data.
- Manual tuning must verify the player can counter-press to hold or recover `s`.

### 7. Wrong vs Correct

#### Wrong

```ts
drift: { direction: 1, rate: 0.8 }
```

#### Correct

```ts
drift: { direction: 1, rate: 0.12 }
```

## Reunion finale gate (M4)

The Reunion segment is mechanical, not a cutscene. It uses segment data to gate
the earned ending:

```ts
interface FinaleData {
  readonly solsticeMarks: {
    readonly sol: AABB;
    readonly luna: AABB;
  };
  readonly sunWindow: { readonly min: Sun01; readonly max: Sun01 };
  readonly holdFrames: number;
  readonly dissolveFrames: number;
}

function finaleFusionProgress(state: SegmentState): number;
```

### 1. Scope / Trigger

Only the final `reunion-meridian` segment should carry `finale`. It replaces the
normal exit win check with a deterministic hold-and-dissolve gate, then journey
resolves the already-earned ending.

### 2. Signatures

- `SegmentData.finale?: FinaleData`
- `SegmentState.finaleHoldFrames: number`
- `SegmentState.finaleDissolveFrames: number`
- `finaleFusionProgress(state): number`

### 3. Contracts

- Both avatars must overlap their own `solsticeMarks` at the same time.
- The shared sun must stay within `sunWindow.min <= s <= sunWindow.max`.
- `finaleHoldFrames` increments only while both mark overlap and sun-window
  conditions are true; any interruption before completion resets hold to `0`.
- After hold completion, `finaleDissolveFrames` increments deterministically until
  it reaches `dissolveFrames`.
- When dissolve completes, the segment sets both reached flags and status
  `"won"`; `journey.ts` then resolves the ending. No finale input or UI choice is
  allowed.
- `finaleFusionProgress` returns `[0,1]`, with hold contributing the first half
  and dissolve the second half. Render/UI may read it; they must not write finale
  counters.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| One avatar off its mark | hold remains or resets to `0`; no dissolve |
| Sun outside window before hold completes | hold resets to `0`; no dissolve |
| Hold reaches `holdFrames` | dissolve begins |
| Dissolve reaches `dissolveFrames` | segment wins |
| Finale segment wins | journey enters `"ending"` and resolves accumulated consequence |

### 5. Good/Base/Bad Cases

- Good: `reunion-meridian` has `drift`, `finale`, one `branch: "main"` replay
  path, and no `choicePoint`.
- Base: a normal non-final segment omits `finale` and still uses both exits.
- Bad: resolving an ending from a button press, a UI overlay, or a choice made in
  the finale.

### 6. Tests Required

- `npm run check:replay` must include the Reunion path and end with
  `reason="won"` and `resetCount===0`.
- `npm run check:replay` must separately prove all four endings reachable from
  authored choice combinations; Reunion itself does not create those branches.
- Manual play must verify both marks and the sun-window presentation are legible.

### 7. Wrong vs Correct

#### Wrong

```ts
if (input.jump && state.data.finale !== undefined) {
  state.status = "won";
}
```

#### Correct

```ts
if (onSolMark && onLunaMark && inWindow) {
  state.finaleHoldFrames += 1;
}
```

---

## Forbidden

- ❌ Independent per-avatar input, or any turn-taking.
- ❌ Removing an avatar mid-run (breaks the dual-sync core; use core dimming).
- ❌ Mutating `s` anywhere but `sun.ts`; letting `s` leave `[0,1]`.
- ❌ Making the sun a binary high/low switch — preserve window-band puzzles.
