export function createObjectMoveRayVisibleResizeWorkflow(ctx) {
  const {
    session,
    normalizedRayExtension,
    getRayExtensionForObject,
    ensureTransientSnapshot,
    commitTransientSnapshotIfPresent,
    updateConstrainedPointsLive,
    runMutation,
  } = ctx;

  function handleObjectMoveRayVisibleResize(id, rayObj, pos, transient) {
    if (!rayObj || !(pos && "rayExtension" in pos)) {
      return false;
    }

    const nextExt = normalizedRayExtension(pos.rayExtension);
    const prevExt = getRayExtensionForObject(rayObj);
    if (Math.abs(nextExt - prevExt) < 0.0001) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "resize-ray-visible");
      }
      return true;
    }

    if (transient) {
      ensureTransientSnapshot(id);
      rayObj.style = rayObj.style || {};
      rayObj.style.rayExtension = nextExt;
      updateConstrainedPointsLive();
      return true;
    }

    if (session.transientDragSnapshots.has(id)) {
      rayObj.style = rayObj.style || {};
      rayObj.style.rayExtension = nextExt;
      commitTransientSnapshotIfPresent(id, "resize-ray-visible");
      return true;
    }

    runMutation("resize-ray-visible", () => {
      rayObj.style = rayObj.style || {};
      rayObj.style.rayExtension = nextExt;
    });
    return true;
  }

  return {
    handleObjectMoveRayVisibleResize,
  };
}
