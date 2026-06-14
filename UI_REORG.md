# Toolbar Reorganization Proposal

A pass over the toolbar in `index.html` (the `<aside class="toolbar">`, lines 27–263).
Goal: order things by how the figure is actually built, surface the common buttons,
and hide the knobs nobody touches.

## Guiding principles

1. **Order by workflow.** The mental model is: pick a tool → draw primitives →
   derive constructions → build shapes → annotate → clean up → export. Styling is
   an afterthought, so it goes last.
2. **Flat buttons before expand/collapse groups** within a section, so the
   one-click actions are always visible and the multi-variant menus sit below them.
3. **Hide the rarely-used knobs** behind a collapsed "Advanced" disclosure instead
   of deleting them.

## Proposed section order (top → bottom)

| # | Section  | Why here |
|---|----------|----------|
| 1 | Construct | First thing you do. |
| 2 | Annotate | Decorate what you built. |
| 3 | Edit | Undo/redo/delete — used constantly throughout, kept high. |
| 4 | Export | End of the workflow. |
| 5 | Style | "Almost never used" → all the way at the bottom. |

> Optional: pull **Undo / Redo** out of Edit and into the top bar (next to the
> status text). They're the most-pressed buttons in the app and would benefit from
> a fixed, always-visible home. Flagging it — not assuming it.

---

## 1. Construct

Reordered so the line/circle drawing tools form one contiguous block, with derived
constructions directly beneath, then shapes, then circle constructions. Loose
subgroups separated by blank lines below (could be real dividers or sub-headings):

```
Select   Point

— Lines & circles —
Segment   Line   Ray   Parallel   Perpendicular   Circle

— Point/line constructions —
[Midpoint ▾]   [Perp Bisector ▾]   [Angle Bisector ▾]

— Shapes —
[Triangles ▾]   [Regular Polygon ▾]   [Congruent/Similar △ ▾]

— Circle constructions —
[Circles ▾]
```

Rationale for the moves you flagged:
- **Midpoint** moves down out of the line block to sit with the other "derived from
  a segment/line" constructions: Midpoint → Perp Bisector → Angle Bisector. These
  three all act on something you already drew, so they group naturally.
- The **Segment → Circle** block stays intact and contiguous (you draw with these
  most often).
- Triangles/polygons cluster as "whole shapes"; the circle-construction menu
  (inscribed/circumscribed/tangent/arc) lands at the end since it's the most
  specialized.

## 2. Annotate

Flip it: the flat one-click buttons move **above** the expand/collapse mark groups.

```
Side Length   Angle Measure   Right Angle
Add/Edit Label   Auto Label   Shade Region

[Segment Ticks ▾]   [Angle Marks ▾]   [Parallel Marks ▾]   [Arc Ticks ▾]
```

The measure/label/shade buttons are the workhorses; the tick/mark variant menus are
secondary and sink to the bottom of the section.

## 3. Edit

Unchanged contents, just repositioned above Export.

```
Undo   Redo   Hide Selected   Show All   Delete Selected   Clear Board
```

## 4. Export

Keep the common actions visible; tuck the never-touched knobs into a collapsed
**Advanced** disclosure at the bottom of the section.

**Visible (common):**
```
Label Size [select]   Point Size [select]

Preview Export
Download SVG   Download PNG
Save .geojson   Open .geojson
Upload Background Image   Clear Background Image
Hide Points   Hide Arrows
```

**Collapsed — `[Advanced ▾]`:**
```
PNG Scale [select]      ← never used
Background [select]     ← never used
Tight SVG [checkbox]    ← never used
```

## 5. Style

Whole section drops to the bottom. It's already a single collapsed
`<details>` ("Style Controls"), so no internal change needed — just move the
`<section>` last and optionally collapse it by default (it already is).

---

## Summary of concrete edits

- Move `Midpoint` `<details>` (index.html:33–41) below the Segment→Circle block,
  ahead of `Perp Bisector`.
- Within **Construct**, regroup into: primitives / lines+circles / point-line
  constructions / shapes / circle constructions (optionally with sub-headings).
- Within **Annotate**, move the six flat buttons (lines 150–155) above the four
  `<details>` mark groups (lines 115–149).
- Reorder `<section>`s to: Construct, Annotate, Edit, Export, Style.
- In **Export**, wrap PNG Scale / Background / Tight SVG in an `<details>` Advanced
  group at the bottom.
- (Optional) Promote Undo/Redo into the top bar.

These are all markup-only moves in `index.html` — no JS changes, since every button
keeps its `id` / `data-*` attribute and the wiring in `src/app/ui/` looks elements
up by id.
```
