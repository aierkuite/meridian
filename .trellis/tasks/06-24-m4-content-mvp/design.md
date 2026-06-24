# M4 — Technical Design

> Source requirements: `prd.md`. Scope: author the MVP content journey and add
> the minimal shared systems required for consequence-driven endings, narration,
> hints, and the mechanical reunion finale.

## 1. Architecture Boundary

M4 preserves the M3 split:

| Area | Files | Rule |
|------|-------|------|
| Simulation | `meridian/src/engine/`, `meridian/src/game/` | deterministic, render-free, owns consequence, ending, narration selection, finale state |
| Data | `meridian/src/data/` | readonly segments and story text; no behavior |
| Presentation | `meridian/src/render/`, `meridian/src/ui/`, `meridian/src/audio/` | reads state only; displays dimming, narration, hints, and endings |
| Tooling | `meridian/src/dev/`, `meridian/scripts/` | validates replay, branch coverage, determinism, and ending reachability |

No renderer, UI, audio, DOM, canvas, or wall-clock read may enter the simulation
path. Replay must continue to run without presentation modules.

## 2. MVP Journey Data

Replace the exported player-facing chain with formal M4 content:

1. `prologue-splitting`
2. `beat-1-day-ice`
3. `beat-2-night-bridge`
4. `interlude-ice-echo`
5. `beat-3-vine-fungi`
6. `beat-4-doors-choice`
7. `beat-5-balance-mote`
8. `beat-6-drift-choice`
9. `beat-7-master-choice`
10. `reunion-meridian`

The existing M1/M3 fixture files can remain for developer reference only if they
are removed from the exported journey. Formal segment files should follow the
current `SegmentData` pattern: terrain, elements, starts, exits, optional
`initialSun`, optional `drift`, and mandatory `solutionPaths`.

## 3. Choice-Point Contract

Add a data-only choice-point declaration to `SegmentData`:

```ts
type ChoicePointId = "doors-cost" | "drift-cost" | "master-cost";

interface LightCost {
  readonly sol: number;
  readonly luna: number;
}

interface ChoicePointData {
  readonly id: ChoicePointId;
  readonly shortcutZone: {
    readonly world: "day" | "night";
    readonly box: AABB;
  };
  readonly cost: LightCost;
  readonly storyKey: string;
}
```

Runtime behavior:

- A shortcut is recorded once when the relevant avatar overlaps the explicit
  `shortcutZone`.
- `whole` means the segment is completed without triggering that shortcut zone.
- `resetSegment` never clears already-recorded consequence.
- The zone must be visually/narratively signposted so cost feels authored, not
  accidental.
- M4 targets three choice points:
  - Beat 4 spends Sol light.
  - Beat 6 spends Luna light.
  - Beat 7 spends both halves.

This gives enough branch combinations to reach full, partial, lopsided, and
depleted ending states without divergent level geometry.

## 4. Consequence State

Add `game/consequence.ts`:

```ts
type ChoiceRoute = "whole" | "shortcut";

interface Consequence {
  readonly solLight: number;
  readonly lunaLight: number;
  readonly shortcutsTaken: number;
  readonly choices: Readonly<Record<ChoicePointId, ChoiceRoute | "unresolved">>;
}
```

Implementation may keep the object mutable internally for the active run, but
the exported type should be small and serializable. Clamp light in the
consequence module, not scattered across render or ending logic.

Only choice-point shortcut triggers call the spend function. Incidental death,
reset, and normal segment transitions must not write consequence.

## 5. Ending Resolver

Add `game/ending.ts`:

```ts
type EndingId = "one-sky" | "vow" | "afterglow" | "long-dark";

function resolveEnding(consequence: Consequence): EndingId;
```

The resolver is pure and deterministic. A practical threshold table:

- `one-sky`: both lights are near full and no shortcuts were taken.
- `long-dark`: both lights are at or near zero.
- `afterglow`: one half is near zero or the light gap is large.
- `vow`: everything else with partial but not ruined light.

