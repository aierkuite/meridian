# UI Guidelines

> `src/ui/hud.ts`, `src/ui/overlay.ts`.

> **Status: Reconcile after M5 (2026-06-25).** M1/M2 landed the HUD and pause
> overlay; M4 landed narration, graduated hints, finale progress, and four
> ending screens; **M5 landed the title/start flow and per-ending screen
> atmosphere** (as-built contract below).

---

## Keep it thin and one-directional

The UI **reads** simulation state to display it, and sends back only **player
intent** (pause, reset). It must not contain gameplay rules or write gameplay
state. If a UI handler is about to decide a game outcome, that logic belongs in
`game/`.

```ts
// shape only
function drawHud(ctx, sim) {                 // reads sim, draws
  drawSunDial(ctx, sim.sun.value, sim.sun.drifting);
}
function onKey(e) {                            // sends intent only
  if (e.key === "Escape") sim.togglePause();
  if (e.key === "r" || e.key === "R") sim.resetSegment();
}
```

## HUD — the sun dial

A subtle arc/orb reflecting `s`, including its **drift** state in the back third
(so the player can see the sun pulling and counter-press). The visual style comes
from the `render/` palette; the HUD just positions and updates it.

## Seamless — no menus mid-journey

No level-select and **no hard "level complete" screen** (plan §3.4). Transitions
are camera scrolls (engine), not UI screens. The only full screens are the
**title** and the **endings**.

### M5 polish candidate: loop-back completion feedback

M2's single-segment loop-back fixture can complete with a weak visible cue:
both avatars reach exits, the journey enters transition, then the same segment
reloads from `camera.targetX=0`. This is acceptable infrastructure for M2, but
M5 should add a minimal completion visual cue that is not a hard win card and
does not affect replay or gameplay state.

## Title + ×4 ending screens

One title screen, and **four** ending screens — One Sky / The Vow / The Afterglow
/ The Long Dark — each matching the resolved
[`ending.id`](../engine/segments-flow-and-endings.md) and pairing with its audio
resolution. All four must be reachable and verified.

### M5 title-flow contract (as-built)

1. **Scope / Trigger.** The app boots into a title screen; the journey must not
   advance until the player starts.

2. **State ownership.** `AppPhase = "title" | "playing"` lives ONLY in `main.ts`
   (presentation), never in `game/journey.ts` — so determinism/replay are
   unaffected. `src/ui/title.ts` exposes `drawTitleScreen(ctx, width, height)`.

3. **Contracts.**
   - While `appPhase === "title"`, `main.ts` does NOT call `updateJourney` (no sim
     drift / no consequence or segment writes).
   - Start gesture = **Space rising edge**. On it: `appPhase = "playing"` and
     `audio.unlock()` (single idempotent unlock path; the first-key
     `unlockAudioOnce` listener is the fallback — do not add duplicate unlock).
   - **Anti-input-leak:** the starting Space press must not become a first-frame
     jump. Guard with `awaitingStartRelease` — defer the first `updateJourney`
     until Space releases (gameplay edge-detects `jump && !prevJump`).
   - Pause is gated to non-terminal play: `Esc` toggles pause only when
     `journey.status !== "ending"`; the pause overlay draws only when
     `appPhase === "playing" && paused`.
   - Ending-screen atmosphere: `drawEndingScreen` switches a per-`EndingId` mood
     (scrim tint + title color/alpha + optional glow) via an exhaustive switch,
     while still reading `endingTextFor(ending)`. It never calls `resolveEnding`.

4. **Validation & Error Matrix.**

   | Condition | Required behavior |
   |-----------|-------------------|
   | boot | title screen shows; sim does not advance |
   | Space on title | journey starts + audio unlocks; no first-frame jump |
   | `Esc` on ending | ignored (no meaningless pause blocking `R`) |
   | `R` on ending | full journey restart (unchanged) |

5. **Good/Base/Bad.** Good: `if (appPhase === "title") return;` before
   `updateJourney`. Base: in-journey HUD unchanged. Bad: storing `appPhase` in
   `journey` / advancing the sim behind the title.

6. **Tests Required.** `npm run check:determinism` + `check:replay` green (title
   state is presentation-only). Manual: title→start→play→endings flow.

7. **Wrong vs Correct.** Wrong: `updateJourney(...)` runs every frame including
   title. Correct: title phase early-returns; play begins on Space-release.

### M4 ending screen contract

1. Scope / Trigger

   Any terminal UI must be driven by `JourneyState.status === "ending"` and
   `JourneyState.resolvedEnding`. UI must not run `resolveEnding` itself.

2. Signatures

   ```ts
   function drawEndingScreen(
     ctx: CanvasRenderingContext2D,
     width: number,
     height: number,
     ending: EndingId,
   ): void;
   ```

3. Contracts

   - `drawEndingScreen` reads `endingTextFor(ending)` for the title and closer.
   - The screen may show the restart prompt `Press R to begin again.`
   - Pressing `R` while journey status is `"ending"` restarts the full journey
     with fresh consequence. Pressing `R` during `"playing"` or
     `"transitioning"` resets only the current segment.
   - No level-select, ending gallery, continue/save, or skip affordance is part
     of M4.

4. Validation & Error Matrix

   | Condition | Required behavior |
   |-----------|-------------------|
   | `resolvedEnding` is `"one-sky"` | One Sky title and closer render |
   | `resolvedEnding` is `"vow"` | The Vow title and closer render |
   | `resolvedEnding` is `"afterglow"` | The Afterglow title and closer render |
   | `resolvedEnding` is `"long-dark"` | The Long Dark title and closer render |
   | User presses `R` on ending screen | full journey restart |

5. Good/Base/Bad Cases

   - Good: render the title/closer from `endingTextFor(journey.resolvedEnding)`.
   - Base: in-journey HUD shows beat text and no full-screen card.
   - Bad: showing a menu that lets the player choose an ending after Reunion.

6. Tests Required

   - `npm run check:replay` must prove all four ending ids reachable.
   - Manual browser review must verify the screen text is readable and matches
     the resolved ending.

7. Wrong vs Correct

   Wrong:

   ```ts
   const ending = resolveEnding(uiLocalConsequence);
   ```

   Correct:

   ```ts
   drawEndingScreen(ctx, width, height, journey.resolvedEnding);
   ```

## Graduated-hint surface (no free skip)

Surface the escalating narration hints (`game/narration.ts` →
[`data/story.ts`](../data/narration-text.md)) at a genuine stuck-point. This is
the humane backstop **instead of** a skip button (plan §9). Present them quietly;
never a "skip level" affordance.

The HUD may also show the Reunion finale progress by reading
`finaleFusionProgress(activeSegment)`. This is a read-only progress surface, not
an input gate.

## Controls (plan §9)

Keyboard only: move `A/D` or `←/→`, jump `Space`, sun `↑/↓`, reset `R`, pause
`Esc`. Keep this the single source of the on-screen controls help.

---

## Forbidden

- ❌ Gameplay rules or state writes in UI handlers (send intent; decide in `game/`).
- ❌ A level-select or "level complete" screen (breaks the seamless journey).
- ❌ A free "skip" button (use graduated hints).
- ❌ Shipping fewer than the 4 ending screens.
