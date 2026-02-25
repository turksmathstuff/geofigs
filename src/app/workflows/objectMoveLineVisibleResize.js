export function createObjectMoveLineVisibleResizeWorkflow(ctx) {
  const {
    store,
    session,
    normalizedLineExtension,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    updateConstrainedPointsLive,
    runMutation,
  } = ctx;

  function handleObjectMoveLineVisibleResize(id, lineObj, pos, transient) {
    if (!lineObj || !(pos && ("lineExtensionStart" in pos || "lineExtensionEnd" in pos))) {
      return false;
    }

    const nextStart = normalizedLineExtension(pos.lineExtensionStart ?? lineObj.style?.lineExtensionStart);
    const nextEnd = normalizedLineExtension(pos.lineExtensionEnd ?? lineObj.style?.lineExtensionEnd);
    const prevStart = normalizedLineExtension(lineObj.style?.lineExtensionStart ?? store.doc.styles.lineExtensionStart);
    const prevEnd = normalizedLineExtension(lineObj.style?.lineExtensionEnd ?? store.doc.styles.lineExtensionEnd);
    if (Math.abs(nextStart - prevStart) < 0.0001 && Math.abs(nextEnd - prevEnd) < 0.0001) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "resize-line-visible");
      }
      return true;
    }

    if (transient) {
      ensureTransientSnapshot(id);
      lineObj.style = lineObj.style || {};
      lineObj.style.lineExtensionStart = nextStart;
      lineObj.style.lineExtensionEnd = nextEnd;
      updateConstrainedPointsLive();
      return true;
    }

    if (session.transientDragSnapshots.has(id)) {
      lineObj.style = lineObj.style || {};
      lineObj.style.lineExtensionStart = nextStart;
      lineObj.style.lineExtensionEnd = nextEnd;
      commitTransientSnapshotIfPresent(id, "resize-line-visible");
      return true;
    }

    runMutation("resize-line-visible", () => {
      lineObj.style = lineObj.style || {};
      lineObj.style.lineExtensionStart = nextStart;
      lineObj.style.lineExtensionEnd = nextEnd;
    });
    return true;
  }

  return {
    handleObjectMoveLineVisibleResize,
  };
}
