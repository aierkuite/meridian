# Audio Layer — Web Audio

> `src/audio/audio.ts`. **Presentation:** music playback, the sun-driven filter,
> and procedural SFX. Reads simulation state (`s`, events); never mutates it.

> **Status: Plan-derived (pre-implementation).** Source: `plan.md` §8, §2 #11,
> #16. Reconcile after M1/M5.

---

## What lives here

| Guide | What it covers |
|-------|----------------|
| [Audio Guidelines](./audio-guidelines.md) | AudioContext lifecycle + unlock, sun-driven low-pass/reverb, procedural SFX, CC0 default + swappable track |

---

## Pre-Development Checklist

- [ ] Is the AudioContext created/resumed **after a user gesture** (browser autoplay policy)?
- [ ] Does the sun filter read `s` from the sim **read-only**?
- [ ] Are SFX **procedural** (Web Audio synth), not asset files (plan §8)?
- [ ] Does it still work with the **CC0 default track** (no user track present)?

## Quality Check

- [ ] Music plays after first input; no autoplay-blocked silence.
- [ ] Sun-driven low-pass/reverb audibly responds to `s`.
- [ ] Procedural SFX present for jump, sun hum, ice, vine, fungi, door, reunion.
- [ ] Clone-and-play works with only the bundled CC0 track.

---

## The model (plan §8, §2 #11/#16)

- **Music:** user-provided track(s) — one ambient main, one climactic for the
  reunion. The repo ships a **CC0 default** so clone-and-play works and is
  redistributable; the user's track is **local / gitignored / swappable** via
  config.
- **Sun-driven filter:** real-time low-pass + reverb mapped to `s` — high sun =
  open/bright, low sun = muffled/low drone. Works on *any* track ("music breathes
  with light").
- **SFX:** procedural Web Audio synth (soft tones, chimes, filtered noise). Zero
  asset hunting; consistent with the abstract glow aesthetic.
- **Endings:** each of the ~4 endings gets a distinct audio resolution — blooms
  for *One Sky*/*Vow*, gutters/thins for *Afterglow*/*Long Dark*.
