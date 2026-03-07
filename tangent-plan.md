# Tangent-to-Circle v1 Plan (Decision Complete)

## Summary
Add a new construction action for **point-to-circle tangents** with this flow:
1. User enters tangent construction.
2. User selects exactly **1 point** and **1 circle**.
3. App shows **both tangent ghosts**.
4. Hovering one tangent highlights it; click commits that tangent (renders solid).
5. User may then hover and click the other ghost to also commit it.
6. Tool auto-exits when both tangents are committed, or when the user clicks blank space (keeping however many were committed — 0 or 1). Esc cancels everything, including already-committed tangents from this session.
7. V1 is **strict exterior-only** at creation (point must be outside circle).

## Implementation Changes
- Add a new construct action/button: `Tangent (Point->Circle)` using existing construction-selection-session UX.
- Selection validation:
  - Must have exactly one `point` and one `circle`.
  - Reject on-circle/inside with clear message: "Point must be outside the circle."
- Preview/pick state:
  - Add tangent preview session state with two candidates (`side = +1` / `side = -1`).
  - Render both dashed tangent segments from source point to tangent points.
  - Track hovered candidate by pointer distance to preview segment and style it as active.
  - Click commits active candidate (makes it solid); the other ghost remains hoverable/clickable.
  - Tool auto-exits when both candidates are committed.
  - Click blank space exits, keeping however many tangents were committed (0 or 1).
  - Esc cancels the entire session, removing any already-committed tangents from this session.
- Persisted geometry/output (per committed tangent):
  - Create a **tangency point**: constrained, hidden by default, but selectable and labelable. `constraint.kind = "circleTangentPoint"` with `{ sourcePointId, circleId, side }`.
  - Create a **segment** from source point to tangency point. Both endpoints are selectable/labelable.
- Undo: all tangents created in one tool session (1 or 2) are removed together as a single undo step.
- Dynamic behavior:
  - Tangent stays constrained as point/circle move.
  - If relationship becomes invalid later (point on/inside circle), **gray out** the segment at its last valid position until the point moves back outside.

## Scenarios Covered
- Exterior point + circle: two tangents shown, user picks one or both.
- Wrong selection (not exactly one point + one circle): blocked with guidance.
- On-circle/inside at creation: blocked (strict rule).
- Dynamic updates after creation: tangent follows geometry when valid; grays out when invalid (point on/inside circle), resumes when valid again.
- Cancel path: Esc exits without keeping any objects from this session.
- Partial commit: clicking blank space after committing one tangent exits with just that one.
- Full commit: clicking both tangents auto-exits the tool.

## Test Plan
- Create tangent from exterior point; verify two ghosts and hover-pick correctness.
- Commit one tangent (click blank space); verify segment and tangency point exist and are selectable/labelable.
- Commit both tangents (click each); verify auto-exit and both segments/points exist.
- Esc after committing one tangent; verify the committed tangent is also removed.
- Verify committed segment touches circle at exactly one point and starts at source point.
- Move source point and circle-defining points; verify tangent tracks continuously.
- Drag source point onto/inside circle; verify tangent grays out at last valid position.
- Drag back outside; verify tangent resumes updating and returns to normal style.
- Invalid selection tests:
  - point only, circle only, two points + circle, point + two circles.
- Undo/redo:
  - one-step undo removes both tangents if both were committed in one session.
  - one-step undo removes the single tangent if only one was committed.
- Export regression:
  - tangent segment and tangency point render/export like existing segment/point objects.

## Assumptions / Defaults
- V1 supports only **point + circle** (no line-circle tangency tool, no circle-circle common tangents yet).
- Tangent output is a **segment to tangency point** (not line/ray).
- Tangency point is hidden by default but fully selectable and labelable.
- Pick UX: dual ghost + hover highlight + click to commit, up to 2 commits per session; blank space or auto-exit finalizes; Esc cancels all.
- Future expansion candidates (separate phase): on-circle single tangent mode, common tangents between two circles, "create both tangents at once" variant.
