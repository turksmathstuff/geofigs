export function createPointInputAngleCreateWorkflow(ctx) {
  const { ToolMode, session, addAnnotation, makeId, store } = ctx;

  function handlePointInputAngleCreate(modeForCreate, pointsForCreate, isRightAngle, style) {
    if (modeForCreate !== ToolMode.ANGLE) {
      return false;
    }

    addAnnotation({
      id: makeId("ang"),
      type: "angle",
      pointIds: pointsForCreate,
      right: isRightAngle,
      arcCount: isRightAngle ? 1 : session.pendingAngleArcCount,
      decorator: isRightAngle ? "right" : session.pendingAngleDecorator,
      tickCount: isRightAngle ? 0 : session.pendingAngleDecorator === "arcTick" ? session.pendingAngleArcCount : 0,
      style,
    });
    store.clearSelection();
    return true;
  }

  return {
    handlePointInputAngleCreate,
  };
}
