export function createModeUi({
  store,
  session,
  dom,
  ToolMode,
  constructionSelectionButtonIds,
  getButtonById,
  getRightAngleButton,
}) {
  function modeLabel(mode) {
    if (mode === ToolMode.TRIANGLE) {
      if (session.triangleVariant === "right") {
        return "Right Triangle";
      }
      if (session.triangleVariant === "isosceles") {
        return "Isosceles Triangle";
      }
      if (session.triangleVariant === "equilateral") {
        return "Equilateral Triangle";
      }
      return "3-Point Triangle";
    }
    if (mode === ToolMode.LABEL) {
      return "Auto Label";
    }
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function canvasHintText() {
    if (session.constructionSelectionSession) {
      return `${session.constructionSelectionSession.instructions} Press Esc to cancel.`;
    }
    if (session.currentMode === ToolMode.ANGLE) {
      return "Select point, vertex, point.";
    }
    if (session.currentMode === ToolMode.TRIANGLE && session.triangleVariant === "right") {
      return "Right angle first, then base vertex, then height.";
    }
    if (session.currentMode === ToolMode.TRIANGLE && session.triangleVariant === "equilateral") {
      return "Pick two base vertices, then click the side for the third vertex.";
    }
    if (session.currentMode === ToolMode.LABEL) {
      return "Click objects to add label. Click labeled objects to remove label.";
    }
    if (session.currentMode === ToolMode.SELECT) {
      return "Hold Shift to select more than one object. Drag to box-select.";
    }
    if ([ToolMode.SEGMENT, ToolMode.LINE, ToolMode.RAY, ToolMode.TRIANGLE].includes(session.currentMode)) {
      return "Hold Shift to move horizontal/vertical.";
    }
    return "";
  }

  function constructionSelectionStatusText() {
    if (!session.constructionSelectionSession) {
      return `Mode: ${modeLabel(session.currentMode)}`;
    }
    const count = store.selectedIds().length;
    return `Mode: ${session.constructionSelectionSession.label} (${count} selected, Esc = Select)`;
  }

  function updateModeUi() {
    const activeConstructionButtonId =
      session.constructionSelectionSession?.buttonId || session.perpendicularBisectorPlacement?.buttonId || null;
    dom.modeButtons.forEach((btn) => {
      const isSelectButton = btn.dataset.mode === ToolMode.SELECT;
      const isModeActive = btn.dataset.mode === session.currentMode;
      btn.classList.toggle("active", isModeActive && !(isSelectButton && activeConstructionButtonId));
    });
    if (dom.triangleMenuBtn) {
      dom.triangleMenuBtn.classList.toggle("active", session.currentMode === ToolMode.TRIANGLE);
    }
    dom.triangleModeButtons.forEach((btn) => {
      btn.classList.toggle("active", session.currentMode === ToolMode.TRIANGLE && btn.dataset.triangleMode === session.triangleVariant);
    });
    if (dom.autoLabelBtn) {
      dom.autoLabelBtn.classList.toggle("active", session.currentMode === ToolMode.LABEL);
    }
    dom.angleMarkPresetButtons.forEach((btn) => {
      const isActivePreset =
        session.currentMode === ToolMode.ANGLE &&
        !session.pendingAngleIsRight &&
        !!session.activeAngleMarkPresetValue &&
        btn.dataset.angleMark === session.activeAngleMarkPresetValue;
      btn.classList.toggle("active", isActivePreset);
    });
    const rightAngleBtn = getRightAngleButton();
    if (rightAngleBtn) {
      rightAngleBtn.classList.toggle("active", session.currentMode === ToolMode.ANGLE && session.pendingAngleIsRight);
    }
    for (const id of constructionSelectionButtonIds) {
      const btn = getButtonById(id);
      if (btn) {
        btn.classList.toggle("active", id === activeConstructionButtonId);
      }
    }
    if (session.constructionSelectionSession) {
      dom.statusEl.textContent = constructionSelectionStatusText();
    } else {
      dom.statusEl.textContent = `Mode: ${modeLabel(session.currentMode)}`;
    }
    if (dom.drawingHintEl) {
      const text = canvasHintText();
      dom.drawingHintEl.textContent = text;
      dom.drawingHintEl.hidden = !text;
    }
  }

  return {
    modeLabel,
    canvasHintText,
    constructionSelectionStatusText,
    updateModeUi,
  };
}
