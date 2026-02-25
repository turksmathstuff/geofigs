export function createObjectMoveRayWorkflow(ctx) {
  const {
    session,
    getPointById,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    updateConstrainedPointsLive,
    runMutation,
  } = ctx;

  function handleObjectMoveRay(id, type, rayObj, pos, transient) {
    if (type !== "ray" || !rayObj || rayObj.type !== "line" || rayObj.lineType !== "ray") {
      return false;
    }
    if (!pos?.p1 || !pos?.p2) {
      return true;
    }
    if (rayObj.construction === "angleBisector") {
      return true;
    }

    const p1Obj = getPointById(rayObj.pointIds?.[0]);
    const p2Obj = getPointById(rayObj.pointIds?.[1]);
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
        commitTransientSnapshotIfPresent(id, "move-ray");
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
      commitTransientSnapshotIfPresent(id, "move-ray");
      return true;
    }

    runMutation("move-ray", () => {
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
    });
    return true;
  }

  return {
    handleObjectMoveRay,
  };
}
