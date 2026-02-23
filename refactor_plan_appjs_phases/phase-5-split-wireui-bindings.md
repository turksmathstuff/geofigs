# Phase 5: Split `wireUi()` Into Binding Modules

## Goal

Break `wireUi()` into smaller event-binding functions/modules without changing event semantics or tool behavior.

## Target Outcome

- New `/Users/sturk/Desktop/Geo Figures/src/app/ui/wireUi.js`
- `wireUi()` delegated to semantic binding groups
- Event behavior remains unchanged

## Binding Groups to Create

- `bindModeButtons`
- `bindConstructionButtons`
- `bindAngleMarkButtons`
- `bindTransformControls`
- `bindSelectionActions`
- `bindUndoRedoActions`
- `bindExportActions`
- `bindFileActions`
- `bindStyleActions`
- `bindKeyboardShortcuts`
- `bindHintInteractions`

You may combine adjacent groups if it reduces ceremony and preserves clarity.

## Dependency Contract

Each binding function should receive explicit dependencies, typically:
- `dom`
- `store`
- `session`
- callbacks/actions from `app.js` (e.g., `setMode`, `launchMidpoint`, `deleteSelected`, `renderCurrentDoc`)

Avoid hidden imports of `app.js`.

## Critical Invariants

- Preserve `keydown` listener capture flag (`true`)
- Preserve global `window` listeners for compass dragging and mouseup handling
- Preserve triangle menu click propagation and document click-to-close behavior
- Preserve exact command labels and action callbacks used in mutations
- Preserve reset behavior on file input (`evt.target.value = ""`)

## Implementation Steps

1. Extract `wireUi()` into `ui/wireUi.js` as a single function first (behavior-preserving move).
2. Split internally into binding group functions.
3. Inject dependencies explicitly instead of relying on file-scope closures.
4. Re-test keyboard shortcuts and transform controls carefully.

## High-Risk Regressions to Watch

- Duplicate event listeners (if bind called twice accidentally)
- Keyboard shortcuts not firing because capture flag changed
- Transform compass drag stuck due to missing `mouseup` cleanup
- Triangle dropdown not closing properly
- File input not reopening same file due to missing reset

## Regression Checks (Mandatory)

- Keyboard shortcuts: undo/redo/delete/hide/escape
- Transform panel sliders + compass drag + reflect buttons
- Triangle menu open/close and mode selection
- Export buttons
- Save/open file input flow
- Hint hover behavior

## Exit Criteria

- `wireUi()` is removed or minimized in `app.js`
- Binding logic lives in `ui/wireUi.js` (and helper functions)
- Event semantics match baseline

## Suggested Commit Boundary

- Move `wireUi()` wholesale
- Split into groups in follow-up commit(s)

