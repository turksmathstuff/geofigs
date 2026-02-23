# Safe Refactor Plan for `/Users/sturk/Desktop/Geo Figures/src/app.js` (4545 lines)

## Summary

Refactor `app.js` incrementally with a behavior-preserving extraction strategy. The goal is to reduce file size and coupling without changing tool behavior, rendering semantics, or undo/redo behavior.

This plan prioritizes:
1. Stabilizing seams and regression checks
2. Extracting pure and low-coupling logic
3. Extracting rendering and UI binding modules
4. Consolidating app-local mutable state
5. Only then considering a Tool/Strategy architecture

This avoids a high-risk “architecture rewrite” while still producing a maintainable module layout.

## Goals and Success Criteria

### Goals
- Split `app.js` into smaller modules with clear responsibilities.
- Preserve all current interaction behavior.
- Preserve undo/redo semantics, especially drag interactions and transient snapshots.
- Make future feature work safer by reducing hidden coupling.

### Success Criteria
- `app.js` is reduced to an orchestration entrypoint (target: <= 1200 lines in phase 1-4; lower later if desired).
- No observable regressions in core workflows (selection, point creation, line/ray/segment/circle creation, triangle variants, angle marks, transform, style changes, undo/redo, save/open, exports).
- `renderCurrentDoc()` behavior remains identical (full redraw + selection re-application + preview state handling).
- `handleObjectClick` dedupe behavior remains intact.
- `handleObjectMove` drag undo semantics remain intact.

## Scope

### In Scope
- File/module extraction
- Local API cleanup between extracted modules
- Optional JSDoc typing while moving functions
- Regression verification (manual and optionally automated)

### Out of Scope (for this refactor pass)
- UI redesign
- Data model schema changes
- Changing document format
- Rewriting `BoardController`
- Full Tool/Strategy rewrite (can be phase 5+ after stabilization)

## Current Risk Hotspots (Must Preserve)

1. **Module-level mutable session state**
   - `currentMode`, `pendingPointIds`, `pendingAngle*`, `triangleVariant`, `transformSession`, `marqueeState`, `perpendicularBisectorPlacement`, `constructionSelectionSession`, etc.
   - These are shared by many functions and encode tool workflow state.

2. **Transient drag undo behavior**
   - `transientDragSnapshots` batching/commit behavior (used to prevent undo stack flooding).
   - Any changes here can break undo granularity or performance.

3. **Rendering orchestration**
   - `renderCurrentDoc()` redraw order matters:
     - recompute constraints
     - reset board
     - render non-point objects
     - render annotations
     - apply selection visuals
     - apply pending-point visuals
     - board update
   - Preserve order and conditions.

4. **Event sequencing and dedupe**
   - `handleObjectClick` dedupe fields on events (`__codexHandledObjectClicks*`)
   - `deferUntilUp` handling behavior
   - selection vs construction session behavior

5. **UI binding and DOM assumptions**
   - `wireUi()` assumes certain elements exist and binds many closures over app-local state
   - Keyboard shortcuts and transform panel drag interactions are sensitive to ordering and shared state

## Target Module Architecture (Behavior-Preserving)

This architecture is intentionally incremental and minimal. It avoids introducing new patterns until behavior is stabilized.

### Phase Target Structure
- `/Users/sturk/Desktop/Geo Figures/src/app.js`
  - App bootstrap/orchestration only
  - Creates `store`, `boardController`, `domRefs`, `editorSession`
  - Wires extracted modules together
- `/Users/sturk/Desktop/Geo Figures/src/app/session/editorSession.js`
  - Plain object factory + reset helpers for app-local mutable state
- `/Users/sturk/Desktop/Geo Figures/src/app/dom/domRefs.js`
  - DOM element lookup/cache (current top-level `getElementById` calls)
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/modeUi.js`
  - `modeLabel`, `canvasHintText`, `updateModeUi`, construction selection status helpers
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/styleUi.js`
  - `syncStyleInputsFromDoc`, style input helper functions
- `/Users/sturk/Desktop/Geo Figures/src/app/render/renderDoc.js`
  - `renderCurrentDoc`, extracted helpers for rendering objects/annotations
- `/Users/sturk/Desktop/Geo Figures/src/app/render/docApply.js`
  - `applyDoc`, migration/style normalization orchestration
