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

### Current Safe Boundary

- `handleBoardClick`, `handleObjectClick`, `handleObjectMove` still exist in `app.js` as top-level entrypoints.
- `handleObjectClick` dedupe logic remains in `app.js` (intentionally preserved).
- `handleObjectClick` construction-selection session branch now delegates to a workflow module (with original branch order and `deferUntilUp` behavior preserved).
- `handleObjectMove` drag/undo batching logic is untouched (intentionally deferred).
- Board preview updates, marquee workflow, and point-collection branches now delegate to workflow modules.

### Next Recommended Safe Steps

1. Extract `handleBoardClick` perpendicular-bisector placement branch (medium risk; stateful but isolated).
2. Extract another small isolated `handleBoardClick` mode branch (if available) before broader construction workflow consolidation.
3. Re-run a focused regression pass on board-click construction flows after each extraction (pending-point state/order and mode resets).

### Defer Until Later (Higher Risk)

- `handleObjectMove(...)` drag workflows and transient drag snapshot commit/flush logic
- Any changes to object-click dedupe stamp / handled-click bookkeeping
- Broader reordering of top-level handler branch order
