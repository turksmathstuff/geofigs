export function createObjectMoveLineWorkflow(ctx) {
  const {
    session,
    getPointById,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    updateConstrainedPointsLive,
    runMutation,
  } = ctx;

  function handleObjectMoveLine(id, type, lineObj, pos, transient) {
    if (type !== "line" || !lineObj || !["line", "parallel", "perpendicular"].includes(lineObj.type)) {
      return false;
    }
    if (!pos?.p1 || !pos?.p2) {
      return false;
    }
    if (lineObj.type !== "line") {
      return true;
    }

    const p1Obj = getPointById(lineObj.pointIds?.[0]);
    const p2Obj = getPointById(lineObj.pointIds?.[1]);
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
        commitTransientSnapshotIfPresent(id, "move-line");
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
      commitTransientSnapshotIfPresent(id, "move-line");
      return true;
    }

    runMutation("move-line", () => {
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
    });
    return true;
  }

  return {
    handleObjectMoveLine,
  };
}
