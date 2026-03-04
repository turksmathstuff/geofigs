export function createLabelManagementWorkflow(ctx) {
  const {
    session,
    ToolMode,
    runMutation,
    openLabelModal,
    getObjectById,
    autoLabelAnchorForObject,
    followLabelForTargetObject,
    setMode,
    makeId,
    addObject,
    defaultStyle,
  } = ctx;

  function isManualLabelTargetType(type) {
    return ["point", "segment", "line", "circle", "parallel", "perpendicular"].includes(type);
  }

  async function addManualLabelAtCoords(coords) {
    if (!coords) {
      return;
    }
    const text = await openLabelModal();
    if (!text) {
      return;
    }
    runMutation("add-label", () => {
      addObject({
        id: makeId("label"),
        type: "label",
        x: coords.x,
        y: coords.y,
        text,
        style: defaultStyle(),
      });
    });
  }

  async function addManualLabelForTarget(targetId) {
    const target = getObjectById(targetId);
    if (!target || !isManualLabelTargetType(target.type)) {
      return;
    }
    const text = await openLabelModal();
    if (!text) {
      return;
    }
    runMutation("add-label", () => {
      const anchor = autoLabelAnchorForObject(target);
      addObject({
        id: makeId("label"),
        type: "label",
        x: anchor.x,
        y: anchor.y,
        text,
        targetId: target.id,
        follow: followLabelForTargetObject(target),
        style: defaultStyle(),
      });
    });
  }

  function toggleManualLabelMode() {
    if (session.currentMode === ToolMode.ADD_LABEL) {
      setMode(ToolMode.SELECT);
    } else {
      setMode(ToolMode.ADD_LABEL);
    }
  }

  return {
    addManualLabelAtCoords,
    addManualLabelForTarget,
    toggleManualLabelMode,
  };
}
