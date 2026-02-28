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
    syncPointIdsToBoard,
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

    if (
      type === "point" &&
      (obj.constraint?.kind === "regularPolygonVertex" || obj.constraint?.kind === "regularPolygonCenter")
    ) {
      const [controlAId, controlBId] = obj.constraint.sourcePointIds || [];
      const controlA = getObjectById(controlAId);
      const controlB = getObjectById(controlBId);
      if (!controlA || !controlB) {
        return true;
      }
      const adjustedPos = maybeAxisLockDraggedPoint(id, pos, options);
      const dx = adjustedPos.x - obj.x;
      const dy = adjustedPos.y - obj.y;
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
        recomputeConstrainedPoints();
        commitTransientSnapshotIfPresent(id, "move-regular-polygon");
        return true;
      }

      runMutation("move-regular-polygon", () => {
        controlA.x += dx;
        controlA.y += dy;
        controlB.x += dx;
        controlB.y += dy;
        recomputeConstrainedPoints();
      });
      return true;
    }

    let adjustedPos = type === "point" ? maybeAxisLockDraggedPoint(id, pos, options) : pos;
    if (type === "point") {
      adjustedPos = applyPointConstraintToDraggedPosition(obj, adjustedPos).pos;
    }

    if (Math.abs((obj.x ?? 0) - adjustedPos.x) < 0.0001 && Math.abs((obj.y ?? 0) - adjustedPos.y) < 0.0001) {
      if (type === "point") {
        const el = boardController.getElement(id);
        if (el?.setPosition) {
          el.setPosition(JXG.COORDS_BY_USER, [obj.x, obj.y]);
          boardController.update();
        }
      }
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
