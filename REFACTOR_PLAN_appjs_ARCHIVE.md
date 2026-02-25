# app.js Refactor Plan Archive (Historical)

This document preserves the original refactor planning materials that were previously split across:
- `REFACTOR_PLAN_appjs.md`
- `refactor_plan_appjs_phases/*.md`

It is retained for historical/reference purposes after Phase 6 completion.

---

## Source: `REFACTOR_PLAN_appjs.md`

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


---

## Source: `refactor_plan_appjs_phases/README.md`

# `app.js` Refactor Phase Docs

This folder breaks `/Users/sturk/Desktop/Geo Figures/REFACTOR_PLAN_appjs.md` into separate, actionable phase documents.

## Order

1. `phase-0-baseline-and-regression.md`
2. `phase-1-extract-pure-utilities.md`
3. `phase-2-extract-session-state.md`
4. `phase-3-extract-dom-and-ui-display.md`
5. `phase-4-extract-render-and-applydoc.md`
6. `phase-5-split-wireui-bindings.md`
7. `phase-6-extract-tool-workflows.md`
8. `phase-7-optional-tool-strategy.md`

## Usage

- Treat each phase doc as a standalone implementation checklist.
- Do not start the next phase until the current phase exit criteria pass.
- Run the manual regression matrix after each phase (minimum after phases 2, 4, 5, and 6).

## Source of Truth

The master plan remains:
- `/Users/sturk/Desktop/Geo Figures/REFACTOR_PLAN_appjs.md`

These phase docs are execution slices derived from that plan.



---

## Source: `refactor_plan_appjs_phases/phase-0-baseline-and-regression.md`

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



---

## Source: `refactor_plan_appjs_phases/phase-1-extract-pure-utilities.md`

# Phase 1: Extract Pure Utilities

## Goal

Shrink `src/app.js` by moving pure/low-coupling helper logic into dedicated modules without changing behavior.

## Target Outcome

- New modules under `/Users/sturk/Desktop/Geo Figures/src/app/geometry/` (or similar)
- `src/app.js` imports extracted helpers
- No changes to event sequencing or render flow

## What to Move First (Low Risk)

- Numeric normalization helpers
- Geometry math helpers
- Transform math helpers
- Polygon/projection/collision helpers
- Angle geometry helpers that do not touch DOM/store/board

Examples from `src/app.js` (verify exact grouping during extraction):
- `distance`
- line/circle intersection helpers
- polygon overlap helpers
- `transformPointAround`
- related projection/centroid helpers

## Extraction Rules

1. Preserve logic exactly (copy first, then import).
2. Do not mix cleanup/refactor with extraction.
3. If a helper reads from `store` or uses IDs:
   - split it into:
     - pure helper (takes point objects/defs)
     - thin adapter in `app.js` (does lookup)
4. Avoid introducing classes here.
5. Add JSDoc only if it prevents shape confusion.

## Suggested Module Split

- `src/app/geometry/core.js`
- `src/app/geometry/intersections.js`
- `src/app/geometry/polygons.js`
- `src/app/geometry/transforms.js`

Use a smaller number of files if that reduces churn.

## Invariants to Preserve

- No changes to generated object IDs
- No changes to tolerance thresholds / epsilon checks
- No changes to angle direction or radius calculations
- No changes to return shapes consumed elsewhere

## Regression Checks (Run After This Phase)

- Draw points/segments/lines/rays/circles
- Triangle creation (all variants)
- Angle marks (normal + right)
- Transform preview/apply
- Undo/redo for create actions

## Exit Criteria

- Pure helpers are extracted and imported successfully.
- `src/app.js` behavior is unchanged in regression checks.
- No new circular imports.

## Suggested Commit Boundary

- One commit per helper group/module extraction



---

## Source: `refactor_plan_appjs_phases/phase-2-extract-session-state.md`

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



---

## Source: `refactor_plan_appjs_phases/phase-3-extract-dom-and-ui-display.md`

# Phase 3: Extract DOM References and UI Display Logic

## Goal

Isolate direct DOM coupling (element lookup and display updates) without changing event listener behavior yet.

## Target Outcome

- `domRefs` module caches elements/query selections
- UI display/update helpers moved out of `app.js`
- Event listeners still registered from `app.js` (for now)

## New Modules

