export function createPointCollectionObjectClickWorkflow(ctx) {
  const {
    session,
    ToolMode,
    pointNeeds,
    rightTriangleIsoModifierActive,
    addPointInput,
  } = ctx;

  function handlePointCollectionObjectClick(id, type, evt) {
    if (pointNeeds(session.currentMode) > 0 && type === "point") {
      if (session.currentMode === ToolMode.TRIANGLE && session.triangleVariant === "right" && session.pendingPointIds.length === 2) {
        session.pendingRightTriangleForceIso = rightTriangleIsoModifierActive(evt);
      }
      addPointInput(id);
      return { matched: true, returnValue: undefined };
    }

    if (pointNeeds(session.currentMode) > 0 && type !== "point") {
      return { matched: true, returnValue: false };
    }

    return { matched: false };
  }

  return {
    handlePointCollectionObjectClick,
  };
}
