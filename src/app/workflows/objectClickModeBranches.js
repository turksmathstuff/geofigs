export function createObjectClickModeBranchesWorkflow(ctx) {
  const { session, ToolMode, store, deleteSelected, toggleAutoLabelForObject } = ctx;

  function handleObjectClickModeBranches(id) {
    if (session.currentMode === ToolMode.POINT) {
      return { matched: true, returnValue: false };
    }

    if (session.currentMode === ToolMode.DELETE) {
      store.clearSelection();
      store.selection.add(id);
      deleteSelected();
      return { matched: true, returnValue: undefined };
    }

    if (session.currentMode === ToolMode.LABEL) {
      toggleAutoLabelForObject(id);
      return { matched: true, returnValue: undefined };
    }

    return { matched: false };
  }

  return {
    handleObjectClickModeBranches,
  };
}
