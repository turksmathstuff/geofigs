export function createPointCollectionBoardClickWorkflow(ctx) {
  const {
    session,
    ToolMode,
    pointNeeds,
    rightTriangleIsoModifierActive,
    findNearbyVisiblePoint,
    addPointInput,
    runMutation,
    findPreferredPointSnap,
    maybeCreateIntersectionPoint,
    maybeCreateAttachedPoint,
    maybeCreatePoint,
  } = ctx;

  function handlePointCollectionBoardClick(snappedCoords, evt) {
    if (pointNeeds(session.currentMode) <= 0) {
      return false;
    }

    if (session.currentMode === ToolMode.TRIANGLE && session.triangleVariant === "right" && session.pendingPointIds.length === 2) {
      session.pendingRightTriangleForceIso = rightTriangleIsoModifierActive(evt);
    }

    const nearbyPoint = findNearbyVisiblePoint(snappedCoords);
    if (nearbyPoint) {
      addPointInput(nearbyPoint.id);
      return true;
    }

    runMutation("create-inline-point", () => {
      const pointSnap = findPreferredPointSnap(snappedCoords);
      let ptId;
      if (pointSnap?.sourceObjectIds) {
        ptId = maybeCreateIntersectionPoint(pointSnap);
      } else if (pointSnap?.sourceObjectId) {
        ptId = maybeCreateAttachedPoint(pointSnap);
      } else {
        ptId = maybeCreatePoint(snappedCoords);
      }
      addPointInput(ptId, true);
    });
    return true;
  }

  return {
    handlePointCollectionBoardClick,
  };
}
