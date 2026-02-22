# Geometry Figure Generator: Interaction Behavior Reference

This document describes how the current app behaves, organized by toolbar section and interaction type.

It is intended as a practical reference for using and testing the UI.

## Global canvas interaction rules

### Selection basics (`Select` mode)
- Click an object to select it.
- `Shift`/`Cmd`/`Ctrl` + click toggles multi-selection.
- Click blank canvas to clear selection (unless using a modifier key).
- Click-and-drag on blank canvas creates a marquee rectangle and selects items whose representative point falls inside the rectangle.
- `Shift`/`Cmd`/`Ctrl` + marquee adds to existing selection.

### Dragging behavior (general)
- In `Select` mode, dragging should show live motion for draggable objects.
- Click-vs-drag is deferred: a drag does not immediately re-render selection and interrupt motion.
- Constrained intersection points update live while related source geometry is dragged/resized.
- Draggable items include:
  - Points
  - Labels
  - Rays (dragging the visible ray moves both defining points)
  - Lines (dragging the visible line moves both defining points)
  - Other JSXGraph-draggable objects (e.g., constructed lines) depending on object type support

### Keyboard shortcuts
- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z` or `Ctrl + Y`: Redo
- `Delete` / `Backspace`: Delete selected (unless typing in an input)
- `H`: Hide selected (when not typing in an input)
- `Escape`:
  - Clears selection
  - Clears pending construction clicks
  - Returns to `Select` mode

### Hidden objects
- Hidden objects are not rendered and do not appear in export.
- Hidden points are still kept as invisible support points so dependent objects can continue rendering.

## Construct section

### Select
- Primary interaction mode for selecting, dragging, and resizing visible line/ray extents.
- For lines/rays with arrows:
  - Drag the body of the visible line/ray to move it.
  - Drag arrow tip hit targets to resize visible extent.

### Point
- Click on canvas to create a point.
- If clicking near an intersection, the point tool may snap to and create a constrained intersection point.
- Supported snap intersections:
  - line/segment/ray with line/segment/ray
  - circle with line/segment/ray
- For circle intersections with two valid points, the app uses the valid intersection closest to your click.
- Constrained intersection points:
  - stay attached to their source objects
  - move when the source geometry moves
  - are non-draggable
  - are deleted automatically if one of their source objects is deleted
- Constrained intersection points are shown in bright red on screen by default (black in Exam Mode).
- Clicking an existing object while in `Point` mode does not select it (passes through).

### Segment
- Click first point, then click second point to create a segment.
- You can click existing points or click on canvas to create inline points during construction.
- While choosing the next point, a dashed preview segment is shown.
- Hold `Shift` while placing the next point to constrain horizontal/vertical relative to the previous selected point.
- After creation:
  - Drag either endpoint point to move/tilt/resize the segment.
  - Dragging the segment body depends on JSXGraph behavior (not custom-translated like line/ray).

### Line
- Click first point, then click second point to define the line direction.
- Uses two defining points internally.
- Visible rendering is a finite segment with arrowheads on both ends (geometry behavior remains line-like).
- While choosing the second point, a dashed preview is shown (with arrows on both ends).
- Hold `Shift` while placing the second point to constrain horizontal/vertical.
- After creation:
  - Drag either defining point to tilt/reposition the line.
  - Drag the visible line body to translate the whole line (moves both defining points).
  - Drag either arrow tip to resize how much of the line is visible (without changing geometric line direction).

### Ray
- Click first point (ray start), then click second point (direction point).
- Uses two defining points internally.
- Visible rendering is a finite segment with an arrowhead at the end.
- While choosing the second point, a dashed preview ray is shown.
- Hold `Shift` while placing the second point to constrain horizontal/vertical.
- After creation:
  - Drag either defining point to change position/direction.
  - Drag the visible ray body to translate the whole ray (moves both defining points).
  - Drag the arrow tip to resize how much of the ray is visible past the second point.

### Circle
- Click center point, then click a point on the circle.
- Uses two defining points (center + through-point).
- While choosing the second point, a dashed preview circle is shown.
- After creation:
  - Drag center/through points to move or resize the circle.

### Triangle menu (`Triangle ▾`)

General:
- Opens a submenu with triangle variants.
- Selecting a variant switches tool mode to `Triangle`.

#### 3-Point Triangle
- Click three points (existing or new inline points).
- Dashed preview triangle appears after the first two points.
- Creates 3 segment edges (not a single polygon object).
- Hold `Shift` while placing the next point to constrain relative to the last pending point.

#### Right Triangle
- Click two points to define a leg/base; the third point is auto-generated to form a right triangle.
- Dashed preview shows the implied right triangle while moving before the second click.
- Creates:
  - The triangle edges (segments)
  - A right-angle annotation at the right-angle vertex

#### Isosceles Triangle
- Click two base endpoints, then click a third point to indicate apex side/height.
- Dashed preview triangle updates while moving the cursor for the apex.
- The third clicked point may be repositioned to the computed isosceles apex location.
- Creates 3 segment edges.

### Parallel
- This is a button action (not a click-by-click construction mode).
- Requires exactly 2 selected objects:
  - One `line` or `segment`
  - One `point`
- Creates a line parallel to the selected line/segment through the selected point.
- Defaults to solid style.
- If selection is invalid, shows an alert and returns to `Select` mode.

### Perpendicular
- This is a button action (not a click-by-click construction mode).
- Requires exactly 2 selected objects:
  - One `line` or `segment`
  - One `point`
- Creates a line perpendicular to the selected line/segment through the selected point.
- Defaults to solid style.
- If selection is invalid, shows an alert and returns to `Select` mode.

### Congruent/Similar Triangles (details group)

#### Congruent △
- Requires one selected triangle:
  - Either 3 selected points forming a non-collinear triangle
  - Or its 3 selected side segments
- Creates an offset congruent copy (same size).
- Attempts to place the copy without overlap with the original.

#### Similar △
- Same selection requirement as congruent copy.
- Creates an offset similar copy (scaled larger; current implementation uses ~1.45x).
- Attempts to place the copy without overlap.

#### Rotate/Slide Triangle
- Requires one selected triangle (same selection rule as above).
- Opens the transform panel and starts a live preview session.
- Transform panel controls:
  - Rotation compass drag (continuous angle)
  - `Move X` slider
  - `Move Y` slider
  - `Reflect Horizontal`
  - `Reflect Vertical`
  - `Apply Transform` (commits)
  - `Cancel` / `Close` (reverts to pre-transform state)
- Labels attached to selected triangle points/segments (via `targetId`) move with the transform.

## Annotate section

### Segment Ticks (1/2/3)
- Select one or more segments first.
- Adds tick-mark annotations to each selected segment.
- If no segment is selected, shows an alert and returns to `Select` mode.

### Angle Arcs (1/2/3)
- Two ways to use:
  - With 3 selected points: immediately adds angle annotation
  - Without valid selection: switches to angle point-picking mode (`Angle`)
- In angle point-picking mode:
  - Click 3 points counterclockwise
  - Number of arcs is determined by the button clicked (1/2/3)
- Right-angle marker behavior is separate (see below).

### Parallel Marks (1/2/3)
- Select one or more `segment` or `line` objects first.
- Adds parallel chevron marks to each selected target.
- If no valid target is selected, shows an alert and returns to `Select` mode.

### Side Length
- Requires exactly one selected segment.
- Prompts for text (default is numeric segment length).
- Creates a draggable label near the segment midpoint.
- If selection is invalid, shows an alert and returns to `Select` mode.

### Angle Measure
- Requires either:
  - 3 selected points (counterclockwise), or
  - 1 selected angle annotation
- Prompts for text (default is computed angle measure, rounded, with `°`)
- If entered text omits `°`, the app appends it.
- Creates a draggable label near the angle vertex.
- If selection is invalid, shows an alert and returns to `Select` mode.

### Right Angle
- Two ways to use:
  - With 3 selected points: immediately adds a right-angle annotation
  - Without valid selection: switches to angle point-picking mode (`Angle`) and expects 3 points

### Add Label
- Prompts for label text.
- If a point is selected, places the label near that point.
- Otherwise places the label at `(0, 0)`.
- Labels are draggable.

### Auto Label
- Toggles Auto Label mode (`Label` mode).
- In Auto Label mode:
  - Click an object to add/remove an automatic label
  - Clicking an already auto-labeled object removes that auto label
  - Point auto labels are generated from uppercase letters
  - Segment auto labels may use triangle-convention lowercase labels when detectable
- Clicking labeled objects can remove their auto labels (for auto-created labels)

## Style section

### Color / Width / Line (Solid/Dashed)
- If nothing is selected:
  - Updates the default style for newly created objects/annotations
- If objects/annotations are selected:
  - Applies style to selected objects
  - Applies color/width to selected annotations
  - Applies dash style to selected objects (annotation dash styling is not generally used)

### Width reset (`Default`)
- Sets the width slider to `2` and applies the style immediately (to selection or defaults).

### Exam Mode
- Toggles default stroke color behavior to use black for new/default-rendered items.
- Applied as a committed mutation (undoable).

## Export section

### PNG Scale
- Affects PNG export only (`1x`, `2x`, `3x`).

### Background
- Affects SVG and PNG export background (`Transparent` or `White`).

### Tight SVG
- Affects SVG export bounding behavior (`Download SVG`).
- PNG export always uses tight SVG internally before rasterizing.

### Download SVG
- Exports current rendered board as SVG.
- Hidden items are excluded because they are not rendered.
- Constrained intersection points export in black by default (temporary export override), even if shown in red on screen.

### Download PNG
- Exports current rendered board to PNG using the selected scale and background.
- Hidden items are excluded because they are not rendered.
- Constrained intersection points export in black by default (same behavior as SVG export).

### Save `.geojson`
- Saves editable document state (objects, annotations, styles, metadata) as JSON.

### Open `.geojson`
- Loads a saved document.
- Replaces current document state.
- Clears undo stack after loading.

## Edit section

### Undo / Redo
- `Undo` and `Redo` buttons operate on the command stack.
- Most creation/move/style/hide/show actions are undoable.

### Hide Selected
- Marks selected objects/annotations as hidden.
- Clears selection after hiding.
- Hidden items do not render/export.

### Show All
- Unhides all hidden objects and annotations.
- Clears selection.

### Delete Selected
- Deletes selected objects/annotations.
- Also removes dependent objects/annotations (e.g., items that reference deleted points/targets).

### Clear Board
- Replaces the current document with a new empty document.
- Preserves current global style settings.

## Mode-specific point picking rules (construction tools)

### Using existing points vs creating inline points
- For tools that require points (`Segment`, `Line`, `Ray`, `Circle`, `Triangle`, `Angle`):
  - Clicking an existing point uses that point
  - Clicking empty canvas creates a new point and uses it immediately

### Pending point previews
- `Segment`, `Line`, `Ray`: dashed linear preview after first point
- `Circle`: dashed preview circle after center point
- `Triangle` variants: dashed triangle preview as soon as enough inputs exist to preview
- `Angle`: no geometric preview line; uses point-selection workflow and status hint

### Shift-constrained placement
- When placing points for `Segment`, `Line`, `Ray`, and `Triangle`, hold `Shift` to constrain the next point horizontally or vertically relative to the previous pending point.

## Notes / current implementation details

- `Line` and `Ray` are visually finite for practicality, but geometry logic still treats:
  - `Line` as infinite for snapping/intersections
  - `Ray` as a ray-like subset (using current visible endpoint logic in intersection checks)
- Circle intersection snapping currently supports circle + line/segment/ray, but not circle + circle.
- Arrow-tip resize uses invisible hit targets near the visible arrowheads.
- Some internal modes (`Congruency`, `Delete`) exist in code but are not exposed as direct toolbar mode buttons in the current UI.
