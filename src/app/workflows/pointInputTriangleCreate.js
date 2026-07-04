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

  // Variants that reposition the third (cursor) point onto a computed apex.
  // `constraintFor` pins the apex point; `afterEdges` adds variant decorations.
  const apexVariants = {
    right: {
      computeApex: (pointA, pointB, cursorPoint) =>
        rightTriangleApexFromCursor(pointA, pointB, cursorPoint, {
          forceIsosceles: session.pendingRightTriangleForceIso,
        }),
      constraintFor: (apex, pointIds) => ({
        kind: "rightTriangleApex",
        rightVertexId: pointIds[0],
        baseVertexId: pointIds[1],
        height: apex.height,
      }),
      afterEdges: (pointIds, style) => {
        addAnnotation({
          id: makeId("ang"),
          type: "angle",
          pointIds: ccwAnglePointIds(pointIds[1], pointIds[0], pointIds[2]),
          right: true,
          arcCount: 1,
          style,
        });
      },
    },
    isosceles: {
      computeApex: (pointA, pointB, cursorPoint) => isoscelesApexFromCursor(pointA, pointB, cursorPoint),
    },
    equilateral: {
      computeApex: (pointA, pointB, cursorPoint) => equilateralApexFromCursor(pointA, pointB, cursorPoint),
      constraintFor: (apex, pointIds) => ({
        kind: "equilateralApex",
        sourcePointIds: [pointIds[0], pointIds[1]],
        side: apex.side,
      }),
    },
  };

  function handlePointInputTriangleCreate(modeForCreate, pointsForCreate, style) {
    if (modeForCreate !== ToolMode.TRIANGLE) {
      return false;
    }

    if (session.triangleVariant === "three-point") {
      addTriangleEdges(pointsForCreate, style);
      return true;
    }

    const variant = apexVariants[session.triangleVariant];
    if (variant) {
      const pointA = getPointById(pointsForCreate[0]);
      const pointB = getPointById(pointsForCreate[1]);
      const cursorPoint = getPointById(pointsForCreate[2]);
      if (!pointA || !pointB || !cursorPoint) {
        return true;
      }
      const apex = variant.computeApex(pointA, pointB, cursorPoint);
      if (!apex) {
        return true;
      }
      cursorPoint.x = apex.x;
      cursorPoint.y = apex.y;
      if (variant.constraintFor) {
        cursorPoint.constraint = variant.constraintFor(apex, pointsForCreate);
      }
      addTriangleEdges([pointsForCreate[0], pointsForCreate[1], pointsForCreate[2]], style);
      variant.afterEdges?.(pointsForCreate, style);
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
