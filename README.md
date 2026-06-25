# Meridian

Meridian is an open-source browser dual-pole puzzle-platformer about two mirrored halves sharing one sun at the solstice.

## Live Demo

GitHub Pages: https://aierkuite.github.io/meridian/

## Development

```bash
cd meridian
npm install
npm run dev
```

## Build

```bash
cd meridian
npm run typecheck
npm run check:determinism
npm run check:replay
npm run build
```

## Music & Audio

Meridian's audio is fully procedural and self-contained:

- **Default ambient bed** — generated at runtime in `meridian/src/audio/audio.ts`
  (a layered Web Audio oscillator pad with a slow breathing LFO). It is original
  to this project and redistributable; **no binary music asset is committed**, so
  the repo stays clone-and-play.
- **Sun-driven filter** — the bed (and any local track) routes through a
  sun-tracked low-pass + reverb: low sun is muffled/dark, high sun is open/bright.
- **Procedural SFX** — jump, sun motion, ice/vine/fungi/door/mote state changes,
  light-cost choices, finale fusion, and per-ending resolutions are all
  synthesized (no SFX files).
- **Optional local track** — drop a file at `meridian/public/music/local.mp3`
  (also `.ogg`, `.m4a`, or `.wav`). It is git-ignored, private, and hot-swappable;
  when present it loops through the same sun filter and the default bed fades out.
  If it is missing or fails to load, the procedural bed plays — there is never an
  autoplay error.
- Audio unlocks on the first key press (browsers block audio until a user
  gesture).

Local user music is never committed: `.gitignore` ignores everything in
`meridian/public/music/` except `.gitkeep`.

## License

Code is released under the MIT License. The default ambient bed and all SFX are
procedurally generated and original to this project (redistributable).
