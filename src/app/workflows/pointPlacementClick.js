export function createPointPlacementClickWorkflow(ctx) {
  const {
    session,
    ToolMode,
    findPreferredPointSnap,
    runMutation,
    maybeCreateIntersectionPoint,
    maybeCreateAttachedPoint,
    maybeCreatePoint,
  } = ctx;

  function handlePointModeBoardClick(snappedCoords) {
    if (session.currentMode !== ToolMode.POINT) {
      return false;
    }
    const pointSnap = findPreferredPointSnap(snappedCoords);
    runMutation("create-point", () => {
      if (pointSnap?.sourceObjectIds) {
        maybeCreateIntersectionPoint(pointSnap);
      } else if (pointSnap?.sourceObjectId) {
        maybeCreateAttachedPoint(pointSnap);
      } else {
        maybeCreatePoint(snappedCoords);
      }
    });
    return true;
  }

  return {
    handlePointModeBoardClick,
  };
}
