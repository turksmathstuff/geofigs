# Tangent-to-Circle v1 Plan (Decision Complete)

## Summary
Add a new construction action for **point-to-circle tangents** with this flow:
1. User enters tangent construction.
2. User selects exactly **1 point** and **1 circle**.
3. App shows **both tangent ghosts**.
4. Hovering one tangent highlights it; click commits that one tangent.
5. V1 is **strict exterior-only** at creation (point must be outside circle).

## Implementation Changes
- Add a new construct action/button: `Tangent (Point->Circle)` using existing construction-selection-session UX.
- Selection validation:
  - Must have exactly one `point` and one `circle`.
  - Reject on-circle/inside with clear message: “Point must be outside the circle.”
- Preview/pick state:
  - Add tangent preview session state with two candidates (`side = +1` / `side = -1`).
  - Render both dashed tangent segments from source point to tangent points.
  - Track hovered candidate by pointer distance to preview segment and style it as active.
  - Click commits active candidate; `Esc` cancels.
- Persisted geometry/output:
  - Create a **segment** from source point to computed tangency point.
  - Tangency endpoint is a constrained point: `constraint.kind = "circleTangentPoint"` with `{ sourcePointId, circleId, side }`.
  - Segment references `[sourcePointId, tangentPointId]`.
- Dynamic behavior:
  - Tangent stays constrained as point/circle move.
  - If relationship becomes invalid later (point on/inside circle), **freeze last valid geometry** until exterior again.

## Scenarios Covered
- Exterior point + circle: two tangents shown, user picks one.
- Wrong selection (not exactly one point + one circle): blocked with guidance.
- On-circle/inside at creation: blocked (strict rule).
- Dynamic updates after creation: tangent follows geometry when valid; freezes when invalid.
- Cancel path: `Esc` exits without creating objects.

## Test Plan
- Create tangent from exterior point; verify two ghosts and hover-pick correctness.
- Verify committed segment touches circle at exactly one point and starts at source point.
- Move source point and circle-defining points; verify tangent tracks continuously.
- Drag source point onto/inside circle; verify tangent freezes at last valid state.
- Drag back outside; verify tangent resumes updating.
- Invalid selection tests:
  - point only, circle only, two points + circle, point + two circles.
- Undo/redo:
  - creation, movement updates, invalid/valid transitions.
- Export regression:
  - tangent segment and tangent point render/export like existing segment/point objects.

## Assumptions / Defaults
- V1 supports only **point + circle** (no line-circle tangency tool, no circle-circle common tangents yet).
- Tangent output is a **segment to tangency point** (not line/ray).
- Pick UX is dual ghost + hover highlight + click commit.
- Future expansion candidates (separate phase): on-circle single tangent mode, common tangents between two circles, “create both tangents” variant.