- `/Users/sturk/Desktop/Geo Figures/src/app/geometry/*.js`
  - Pure geometric/math and transform helpers
- `/Users/sturk/Desktop/Geo Figures/src/app/tools/*` (later phase)
  - Tool-specific workflows only after session + rendering extraction stabilizes
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/wireUi.js`
  - Split event binding functions (toolbar, transform, file ops, styles, keyboard)

## Public APIs / Interfaces / Types (Changes and Additions)

### New Internal Interfaces (not user-facing)
These are internal module contracts to reduce hidden coupling.

1. `createEditorSession()`
- Returns a plain mutable object containing all current app-local workflow state.
- Includes reset helper methods for common transitions (e.g., `resetPendingPointInput`, `resetAnglePresetState`, `resetConstructionSession`).

Suggested shape (internal):
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
- `transientDragSnapshots`

2. `createDomRefs(document)`
- Caches all DOM references currently initialized at module top.
- Returns a structured object to avoid repeated global lookups and to make UI modules explicit.

3. `renderCurrentDoc(ctx, options?)`
- Extracted from `app.js`, but behavior preserved.
- `ctx` should include `store`, `boardController`, `session`, and required helpers (`defaultStyle`, `getLineExtentsForObject`, etc.).
- Keep existing `applySelection = true` semantic.

4. `wireUi(ctx)`
- Accepts explicit dependencies instead of closing over file-scope globals.
- Keeps event handler behavior identical.

### Existing APIs to Preserve
- `BoardController` external API in `/Users/sturk/Desktop/Geo Figures/src/board/boardController.js`
- `AppStore` API in `/Users/sturk/Desktop/Geo Figures/src/state/store.js`
- Document shape in `/Users/sturk/Desktop/Geo Figures/src/state/figureDoc.js`

## Implementation Plan (Decision-Complete, Ordered)

### Phase 0: Baseline and Regression Harness (No Refactor Yet)
Purpose: Create a safety net before moving code.

1. Create a manual regression checklist for core workflows (can be in existing `QA_CHECKLIST.md` or a new refactor-specific checklist).
2. Record current behavior of key workflows:
   - selection click vs drag-select
   - point snapping/intersections
   - line/ray/segment/circle creation
   - triangle modes (`three-point`, `right`, `isosceles`)
   - angle presets and right-angle mark
   - transform panel interactions (sliders, compass drag, reflections)
   - style changes and exam mode
   - undo/redo including drag undo batching
   - save/open
   - SVG/PNG export
3. Optional but recommended: add a minimal browser smoke suite (Playwright) covering:
   - draw points + segment
   - undo/redo
   - triangle tool
   - style toggle
   - export command invocation (mock/spy if needed)

Default if no test infra is desired now:
- Use manual regression checklist only, run after every extraction step.

### Phase 1: Extract Pure Utilities (Lowest Risk)
Purpose: Shrink file and remove noise without touching sequencing.

1. Extract pure math/geometry helpers into `/src/app/geometry/` modules.
2. Extract transform/geometry collision helpers into separate module(s).
3. Do not change function behavior.
4. Where a function currently mixes pure logic and store lookups:
   - split into:
     - a pure helper (accepts point objects/defs)
     - a thin app adapter (does `getPointById` / store access)
5. Add JSDoc only when moving functions if it clarifies shape and reduces mistakes.

Examples of likely extraction candidates (exact function list to be confirmed during implementation):
- numeric normalization helpers
- distance/intersection helpers
- polygon overlap/projection helpers
- point transform helpers
- angle geometry helpers not touching DOM/store/board

Constraints:
- No changes to event handlers yet.
- No changes to render flow yet.

### Phase 2: Extract Session State (Without Architectural Rewrite)
Purpose: Replace file-scope `let` sprawl with one explicit mutable object while preserving behavior.

1. Create `/src/app/session/editorSession.js` with `createEditorSession()`.
2. Move all app-local mutable state into the session object, including `transientDragSnapshots`.
3. In `app.js`, replace direct globals with `session.<field>` references.
4. Preserve mutation semantics exactly (including resets in `setMode`, `addPointInput`, `Escape` handler, transform cancellation paths).
5. Do not convert to classes or immutability yet.

Important preservation rules:
- `transientDragSnapshots` must remain a `Map` and preserve commit timing.
- Session resets must keep the same conditional behavior (e.g., angle preset resets only on mode transitions where current code resets them).

### Phase 3: Extract DOM References and UI Display Logic
Purpose: Isolate DOM coupling and reduce top-of-file sprawl.

1. Create `/src/app/dom/domRefs.js`
   - Move all `document.getElementById` and `querySelectorAll` lookups there.
   - Return a structured `dom` object.
2. Create `/src/app/ui/modeUi.js`
   - Move:
     - `modeLabel`
     - `canvasHintText`
     - `constructionSelectionStatusText`
     - `updateModeUi`
   - Accept `ctx` (`store`, `session`, `dom`) instead of file globals.
3. Create `/src/app/ui/styleUi.js`
   - Move `syncStyleInputsFromDoc` and related style UI sync helpers.
4. Keep DOM event listeners in `app.js` for now; only move display/update logic first.

Important:
- Preserve DOM null checks exactly where present.
- Do not change initialization order:
  - `wireUi()`
  - marquee init
  - `updateModeUi()`
  - style sync
  - render

### Phase 4: Extract Rendering and Document-Apply Pipeline
Purpose: Isolate the highest-value seam while preserving behavior.

1. Create `/src/app/render/renderDoc.js`
   - Move `renderCurrentDoc`
   - Extract subfunctions:
     - render non-point objects
     - render annotations
     - apply selection visual state
     - apply pending-point visual state
2. Create `/src/app/render/docApply.js`
   - Move `applyDoc`
   - Keep normalization/migration/command stack behavior identical.
3. Keep helper dependencies explicit:
   - pass `store`, `boardController`, `session`, and helper functions as a `ctx`
   - avoid importing `app.js` into render modules (prevents circular deps)
4. Preserve render ordering exactly.

Critical invariants:
- `recomputeConstrainedPoints()` runs before `boardController.resetBoard()`
- `boardController.update()` runs once at end
- hidden objects/annotations skipped exactly as before
- selection visual application respects `applySelection` parameter
- pending-point highlighting preserved for active tool modes

### Phase 5: Split `wireUi()` Into Binding Modules (Still Behavior-Preserving)
Purpose: Reduce risk in UI event registration without changing tool logic.

1. Create `/src/app/ui/wireUi.js`
2. Break event binding into explicit functions:
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
3. Each binding function accepts explicit dependencies (`dom`, `store`, `session`, callbacks).
4. Preserve all current event semantics, including:
   - `keydown` capture usage (`true`)
   - transform compass mousemove/up global listeners
   - menu hide/show click propagation behavior
   - same labels/command names passed into mutations

Important:
- This phase should be mostly a move/repackage; no tool behavior changes.

### Phase 6: Extract Tool Workflow Modules (Selective, Not Full Strategy Yet)
Purpose: Break up monolithic event handlers safely.

1. Split large handlers by workflow family before introducing classes:
   - selection/marquee
   - point placement + snapping
   - linear tools (segment/line/ray)
   - circle tool
   - triangle workflows
   - angle workflows
   - construction helpers (midpoint/bisector/parallel/perpendicular)
   - transform workflows
2. Keep a single top-level `handleBoardClick`, `handleObjectClick`, `handleBoardMove`, `handleObjectMove` that dispatches to extracted functions.
3. Preserve event dedupe logic inside `handleObjectClick` until fully validated.
4. Preserve `deferUntilUp` return behavior exactly.

Why not Strategy pattern yet:
- Current behavior relies heavily on shared mutable session and cross-tool helpers.
- Function-level extraction first reduces risk and reveals natural tool boundaries.
- Strategy classes can be phase 7+ if still desired.

### Phase 7 (Optional): Introduce Tool Strategy Pattern
Only do this after phases 1-6 are green and stable.

1. Introduce a `tool dispatcher` interface with function-based tools first.
2. Migrate one low-risk tool (e.g., `Point` or `Segment`) to prove pattern.
3. Preserve compatibility by routing through existing handlers.
4. Only then consider class-based tools if benefits are clear.

Default recommendation:
- Stop after phase 6 unless ongoing development pain justifies the extra abstraction.

## Detailed Testing Plan

## Manual Regression Matrix (Required)
Run after each phase (or at least after phases 2, 4, 5, 6).

### Core Interaction
- Create single point on empty board
- Create point snapped to object
- Create intersection point from crossing objects
- Select single object
- Multi-select with Shift/Ctrl/Cmd
- Marquee select
- Clear selection by clicking background
- Delete selected
- Hide selected / show all hidden

### Drawing Tools
- Segment creation from existing points
- Segment creation with inline point creation
- Line creation with extension styles
- Ray creation with ray extension
- Circle creation
- Angle creation (normal arc)
- Angle creation (right angle)
- Angle presets (`arc`, `arcTick`, counts)

### Triangle Workflows
- 3-point triangle
- Right triangle placement
- Right triangle isosceles modifier behavior
- Isosceles triangle
- Congruent triangle copy
- Similar triangle copy

### Construction / Annotation
- Midpoint (with and without ticks)
- Angle bisector variants
- Perpendicular bisector variants (RA/ticks/both)
- Parallel / perpendicular through point
- Tick marks and parallel marks
- Side and angle measures

### Transform UI
- Open transform panel
- Slider move updates preview
- Compass drag rotates preview
- Reflect horizontal/vertical
- Apply transform commits one undoable action
- Cancel transform restores state

### Undo/Redo
- Undo/redo after create
- Undo/redo after style changes
- Undo/redo after drag move (single drag should not flood stack)
- Undo/redo after transform apply

### Persistence / Export
- Save doc and reopen doc
- SVG export
- PNG export
- Exam mode export behavior (intersection point black override path)

## Optional Automated Tests (Recommended, Separate Small Effort)
If implementing:
- Add Playwright smoke tests for:
  - launch app
  - create two points + segment
  - undo/redo
  - toggle exam mode
  - triangle tool creation
- Keep tests high-level and small; goal is regression detection, not exhaustive coverage.

## Acceptance Criteria by Phase

### Phase 1 Accepted When
- Pure helpers moved out
- No behavior changes in manual smoke flows
- `app.js` compiles/runs unchanged behavior

### Phase 2 Accepted When
- All former top-level mutable `let` workflow state replaced by `session`
- No regressions in mode transitions, pending-point workflows, or drag behavior

### Phase 3 Accepted When
- DOM refs centralized
- UI display updates still reflect current mode/selection/tool hints correctly

### Phase 4 Accepted When
- `renderCurrentDoc()` and `applyDoc()` extracted
- Rendering order and command stack semantics preserved

### Phase 5 Accepted When
- `wireUi()` split into binding modules
- Keyboard shortcuts and transform interactions remain unchanged

### Phase 6 Accepted When
- Monolithic handler logic is split into workflow modules
- `handleObjectClick` dedupe and `deferUntilUp` semantics preserved

## Migration / Compatibility Notes

- No document schema changes planned.
- No `BoardController` API changes required in this refactor.
- No `AppStore` API changes required.
- Internal helper function signatures may change (especially pure geometry helpers) to remove store lookups; these are internal-only changes.

## Explicit Assumptions and Defaults

1. **No full Tool/Strategy rewrite in initial refactor**
- Default: postpone until after behavior-preserving modularization is complete.

2. **Testing approach**
- Default: manual regression checklist is required.
- Optional: add Playwright smoke tests if time permits.

3. **State encapsulation style**
- Default: plain mutable `editorSession` object + helper functions, not a class, for lower migration risk.

4. **Type system**
- Default: remain in JavaScript; add JSDoc incrementally where helpful.
- No TypeScript migration included in this plan.

5. **Performance**
- Default: preserve current full-redraw rendering model; do not optimize rendering during refactor.

6. **Refactor granularity**
- Default: micro-commits or micro-PRs per extraction unit (one module or one cohesive function group at a time).

## Recommended First Implementation Slice (Lowest Risk Start)

1. Create manual regression checklist additions for drag undo + transform preview + angle presets.
2. Extract a small pure geometry module (e.g., `distance`, projection/collision helpers, point transforms).
3. Run regression checklist.
4. Extract `domRefs` and `styleUi` sync (low risk, visible payoff).
5. Run regression checklist.
6. Extract `renderCurrentDoc` and `applyDoc` only after those are green.

This sequence yields immediate reduction in `app.js` size while protecting the highest-risk behavior paths.
