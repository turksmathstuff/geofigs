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

