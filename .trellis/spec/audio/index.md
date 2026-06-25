# Audio Layer — Web Audio

> `src/audio/audio.ts`. **Presentation:** music playback, the sun-driven filter,
> and procedural SFX. Reads simulation state (`s`, events); never mutates it.

> **Status: Implemented (M5, 2026-06-25).** Source: `plan.md` §8, §2 #11,
> #16. Audio frame + cue contract, procedural bed, sun filter, procedural SFX,
> and per-ending resolutions are live (see audio-guidelines as-built contract).

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
- [ ] Does it still work with the **procedural default bed** (no user track present)?

## Quality Check

- [ ] Music plays after first input; no autoplay-blocked silence.
- [ ] Sun-driven low-pass/reverb audibly responds to `s`.
- [ ] Procedural SFX present for jump, sun hum, ice, vine, fungi, door, reunion.
- [ ] Clone-and-play works with only the procedural default bed (no committed asset).

---

## The model (plan §8, §2 #11/#16)

- **Music:** a **procedurally generated default ambient bed** (original,
  redistributable, no committed binary) so clone-and-play works; the user's
  track is **local / gitignored / swappable** (`public/music/local.{mp3,ogg,m4a,wav}`),
  routed through the same sun filter when present.
- **Sun-driven filter:** real-time low-pass + reverb mapped to `s` — high sun =
  open/bright, low sun = muffled/low drone. Works on *any* track ("music breathes
  with light").
- **SFX:** procedural Web Audio synth (soft tones, chimes, filtered noise). Zero
  asset hunting; consistent with the abstract glow aesthetic.
- **Endings:** each of the ~4 endings gets a distinct audio resolution — blooms
  for *One Sky*/*Vow*, gutters/thins for *Afterglow*/*Long Dark*.