Threshold constants live in `ending.ts` and are validated by replay/ending
reachability checks. Presentation uses the resolved `ending.id`; it does not
recompute ending rules.

## 6. Journey End State

Extend `JourneyStatus` from the current `"playing" | "transitioning"` to include
a terminal ending state:

```ts
type JourneyStatus = "playing" | "transitioning" | "ending";
```

`JourneyState` owns:

- `consequence`
- current narration/hint state
- optional `resolvedEnding`

When a non-final segment wins, journey transitions to the next segment. When
the Reunion segment wins, journey resolves the ending and enters `"ending"`
instead of looping back to segment 0.

## 7. Reunion Finale

Add a final segment metadata block:

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
```

The final segment remains mechanical:

1. The sun drifts.
2. Both avatars must stand on their solstice marks.
3. The sun must be inside the required window for `holdFrames`.
4. A deterministic dissolve/fusion counter runs for `dissolveFrames`.
5. The segment reports won; journey resolves the earned ending.

If full gravity interpolation becomes too risky during execution, keep the
MVP-safe fallback: use the hold-and-dissolve finale gate as the mechanical
requirement, expose a `fusionProgress` value for render/UI, and leave deeper
gravity blending for M5/stretch. Do not add a last-second ending choice.

## 8. Narration and Hints

Add text as data in `data/story.ts`, and selection logic in `game/narration.ts`.

Data shape:

- openings and beat lines by segment id
- choice prompts by choice id
- adaptive lines keyed by coarse consequence band
- hint ladders by segment id
- ending titles and closers by ending id

Selection logic reads segment id, consequence, active choice state, and stuck
timer counters. It never embeds long text literals in simulation code.

Hints are no-skip backstops. They can escalate based on deterministic frame
counters since segment start or reset, but must not change segment state,
solution paths, or ending state.

## 9. Presentation

Renderer reads consequence to dim avatar cores. Keep dimming as brightness/alpha
so the meaning is not hue-only.

UI/HUD reads:

- active narration line
- optional hint line
- finale progress/window state
- resolved ending id and story text

The ending screen is the only full-screen terminal UI added in M4. There is no
level-select and no hard level-complete card.

Audio may read the resolved ending id for later M5 hooks, but M4 should not
expand into the full SFX/music polish milestone.

## 10. Replay and Validation

Extend replay tooling in the smallest useful way:

- Existing per-segment path pass/fail stays intact.
- Choice-point segments must contain both `branch: "whole"` and
  `branch: "shortcut"` paths.
- Shortcut paths should assert that the expected consequence cost was applied.
- Whole paths should assert that no cost was applied.
- Ending reachability should enumerate authored choice combinations or canonical
  consequence states and prove the four ending ids are all returned.

Required gates from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

Manual browser pass remains required for readability and softlock sanity, but
manual play does not replace replay coverage.

## 11. Tradeoffs

- Three choice points are chosen instead of the minimum two because they make
  all four endings testable without inventing heavier branch geometry.
- Choice points use explicit shortcut zones rather than separate branch levels,
  preserving the plan's single linear playable path.
- Finale mechanics are bounded to marks + sun hold + dissolve progress. This
  delivers the required earned reunion while avoiding a broad physics rewrite if
  gravity blending threatens M4 stability.
- Existing M1/M3 fixtures should not be deleted unless doing so is necessary;
  removing them from the exported journey is enough to make M4 player-facing.

## 12. Rollback Shape

- Consequence and ending modules can be reverted independently if thresholds or
  state shape prove wrong.
- Choice-point segment metadata can be disabled by removing `choicePoint` from
  affected segments.
- Formal segment exports can be temporarily reduced to the last green subset
  while preserving fixtures for debugging.
- Presentation changes for dimming/narration/endings are read-only and can be
  adjusted without changing replay outcomes.
