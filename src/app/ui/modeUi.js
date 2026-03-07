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
    if (mode === ToolMode.ADD_LABEL) {
      return "Add Label";
    }
    if (mode === ToolMode.LABEL) {
      return "Auto Label";
    }
    if (mode === ToolMode.ARC_3PT) {
      return "Arc: 3 Pts On";
    }
    if (mode === ToolMode.ARC_CSE) {
      return "Arc: Ctr–Start–End";
    }
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function canvasHintText() {
    if (session.tangentPickState) {
      const n = session.tangentPickState.staged.length;
      if (n === 0) return "Hover a tangent line to highlight it, then click to commit. Click empty space or Esc to cancel.";
      return "Click the other tangent to also commit it, or click empty space or Esc to finish.";
    }
    if (session.tangentAtPointPlacement) {
      return "Move cursor to set tangent length and direction, then click to place.";
    }
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
    if (session.currentMode === ToolMode.ADD_LABEL) {
      return "Click an object to add a linked label, or click empty space for a free label.";
    }
    if (session.currentMode === ToolMode.SELECT) {
      return "Hold Shift to select more than one object. Drag to box-select.";
    }
    if ([ToolMode.SEGMENT, ToolMode.LINE, ToolMode.RAY, ToolMode.TRIANGLE].includes(session.currentMode)) {
      return "Hold Shift to move horizontal/vertical.";
    }
    if (session.currentMode === ToolMode.ARC_3PT) {
      return "Click start point, a point on the arc, then end point.";
    }
    if (session.currentMode === ToolMode.ARC_CSE) {
      const n = session.pendingPointIds?.length ?? 0;
      if (n === 0) return "Click center point.";
      if (n === 1) return "Click start point (sets radius).";
      return "Move toward minor or major arc, then click to set end.";
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
      session.constructionSelectionSession?.buttonId ||
      session.perpendicularBisectorPlacement?.buttonId ||
      session.tangentAtPointPlacement?.buttonId ||
      null;
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
    if (dom.addLabelBtn) {
      dom.addLabelBtn.classList.toggle("active", session.currentMode === ToolMode.ADD_LABEL);
    }
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
    if (session.tangentPickState) {
      const n = session.tangentPickState.staged.length;
      dom.statusEl.textContent = `Mode: Tangent pick (${n}/2 committed)`;
    } else if (session.constructionSelectionSession) {
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
