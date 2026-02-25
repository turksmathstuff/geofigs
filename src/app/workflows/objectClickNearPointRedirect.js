export function createObjectClickNearPointRedirectWorkflow(ctx) {
  const { boardController, findNearbyVisiblePoint, handleObjectClick } = ctx;

  function handleObjectClickNearPointRedirect(id, type, evt) {
    if (!["segment", "line", "ray", "parallel", "perpendicular", "circle"].includes(type)) {
      return { matched: false };
    }

    const nearPoint = findNearbyVisiblePoint(boardController.getUserCoords(evt), 0.4);
    if (nearPoint && nearPoint.id !== id) {
      return {
        matched: true,
        returnValue: handleObjectClick(nearPoint.id, "point", evt),
      };
    }

    return { matched: false };
  }

  return {
    handleObjectClickNearPointRedirect,
  };
}
