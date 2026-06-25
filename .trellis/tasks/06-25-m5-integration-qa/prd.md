# M5 Integration and QA

## Goal

Perform final M5 integration, regression checks, browser QA, and documentation
cleanup after the audio, render, and UI child tasks are complete.

This child is the final gate for the parent M5 task. It should verify the merged
experience rather than introduce new feature scope.

## Confirmed Facts

- Parent task: `.trellis/tasks/06-25-m5-av-polish`.
- This task depends on:
  - `06-25-m5-audio-music-polish`
  - `06-25-m5-particles-render-polish`
  - `06-25-m5-title-ending-ui-polish`
- Existing project gates are run from `meridian/`.
- M5 touches user-visible presentation, so manual browser QA is required in
  addition to automated checks.

## Requirements

- **R1. Merge review.** Inspect final diffs from all M5 child tasks for boundary
  violations, accidental stretch scope, and overlapping `main.ts` behavior.
- **R2. Automated gate.** Run the full automated gate from `meridian/`.
- **R3. Browser QA.** Manually verify title/start, audio unlock, sun filter,
  representative SFX, particles, pause/reset, finale, and all four endings.
- **R4. Asset/license QA.** Verify default music/ambient asset handling,
  `.gitignore` behavior, and README/NOTICE license notes.
- **R5. Performance/readability sanity.** Check for obvious frame stutter,
  runtime blur misuse, particle spam, unreadable UI text, or audio spam/clipping.
- **R6. Parent closeout.** Record any remaining deferrals or acceptance gaps
  against the parent task before it is considered complete.

## Acceptance Criteria

- [ ] AC1. Full automated gate passes from `meridian/`:
      `npm run typecheck`, `npm run check:determinism`,
      `npm run check:replay`, and `npm run build`.
- [ ] AC2. Manual browser pass confirms M5 title/audio/render/UI flow works as
      one integrated experience.
- [ ] AC3. All four ending presentations can be inspected and match their
      resolved ending id.
- [ ] AC4. Default music/ambient asset is redistributable or generated, docs say
      so, and local user music remains ignored.
- [ ] AC5. Render hot paths do not contain runtime `ctx.shadowBlur` additions or
      obvious per-frame particle allocation.
- [ ] AC6. No child introduced stretch mechanics, level select, skip affordance,
      ending choice, or gameplay-rule ownership in presentation code.

## Out of Scope

- Implementing new M5 features not already covered by prior children.
- Stretch work or new gameplay content.
- Broad refactors unrelated to integration defects.

## Open Questions

None blocking. This task should start only after the three implementation
children are complete.
