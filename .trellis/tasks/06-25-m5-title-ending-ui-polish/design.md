# M5 Title and Ending UI Polish — Technical Design

## 1. Boundary

UI remains presentation/app-shell code. It may hold local presentation state such
as `"title"` vs `"journey"`, and it may route player intent to existing journey
functions through `main.ts`. It must not own gameplay rules or ending decisions.

## 2. App Presentation State

Add a small state in `main.ts`, for example:

```ts
type AppPhase = "title" | "playing";
```

During `"title"`:

- sample input for start/pause-safe keys
- do not call `updateJourney`
- render a title screen
- unlock audio on the explicit start gesture

During `"playing"`:

- existing fixed-loop update/render behavior applies
- pause and reset semantics remain unchanged

The title state should live outside `game/journey.ts` so replay and deterministic
simulation stay unchanged.

## 3. Title Screen

Add UI drawing helper in `src/ui/hud.ts` or a new `src/ui/title.ts`.

Text direction:

- title: `Meridian`
- controls: compact English controls line
- prompt: `Press Space to begin` or similar

Keep typography readable at desktop and smaller browser sizes. Do not add a
landing page or explanatory marketing copy.

## 4. Ending Screens

Current `drawEndingScreen(ctx, width, height, ending)` already reads
`endingTextFor(ending)`. M5 can extend it with:

- per-ending color/brightness atmosphere
- title/closer spacing improvements
- subtle visual state names or restart prompt refinement
- optional render mood coordination from render child

It must not call `resolveEnding`; it receives the resolved id from `main.ts`.

## 5. Audio Integration

After the audio child, the start gesture should call `audio.unlock()` and then
switch to playing. If audio exposes an `AudioFrame` update, title phase can pass
a minimal frame or skip update until playing, depending on the audio child's
contract.

Do not add duplicate audio unlock listeners if the audio child already owns one;
prefer a single explicit path in `main.ts`.

## 6. Validation

Automated:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

Manual:

- initial title visible
- start begins gameplay and audio
- pause/reset still work
- all four endings display matched text and distinct visual treatment
- no skip, level-select, or ending-choice UI appears
