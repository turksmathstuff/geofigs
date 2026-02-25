export function createSelectionClickWorkflow(ctx) {
  const { store, session, ToolMode, boardEl, renderCurrentDoc, updateModeUi } = ctx;

  function handleSelectBoardClick(evt) {
    const tag = String(evt?.target?.tagName || "").toLowerCase();
    const isBoardBackground = tag === "svg" || evt?.target === boardEl;
    if (!isBoardBackground) {
      return false;
    }
    if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
      return false;
    }
    store.clearSelection();
    renderCurrentDoc();
    if (session.constructionSelectionSession) {
      updateModeUi();
    }
    return true;
  }

  function handleSelectObjectClick(id, multi, isReleaseEvent) {
    if (session.currentMode === ToolMode.SELECT && !multi && !isReleaseEvent) {
      return { deferUntilUp: true };
    }

    if (session.currentMode === ToolMode.SELECT || session.currentMode === ToolMode.CONGRUENCY) {
      store.toggleSelection(id, multi);
      renderCurrentDoc();
      return true;
    }

    return false;
  }

  return {
    handleSelectBoardClick,
    handleSelectObjectClick,
  };
}
