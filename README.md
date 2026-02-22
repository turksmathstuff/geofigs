# Geometry Figure Generator

A browser-based tool for creating classroom-ready geometry diagrams and exporting them for quizzes, notes, and handouts.

## Run locally
This app uses JavaScript modules, so run it from a local web server.

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

- http://localhost:8000

Do not open `index.html` directly with `file://`.

## What it can do

### Construct
- Point
- Segment, Line, Ray
- Triangle submenu:
  - 3-Point Triangle
  - Right Triangle
  - Isosceles Triangle
- Circle
- Parallel / Perpendicular through a selected point
- Congruent/Similar triangle duplication tools
- Rotate/Slide triangle transform panel (with reflect options)

### Annotate
- Segment ticks (1/2/3)
- Angle arcs (1/2/3) and right-angle marker
- Parallel marks (chevrons 1/2/3)
- Side length labels
- Angle measure labels (degree symbol by default)
- Manual labels
- Auto Label mode (click objects to add/remove labels)

### Style
- Stroke color
- Stroke width (with Default reset)
- Solid / dashed
- Exam mode toggle

### Export / persistence
- Save editable figure state as `.geojson`
- Open `.geojson`
- Download SVG (tight export supported)
- Download PNG (scale 1x/2x/3x)

## Interaction notes
- Select mode supports Shift multi-select.
- Drag on blank canvas in Select mode for marquee box selection.
- Hold Shift while placing segment/line/ray/triangle points to constrain horizontal/vertical movement.
- Point tool can snap to intersections of existing linear objects when clicking near the intersection.
- Labels are draggable (including point-name labels).
- Triangle transform panel includes:
  - Compass-style rotation drag
  - X/Y slide sliders
  - Reflect Horizontal / Reflect Vertical

## Keyboard shortcuts
- Undo: `Cmd/Ctrl + Z`
- Redo: `Cmd/Ctrl + Shift + Z` or `Ctrl + Y`
- Delete selected: `Delete` / `Backspace`
- Escape: reset to Select mode

## Deployment
This is a static client-side app and can be hosted on GitHub Pages.

### Basic GitHub Pages flow
1. Push repository to GitHub.
2. In repository settings, enable Pages from `main` branch (root).
3. Use/share the generated Pages URL.

## Notes
- The app is a geometry figure editor/generator. It does not provide symbolic proof solving.
- JSXGraph is loaded from CDN, so users need internet access when using the hosted site.
