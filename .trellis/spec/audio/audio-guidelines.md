# Audio Guidelines

> `src/audio/audio.ts`.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §8, §2 #11,
> #16, §15. Shapes are illustrative. Reconcile after M1/M5.

---

## AudioContext lifecycle & unlock

Browsers block audio until a user gesture. Create or `resume()` the
`AudioContext` on the **first input** (a keypress — the game is keyboard-only),
then start music. Never assume audio can play on load.

```ts
// shape only
let ctx: AudioContext | null = null;
function unlockOnFirstInput() { ctx ??= new AudioContext(); void ctx.resume(); }
```

## Sun-driven filter (the signature audio idea)

Route the music through a **low-pass + reverb** whose parameters track `s`
(read-only from the sim):

```ts
// shape only
const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
// each frame (or on change): map s -> cutoff / wet
lp.frequency.value = lerp(MUTED_HZ, OPEN_HZ, sun.value);   // high s = open/bright
```

- High `s` → open/bright; low `s` → muffled/low drone.
- Works on **any** track, so it applies equally to the CC0 default and a user
  track.

## Procedural SFX (`Web Audio` synth)

All SFX are **synthesized**, not loaded files (plan §8): jump, sun rise/lower
hum, ice crack/melt, vine grow, fungi bloom, door, reunion chord. Use oscillators
+ envelopes + filtered noise. Keep a small library of synth helpers; trigger them
from simulation **events** (the audio layer subscribes; it never drives gameplay).

## Music assets & licensing (plan §2 #16, §15)

- Ship a **license-clean CC0 default track** in `public/music/` so the repo is
  clone-and-play and fully redistributable.
- The user's preferred track is **local, gitignored, swappable** via config —
  never committed.
- Note asset licenses in README/NOTICE.

## Endings (plan §8)

Layer a procedural chord bloom over the climactic track for the peak; bloom for
*One Sky*/*Vow*, gutter/thin for *Afterglow*/*Long Dark*. Selected by the same
`ending.id` the sim resolved.

---

## Forbidden

- ❌ Autoplaying before a user gesture (it will be blocked → silence).
- ❌ Shipping non-CC0 audio in the repo, or committing the user's local track.
- ❌ Loading SFX as audio files instead of synthesizing them.
- ❌ Letting the audio layer write simulation state.
