# Geometry Figure Generator QA Checklist (Step-by-Step)

Use this checklist on the current `main` branch build. Go in order.

## How to use this checklist
- Mark each item as `PASS`, `FAIL`, or `N/A`.
- If something fails, note the exact step number and what happened.
- Prefer a fresh reload before starting.

## Test Setup
1. Start the app (`python3 -m http.server 8000`) and open `http://localhost:8000`.
2. Confirm the app loads without a blank canvas or JS errors.
3. Confirm the board is visible and tools/buttons render.
4. Optional: Open browser console to catch errors during testing.

---

## 1. Smoke Test (UI + Basic Interaction)
1. Confirm clicking `Select`, `Point`, `Segment`, `Line`, `Ray`, `Triangle`, `Circle`, `Delete`, and `Auto Label` updates the active state correctly.
2. Confirm the status text updates as tool modes change.
3. Confirm the drawing hint text updates and hides/shows as expected when hovering away/back.
4. Press `Escape` and confirm mode resets to `Select`.

---

## 2. Point Tool (Free Points + Selection)
1. Switch to `Point` mode.
2. Click three different locations on blank canvas.
3. Confirm three points are created.
4. Switch to `Select` mode.
5. Click a point to select it (halo/selection styling appears).
6. Shift-click another point to multi-select.
7. Click blank canvas to clear selection.
8. Drag a point in `Select` mode and confirm it moves.
9. Shift-drag a point and confirm axis-lock behavior works (horizontal/vertical when applicable).

---

## 3. Segment / Line / Ray Construction
1. Switch to `Segment` mode and create a segment using two new clicks.
2. Create another segment using two existing points.
3. Confirm endpoint clicks can be reused without creating unwanted extra points.
4. While placing a segment point, hold `Shift` and confirm horizontal/vertical constraint.

5. Switch to `Line` mode and create a line from two points.
6. Confirm line displays with arrowheads on both ends.
7. Drag the line body in `Select` mode and confirm it translates.
8. Drag each visible arrow tip/handle and confirm visible extent changes.

9. Switch to `Ray` mode and create a ray from two points.
10. Confirm ray displays with one arrowhead.
11. Drag the ray body and confirm it translates.
12. Drag the ray arrow tip/handle and confirm visible extent changes.

---

## 4. Circle Tool
1. Switch to `Circle` mode.
2. Click a center point, then move cursor and confirm dashed preview circle appears.
3. Click a through-point to create the circle.
4. In `Select` mode, drag the center point and confirm circle moves.
5. Drag the through-point and confirm radius changes.

---

## 5. Triangle Tool - 3 Variants
### 5A. 3-Point Triangle
1. Open `Triangle ▾` and choose `3-Point Triangle`.
2. Click two points and confirm dashed triangle preview appears while moving to third point.
3. Click third point and confirm 3 segment edges are created.
4. Reuse two existing points from that triangle plus a third point to create another triangle.

### 5B. Right Triangle
1. Choose `Right Triangle`.
2. Click first point and move cursor; confirm preview updates.
3. Click second point and confirm a triangle is created automatically.
4. Confirm a right-angle annotation is created.

### 5C. Isosceles Triangle (Critical Regression Check)
1. Choose `Isosceles Triangle`.
2. Create an isosceles triangle with base `A-B` and apex click `C`.
3. Without changing tools, click the same base points `A` then `B` again.
4. Confirm both points register cleanly (no twitch / no premature triangle creation).
5. Click a new apex location and confirm a second isosceles triangle is created from the same base.
6. Repeat step 3-5 at least 3 times to confirm stability.
7. Try clicking near the base segment at an endpoint and confirm it does not accidentally complete a triangle early.

---

## 6. Selection, Marquee, and Delete
1. Switch to `Select` mode.
2. Drag on blank canvas to marquee-select multiple objects.
3. Confirm selected objects highlight.
4. Press `Delete` or `Backspace` and confirm selected objects are removed.
5. Create a few objects again, select them, and test `Delete` tool button mode if present in workflow.
6. Confirm deleting parent geometry also removes dependent annotations/labels when applicable.

---

## 7. Undo / Redo
1. Create several objects (point, segment, triangle).
2. Press `Cmd/Ctrl+Z` multiple times and confirm actions undo in order.
3. Press `Cmd/Ctrl+Shift+Z` (or `Ctrl+Y`) and confirm redo works.
4. Confirm undo/redo works after annotation actions (ticks/angles/labels).
5. Confirm undo/redo works after delete actions.

