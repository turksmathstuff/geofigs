import { arc3ptNeedsSwap } from "../geometry/circles.js";

export function createCircleToolWorkflow(ctx) {
  const { ToolMode, session, addObject, makeId, store, getPointById } = ctx;

  function handlePointInputArcCreate(modeForCreate, pointsForCreate, style) {
    if (modeForCreate === ToolMode.ARC_3PT) {
      const [p1Id, p2Id, p3Id] = pointsForCreate;
      const p1 = getPointById(p1Id);
      const p2 = getPointById(p2Id);
      const p3 = getPointById(p3Id);
      if (!p1 || !p2 || !p3) return false;
      const swapStartEnd = arc3ptNeedsSwap(p1, p2, p3);
      addObject({ id: makeId("arc"), type: "arc-3pt", pointIds: pointsForCreate, swapStartEnd, style });
      store.clearSelection();
      return true;
    }

    if (modeForCreate === ToolMode.ARC_CSE) {
      const swapStartEnd = session.arcCSESwapStartEnd ?? false;
      const arcId = makeId("arc");
      addObject({ id: arcId, type: "arc-cse", pointIds: pointsForCreate, swapStartEnd, style });
      session.arcCSESwapStartEnd = false;
      // Constrain end point to slide along the arc's circle
      const centerPt = getPointById(pointsForCreate[0]);
      const endPt = getPointById(pointsForCreate[2]);
      if (centerPt && endPt) {
        const angle = Math.atan2(endPt.y - centerPt.y, endPt.x - centerPt.x);
        endPt.constraint = { kind: "onObject", sourceObjectId: arcId, attach: { type: "circle", angle } };
      }
      store.clearSelection();
      return true;
    }

    return false;
  }

  return { handlePointInputArcCreate };
}
