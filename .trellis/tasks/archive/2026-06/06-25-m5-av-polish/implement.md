# M5 Parent — Execution Plan

> Parent task: `.trellis/tasks/06-25-m5-av-polish`. This task should not be the
> direct implementation target unless the child task plan changes. Start the
> relevant child task instead.

## Child Order

1. Start `06-25-m5-audio-music-polish`.
2. Start `06-25-m5-particles-render-polish`.
3. Start `06-25-m5-title-ending-ui-polish`.
4. Start `06-25-m5-integration-qa`.

The ordering is written explicitly so parent/child tree position is not treated
as an implicit dependency system.

## Parent Review Checklist

- [ ] Each child has `prd.md`, `design.md`, and `implement.md`.
- [ ] Each child states dependencies and validation commands.
- [ ] No child expands into stretch mechanics or new gameplay content.
- [ ] The integration child owns final cross-child QA and docs/license checks.

## Final Parent Completion Gate

After children are complete:

- Confirm final integrated state passes from `meridian/`:
  - `npm run typecheck`
  - `npm run check:determinism`
  - `npm run check:replay`
  - `npm run build`
- Confirm manual browser QA has covered:
  - title/start and audio unlock
  - sun-driven filter response
  - representative SFX
  - particles and glow polish
  - pause/reset
  - finale fusion
  - all four ending presentations
- Confirm docs/license notes cover default music and local user tracks.

## Handoff Note

For future sub-agent runs, give the active child task path first. Example:

`Active task: .trellis/tasks/06-25-m5-audio-music-polish`

Then instruct the sub-agent to read that child's `prd.md`, `design.md`, and
`implement.md` before editing.
