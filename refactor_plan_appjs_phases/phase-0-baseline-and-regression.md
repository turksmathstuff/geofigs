# Phase 0: Baseline and Regression Harness

## Goal

Create a safety net before any refactor work. This phase is complete when you can detect regressions in interaction behavior quickly.

## Scope

- Baseline behavior capture
- Manual regression checklist updates
- Optional smoke test setup

No refactor/module extraction in this phase.

## Deliverables

- Updated regression checklist (manual)
- Baseline notes for sensitive workflows
- Optional Playwright smoke tests (if chosen)

## Priority Risk Areas to Baseline

- Drag undo batching (`transientDragSnapshots` behavior)
- Transform panel preview/apply/cancel behavior
- Angle presets and right-angle mark behavior
- Selection vs marquee behavior
- `handleObjectClick` dedupe behavior (no duplicate actions on click)

## Action Steps

1. Expand `QA_CHECKLIST.md` (or create a refactor-specific checklist) with all workflows from the master plan.
2. Run the app and record current expected behavior for:
   - Selection and marquee
   - Point snapping/intersections
   - Triangle modes
   - Angle presets
   - Transform tools
   - Undo/redo after drag
   - Save/open
   - SVG/PNG export
3. Decide whether to add smoke tests now.
4. If adding smoke tests, keep scope small:
   - Launch app
   - Create points + segment
   - Undo/redo
   - Toggle exam mode
   - Create one triangle

## Constraints

- Do not refactor production code in this phase.
- Do not change data model or rendering behavior.

## Exit Criteria

- Manual regression checklist exists and is usable.
- Baseline behavior for high-risk workflows is documented.
- Optional smoke suite passes (if created).

## Suggested Commit Boundary

- Checklist/docs only
- Optional test scaffolding in a separate commit

