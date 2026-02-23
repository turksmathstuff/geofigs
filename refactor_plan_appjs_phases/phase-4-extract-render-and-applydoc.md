# Phase 4: Extract Rendering and `applyDoc` Pipeline

## Goal

Move rendering and document-application orchestration into dedicated modules while preserving exact behavior and call ordering.

## Target Outcome

- `renderCurrentDoc()` extracted to `render` module(s)
- `applyDoc()` extracted to `docApply` module
- `app.js` becomes thinner but still orchestrates the app

## New Modules

- `/Users/sturk/Desktop/Geo Figures/src/app/render/renderDoc.js`
- `/Users/sturk/Desktop/Geo Figures/src/app/render/docApply.js`

## Functions to Move

### Core
- `renderCurrentDoc`
- `applyDoc`

### Likely subhelpers to extract with render
- object rendering loops
- annotation rendering loops
- selection visual application
- pending-point visual application

Keep complex dependencies explicit instead of importing back into `app.js`.

## Context Contract (Recommended)

Pass a `ctx` object into render/apply helpers containing:
- `store`
- `boardController`
- `session`
- rendering helpers (`defaultStyle`, line/ray extension helpers, etc.)
- state helpers used during render (`pointNeeds`, `nestedAngleArcRadii`, etc.)
- side-effect callbacks (`recomputeConstrainedPoints`, `syncStyleInputsFromDoc`, etc.)

## Critical Invariants (Do Not Change)

- `recomputeConstrainedPoints()` runs before `boardController.resetBoard()`
- Hidden objects/annotations are skipped exactly as before
- Selection visuals applied after render loops
- Pending-point highlighting still applies when appropriate
- `boardController.update()` runs once at end of `renderCurrentDoc`
- `applyDoc` keeps:
  - store set/reset behavior
  - style normalization
  - migration call(s)
  - command stack clearing behavior for non-command path
  - render + style sync ordering

## Implementation Steps

1. Extract `renderCurrentDoc` with minimal internal changes.
2. Extract render subhelpers if needed to keep file readable.
3. Extract `applyDoc` and pass explicit callbacks/dependencies.
4. Verify no circular imports.
5. Keep command labels and mutation semantics unchanged.

## High-Risk Regressions to Watch

- Missing annotations after redraw
- Selection highlight lost after render
- Preview or pending-point highlight wrong after mode interactions
- Undo/redo stack clearing behavior changed after loading docs
- Style controls not synced after `applyDoc`

## Regression Checks (Mandatory)

- Render all object types + annotations
- Selection and pending-point highlighting
- Undo/redo after create/style change
- Open saved doc and verify style inputs + board content
- Angle arc rendering counts/radii

## Exit Criteria

- `renderCurrentDoc` and `applyDoc` live outside `app.js`
- All render/apply invariants preserved
- No circular dependency introduced

## Suggested Commit Boundary

- `renderCurrentDoc` extraction first
- `applyDoc` extraction second

