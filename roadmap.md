# Roadmap: Geometry Figure Generator (JSXGraph-First, Construction-First)

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
- Document model: versioned internal `FigureDoc` JSON saved with `.geojson` extension.
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
- [x] Save/open `.geojson` document support.

### Phase 2: Core Construction + Annotation
- [x] Construct: point, segment, line, ray, triangle, circle.
- [x] Constraint tools: parallel/perpendicular through point.
- [x] Congruency side ticks (1/2/3 tick sets).
- [x] Angle annotation and right-angle marker.
- [x] Manual label + point auto-label.
- [x] Selection and multi-select (Shift/Ctrl/Cmd).
- [x] Delete selected and clear board.
- [x] Keyboard shortcuts (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y`, `Delete`, `Esc`).

### Phase 3: Export Pipeline
- [x] SVG export with size presets and optional white background.
- [x] PNG export via SVG-to-canvas with user scale (1x/2x/3x).
- [x] Timestamp filename convention (`figure-YYYYMMDD-HHMMSS`).
- [ ] Manual cross-app export validation checklist (Word/Docs/LMS).

### Phase 4: UX Polish
- [x] Toolbar grouped by Construct/Annotate/Style/Export/Edit.
- [x] Basic style controls (color, width, solid/dashed).
- [x] Exam mode toggle (black-line default rendering).
- [ ] Preset-figure quick actions (`Isosceles`, `Right Triangle`, `Coordinate Plane`).

### Phase 5: Deployment
- [ ] GitHub repository initialization (if not already set externally).
- [ ] GitHub Pages setup.
- [ ] Feedback/report link in UI.
- [ ] Version banner and changelog notes.

## Testing Plan
- [ ] Create triangle, apply two congruent sets, export SVG/PNG.
- [ ] Verify right-angle marker tracks geometry after point movement.
- [ ] Validate undo/redo across construct + annotate + style + delete.
- [ ] Verify save/open round-trip preserves marks, labels, and styles.
- [ ] Confirm PNG dimensions and scale options.
- [ ] Confirm multi-select and deselect behavior.

## Next Priority Work
1. Add figure preset buttons and generation logic.
2. Add lightweight in-app export validation checklist hints.
3. Complete deployment configuration and README usage guide.

## TODO (Label Follow Edge Cases)
- [ ] Add a `Midpoint` construction tool (select two points or a segment; create midpoint and preserve dependency).
- [ ] Make labels attached to `parallel` / `perpendicular` objects follow line orientation changes (not just the through-point anchor).
- [ ] Preserve/rotate attached label `follow.offsetX/offsetY` during triangle rotate/slide transforms so labels move as a rigid transform with the figure.
- [ ] Fix point-on-line click prioritization edge case: after creating a segment using endpoints that lie on an existing line, `Segment` tool can require an extra canvas click before starting the next segment (interaction dedupe / hit-target routing cleanup).
- [ ] Consider making side-length / angle-measure labels optionally live-track actual values, support double-click edit overrides, and restore tracking after geometry moves (or provide explicit toggle between auto/manual measure labels).
- [ ] Incrementally refactor `src/app.js` into feature/domain modules (labels, angles, export actions, UI wiring, triangle transform) without changing behavior.
- [ ] Consider vendoring JSXGraph locally (instead of CDN-only) to avoid school-network CDN blocking issues on GitHub Pages.

## Teacher Priority Features (Next)
1. `Midpoint` tool (two points or segment -> dependent midpoint).
2. `Angle Bisector` tool (from 3 points / angle mark).
3. `Perpendicular Bisector` tool (from segment).
4. `Text Box` annotation (free text not attached to geometry).
5. `Point Rename` / point naming controls (manual point labels and renaming).
6. `Hide Point Markers` export/presentation toggle (keep geometry, suppress dots).
7. `Coordinate Plane` / axes-grid preset for analytic geometry and trig diagrams.
8. `Center + Radius` circle tool (numeric radius entry).
9. `Polygon / Polyline` tool for quadrilaterals and composite worksheet figures.
10. Angle/measure display options (degree symbol toggle, radians support later).