---

## 8. Parallel / Perpendicular Construction (Selection-Based)
1. Create one segment or line and one separate point.
2. In `Select`, select exactly one line-like object and one point.
3. Click `Parallel` and confirm a parallel line is created through the point.
4. Confirm it renders with arrowheads and visible finite extent.
5. Drag its arrow-tip handles and confirm visible extent changes.
6. Repeat with `Perpendicular` and confirm perpendicular output.
7. Use a previously created `parallel` or `perpendicular` as the source line and confirm it works.
8. Test invalid selection (missing point or missing line-like object) and confirm an alert appears and app returns to `Select` mode.

---

## 9. Midpoint / Angle Bisector / Perpendicular Bisector Tools
### 9A. Midpoint
1. Create a segment and select it.
2. Click `Midpoint` and confirm a midpoint point is created on the segment.
3. Repeat using exactly two selected points (no segment) and confirm midpoint creation.
4. Drag either source endpoint and confirm the midpoint tracks.
5. Try invalid selection (no segment and not exactly two points) and confirm alert behavior.

### 9B. Midpoint Tick Variants
1. Select a segment (or two points) and create `Midpoint 1 Tick`, `2 Ticks`, and `3 Ticks`.
2. Confirm midpoint point appears and tick marks render on both half-segments.
3. Drag source endpoints and confirm the midpoint and both tick groups stay aligned.

### 9C. Angle Bisector
1. Select 3 points representing an angle (vertex is the second selected point).
2. Click `Bisector` and confirm a bisector ray is created from the vertex.
3. Drag either side point of the source angle and confirm the bisector ray updates.
4. Select an existing angle annotation and click `Bisector`; confirm creation from the annotation works.
5. Try a degenerate/straight angle and confirm the tool warns instead of creating invalid geometry.

### 9D. Angle Bisector Tick Variants + Angle Decorator Drag
1. Create `Bisector + 1 Tick`, then `+ 2 Ticks` (and `+ 3 Ticks` if desired).
2. Confirm each bisector variant adds two congruent angle decorators (arc + ticks), one on each side of the bisector.
3. Drag one of the angle decorators outward/inward and confirm both decorators in the pair move together (same radius).
4. Confirm dragged angle decorator radius persists after moving source points and after undo/redo.
5. Confirm angle marks never render as a full circle/major arc when source points are moved.

### 9E. Perpendicular Bisector (Placement Segment)
1. Select a segment (or exactly two points), open `Perp Bisector`, and choose `Bisector`.
2. Move the cursor to one side of the segment and click to place.
3. Confirm a perpendicular bisector **segment** (not full line) is created from the midpoint in one direction only.
4. Confirm the midpoint point and the endpoint point are both visible.
5. Drag source endpoints and confirm the perpendicular bisector remains perpendicular and stays anchored at the midpoint.
6. Confirm dragging the bisector segment body does not move the construction.
7. Drag the bisector endpoint point and confirm it slides along the perpendicular and resizes the segment.

### 9F. Perpendicular Bisector Variants
1. Create `Bisector + Rt ∠`, `Bisector + MP Ticks`, and `Bisector + Rt ∠ + MP`.
2. Confirm right-angle decoration appears at the midpoint when selected.
3. Confirm midpoint tick marks appear on the original source segment when selected.
4. Confirm both decorations remain aligned after moving source endpoints or resizing via the bisector endpoint point.

---

## 10. Congruent / Similar / Transform Triangle Tools
### 10A. Congruent Triangle Copy
1. Create a triangle and select its 3 vertices (or its 3 side segments).
2. Click `Congruent △`.
3. Confirm a congruent offset copy is created.
4. Confirm copy placement avoids obvious overlap when possible.

### 10B. Similar Triangle Copy
1. Select one triangle again.
2. Click `Similar △`.
3. Confirm a larger similar copy is created.

### 10C. Rotate/Slide Triangle Panel
1. Select one triangle.
2. Click `Rotate/Slide Triangle`.
3. Confirm transform panel opens with live preview.
4. Drag the rotation compass and confirm preview rotates.
5. Move `Move X` slider and confirm preview shifts horizontally.
6. Move `Move Y` slider and confirm preview shifts vertically.
7. Click `Reflect Horizontal` and `Reflect Vertical`; confirm preview updates.
8. Click `Cancel`/`Close` and confirm original triangle is unchanged.
9. Reopen transform panel, make changes, click `Apply Transform`, and confirm changes commit.

