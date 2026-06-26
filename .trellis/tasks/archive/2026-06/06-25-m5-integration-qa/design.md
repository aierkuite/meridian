# M5 Integration and QA — Technical Design

## 1. Scope

This is a verification and integration task. It should not add new M5 features
unless a small fix is required to make the child deliverables work together.

## 2. Review Surfaces

Focus on cross-child seams:

- `meridian/src/main.ts`: title phase, audio frame derivation, render mood,
  pause/reset, HMR cleanup
- `meridian/src/audio/`: unlock, default asset, cue spam, ending cue once
- `meridian/src/render/`: particle pools, glow pipeline, no runtime blur
- `meridian/src/ui/`: title, HUD, endings, no skip/level-select
- `.gitignore` and README/NOTICE: music asset hygiene

## 3. Browser QA Matrix

Minimum manual pass:

| Area | Check |
|------|-------|
| Title | initial screen renders, start key begins run |
| Audio | first gesture unlocks, default bed plays, filter follows sun |
| SFX | jump, sun, one element change, shortcut cost, fusion, ending |
| Render | day dust, night spores, horizon mote, glow readability |
| UI | narration, hint, pause, reset, finale progress |
| Endings | One Sky, Vow, Afterglow, Long Dark screens and audio mood |

Use replay/test-state helpers if available to reach endings quickly; do not add
a shipped ending selector.

## 4. Automated Gate

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

If a check fails, fix only the relevant integration defect or hand the issue
back to the owning child scope if it is broad.

## 5. Closeout

Document:

- commands run and results
- manual QA coverage
- any accepted deferrals
- any spec updates needed before archive/commit
