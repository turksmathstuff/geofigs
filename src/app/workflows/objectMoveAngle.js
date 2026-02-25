export function createObjectMoveAngleWorkflow(ctx) {
  const {
    store,
    session,
    renderCurrentDoc,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    runMutation,
  } = ctx;

  function angleTargetsFor(ann) {
    return ann.groupId
      ? store.doc.annotations.filter((a) => a.type === "angle" && a.groupId === ann.groupId)
      : [ann];
  }

  function handleObjectMoveAngle(id, type, pos, transient) {
    if (type !== "angle") {
      return false;
    }

    const ann = store.doc.annotations.find((a) => a.id === id && a.type === "angle");
    if (!ann || !pos || !Number.isFinite(pos.radius)) {
      return true;
    }
    const nextRadius = Math.max(0.15, Number(pos.radius));
    const prevRadius = Math.max(0.15, Number(ann.style?.radius || 1));
    if (Math.abs(nextRadius - prevRadius) < 0.0001) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-angle-radius");
      }
      return true;
    }

    if (transient) {
      ensureTransientSnapshot(id);
      const targets = angleTargetsFor(ann);
      for (const target of targets) {
        target.style = target.style || {};
        target.style.radius = nextRadius;
      }
      renderCurrentDoc(false);
      return true;
    }

    if (session.transientDragSnapshots.has(id)) {
      const targets = angleTargetsFor(ann);
      for (const target of targets) {
        target.style = target.style || {};
        target.style.radius = nextRadius;
      }
      commitTransientSnapshotIfPresent(id, "move-angle-radius");
      return true;
    }

    runMutation("move-angle-radius", () => {
      const targets = angleTargetsFor(ann);
      for (const target of targets) {
        target.style = target.style || {};
        target.style.radius = nextRadius;
      }
    });
    return true;
  }

  return {
    handleObjectMoveAngle,
  };
}
