# Audio Guidelines

> `src/audio/audio.ts`.

> **Status: Implemented (M5, 2026-06-25).** Source: `plan.md` §8, §2 #11,
> #16, §15. As-built contract below is authoritative; shapes are real.

---

## As-built audio frame contract (M5)

### 1. Scope / Trigger

Any change to how the app feeds audio, or to SFX/ending cues, must go through the
presentation **audio frame** — audio never reads the sim directly per-event.

### 2. Signatures (`src/audio/audio.ts`, `src/audio/cues.ts`)

```ts
interface AudioEngine {
  unlock(): void;                  // create/resume AudioContext after a user gesture
  update(frame: AudioFrame): void; // no-op until unlocked
  dispose?(): void;                // close context + null refs (HMR cleanup)
}

type AudioCue =
  | { readonly kind: "jump" }
  | { readonly kind: "sun"; readonly direction: -1 | 1; readonly pressure: number }
  | { readonly kind: "element"; readonly elementKind: ElementKind; readonly world: ElementWorld; readonly active: boolean }
  | { readonly kind: "choice-cost" }
  | { readonly kind: "fusion"; readonly phase: "hold" | "dissolve" | "complete" }
  | { readonly kind: "ending"; readonly ending: EndingId };

interface AudioFrame {
  readonly sun: Sun01;
  readonly status: JourneyStatus;
  readonly ending: EndingId | undefined;
  readonly cues: readonly AudioCue[];
}

interface CueAdapter { derive(journey: JourneyState, input: InputSnapshot): AudioFrame; }
function createCueAdapter(): CueAdapter;
```

### 3. Contracts

- The cue adapter lives in `src/audio/cues.ts`, uses **`import type` only** for
  sim types, and holds previous-frame snapshots for edge detection. It is imported
  **only** by `main.ts`; `engine/`, `game/`, `dev/` never import `audio/`.
- `main.ts` derives the frame once per render: during `appPhase === "title"` or
  `paused` it sends a **neutral zero-cue frame** (`{ sun, status, ending, cues: [] }`);
  otherwise `cueAdapter.derive(journey, latestAudioSnapshot)`.
- Cue rate-limiting: element cues fire only on `solidAt(s)` crossings; sun is a
  continuous gain-controlled hum (not per-frame retrigger); fusion fires once per
  phase; **ending fires exactly once per terminal entry** from `frame.ending`.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|-----------|-------------------|
| `update` called before `unlock` | no-op, no autoplay error |
| `appPhase === "title"` / paused | neutral zero-cue frame; no SFX |
| terminal entry (`status==="ending"`) | one ending resolution from `frame.ending` |
| local track missing/decode-fail | silent fallback to procedural bed |

### 5. Good/Base/Bad Cases

- Good: `audio.update(cueAdapter.derive(journey, latestAudioSnapshot))` while playing.
- Base: before unlock, `update` is a no-op; first key gesture unlocks.
- Bad: importing `audio/cues` from `game/` or recomputing `resolveEnding` in audio.

### 6. Tests Required

- `npm run check:determinism` + `npm run check:replay` stay green (audio is not
  imported by sim/replay).
- Manual: first-gesture unlock is audible; sun filter sweeps; ending bloom vs gutter.

### 7. Wrong vs Correct

#### Wrong

```ts
audio.update(journey.active.sun.value);  // raw scalar; no cues, no ending
```

#### Correct

```ts
audio.update(cueAdapter.derive(journey, latestAudioSnapshot));
```

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

## Music assets & licensing (plan §2 #16, §15) — M5 decision

- **Default bed is procedural, not a committed file.** M5 generates the default
  ambient bed at runtime in `audio.ts` (layered oscillator pad). It is original to
  this project and redistributable, so the repo stays clone-and-play with **no
  binary audio asset committed**. (The plan allowed a CC0 file; the generated bed
  satisfies the same redistributability goal without asset hunting.)
- The user's preferred track is **local, gitignored, swappable**: drop
  `public/music/local.{mp3,ogg,m4a,wav}`. When present it loops through the same
  sun filter and the procedural bed fades out; when absent/failing it silently
  falls back. Never commit a user track.
- `.gitignore` keeps `public/music/*` ignored except `.gitkeep`; README documents
  the default + local-track handling and the MIT/redistributable note.

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
