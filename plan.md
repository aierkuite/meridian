# Meridian — Project Plan

> An open-source, browser-based **dual-pole puzzle-platformer** inspired by the June Solstice.
> One being, split in two at the solstice — one half in endless day, one in endless night —
> sharing a single sun, journeying to reunite at the horizon (the *meridian*).

**Status:** Planned (not yet implemented). This document is the single source of truth for execution.
**Not a jam submission** — this is an open-source project; the original jam judging criteria are kept only as a *quality compass* (see §16), not as scoring targets.

---

## 1. One-liner & Pitch

You control **two linked silhouettes at once** — *Sol* in a world of endless daylight (top of the screen) and *Luna* in a world of endless night (bottom, mirrored across a glowing horizon, gravity inverted). A single sun, which you raise and lower, is a **resource for one world and a threat to the other**. Every move is mirrored; every puzzle asks: *what single action serves both opposite worlds at once?*

This is **not a gentle game.** It is a melancholy myth about a severed self reaching across an uncrossable line. Falls and death exist (fair, readable, checkpointed); some crossings demand a **sacrifice that does not come back**; and the choices you make along the way **decide which of several endings** you reach at the meridian — none of them simply happy. The solstice is the year's turning point: the longest day is also where the light begins to die.

---

## 2. Locked Decisions (Decision Ledger)

Every item below was decided during planning and is **fixed** unless execution surfaces a defect.

| # | Decision | Choice |
|---|----------|--------|
| 1 | Time budget | 2+ weeks, **no hard deadline** → self-imposed MVP freeze (see §12) |
| 2 | Team / assets | Solo: user directs, Claude writes all code. User supplies music (local, swappable); Claude does code + procedural SFX + procedural art |
| 3 | Tech stack | **Web / HTML5**: Vanilla **Canvas 2D + TypeScript + Vite**. Optional WebGL/Pixi glow layer *only* as a perf fallback |
| 4 | Core concept | **Dual-Pole** — "One Solstice, Two Poles" |
| 5 | Spatial layout | **Stacked-mirror side-view**: day world top, night world bottom, mirrored across a luminous horizon, **inverted gravity** below |
| 6 | Control coupling | **Gravity-mirror sync**: both avatars receive the same input simultaneously; left/right identical; jump mirrored (top jumps up, bottom jumps down) |
| 7 | Light rule | **Shared sun value** with **opposite effects** in the two worlds; over-light becomes a threat. Dial **holds** in teaching beats; **drifts** in the back third so "make the sun stand still" (solstice) is a real main-line verb. Some puzzles need a **narrow `s` window**, not just high/low (see §3.3, §4) |
| 8 | Level structure | **Seamless linear journey** (INSIDE/Limbo-style): no level-select, flowing camera; under the hood a linear chain of bounded, guaranteed-solvable segments; **bittersweet multi-ending finale** (§3.5); a few optional non-gating alcoves for light exploration flavor |
| 9 | Narrative | Mythic **"two halves"** — *Sol* (Sun-child) & *Luna* (Moon-child), one being split at the solstice; sparse poetic narration between beats; **English** |
| 10 | Art direction | **Silhouette + glow**, fully procedural (gradients, glow, particles, dynamic light/shadow). Warm/amber top; indigo/teal + bioluminescence bottom; luminous horizon seam. Avatars = silhouettes with glowing cores (warm vs cool). AI/CC0 only for incidental texture |
| 11 | Audio | User-provided music (local, swappable; repo ships a **CC0 default**) + **real-time sun-driven low-pass/reverb filter** ("music breathes with light") + **procedural Web Audio SFX**; reunion swell |
| 12 | Title | **Meridian** |
| 13 | Language | **English** for all player-facing text, narration, and README |
| 14 | Prize category | **None** (dropped) |
| 15 | Delivery | **Open-source**: MIT license (code), strong English README, **GitHub Pages** live demo + public GitHub repo, `git init` |
| 16 | Music & OSS | Repo ships a **license-clean CC0 default track** (clone-and-play, fully redistributable); user's preferred track is a **local, gitignored, swappable** asset |
| 17 | Tone | **Bittersweet / tragic**, not gentle. Consequence, dread, loss are intentional. Solstice = turning point (longest day → the light begins to die). *(reviewer-driven, user-confirmed)* |
| 18 | Death & difficulty | Falls/death **exist** but **fair, readable, checkpointed** (no grind); deliberate non-twitch puzzle pacing kept. **No free skip** — the ending is earned; only graduated hints backstop a true stuck-point |
| 19 | Sacrifice (cost = light) | The currency of sacrifice is **light**: each cruel shortcut **dims a half's glowing core** (visible, ties art+theme). Permanent within a run. **Avatars are never removed mid-journey** (state only — protects the dual-sync core); the accumulated dimming is what the finale expresses |
| 20 | Branching | **Accumulated-state → multiple endings** (model 1). Single linear *playable* path; the ending is **determined entirely by mid-journey play** (light preserved + evenness across the two halves). **No separate finale choice** — the finale *plays out* the ending you earned. ~4 endings. Convergent playable branches = stretch; full branch tree = rejected |

