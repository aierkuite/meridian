# M7 Open Source Polish

## Goal

Complete the `plan.md` M7 milestone: make Meridian ready to present as an
open-source MVP with strong public-facing documentation, license/asset hygiene,
real gameplay media, final GitHub Pages readiness, and release-quality repository
cleanup.

This task is the MVP freeze gate. It should not add stretch mechanics or reshape
gameplay; it packages and verifies the game that M0-M6 produced.

## Confirmed Facts

- Source milestone: `plan.md` §11 M7, §12 MVP freeze line, §14 definition of
  done, and §15 open-source delivery.
- App root: `meridian/`.
- Root `README.md` exists and currently covers the live demo URL, development
  commands, build commands, procedural audio/default bed behavior, local music
  swapping, and MIT license summary. It is still too thin for M7: it lacks a
  strong public hook, how-to-play section, screenshots/GIF, fuller credits, and
  a release-oriented project overview.
- Root `LICENSE` exists and is MIT.
- `.github/workflows/deploy.yml` exists and builds from `meridian/`, then
  deploys `meridian/dist` to GitHub Pages.
- `meridian/vite.config.ts` sets `base: "/meridian/"`, matching the documented
  GitHub Pages URL `https://aierkuite.github.io/meridian/`.
- `meridian/package.json` exposes `typecheck`, `check:determinism`,
  `check:replay`, and `build`.
- `meridian/public/music/` contains only `.gitkeep`. M5 made the default music
  path procedural: an original redistributable ambient bed generated at runtime,
  with optional local user tracks ignored under `public/music/local.*`.
- No committed screenshot, GIF, WebP, or video release media is currently present
  outside ignored build/dependency folders.
- M6 is archived. Its PRD states the automated gates passed at baseline and that
  M7 owns README overhaul, screenshots/GIF, GitHub Pages final demo, and license
  packaging beyond QA notes.
- Current git status before this task showed an unrelated uncommitted
  `.trellis/config.yaml` change. M7 implementation must preserve unrelated user
  changes.

## Requirements

- **R1. Strong public README.** Rewrite/expand the root `README.md` in English
  with the hook, concept, theme tie, controls, how to play, how to run/build,
  live demo link, screenshots/GIF, local music instructions, credits, and
  license notes.
- **R2. Accurate audio/license story.** Resolve the plan's "CC0 default music"
  requirement against the M5 as-built decision: the default audible bed is
  procedural and redistributable with no binary asset. If no external CC0 track
  is introduced, README/NOTICE language must clearly state that clone-and-play
  audio is generated at runtime and that local user tracks are private and
  ignored. If a binary default track is added, it must be license-clean CC0 with
  source/proof recorded.
- **R3. Real gameplay media.** Add actual-game screenshot and animated media
  suitable for the README. Media must be captured from the running game or built
  app, not stock art or decorative mockups, and should show the dual worlds,
  horizon, avatars, sun/HUD, and at least one puzzle/finale beat.
- **R4. GitHub Pages readiness.** Keep the Vite base, Pages workflow, and README
  live URL aligned. Verify a production build locally, and verify the live Pages
  URL when network/GitHub access is available; otherwise record the exact
  external verification limitation for the final closeout.
- **R5. Repo hygiene.** Ensure ignored/generated/private files are not staged:
  `node_modules`, `dist`, logs, local music, secrets, and tool-local files stay
  out of the release commit. Keep `.gitignore` behavior consistent with the
  documented local music story.
- **R6. Release validation.** From `meridian/`, the implementation must preserve
  `npm.cmd run typecheck`, `npm.cmd run check:determinism`,
  `npm.cmd run check:replay`, and `npm.cmd run build`.
- **R7. Public clarity without spoilers overload.** The README can explain the
  earned-ending/consequence premise, but should keep detailed ending triggers and
  internal implementation notes out of the first-read player experience.
- **R8. Scope discipline.** Do not add stretch mechanics, level select, free
  skip, save/progress, mobile controls, new content beats, or broad engine
  refactors. Code changes are allowed only when needed for release packaging,
  media capture support, docs accuracy, or broken validation gates.

## Acceptance Criteria

- [ ] AC1. Root `README.md` is a polished English open-source README with:
      project hook, live demo link, gameplay concept, controls/how-to-play,
      run/build commands, media, music swapping, credits, and license notes.
- [ ] AC2. README media includes at least one actual-game screenshot and one
      short animated GIF/WebP/video or an equivalent committed animated preview
      referenced from the README.
- [ ] AC3. License/asset notes are accurate: MIT code license is present; no
      non-CC0 or user-provided audio/image asset is committed; procedural
      default audio is described consistently with M5; any external asset has
      source and license proof recorded.
- [ ] AC4. `.gitignore` still protects `meridian/public/music/local.*` and
      generated/private folders while allowing only intentional release assets.
- [ ] AC5. GitHub Pages configuration remains coherent:
      `meridian/vite.config.ts` base matches the README URL, the Actions
      workflow builds `meridian/`, and the README points to the correct live
      demo.
- [ ] AC6. Local release gate passes from `meridian/`:
      `npm.cmd run typecheck`, `npm.cmd run check:determinism`,
      `npm.cmd run check:replay`, and `npm.cmd run build`.
- [ ] AC7. A manual smoke pass covers title/start, controls, sun adjustment,
      one representative puzzle, pause/reset, and one ending or finale path in
      the build or dev server used for media capture.
- [ ] AC8. Repo hygiene is checked with `git status --short`; no ignored build
      outputs, dependencies, private tracks, secrets, or unrelated user changes
      are staged as part of M7.
- [ ] AC9. Live GitHub Pages URL is verified after deployment when possible. If
      network credentials or deployment timing block verification, the final
      closeout records that limitation with the local build/workflow evidence.
- [ ] AC10. No stretch scope or gameplay contract change is introduced while
      completing M7.

## Out of Scope

- New gameplay mechanics, levels, endings, save/progress, ending gallery, mobile
  controls, or stretch features from `plan.md` §11.
- Broad architecture refactors unrelated to release packaging.
- Replacing the procedural audio bed with an external track unless a clear CC0
  asset and proof are already available.
- Jam submission materials, scoring/category text, or prize positioning.

## Open Questions

None blocking. The only conditional item is external live-demo verification:
perform it if network/GitHub access is available during implementation;
otherwise document the limitation and keep all local Pages evidence green.
