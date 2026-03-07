# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]
### Added
- Export preview modal: "Preview Export" button renders the figure as SVG in a full-screen overlay before downloading, with Download SVG and Download PNG actions inside.
- Label Size export control (1×–2.5×, default 1.5×): scales label font size in exported SVG/PNG so labels remain readable when images are resized in documents.
- Point Size export control (0.5×–1.5×, default 1×): scales point radius at export time without affecting the live board.
- Draggable labels in export preview: labels in the preview can be dragged to reposition them before downloading; Download SVG and Download PNG in the preview use the adjusted positions.

### Changed
- Export label placement is now center-anchored: scaled labels stay visually centered on their original position rather than drifting right/down.
- Export settings consolidated into a shared `readExportSettings()` helper.

### Fixed
- _None yet._

## [2026-03-06] - v1.2.0
### Added
- Construct tools:
  - `Midpoint` plus midpoint tick variants (`1/2/3`).
  - `Angle Bisector` plus tick-decorated variants (`1/2/3`).
  - `Perp Bisector` (perpendicular bisector segment) with optional `Rt ∠` and `MP` midpoint-mark variants.
- Side and angle measure annotation actions in Annotate:
  - `Side Length` creates numeric side labels from selected segments.
  - `Angle Measure` creates numeric angle labels from selected points/angle marks and defaults to degree notation.
- Intersection snap support for `Point` tool when clicking near line/segment/ray intersections.
- Dashed live preview for `Segment`, `Line`, and `Ray` during point placement.
- Triangle transform actions in Construct:
  - `Congruent △` duplicates a selected triangle, rotates it slightly, and moves it.
  - `Similar △` duplicates a selected triangle as a larger copy, rotates it slightly, and moves it.
- `Equilateral Triangle` construction mode.
- Regular polygon construction variants with locked derived points.
- Drag-to-select marquee in `Select` mode (with Shift-additive multi-select).
- Interactive selected-triangle transform controls:
  - `Move △` now uses draggable X/Y sliders with live preview.
  - `Rotate △` now uses a compass-style drag arm with live preview.
- Post-creation triangle transform actions: `Move △` and `Rotate △` for selected triangles.
- Hide/show workflow for export cleanup:
  - `Hide Selected`
  - `Show All`
- Export visibility toggles for point markers and arrowheads.
- Interaction behavior reference guide in `INTERACTION_BEHAVIOR_REFERENCE.md`.
- Constrained intersection points (created with the `Point` tool near intersections) that stay attached to source geometry.
- Circle + line/segment/ray intersection snapping for constrained intersection points.
- `H` keyboard shortcut to hide the current selection.

### Changed
- Angle bisector variants now use traditional congruent-angle decorators (arc + ticks) and support paired radius syncing when decorators are dragged.
- Angle decorators (including paired bisector decorators) can be dragged to change annotation radius.
- Perpendicular bisector tool uses click-to-place previewed segment construction and creates a draggable constrained endpoint point for resizing.
- Congruent/Similar copy defaults now use zero rotation and side placement (left or right chosen by available board space), with minimal vertical offset.
- Rotate/Slide panel now includes `Reflect Horizontal` and `Reflect Vertical` controls for selected triangles.
- `Rotate/Slide Triangle` button now spans full width in the Congruent/Similar Triangles submenu.
- Triangle transform naming updated to `Rotate/Slide Triangle` in both menu button and transform popup title.
- Construct pane reordered (Parallel/Ray grouping and requested tool order) and triangle transform labels renamed to `Congruent/Similar Triangles` with panel title `Slide/Rotate Triangle`.
- Triangle transform UI consolidated: `Congruent △`, `Similar △`, and unified `Transform △` are grouped in one collapsible menu; transform panel now combines rotation (top) and move sliders (bottom).
- Style and triangle menus are collapsible in the toolbar.
- Default label font size increased (new and migrated docs now use larger label text).
- Label add/edit interaction flow was refined, including improved default label placement.
- Label toolbar action naming was clarified (`Add Label`).
- In-tool construction selection flow was improved for triangle copy/transform and decorator workflows.
- Triangle-aware auto-labeling: segment labels use the lowercase of the opposite labeled vertex when available (A opposite side a).
- Point-name labels are now draggable (implemented as linked label objects, with migration from legacy fixed point names).
- Auto Label now targets clicked objects only (toggle mode), instead of labeling all points at once.
- Auto-labeled segments now use lowercase letters by default.
- Manual and auto-generated labels can be dragged after placement.
- Congruent/Similar triangle copies now spawn closer to originals with minimal vertical offset.
- Congruent/Similar triangle copies now auto-shift to avoid overlapping the source triangle.
- Parallel-line annotation marks now render as chevrons (1/2/3) instead of hatch ticks.
- Parallel chevron orientation adjusted so the chevron vertex sits on the line and arms run along line direction.
- Parallel chevrons widened for better visibility.
- Style panel now includes a `Default` reset action for line width.
- Rays now render as finite visible rays with arrowheads and draggable visible-end handles.
- Lines now render with arrowheads on both ends and draggable visible-end handles.
- Parallel/perpendicular lines now default to solid, render with arrowheads, support draggable visible-end handles, and initially appear inset from canvas edges.
- Parallel/perpendicular lines can be reused as sources for additional parallel/perpendicular constructions.
- Dragging interactions show live motion more consistently (including line/ray body drags and constrained intersection updates).
- Shift axis-locking now applies during supported drags (not just object creation), with point drags locking relative to connected endpoints when available.
- Canvas hint banner now hides when hovered and reappears when the cursor leaves.

