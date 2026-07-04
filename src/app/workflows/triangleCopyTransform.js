import { distance } from "../geometry/intersections.js";
import {
  transformPointAround,
  transformPointBySession,
  polygonsOverlap,
  centroid,
  minVertexDistance,
} from "../geometry/transforms.js";

export function segmentConnects(a, b, segment) {
  const [s1, s2] = segment.pointIds;
  return (s1 === a && s2 === b) || (s1 === b && s2 === a);
}

export function createTriangleCopyTransformWorkflow(ctx) {
  const {
    ToolMode,
    session,
    store,
    boardController,
    getPointById,
    getObjectById,
    selectedOfTypes,
    makeId,
    runMutation,
    addObject,
    addTriangleEdges,
    defaultStyle,
    showNotice,
    setMode,
    startConstructionSelectionSession,
    renderCurrentDoc,
    applyDoc,
  } = ctx;
  const {
    transformPanelEl,
    transformTitleEl,
    moveXSliderEl,
    moveYSliderEl,
    moveXValueEl,
    moveYValueEl,
    rotationCompassEl,
    compassArmEl,
    rotateValueEl,
  } = ctx.dom;

  function pointsAreNonCollinear(pointIds) {
    if (pointIds.length !== 3) {
      return false;
    }
    const p1 = getPointById(pointIds[0]);
    const p2 = getPointById(pointIds[1]);
    const p3 = getPointById(pointIds[2]);
    if (!p1 || !p2 || !p3) {
      return false;
    }
    const twiceArea = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x));
    return twiceArea > 1e-5;
  }

  function findTriangleFromSelection() {
    const selectedPoints = selectedOfTypes(["point"]);
    if (selectedPoints.length === 3 && pointsAreNonCollinear(selectedPoints)) {
      return selectedPoints;
    }

    const selectedSegments = selectedOfTypes(["segment"]).map((id) => getObjectById(id));
    if (selectedSegments.length !== 3) {
      return null;
    }
    const pointIdSet = new Set();
    for (const seg of selectedSegments) {
      pointIdSet.add(seg.pointIds[0]);
      pointIdSet.add(seg.pointIds[1]);
    }
    const pointIds = [...pointIdSet];
    if (pointIds.length !== 3 || !pointsAreNonCollinear(pointIds)) {
      return null;
    }

    const [a, b, c] = pointIds;
    const closed =
      selectedSegments.some((s) => segmentConnects(a, b, s)) &&
      selectedSegments.some((s) => segmentConnects(b, c, s)) &&
      selectedSegments.some((s) => segmentConnects(c, a, s));
    return closed ? pointIds : null;
  }

  function triangleSegmentIds(pointIds) {
    const set = new Set(pointIds);
    return store.doc.objects
      .filter((o) => o.type === "segment" && set.has(o.pointIds?.[0]) && set.has(o.pointIds?.[1]))
      .map((o) => o.id);
  }

  function resolveTriangleOffsetNoOverlap(sourcePoints, transformedPoints, baseOffset, span) {
    const srcCent = centroid(sourcePoints);
    let dir = { x: baseOffset.x, y: baseOffset.y };
    const dirLen = Math.hypot(dir.x, dir.y);
    if (dirLen < 1e-9) {
      dir = { x: 1, y: 0.12 };
    } else {
      dir.x /= dirLen;
      dir.y /= dirLen;
    }

    let candidate = transformedPoints;
    let safety = 0;
    const step = Math.max(0.18 * span, 0.22);
    while (
      (polygonsOverlap(sourcePoints, candidate) || minVertexDistance(sourcePoints, candidate, distance) < 0.18 * span) &&
      safety < 40
    ) {
      const shift = step * (safety + 1);
      candidate = candidate.map((p) => ({ x: p.x + dir.x * shift, y: p.y + dir.y * shift }));
      safety += 1;
    }

    // Fallback: if still overlapping, push directly away from source centroid.
    if (polygonsOverlap(sourcePoints, candidate)) {
      candidate = candidate.map((p) => {
        const vx = p.x - srcCent.x;
        const vy = p.y - srcCent.y;
        const vLen = Math.hypot(vx, vy) || 1;
        return {
          x: p.x + (vx / vLen) * 0.6 * span,
          y: p.y + (vy / vLen) * 0.6 * span,
        };
      });
    }

    return candidate;
  }

  function findTriangleSegmentStyle(pointIds) {
    for (const obj of store.doc.objects) {
      if (obj.type !== "segment") {
        continue;
      }
      const [a, b] = obj.pointIds;
      if (pointIds.includes(a) && pointIds.includes(b)) {
        return obj.style || defaultStyle();
      }
    }
    return defaultStyle();
  }

  function chooseCopyOffset(sourcePoints, span, offsetFactorX, offsetFactorY) {
    const xs = sourcePoints.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const bbox = boardController.getBoardBBox();
    const boardLeft = Math.min(bbox[0], bbox[2]);
    const boardRight = Math.max(bbox[0], bbox[2]);
    const leftRoom = minX - boardLeft;
    const rightRoom = boardRight - maxX;
    const direction = rightRoom >= leftRoom ? 1 : -1;
    return {
      x: direction * span * offsetFactorX,
      y: span * offsetFactorY,
    };
  }

  function createTriangleCopyFromSelection({ scale, rotateDeg, offsetFactorX, offsetFactorY, label }, options = {}) {
    const quiet = !!options.quiet;
    const sourcePointIds = findTriangleFromSelection();
    if (!sourcePointIds) {
      if (!quiet) {
        showNotice("Select one triangle first (3 points or its 3 sides).");
        setMode(ToolMode.SELECT);
      }
      return false;
    }

    runMutation(label, () => {
      const sourcePoints = sourcePointIds.map((id) => getPointById(id));
      const center = {
        x: (sourcePoints[0].x + sourcePoints[1].x + sourcePoints[2].x) / 3,
        y: (sourcePoints[0].y + sourcePoints[1].y + sourcePoints[2].y) / 3,
      };
      const span = Math.max(
        distance(sourcePoints[0], sourcePoints[1]),
        distance(sourcePoints[1], sourcePoints[2]),
        distance(sourcePoints[2], sourcePoints[0])
      );
      const offset = chooseCopyOffset(sourcePoints, span, offsetFactorX, offsetFactorY);
      const angleRad = (rotateDeg * Math.PI) / 180;
      const segStyle = findTriangleSegmentStyle(sourcePointIds);

      const transformedPoints = sourcePoints.map((source) =>
        transformPointAround(source, center, scale, angleRad, offset)
      );
      const nonOverlapping = resolveTriangleOffsetNoOverlap(sourcePoints, transformedPoints, offset, span);

      const newPointIds = [];
      for (let i = 0; i < nonOverlapping.length; i += 1) {
        const id = makeId("pt");
        addObject({
          id,
          type: "point",
          x: nonOverlapping[i].x,
          y: nonOverlapping[i].y,
          name: "",
          style: sourcePoints[i].style || defaultStyle(),
        });
        newPointIds.push(id);
      }
      addTriangleEdges(newPointIds, segStyle);
      store.clearSelection();
    });
    return true;
  }

  function createCongruentTriangleCopy(options = {}) {
    return createTriangleCopyFromSelection({
      scale: 1,
      rotateDeg: 0,
      offsetFactorX: 0.95,
      offsetFactorY: 0.03,
      label: "create-congruent-triangle",
    }, options);
  }

  function createSimilarTriangleCopy(options = {}) {
    return createTriangleCopyFromSelection({
      scale: 1.45,
      rotateDeg: 0,
      offsetFactorX: 1.1,
      offsetFactorY: 0.03,
      label: "create-similar-triangle",
    }, options);
  }

  function triangleCentroid(pointIds) {
    const pts = pointIds.map((id) => getPointById(id)).filter(Boolean);
    if (pts.length !== 3) {
      return null;
    }
    return {
      x: (pts[0].x + pts[1].x + pts[2].x) / 3,
      y: (pts[0].y + pts[1].y + pts[2].y) / 3,
    };
  }

  function startTriangleTransformSession(kind, options = {}) {
    const quiet = !!options.quiet;
    const pointIds = findTriangleFromSelection();
    if (!pointIds) {
      if (!quiet) {
        showNotice("Select one triangle first (3 points or its 3 sides).");
        setMode(ToolMode.SELECT);
      }
      return false;
    }

    const basePoints = {};
    for (const id of pointIds) {
      const p = getPointById(id);
      if (!p) {
        return false;
      }
      basePoints[id] = { x: p.x, y: p.y };
    }
    const center = triangleCentroid(pointIds);
    if (!center) {
      return false;
    }

    const triSegmentIds = triangleSegmentIds(pointIds);
    const targetIds = new Set([...pointIds, ...triSegmentIds]);
    const labelIds = [];
    const baseLabelPoints = {};
    for (const obj of store.doc.objects) {
      if (obj.type !== "label" || !obj.targetId) {
        continue;
      }
      if (!targetIds.has(obj.targetId)) {
        continue;
      }
      labelIds.push(obj.id);
      baseLabelPoints[obj.id] = { x: obj.x, y: obj.y };
    }

    session.transformSession = {
      kind,
      pointIds,
      segmentIds: triSegmentIds,
      labelIds,
      center,
      basePoints,
      baseLabelPoints,
      beforeDoc: store.snapshot(),
      dx: 0,
      dy: 0,
      angleDeg: 0,
      mirrorX: 1,
      mirrorY: 1,
    };
    return true;
  }

  function applyTransformPreview() {
    if (!session.transformSession) {
      return;
    }
    const { pointIds, labelIds, basePoints, baseLabelPoints, center, dx, dy, angleDeg, mirrorX, mirrorY } = session.transformSession;
    const angleRad = (angleDeg * Math.PI) / 180;
    for (const id of pointIds) {
      const base = basePoints[id];
      const target = getPointById(id);
      if (!base || !target) {
        continue;
      }
      const transformed = transformPointBySession(base, center, angleRad, { x: dx, y: dy }, mirrorX, mirrorY);
      target.x = transformed.x;
      target.y = transformed.y;
    }

    for (const labelId of labelIds) {
      const base = baseLabelPoints[labelId];
      const labelObj = getObjectById(labelId);
      if (!base || !labelObj || labelObj.type !== "label") {
        continue;
      }
      const transformed = transformPointBySession(base, center, angleRad, { x: dx, y: dy }, mirrorX, mirrorY);
      labelObj.x = transformed.x;
      labelObj.y = transformed.y;
    }

    renderCurrentDoc(false);
  }

  function showTransformPanel() {
    if (!transformPanelEl) {
      return;
    }
    transformPanelEl.hidden = false;
    transformTitleEl.textContent = "Rotate/Slide Triangle";
  }

  function hideTransformPanel() {
    if (transformPanelEl) {
      transformPanelEl.hidden = true;
    }
    if (rotationCompassEl) {
      rotationCompassEl.classList.remove("dragging");
    }
    session.compassDragging = false;
  }

  function commitTransformSession(label) {
    if (!session.transformSession) {
      return;
    }
    const after = store.snapshot();
    store.doc.metadata.updatedAt = new Date().toISOString();
    store.commitSnapshot(label, session.transformSession.beforeDoc, after, applyDoc);
    session.transformSession = null;
    hideTransformPanel();
    renderCurrentDoc();
  }

  function cancelTransformSession() {
    if (!session.transformSession) {
      hideTransformPanel();
      return;
    }
    store.setDoc(session.transformSession.beforeDoc);
    session.transformSession = null;
    hideTransformPanel();
    renderCurrentDoc();
  }

  function updateMoveReadouts() {
    if (!session.transformSession) {
      return;
    }
    if (moveXValueEl) {
      moveXValueEl.textContent = session.transformSession.dx.toFixed(1);
    }
    if (moveYValueEl) {
      moveYValueEl.textContent = session.transformSession.dy.toFixed(1);
    }
  }

  function updateCompassReadout() {
    if (!session.transformSession) {
      return;
    }
    if (rotateValueEl) {
      rotateValueEl.textContent = `${session.transformSession.angleDeg.toFixed(1)}°`;
    }
    if (compassArmEl) {
      compassArmEl.style.transform = `translateY(-50%) rotate(${session.transformSession.angleDeg}deg)`;
    }
  }

  function angleFromCompassEvent(evt) {
    const rect = rotationCompassEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = evt.clientX - cx;
    const dy = evt.clientY - cy;
    const rad = Math.atan2(dy, dx);
    return (rad * 180) / Math.PI;
  }

  function beginTransformPanel() {
    session.transformSession.dx = 0;
    session.transformSession.dy = 0;
    session.transformSession.angleDeg = 0;
    session.transformSession.mirrorX = 1;
    session.transformSession.mirrorY = 1;
    showTransformPanel();
    if (moveXSliderEl) {
      moveXSliderEl.value = "0";
    }
    if (moveYSliderEl) {
      moveYSliderEl.value = "0";
    }
    updateMoveReadouts();
    updateCompassReadout();
    applyTransformPreview();
  }

  function launchTriangleCopy(kind, buttonId) {
    const createFn = kind === "congruent" ? createCongruentTriangleCopy : createSimilarTriangleCopy;
    if (createFn({ quiet: true })) {
      return;
    }
    startConstructionSelectionSession({
      kind: `triangle-${kind}`,
      label: kind === "congruent" ? "Congruent Triangle" : "Similar Triangle",
      buttonId,
      instructions: "Select one triangle (3 points or its 3 sides).",
      tryCreate: () => createFn({ quiet: true }),
    });
  }

  function launchTriangleTransform(buttonId) {
    if (startTriangleTransformSession("transform", { quiet: true })) {
      beginTransformPanel();
      return;
    }
    startConstructionSelectionSession({
      kind: "triangle-transform",
      label: "Rotate/Slide Triangle",
      buttonId,
      instructions: "Select one triangle (3 points or its 3 sides).",
      tryCreate: () => {
        if (!startTriangleTransformSession("transform", { quiet: true })) {
          return false;
        }
        beginTransformPanel();
        return true;
      },
    });
  }

  return {
    findTriangleFromSelection,
    launchTriangleCopy,
    launchTriangleTransform,
    cancelTransformSession,
    commitTransformSession,
    applyTransformPreview,
    updateMoveReadouts,
    updateCompassReadout,
    angleFromCompassEvent,
  };
}