- `/Users/sturk/Desktop/Geo Figures/src/app/dom/domRefs.js`
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/modeUi.js`
- `/Users/sturk/Desktop/Geo Figures/src/app/ui/styleUi.js`

## Functions to Move

### `modeUi.js`
- `modeLabel`
- `canvasHintText`
- `constructionSelectionStatusText`
- `updateModeUi`

### `styleUi.js`
- `syncStyleInputsFromDoc`
- Related small style UI sync helpers (if extracted cleanly)

### `domRefs.js`
- Current top-level `document.getElementById(...)`
- `querySelectorAll(...)` collections (`modeButtons`, triangle mode buttons, etc.)

## Implementation Steps

1. Create `createDomRefs(document)` that returns a structured `dom` object.
2. Replace top-level DOM lookups in `app.js` with `const dom = createDomRefs(document)`.
3. Move display-only UI functions to `modeUi.js` and `styleUi.js`.
4. Pass explicit dependencies to moved functions:
   - `store`
   - `session`
   - `dom`
   - helper callbacks as needed
5. Keep initialization order unchanged:
   - `wireUi()`
   - marquee init
   - mode UI sync
   - style UI sync
   - render

## Critical Invariants

- Preserve all existing null checks
- Preserve active button CSS class behavior
- Preserve status text and hint text strings
- Preserve triangle menu visibility toggles and hint hover behavior

## Anti-Goals

- Do not move `wireUi()` yet
- Do not change event registration closures in this phase

## Regression Checks (Mandatory)

- Toolbar active states by mode
- Triangle submenu interactions
- Status text updates during point collection
- Drawing hint text behavior and hover hide/show behavior
- Style input synchronization after load/applyDoc

## Working Notes / Follow-up

- Investigate intermittent Circle tool oddity reported during phase 3 smoke testing (currently hard to reproduce consistently).

## Exit Criteria

- DOM refs are centralized
- UI display helpers are extracted
- `app.js` still registers events successfully with unchanged behavior

## Suggested Commit Boundary

- `domRefs` extraction
- `modeUi` extraction
- `styleUi` extraction


---

## Source: `refactor_plan_appjs_phases/phase-4-extract-render-and-applydoc.md`

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



---

## Source: `refactor_plan_appjs_phases/phase-5-split-wireui-bindings.md`

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



---

## Source: `refactor_plan_appjs_phases/phase-6-extract-tool-workflows.md`

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
- `07c5e57` - Extract `addPointInput` triangle create branch to `src/app/workflows/pointInputTriangleCreate.js`
- `cedaaa9` - Move `LABEL` object-click branch into `src/app/workflows/objectClickModeBranches.js`
- `9f8ab5c` - Extract object-click near-point redirect branch (linear/circle -> nearby point recursion) to `src/app/workflows/objectClickNearPointRedirect.js`
- `896b134` - Extract `handleObjectMove` angle-radius branch to `src/app/workflows/objectMoveAngle.js`
- `9d669c7` - Extract `handleObjectMove` ray visible-resize (`rayExtension`) branch to `src/app/workflows/objectMoveRayVisibleResize.js`
- `212c598` - Extract `handleObjectMove` line visible-resize (`lineExtensionStart`/`lineExtensionEnd`) branch to `src/app/workflows/objectMoveLineVisibleResize.js`
- `dc0d6a9` - Extract `handleObjectMove` segment move branch to `src/app/workflows/objectMoveSegment.js`
- (working tree) - Extract `handleObjectMove` circle move branch to `src/app/workflows/objectMoveCircle.js`
- (working tree) - Extract `handleObjectMove` ray endpoint-move branch to `src/app/workflows/objectMoveRay.js`
- (working tree) - Extract `handleObjectMove` line endpoint-move branch to `src/app/workflows/objectMoveLine.js`
- (working tree) - Extract `handleObjectMove` point/label move tail to `src/app/workflows/objectMovePointLabel.js`

### Current Safe Boundary

- `handleBoardClick`, `handleObjectClick`, `handleObjectMove` still exist in `app.js` as top-level entrypoints.
- `handleObjectClick` dedupe logic remains in `app.js` (intentionally preserved).
- `handleObjectClick` near-point redirect now delegates to a workflow module while preserving recursive re-entry through `handleObjectClick(...)`.
- `handleObjectClick` construction-selection session branch now delegates to a workflow module (with original branch order and `deferUntilUp` behavior preserved).
- `handleObjectMove` drag/undo batching logic is untouched (intentionally deferred).
- `handleObjectMove` angle-radius branch now delegates to a workflow module; transient snapshot + grouped-angle radius semantics preserved.
- `handleObjectMove` ray visible-resize branch now delegates to a workflow module; transient snapshot + undo batching semantics preserved.
- `handleObjectMove` line visible-resize branch now delegates to a workflow module; transient snapshot + undo batching semantics preserved.
- `handleObjectMove` segment move branch now delegates to a workflow module; perpendicular-bisector guard and transient/undo batching semantics preserved.
- `handleObjectMove` circle move branch now delegates to a workflow module; transient snapshot + undo batching semantics preserved.
- `handleObjectMove` ray endpoint-move branch now delegates to a workflow module; angle-bisector guard and transient/undo batching semantics preserved.
- `handleObjectMove` line endpoint-move branch now delegates to a workflow module; line-only guard and transient/undo batching semantics preserved.
- `handleObjectMove` point/label move tail now delegates to a workflow module; axis-lock, point constraints, label-follow offset updates, JXG live point drag updates, and transient/final recompute timing preserved.
- `handleBoardClick` perpendicular-bisector placement and angle-mode guard now delegate to workflow modules (board-click branch order preserved).
- Board preview updates, marquee workflow, and point-collection branches now delegate to workflow modules.
- `addPointInput` linear/circle, triangle, and angle creation branches now delegate to workflow modules; pending-point sequencing, mutation wrapping, and reset timing remain in `app.js`.

### Next Recommended Safe Steps

1. Run a focused regression pass on triangle variants (three-point, right, isosceles, regular/equilateral variant path) including constrained apex behavior and right-angle annotation creation.
2. Add a UI-exposed equilateral/regular triangle option (if still intended) so the existing variant path is reachable, then run a focused smoke check for that flow (preview + create + undo/redo).
3. Continue deferring `handleObjectMove(...)` drag/undo batching extraction until the non-drag workflow families are complete.
4. Resume extracting remaining non-drag object/board click workflow branches only if they still materially improve readability without risking branch-order regressions.

### Defer Until Later (Higher Risk)

- `handleObjectMove(...)` drag workflows and transient drag snapshot commit/flush logic
- Any changes to object-click dedupe stamp / handled-click bookkeeping
- Broader reordering of top-level handler branch order
- Investigate circle-move edge case where an intersection point can temporarily disappear in some drag scenarios (undo restores it; low urgency, likely constraint/intersection recompute timing edge case)
- Investigate angle-bisector ray drag behavior that appears to "teleport" from initial to final position instead of visibly moving during drag (may be pre-existing; verify after move-handler refactor stabilizes)


---

## Source: `refactor_plan_appjs_phases/phase-7-optional-tool-strategy.md`

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

