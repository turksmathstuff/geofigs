export function createPerpendicularBisectorPlacementBoardClickWorkflow(ctx) {
  const {
    session,
    boardEl,
    getPointInputCoords,
    updatePerpendicularBisectorPreview,
    boardController,
    runMutation,
    maybeCreateMidpointPoint,
    maybeCreatePerpendicularBisectorEndpointPoint,
    makeId,
    addObject,
    defaultStyle,
    addAnnotation,
    store,
    updateModeUi,
  } = ctx;

  function handlePerpendicularBisectorPlacementBoardClick(coords, evt) {
    if (!session.perpendicularBisectorPlacement) {
      return false;
    }

    const tag = String(evt?.target?.tagName || "").toLowerCase();
    const isBoardBackground = tag === "svg" || evt?.target === boardEl;
    if (!isBoardBackground) {
      return true;
    }

    const adjusted = getPointInputCoords(coords, evt);
    updatePerpendicularBisectorPreview(adjusted);
    const placementSession = session.perpendicularBisectorPlacement;
    session.perpendicularBisectorPlacement = null;
    boardController.clearPreview();
    const halfLength = Math.max(0.2, Number(placementSession.halfLength) || 1);
    runMutation(`perp-bisector${placementSession.variantLabel}`, () => {
      const midpointId = maybeCreateMidpointPoint(placementSession.pointAId, placementSession.pointBId);
      if (!midpointId) {
        return;
      }
      const endId = maybeCreatePerpendicularBisectorEndpointPoint(
        placementSession.pointAId,
        placementSession.pointBId,
        placementSession.side || 1,
        halfLength
      );
      if (!endId) {
        return;
      }
      const segId = makeId("pb");
      addObject({
        id: segId,
        type: "segment",
        pointIds: [midpointId, endId],
        construction: "perpendicularBisector",
        style: { ...defaultStyle(), dash: 0, fixed: true },
      });
      if (placementSession.withMidpointTicks) {
        addAnnotation({
          id: makeId("mdtk"),
          type: "midpointTick",
          pointIds: [placementSession.pointAId, midpointId, placementSession.pointBId],
          tickCount: 1,
          style: defaultStyle(),
        });
      }
      if (placementSession.withRightAngle) {
        addAnnotation({
          id: makeId("ang"),
          type: "angle",
          pointIds: [placementSession.pointAId, midpointId, endId],
          right: true,
          arcCount: 1,
          style: defaultStyle(),
        });
      }
      store.clearSelection();
    });
    updateModeUi();
    return true;
  }

  return {
    handlePerpendicularBisectorPlacementBoardClick,
  };
}
