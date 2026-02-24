# Phase 6: Extract Tool Workflow Modules (Without Strategy Pattern)

## Goal

Break up monolithic interaction handlers into workflow modules while preserving the existing top-level handler API and sequencing.

## Target Outcome

- `handleBoardClick`, `handleObjectClick`, `handleBoardMove`, `handleObjectMove` remain as orchestration entrypoints
- Tool/workflow logic is extracted into focused modules/functions
- Event dedupe and `deferUntilUp` semantics remain unchanged

## Recommended Workflow Split

- Selection + marquee workflows
- Point placement + snapping workflows
- Linear tools (segment/line/ray)
- Circle tool workflow
- Triangle workflows
- Angle workflows
- Construction workflows (midpoint/bisectors/parallel/perpendicular)
- Transform workflows
- Drag/move workflows (especially transient drag snapshot behavior)

## Extraction Strategy

1. Keep top-level handlers in `app.js` initially.
2. Move one workflow family at a time to an imported module.
3. Pass explicit `ctx` object:
   - `store`
   - `boardController`
   - `session`
   - helper functions/callbacks used by that workflow
4. Preserve top-level preconditions and branching order until validated.

## Critical Invariants

- `handleObjectClick` event dedupe hack (`__codexHandledObjectClicks*`) must remain intact until fully validated
- `deferUntilUp` return values must remain identical
- Selection behavior in construction mode must stay the same
- Pending point collection and mode-specific branching must preserve order
- Drag snapshot commit/flush logic must preserve undo batching

## High-Risk Areas (Treat Last or Isolate Carefully)

- `handleObjectMove` (drag + undo batching + constrained points)
- `handleObjectClick` dedupe and release-event handling
- Right triangle and transform interactions (multi-step stateful behavior)

## Suggested Order Within This Phase

1. Extract low-risk workflow helpers used by handlers (pure/mostly pure logic)
2. Extract selection/marquee logic
3. Extract linear/circle tool workflows
4. Extract triangle/angle workflows
5. Extract construction workflows
6. Extract drag/move workflow logic last

## Regression Checks (Mandatory)

- Full drawing tool matrix
- Selection/marquee behavior
- Construction actions and variants
- Drag move + undo/redo (single drag = one undo entry)
- Mode transitions and pending point state resets

## Exit Criteria

- Major handler logic is split across workflow modules
- Top-level handlers are readable dispatch/orchestration functions
- No regressions in dedupe, defer, drag undo behavior

## Suggested Commit Boundary

- One workflow family per commit

## Working Progress (Resume Here)

Use this section as the continuity checkpoint if work pauses or moves to a new thread.

### Completed Slices

- `05744e3` - Extract marquee selection workflow (`startMarqueeSelection` + helpers) to `src/app/workflows/marqueeSelection.js`
- `d8bb5d5` - Extract select-mode click handling (board/object select branches) to `src/app/workflows/selectionClicks.js`
- `845b6d7` - Extract board-move preview dispatch (`handleBoardMove`) to `src/app/workflows/boardMovePreview.js`
- `146c2be` - Extract `POINT`-mode board click workflow to `src/app/workflows/pointPlacementClick.js`
- `998ceb9` - Extract board-click point-collection workflow (`pointNeeds(...) > 0` branch) to `src/app/workflows/pointCollectionBoardClick.js`
- `5e9fee7` - Extract object-click point-collection workflow to `src/app/workflows/pointCollectionObjectClick.js`
- `d19d467` - Extract object-click mode branches (label/delete and related small isolated branches)
- `3b64280` - Extract object-click construction-selection session branch (`deferUntilUp` semantics preserved) to `src/app/workflows/objectClickConstructionSelection.js`
- `e71e62a` - Extract `handleBoardClick` perpendicular-bisector placement branch to `src/app/workflows/perpendicularBisectorPlacementBoardClick.js`
- `3788dac` - Extract `handleBoardClick` angle-mode status/early-return guard to `src/app/workflows/angleModeBoardClick.js`
- `179b2f0` - Extract `addPointInput` linear/circle create branches (`SEGMENT`/`LINE`/`RAY`/`CIRCLE`) to `src/app/workflows/pointInputLinearCircleCreate.js`
- `d1af72c` - Extract `addPointInput` angle create branch to `src/app/workflows/pointInputAngleCreate.js`

### Current Safe Boundary

- `handleBoardClick`, `handleObjectClick`, `handleObjectMove` still exist in `app.js` as top-level entrypoints.
- `handleObjectClick` dedupe logic remains in `app.js` (intentionally preserved).
- `handleObjectClick` construction-selection session branch now delegates to a workflow module (with original branch order and `deferUntilUp` behavior preserved).
- `handleObjectMove` drag/undo batching logic is untouched (intentionally deferred).
- `handleBoardClick` perpendicular-bisector placement and angle-mode guard now delegate to workflow modules (board-click branch order preserved).
- Board preview updates, marquee workflow, and point-collection branches now delegate to workflow modules.
- `addPointInput` linear/circle and angle creation branches now delegate to workflow modules; pending-point sequencing, mutation wrapping, and reset timing remain in `app.js`.

### Next Recommended Safe Steps

1. Extract the remaining `addPointInput` triangle creation branch as a dedicated workflow module (highest-risk remaining portion of `addPointInput`; preserve mutation/reset timing in `app.js`).
2. Run a focused regression pass on triangle variants (three-point, right, isosceles, regular/equilateral variant path) including constrained apex behavior and right-angle annotation creation.
3. Continue deferring `handleObjectMove(...)` drag/undo batching extraction until the non-drag workflow families are complete.

### Defer Until Later (Higher Risk)

- `handleObjectMove(...)` drag workflows and transient drag snapshot commit/flush logic
- Any changes to object-click dedupe stamp / handled-click bookkeeping
- Broader reordering of top-level handler branch order