---

## 3. Core Mechanic Spec (precise)

### 3.1 Dual world & coordinates
- A single logical scene with the **horizon at the vertical center** of the viewport.
- **Top half = Day world** (Sol). Gravity points **down** (+y).
- **Bottom half = Night world** (Luna). Gravity points **up** (−y). Rendered mirrored across the horizon.
- Each segment authors **two terrains** (top + bottom). They are *mirrored in spirit* (visually echo across the horizon) but have **independently designed platforms/elements** so the puzzle is real ("find inputs that work for both").

### 3.2 Control coupling (gravity-mirror sync)
- One input vector drives **both** avatars every frame.
- Horizontal: identical (press right → both move right).
- Vertical/jump: mirrored by inverted gravity (press jump → Sol jumps up, Luna jumps "down" toward screen bottom).
- No independent control, no turn-taking.

### 3.3 Shared sun value `s ∈ [0,1]`
- Player sets `s` with `↑ / ↓`.
- **Default (teaching beats 1–4):** a **dial that holds** its value when keys released — friendly, learnable; lets players reason about the inversion calmly.
- **Drift zones (back third, main line):** in late segments `s` **drifts** on its own (a slow pull toward a pole). The player must actively **counter-press to hold it steady** — this is the signature *"make the sun stand still"* (solstice) verb, in the **main line, not stretch**. It also supplies the time-tension a static dial lacks. *(Resolves the reviewer "hold-the-sun mis-prioritized" consensus.)*
- Element behaviors are functions of `s`, **opposite** for top vs bottom (see §4).
- **Window-value puzzles:** some elements are valid only inside a **narrow `s` band** (e.g. dusk/noon), forcing "find the one moment both worlds survive" rather than a high/low binary toggle (see §4, element 4). *(Resolves the "dial degenerates into a switch" note.)*

### 3.4 Win / progress condition
- Per segment: **both** avatars reach their respective exits → seamless camera advance to the next segment.
- Falls/death send the pair to the **segment's start checkpoint** (no grind, no progress loss beyond the current segment). Death is fair and readable, never the engine of the branch (see §3.5).
- **Final segment = mechanical reunion (not a cutscene), with no last-second choice:** the sun drifts; only when **both avatars stand on their "solstice marks"** does the sun **stand still**; the held sun **dissolves the horizon into a shared zone** and the two inverted gravities **blend**. The finale then **plays out the ending your journey earned** (§3.5) — how whole, or how dimmed, the two arrive. Music filter opens fully; glow blooms or gutters by ending.

