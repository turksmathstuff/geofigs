# Roadmap and Project Status: Geometry Figure Generator

*Updated: September 2026. Current application version: v1.2.*

## Product Summary
Build a browser app for teachers to create clean static geometry diagrams quickly, then export SVG/PNG for quizzes and notes.

## Success Criteria
- Teacher can create and export a marked triangle in under 60 seconds.
- Exported SVG/PNG opens correctly in Word, Google Docs, and LMS upload flows.
- Visual consistency remains acceptable at PNG 1x/2x/3x scales.

## Guardrails
### Target users
- High-school geometry teachers.

### Non-goals for v1
- Real-time collaboration.
- Mobile-first editing.
- Formal proof tooling.

## Architecture Decisions
- Geometry engine: JSXGraph (source-of-truth rendering and interaction layer).
- Document model: versioned internal `FigureDoc` JSON saved with the `.geofig` extension; legacy `.geojson` files remain readable.
- Undo/redo: snapshot-based command stack (`execute/undo/redo`) for reliability across mixed actions.
- Export: board SVG extraction plus deterministic width/height options, then canvas-based PNG conversion.

## Public Interfaces
- `ToolMode` enum (`select`, `point`, `segment`, `line`, `ray`, `triangle`, `circle`, `angle`, `congruency`, `label`, `delete`).
- `FigureDoc` shape:
  - `version`, `canvas`, `objects`, `annotations`, `styles`, `metadata`.
- Export API:
  - `exportSVG(svgString, options) -> string`
  - `exportPNG(svgString, options) -> Blob`
- Command API:
  - `record(command)`
  - `undo()`
  - `redo()`

## Implementation Status

### Phase 1: Technical Foundation
- [x] Modular project structure (`index.html`, `styles.css`, `src/*`).
- [x] `BoardController` wrapper for board init and object creation.
- [x] Versioned `FigureDoc` model and validation.
- [x] Tool state machine and mode switching.
- [x] Undo/redo stack.
- [x] Save/open `.geofig` document support, with backward-compatible `.geojson` import.
- [x] Local JSXGraph assets so the editor does not depend on a CDN at runtime.

