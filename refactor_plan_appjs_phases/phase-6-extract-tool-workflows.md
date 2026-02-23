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