### 3.5 Consequence, choices & endings (branching = accumulated-state model)
- **Single linear *playable* path** (preserves the seamless-journey + solvability discipline). Branching lives in **narration + the ending**, not in divergent level geometry.
- **The ending is determined ENTIRELY by mid-journey play** — there is **no separate finale decision**. A small **`consequence` state** records: how much **light** each half kept (cruel shortcuts dim a core, §2 #19) and whether spending was **even or lopsided**.
- **Branch drivers:** **2–3 deliberate choice points** (a *cruel shortcut* that dims the light vs. the harder, whole-hearted solution). **Incidental deaths do NOT feed the branch** — trial-and-error must never silently doom your ending.
- **Adaptive narration:** beat lines shift with `consequence` state along the way.
- **~4 endings, read purely from accumulated state** — *"only the one who refuses to spend a single thread of light is whole enough to truly become one":*

| Ending | Trigger (mid-journey state) | Tone |
|---|---|---|
| **One Sky** | Light kept (almost) **full** — the whole-hearted path throughout → whole enough to truly merge → sun stands still forever, the world stops turning | Transcendent, bitter (hardest-earned) |
| **The Vow** | A few shortcuts, light **partial** → not whole enough to merge without loss → they touch, then part; the world turns on; they vow next solstice | Bittersweet (most common) |
| **The Afterglow** | Spending **lopsided** — one half's core nearly out → only one truly arrives; reunion with the other's afterglow | Tragic (uneven) |
| **The Long Dark** | Light **spent to nothing** — the cruelest paths throughout → both too dim; neither crosses; the worlds stay severed | Bleak (squandered) |

- **Mid-run avatars are never removed** — sacrifice registers as a dimming of the glowing core, not loss of a body; the journey stays a synced pair throughout. The finale simply expresses the accumulated cost as the ending. This keeps the dual-sync core intact for the whole journey (no "solo back-half" content to author).

---

## 4. Puzzle Element Library

Each element is a **dual (resource above / threat-or-inverse below)** pair, driven by `s`.

### MVP elements
1. **Ice ⇄ Water**
   - Top: high `s` melts ice → gap (or removes a blocking wall); low `s` → ice is a solid platform.
   - Bottom (inverted): low `s` (cold/dark) freezes water → ice **bridge** (platform); high `s` melts it → fall.
   - *Tuning note:* watch the valence asymmetry (top loses a platform, bottom gains one); balance with neutral/window elements so the top world doesn't read as "always harder."
2. **Vine ⇄ Bioluminescent Fungi**
   - Top: high `s` grows a vine → climbable ladder/platform; low `s` → vine retracts.
   - Bottom: low `s` (dark) → glowing fungi platforms **appear & solid**; high `s` → they wilt/hide → gap.
3. **Light-door ⇄ Dark-gate**
   - Top: opens only when `s` is **high** enough.
   - Bottom: opens only when `s` is **low** enough.
   - Tension: both can't be open at once → time passage / hold the dial cleverly.
4. **Balance mote (window-value element)**
   - A floating light-mote that is **solid only inside a narrow `s` band** (e.g. `s ≈ 0.5`, "dusk/noon") and vanishes outside it — *mirrored in both worlds simultaneously*, so it rewards finding the **shared survivable moment**, not a high/low toggle. Pairs with drift zones (§3.3) for genuine "hold the sun at exactly here" puzzles.

*(Signature verb "hold-the-sun" is **not** a separate element — it lives in the core sun model (§3.3 drift zones) and the finale (§3.4), in the main line.)*

### Stretch elements (post-freeze, priority order)
5. **Shadow-bridge (#1 creative stretch).** Sun *angle* (derived from `s`) sets shadow length; a pillar's shadow in Sol's world **projects across the horizon and becomes a solid platform in Luna's world** (and night-fungi silhouettes cast usable outlines upward). The most "only-this-theme-could-grow-this" mechanic (3 reviewers converged). Out of MVP because it needs real shadow-projection geometry + extra solvability surface; first thing built after freeze. Optional astronomy flavor: draw the sun as an **analemma / gnomon** for the geek-tier easter egg.
6. **Threats (resource's dark side).** Top: near-max `s` → scorch/blind zones. Bottom: raising `s` wakes a **light-sensitive predator** / exposes Luna.

---

## 5. Level Structure & Progression

**Form:** seamless linear journey, ~**10–12 minutes** total. Beats teach → twist → consolidate → combine → master. No level-select; camera flows between bounded segments.

**Beats (MVP = Prologue + 7 beats + Reunion):**
- **Prologue — "The Splitting":** cinematic intro; learn move + mirror jump only (no sun yet). Establish the two halves and the split.
- **Beat 1:** introduce raise/lower sun (holding dial); only top-world ice (gentle).
- **Beat 2:** bottom-world inverted ice bridge → first "aha" (one sun, opposite effects).
- **Interlude (after Beat 2) — echo/consolidation:** *no new element*, not counted as a beat — recombine ice in a fresh configuration to cement the inversion before adding vocabulary. *(Reviewer ds §5.)*
- **Beat 3:** vine ⇄ fungi.
- **Beat 4:** light-door ⇄ dark-gate; timing the dial.
- **Beat 5:** **balance mote** (window-value) — find the shared narrow-`s` moment.
- **Beat 6:** **drift zone** — the sun no longer holds itself; learn to *make it stand still* (hold steady) while both traverse. The solstice verb, in the main line.
- **Beat 7:** master combination — ice + vine + door + a window-value beat under mild drift.
- **Reunion — the meridian (mechanical fusion finale, §3.4/§3.5):** sun drifts → both reach their solstice marks → sun stands still → horizon dissolves → blended gravity. **No last-second choice** — accumulated `consequence` (light preserved + evenness) **selects one of ~4 endings**, and the finale plays it out. Music swell; glow blooms or gutters by ending.

**Choice points (branch drivers, §3.5):** **2–3** segments (target: ~Beat 4 and ~Beat 6) offer a *cruel shortcut* (faster, demands giving something up) vs. the *whole-hearted* harder solution. The choice is tracked as `consequence` state; both options remain solvable. Incidental deaths are never tracked.

**Stretch:** shadow-bridge segments (#1); full Offering verb; convergent branches; threats; extend further; optional non-gating alcoves (a narration line / cosmetic light-shard, ds #D speedrun-vs-explorer flavor); aurora/extra VFX; bespoke per-ending track.

---

## 6. Narrative

**Premise:** Sol and Luna were one. There is no villain — it is simply the law of the world: each solstice the One is cleft in two and cast to opposite poles, one into a day that never ends, one into a night that never breaks. *Their being apart is what turns the world* — day, night, the seasons. They share a single sun, and may reach for each other along the meridian, the line where the longest day and the longest night touch. But to truly become one is to make the sun **stand still** — to stop the turning of the world. And so, year after year, they reach, and let go, and reach again. (The eternal return doubles as a quiet replay reading — each playthrough, another solstice.)

**The cost (light):** every cruel shortcut spends a thread of their light — a glowing core dims and does not rekindle within a run. How much light each half carries to the meridian, and how evenly, is what the ending reads (§3.5).

**Characters:** *Sol* (warm-cored silhouette, top) and *Luna* (cool-cored silhouette, bottom). No faces, no dialogue — silhouettes and light carry it.

**Narration:** sparse, poetic, English; a few lines between beats (players skim — quality over quantity). **Voice = mythic omniscient** (folkloric, timeless — "Once, the sun and the moon…"), fitting the eternal-return frame; it **turns to second person ("you") at choice points and endings** to land the cost on the player. **Adaptive:** lines shift with `consequence` state (§3.5). **Draft seed (refine in execution):**
- Open: *"Once, the sun and the moon shared one sky."*
- After the split: *"Then came the longest day — and the longest night. And they were two."*
- Midway: *"What lifts one world drowns the other. Still — they move as one."*
- At a choice point: *"There is a faster way. It costs a piece of the light."*
- Before the meridian: *"All lines meet somewhere. Not all who reach them remain."*
- **Per-ending closers** (one each): *Vow* — *"Until the next longest day."* · *Afterglow* — *"Whole again. One short."* · *Long Dark* — *"The line held. They did not cross."* · *One Sky* — *"Two became one light. And the sky forgot it was ever torn."*

**Failure hints (graduated, not taunting):** e.g. *"The sun need not be held so high."* — backstops a true stuck-point instead of a free skip (§9).

**Subtext (free, do not over-state):** a severed self reaching for wholeness; the cost of crossing. The solstice's turning — brightest, then waning — is the emotional spine.

---

## 7. Art Direction

**Style:** silhouette + glow, **fully procedural** (no hand/AI sprite backbone). Drama from lighting, gradients, glow, particles, dynamic shadows.

- **Top (Day):** warm amber→gold gradient sky; long warm shadows; floating dust motes.
- **Bottom (Night):** deep indigo→near-black; cyan/magenta **bioluminescence**; a thin **aurora** ribbon (stretch).
- **Horizon:** a luminous seam where the two worlds mirror and meet.
- **Avatars:** clean silhouettes with a **glowing core** — Sol warm, Luna cool — instantly distinguishable and on-narrative.
- **Sun dial:** a subtle on-screen indicator (arc/orb) reflecting `s`.
- AI/CC0 assets used only for incidental texture, never as the visual backbone (avoids inconsistency / "AI look").

**Render pipeline:** Canvas 2D — gradient sky, silhouette fills, glow via pre-rendered offscreen glow sprites + additive compositing (avoid per-frame `shadowBlur` hot paths). Particle layers pooled. WebGL/Pixi glow pass added **only if** Canvas 2D misses the 60fps budget.

---

## 8. Audio

- **Music:** user-provided track(s) — one ambient main + one more climactic for the reunion. Repo ships a **CC0 default** so clone-and-play works and is redistributable; user track is local/gitignored/swappable via config.
- **Sun-driven filter:** real-time low-pass + reverb on the music track, mapped to `s` — high sun = open/bright, low sun = muffled/low drone. Works on *any* track; preserves "music breathes with light."
- **SFX:** procedural **Web Audio API** synth (soft tones, chimes, filtered noise) for jump, sun rise/lower hum, ice crack/melt, vine grow, fungi bloom, door, reunion chord. Matches the abstract glow aesthetic; zero asset hunting; fully consistent.
- **Endings:** each of the ~4 endings gets a distinct audio resolution — the climactic track (or procedural swell) blooms for *One Sky*/*Vow*, gutters/thins for *Afterglow*/*Long Dark*. Procedural chord bloom layered over the user's climactic track for the emotional peak.

---

## 9. Controls & Accessibility

**Controls (keyboard only, no mouse):**
- Move: `A`/`D` or `←`/`→`
- Jump: `Space`
- Sun dial (raise/lower, holds value): `↑` / `↓`
- Reset current segment: `R`
- Pause: `Esc`

**Fairness & readability (a hard game, not an unfair one):**
- Death/falls **exist and carry weight**, but respawn is to the **segment start checkpoint** — no grind, no progress loss beyond the current segment.
- Hazards and required actions are **readable/predictable** — difficulty comes from puzzle and consequence, never from unreadable instant-death.
- Generous collision; deliberate (non-twitch) pacing; coyote-time + jump-buffering for feel.
- **No free skip — the ending is earned.** Backstop for a genuine stuck-point is **graduated narration hints** (e.g. *"The sun need not be held so high."*), escalating in helpfulness, *not* a skip button. *(d, weakened: removes the crutch, keeps a humane safety net.)*
- Colorblind-friendly by construction: worlds differ by **position (top/bottom)** and **brightness**, not hue alone.
- *Note:* the earlier "everyone easily reaches the ending" goal is intentionally dropped — there are **no judges** (open-source, not a submission), so a demanding, consequential experience is a deliberate artistic choice.

---

## 10. Technical Architecture

**Stack:** TypeScript, Vanilla Canvas 2D, Vite. No game framework (our dual-world + inverted-gravity + shared-sun model would fight engine physics).

**Proposed file structure:**
```
meridian/
  index.html
  package.json  tsconfig.json  vite.config.ts
  LICENSE          (MIT)
  README.md
  .gitignore       (ignores local user music)
  public/
    music/         (CC0 default track; user track gitignored)
  src/
    main.ts                  bootstrap, canvas, RAF loop
    engine/
      loop.ts                fixed-timestep update + render
      input.ts               keyboard state
      math.ts                vec2, AABB helpers
      physics.ts             AABB platformer integration (per-world gravity sign)
      camera.ts              smooth scroll between segments
    game/
      world.ts               dual-world model, mirror coupling, (finale) gravity blend
      sun.ts                 shared sun value: holding dial + drift zones + window queries
      player.ts              the two linked avatars (Sol & Luna)
      element.ts             base element: subscribe to s -> collision/visual state (supports window bands)
      elements/ice.ts vine.ts door.ts mote.ts   (stretch: shadow.ts hazard.ts predator.ts)
      segment.ts             runtime: load data, check win, reset; stores a known-solution input path
      narration.ts           beat lines (adaptive to consequence) + graduated failure hints
      consequence.ts         tracked branch state (light spent at choice points only; never incidental death)
      ending.ts              selects 1 of ~4 endings purely from accumulated consequence (no finale input)
      offering.ts            (stretch) deliberate permanent sacrifice-to-platform verb
    render/
      renderer.ts            silhouette + glow pipeline
      palette.ts             warm/cool palettes, sun-driven sky gradient
      particles.ts           dust motes, spores, cross-horizon mote, aurora (stretch)
    audio/
      audio.ts               music load, sun-driven filter, procedural SFX
    data/
      segments/              segment definitions (TS/JSON): terrain, elements, exits, solutionPath
      story.ts               narration text (English)
    ui/
      hud.ts overlay.ts      pause, reset hint, graduated-hint backstop, title, endings (×4)
    dev/
      replay.ts              auto-play each segment's solutionPath; assert solvable (CI/regression)
      debugOverlay.ts        s value, collision boxes, world bounds, drift state (toggle key)
```

**Key systems:**
- **Fixed-timestep loop** (deterministic physics; decoupled render). Determinism is what makes the replay-solvability harness reliable.
- **Data-driven segments**: each segment = terrain (top+bottom) + element placements + exits **+ `solutionPath`** (a recorded designer input sequence).
- **Element system**: elements subscribe to `s` and expose `solidAt(s)` / visual state, including **window bands** (`solid only when sMin ≤ s ≤ sMax`); physics queries current solidity. This is what makes "one sun, opposite effects" data-clean.
- **Sun system**: holding dial by default; per-segment **drift** profile (rate + pole); window/solstice-mark queries for finale.
- **Solvability harness (`dev/replay.ts`)**: replays every segment's `solutionPath` on the deterministic loop and asserts both avatars reach their exits with **no softlock** — run on every change. Must cover **both branches** of each choice point. *(Reviewer gpt P2: don't rely on verbal playtest alone.)*
- **Consequence/ending system**: a tiny serializable `consequence` state (per-half light + evenness), written **only by the choice points**; `ending.ts` maps the accumulated state → one of ~4 endings (no finale input). Single linear playable path → no combinatorial content blow-up.
- **Camera**: seamless scroll/transition; no hard "level complete" UI.

---

## 11. Build Order / Milestones

**De-risk early: deploy and vertical-slice before content.**

- **M0 — Setup:** repo scaffold (Vite+TS), canvas + fixed-timestep loop, `git init`, GitHub repo. **Done = code pushed to `main` AND a reachable GitHub Pages placeholder URL is live** (deploy path proven before any gameplay). *(Reviewer ds §11.)*
- **M1 — Vertical slice (the proof):** ONE segment end-to-end — dual-world render with horizon, both avatars with mirror-sync + inverted gravity, sun dial, **one element (ice⇄water)**, win→advance, basic glow look, placeholder/CC0 music + sun-driven filter. **Deployable & playable.** This validates the entire concept.
- **M2 — Core hardening:** physics edge cases, seamless camera scroll, segment loader + data format **incl. `solutionPath`**, **solvability replay harness + debug overlay** (`dev/`), reset/checkpoint, coyote-time/jump-buffer feel.
- **M3 — Elements & sun model:** vine⇄fungi, door⇄gate, **balance mote (window-value)**, **sun drift zones + hold-steady** verb.
- **M4 — Content (MVP):** author Prologue + 7 beats (teach→consolidate→combine→drift) + **2–3 choice points (light-cost)** + **consequence/ending system** + **mechanical-fusion reunion finale that resolves into 1 of ~4 endings (no last-second choice)** + adaptive narration & graduated hints.
- **M5 — A/V polish:** procedural SFX set, sun-filter tuning, particles (incl. cross-horizon mote), palette/glow polish (incl. ending-dependent glow), title + ending screens (×4).
- **M6 — Tuning & QA:** difficulty/consequence balance (fair, readable, no grind); graduated-hint backstop (no free skip); **replay harness green on every segment incl. both branches of each choice point + manual softlock pass**; verify all **~4 endings reachable**; 60fps perf pass; cross-browser (Chrome/Firefox/Safari).
- **M7 — Open-source polish:** README, LICENSE, CC0 default music, screenshots/GIF, GitHub Pages live demo, repo hygiene. → **MVP DONE / FREEZE.**

**Stretch (only after M7 freeze, priority order):** ① **shadow-bridge** (+ analemma/gnomon flavor); ② **Offering** — a full deliberate *sacrifice-to-platform* puzzle verb (a half briefly becomes a platform for the other), richer than MVP's abstract light-dimming choice points; pairs with threats; ③ **convergent playable branches** (a node that diverges 1–2 segments then re-merges — branch model 2); ④ threats (scorch/predator); ⑤ more beats / non-gating alcoves (explorer-vs-speedrunner); ⑥ aurora & extra VFX; ⑦ bespoke per-ending track; ⑧ soundscape-gate (needs visual fallback); ⑨ localStorage progress / ending gallery / "reached the meridian in X resets"; ⑩ experimental: dynamic-meridian, eclipse-alignment, hard-mode asymmetric-visibility (see §18).

---

## 12. MVP Freeze Line

**Status:** MVP frozen after M7 open-source polish on 2026-06-27; stretch work
must start only from new post-freeze tasks.

**MVP (must ship — a complete, theme-strong, emotionally landed game):**
- Engine: mirror-sync movement + sun dial (holding) **+ drift zones / hold-steady**.
- Elements 1–4 (ice, vine/fungi, door/gate, **balance mote / window-value**).
- Prologue + 7 beats + **2–3 choice points** + **mechanical-fusion finale that resolves into the earned ending (no last-second choice)**, all solvable (both branches), no softlocks.
- **Consequence state → ~4 distinct endings**; adaptive narration.
- Fair/readable death + checkpoints; **no free skip** (graduated hints backstop).
- Silhouette + glow renderer; warm/cool worlds; luminous horizon; ×4 ending screens.
- Default CC0 music + sun-driven filter + procedural SFX.
- Reset, pause, narration.
- **Solvability replay harness** green on every segment incl. both choice-point branches; all 4 endings verified reachable.
- MIT LICENSE, README, GitHub Pages live demo, public repo.

**Discipline:** with no external deadline, the freeze is self-imposed. **No stretch work begins until MVP is frozen and polished.** Extra time → polish first, then stretch in priority order (**shadow-bridge first**). The signature solstice verb (hold-the-sun), the cost-of-light consequence → multi-ending arc, and the mechanical-fusion finale are all **in the MVP**, so the freeze ships a fully theme-true, emotionally complete game.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Mirror-sync **solvability / softlock** | Bounded segments; **automated `solutionPath` replay harness** asserts each segment is beatable with no softlock on every change (both choice-point branches); plus manual pass; instant reset; graduated hints; keep segments small |
| **Glow performance** (Canvas2D `shadowBlur` is slow) | Pre-render glow to offscreen sprites + additive compositing; pool/cap particles; WebGL/Pixi glow pass only if 60fps missed |
| **Scope creep** (no deadline) | Hard MVP freeze (§12); vertical-slice-first; stretch strictly post-freeze; bold reviewer ideas explicitly deferred (§18) |
| **Drift zones too hard / fiddly** (new) | Drift only in back third; gentle drift rate; window bands generous; hold-steady is forgiving; graduated hints backstop; tune in M6 |
| **Branch/ending scope blow-up** (new) | Accumulated-state model only: **single linear playable path**; branching = narration + ending. Choice points capped at 2–3; both branches in the replay harness; real divergent segments are stretch |
| **Consequence feels unfair / "I died → bad ending"** (new) | Branch fed **only** by deliberate choices + finale, **never** incidental death; choices are legible and pre-signposted; bad outcomes read as authored, not accidental |
| **Music licensing** for OSS | Ship CC0 default in-repo; user's track local/gitignored/swappable |
| **Feel** of dual control | Coyote-time, jump-buffering, generous collision, deliberate puzzle pacing |
| **Save/progress** | MVP is ~10–12 min → session checkpoints suffice; localStorage "continue" is stretch |

---

## 14. Definition of Done — MVP Acceptance Criteria

- [ ] Runs in-browser on Chrome, Firefox, Safari at ~60fps on mid hardware.
- [ ] Prologue + 7 beats + **2–3 choice points** + **mechanical-fusion finale resolving into the earned ending (no last-second choice)**; every segment solvable (both branches); **no softlocks**.
- [ ] **Light-cost consequence (dimming cores) drives ~4 distinct, reachable endings** purely from mid-journey play; narration adapts to state.
- [ ] Mirror-sync dual movement + sun dial **+ drift/hold-steady** + 4 elements (incl. window-value mote) all functional.
- [ ] Fair/readable death + segment checkpoints; **no free skip**; graduated hints work.
- [ ] **`solutionPath` replay harness passes for every segment incl. both choice-point branches; all 4 endings verified reachable.**
- [ ] Silhouette+glow aesthetic with warm top / cool bottom / luminous horizon; 4 ending screens.
- [ ] CC0 default music plays, sun-driven filter audibly responds to `s`, procedural SFX present.
- [ ] Reset (`R`), pause (`Esc`), and adaptive narration all work.
- [ ] `MIT LICENSE`, `README.md` (concept / how to play / how to run & build / credits), public GitHub repo, working **GitHub Pages live demo** link.

---

## 15. Open-Source Delivery

- **License:** MIT (code). Asset licenses noted in README/NOTICE; default music CC0.
- **README (English):** hook + one-liner; concept & theme tie (solstice = meridian / one sun, two poles / two halves reunite); GIF + screenshots; **how to play** (controls); **how to run & build** (`npm i`, `npm run dev`, `npm run build`); how to swap your own music; credits & licenses.
- **Live demo:** GitHub Pages (auto-deploy from `main` or a `gh-pages` build). De-risk in M0.
- **Repo hygiene:** clear structure (§10), `.gitignore` for local music, conventional commits, a short CONTRIBUTING note (optional).

---

## 16. Quality Compass (NOT scoring — design principles)

The jam criteria are retained only as quality guidance:
- **Relevance:** title (*Meridian*), the dual-pole framing, and "make the sun stand still" tie mechanic ⇄ theme tightly.
- **Creativity:** one sun with opposite effects + simultaneous mirror control = a mechanic that *is* the metaphor; the cost-of-light sacrifices and consequence→ending arc make the metaphor *cost* something.
- **Technical execution:** small custom engine, bounded solvable segments, deterministic replay harness, 60fps budget, no softlocks, cross-browser, instant play in browser.
- **Writing:** sparse adaptive poetic narration, ~4 earned/bittersweet endings, and a crisp, evocative README.

---

## 17. Out of Scope / Non-goals

- No jam submission, devlog post, or prize-category work.
- No metroidvania / free-roam / backtracking (seamless **linear** playable path only); **no full branch tree** of divergent levels (branching = accumulated state + endings, §3.5).
- No hand-drawn or AI sprite-art backbone (procedural silhouette+glow only).
- No multiplayer, no accounts, no networking.
- No mobile-first/touch design (desktop keyboard; graceful resize is a nice-to-have, not a goal).
- **In MVP** but worth stating: consequence/multi-ending (cost = light) is MVP; the **full mid-run Offering puzzle verb** and **convergent playable branches** are **stretch**, as are shadow-bridge, threats, alcoves, aurora, per-ending tracks, soundscape-gate, save/continue.
- **Non-goals on "pain":** unfair/unreadable instant-death and grind-on-death are *not* wanted; consequence and difficulty are. *(See §18: full Celeste-like execution difficulty and asymmetric-visibility-as-default remain declined.)*

---

## 18. Reviewer Feedback Disposition

Four external reviews (ds, gemini, glm, gpt) were evaluated. Traceability of every notable point:

**Adopted into MVP (plan changed above):**
- **Hold-the-sun promoted to main line** — solstice = "sun stands still"; was mis-filed as stretch. Now: dial holds in teaching beats, **drifts in the back third** (§3.3, Beat 6, §3.4). *(glm "硬伤", gpt P1, ds Q1.)*
- **Window-value puzzles** — "balance mote", solid only in a narrow `s` band, to stop the dial degenerating into a high/low switch (§3.3, §4 elem 4, Beat 5). *(gpt P2, ds §4.)*
- **Mechanical-fusion reunion finale** — sun stands still at the solstice marks → horizon dissolves → blended gravity → gameplay reunion, not a cutscene (§3.4, Reunion beat). *(glm #2, gpt #1/#4, ds #B "sunset/relinquish control.")*
- **Solvability replay harness + debug overlay** — each segment stores a `solutionPath`, auto-replayed to assert beatable/no-softlock (§10, M2/M6, §13). *(gpt P2.)*
- **Graduated failure hints** — narration softens into escalating hints at a true stuck-point, as the humane backstop *instead of* a skip button (see the `d` bullet below for the final no-skip decision) (§9). *(ds §9/Q2, gpt #6.)*
- **M0 done-criteria hardened** — ends with pushed repo + reachable live URL (§11). *(ds §11.)*
- **Echo/consolidation interlude** (after Beat 2) and **cross-horizon mote** visual (§5, §7/§10 particles). *(ds §5, ds #C.)*
- **Bittersweet/tragic tone + fair-but-consequential death** — the game leans into loss and dread (options a, c). Enabled partly by dropping the jam-submission accessibility imperative. *(user challenge "why can't there be torment"; glm #3 tone, gpt #6.)*
- **Death-as-gift → reframed as "cost = light" (option b), adopted into MVP.** Not an accidental punishment: each cruel **shortcut dims a half's glowing core** (permanent within a run); avatars are never removed mid-journey (state only, protects the dual-sync core). The accumulated dimming is what the ending reads. *(glm #3, reframed; user-confirmed.)*
- **Consequence → multiple endings (branch model 1).** Single linear playable path; the ending is determined **entirely by mid-journey play** (light preserved + evenness across 2–3 choice points) — **no separate finale choice**; the finale plays out the earned one of ~4 bittersweet endings (trigger table §3.5); narration adapts. *(user idea "level outcomes decide story direction", refined by user to "ending follows the journey, not a last-second pick"; disciplined to avoid content blow-up.)*
- **`d` weakened:** removed the free skip-after-fail crutch; the ending is earned, with graduated narration hints as a humane backstop. *(user option d.)*

**Elevated as priority stretch:**
- **Shadow-bridge** (sun-angle shadows become platforms across the horizon) — strongest creative idea (3 reviewers), but needs shadow-projection geometry + extra solvability surface → **#1 post-freeze stretch**, not MVP. Optional **analemma/gnomon** astronomy flavor rides along. *(gemini #2, gpt #2, glm #4.)*
- Soundscape-gate (hearing as puzzle) — constrained by single user track + needs visual fallback → guarded stretch. *(ds #A.)*
- **Full Offering puzzle verb** (a half briefly becomes a literal platform for the other — richer than MVP's abstract light-dimming) → stretch #2; pairs with threats. *(glm #3 reframed.)*
- **Convergent playable branches** (diverge 1–2 segments then re-merge, branch model 2) → stretch #3. *(user branching idea, heavier variant.)*

**Considered and declined (with reason):**
- **Dynamic-meridian** (`s` moves the horizon / world sizes) — beautiful and on-theme, but dynamic per-world playable bounds **multiply** the mirror-sync softlock risk and authoring cost → deferred to "experimental stretch" only. *(gemini #1.)*
- **Mid-air sun-as-weight / asymmetric gravity** — pushes toward Celeste-style twitch timing, against our deliberate low-input-floor puzzle pacing → declined. *(gemini #3.)*
- **Asymmetric visibility as default** (each sees only the other's world) — intriguing cognitive twist but punishing and changes the core feel; declined as default, kept as a possible future hard-mode. *(glm #1.)*
- **Full Celeste-like execution difficulty (option e)** — high-precision twitch challenge declined; our "pain" is consequence/emotion/fair-hard puzzles, not input precision. *(user-confirmed.)*
- **One-input-two-times / delayed echo** (Luna replays Sol's inputs after a 0.5–1s lag) — genuinely novel, but it **contradicts the locked core** (§3.2 gravity-mirror *simultaneous* sync); adopting it would replace, not extend, our coupling model → declined. *(gpt #5.)*
- **Eclipse/syzygy alignment**, **"reached the meridian in X resets" stat**, **one universal/humanist narration line** — harmless minor flavor; logged as optional, not prioritized. *(gemini #4, ds Q3, ds #1.)*
- **gpt P1 "restore submission post if you submit"** — N/A: user confirmed **not a submission**; README already carries the theme explanation.
