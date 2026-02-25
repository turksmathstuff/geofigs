export function createObjectMoveCircleWorkflow(ctx) {
  const {
    session,
    getPointById,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    updateConstrainedPointsLive,
    runMutation,
  } = ctx;

  function handleObjectMoveCircle(id, type, circleObj, pos, transient) {
    if (type !== "circle" || !circleObj || circleObj.type !== "circle" || !pos?.p1 || !pos?.p2) {
      return false;
    }

    const centerObj = getPointById(circleObj.pointIds?.[0]);
    const throughObj = getPointById(circleObj.pointIds?.[1]);
    if (!centerObj || !throughObj) {
      return true;
    }

    const unchanged =
      Math.abs(centerObj.x - pos.p1.x) < 0.0001 &&
      Math.abs(centerObj.y - pos.p1.y) < 0.0001 &&
      Math.abs(throughObj.x - pos.p2.x) < 0.0001 &&
      Math.abs(throughObj.y - pos.p2.y) < 0.0001;
    if (unchanged) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-circle");
      }
      return true;
    }

    if (transient) {
      ensureTransientSnapshot(id);
      centerObj.x = pos.p1.x;
      centerObj.y = pos.p1.y;
      throughObj.x = pos.p2.x;
      throughObj.y = pos.p2.y;
      updateConstrainedPointsLive();
      return true;
    }

    if (session.transientDragSnapshots.has(id)) {
      centerObj.x = pos.p1.x;
      centerObj.y = pos.p1.y;
      throughObj.x = pos.p2.x;
      throughObj.y = pos.p2.y;
      commitTransientSnapshotIfPresent(id, "move-circle");
      return true;
    }

    runMutation("move-circle", () => {
      centerObj.x = pos.p1.x;
      centerObj.y = pos.p1.y;
      throughObj.x = pos.p2.x;
      throughObj.y = pos.p2.y;
    });
    return true;
  }

  return {
    handleObjectMoveCircle,
  };
}
