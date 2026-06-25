# M5 Audio and Music Polish — Technical Design

## 1. Boundary

Audio is presentation code. It reads the latest input/journey state through a
presentation frame and never writes gameplay state. Replay tooling must remain
able to run without loading audio modules.

## 2. Audio Frame and Cues

Add a small contract under `src/audio/`, for example `cues.ts`:

```ts
export type AudioCue =
  | { readonly kind: "jump" }
  | { readonly kind: "sun"; readonly direction: -1 | 1; readonly pressure: number }
  | { readonly kind: "element"; readonly elementKind: ElementKind; readonly world: ElementWorld; readonly active: boolean }
  | { readonly kind: "choice-cost" }
  | { readonly kind: "fusion"; readonly phase: "hold" | "dissolve" | "complete" }
  | { readonly kind: "ending"; readonly ending: EndingId };

export interface AudioFrame {
  readonly sun: Sun01;
  readonly status: JourneyStatus;
  readonly ending: EndingId | undefined;
  readonly cues: readonly AudioCue[];
}
```

The adapter stores previous presentation snapshots:

- previous input jump/sunDelta
- previous segment id
- previous element active/alpha signatures by element index
- previous consequence shortcut/light totals
- previous finale progress band
- previous journey status / resolved ending

It returns cues for the current frame. The state is local to presentation and
resets when the journey restarts or segment id changes.

## 3. Audio Engine

Update the interface:

```ts
export interface AudioEngine {
  unlock(): void;
  update(frame: AudioFrame): void;
  dispose?(): void;
}
```

Node graph:

- `music/default source -> lowpass -> master`
- `lowpass -> convolver/reverb send -> wet gain -> master`
- SFX helpers connect to `master` or short local filters
- master gain stays conservative to avoid clipping with layered SFX

Keep `AudioContext` construction/resume behind `unlock()`. `update()` should be
a no-op until the context exists.

## 4. Default Audio Asset Strategy

Preferred implementation: generate a short original ambient loop and commit it
under `meridian/public/music/default-ambient.*`, then document it as a project
redistributable/CC0-style default asset.

If an external asset is used instead, record source URL, author, and license in
README/NOTICE. Do not commit any user-provided local track.

Update `.gitignore` to whitelist the default asset and ignore local overrides.

## 5. SFX Helpers

Use small procedural helpers:

- `playTone(startHz, endHz, duration, gain, wave)`
- `playNoiseBurst(duration, filterHz, gain)`
- `playChord(frequencies, duration, gain, envelope)`
- `rampGain(node, now, attack, release)`

Cue mapping:

- Jump: short upward sine/triangle.
- Sun: continuous hum or rate-limited pulse, direction-sensitive.
- Element: ice crack/melt noise, vine sweep, fungi chime, door pulse.
- Choice cost: muted thud plus fading high sparkle.
- Fusion: layered swell keyed to hold/dissolve/complete.
- Ending: bloom chord for `one-sky`/`vow`, sparse low chord for
  `afterglow`/`long-dark`.

## 6. Rate Limiting

Avoid repetitive SFX:

- Element cues only fire on active-state crossings.
- Sun cues should be continuous via a gain-controlled layer or rate-limited to a
  small interval.
- Ending cue fires once per terminal entry.
- Fusion phase cues fire once per phase transition.

## 7. Validation

Run:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

Manual:

- first key unlocks audio
- default audio plays without local track
- filter responds to sun
- representative cues trigger
- ending entry triggers one resolution sound
