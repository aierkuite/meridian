# Error Handling & Performance

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §7, §9, §10,
> §13. Reconcile after M1/M2.

---

## Error handling

### Fail-fast in dev, fail-safe in prod

- **Dev:** assert invariants loudly. A broken segment invariant, an out-of-range
  `s`, or an unsolvable segment should throw immediately so it's caught at the
  source — not silently limp along.
- **Prod (the RAF loop):** never let one bad frame hard-crash the game. Wrap the
  per-frame `update`/`render` so an unexpected throw is logged and recovers to
  the **segment checkpoint** rather than freezing the page.

### Softlocks are build errors, not runtime surprises

The whole point of the solvability harness (`project/determinism-and-testing.md`)
is that "can the player get stuck?" is answered at build/CI time. A softlock that
reaches a player is a process failure — add the failing case to a `solutionPath`
and fix it.

### Player-facing failure is *designed*, not an error

Falls/death **exist and carry weight** (plan §9), but respawn is to the segment
start checkpoint — no grind, no progress loss beyond the current segment. That is
gameplay, handled in `game/segment.ts`, not exception handling. **No free skip**;
the humane backstop is graduated narration hints (`game/narration.ts`).

---

## Performance — the 60fps budget

Target: ~60fps on mid hardware, Chrome/Firefox/Safari (plan §14). The render
pipeline is the main risk; the simulation is the main allocation risk.

### Glow is the #1 perf trap

Canvas 2D `ctx.shadowBlur` is **slow** and must not run per-frame per-object.
Instead (plan §7, §10, §13):

- Pre-render glow to **offscreen glow sprites** once, then **additively
  composite** them each frame.
- Pool and **cap particles**; never allocate particle objects per frame.
- A WebGL/Pixi glow pass is added **only if** Canvas 2D misses the budget — not
  preemptively.

### No per-frame allocation in the hot path

- Reuse `Vec2`/`AABB` scratch objects; don't create them inside `update`/`render`.
- Pool particles and any transient collections.
- GC pauses are the enemy of a smooth 60fps — a clean frame allocates ~nothing.

---

## Debug & logging discipline (`dev/debugOverlay.ts`)

- Debug overlay shows `s` value, collision boxes, world bounds, drift state;
  bound to a **toggle key**, off by default.
- **No `console.log` spam inside the loop.** Gate any diagnostic logging behind a
  dev flag so production frames are silent.
- Keep all of this under `dev/`, loaded only in dev builds.
