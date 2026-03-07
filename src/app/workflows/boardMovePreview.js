export function createBoardMovePreviewWorkflow(ctx) {
  const {
    getPointInputCoords,
    updateTangentPickPreview,
    updatePerpendicularBisectorPreview,
    updateLinearPreview,
    updateCirclePreview,
    updateAnglePreview,
    updateTrianglePreview,
    updateArc3PtPreview,
    updateArcCSEPreview,
  } = ctx;

  function handleBoardMove(coords, evt) {
    const adjusted = getPointInputCoords(coords, evt);
    if (updateTangentPickPreview?.(adjusted)) {
      return;
    }
    if (updatePerpendicularBisectorPreview(adjusted)) {
      return;
    }
    if (updateLinearPreview(adjusted)) {
      return;
    }
    if (updateCirclePreview(adjusted)) {
      return;
    }
    if (updateAnglePreview(adjusted)) {
      return;
    }
    if (updateArc3PtPreview(adjusted)) {
      return;
    }
    if (updateArcCSEPreview(adjusted)) {
      return;
    }
    updateTrianglePreview(adjusted, evt);
  }

  return {
    handleBoardMove,
  };
}
