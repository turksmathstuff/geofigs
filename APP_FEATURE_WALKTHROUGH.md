# Geometry Figure Generator (v1.1)

## Feature Walkthrough (Current App)

Walkthrough of the Geometry Figure Generator as it exists in the current codebase (`v1.1` in `index.html`).


---

## 1. What the App Is

The app is a browser-based geometry diagram editor for creating classroom-ready figures, annotations, and exports for quizzes, notes, and handouts.

Core strengths so far:

- Fast point/line/triangle/circle construction
- Classroom-style geometry markings (ticks, arcs, right angles, parallel marks)
- Measurement and label tools
- Interactive dragging and cleanup workflows
- Export to SVG/PNG and save/open editable `.geojson`

---

## 2. How to Run It

Go to the website:

```
https://turksmathstuff.com/geofigs/
```


---

## 3. Quick Demo Flow (Recommended Live Walkthrough...but no)

Use this sequence if you want to demonstrate the app in a clean, logical order.

### A. Build a base figure

1. Click `Point` and place a few points.
2. Use `Segment`, `Line`, and `Ray` to show the three line-like object types.
3. Use `Circle` (center + through-point).
4. Use `Triangle ▾` and create:
   - `3-Point Triangle`
   - `Right Triangle`
   - `Isosceles Triangle`

What to point out:

- Dashed previews while placing geometry
- `Shift` to constrain horizontal/vertical placement
- Existing points can be reused; clicking empty canvas creates inline points

### B. Show smart construction tools

1. In `Select`, choose a point and a line/segment.
2. Click `Parallel`, then repeat with `Perpendicular`.
3. Demonstrate `Midpoint` tools (`Midpoint`, `1/2/3 Tick` variants).
4. Demonstrate `Angle Bisector` and `Perp Bisector` variants.

What to point out:

- Parallel/perpendicular outputs render with arrowheads
- Visible line/ray extents can be resized by dragging arrow tips
- Constructed objects can be reused for later constructions

### C. Show snapping / constrained points

1. Create a line crossing another line or circle.
2. Switch to `Point`.
3. Click near the intersection to create a constrained intersection point.

What to point out:

- Intersection point appears as a constrained point (red on screen by default)
- It updates automatically when source geometry moves
- It is non-draggable and tied to source objects

### D. Add classroom annotations

1. Select segments and add `Segment Ticks` (1/2/3).
2. Add `Angle Marks` (arcs and tick variants).
3. Add `Right Angle`.
4. Add `Parallel Marks`.
5. Add `Side Length` and `Angle Measure`.
6. Add `Add Label` and then demo `Auto Label`.

What to point out:

- Labels are draggable
- Angle decorators can be dragged to change radius
- `Auto Label` toggles object labeling on click

### E. Transform triangles

1. Select a triangle (points or sides).
2. Click `Congruent △` and `Similar △`.
3. Click `Rotate/Slide Triangle`.
4. Demonstrate:
   - Rotation compass
   - `Move X` / `Move Y`
   - `Reflect Horizontal` / `Reflect Vertical`
   - `Apply Transform` vs `Cancel`

What to point out:

- Live preview
- Labels linked to triangle objects move with the transform

### F. Style and export

1. Change `Color`, `Width`, and `Line` style (`Solid` / `Dashed`).
2. Toggle `Exam Mode`.
3. Use `Hide Selected` / `Show All` for export cleanup.
4. Export:
   - `Download SVG`
   - `Download PNG` (show `PNG Scale`)
   - `Save .geojson`
   - `Open .geojson`

What to point out:

- Hidden objects do not render/export
- Tight SVG export is available
- `.geojson` preserves editable state

---

## 4. Toolbar Feature Summary

### Construct

- `Select`
- `Point`
- `Midpoint` (plain, 1/2/3 tick variants)
- `Segment`
- `Line` (finite visible span with arrowheads; line-like behavior)
- `Ray` (finite visible span with arrowhead; ray-like behavior)
- `Parallel` through selected point
- `Perpendicular` through selected point
- `Circle`
- `Perp Bisector` variants
- `Angle Bisector` variants
- `Triangle ▾`
  - `3-Point Triangle`
  - `Right Triangle`
  - `Isosceles Triangle`
- `Congruent/Similar Triangles`
  - `Congruent △`
  - `Similar △`
  - `Rotate/Slide Triangle`

### Annotate

- `Segment Ticks` (1/2/3)
- `Angle Marks`
  - Arc variants (1/2/3)
  - Arc+ticks variants (1/2/3)
- `Parallel Marks` (1/2/3 chevrons)
- `Side Length`
- `Angle Measure`
- `Right Angle`
- `Add Label`
- `Auto Label`

### Style

- Color (with `Default` reset)
- Width slider (with `Default` reset)
- `Solid` / `Dashed`
- `Exam Mode`

### Export

- `PNG Scale` (`1x`, `2x`, `3x`)
- `Background` (`Transparent` / `White`)
- `Tight SVG` toggle
- `Download SVG`
- `Download PNG`
- `Save .geojson`
- `Open .geojson`

### Edit

- `Undo`
- `Redo`
- `Hide Selected`
- `Show All`
- `Delete Selected`
- `Clear Board`

---

## 5. Interaction Highlights (Worth Mentioning in a Demo)

- Multi-select with `Shift` / `Cmd` / `Ctrl`
- Marquee drag-select in `Select` mode
- Live dragging for points, labels, lines, rays, and many constructed objects
- `Shift` axis-lock during supported placement and dragging
- Draggable arrow-tip handles to resize visible line/ray extents
- Floating on-canvas hints for tool guidance

---

## 6. Keyboard Shortcuts

- `Cmd/Ctrl + Z` = Undo
- `Cmd/Ctrl + Shift + Z` or `Ctrl + Y` = Redo
- `H` = Hide selected
- `Delete` / `Backspace` = Delete selected
- `Escape` = Clear selection / cancel pending construction / return to `Select`

---

## 7. Current Limitations / Notes (Useful for Stakeholders)

- `Line` and `Ray` are visually finite for usability, while geometry logic remains line-/ray-like.
- Circle snapping supports circle + line/segment/ray intersections (not circle + circle yet).
- JSXGraph is loaded from CDN, so hosted use requires internet access.



---

## 9. Converting This File to PDF

Options:

- Open the Markdown in a preview tool/editor and use **Print > Save as PDF**
- Use Pandoc (if installed):

```bash
pandoc APP_FEATURE_WALKTHROUGH.md -o APP_FEATURE_WALKTHROUGH.pdf
```