### Fixed
- Angle mark rendering now forces minor arcs (with straight-angle ambiguity guard) to avoid accidental full-circle/major-arc displays.
- Constrained bisector helper points now recompute correctly on point-drag commit (prevents bisector snap-back after release).
- Parallel mark annotations now apply to constructed `parallel` / `perpendicular` line objects.
- Rotate/Slide transform now carries linked labels with their triangle points/sides (during preview and apply).
- SVG export now includes draggable labels by rendering label text as internal SVG text elements.
- Refined label dragging: background-click clearing is now ignored when interacting with label text objects.
- Label and point dragging now persists by updating stored coordinates on drag end.
- Browser hard refresh shortcut (`Cmd/Ctrl+Shift+R`) works again after removing `Cmd/Ctrl+R` override.
- Annotation/construction actions that require preselection now auto-switch to `Select` after warning prompts.
- Point placement now clicks through linear objects in `Point` mode, enabling intersection snapping when clicking on crossing lines.
- Label dragging in `Select` mode is preserved (single-click drag on labels no longer gets interrupted by selection rerender).
- Parallel/perpendicular construction selection is more forgiving (extra selected items no longer block creation as long as a point and line-like source are selected).
- Constructed parallel/perpendicular lines now participate in intersection snapping and constrained intersection-point updates.
- Regular polygon export now preserves control-point colors correctly.

## [2026-02-21] - Improve geometry UX, labeling flow, and export reliability
### Added
- On-canvas guidance hints for tool usage (angle direction, multi-select, shift constraints, auto-label flow).
- Auto Label interactive mode: click objects to add/remove labels.
- Parallel mark annotations (1/2/3) in Annotate.
- Collapsible Annotate groups for Segment Ticks and Angle Arcs.
- Triangle submenu with 3-point, right, and isosceles workflows.
- Triangle placement preview (ghost/shadow triangle while placing points).

### Changed
- Tight SVG export flow made primary; export UI simplified.
- Angle annotation supports 1/2/3 concentric arcs.
- Isosceles construction updated to a base-then-apex workflow.
- Label sizing aligned between point labels and text labels.
- Keyboard undo/redo handling hardened.

### Fixed
- Click-to-coordinate mapping mismatch in drawing area.
- Circle distortion caused by non-uniform axis scaling.
- Selection click handling conflicts with board background clicks.
- Reflex/full-circle angle arc behavior for non-right angles.
- Perpendicular/parallel construction reliability from segment references.
- PNG export conversion failure (SVG to PNG).
- Undo history noise from non-meaningful metadata-only changes.

## [2026-02-21] - Initial geometry figure generator app
### Added
- Initial web app scaffold with JSXGraph board and modular JS architecture.
- Tool modes for select, construct, annotate, delete.
- Core constructions: point, segment, line, ray, triangle, circle.
- Constraint constructions: parallel and perpendicular through point.
- Annotations: congruent side ticks, angle and right-angle marks, labels.
- Save/open `.geojson` document format.
- SVG/PNG export with background and scale options.
- Undo/redo command stack and keyboard shortcuts.
- Toolbar-driven UI with style controls and exam mode toggle.
- Project docs and roadmap updates.

### Notes
- Commit `5000915`: Initial baseline implementation.
- Commit `f0a9296`: Major UX/interaction/export improvements.
