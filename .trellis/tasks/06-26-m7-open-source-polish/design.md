# M7 Open Source Polish — Design

## Scope Shape

M7 is a release-packaging task. It should make the existing MVP understandable,
verifiable, and safe to publish without changing the game design. The main
outputs are documentation, release media, license/asset notes, deployment
verification, and repository hygiene.

## Boundaries

- **Root README is the public entry point.** Keep the release README at
  `README.md` in the repository root because the game app lives in `meridian/`
  but the GitHub project page opens at the root.
- **The app stays under `meridian/`.** Do not move source files or create a
  second app-level README unless a short app-specific note becomes necessary.
- **Media is release documentation, not runtime content.** Store README media in
  a repo documentation path such as `docs/media/` so screenshots/GIFs are easy to
  reference without changing the shipped app bundle.
- **Audio remains procedural by default.** The as-built M5 contract supersedes
  the early "commit a CC0 binary track" assumption: the clone-and-play default
  sound is generated at runtime. M7 should document this accurately instead of
  adding an asset just to satisfy older wording. If a real CC0 track is added, it
  must include provenance and `.gitignore` must whitelist it intentionally.
- **No gameplay contract changes.** README/media capture can expose existing
  systems, but must not add selectors, cheats, skip buttons, ending pickers, or
  throwaway debug UI to the shipped game.

## README Content Model

The README should be optimized for a public GitHub visitor:

1. Title, one-sentence hook, and live demo link.
2. Screenshot/GIF above the fold.
3. Compact concept section explaining dual worlds, shared sun, mirrored control,
   consequence, and the solstice/meridian theme.
4. Controls/how-to-play section using the actual keyboard controls from the UI
   spec and title screen.
5. Run/build section with Windows-friendly `npm.cmd` note where useful and
   normal `npm` commands for general contributors.
6. Music/local track section reflecting the procedural default bed and ignored
   `public/music/local.{mp3,ogg,m4a,wav}` override.
7. Development/quality section listing the automated gates.
8. Credits/license section covering MIT code and no committed third-party media
   unless M7 adds any.

Avoid copying the whole design document into the README. A reader should be able
to decide whether to play, run, or inspect the project quickly.

## Media Capture Model

- Capture from the running game or production build, preferably after a fresh
  local build or dev-server run.
- Required shots:
  - one still image showing both worlds and the horizon clearly;
  - one short animated preview showing movement/sun interaction or a finale beat.
- Keep file sizes reasonable for GitHub. Prefer optimized GIF/WebP/MP4 if tools
  are available; if only PNG capture is available, implementation should make a
  clear note before accepting a non-animated fallback because `plan.md` asks for
  screenshots/GIF.
- Do not use generated illustrations or stock imagery for the primary README
  media. The project is procedural; the release media should show the real game.

## Deployment Model

Existing deployment pieces:

- `meridian/vite.config.ts` uses `base: "/meridian/"`.
- `.github/workflows/deploy.yml` builds in `meridian/`, runs determinism and
  build checks, uploads `meridian/dist`, and deploys to Pages.
- README already points to `https://aierkuite.github.io/meridian/`.

M7 should keep these aligned, run the local build, and verify the live URL after
push/deploy if credentials and network allow. If live verification is blocked,
the closeout must say so explicitly and include local build/workflow evidence.

## License and Asset Hygiene

- Keep the root MIT `LICENSE`.
- Keep local user tracks ignored under `meridian/public/music/`.
- Do not stage `node_modules/`, `meridian/dist/`, logs, private tracks, secrets,
  or local AI/tooling folders.
- Add `NOTICE.md` only if it materially clarifies asset provenance or an external
  asset is introduced. With the current all-procedural asset model, README
  license notes may be enough.

## Validation Strategy

M7 is mostly docs/media, but it is the freeze gate. The implementation must run:

- `npm.cmd run typecheck`
- `npm.cmd run check:determinism`
- `npm.cmd run check:replay`
- `npm.cmd run build`

Manual smoke should cover the parts shown in README/media so the public docs do
not overstate the current behavior. If a release-media capture requires a dev
server or preview server, record the URL and command used in the closeout.

## Risks

- **License ambiguity:** older plan wording says "CC0 default track" while M5
  shipped procedural audio. Mitigate by documenting the M5 as-built choice
  clearly and avoiding unproven external assets.
- **README overpromises live deployment:** local build success is not the same as
  deployed Pages. Mitigate by verifying the live URL when possible or recording
  the exact blocker.
- **Media drift:** screenshots can misrepresent the game if captured from stale
  builds. Mitigate by capturing after the current build/dev server is running.
- **Accidental private asset commit:** local music should remain ignored.
  Mitigate with `git status --short` and ignored-file review before closeout.
- **Scope creep:** avoid using M7 to sneak in stretch features; defer stretch to
  post-freeze tasks.
