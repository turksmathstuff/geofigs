export function createPointInputTriangleCreateWorkflow(ctx) {
  const {
    ToolMode,
    session,
    getPointById,
    rightTriangleApexFromCursor,
    isoscelesApexFromCursor,
    equilateralApexFromCursor,
    triangleVerticesFromVariant,
    addTriangleEdges,
    addAnnotation,
    addObject,
    makeId,
    ccwAnglePointIds,
  } = ctx;

  function handlePointInputTriangleCreate(modeForCreate, pointsForCreate, style) {
    if (modeForCreate !== ToolMode.TRIANGLE) {
      return false;
    }

    if (session.triangleVariant === "three-point") {
      addTriangleEdges(pointsForCreate, style);
      return true;
    }

    if (session.triangleVariant === "right") {
      const pointRight = getPointById(pointsForCreate[0]);
      const pointBase = getPointById(pointsForCreate[1]);
      const cursorPoint = getPointById(pointsForCreate[2]);
      if (!pointRight || !pointBase || !cursorPoint) {
        return true;
      }
      const apex = rightTriangleApexFromCursor(pointRight, pointBase, cursorPoint, {
        forceIsosceles: session.pendingRightTriangleForceIso,
      });
      if (!apex) {
        return true;
      }
      cursorPoint.x = apex.x;
      cursorPoint.y = apex.y;
      cursorPoint.constraint = {
        kind: "rightTriangleApex",
        rightVertexId: pointsForCreate[0],
        baseVertexId: pointsForCreate[1],
        height: apex.height,
      };
      addTriangleEdges([pointsForCreate[0], pointsForCreate[1], pointsForCreate[2]], style);
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        pointIds: ccwAnglePointIds(pointsForCreate[1], pointsForCreate[0], pointsForCreate[2]),
        right: true,
        arcCount: 1,
        style,
      });
      return true;
    }

    if (session.triangleVariant === "isosceles") {
      const pointA = getPointById(pointsForCreate[0]);
      const pointB = getPointById(pointsForCreate[1]);
      const cursorPoint = getPointById(pointsForCreate[2]);
      if (!pointA || !pointB || !cursorPoint) {
        return true;
      }
      const apex = isoscelesApexFromCursor(pointA, pointB, cursorPoint);
      if (!apex) {
        return true;
      }
      cursorPoint.x = apex.x;
      cursorPoint.y = apex.y;
      addTriangleEdges([pointsForCreate[0], pointsForCreate[1], pointsForCreate[2]], style);
      return true;
    }

    if (session.triangleVariant === "equilateral") {
      const pointA = getPointById(pointsForCreate[0]);
      const pointB = getPointById(pointsForCreate[1]);
      const cursorPoint = getPointById(pointsForCreate[2]);
      if (!pointA || !pointB || !cursorPoint) {
        return true;
      }
      const apex = equilateralApexFromCursor(pointA, pointB, cursorPoint);
      if (!apex) {
        return true;
      }
      cursorPoint.x = apex.x;
      cursorPoint.y = apex.y;
      cursorPoint.constraint = {
        kind: "equilateralApex",
        sourcePointIds: [pointsForCreate[0], pointsForCreate[1]],
        side: apex.side,
      };
      addTriangleEdges([pointsForCreate[0], pointsForCreate[1], pointsForCreate[2]], style);
      return true;
    }

    const pointA = getPointById(pointsForCreate[0]);
    const pointB = getPointById(pointsForCreate[1]);
    if (!pointA || !pointB) {
      return true;
    }
    const apex = triangleVerticesFromVariant(pointA, pointB);
    if (!apex) {
      return true;
    }
    const apexId = makeId("pt");
    addObject({
      id: apexId,
      type: "point",
      x: apex.x,
      y: apex.y,
      name: "",
      style,
    });
    addTriangleEdges([pointsForCreate[0], pointsForCreate[1], apexId], style);
    return true;
  }

  return {
    handlePointInputTriangleCreate,
  };
}
