export function createBoardMovePreviewWorkflow(ctx) {
  const {
    getPointInputCoords,
    updatePerpendicularBisectorPreview,
    updateLinearPreview,
    updateCirclePreview,
    updateAnglePreview,
    updateTrianglePreview,
  } = ctx;

  function handleBoardMove(coords, evt) {
    const adjusted = getPointInputCoords(coords, evt);
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
    updateTrianglePreview(adjusted, evt);
  }

  return {
    handleBoardMove,
  };
}
