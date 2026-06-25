# UI Layer — HUD & Overlays

> `src/ui/` (hud, overlay). The thin **presentation** layer for on-screen UI:
> the sun dial, pause/reset, title, the ×4 ending screens, and the graduated-hint
> surface. Reads simulation state; routes only player intent (pause/reset) back.

> **Status: Reconcile after M5 (2026-06-25).** M1/M2 landed the HUD, pause
> overlay, reset hint, and no-win-card progression. M4 landed narration,
> graduated hints, finale progress, and ending screens; **M5 landed the
> title/start flow (AppPhase in main.ts) and per-ending screen atmosphere.**

---

## What lives here

| Guide | What it covers |
|-------|----------------|
| [UI Guidelines](./ui-guidelines.md) | Sun-dial HUD, pause/reset, title + ×4 ending screens, graduated-hint surface, controls map |

---

## Pre-Development Checklist

- [ ] Is the UI **reading** sim state for display, and only sending **intent**
      (pause/reset) back — not gameplay decisions?
- [ ] Is the experience **seamless** — no level-select, no hard "level complete"
      screen (plan §3.4)?
- [ ] Is text **English** and minimal?
- [ ] Are all ×4 ending screens covered?

## Quality Check

- [ ] Sun dial reflects `s` live (incl. drift).
- [ ] `R` resets the segment; `Esc` pauses; controls match plan §9.
- [ ] Graduated hints surface at a stuck-point (no free skip).
- [ ] All 4 ending screens render and match the resolved `ending.id`.

---

## Scope (plan §9, §10, §14)

- **Sun dial:** subtle arc/orb HUD reflecting `s` (visual owned with `render/`
  palette; the HUD places it).
- **Pause** (`Esc`) and **reset hint** (`R`).
- **Title** screen and **×4 ending screens** (One Sky / Vow / Afterglow / Long
  Dark), each matching the resolved ending and its audio resolution.
- **Graduated-hint backstop:** surfaces the escalating narration hints at a
  genuine stuck-point — **no free skip** (plan §9).
- **Controls:** keyboard only — move `A/D` or `←/→`, jump `Space`, sun `↑/↓`,
  reset `R`, pause `Esc` (plan §9).
