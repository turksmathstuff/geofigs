export function createPointInputLinearCircleCreateWorkflow(ctx) {
  const {
    ToolMode,
    addObject,
    makeId,
    normalizedLineExtension,
    normalizedRayExtension,
    store,
  } = ctx;

  function handlePointInputLinearCircleCreate(modeForCreate, pointsForCreate, style) {
    if (modeForCreate === ToolMode.SEGMENT) {
      addObject({ id: makeId("seg"), type: "segment", pointIds: pointsForCreate, style });
      return true;
    }

    if (modeForCreate === ToolMode.LINE) {
      addObject({
        id: makeId("line"),
        type: "line",
        pointIds: pointsForCreate,
        lineType: "line",
        style: {
          ...style,
          lineExtensionStart: normalizedLineExtension(store.doc.styles.lineExtensionStart),
          lineExtensionEnd: normalizedLineExtension(store.doc.styles.lineExtensionEnd),
        },
      });
      return true;
    }

    if (modeForCreate === ToolMode.RAY) {
      addObject({
        id: makeId("ray"),
        type: "line",
        pointIds: pointsForCreate,
        lineType: "ray",
        style: { ...style, rayExtension: normalizedRayExtension(store.doc.styles.rayExtension) },
      });
      return true;
    }

    if (modeForCreate === ToolMode.CIRCLE) {
      addObject({ id: makeId("circle"), type: "circle", pointIds: pointsForCreate, style });
      return true;
    }

    return false;
  }

  return {
    handlePointInputLinearCircleCreate,
  };
}
