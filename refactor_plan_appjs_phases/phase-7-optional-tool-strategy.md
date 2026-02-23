# Phase 7 (Optional): Introduce Tool Strategy Pattern

## Goal

Optionally replace parts of the mode-branching logic with a tool dispatcher/strategy design after the codebase has already been modularized and stabilized.

## Default Recommendation

Do this only if ongoing development still feels painful after Phase 6. It is not required to get most of the maintainability gains.

## Why This Is Deferred

- Current behavior depends on shared mutable session state and cross-tool helpers
- A strategy rewrite increases surface area and regression risk
- Function-level workflow extraction usually delivers most of the value first

## Target Outcome (If Pursued)

- A tool dispatcher routes events to tool implementations
- Low-risk tools migrated first
- Existing top-level handler APIs preserved during migration

## Migration Approach

1. Define a minimal tool interface (function-based first):
   - `onBoardClick`
   - `onObjectClick`
   - `onBoardMove`
   - `onObjectMove`
   - optional `onEnter/onExit`
2. Build a dispatcher that maps current mode to tool implementation.
3. Migrate one low-risk tool first (`Point` or `Segment`).
4. Validate behavior thoroughly.
5. Migrate additional tools incrementally.
6. Consider classes only if they materially improve readability.

## Critical Invariants

- No change to mode semantics or mode labels
- No change to event return contracts (`deferUntilUp`, etc.)
- Session mutations and resets remain explicit and testable

## Regression Checks (Mandatory)

- Compare migrated tool behavior against baseline workflows
- Re-test non-migrated tools to ensure dispatcher integration does not affect them
- Re-test keyboard shortcuts and selection transitions

## Exit Criteria

- Dispatcher exists and supports a subset or all tools without regressions
- Migration remains incremental and reversible

## Suggested Commit Boundary

- Dispatcher skeleton
- First tool migration
- Subsequent tool migrations (one per commit)

