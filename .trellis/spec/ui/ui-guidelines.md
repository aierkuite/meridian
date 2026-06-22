# UI Guidelines

> `src/ui/hud.ts`, `src/ui/overlay.ts`.

> **Status: Reconcile after M1/M2 (2026-06-22).** M1/M2 landed the HUD, pause
> overlay, reset hint, and removed the M1 win card from progression. Title,
> ending screens, graduated hints, and polish cues remain M5/M4+ scope.

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

## Graduated-hint surface (no free skip)

Surface the escalating narration hints (`game/narration.ts` →
[`data/story.ts`](../data/narration-text.md)) at a genuine stuck-point. This is
the humane backstop **instead of** a skip button (plan §9). Present them quietly;
never a "skip level" affordance.

## Controls (plan §9)

Keyboard only: move `A/D` or `←/→`, jump `Space`, sun `↑/↓`, reset `R`, pause
`Esc`. Keep this the single source of the on-screen controls help.

---

## Forbidden

- ❌ Gameplay rules or state writes in UI handlers (send intent; decide in `game/`).
- ❌ A level-select or "level complete" screen (breaks the seamless journey).
- ❌ A free "skip" button (use graduated hints).
- ❌ Shipping fewer than the 4 ending screens.
