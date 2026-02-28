export function createObjectMoveSegmentWorkflow(ctx) {
  const {
    session,
    getPointById,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    syncPointIdsToBoard,
    updateConstrainedPointsLive,
    runMutation,
  } = ctx;

  function handleObjectMoveSegment(id, type, segObj, pos, transient) {
    if (type !== "segment" || !segObj || segObj.type !== "segment" || !pos?.p1 || !pos?.p2) {
      return false;
    }
    if (segObj.construction === "perpendicularBisector") {
      return true;
    }
    if (segObj.construction === "regularPolygon") {
      const [controlAId, controlBId] = segObj.constructionSourcePointIds || [];
      const controlA = getPointById(controlAId);
      const controlB = getPointById(controlBId);
      if (!controlA || !controlB) {
        return true;
      }
      const p1Obj = getPointById(segObj.pointIds?.[0]);
      const p2Obj = getPointById(segObj.pointIds?.[1]);
      if (!p1Obj || !p2Obj) {
        return true;
      }
      const dx = ((pos.p1.x - p1Obj.x) + (pos.p2.x - p2Obj.x)) / 2;
      const dy = ((pos.p1.y - p1Obj.y) + (pos.p2.y - p2Obj.y)) / 2;
      const unchanged = Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001;
      if (unchanged) {
        if (!transient) {
          commitTransientSnapshotIfPresent(id, "move-regular-polygon");
        }
        return true;
      }

      if (transient) {
        ensureTransientSnapshot(id);
        controlA.x += dx;
        controlA.y += dy;
        controlB.x += dx;
        controlB.y += dy;
        syncPointIdsToBoard([controlAId, controlBId]);
        updateConstrainedPointsLive();
        return true;
      }

      if (session.transientDragSnapshots.has(id)) {
        controlA.x += dx;
        controlA.y += dy;
        controlB.x += dx;
        controlB.y += dy;
        updateConstrainedPointsLive();
        commitTransientSnapshotIfPresent(id, "move-regular-polygon");
        return true;
      }

      runMutation("move-regular-polygon", () => {
        controlA.x += dx;
        controlA.y += dy;
        controlB.x += dx;
        controlB.y += dy;
      });
      return true;
    }

    const p1Obj = getPointById(segObj.pointIds?.[0]);
    const p2Obj = getPointById(segObj.pointIds?.[1]);
    if (!p1Obj || !p2Obj) {
      return true;
    }

    const unchanged =
      Math.abs(p1Obj.x - pos.p1.x) < 0.0001 &&
      Math.abs(p1Obj.y - pos.p1.y) < 0.0001 &&
      Math.abs(p2Obj.x - pos.p2.x) < 0.0001 &&
      Math.abs(p2Obj.y - pos.p2.y) < 0.0001;
    if (unchanged) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-segment");
      }
      return true;
    }

    if (transient) {
      ensureTransientSnapshot(id);
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
      updateConstrainedPointsLive();
      return true;
    }

    if (session.transientDragSnapshots.has(id)) {
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
      commitTransientSnapshotIfPresent(id, "move-segment");
      return true;
    }

    runMutation("move-segment", () => {
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
    });
    return true;
  }

  return {
    handleObjectMoveSegment,
  };
}
