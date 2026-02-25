export function createObjectMovePointLabelWorkflow(ctx) {
  const {
    session,
    JXG,
    boardController,
    getObjectById,
    maybeAxisLockDraggedPoint,
    applyPointConstraintToDraggedPosition,
    labelFollowBaseAnchor,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    updateConstrainedPointsLive,
    recomputeConstrainedPoints,
    runMutation,
  } = ctx;

  function syncLabelFollowOffset(obj, adjustedPos) {
    if (obj.type !== "label" || !obj.follow) {
      return;
    }
    const base = labelFollowBaseAnchor(obj);
    if (!base) {
      return;
    }
    obj.follow.offsetX = adjustedPos.x - base.x;
    obj.follow.offsetY = adjustedPos.y - base.y;
  }

  function handleObjectMovePointLabel(id, type, pos, options, transient) {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      return false;
    }
    if (type !== "point" && type !== "label") {
      return false;
    }

    const obj = getObjectById(id);
    if (!obj) {
      return true;
    }

    let adjustedPos = type === "point" ? maybeAxisLockDraggedPoint(id, pos, options) : pos;
    if (type === "point") {
      adjustedPos = applyPointConstraintToDraggedPosition(obj, adjustedPos).pos;
    }

    if (Math.abs((obj.x ?? 0) - adjustedPos.x) < 0.0001 && Math.abs((obj.y ?? 0) - adjustedPos.y) < 0.0001) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, `move-${type}`);
      }
      return true;
    }

    if (transient) {
      ensureTransientSnapshot(id);
      obj.x = adjustedPos.x;
      obj.y = adjustedPos.y;
      syncLabelFollowOffset(obj, adjustedPos);
      if (type === "point") {
        const el = boardController.getElement(id);
        if (el?.setPosition) {
          el.setPosition(JXG.COORDS_BY_USER, [adjustedPos.x, adjustedPos.y]);
        }
      }
      updateConstrainedPointsLive();
      return true;
    }

    if (session.transientDragSnapshots.has(id)) {
      obj.x = adjustedPos.x;
      obj.y = adjustedPos.y;
      syncLabelFollowOffset(obj, adjustedPos);
      if (type === "point") {
        recomputeConstrainedPoints();
      }
      commitTransientSnapshotIfPresent(id, `move-${type}`);
      return true;
    }

    runMutation(`move-${type}`, () => {
      obj.x = adjustedPos.x;
      obj.y = adjustedPos.y;
      syncLabelFollowOffset(obj, adjustedPos);
      if (type === "point") {
        recomputeConstrainedPoints();
      }
    });
    return true;
  }

  return {
    handleObjectMovePointLabel,
  };
}