### Phase 2: Core Construction + Annotation
- [x] Construct: point, segment, line, ray, triangle, circle.
- [x] Triangle variants: three-point, right, isosceles, and equilateral.
- [x] Regular polygon variants with optional center and congruency marks.
- [x] Arc, tangent, inscribed-circle, and circumscribed-circle constructions.
- [x] Midpoint, angle-bisector, and perpendicular-bisector constructions.
- [x] Constraint tools: parallel/perpendicular through point.
- [x] Congruency side ticks (1/2/3 tick sets).
- [x] Angle annotation and right-angle marker.
- [x] Manual label + point auto-label.
- [x] Closed-region shading with configurable fill and opacity.
- [x] Selection and multi-select (Shift/Ctrl/Cmd).
- [x] Delete selected and clear board.
- [x] Keyboard shortcuts (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y`, `Delete`, `Esc`).

### Phase 3: Export Pipeline
- [x] SVG export with size presets and optional white background.
- [x] PNG export via SVG-to-canvas with user scale (1x/2x/3x).
- [x] Copy PNG directly to the clipboard.
- [x] Export preview with draggable label placement.
- [x] Background-image upload and persistence.
- [x] Point-marker and line/ray-arrow visibility controls.
- [x] Timestamp filename convention (`figure-YYYYMMDD-HHMMSS`).
- [ ] Manual cross-app export validation checklist (Word/Docs/LMS).

### Phase 4: UX Polish
- [x] Toolbar grouped by Construct/Annotate/Style/Export/Edit.
- [x] Basic style controls (color, width, solid/dashed).
- [x] Exam mode toggle (black-line default rendering).
- [x] Preset triangle actions (`Right`, `Isosceles`, `Equilateral`).
- [ ] Coordinate-plane preset.

### Phase 5: Deployment
- [x] GitHub repository initialization.
- [x] GitHub Pages setup.
- [ ] Feedback/report link in UI.
- [x] Version banner (`v1.2`).
- [ ] Changelog/release notes.

## Testing Status

- [x] Node unit tests cover geometry, constraints, IDs, document/background-image serialization, and shade-region behavior.
- [x] Playwright browser tests cover app startup, tool switching, core drawing, undo/redo, delete, marquee selection, SVG download, `.geofig` save/reopen, and Copy PNG.
- [x] GitHub Actions runs syntax checks, unit tests, and Chromium browser tests.
- [ ] Automate deeper construction and annotation workflows from `QA_CHECKLIST.md`.
- [ ] Complete manual cross-app SVG/PNG validation in Word, Google Docs, and representative LMS upload flows.

## Next Priority Work
1. Add general `Polygon / Polyline` drawing for quadrilaterals and composite figures; regular polygons are already supported.
2. Add free-standing text-box annotations.
3. Add a coordinate-plane / axes-grid preset.
4. Add point rename and naming controls.
5. Add a center-plus-numeric-radius circle workflow.
6. Complete cross-app export validation and add lightweight in-app guidance.
7. Add a feedback/report link and release notes.

## Developer TODOs / Technical Debt
- [ ] Make labels attached to `parallel` / `perpendicular` objects follow line orientation changes (not just the through-point anchor).
- [ ] Preserve/rotate attached label `follow.offsetX/offsetY` during triangle rotate/slide transforms so labels move as a rigid transform with the figure.
- [ ] Fix point-on-line click prioritization edge case: after creating a segment using endpoints that lie on an existing line, `Segment` tool can require an extra canvas click before starting the next segment (interaction dedupe / hit-target routing cleanup).
- [ ] Consider making side-length / angle-measure labels optionally live-track actual values, support double-click edit overrides, and restore tracking after geometry moves (or provide explicit toggle between auto/manual measure labels).
- [ ] Continue targeted feature-domain extraction from `src/app.js` as needed (labels, angles, and bulk object actions); export actions are already extracted.
- [ ] Split mark builders and preview rendering out of the still-large `src/board/boardController.js`.
- [ ] Consider an object-id index for hot-path lookups on unusually large figures.
- [ ] Add linting/formatting automation.

## Known UX Quirks / Deferred Investigations
- [ ] Constrained point drag preview can temporarily leave its source segment/ray during drag, then snap back onto the segment/ray on release (final state is valid; likely transient preview vs constraint recompute timing mismatch).
- [ ] Circle-move edge case: an intersection point can temporarily disappear in some drag scenarios, but `Undo` restores it (likely constraint/intersection recompute timing edge case).
- [ ] Angle-bisector ray drag can appear to "teleport" from initial to final position instead of visibly moving during drag (verify/polish after move-handler refactor stabilization).

## Teacher Priority Features (Next)
1. General `Polygon / Polyline` tool for quadrilaterals and composite worksheet figures.
2. `Text Box` annotation (free text not attached to geometry).
3. `Point Rename` / point naming controls.
4. `Coordinate Plane` / axes-grid preset for analytic geometry and trig diagrams.
5. `Center + Radius` circle tool with numeric radius entry.
6. Angle/measure display options (degree symbol toggle, radians support later).

## Recently Completed (for roadmap context)
- `Midpoint` construction tool (including midpoint tick variants)
- `Angle Bisector` tool (including tick/decorator variants)
- `Perpendicular Bisector` tool (placement segment + variants)
- Regular-polygon workflows with optional centers and congruency marks
- Point-marker and line/ray-arrow visibility toggles
- Shade-region fill tool
- Background-image save/reopen support
- Copy PNG clipboard action (the unreliable Copy SVG action was removed)
- Playwright browser coverage and full CI test execution
- Constraint registry and major `app.js` workflow extraction
