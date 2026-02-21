# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]
### Added
- Side and angle measure annotation actions in Annotate:
  - `Side Length` creates numeric side labels from selected segments.
  - `Angle Measure` creates numeric angle labels from selected points/angle marks and defaults to degree notation.
- Intersection snap support for `Point` tool when clicking near line/segment/ray intersections.
- Dashed live preview for `Segment`, `Line`, and `Ray` during point placement.
- Triangle transform actions in Construct:
  - `Congruent △` duplicates a selected triangle, rotates it slightly, and moves it.
  - `Similar △` duplicates a selected triangle as a larger copy, rotates it slightly, and moves it.
- Drag-to-select marquee in `Select` mode (with Shift-additive multi-select).
- Post-creation triangle transform actions: `Move △` and `Rotate △` for selected triangles.

### Changed
- Auto Label now targets clicked objects only (toggle mode), instead of labeling all points at once.
- Auto-labeled segments now use lowercase letters by default.
- Manual and auto-generated labels can be dragged after placement.
- Congruent/Similar triangle copies now spawn closer to originals with minimal vertical offset.
- Congruent/Similar triangle copies now auto-shift to avoid overlapping the source triangle.
- Parallel-line annotation marks now render as chevrons (1/2/3) instead of hatch ticks.
- Parallel chevron orientation adjusted so the chevron vertex sits on the line and arms run along line direction.
- Parallel chevrons widened for better visibility.
- Style panel now includes a `Default` reset action for line width.

### Fixed
- Label and point dragging now persists by updating stored coordinates on drag end.
- Browser hard refresh shortcut (`Cmd/Ctrl+Shift+R`) works again after removing `Cmd/Ctrl+R` override.
- Annotation/construction actions that require preselection now auto-switch to `Select` after warning prompts.
- Point placement now clicks through linear objects in `Point` mode, enabling intersection snapping when clicking on crossing lines.
- Label dragging in `Select` mode is preserved (single-click drag on labels no longer gets interrupted by selection rerender).

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
