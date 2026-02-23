# Phase 2: Extract Session State (Plain Object)

## Goal

Replace file-scope mutable workflow state in `src/app.js` with a single explicit `editorSession` object, while preserving all behavior.

## Target Outcome

- New `/Users/sturk/Desktop/Geo Figures/src/app/session/editorSession.js`
- `createEditorSession()` factory returns all current app-local mutable state
- `app.js` uses `session.<field>` instead of top-level `let` variables

## State to Move

Move all app-local workflow state, including:
- `currentMode`
- `pendingPointIds`
- `pendingAngleIsRight`
- `pendingAngleArcCount`
- `pendingAngleDecorator`
- `activeAngleMarkPresetValue`
- `triangleVariant`
- `pendingRightTriangleForceIso`
- `marqueeState`
- `transformSession`
- `compassDragging`
- `perpendicularBisectorPlacement`
- `constructionSelectionSession`
- `transientDragSnapshots` (`Map`)

## Implementation Steps

1. Create `createEditorSession()` with the same initial values currently defined in `app.js`.
2. Initialize `const session = createEditorSession()` in `app.js`.
3. Replace direct references to top-level state variables with `session` references.
4. Add small reset helpers only if they reduce repeated error-prone logic:
   - pending point reset
   - angle preset reset
   - construction session clear
5. Keep behavior-preserving resets in the same call sites (`setMode`, `addPointInput`, `Escape`, transform cancel paths).

## Critical Invariants

- `transientDragSnapshots` remains a `Map`
- Drag commit timing and undo batching behavior is unchanged
- Mode transition resets happen under the same conditions as before
- `Escape` key behavior remains identical

## Anti-Goals

- No class-based state manager
- No immutability conversion
- No store merge (do not fold editor session into `AppStore` in this phase)

## Regression Checks (Mandatory)

- Mode switching and tool hints
- Point-input workflows (pending points + distinct-point enforcement)
- Right triangle placement and isosceles modifier
- Transform session open/update/apply/cancel
- Drag object and undo once (ensure no undo stack flooding)

## Exit Criteria

- No top-level workflow `let` state remains in `app.js` (except true constants/DOM refs/imported instances)
- All regressions pass
- Code remains readable (no accidental mixed references left behind)

## Suggested Commit Boundary

- Session factory file creation
- Mechanical replacement pass
- Cleanup pass (if needed), only after tests/checks

