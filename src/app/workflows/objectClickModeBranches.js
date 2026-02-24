export function createObjectClickModeBranchesWorkflow(ctx) {
  const { session, ToolMode, store, deleteSelected } = ctx;

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

    return { matched: false };
  }

  return {
    handleObjectClickModeBranches,
  };
}