---

## 11. Annotation Tools
### 11A. Segment Ticks
1. Select one or more segments.
2. Add `1` tick, then `2`, then `3` tick marks on test segments.
3. Confirm marks appear on each selected segment.
4. Try with no segment selected and confirm alert behavior.

### 11B. Angle Arcs + Right Angle
1. Select 3 points (counterclockwise) and add angle arc `1`.
2. Repeat for arc `2` and `3` on a test angle.
3. Add a right-angle marker using valid 3-point selection.
4. Try invoking angle arc/right-angle tool without valid selection and confirm it enters angle point-pick mode.
5. In angle point-pick mode, click 3 existing points and confirm annotation is created.
6. Confirm duplicate point clicks are rejected (should not create degenerate angle).

### 11C. Parallel Marks
1. Select one or more segments/lines.
2. Add parallel marks (`1`, `2`, `3`) and confirm chevrons render.
3. Try with no valid selection and confirm alert behavior.

### 11D. Side Length + Angle Measure Labels
1. Select exactly one segment and click `Side Length`.
2. Confirm prompt appears with default numeric value.
3. Accept default and confirm a draggable label is created.
4. Select 3 points (or an angle annotation) and click `Angle Measure`.
5. Confirm prompt appears with a degree-formatted default.
6. Enter a value without `°` and confirm the app appends `°`.
7. Drag both labels and confirm they move.

### 11E. Manual Label + Auto Label Mode
1. Click `Add Label`, enter text, and confirm label appears.
2. Select a point first, then `Add Label`; confirm it is placed near the point.
3. Switch to `Auto Label` mode.
4. Click a point and confirm a point-name label is added/removed on repeated clicks.
5. Click a segment and confirm an auto label is added/removed on repeated clicks.
6. Confirm auto labels remain draggable.

---

## 12. Style Controls
1. Create a few test objects (point/segment/circle/triangle edge).
2. Change stroke color and create a new object; confirm the new object uses the new color.
3. Change stroke width and create a new object; confirm width applies.
4. Change line style to dashed and create a segment/line/circle; confirm dashed rendering.
5. Reset width to default (if using the reset control) and confirm behavior.
6. Toggle `Exam mode` on and create new objects; confirm output styling uses exam-safe black appearance where expected.
7. Toggle `Exam mode` off and confirm normal styling resumes for new objects.

---

## 13. Hide / Show All (Export Cleanup)
1. Select one or more objects.
2. Use `Hide Selected` (or keyboard `H`) and confirm they disappear.
3. Confirm hidden items are excluded visually but app remains functional.
4. Click `Show All` and confirm hidden items return.
5. Undo and redo hide/show actions to confirm command stack behavior remains stable.

---

## 14. Save / Open (Persistence)
1. Create a mixed figure (triangle, circle, labels, annotations).
2. Save/export the editable figure as `.geojson`.
3. Clear the board (or reload page) and confirm canvas resets.
4. Open/import the saved `.geojson`.
5. Confirm all geometry, annotations, and labels are restored correctly.
6. Confirm imported objects remain selectable and draggable.

---

## 15. SVG / PNG Export
1. Create a representative figure with labels and annotations.
2. Download SVG with default settings.
3. If available, test `tight` SVG export toggle and compare bounds.
4. Open the SVG and confirm geometry/labels render correctly.
5. Download PNG at `1x`, `2x`, and `3x` scales.
6. Confirm PNG files are created and visually correct.
7. If using constrained intersection points, confirm exported appearance is acceptable (black by default in export).

---

## 15. Keyboard Shortcuts (Final Pass)
1. `Cmd/Ctrl+Z` undo
2. `Cmd/Ctrl+Shift+Z` redo (and/or `Ctrl+Y`)
3. `H` hide selected
4. `Delete` / `Backspace` delete selected
5. `Escape` reset to `Select`
6. Confirm shortcuts do not break current interaction mode unexpectedly.

---

## 16. Regression Spot Checks (Quick Repeat)
1. Isosceles triangle reuse same base `A-B` repeatedly (5 times).
2. Right triangle creation still auto-adds right-angle marker.
3. Angle point-pick mode still rejects duplicate points.
4. Segment/line/ray/circle creation still works with existing points.
5. Undo/redo after triangle + annotation still works.

---

## Notes / Failures Log
- Step:
- What happened:
- Expected:
- Browser/OS:
- Screenshot or console notes:
