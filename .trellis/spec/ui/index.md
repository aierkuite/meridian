# UI Layer — HUD & Overlays

> `src/ui/` (hud, overlay). The thin **presentation** layer for on-screen UI:
> the sun dial, pause/reset, title, the ×4 ending screens, and the graduated-hint
> surface. Reads simulation state; routes only player intent (pause/reset) back.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §3.4, §9, §10,
> §14. Reconcile after M1/M5.

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
