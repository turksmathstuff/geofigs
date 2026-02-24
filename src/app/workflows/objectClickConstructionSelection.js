export function createObjectClickConstructionSelectionWorkflow(ctx) {
  const { session, store, renderCurrentDoc, maybeCompleteConstructionSelectionSession } = ctx;

  function handleObjectClickConstructionSelection(id, multi, isReleaseEvent) {
    if (!session.constructionSelectionSession) {
      return { matched: false };
    }

    if (!multi && !isReleaseEvent) {
      return { matched: true, returnValue: { deferUntilUp: true } };
    }

    if (multi) {
      store.toggleSelection(id, true);
    } else {
      store.selection.add(id);
    }
    renderCurrentDoc();
    maybeCompleteConstructionSelectionSession();
    return { matched: true, returnValue: undefined };
  }

  return {
    handleObjectClickConstructionSelection,
  };
}
