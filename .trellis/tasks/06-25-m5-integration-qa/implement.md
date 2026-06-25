# M5 Integration and QA — Implementation Plan

## Preconditions

Do not start this child until these are implemented or intentionally deferred:

- `06-25-m5-audio-music-polish`
- `06-25-m5-particles-render-polish`
- `06-25-m5-title-ending-ui-polish`

## Step 1 — Load Context

- Read this child task's `prd.md`, `design.md`, and `implement.md`.
- Read parent task `.trellis/tasks/06-25-m5-av-polish/prd.md`.
- Read the final artifacts or summaries from the three implementation children.
- Inspect final diffs before changing anything.

## Step 2 — Cross-Child Diff Review

- Verify presentation-only boundary.
- Check `main.ts` for coherent title/audio/render ordering.
- Check no UI/render/audio code recomputes ending rules or mutates consequence.
- Check no stretch mechanics or new gameplay content slipped in.

## Step 3 — Automated Gate

Run from `meridian/`:

- `npm run typecheck`
- `npm run check:determinism`
- `npm run check:replay`
- `npm run build`

Fix narrow integration defects only.

## Step 4 — Manual Browser QA

Run `npm run dev` and check:

- title/start flow
- audio unlock/default bed/filter
- representative SFX
- particles and glow readability
- pause/reset
- finale fusion
- all four endings

Record any issue with file/feature ownership.

## Step 5 — Docs and License QA

- Verify `.gitignore` keeps local user music private.
- Verify default asset is committed or generated and documented.
- Verify README/NOTICE explains default music/license and user track handling.

## Step 6 — Parent Readiness

- Update parent task notes or PRD checkboxes if Trellis workflow requires it.
- If implementation created durable new contracts, update `.trellis/spec/`
  before final commit/archive.

## Risk Files

- `meridian/src/main.ts`
- `meridian/src/audio/*`
- `meridian/src/render/*`
- `meridian/src/ui/*`
- `.gitignore`
- `README.md` / `meridian/README.md`

## Handoff Notes

- Active task prompt for a sub-agent should begin with:
  `Active task: .trellis/tasks/06-25-m5-integration-qa`
- This child is a gatekeeper; avoid expanding scope beyond integration fixes.
