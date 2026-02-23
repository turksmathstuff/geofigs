import { BoardController } from "./board/boardController.js";
import { AppStore } from "./state/store.js";
import { ToolMode, isToolMode } from "./state/toolModes.js";
import {
  createEmptyFigureDoc,
  cloneFigureDoc,
  validateFigureDoc,
} from "./state/figureDoc.js";
import { exportSVG, triggerDownload } from "./export/exportSvg.js";
import { exportPNG, downloadBlob } from "./export/exportPng.js";
import { makeId } from "./utils/ids.js";
import { timestampForFile } from "./utils/time.js";
import {
  distance,
  intersectInfiniteLines,
  pointFitsLinearDef,
  pointFitsIntersectionDef,
  nearestPointOnLinearDef,
  nearestPointOnCircleDef,
  nearestPointOnDef,
  intersectLineAndCircle,
} from "./app/geometry/intersections.js";
import { angleDegrees, nestedAngleArcRadii } from "./app/geometry/angles.js";
import {
  transformPointAround,
  transformPointBySession,
  projectPolygon,
  polygonsOverlap,
  centroid,
  minVertexDistance,
} from "./app/geometry/transforms.js";
import { normalizedRayExtension, normalizedLineExtension, rayEndpoint } from "./app/geometry/linear.js";
import { createEditorSession } from "./app/session/editorSession.js";

const store = new AppStore();
// Phase 2 scaffolding: session object will replace file-scope mutable state incrementally.
const session = createEditorSession();
const statusEl = document.getElementById("statusText");
const drawingHintEl = document.getElementById("drawingHint");
const autoLabelBtn = document.getElementById("autoLabel");
const boardEl = document.getElementById("jxgbox");
const transformPanelEl = document.getElementById("transformPanel");
const transformTitleEl = document.getElementById("transformTitle");
const moveXSliderEl = document.getElementById("moveXSlider");
const moveYSliderEl = document.getElementById("moveYSlider");
const moveXValueEl = document.getElementById("moveXValue");
const moveYValueEl = document.getElementById("moveYValue");
const rotationCompassEl = document.getElementById("rotationCompass");
const compassArmEl = document.getElementById("compassArm");
const rotateValueEl = document.getElementById("rotateValue");
const modeButtons = [...document.querySelectorAll("button[data-mode]")];
const triangleMenuBtn = document.getElementById("triangleMenuBtn");
const triangleMenuPanel = document.getElementById("triangleMenuPanel");
const triangleModeButtons = [...document.querySelectorAll("button[data-triangle-mode]")];
const angleMarkPresetButtons = [...document.querySelectorAll("button[data-angle-mark]")];
const constructionSelectionButtonIds = [
  "makeMidpoint",
  "makeMidpointTick1",
  "makeMidpointTick2",
  "makeMidpointTick3",
  "makeParallel",
  "makePerpendicular",
  "makePerpBisector",
  "makePerpBisectorRA",
  "makePerpBisectorTicks",
  "makePerpBisectorBoth",
  "makeAngleBisector",
  "makeAngleBisectorTick1",
  "makeAngleBisectorTick2",
  "makeAngleBisectorTick3",
  "makeCongruentTriangle",
  "makeSimilarTriangle",
  "transformSelectedTriangle",
  "markTick1",
  "markTick2",
  "markTick3",
  "markParallel1",
  "markParallel2",
  "markParallel3",
  "addSideMeasure",
  "addAngleMeasure",
];

let marqueeState = null;
const transientDragSnapshots = new Map();

const boardController = new BoardController(
  "jxgbox",
  (coords, evt) => handleBoardClick(coords, evt),
  (id, type, evt) => handleObjectClick(id, type, evt),
  (coords, evt) => handleBoardMove(coords, evt),
  (id, type, pos, options) => handleObjectMove(id, type, pos, options)
);
boardController.init();

function defaultStyle() {
  const styles = store.doc.styles;
  return {
    strokeColor: styles.examMode ? "#000000" : styles.defaultStrokeColor,
    strokeWidth: styles.defaultStrokeWidth,
    dash: styles.defaultDash,
    rayExtension: styles.rayExtension,
    lineExtensionStart: styles.lineExtensionStart,
    lineExtensionEnd: styles.lineExtensionEnd,
    fontSize: styles.fontSize,
  };
}

function defaultIntersectionPointColor() {
  return store.doc.styles.examMode ? "#000000" : "#ff0033";
}

function defaultAttachedPointColor() {
  return store.doc.styles.examMode ? "#000000" : "#00c7b7";
}

function getRayExtensionForObject(obj) {
  return normalizedRayExtension(obj?.style?.rayExtension ?? store.doc.styles.rayExtension);
}

function getLineExtentsForObject(obj) {
  return {
    start: normalizedLineExtension(obj?.style?.lineExtensionStart ?? store.doc.styles.lineExtensionStart),
    end: normalizedLineExtension(obj?.style?.lineExtensionEnd ?? store.doc.styles.lineExtensionEnd),
  };
}

function modeLabel(mode) {
  if (mode === ToolMode.TRIANGLE) {
    if (session.triangleVariant === "right") {
      return "Right Triangle";
    }
    if (session.triangleVariant === "isosceles") {
      return "Isosceles Triangle";
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

function updateModeUi() {
  const activeConstructionButtonId =
    session.constructionSelectionSession?.buttonId || session.perpendicularBisectorPlacement?.buttonId || null;
  modeButtons.forEach((btn) => {
    const isSelectButton = btn.dataset.mode === ToolMode.SELECT;
    const isModeActive = btn.dataset.mode === session.currentMode;
    btn.classList.toggle("active", isModeActive && !(isSelectButton && activeConstructionButtonId));
  });
  if (triangleMenuBtn) {
    triangleMenuBtn.classList.toggle("active", session.currentMode === ToolMode.TRIANGLE);
  }
  triangleModeButtons.forEach((btn) => {
    btn.classList.toggle("active", session.currentMode === ToolMode.TRIANGLE && btn.dataset.triangleMode === session.triangleVariant);
  });
  if (autoLabelBtn) {
    autoLabelBtn.classList.toggle("active", session.currentMode === ToolMode.LABEL);
  }
  angleMarkPresetButtons.forEach((btn) => {
    const isActivePreset =
      session.currentMode === ToolMode.ANGLE &&
      !session.pendingAngleIsRight &&
      !!session.activeAngleMarkPresetValue &&
      btn.dataset.angleMark === session.activeAngleMarkPresetValue;
    btn.classList.toggle("active", isActivePreset);
  });
  const rightAngleBtn = document.getElementById("markRightAngle");
  if (rightAngleBtn) {
    rightAngleBtn.classList.toggle("active", session.currentMode === ToolMode.ANGLE && session.pendingAngleIsRight);
  }
  for (const id of constructionSelectionButtonIds) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle("active", id === activeConstructionButtonId);
    }
  }
  if (session.constructionSelectionSession) {
    statusEl.textContent = constructionSelectionStatusText();
  } else {
    statusEl.textContent = `Mode: ${modeLabel(session.currentMode)}`;
  }
  if (drawingHintEl) {
    const text = canvasHintText();
    drawingHintEl.textContent = text;
    drawingHintEl.hidden = !text;
  }
}

function setMode(mode) {
  if (!isToolMode(mode)) {
    return;
  }
  if (session.transformSession) {
    cancelTransformSession();
  }
  session.perpendicularBisectorPlacement = null;
  session.constructionSelectionSession = null;
  session.currentMode = mode;
  session.pendingPointIds = [];
  if (mode !== ToolMode.ANGLE) {
    session.pendingAngleIsRight = false;
    session.pendingAngleArcCount = 1;
    session.pendingAngleDecorator = "arc";
    session.activeAngleMarkPresetValue = null;
  }
  boardController.clearPreview();
  updateModeUi();
  renderCurrentDoc();
}

function constructionSelectionStatusText() {
  if (!session.constructionSelectionSession) {
    return `Mode: ${modeLabel(session.currentMode)}`;
  }
  const count = store.selectedIds().length;
  return `Mode: ${session.constructionSelectionSession.label} (${count} selected, Esc = Select)`;
}

function startConstructionSelectionSession(selectionSession) {
  if (!selectionSession) {
    return;
  }
  if (session.currentMode !== ToolMode.SELECT) {
    setMode(ToolMode.SELECT);
  } else {
    session.perpendicularBisectorPlacement = null;
    session.pendingPointIds = [];
    boardController.clearPreview();
  }
  session.constructionSelectionSession = selectionSession;
  store.clearSelection();
  updateModeUi();
  renderCurrentDoc(false);
}

function finishConstructionSelectionSession() {
  session.constructionSelectionSession = null;
  if (!session.perpendicularBisectorPlacement) {
    updateModeUi();
    renderCurrentDoc(false);
  }
}

function maybeCompleteConstructionSelectionSession() {
  if (!session.constructionSelectionSession) {
    return false;
  }
  const ok = session.constructionSelectionSession.tryCreate?.();
  if (!ok) {
    updateModeUi();
    return false;
  }
  if (session.constructionSelectionSession.persistAfterSuccess) {
    if (session.constructionSelectionSession.clearSelectionAfterSuccess !== false) {
      store.clearSelection();
    }
    updateModeUi();
    renderCurrentDoc(false);
    return true;
  }
  finishConstructionSelectionSession();
  return true;
}

function setTriangleMode(variant) {
  const valid = ["three-point", "right", "isosceles"];
  if (!valid.includes(variant)) {
    return;
  }
  session.triangleVariant = variant;
  setMode(ToolMode.TRIANGLE);
}

function pointNeeds(mode) {
  if (mode === ToolMode.SEGMENT || mode === ToolMode.LINE || mode === ToolMode.RAY) {
    return 2;
  }
  if (mode === ToolMode.TRIANGLE) {
    return 3;
  }
  if (mode === ToolMode.ANGLE) {
    return 3;
  }
  if (mode === ToolMode.CIRCLE) {
    return 2;
  }
  return 0;
}

function getObjectById(id) {
  return store.doc.objects.find((o) => o.id === id);
}

function getPointById(id) {
  const o = getObjectById(id);
  return o && o.type === "point" ? o : null;
}

function findNearbyVisiblePoint(coords, threshold = 0.55) {
  if (!coords) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const obj of store.doc.objects) {
    if (obj.type !== "point" || obj.hidden) {
      continue;
    }
    const d = distance(coords, obj);
    if (d < threshold && d < bestDist) {
      best = obj;
      bestDist = d;
    }
  }
  return best;
}

function axisLockAnchorForDraggedPoint(pointId) {
  for (const obj of store.doc.objects) {
    if (!Array.isArray(obj.pointIds) || obj.pointIds.length < 2) {
      continue;
    }
    if (obj.type !== "segment" && obj.type !== "line") {
      continue;
    }
    const [a, b] = obj.pointIds;
    if (a === pointId && b !== pointId) {
      return getPointById(b);
    }
    if (b === pointId && a !== pointId) {
      return getPointById(a);
    }
  }
  return null;
}

function maybeAxisLockDraggedPoint(pointId, pos, options = {}) {
  if (!options?.shiftKey || !pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    return pos;
  }
  const anchor = axisLockAnchorForDraggedPoint(pointId);
  if (!anchor) {
    return pos;
  }
  return snapToAxis(anchor, pos);
}

function applyPointConstraintToDraggedPosition(pointObj, pos) {
  if (!pointObj?.constraint || !pos) {
    return { pos, changedConstraint: false };
  }
  if (
    pointObj.constraint.kind === "intersection" ||
    pointObj.constraint.kind === "midpoint" ||
    pointObj.constraint.kind === "angleBisectorRay"
  ) {
    return { pos: { x: pointObj.x, y: pointObj.y }, changedConstraint: false };
  }
  if (pointObj.constraint.kind === "perpendicularBisectorEndpoint") {
    const [id1, id2] = pointObj.constraint.sourcePointIds || [];
    const p1 = getPointById(id1);
    const p2 = getPointById(id2);
    if (!p1 || !p2) {
      return { pos, changedConstraint: false };
    }
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      return { pos: { x: pointObj.x, y: pointObj.y }, changedConstraint: false };
    }
    const px = -dy / len;
    const py = dx / len;
    const vx = pos.x - mx;
    const vy = pos.y - my;
    const signed = vx * px + vy * py;
    const side = signed >= 0 ? 1 : -1;
    const halfLength = Math.max(0.2, Math.abs(signed));
    pointObj.constraint.side = side;
    pointObj.constraint.halfLength = halfLength;
    return {
      pos: { x: mx + px * halfLength * side, y: my + py * halfLength * side },
      changedConstraint: true,
    };
  }
  if (pointObj.constraint.kind === "rightTriangleApex") {
    const rightVertex = getPointById(pointObj.constraint.rightVertexId);
    const baseVertex = getPointById(pointObj.constraint.baseVertexId);
    if (!rightVertex || !baseVertex) {
      return { pos, changedConstraint: false };
    }
    const projected = rightTriangleApexFromCursor(rightVertex, baseVertex, pos);
    if (!projected) {
      return { pos, changedConstraint: false };
    }
    pointObj.constraint.height = projected.height;
    return {
      pos: { x: projected.x, y: projected.y },
      changedConstraint: true,
    };
  }
  if (pointObj.constraint.kind !== "onObject") {
    return { pos, changedConstraint: false };
  }
  const source = getObjectById(pointObj.constraint.sourceObjectId);
  const def = getIntersectionDefinition(source);
  if (!def) {
    return { pos, changedConstraint: false };
  }
  const projected = nearestPointOnDef(pos, def);
  if (!projected) {
    return { pos, changedConstraint: false };
  }
  pointObj.constraint.attach = { ...projected.attach };
  return {
    pos: { x: projected.x, y: projected.y },
    changedConstraint: true,
  };
}

function getAutoLabelObjectByTargetId(targetId) {
  return store.doc.objects.find((o) => o.type === "label" && o.auto === true && o.targetId === targetId);
}

function getPointNameLabelByTargetId(targetId) {
  return store.doc.objects.find(
    (o) => o.type === "label" && o.pointName === true && o.targetId === targetId
  );
}

function getPointNameText(pointId) {
  const label = getPointNameLabelByTargetId(pointId);
  return label?.text?.trim() || "";
}

function addObject(obj) {
  store.doc.objects.push(obj);
}

function addAnnotation(ann) {
  store.doc.annotations.push(ann);
}

function runMutation(label, mutator) {
  const before = store.snapshot();
  mutator();
  store.doc.metadata.updatedAt = new Date().toISOString();
  const after = store.snapshot();
  store.commitSnapshot(label, before, after, applyDoc);
  renderCurrentDoc();
}

function ensureTransientSnapshot(id) {
  if (!id || transientDragSnapshots.has(id)) {
    return;
  }
  transientDragSnapshots.set(id, store.snapshot());
}

function commitTransientSnapshotIfPresent(id, label) {
  if (!id || !transientDragSnapshots.has(id)) {
    return false;
  }
  const before = transientDragSnapshots.get(id);
  transientDragSnapshots.delete(id);
  store.doc.metadata.updatedAt = new Date().toISOString();
  const after = store.snapshot();
  store.commitSnapshot(label, before, after, applyDoc);
  renderCurrentDoc();
  return true;
}

function maybeCreatePoint(coords) {
  const id = makeId("pt");
  addObject({
    id,
    type: "point",
    x: coords.x,
    y: coords.y,
    name: "",
    style: defaultStyle(),
  });
  return id;
}

function maybeCreateIntersectionPoint(snap) {
  if (!snap || !Array.isArray(snap.sourceObjectIds) || snap.sourceObjectIds.length !== 2) {
    return maybeCreatePoint(snap);
  }
  const id = makeId("pt");
  addObject({
    id,
    type: "point",
    x: snap.x,
    y: snap.y,
    name: "",
    constraint: {
      kind: "intersection",
      sourceObjectIds: [...snap.sourceObjectIds],
    },
    style: { ...defaultStyle(), strokeColor: defaultIntersectionPointColor(), fixed: true },
  });
  return id;
}

function maybeCreateAttachedPoint(snap) {
  if (!snap || !snap.sourceObjectId || !snap.attach) {
    return maybeCreatePoint(snap);
  }
  const id = makeId("pt");
  addObject({
    id,
    type: "point",
    x: snap.x,
    y: snap.y,
    name: "",
    constraint: {
      kind: "onObject",
      sourceObjectId: snap.sourceObjectId,
      attach: { ...snap.attach },
    },
    style: { ...defaultStyle(), strokeColor: defaultAttachedPointColor() },
  });
  return id;
}

function maybeCreateMidpointPoint(pointAId, pointBId) {
  const pointA = getPointById(pointAId);
  const pointB = getPointById(pointBId);
  if (!pointA || !pointB) {
    return null;
  }
  const id = makeId("pt");
  addObject({
    id,
    type: "point",
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
    name: "",
    constraint: {
      kind: "midpoint",
      sourcePointIds: [pointAId, pointBId],
    },
    style: { ...defaultStyle() },
  });
  return id;
}

function angleBisectorDirectionPoint(pointA, vertex, pointB, distanceOut = 1) {
  if (!pointA || !vertex || !pointB) {
    return null;
  }
  const ax = pointA.x - vertex.x;
  const ay = pointA.y - vertex.y;
  const bx = pointB.x - vertex.x;
  const by = pointB.y - vertex.y;
  const alen = Math.hypot(ax, ay);
  const blen = Math.hypot(bx, by);
  if (alen < 1e-9 || blen < 1e-9) {
    return null;
  }
  const sx = ax / alen + bx / blen;
  const sy = ay / alen + by / blen;
  const slen = Math.hypot(sx, sy);
  if (slen < 1e-9) {
    return null;
  }
  const out = Math.max(0.5, Number(distanceOut) || 1);
  return {
    x: vertex.x + (sx / slen) * out,
    y: vertex.y + (sy / slen) * out,
  };
}

function maybeCreateAngleBisectorDirectionPoint(pointAId, vertexId, pointBId) {
  const pointA = getPointById(pointAId);
  const vertex = getPointById(vertexId);
  const pointB = getPointById(pointBId);
  const target = angleBisectorDirectionPoint(pointA, vertex, pointB, 1);
  if (!target) {
    return null;
  }
  const id = makeId("pt");
  addObject({
    id,
    type: "point",
    x: target.x,
    y: target.y,
    name: "",
    hidden: true,
    constraint: {
      kind: "angleBisectorRay",
      sourcePointIds: [pointAId, vertexId, pointBId],
      distance: 1,
    },
    style: { ...defaultStyle(), fixed: true },
  });
  return id;
}

function perpendicularBisectorEndpointPoint(pointA, pointB, side, halfLength) {
  if (!pointA || !pointB) {
    return null;
  }
  const mx = (pointA.x + pointB.x) / 2;
  const my = (pointA.y + pointB.y) / 2;
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return null;
  }
  const px = -dy / len;
  const py = dx / len;
  const s = side >= 0 ? 1 : -1;
  const h = Math.max(0.2, Number(halfLength) || 1);
  return { x: mx + px * h * s, y: my + py * h * s };
}

function maybeCreatePerpendicularBisectorEndpointPoint(pointAId, pointBId, side, halfLength) {
  const p1 = getPointById(pointAId);
  const p2 = getPointById(pointBId);
  const coords = perpendicularBisectorEndpointPoint(p1, p2, side, halfLength);
  if (!coords) {
    return null;
  }
  const id = makeId("pt");
  addObject({
    id,
    type: "point",
    x: coords.x,
    y: coords.y,
    name: "",
    constraint: {
      kind: "perpendicularBisectorEndpoint",
      sourcePointIds: [pointAId, pointBId],
      side: side >= 0 ? 1 : -1,
      halfLength: Math.max(0.2, Number(halfLength) || 1),
    },
    style: { ...defaultStyle(), fixed: true },
  });
  return id;
}

function triangleVerticesFromVariant(pointA, pointB) {
  const baseLen = distance(pointA, pointB);
  if (baseLen < 0.0001) {
    return null;
  }

  const vx = pointB.x - pointA.x;
  const vy = pointB.y - pointA.y;
  const ux = vx / baseLen;
  const uy = vy / baseLen;
  const perpX = -uy;
  const perpY = ux;

  if (session.triangleVariant === "isosceles") {
    const midX = (pointA.x + pointB.x) / 2;
    const midY = (pointA.y + pointB.y) / 2;
    const apexHeight = baseLen * 0.6;
    return {
      x: midX + perpX * apexHeight,
      y: midY + perpY * apexHeight,
    };
  }

  return null;
}

function rightTriangleApexFromCursor(pointRight, pointBase, cursor, options = {}) {
  const baseLen = distance(pointRight, pointBase);
  if (baseLen < 0.0001) {
    return null;
  }
  const vx = pointBase.x - pointRight.x;
  const vy = pointBase.y - pointRight.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const rawHeight = (cursor.x - pointRight.x) * perpX + (cursor.y - pointRight.y) * perpY;
  let height = Math.abs(rawHeight) < 0.0001 ? baseLen * 0.8 : rawHeight;
  if (options.forceIsosceles) {
    height = baseLen * (rawHeight < 0 ? -1 : 1);
  }
  return {
    x: pointRight.x + perpX * height,
    y: pointRight.y + perpY * height,
    height,
  };
}

function ccwAnglePointIds(p1Id, vertexId, p3Id) {
  const p1 = getPointById(p1Id);
  const v = getPointById(vertexId);
  const p3 = getPointById(p3Id);
  if (!p1 || !v || !p3) {
    return [p1Id, vertexId, p3Id];
  }
  const ax = p1.x - v.x;
  const ay = p1.y - v.y;
  const bx = p3.x - v.x;
  const by = p3.y - v.y;
  const cross = ax * by - ay * bx;
  return cross >= 0 ? [p1Id, vertexId, p3Id] : [p3Id, vertexId, p1Id];
}

function addTriangleEdges(pointIds, style) {
  addObject({ id: makeId("seg"), type: "segment", pointIds: [pointIds[0], pointIds[1]], style });
  addObject({ id: makeId("seg"), type: "segment", pointIds: [pointIds[1], pointIds[2]], style });
  addObject({ id: makeId("seg"), type: "segment", pointIds: [pointIds[2], pointIds[0]], style });
}

function usedLabels() {
  const used = new Set();
  for (const obj of store.doc.objects) {
    if (obj.type === "point" && obj.name) {
      used.add(obj.name);
    }
    if (obj.type === "label" && obj.text) {
      used.add(obj.text);
    }
  }
  return used;
}

function nextAutoLabel(targetType = "point") {
  const used = usedLabels();
  const alphabet = targetType === "segment" ? "abcdefghijklmnopqrstuvwxyz" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let idx = 0; idx < 5000; idx += 1) {
    const candidate =
      alphabet[idx % alphabet.length] + (idx >= alphabet.length ? Math.floor(idx / alphabet.length) : "");
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `L${Date.now()}`;
}

function findTriangleOppositePointForSegment(segmentObj) {
  if (!segmentObj || segmentObj.type !== "segment") {
    return null;
  }
  const [a, b] = segmentObj.pointIds;
  const segments = store.doc.objects.filter((o) => o.type === "segment");
  const points = new Set();
  for (const seg of segments) {
    points.add(seg.pointIds[0]);
    points.add(seg.pointIds[1]);
  }
  for (const c of points) {
    if (c === a || c === b) {
      continue;
    }
    const hasAC = segments.some((s) => segmentConnects(a, c, s));
    const hasBC = segments.some((s) => segmentConnects(b, c, s));
    if (hasAC && hasBC) {
      return c;
    }
  }
  return null;
}

function conventionalSegmentLabel(segmentObj) {
  const oppositePointId = findTriangleOppositePointForSegment(segmentObj);
  if (!oppositePointId) {
    return "";
  }
  const pointText = getPointNameText(oppositePointId);
  if (!pointText) {
    return "";
  }
  return pointText.toLowerCase();
}

function labelBaseAnchorForObject(obj) {
  if (obj.type === "point") {
    return { x: obj.x, y: obj.y };
  }
  if (Array.isArray(obj.pointIds) && obj.pointIds.length >= 2) {
    const p1 = getPointById(obj.pointIds[0]);
    const p2 = getPointById(obj.pointIds[1]);
    if (p1 && p2) {
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
  }
  if (obj.throughPointId) {
    const p = getPointById(obj.throughPointId);
    if (p) {
      return { x: p.x, y: p.y };
    }
  }
  return { x: 0, y: 0 };
}

function defaultLabelOffsetForObject(obj) {
  return obj?.type === "point" ? { x: 0.45, y: 0.45 } : { x: 0.4, y: 0.4 };
}

function autoLabelAnchorForObject(obj) {
  const base = labelBaseAnchorForObject(obj);
  const offset = defaultLabelOffsetForObject(obj);
  return { x: base.x + offset.x, y: base.y + offset.y };
}

function followLabelForTargetObject(obj, offset = defaultLabelOffsetForObject(obj)) {
  if (!obj?.id) {
    return null;
  }
  return {
    kind: "targetObject",
    targetId: obj.id,
    offsetX: Number(offset.x ?? 0),
    offsetY: Number(offset.y ?? 0),
  };
}

function labelFollowBaseAnchor(labelObj) {
  if (!labelObj?.follow || typeof labelObj.follow !== "object") {
    return null;
  }
  if (labelObj.follow.kind === "targetObject") {
    const target = getObjectById(labelObj.follow.targetId || labelObj.targetId);
    if (!target) {
      return null;
    }
    return labelBaseAnchorForObject(target);
  }
  if (labelObj.follow.kind === "sideMeasure") {
    const segment = getObjectById(labelObj.follow.segmentId || labelObj.targetId);
    if (!segment || segment.type !== "segment") {
      return null;
    }
    const p1 = getPointById(segment.pointIds?.[0]);
    const p2 = getPointById(segment.pointIds?.[1]);
    if (!p1 || !p2) {
      return null;
    }
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }
  if (labelObj.follow.kind === "angleMeasure") {
    const pointIds = Array.isArray(labelObj.follow.pointIds) ? labelObj.follow.pointIds : null;
    if (!pointIds || pointIds.length !== 3) {
      return null;
    }
    const vertex = getPointById(pointIds[1]);
    if (!vertex) {
      return null;
    }
    return { x: vertex.x, y: vertex.y };
  }
  return null;
}

function syncFollowLabelPosition(labelObj) {
  if ((!labelObj.follow || typeof labelObj.follow !== "object") && labelObj.targetId) {
    const target = getObjectById(labelObj.targetId);
    const base = target ? labelBaseAnchorForObject(target) : null;
    if (base) {
      labelObj.follow = {
        kind: "targetObject",
        targetId: labelObj.targetId,
        offsetX: Number(labelObj.x ?? 0) - base.x,
        offsetY: Number(labelObj.y ?? 0) - base.y,
      };
    }
  }
  const base = labelFollowBaseAnchor(labelObj);
  if (!base) {
    return false;
  }
  const offsetX = Number(labelObj.follow?.offsetX ?? 0);
  const offsetY = Number(labelObj.follow?.offsetY ?? 0);
  labelObj.x = base.x + offsetX;
  labelObj.y = base.y + offsetY;
  return true;
}

function setPointAutoLabelState(pointObj, enabled) {
  if (!pointObj || pointObj.type !== "point") {
    return;
  }
  const existingPointLabel = getPointNameLabelByTargetId(pointObj.id);
  if (!enabled) {
    if (existingPointLabel) {
      store.doc.objects = store.doc.objects.filter((o) => o.id !== existingPointLabel.id);
    } else if (pointObj.name) {
      pointObj.name = "";
    }
    return;
  }
  if (existingPointLabel) {
    return;
  }
  const anchor = autoLabelAnchorForObject(pointObj);
  addObject({
    id: makeId("label"),
    type: "label",
    x: anchor.x,
    y: anchor.y,
    text: pointObj.name || nextAutoLabel("point"),
    auto: true,
    pointName: true,
    targetId: pointObj.id,
    follow: followLabelForTargetObject(pointObj),
    style: defaultStyle(),
  });
  if (pointObj.name) {
    pointObj.name = "";
  }
}

function toggleAutoLabelForObject(targetId) {
  const target = getObjectById(targetId);
  if (!target) {
    return;
  }

  runMutation("toggle-auto-label", () => {
    if (target.type === "label") {
      if (target.auto) {
        store.doc.objects = store.doc.objects.filter((o) => o.id !== target.id);
      }
      return;
    }

    if (target.type === "point") {
      const isLabeled = !!getPointNameLabelByTargetId(target.id) || !!target.name;
      setPointAutoLabelState(target, !isLabeled);
      return;
    }

    if (target.type === "circle") {
      const center = getPointById(target.pointIds?.[0]);
      const through = getPointById(target.pointIds?.[1]);
      if (center && through) {
        const points = [center, through];
        const allLabeled = points.every((pt) => !!getPointNameLabelByTargetId(pt.id) || !!pt.name);
        for (const pt of points) {
          setPointAutoLabelState(pt, !allLabeled);
        }
      } else {
        const existing = getAutoLabelObjectByTargetId(target.id);
        if (existing) {
          store.doc.objects = store.doc.objects.filter((o) => o.id !== existing.id);
          return;
        }
      }
      return;
    }

    const existing = getAutoLabelObjectByTargetId(target.id);
    if (existing) {
      store.doc.objects = store.doc.objects.filter((o) => o.id !== existing.id);
      return;
    }

    const anchor = autoLabelAnchorForObject(target);
    const segmentLabel =
      target.type === "segment" ? conventionalSegmentLabel(target) : "";
    addObject({
      id: makeId("label"),
      type: "label",
      x: anchor.x,
      y: anchor.y,
      text:
        segmentLabel ||
        nextAutoLabel(target.type === "segment" ? "segment" : "object"),
      auto: true,
      targetId: target.id,
      follow: followLabelForTargetObject(target),
      style: defaultStyle(),
    });
  });
}

function pointObjectFromCoords(coords) {
  return {
    x: coords.x,
    y: coords.y,
  };
}

function rightTriangleIsoModifierActive(evt) {
  return !!evt?.shiftKey && !!(evt?.metaKey || evt?.ctrlKey);
}

function snapToAxis(anchor, raw) {
  const dx = raw.x - anchor.x;
  const dy = raw.y - anchor.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: raw.x, y: anchor.y };
  }
  return { x: anchor.x, y: raw.y };
}

function getPointInputCoords(rawCoords, evt) {
  if (!evt?.shiftKey || !session.pendingPointIds.length) {
    return rawCoords;
  }
  const anchor = getPointById(session.pendingPointIds[session.pendingPointIds.length - 1]);
  if (!anchor) {
    return rawCoords;
  }
  return snapToAxis(anchor, rawCoords);
}

function isoscelesApexFromCursor(pointA, pointB, cursor) {
  const baseLen = distance(pointA, pointB);
  if (baseLen < 0.0001) {
    return null;
  }
  const vx = pointB.x - pointA.x;
  const vy = pointB.y - pointA.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;

  const projectedHeight = (cursor.x - midX) * perpX + (cursor.y - midY) * perpY;
  const fallbackHeight = baseLen * 0.6;
  const height = Math.abs(projectedHeight) < 0.0001 ? fallbackHeight : projectedHeight;
  return {
    x: midX + perpX * height,
    y: midY + perpY * height,
  };
}

function getLinearDefinition(obj) {
  if (!obj) {
    return null;
  }
  if (obj.type === "segment" || obj.type === "line") {
    if (!Array.isArray(obj.pointIds) || obj.pointIds.length < 2) {
      return null;
    }
    const a = getPointById(obj.pointIds[0]);
    const b = getPointById(obj.pointIds[1]);
    if (!a || !b) {
      return null;
    }
    if (obj.type === "line" && obj.lineType === "ray") {
      return {
        id: obj.id,
        kind: "segment",
        a,
        b: rayEndpoint(a, b, getRayExtensionForObject(obj)),
      };
    }
    if (obj.type === "line" && obj.lineType === "line") {
      return { id: obj.id, kind: "line", a, b };
    }
    const kind = obj.type === "segment" ? "segment" : "line";
    return { id: obj.id, kind, a, b };
  }

  if (obj.type === "parallel" || obj.type === "perpendicular") {
    const through = getPointById(obj.throughPointId);
    const source = getObjectById(obj.sourceLineId);
    const sourceDef = getLinearDefinition(source);
    if (!through || !sourceDef) {
      return null;
    }
    const vx = sourceDef.b.x - sourceDef.a.x;
    const vy = sourceDef.b.y - sourceDef.a.y;
    const len = Math.hypot(vx, vy);
    if (len < 1e-9) {
      return null;
    }
    const ux = vx / len;
    const uy = vy / len;
    const dir =
      obj.type === "perpendicular"
        ? { x: -uy, y: ux }
        : { x: ux, y: uy };
    return {
      id: obj.id,
      kind: "line",
      a: { x: through.x, y: through.y },
      b: { x: through.x + dir.x, y: through.y + dir.y },
    };
  }

  return null;
}

function getCircleDefinition(obj) {
  if (!obj || obj.type !== "circle" || !Array.isArray(obj.pointIds) || obj.pointIds.length < 2) {
    return null;
  }
  const center = getPointById(obj.pointIds[0]);
  const through = getPointById(obj.pointIds[1]);
  if (!center || !through) {
    return null;
  }
  const radius = distance(center, through);
  if (!Number.isFinite(radius) || radius < 1e-9) {
    return null;
  }
  return {
    id: obj.id,
    kind: "circle",
    center,
    radius,
  };
}

function getIntersectionDefinition(obj) {
  return getLinearDefinition(obj) || getCircleDefinition(obj);
}

function pointFromConstraintOnObject(def, attach) {
  if (!def || !attach) {
    return null;
  }
  if (attach.type === "circle") {
    if (def.kind !== "circle") {
      return null;
    }
    const angle = Number(attach.angle || 0);
    return {
      x: def.center.x + Math.cos(angle) * def.radius,
      y: def.center.y + Math.sin(angle) * def.radius,
    };
  }
  if (attach.type === "linear") {
    if (def.kind === "circle") {
      return null;
    }
    const t = Number(attach.t || 0);
    return {
      x: def.a.x + (def.b.x - def.a.x) * t,
      y: def.a.y + (def.b.y - def.a.y) * t,
    };
  }
  return null;
}

function intersectDefinitions(def1, def2) {
  if (!def1 || !def2) {
    return [];
  }
  if (def1.kind !== "circle" && def2.kind !== "circle") {
    const pt = intersectInfiniteLines(def1, def2);
    if (!pt) {
      return [];
    }
    if (!pointFitsLinearDef(pt, def1) || !pointFitsLinearDef(pt, def2)) {
      return [];
    }
    return [pt];
  }
  if (def1.kind === "circle" && def2.kind === "circle") {
    return [];
  }
  const lineDef = def1.kind === "circle" ? def2 : def1;
  const circleDef = def1.kind === "circle" ? def1 : def2;
  return intersectLineAndCircle(lineDef, circleDef).filter(
    (pt) => pointFitsLinearDef(pt, lineDef) && pointFitsIntersectionDef(pt, circleDef)
  );
}

function nearestPointTo(referencePoint, candidates) {
  if (!referencePoint || !candidates?.length) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const d = distance(referencePoint, candidate);
    if (d < bestDist) {
      best = candidate;
      bestDist = d;
    }
  }
  return best ? { point: best, distance: bestDist } : null;
}

function findIntersectionSnapPoint(rawPoint) {
  const defs = store.doc.objects.map(getIntersectionDefinition).filter(Boolean);
  if (defs.length < 2) {
    return null;
  }

  let best = null;
  let bestDist = Infinity;
  const threshold = 0.9;
  for (let i = 0; i < defs.length; i += 1) {
    for (let j = i + 1; j < defs.length; j += 1) {
      const candidates = intersectDefinitions(defs[i], defs[j]);
      const nearest = nearestPointTo(rawPoint, candidates);
      if (!nearest) {
        continue;
      }
      if (nearest.distance < threshold && nearest.distance < bestDist) {
        best = {
          ...nearest.point,
          sourceObjectIds: [defs[i].id, defs[j].id],
        };
        bestDist = nearest.distance;
      }
    }
  }
  return best;
}

function findObjectSnapPoint(rawPoint) {
  const defs = store.doc.objects.map(getIntersectionDefinition).filter(Boolean);
  if (!defs.length) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  const threshold = 0.7;
  for (const def of defs) {
    const projected = nearestPointOnDef(rawPoint, def);
    if (!projected) {
      continue;
    }
    const d = distance(rawPoint, projected);
    if (d < threshold && d < bestDist) {
      best = {
        x: projected.x,
        y: projected.y,
        sourceObjectId: def.id,
        attach: projected.attach,
      };
      bestDist = d;
    }
  }
  return best;
}

function findPreferredPointSnap(rawPoint) {
  return findIntersectionSnapPoint(rawPoint) || findObjectSnapPoint(rawPoint);
}

function recomputeConstrainedPoints() {
  for (const obj of store.doc.objects) {
    if (obj.type !== "point" || !obj.constraint) {
      continue;
    }
    if (obj.constraint.kind === "intersection") {
      const [id1, id2] = obj.constraint.sourceObjectIds || [];
      if (!id1 || !id2) {
        continue;
      }
      const def1 = getIntersectionDefinition(getObjectById(id1));
      const def2 = getIntersectionDefinition(getObjectById(id2));
      if (!def1 || !def2) {
        continue;
      }
      const candidates = intersectDefinitions(def1, def2);
      const nearest = nearestPointTo({ x: obj.x, y: obj.y }, candidates);
      if (!nearest) {
        continue;
      }
      obj.x = nearest.point.x;
      obj.y = nearest.point.y;
      continue;
    }
    if (obj.constraint.kind === "onObject") {
      const source = getObjectById(obj.constraint.sourceObjectId);
      const def = getIntersectionDefinition(source);
      const point = pointFromConstraintOnObject(def, obj.constraint.attach);
      if (!point) {
        continue;
      }
      obj.x = point.x;
      obj.y = point.y;
      continue;
    }
    if (obj.constraint.kind === "midpoint") {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      const p1 = getPointById(id1);
      const p2 = getPointById(id2);
      if (!p1 || !p2) {
        continue;
      }
      obj.x = (p1.x + p2.x) / 2;
      obj.y = (p1.y + p2.y) / 2;
      continue;
    }
    if (obj.constraint.kind === "angleBisectorRay") {
      const [id1, id2, id3] = obj.constraint.sourcePointIds || [];
      const p1 = getPointById(id1);
      const vertex = getPointById(id2);
      const p3 = getPointById(id3);
      const next = angleBisectorDirectionPoint(p1, vertex, p3, obj.constraint.distance);
      if (!next) {
        continue;
      }
      obj.x = next.x;
      obj.y = next.y;
      continue;
    }
    if (obj.constraint.kind === "perpendicularBisectorEndpoint") {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      const p1 = getPointById(id1);
      const p2 = getPointById(id2);
      const next = perpendicularBisectorEndpointPoint(
        p1,
        p2,
        obj.constraint.side,
        obj.constraint.halfLength
      );
      if (!next) {
        continue;
      }
      obj.x = next.x;
      obj.y = next.y;
      continue;
    }
    if (obj.constraint.kind === "rightTriangleApex") {
      const rightVertex = getPointById(obj.constraint.rightVertexId);
      const baseVertex = getPointById(obj.constraint.baseVertexId);
      if (!rightVertex || !baseVertex) {
        continue;
      }
      const baseLen = distance(rightVertex, baseVertex);
      if (baseLen < 0.0001) {
        continue;
      }
      const vx = baseVertex.x - rightVertex.x;
      const vy = baseVertex.y - rightVertex.y;
      const perpX = -vy / baseLen;
      const perpY = vx / baseLen;
      const height = Number.isFinite(obj.constraint.height) ? obj.constraint.height : baseLen * 0.8;
      obj.x = rightVertex.x + perpX * height;
      obj.y = rightVertex.y + perpY * height;
    }
  }
}

function syncConstrainedPointsToBoard() {
  let changed = false;
  for (const obj of store.doc.objects) {
    if (obj.type !== "point" || !obj.constraint) {
      continue;
    }
    const el = boardController.getElement(obj.id);
    if (!el?.setPosition) {
      continue;
    }
    el.setPosition(JXG.COORDS_BY_USER, [obj.x, obj.y]);
    changed = true;
  }
  if (changed) {
    boardController.update();
  }
}

function syncFollowLabelsToBoard() {
  let changed = false;
  for (const obj of store.doc.objects) {
    if (obj.type !== "label" || !obj.follow) {
      continue;
    }
    if (!syncFollowLabelPosition(obj)) {
      continue;
    }
    const el = boardController.getElement(obj.id);
    if (!el?.setPosition) {
      continue;
    }
    el.setPosition(JXG.COORDS_BY_USER, [obj.x, obj.y]);
    changed = true;
  }
  if (changed) {
    boardController.update();
  }
}

function updateConstrainedPointsLive() {
  recomputeConstrainedPoints();
  syncConstrainedPointsToBoard();
  syncFollowLabelsToBoard();
}

function updateLinearPreview(cursorCoords) {
  if (![ToolMode.SEGMENT, ToolMode.LINE, ToolMode.RAY].includes(session.currentMode)) {
    return false;
  }
  if (session.pendingPointIds.length < 1) {
    boardController.clearPreview();
    return true;
  }
  const p1 = getPointById(session.pendingPointIds[0]);
  if (!p1) {
    boardController.clearPreview();
    return true;
  }
  const previewKind = session.currentMode === ToolMode.SEGMENT ? "segment" : session.currentMode === ToolMode.RAY ? "ray" : "line";
  const previewP2 =
    previewKind === "ray"
      ? { ...cursorCoords, rayExtension: normalizedRayExtension(store.doc.styles.rayExtension) }
      : previewKind === "line"
        ? {
            ...cursorCoords,
            lineExtensionStart: normalizedLineExtension(store.doc.styles.lineExtensionStart),
            lineExtensionEnd: normalizedLineExtension(store.doc.styles.lineExtensionEnd),
          }
      : cursorCoords;
  boardController.showPreviewLinear(pointObjectFromCoords(p1), previewP2, previewKind);
  return true;
}

function updateTrianglePreview(cursorCoords, evt) {
  if (session.currentMode !== ToolMode.TRIANGLE) {
    boardController.clearPreview();
    return;
  }

  if (session.triangleVariant === "three-point") {
    if (session.pendingPointIds.length < 2) {
      boardController.clearPreview();
      return;
    }
    const p1 = getPointById(session.pendingPointIds[0]);
    const p2 = getPointById(session.pendingPointIds[1]);
    if (!p1 || !p2) {
      boardController.clearPreview();
      return;
    }
    boardController.showPreviewTriangle(pointObjectFromCoords(p1), pointObjectFromCoords(p2), cursorCoords);
    return;
  }

  if (session.triangleVariant === "right") {
    if (session.pendingPointIds.length < 2) {
      boardController.clearPreview();
      return;
    }
    const p1 = getPointById(session.pendingPointIds[0]);
    const p2 = getPointById(session.pendingPointIds[1]);
    if (!p1 || !p2) {
      boardController.clearPreview();
      return;
    }
    const p3 = rightTriangleApexFromCursor(pointObjectFromCoords(p1), pointObjectFromCoords(p2), cursorCoords, {
      forceIsosceles: rightTriangleIsoModifierActive(evt),
    });
    if (!p3) {
      boardController.clearPreview();
      return;
    }
    boardController.showPreviewTriangle(pointObjectFromCoords(p1), pointObjectFromCoords(p2), p3);
    return;
  }

  if (session.triangleVariant === "isosceles") {
    if (session.pendingPointIds.length < 2) {
      boardController.clearPreview();
      return;
    }
    const p1 = getPointById(session.pendingPointIds[0]);
    const p2 = getPointById(session.pendingPointIds[1]);
    if (!p1 || !p2) {
      boardController.clearPreview();
      return;
    }
    const p3 = isoscelesApexFromCursor(pointObjectFromCoords(p1), pointObjectFromCoords(p2), cursorCoords);
    if (!p3) {
      boardController.clearPreview();
      return;
    }
    boardController.showPreviewTriangle(pointObjectFromCoords(p1), pointObjectFromCoords(p2), p3);
    return;
  }

  if (session.pendingPointIds.length < 1) {
    boardController.clearPreview();
    return;
  }

  const p1 = getPointById(session.pendingPointIds[0]);
  if (!p1) {
    boardController.clearPreview();
    return;
  }
  boardController.clearPreview();
}

function updateCirclePreview(cursorCoords) {
  if (session.currentMode !== ToolMode.CIRCLE) {
    return false;
  }
  if (session.pendingPointIds.length < 1) {
    boardController.clearPreview();
    return true;
  }
  const center = getPointById(session.pendingPointIds[0]);
  if (!center) {
    boardController.clearPreview();
    return true;
  }
  boardController.showPreviewCircle(pointObjectFromCoords(center), cursorCoords);
  return true;
}

function updateAnglePreview(cursorCoords) {
  if (session.currentMode !== ToolMode.ANGLE) {
    return false;
  }
  if (session.pendingPointIds.length < 2) {
    if (session.pendingPointIds.length < 1) {
      boardController.clearPreview();
    }
    return true;
  }
  const p1 = getPointById(session.pendingPointIds[0]);
  const vertex = getPointById(session.pendingPointIds[1]);
  if (!p1 || !vertex) {
    boardController.clearPreview();
    return true;
  }
  boardController.showPreviewAngle(
    pointObjectFromCoords(p1),
    pointObjectFromCoords(vertex),
    cursorCoords,
    {
      right: session.pendingAngleIsRight,
      arcCount: session.pendingAngleArcCount,
      decorator: session.pendingAngleDecorator,
      tickCount: session.pendingAngleArcCount,
    }
  );
  return true;
}

function updatePerpendicularBisectorPreview(cursorCoords) {
  if (!session.perpendicularBisectorPlacement) {
    return false;
  }
  const p1 = getPointById(session.perpendicularBisectorPlacement.pointAId);
  const p2 = getPointById(session.perpendicularBisectorPlacement.pointBId);
  if (!p1 || !p2) {
    boardController.clearPreview();
    return true;
  }
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    boardController.clearPreview();
    return true;
  }
  const px = -dy / len;
  const py = dx / len;
  const vx = cursorCoords.x - mx;
  const vy = cursorCoords.y - my;
  const signed = vx * px + vy * py;
  const halfLength = Math.max(0.2, Math.abs(signed));
  session.perpendicularBisectorPlacement.side = signed >= 0 ? 1 : -1;
  session.perpendicularBisectorPlacement.halfLength = halfLength;
  boardController.showPreviewLinear(
    { x: mx, y: my },
    {
      x: mx + px * halfLength * session.perpendicularBisectorPlacement.side,
      y: my + py * halfLength * session.perpendicularBisectorPlacement.side,
    },
    "segment"
  );
  return true;
}

function addPointInput(pointId, skipMutation = false) {
  if (pointNeeds(session.currentMode) > 0 && session.pendingPointIds.includes(pointId)) {
    statusEl.textContent = `Mode: ${modeLabel(session.currentMode)} (pick distinct points)`;
    return;
  }

  session.pendingPointIds.push(pointId);
  const need = pointNeeds(session.currentMode);
  if (session.pendingPointIds.length < need) {
    statusEl.textContent = `Mode: ${modeLabel(session.currentMode)} (${session.pendingPointIds.length}/${need})`;
    renderCurrentDoc(false);
    return;
  }

  const modeForCreate = session.currentMode;
  const pointsForCreate = session.pendingPointIds.slice();
  const isRightAngle = session.pendingAngleIsRight;
  const createFromPoints = () => {
    const style = defaultStyle();
    if (modeForCreate === ToolMode.SEGMENT) {
      addObject({ id: makeId("seg"), type: "segment", pointIds: pointsForCreate, style });
    } else if (modeForCreate === ToolMode.LINE) {
      addObject({
        id: makeId("line"),
        type: "line",
        pointIds: pointsForCreate,
        lineType: "line",
        style: {
          ...style,
          lineExtensionStart: normalizedLineExtension(store.doc.styles.lineExtensionStart),
          lineExtensionEnd: normalizedLineExtension(store.doc.styles.lineExtensionEnd),
        },
      });
    } else if (modeForCreate === ToolMode.RAY) {
      addObject({
        id: makeId("ray"),
        type: "line",
        pointIds: pointsForCreate,
        lineType: "ray",
        style: { ...style, rayExtension: normalizedRayExtension(store.doc.styles.rayExtension) },
      });
    } else if (modeForCreate === ToolMode.CIRCLE) {
      addObject({ id: makeId("circle"), type: "circle", pointIds: pointsForCreate, style });
    } else if (modeForCreate === ToolMode.TRIANGLE) {
      if (session.triangleVariant === "three-point") {
        addTriangleEdges(pointsForCreate, style);
      } else if (session.triangleVariant === "right") {
        const pointRight = getPointById(pointsForCreate[0]);
        const pointBase = getPointById(pointsForCreate[1]);
        const cursorPoint = getPointById(pointsForCreate[2]);
        if (!pointRight || !pointBase || !cursorPoint) {
          return;
        }
        const apex = rightTriangleApexFromCursor(pointRight, pointBase, cursorPoint, {
          forceIsosceles: session.pendingRightTriangleForceIso,
        });
        if (!apex) {
          return;
        }
        cursorPoint.x = apex.x;
        cursorPoint.y = apex.y;
        cursorPoint.constraint = {
          kind: "rightTriangleApex",
          rightVertexId: pointsForCreate[0],
          baseVertexId: pointsForCreate[1],
          height: apex.height,
        };
        addTriangleEdges([pointsForCreate[0], pointsForCreate[1], pointsForCreate[2]], style);
        addAnnotation({
          id: makeId("ang"),
          type: "angle",
          pointIds: ccwAnglePointIds(pointsForCreate[1], pointsForCreate[0], pointsForCreate[2]),
          right: true,
          arcCount: 1,
          style,
        });
      } else if (session.triangleVariant === "isosceles") {
        const pointA = getPointById(pointsForCreate[0]);
        const pointB = getPointById(pointsForCreate[1]);
        const cursorPoint = getPointById(pointsForCreate[2]);
        if (!pointA || !pointB || !cursorPoint) {
          return;
        }
        const apex = isoscelesApexFromCursor(pointA, pointB, cursorPoint);
        if (!apex) {
          return;
        }
        cursorPoint.x = apex.x;
        cursorPoint.y = apex.y;
        addTriangleEdges([pointsForCreate[0], pointsForCreate[1], pointsForCreate[2]], style);
      } else {
        const pointA = getPointById(pointsForCreate[0]);
        const pointB = getPointById(pointsForCreate[1]);
        if (!pointA || !pointB) {
          return;
        }
        const apex = triangleVerticesFromVariant(pointA, pointB);
        if (!apex) {
          return;
        }
        const apexId = makeId("pt");
        addObject({
          id: apexId,
          type: "point",
          x: apex.x,
          y: apex.y,
          name: "",
          style,
        });
        addTriangleEdges([pointsForCreate[0], pointsForCreate[1], apexId], style);
      }
    } else if (modeForCreate === ToolMode.ANGLE) {
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        pointIds: pointsForCreate,
        right: isRightAngle,
        arcCount: isRightAngle ? 1 : session.pendingAngleArcCount,
        decorator: isRightAngle ? "right" : session.pendingAngleDecorator,
        tickCount: isRightAngle ? 0 : session.pendingAngleDecorator === "arcTick" ? session.pendingAngleArcCount : 0,
        style,
      });
      store.clearSelection();
    }
  };

  if (skipMutation) {
    createFromPoints();
  } else {
    runMutation(`create-${modeForCreate}`, createFromPoints);
  }

  session.pendingPointIds = [];
  session.pendingRightTriangleForceIso = false;
  if (modeForCreate !== ToolMode.ANGLE) {
    session.pendingAngleIsRight = false;
    session.pendingAngleArcCount = 1;
    session.pendingAngleDecorator = "arc";
    session.activeAngleMarkPresetValue = null;
  }
  boardController.clearPreview();
  updateModeUi();
  renderCurrentDoc(false);
}

function handleBoardClick(coords, evt) {
  if (session.perpendicularBisectorPlacement) {
    const tag = String(evt?.target?.tagName || "").toLowerCase();
    const isBoardBackground = tag === "svg" || evt?.target === boardEl;
    if (!isBoardBackground) {
      return;
    }
    const adjusted = getPointInputCoords(coords, evt);
    updatePerpendicularBisectorPreview(adjusted);
    const placementSession = session.perpendicularBisectorPlacement;
    session.perpendicularBisectorPlacement = null;
    boardController.clearPreview();
    const halfLength = Math.max(0.2, Number(placementSession.halfLength) || 1);
    runMutation(`perp-bisector${placementSession.variantLabel}`, () => {
      const midpointId = maybeCreateMidpointPoint(placementSession.pointAId, placementSession.pointBId);
      if (!midpointId) {
        return;
      }
      const endId = maybeCreatePerpendicularBisectorEndpointPoint(
        placementSession.pointAId,
        placementSession.pointBId,
        placementSession.side || 1,
        halfLength
      );
      if (!endId) {
        return;
      }
      const segId = makeId("pb");
      addObject({
        id: segId,
        type: "segment",
        pointIds: [midpointId, endId],
        construction: "perpendicularBisector",
        style: { ...defaultStyle(), dash: 0, fixed: true },
      });
      if (placementSession.withMidpointTicks) {
        addAnnotation({
          id: makeId("mdtk"),
          type: "midpointTick",
          pointIds: [placementSession.pointAId, midpointId, placementSession.pointBId],
          tickCount: 1,
          style: defaultStyle(),
        });
      }
      if (placementSession.withRightAngle) {
        addAnnotation({
          id: makeId("ang"),
          type: "angle",
          pointIds: [placementSession.pointAId, midpointId, endId],
          right: true,
          arcCount: 1,
          style: defaultStyle(),
        });
      }
      store.clearSelection();
    });
    updateModeUi();
    return;
  }
  if (session.currentMode === ToolMode.SELECT) {
    const tag = String(evt?.target?.tagName || "").toLowerCase();
    const isBoardBackground = tag === "svg" || evt?.target === boardEl;
    if (!isBoardBackground) {
      return;
    }
    if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
      return;
    }
    store.clearSelection();
    renderCurrentDoc();
    if (session.constructionSelectionSession) {
      updateModeUi();
    }
    return;
  }

  const snappedCoords = getPointInputCoords(coords, evt);

  if (session.currentMode === ToolMode.POINT) {
    const pointSnap = findPreferredPointSnap(snappedCoords);
    runMutation("create-point", () => {
      if (pointSnap?.sourceObjectIds) {
        maybeCreateIntersectionPoint(pointSnap);
      } else if (pointSnap?.sourceObjectId) {
        maybeCreateAttachedPoint(pointSnap);
      } else {
        maybeCreatePoint(snappedCoords);
      }
    });
    return;
  }

  if (session.currentMode === ToolMode.ANGLE) {
    statusEl.textContent = `Mode: ${modeLabel(session.currentMode)} (select existing points only)`;
    return;
  }

  if (pointNeeds(session.currentMode) > 0) {
    if (session.currentMode === ToolMode.TRIANGLE && session.triangleVariant === "right" && session.pendingPointIds.length === 2) {
      session.pendingRightTriangleForceIso = rightTriangleIsoModifierActive(evt);
    }
    const nearbyPoint = findNearbyVisiblePoint(snappedCoords);
    if (nearbyPoint) {
      addPointInput(nearbyPoint.id);
      return;
    }
    runMutation("create-inline-point", () => {
      const pointSnap = findPreferredPointSnap(snappedCoords);
      let ptId;
      if (pointSnap?.sourceObjectIds) {
        ptId = maybeCreateIntersectionPoint(pointSnap);
      } else if (pointSnap?.sourceObjectId) {
        ptId = maybeCreateAttachedPoint(pointSnap);
      } else {
        ptId = maybeCreatePoint(snappedCoords);
      }
      addPointInput(ptId, true);
    });
  }
}

function handleObjectClick(id, type, evt) {
  const multi = evt.shiftKey || evt.metaKey || evt.ctrlKey;
  const eventType = String(evt?.type || "").toLowerCase();
  const isReleaseEvent = eventType.includes("up") || eventType.includes("end");
  if (evt && typeof evt === "object") {
    const clickKey = `${type}:${id}`;
    const dedupeStamp = `${eventType}:${Number(evt.timeStamp || 0)}`;
    if (evt.__codexHandledObjectClicksStamp !== dedupeStamp) {
      evt.__codexHandledObjectClicksStamp = dedupeStamp;
      evt.__codexHandledObjectClicks = [];
    }
    if (!Array.isArray(evt.__codexHandledObjectClicks)) {
      evt.__codexHandledObjectClicks = [];
    }
    if (evt.__codexHandledObjectClicks.includes(clickKey)) {
      return;
    }
    evt.__codexHandledObjectClicks.push(clickKey);
  }
  if (["segment", "line", "ray", "parallel", "perpendicular", "circle"].includes(type)) {
    const nearPoint = findNearbyVisiblePoint(boardController.getUserCoords(evt), 0.4);
    if (nearPoint && nearPoint.id !== id) {
      return handleObjectClick(nearPoint.id, "point", evt);
    }
  }

  if (session.currentMode === ToolMode.POINT) {
    return false;
  }

  if (session.currentMode === ToolMode.DELETE) {
    store.clearSelection();
    store.selection.add(id);
    deleteSelected();
    return;
  }

  if (session.constructionSelectionSession) {
    if (!multi && !isReleaseEvent) {
      return { deferUntilUp: true };
    }
    if (multi) {
      store.toggleSelection(id, true);
    } else {
      store.selection.add(id);
    }
    renderCurrentDoc();
    maybeCompleteConstructionSelectionSession();
    return;
  }

  if (pointNeeds(session.currentMode) > 0 && type === "point") {
    if (session.currentMode === ToolMode.TRIANGLE && session.triangleVariant === "right" && session.pendingPointIds.length === 2) {
      session.pendingRightTriangleForceIso = rightTriangleIsoModifierActive(evt);
    }
    addPointInput(id);
    return;
  }
  if (pointNeeds(session.currentMode) > 0 && type !== "point") {
    return false;
  }

  if (session.currentMode === ToolMode.LABEL) {
    toggleAutoLabelForObject(id);
    return;
  }

  if (session.currentMode === ToolMode.SELECT && !multi && !isReleaseEvent) {
    return { deferUntilUp: true };
  }

  if (session.currentMode === ToolMode.SELECT || session.currentMode === ToolMode.CONGRUENCY) {
    store.toggleSelection(id, multi);
    renderCurrentDoc();
  }
}

function objectRepresentativePoint(obj) {
  if (obj.type === "point" || obj.type === "label") {
    return { x: obj.x, y: obj.y };
  }
  if (obj.type === "segment" || obj.type === "line") {
    const p1 = getPointById(obj.pointIds?.[0]);
    const p2 = getPointById(obj.pointIds?.[1]);
    if (p1 && p2) {
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
  }
  if (obj.type === "circle") {
    const c = getPointById(obj.pointIds?.[0]);
    if (c) {
      return { x: c.x, y: c.y };
    }
  }
  if (obj.type === "parallel" || obj.type === "perpendicular") {
    const p = getPointById(obj.throughPointId);
    if (p) {
      return { x: p.x, y: p.y };
    }
  }
  return null;
}

function inBounds(pt, bounds) {
  return pt.x >= bounds.minX && pt.x <= bounds.maxX && pt.y >= bounds.minY && pt.y <= bounds.maxY;
}

function applyMarqueeSelection(bounds, additive) {
  const selected = additive ? new Set(store.selectedIds()) : new Set();
  for (const obj of store.doc.objects) {
    const rep = objectRepresentativePoint(obj);
    if (rep && inBounds(rep, bounds)) {
      selected.add(obj.id);
    }
  }
  for (const ann of store.doc.annotations) {
    if (ann.segmentId && selected.has(ann.segmentId)) {
      selected.add(ann.id);
    } else if (ann.targetId && selected.has(ann.targetId)) {
      selected.add(ann.id);
    } else if (ann.pointIds && ann.pointIds.every((pid) => selected.has(pid))) {
      selected.add(ann.id);
    }
  }
  store.clearSelection();
  for (const id of selected) {
    store.selection.add(id);
  }
  renderCurrentDoc();
}

function removeMarqueeRect() {
  if (marqueeState?.rectEl) {
    marqueeState.rectEl.remove();
  }
}

function startMarqueeSelection() {
  if (!boardEl) {
    return;
  }

  boardEl.addEventListener("mousedown", (evt) => {
    if (session.currentMode !== ToolMode.SELECT || evt.button !== 0) {
      return;
    }
    const tag = String(evt.target?.tagName || "").toLowerCase();
    if (tag !== "svg" && evt.target !== boardEl) {
      return;
    }
    const rect = boardEl.getBoundingClientRect();
    const wrapRect = boardEl.parentElement.getBoundingClientRect();
    marqueeState = {
      startX: evt.clientX,
      startY: evt.clientY,
      lastX: evt.clientX,
      lastY: evt.clientY,
      additive: evt.shiftKey || evt.metaKey || evt.ctrlKey,
      dragging: false,
      rectEl: null,
      boardRect: rect,
      wrapRect,
    };
  });

  window.addEventListener("mousemove", (evt) => {
    if (!marqueeState || session.currentMode !== ToolMode.SELECT) {
      return;
    }
    marqueeState.lastX = evt.clientX;
    marqueeState.lastY = evt.clientY;
    const dx = Math.abs(evt.clientX - marqueeState.startX);
    const dy = Math.abs(evt.clientY - marqueeState.startY);
    if (!marqueeState.dragging && Math.max(dx, dy) < 6) {
      return;
    }
    marqueeState.dragging = true;
    if (!marqueeState.rectEl) {
      const rectEl = document.createElement("div");
      rectEl.className = "marquee-select";
      boardEl.parentElement.appendChild(rectEl);
      marqueeState.rectEl = rectEl;
    }
    const minX = Math.max(marqueeState.boardRect.left, Math.min(marqueeState.startX, evt.clientX));
    const minY = Math.max(marqueeState.boardRect.top, Math.min(marqueeState.startY, evt.clientY));
    const maxX = Math.min(marqueeState.boardRect.right, Math.max(marqueeState.startX, evt.clientX));
    const maxY = Math.min(marqueeState.boardRect.bottom, Math.max(marqueeState.startY, evt.clientY));
    marqueeState.rectEl.style.left = `${minX - marqueeState.wrapRect.left}px`;
    marqueeState.rectEl.style.top = `${minY - marqueeState.wrapRect.top}px`;
    marqueeState.rectEl.style.width = `${Math.max(0, maxX - minX)}px`;
    marqueeState.rectEl.style.height = `${Math.max(0, maxY - minY)}px`;
  });

  window.addEventListener("mouseup", () => {
    if (!marqueeState) {
      return;
    }
    if (marqueeState.dragging) {
      const p1 = boardController.screenToUser(marqueeState.startX, marqueeState.startY);
      const p2 = boardController.screenToUser(marqueeState.lastX, marqueeState.lastY);
      const bounds = {
        minX: Math.min(p1.x, p2.x),
        maxX: Math.max(p1.x, p2.x),
        minY: Math.min(p1.y, p2.y),
        maxY: Math.max(p1.y, p2.y),
      };
      applyMarqueeSelection(bounds, marqueeState.additive);
    }
    removeMarqueeRect();
    marqueeState = null;
  });
}

function handleBoardMove(coords, evt) {
  const adjusted = getPointInputCoords(coords, evt);
  if (updatePerpendicularBisectorPreview(adjusted)) {
    return;
  }
  if (updateLinearPreview(adjusted)) {
    return;
  }
  if (updateCirclePreview(adjusted)) {
    return;
  }
  if (updateAnglePreview(adjusted)) {
    return;
  }
  updateTrianglePreview(adjusted, evt);
}

function handleObjectMove(id, type, pos, options = {}) {
  const transient = !!options?.transient;
  if (type === "angle") {
    const ann = store.doc.annotations.find((a) => a.id === id && a.type === "angle");
    if (!ann || !pos || !Number.isFinite(pos.radius)) {
      return;
    }
    const nextRadius = Math.max(0.15, Number(pos.radius));
    const prevRadius = Math.max(0.15, Number(ann.style?.radius || 1));
    if (Math.abs(nextRadius - prevRadius) < 0.0001) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-angle-radius");
      }
      return;
    }
    if (transient) {
      ensureTransientSnapshot(id);
      const targets =
        ann.groupId
          ? store.doc.annotations.filter((a) => a.type === "angle" && a.groupId === ann.groupId)
          : [ann];
      for (const target of targets) {
        target.style = target.style || {};
        target.style.radius = nextRadius;
      }
      renderCurrentDoc(false);
    } else {
      if (transientDragSnapshots.has(id)) {
        const targets =
          ann.groupId
            ? store.doc.annotations.filter((a) => a.type === "angle" && a.groupId === ann.groupId)
            : [ann];
        for (const target of targets) {
          target.style = target.style || {};
          target.style.radius = nextRadius;
        }
        commitTransientSnapshotIfPresent(id, "move-angle-radius");
        return;
      }
      runMutation("move-angle-radius", () => {
        const targets =
          ann.groupId
            ? store.doc.annotations.filter((a) => a.type === "angle" && a.groupId === ann.groupId)
            : [ann];
        for (const target of targets) {
          target.style = target.style || {};
          target.style.radius = nextRadius;
        }
      });
    }
    return;
  }
  if (type === "ray") {
    const rayObj = getObjectById(id);
    if (!rayObj || rayObj.type !== "line" || rayObj.lineType !== "ray") {
      return;
    }
    if (pos && "rayExtension" in pos) {
      const nextExt = normalizedRayExtension(pos.rayExtension);
      const prevExt = getRayExtensionForObject(rayObj);
      if (Math.abs(nextExt - prevExt) < 0.0001) {
        if (!transient) {
          commitTransientSnapshotIfPresent(id, "resize-ray-visible");
        }
        return;
      }
      if (transient) {
        ensureTransientSnapshot(id);
        rayObj.style = rayObj.style || {};
        rayObj.style.rayExtension = nextExt;
        updateConstrainedPointsLive();
      } else {
        if (transientDragSnapshots.has(id)) {
          rayObj.style = rayObj.style || {};
          rayObj.style.rayExtension = nextExt;
          commitTransientSnapshotIfPresent(id, "resize-ray-visible");
          return;
        }
        runMutation("resize-ray-visible", () => {
          rayObj.style = rayObj.style || {};
          rayObj.style.rayExtension = nextExt;
        });
      }
      return;
    }
    if (!pos?.p1 || !pos?.p2) {
      return;
    }
    const p1Obj = getPointById(rayObj.pointIds?.[0]);
    const p2Obj = getPointById(rayObj.pointIds?.[1]);
    if (!p1Obj || !p2Obj) {
      return;
    }
    if (rayObj.construction === "angleBisector") {
      return;
    }
    const unchanged =
      Math.abs(p1Obj.x - pos.p1.x) < 0.0001 &&
      Math.abs(p1Obj.y - pos.p1.y) < 0.0001 &&
      Math.abs(p2Obj.x - pos.p2.x) < 0.0001 &&
      Math.abs(p2Obj.y - pos.p2.y) < 0.0001;
    if (unchanged) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-ray");
      }
      return;
    }
    if (transient) {
      ensureTransientSnapshot(id);
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
      updateConstrainedPointsLive();
    } else {
      if (transientDragSnapshots.has(id)) {
        p1Obj.x = pos.p1.x;
        p1Obj.y = pos.p1.y;
        p2Obj.x = pos.p2.x;
        p2Obj.y = pos.p2.y;
        commitTransientSnapshotIfPresent(id, "move-ray");
        return;
      }
      runMutation("move-ray", () => {
        p1Obj.x = pos.p1.x;
        p1Obj.y = pos.p1.y;
        p2Obj.x = pos.p2.x;
        p2Obj.y = pos.p2.y;
      });
    }
    return;
  }

  if (type === "line") {
    const lineObj = getObjectById(id);
    if (!lineObj || !["line", "parallel", "perpendicular"].includes(lineObj.type)) {
      return;
    }
    if (pos?.p1 && pos?.p2) {
      if (lineObj.type !== "line") {
        return;
      }
      const p1Obj = getPointById(lineObj.pointIds?.[0]);
      const p2Obj = getPointById(lineObj.pointIds?.[1]);
      if (!p1Obj || !p2Obj) {
        return;
      }
      const unchanged =
        Math.abs(p1Obj.x - pos.p1.x) < 0.0001 &&
        Math.abs(p1Obj.y - pos.p1.y) < 0.0001 &&
        Math.abs(p2Obj.x - pos.p2.x) < 0.0001 &&
        Math.abs(p2Obj.y - pos.p2.y) < 0.0001;
      if (unchanged) {
        if (!transient) {
          commitTransientSnapshotIfPresent(id, "move-line");
        }
        return;
      }
      if (transient) {
        ensureTransientSnapshot(id);
        p1Obj.x = pos.p1.x;
        p1Obj.y = pos.p1.y;
        p2Obj.x = pos.p2.x;
        p2Obj.y = pos.p2.y;
        updateConstrainedPointsLive();
      } else {
        if (transientDragSnapshots.has(id)) {
          p1Obj.x = pos.p1.x;
          p1Obj.y = pos.p1.y;
          p2Obj.x = pos.p2.x;
          p2Obj.y = pos.p2.y;
          commitTransientSnapshotIfPresent(id, "move-line");
          return;
        }
        runMutation("move-line", () => {
          p1Obj.x = pos.p1.x;
          p1Obj.y = pos.p1.y;
          p2Obj.x = pos.p2.x;
          p2Obj.y = pos.p2.y;
        });
      }
      return;
    }
    if (pos && ("lineExtensionStart" in pos || "lineExtensionEnd" in pos)) {
      const nextStart = normalizedLineExtension(pos.lineExtensionStart ?? lineObj.style?.lineExtensionStart);
      const nextEnd = normalizedLineExtension(pos.lineExtensionEnd ?? lineObj.style?.lineExtensionEnd);
      const prevStart = normalizedLineExtension(lineObj.style?.lineExtensionStart ?? store.doc.styles.lineExtensionStart);
      const prevEnd = normalizedLineExtension(lineObj.style?.lineExtensionEnd ?? store.doc.styles.lineExtensionEnd);
      if (Math.abs(nextStart - prevStart) < 0.0001 && Math.abs(nextEnd - prevEnd) < 0.0001) {
        if (!transient) {
          commitTransientSnapshotIfPresent(id, "resize-line-visible");
        }
        return;
      }
      if (transient) {
        ensureTransientSnapshot(id);
        lineObj.style = lineObj.style || {};
        lineObj.style.lineExtensionStart = nextStart;
        lineObj.style.lineExtensionEnd = nextEnd;
        updateConstrainedPointsLive();
      } else {
        if (transientDragSnapshots.has(id)) {
          lineObj.style = lineObj.style || {};
          lineObj.style.lineExtensionStart = nextStart;
          lineObj.style.lineExtensionEnd = nextEnd;
          commitTransientSnapshotIfPresent(id, "resize-line-visible");
          return;
        }
        runMutation("resize-line-visible", () => {
          lineObj.style = lineObj.style || {};
          lineObj.style.lineExtensionStart = nextStart;
          lineObj.style.lineExtensionEnd = nextEnd;
        });
      }
    }
    return;
  }

  if (type === "segment") {
    const segObj = getObjectById(id);
    if (!segObj || segObj.type !== "segment" || !pos?.p1 || !pos?.p2) {
      return;
    }
    if (segObj.construction === "perpendicularBisector") {
      return;
    }
    const p1Obj = getPointById(segObj.pointIds?.[0]);
    const p2Obj = getPointById(segObj.pointIds?.[1]);
    if (!p1Obj || !p2Obj) {
      return;
    }
    const unchanged =
      Math.abs(p1Obj.x - pos.p1.x) < 0.0001 &&
      Math.abs(p1Obj.y - pos.p1.y) < 0.0001 &&
      Math.abs(p2Obj.x - pos.p2.x) < 0.0001 &&
      Math.abs(p2Obj.y - pos.p2.y) < 0.0001;
    if (unchanged) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-segment");
      }
      return;
    }
    if (transient) {
      ensureTransientSnapshot(id);
      p1Obj.x = pos.p1.x;
      p1Obj.y = pos.p1.y;
      p2Obj.x = pos.p2.x;
      p2Obj.y = pos.p2.y;
      updateConstrainedPointsLive();
    } else {
      if (transientDragSnapshots.has(id)) {
        p1Obj.x = pos.p1.x;
        p1Obj.y = pos.p1.y;
        p2Obj.x = pos.p2.x;
        p2Obj.y = pos.p2.y;
        commitTransientSnapshotIfPresent(id, "move-segment");
        return;
      }
      runMutation("move-segment", () => {
        p1Obj.x = pos.p1.x;
        p1Obj.y = pos.p1.y;
        p2Obj.x = pos.p2.x;
        p2Obj.y = pos.p2.y;
      });
    }
    return;
  }

  if (type === "circle") {
    const circleObj = getObjectById(id);
    if (!circleObj || circleObj.type !== "circle" || !pos?.p1 || !pos?.p2) {
      return;
    }
    const centerObj = getPointById(circleObj.pointIds?.[0]);
    const throughObj = getPointById(circleObj.pointIds?.[1]);
    if (!centerObj || !throughObj) {
      return;
    }
    const unchanged =
      Math.abs(centerObj.x - pos.p1.x) < 0.0001 &&
      Math.abs(centerObj.y - pos.p1.y) < 0.0001 &&
      Math.abs(throughObj.x - pos.p2.x) < 0.0001 &&
      Math.abs(throughObj.y - pos.p2.y) < 0.0001;
    if (unchanged) {
      if (!transient) {
        commitTransientSnapshotIfPresent(id, "move-circle");
      }
      return;
    }
    if (transient) {
      ensureTransientSnapshot(id);
      centerObj.x = pos.p1.x;
      centerObj.y = pos.p1.y;
      throughObj.x = pos.p2.x;
      throughObj.y = pos.p2.y;
      updateConstrainedPointsLive();
    } else {
      if (transientDragSnapshots.has(id)) {
        centerObj.x = pos.p1.x;
        centerObj.y = pos.p1.y;
        throughObj.x = pos.p2.x;
        throughObj.y = pos.p2.y;
        commitTransientSnapshotIfPresent(id, "move-circle");
        return;
      }
      runMutation("move-circle", () => {
        centerObj.x = pos.p1.x;
        centerObj.y = pos.p1.y;
        throughObj.x = pos.p2.x;
        throughObj.y = pos.p2.y;
      });
    }
    return;
  }

  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    return;
  }
  if (type !== "point" && type !== "label") {
    return;
  }
  const obj = getObjectById(id);
  if (!obj) {
    return;
  }
  let adjustedPos = type === "point" ? maybeAxisLockDraggedPoint(id, pos, options) : pos;
  if (type === "point") {
    adjustedPos = applyPointConstraintToDraggedPosition(obj, adjustedPos).pos;
  }
  if (Math.abs((obj.x ?? 0) - adjustedPos.x) < 0.0001 && Math.abs((obj.y ?? 0) - adjustedPos.y) < 0.0001) {
    if (!transient) {
      commitTransientSnapshotIfPresent(id, `move-${type}`);
    }
    return;
  }

  if (transient) {
    ensureTransientSnapshot(id);
    obj.x = adjustedPos.x;
    obj.y = adjustedPos.y;
    if (type === "label" && obj.follow) {
      const base = labelFollowBaseAnchor(obj);
      if (base) {
        obj.follow.offsetX = adjustedPos.x - base.x;
        obj.follow.offsetY = adjustedPos.y - base.y;
      }
    }
    if (type === "point") {
      const el = boardController.getElement(id);
      if (el?.setPosition) {
        el.setPosition(JXG.COORDS_BY_USER, [adjustedPos.x, adjustedPos.y]);
      }
    }
    updateConstrainedPointsLive();
  } else {
    if (transientDragSnapshots.has(id)) {
      obj.x = adjustedPos.x;
      obj.y = adjustedPos.y;
      if (type === "label" && obj.follow) {
        const base = labelFollowBaseAnchor(obj);
        if (base) {
          obj.follow.offsetX = adjustedPos.x - base.x;
          obj.follow.offsetY = adjustedPos.y - base.y;
        }
      }
      if (type === "point") {
        recomputeConstrainedPoints();
      }
      commitTransientSnapshotIfPresent(id, `move-${type}`);
      return;
    }
    runMutation(`move-${type}`, () => {
      obj.x = adjustedPos.x;
      obj.y = adjustedPos.y;
      if (type === "label" && obj.follow) {
        const base = labelFollowBaseAnchor(obj);
        if (base) {
          obj.follow.offsetX = adjustedPos.x - base.x;
          obj.follow.offsetY = adjustedPos.y - base.y;
        }
      }
      if (type === "point") {
        recomputeConstrainedPoints();
      }
    });
  }
}

function removeWithDependencies(selectedSet) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const obj of [...store.doc.objects]) {
      if (selectedSet.has(obj.id)) {
        continue;
      }
      if (obj.pointIds && obj.pointIds.some((pid) => selectedSet.has(pid))) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.sourceLineId && selectedSet.has(obj.sourceLineId)) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.throughPointId && selectedSet.has(obj.throughPointId)) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.targetId && selectedSet.has(obj.targetId)) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.constraint?.kind === "intersection" && obj.constraint.sourceObjectIds?.some((srcId) => selectedSet.has(srcId))) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.constraint?.kind === "onObject" && selectedSet.has(obj.constraint.sourceObjectId)) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.constraint?.kind === "midpoint" && obj.constraint.sourcePointIds?.some((pid) => selectedSet.has(pid))) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (obj.constraint?.kind === "angleBisectorRay" && obj.constraint.sourcePointIds?.some((pid) => selectedSet.has(pid))) {
        selectedSet.add(obj.id);
        changed = true;
      }
      if (
        obj.constraint?.kind === "perpendicularBisectorEndpoint" &&
        obj.constraint.sourcePointIds?.some((pid) => selectedSet.has(pid))
      ) {
        selectedSet.add(obj.id);
        changed = true;
      }
    }
    for (const ann of [...store.doc.annotations]) {
      if (selectedSet.has(ann.id)) {
        continue;
      }
      if (ann.segmentId && selectedSet.has(ann.segmentId)) {
        selectedSet.add(ann.id);
        changed = true;
      }
      if (ann.targetId && selectedSet.has(ann.targetId)) {
        selectedSet.add(ann.id);
        changed = true;
      }
      if (ann.pointIds && ann.pointIds.some((pid) => selectedSet.has(pid))) {
        selectedSet.add(ann.id);
        changed = true;
      }
    }
  }

  store.doc.objects = store.doc.objects.filter((o) => !selectedSet.has(o.id));
  store.doc.annotations = store.doc.annotations.filter((a) => !selectedSet.has(a.id));
}

function deleteSelected() {
  const ids = new Set(store.selectedIds());
  if (!ids.size) {
    return;
  }
  runMutation("delete-selected", () => {
    removeWithDependencies(ids);
    store.clearSelection();
  });
}

function hideSelected() {
  const ids = new Set(store.selectedIds());
  if (!ids.size) {
    return;
  }
  runMutation("hide-selected", () => {
    for (const obj of store.doc.objects) {
      if (ids.has(obj.id)) {
        obj.hidden = true;
      }
    }
    for (const ann of store.doc.annotations) {
      if (ids.has(ann.id)) {
        ann.hidden = true;
      }
    }
    store.clearSelection();
  });
}

function showAllHidden() {
  const hasHidden =
    store.doc.objects.some((o) => o.hidden) || store.doc.annotations.some((a) => a.hidden);
  if (!hasHidden) {
    return;
  }
  runMutation("show-all", () => {
    for (const obj of store.doc.objects) {
      if (obj.hidden) {
        obj.hidden = false;
      }
    }
    for (const ann of store.doc.annotations) {
      if (ann.hidden) {
        ann.hidden = false;
      }
    }
    store.clearSelection();
  });
}

function buildPointMap() {
  const map = new Map();
  for (const obj of store.doc.objects) {
    if (obj.type !== "point") {
      continue;
    }
    const isPerpBisectorEndpoint = obj.constraint?.kind === "perpendicularBisectorEndpoint";
    const pt = obj.hidden
      ? boardController.createSupportPoint(obj.x, obj.y)
      : boardController.createPoint(obj.id, obj.x, obj.y, {
          ...obj.style,
          size: obj.constraint ? 4 : obj.style?.size,
          layer: obj.constraint ? 10 : obj.style?.layer,
          fixed:
            isPerpBisectorEndpoint
              ? session.currentMode !== ToolMode.SELECT
              : session.currentMode !== ToolMode.SELECT ||
                obj.constraint?.kind === "intersection" ||
                obj.constraint?.kind === "midpoint" ||
                obj.constraint?.kind === "angleBisectorRay" ||
                obj.style?.fixed,
        });
    map.set(obj.id, pt);
  }
  return map;
}

function migratePointNamesToDraggableLabels() {
  let changed = false;
  const existingTargets = new Set(
    store.doc.objects
      .filter((o) => o.type === "label" && o.pointName === true && o.targetId)
      .map((o) => o.targetId)
  );

  for (const obj of store.doc.objects) {
    if (obj.type !== "point" || !obj.name) {
      continue;
    }
    if (!existingTargets.has(obj.id)) {
      addObject({
        id: makeId("label"),
        type: "label",
        x: obj.x + 0.45,
        y: obj.y + 0.45,
        text: obj.name,
        auto: true,
        pointName: true,
        targetId: obj.id,
        style: defaultStyle(),
      });
    }
    obj.name = "";
    changed = true;
  }
  if (changed) {
    store.doc.metadata.updatedAt = new Date().toISOString();
  }
}

function renderCurrentDoc(applySelection = true) {
  recomputeConstrainedPoints();
  boardController.resetBoard();
  const points = buildPointMap();

  for (const obj of store.doc.objects) {
    if (obj.hidden) {
      continue;
    }
    if (obj.type === "point") {
      continue;
    }
    const style = { ...defaultStyle(), ...obj.style };
    if (obj.type === "segment") {
      const p1 = points.get(obj.pointIds[0]);
      const p2 = points.get(obj.pointIds[1]);
      if (p1 && p2) {
        boardController.createSegment(obj.id, p1, p2, style);
      }
    } else if (obj.type === "line") {
      const p1 = points.get(obj.pointIds[0]);
      const p2 = points.get(obj.pointIds[1]);
      if (p1 && p2) {
        boardController.createLine(obj.id, p1, p2, {
          ...style,
          rayExtension: getRayExtensionForObject(obj),
          ...getLineExtentsForObject(obj),
          lineType: obj.lineType,
        });
      }
    } else if (obj.type === "circle") {
      const center = points.get(obj.pointIds[0]);
      const through = points.get(obj.pointIds[1]);
      if (center && through) {
        boardController.createCircle(obj.id, center, through, style);
      }
    } else if (obj.type === "parallel") {
      const source = boardController.getElement(obj.sourceLineId);
      const through = points.get(obj.throughPointId);
      if (source && through) {
        const parallelStyle = { ...style };
        if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionStart")) {
          delete parallelStyle.lineExtensionStart;
        }
        if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionEnd")) {
          delete parallelStyle.lineExtensionEnd;
        }
        boardController.createParallelLine(obj.id, source, through, parallelStyle);
      }
    } else if (obj.type === "perpendicular") {
      const source = boardController.getElement(obj.sourceLineId);
      const through = points.get(obj.throughPointId);
      if (source && through) {
        const perpendicularStyle = { ...style };
        if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionStart")) {
          delete perpendicularStyle.lineExtensionStart;
        }
        if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionEnd")) {
          delete perpendicularStyle.lineExtensionEnd;
        }
        boardController.createPerpendicularLine(obj.id, source, through, perpendicularStyle);
      }
    } else if (obj.type === "label") {
      syncFollowLabelPosition(obj);
      boardController.createText(obj.id, obj.x, obj.y, obj.text, style);
    }
  }

  for (const ann of store.doc.annotations) {
    if (ann.hidden) {
      continue;
    }
    const style = { ...defaultStyle(), ...ann.style };
    if (ann.type === "tick") {
      const segment = boardController.getElement(ann.segmentId);
      if (segment) {
        boardController.createTickMark(ann.id, segment, ann.tickCount, style);
      }
    } else if (ann.type === "tickPoints") {
      const p1 = points.get(ann.pointIds?.[0]);
      const p2 = points.get(ann.pointIds?.[1]);
      if (p1 && p2) {
        boardController.createPointPairTickMarks(ann.id, p1, p2, ann.tickCount, style);
      }
    } else if (ann.type === "midpointTick") {
      const p1 = points.get(ann.pointIds?.[0]);
      const pm = points.get(ann.pointIds?.[1]);
      const p2 = points.get(ann.pointIds?.[2]);
      if (p1 && pm && p2) {
        boardController.createMidpointTickMarks(ann.id, p1, pm, p2, ann.tickCount, style);
      }
    } else if (ann.type === "parallelMark") {
      const target = boardController.getElement(ann.targetId);
      if (target) {
        boardController.createParallelChevronMarks(ann.id, target, ann.markCount, style);
      }
    } else if (ann.type === "angle") {
      const p1 = points.get(ann.pointIds[0]);
      const p2 = points.get(ann.pointIds[1]);
      const p3 = points.get(ann.pointIds[2]);
      if (p1 && p2 && p3) {
        const arcCount = Math.max(1, Number(ann.arcCount || 1));
        const decorator =
          ann.decorator === "arcTick" ? "arcTick" : ann.decorator === "tickOnly" ? "tickOnly" : "arc";
        const tickCount = Math.max(1, Number(ann.tickCount || arcCount || 1));
        const baseRadius = Math.max(0.15, Number(ann.style?.radius || 1));
        if (ann.right) {
          boardController.createAngle(ann.id, p1, p2, p3, {
            ...style,
            right: true,
            radius: baseRadius,
          });
        } else {
          if (decorator === "arcTick" || decorator === "tickOnly") {
            boardController.createAngle(ann.id, p1, p2, p3, {
              ...style,
              right: false,
              decorator,
              tickCount,
              radius: baseRadius,
            });
          } else {
            const radii = nestedAngleArcRadii(baseRadius, arcCount);
            for (let i = 0; i < radii.length; i += 1) {
              boardController.createAngle(`${ann.id}_arc_${i + 1}`, p1, p2, p3, {
                ...style,
                right: false,
                decorator: "arc",
                radius: radii[i],
              });
            }
          }
        }
      }
    }
  }

  if (applySelection) {
    for (const id of store.selectedIds()) {
      boardController.applyVisualState(id, true);
    }
  }
  if (pointNeeds(session.currentMode) > 0 && session.pendingPointIds.length) {
    for (const id of session.pendingPointIds) {
      boardController.applyVisualState(id, true);
    }
  }
  boardController.update();
}

function applyDoc(doc, fromCommand = false) {
  store.setDoc(doc);
  store.doc.styles.rayExtension = normalizedRayExtension(store.doc.styles.rayExtension);
  store.doc.styles.lineExtensionStart = normalizedLineExtension(store.doc.styles.lineExtensionStart);
  store.doc.styles.lineExtensionEnd = normalizedLineExtension(store.doc.styles.lineExtensionEnd);
  if (!Number.isFinite(store.doc.styles.fontSize) || store.doc.styles.fontSize < 20) {
    store.doc.styles.fontSize = 20;
  }
  migratePointNamesToDraggableLabels();
  if (!fromCommand) {
    store.commandStack.clear();
  }
  renderCurrentDoc();
  syncStyleInputsFromDoc();
}

function syncStyleInputsFromDoc() {
  const styles = store.doc.styles || {};
  const strokeColorEl = document.getElementById("strokeColor");
  const strokeWidthEl = document.getElementById("strokeWidth");
  const lineStyleEl = document.getElementById("lineStyle");
  const examModeEl = document.getElementById("examMode");
  if (strokeColorEl && styles.defaultStrokeColor) {
    strokeColorEl.value = styles.defaultStrokeColor;
  }
  if (strokeWidthEl && Number.isFinite(styles.defaultStrokeWidth)) {
    strokeWidthEl.value = String(styles.defaultStrokeWidth);
  }
  if (lineStyleEl) {
    lineStyleEl.value = Number(styles.defaultDash) ? "dashed" : "solid";
  }
  if (examModeEl) {
    examModeEl.checked = !!styles.examMode;
  }
}

function selectedOfTypes(types) {
  return store.selectedIds().filter((id) => {
    const obj = getObjectById(id) || store.doc.annotations.find((a) => a.id === id);
    if (!obj) {
      return false;
    }
    return types.includes(obj.type);
  });
}

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

function segmentConnects(a, b, segment) {
  const [s1, s2] = segment.pointIds;
  return (s1 === a && s2 === b) || (s1 === b && s2 === a);
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
  const bbox = boardController.board?.getBoundingBox?.() || [-10, 10, 10, -10];
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
      alert("Select one triangle first (3 points or its 3 sides).");
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
      alert("Select one triangle first (3 points or its 3 sides).");
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

function transformSelectedTriangle() {
  if (!startTriangleTransformSession("transform")) {
    return;
  }
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
      return true;
    },
  });
}

function applyStyleToSelection() {
  const color = document.getElementById("strokeColor").value;
  const width = Number(document.getElementById("strokeWidth").value);
  const lineStyle = document.getElementById("lineStyle").value;
  const dash = lineStyle === "dashed" ? 2 : 0;
  const selectedIds = store.selectedIds();
  if (!selectedIds.length) {
    store.doc.styles.defaultStrokeColor = color;
    store.doc.styles.defaultStrokeWidth = width;
    store.doc.styles.defaultDash = dash;
    renderCurrentDoc(false);
    return;
  }

  runMutation("style-selection", () => {
    for (const id of selectedIds) {
      const obj = getObjectById(id);
      if (obj) {
        obj.style = obj.style || {};
        obj.style.strokeColor = color;
        obj.style.strokeWidth = width;
        obj.style.dash = dash;
      }
      const ann = store.doc.annotations.find((a) => a.id === id);
      if (ann) {
        ann.style = ann.style || {};
        ann.style.strokeColor = color;
        ann.style.strokeWidth = width;
      }
    }
  });
}

function createParallelOrPerpendicular(kind, options = {}) {
  const quiet = !!options.quiet;
  const selected = store.selectedIds();

  let sourceLineId = null;
  let throughPointId = null;
  for (const id of selected) {
    const obj = getObjectById(id);
    if (!obj) {
      continue;
    }
    if (["line", "segment", "parallel", "perpendicular"].includes(obj.type)) {
      sourceLineId = id;
    }
    if (obj.type === "point") {
      throughPointId = id;
    }
  }

  if (!sourceLineId || !throughPointId) {
    if (!quiet) {
      alert("Select a point and one line/segment/parallel/perpendicular.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }

  runMutation(`create-${kind}`, () => {
    const style = { ...defaultStyle(), dash: 0 };
    delete style.lineExtensionStart;
    delete style.lineExtensionEnd;
    addObject({
      id: makeId(kind === "parallel" ? "par" : "perp"),
      type: kind,
      sourceLineId,
      throughPointId,
      style,
    });
    store.clearSelection();
  });
  return true;
}

function addTicks(tickCount, options = {}) {
  const quiet = !!options.quiet;
  const segments = selectedOfTypes(["segment"]);
  const selectedPoints = selectedOfTypes(["point"]);
  let pointPair = null;
  if (!segments.length && selectedPoints.length === 2) {
    pointPair = [selectedPoints[0], selectedPoints[1]];
  }
  if (!segments.length && !pointPair) {
    if (!quiet) {
      alert("Select one or more segments, or exactly two points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const groupId = makeId("cg");

  runMutation(`tick-${tickCount}`, () => {
    if (segments.length) {
      for (const segmentId of segments) {
        addAnnotation({
          id: makeId("tick"),
          type: "tick",
          groupId,
          segmentId,
          tickCount,
          style: defaultStyle(),
        });
      }
    } else if (pointPair) {
      addAnnotation({
        id: makeId("tick"),
        type: "tickPoints",
        groupId,
        pointIds: [...pointPair],
        tickCount,
        style: defaultStyle(),
      });
    }
    store.clearSelection();
  });
  return true;
}

function addParallelMarks(markCount, options = {}) {
  const quiet = !!options.quiet;
  const targets = selectedOfTypes(["segment", "line", "parallel", "perpendicular"]);
  if (!targets.length) {
    if (!quiet) {
      alert("Select one or more segments/lines/parallel/perpendicular objects first.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const groupId = makeId("pm");
  runMutation(`parallel-mark-${markCount}`, () => {
    for (const targetId of targets) {
      addAnnotation({
        id: makeId("pmk"),
        type: "parallelMark",
        groupId,
        targetId,
        markCount,
        style: defaultStyle(),
      });
    }
    store.clearSelection();
  });
  return true;
}

function launchSegmentTicks(tickCount, buttonId) {
  if (addTicks(tickCount, { quiet: true })) {
    return;
  }
  startConstructionSelectionSession({
    kind: `segment-ticks-${tickCount}`,
    label: `Segment Ticks (${tickCount})`,
    buttonId,
    instructions: "Select one or more segments, or exactly two points.",
    tryCreate: () => addTicks(tickCount, { quiet: true }),
  });
}

function launchParallelMarks(markCount, buttonId) {
  if (addParallelMarks(markCount, { quiet: true })) {
    return;
  }
  startConstructionSelectionSession({
    kind: `parallel-marks-${markCount}`,
    label: `Parallel Marks (${markCount})`,
    buttonId,
    instructions: "Select one or more segments/lines/parallel/perpendicular objects.",
    tryCreate: () => addParallelMarks(markCount, { quiet: true }),
  });
}

function midpointSelectionEndpoints() {
  const selectedSegments = selectedOfTypes(["segment"]).map((id) => getObjectById(id)).filter(Boolean);
  if (selectedSegments.length === 1) {
    const [a, b] = selectedSegments[0].pointIds || [];
    if (a && b) {
      return [a, b];
    }
  }
  const selectedPoints = selectedOfTypes(["point"]);
  if (selectedPoints.length === 2) {
    return selectedPoints;
  }
  return null;
}

function angleBisectorSelectionPointIds() {
  const selectedPoints = selectedOfTypes(["point"]);
  if (selectedPoints.length === 3) {
    return selectedPoints;
  }
  const selectedAngles = selectedOfTypes(["angle"]);
  if (selectedAngles.length === 1) {
    const ann = store.doc.annotations.find((a) => a.id === selectedAngles[0] && a.type === "angle");
    if (ann?.pointIds?.length === 3) {
      return [...ann.pointIds];
    }
  }
  return null;
}

function addMidpoint(tickCount = 0, options = {}) {
  const quiet = !!options.quiet;
  const endpoints = midpointSelectionEndpoints();
  if (!endpoints) {
    if (!quiet) {
      alert("Select exactly one segment or exactly two points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const [pointAId, pointBId] = endpoints;
  if (!pointAId || !pointBId || pointAId === pointBId) {
    if (!quiet) {
      alert("Select two distinct endpoints.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const pointA = getPointById(pointAId);
  const pointB = getPointById(pointBId);
  if (!pointA || !pointB || distance(pointA, pointB) < 1e-9) {
    if (!quiet) {
      alert("Selected endpoints must be distinct points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }

  runMutation(`midpoint${tickCount ? `-${tickCount}-tick` : ""}`, () => {
    const midpointId = maybeCreateMidpointPoint(pointAId, pointBId);
    if (!midpointId) {
      return;
    }
    if (tickCount > 0) {
      addAnnotation({
        id: makeId("mdtk"),
        type: "midpointTick",
        pointIds: [pointAId, midpointId, pointBId],
        tickCount,
        style: defaultStyle(),
      });
    }
    store.clearSelection();
  });
  return true;
}

function addAngleBisector(tickCount = 0, options = {}) {
  const quiet = !!options.quiet;
  const pointIds = angleBisectorSelectionPointIds();
  if (!pointIds) {
    if (!quiet) {
      alert("Select exactly 3 points (with the vertex second) or one angle mark.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const [pointAId, vertexId, pointBId] = pointIds;
  const pointA = getPointById(pointAId);
  const vertex = getPointById(vertexId);
  const pointB = getPointById(pointBId);
  const probe = angleBisectorDirectionPoint(pointA, vertex, pointB, 1);
  if (!probe) {
    if (!quiet) {
      alert("Cannot bisect a degenerate or straight angle selection.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }

  runMutation(`angle-bisector${tickCount ? `-${tickCount}-tick` : ""}`, () => {
    const directionPointId = maybeCreateAngleBisectorDirectionPoint(pointAId, vertexId, pointBId);
    if (!directionPointId) {
      return;
    }
    const rayId = makeId("bis");
    addObject({
      id: rayId,
      type: "line",
      lineType: "ray",
      pointIds: [vertexId, directionPointId],
      construction: "angleBisector",
      style: { ...defaultStyle(), rayExtension: normalizedRayExtension(store.doc.styles.rayExtension) },
    });
    if (tickCount > 0) {
      const groupId = makeId("abm");
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        groupId,
        pointIds: [pointAId, vertexId, directionPointId],
        right: false,
        arcCount: 1,
        decorator: "arcTick",
        tickCount,
        style: defaultStyle(),
      });
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        groupId,
        pointIds: [directionPointId, vertexId, pointBId],
        right: false,
        arcCount: 1,
        decorator: "arcTick",
        tickCount,
        style: defaultStyle(),
      });
    }
    store.clearSelection();
  });
  return true;
}

function createPerpendicularBisectorVariant(options = {}, runtime = {}) {
  const quiet = !!runtime.quiet;
  const endpoints = midpointSelectionEndpoints();
  if (!endpoints) {
    if (!quiet) {
      alert("Select exactly one segment or exactly two points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const [pointAId, pointBId] = endpoints;
  const pointA = getPointById(pointAId);
  const pointB = getPointById(pointBId);
  if (!pointA || !pointB || distance(pointA, pointB) < 1e-9) {
    if (!quiet) {
      alert("Selected endpoints must be distinct points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  session.perpendicularBisectorPlacement = {
    pointAId,
    pointBId,
    withRightAngle: !!options.withRightAngle,
    withMidpointTicks: !!options.withMidpointTicks,
    halfLength: Math.max(0.6, distance(pointA, pointB) * 0.45),
    side: 1,
    variantLabel: options.variantLabel || "",
    buttonId: options.buttonId || null,
  };
  statusEl.textContent = "Mode: Perpendicular Bisector (move cursor, click to place segment)";
  renderCurrentDoc(false);
  return true;
}

function launchParallelOrPerpendicular(kind, buttonId = null) {
  if (createParallelOrPerpendicular(kind, { quiet: true })) {
    return;
  }
  startConstructionSelectionSession({
    kind: `construct-${kind}`,
    label: kind === "parallel" ? "Parallel" : "Perpendicular",
    buttonId,
    instructions: "Select a point and a line/segment/parallel/perpendicular source.",
    tryCreate: () => createParallelOrPerpendicular(kind, { quiet: true }),
  });
}

function launchMidpoint(tickCount = 0, buttonId = null) {
  if (addMidpoint(tickCount, { quiet: true })) {
    return;
  }
  const suffix = tickCount > 0 ? ` ${tickCount} Tick${tickCount > 1 ? "s" : ""}` : "";
  startConstructionSelectionSession({
    kind: `midpoint-${tickCount}`,
    label: `Midpoint${suffix}`,
    buttonId,
    instructions: "Select exactly one segment or exactly two points.",
    tryCreate: () => addMidpoint(tickCount, { quiet: true }),
  });
}

function launchAngleBisector(tickCount = 0, buttonId = null) {
  if (addAngleBisector(tickCount, { quiet: true })) {
    return;
  }
  const suffix = tickCount > 0 ? ` ${tickCount} Tick${tickCount > 1 ? "s" : ""}` : "";
  startConstructionSelectionSession({
    kind: `angle-bisector-${tickCount}`,
    label: `Angle Bisector${suffix}`,
    buttonId,
    instructions: "Select exactly 3 points (vertex second) or one angle mark.",
    tryCreate: () => addAngleBisector(tickCount, { quiet: true }),
  });
}

function launchPerpendicularBisectorVariant(options = {}) {
  if (createPerpendicularBisectorVariant(options, { quiet: true })) {
    return;
  }
  const labelSuffix = options.withRightAngle && options.withMidpointTicks
    ? " + Rt ∠ + MP"
    : options.withRightAngle
      ? " + Rt ∠"
      : options.withMidpointTicks
        ? " + MP"
        : "";
  startConstructionSelectionSession({
    kind: `perp-bisector${options.variantLabel || ""}`,
    label: `Perp Bisector${labelSuffix}`,
    buttonId: options.buttonId || null,
    instructions: "Select exactly one segment or exactly two points.",
    tryCreate: () => createPerpendicularBisectorVariant(options, { quiet: true }),
  });
}

function addAngleFromSelection(isRight, arcCount = 1, decorator = "arc") {
  const pts = selectedOfTypes(["point"]);
  if (pts.length === 3) {
    runMutation("add-angle", () => {
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        pointIds: pts,
        right: isRight,
        arcCount: isRight ? 1 : arcCount,
        decorator: isRight ? "right" : decorator,
        tickCount: isRight ? 0 : decorator === "arcTick" ? arcCount : 0,
        style: defaultStyle(),
      });
    });
    return true;
  }
  return false;
}

function angleMarkConfigFromSelectionValue(value) {
  const [kind, rawCount] = String(value || "arc-1").split("-");
  const count = Math.max(1, Number(rawCount || 1));
  if (kind === "arctick") {
    return { decorator: "arcTick", count };
  }
  return { decorator: "arc", count };
}

function setActiveAngleMarkPreset(value) {
  const cfg = angleMarkConfigFromSelectionValue(value);
  session.pendingAngleIsRight = false;
  session.pendingAngleDecorator = cfg.decorator;
  session.pendingAngleArcCount = cfg.count;
  session.activeAngleMarkPresetValue = value || null;
  setMode(ToolMode.ANGLE);
}

function addSideMeasure(options = {}) {
  const quiet = !!options.quiet;
  const segments = selectedOfTypes(["segment"]);
  if (segments.length !== 1) {
    if (!quiet) {
      alert("Select exactly one segment.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const segment = getObjectById(segments[0]);
  const p1 = getPointById(segment.pointIds[0]);
  const p2 = getPointById(segment.pointIds[1]);
  if (!p1 || !p2) {
    return false;
  }
  const value = distance(p1, p2);
  const defaultText = value.toFixed(2);
  const text = prompt("Side length label:", defaultText);
  if (text === null) {
    return false;
  }

  runMutation("add-side-measure", () => {
    addObject({
      id: makeId("label"),
      type: "label",
      x: (p1.x + p2.x) / 2 + 0.35,
      y: (p1.y + p2.y) / 2 + 0.35,
      text: text.trim() || defaultText,
      targetId: segment.id,
      follow: {
        kind: "sideMeasure",
        segmentId: segment.id,
        offsetX: 0.35,
        offsetY: 0.35,
      },
      style: defaultStyle(),
    });
  });
  return true;
}

function resolveAngleMeasurePointIds() {
  const pts = selectedOfTypes(["point"]);
  if (pts.length === 3) {
    return pts;
  }
  const selectedAngles = selectedOfTypes(["angle"]);
  if (selectedAngles.length === 1) {
    const ann = store.doc.annotations.find((a) => a.id === selectedAngles[0] && a.type === "angle");
    if (ann) {
      return ann.pointIds;
    }
  }
  return null;
}

function addAngleMeasure(options = {}) {
  const quiet = !!options.quiet;
  const pointIds = resolveAngleMeasurePointIds();
  if (!pointIds) {
    if (!quiet) {
      alert("Select 3 points or one angle mark.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const p1 = getPointById(pointIds[0]);
  const p2 = getPointById(pointIds[1]);
  const p3 = getPointById(pointIds[2]);
  if (!p1 || !p2 || !p3) {
    return false;
  }
  const deg = angleDegrees(p1, p2, p3);
  const rounded = `${deg.toFixed(0)}°`;
  const textInput = prompt("Angle measure label:", rounded);
  if (textInput === null) {
    return false;
  }
  let text = textInput.trim() || rounded;
  if (!text.includes("°")) {
    text = `${text}°`;
  }

  runMutation("add-angle-measure", () => {
    addObject({
      id: makeId("label"),
      type: "label",
      x: p2.x + 0.55,
      y: p2.y + 0.55,
      text,
      follow: {
        kind: "angleMeasure",
        pointIds: [...pointIds],
        offsetX: 0.55,
        offsetY: 0.55,
      },
      style: defaultStyle(),
    });
  });
  return true;
}

function launchSideMeasure(buttonId) {
  if (addSideMeasure({ quiet: true })) {
    return;
  }
  startConstructionSelectionSession({
    kind: "side-measure",
    label: "Side Length",
    buttonId,
    instructions: "Select exactly one segment.",
    persistAfterSuccess: true,
    tryCreate: () => addSideMeasure({ quiet: true }),
  });
}

function launchAngleMeasure(buttonId) {
  if (addAngleMeasure({ quiet: true })) {
    return;
  }
  startConstructionSelectionSession({
    kind: "angle-measure",
    label: "Angle Measure",
    buttonId,
    instructions: "Select 3 points or one angle mark.",
    persistAfterSuccess: true,
    tryCreate: () => addAngleMeasure({ quiet: true }),
  });
}

function promptLabel() {
  const text = prompt("Label text:");
  if (!text) {
    return;
  }

  const selectedTargetId =
    selectedOfTypes(["point", "segment", "line", "circle", "parallel", "perpendicular"])[0] || null;
  runMutation("add-label", () => {
    if (selectedTargetId) {
      const target = getObjectById(selectedTargetId);
      if (!target) {
        return;
      }
      const anchor = autoLabelAnchorForObject(target);
      addObject({
        id: makeId("label"),
        type: "label",
        x: anchor.x,
        y: anchor.y,
        text,
        targetId: target.id,
        follow: followLabelForTargetObject(target),
        style: defaultStyle(),
      });
    } else {
      addObject({
        id: makeId("label"),
        type: "label",
        x: 0,
        y: 0,
        text,
        style: defaultStyle(),
      });
    }
  });
}

function autoLabelPoints() {
  if (session.currentMode === ToolMode.LABEL) {
    setMode(ToolMode.SELECT);
  } else {
    setMode(ToolMode.LABEL);
  }
}

function clearBoard() {
  runMutation("clear-board", () => {
    const next = createEmptyFigureDoc();
    next.styles = { ...store.doc.styles };
    store.doc = next;
    store.clearSelection();
  });
}

async function downloadSvg() {
  const background = document.getElementById("bgMode").value;
  const tight = document.getElementById("tightSvg").checked;
  const raw = withExportIntersectionPointBlack(() => boardController.exportBoardSvg());
  const svg = exportSVG(raw, { background, tight });
  const name = `figure-${timestampForFile()}.svg`;
  triggerDownload(name, svg, "image/svg+xml");
}

async function downloadPng() {
  const background = document.getElementById("bgMode").value;
  const scale = Number(document.getElementById("pngScale").value);
  const raw = withExportIntersectionPointBlack(() => boardController.exportBoardSvg());
  const svg = exportSVG(raw, { background, tight: true });
  const blob = await exportPNG(svg, { background, scale });
  const name = `figure-${timestampForFile()}.png`;
  downloadBlob(name, blob);
}

function withExportIntersectionPointBlack(fn) {
  const changedPoints = [];
  for (const obj of store.doc.objects) {
    if (obj.type !== "point" || !obj.constraint) {
      continue;
    }
    const style = obj.style || (obj.style = {});
    changedPoints.push({ obj, prev: style.strokeColor });
    style.strokeColor = "#000000";
  }
  if (changedPoints.length) {
    renderCurrentDoc(false);
  }
  try {
    return fn();
  } finally {
    for (const { obj, prev } of changedPoints) {
      obj.style = obj.style || {};
      if (prev === undefined) {
        delete obj.style.strokeColor;
      } else {
        obj.style.strokeColor = prev;
      }
    }
    if (changedPoints.length) {
      renderCurrentDoc(false);
    }
  }
}

function saveDoc() {
  const content = JSON.stringify(store.doc, null, 2);
  const name = `figure-${timestampForFile()}.geojson`;
  triggerDownload(name, content, "application/json");
}

function openDocFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      validateFigureDoc(parsed);
      applyDoc(cloneFigureDoc(parsed));
      store.commandStack.clear();
    } catch (err) {
      alert(`Cannot open document: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function wireUi() {
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  if (triangleMenuBtn && triangleMenuPanel) {
    triangleMenuBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      triangleMenuPanel.hidden = !triangleMenuPanel.hidden;
    });

    triangleModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setTriangleMode(btn.dataset.triangleMode);
        triangleMenuPanel.hidden = true;
      });
    });

    document.addEventListener("click", (evt) => {
      if (!triangleMenuPanel.hidden && !triangleMenuPanel.contains(evt.target) && evt.target !== triangleMenuBtn) {
        triangleMenuPanel.hidden = true;
      }
    });
  }

  document.getElementById("markTick1").addEventListener("click", () => launchSegmentTicks(1, "markTick1"));
  document.getElementById("markTick2").addEventListener("click", () => launchSegmentTicks(2, "markTick2"));
  document.getElementById("markTick3").addEventListener("click", () => launchSegmentTicks(3, "markTick3"));
  document.getElementById("makeMidpoint").addEventListener("click", () => launchMidpoint(0, "makeMidpoint"));
  document.getElementById("makeMidpointTick1").addEventListener("click", () => launchMidpoint(1, "makeMidpointTick1"));
  document.getElementById("makeMidpointTick2").addEventListener("click", () => launchMidpoint(2, "makeMidpointTick2"));
  document.getElementById("makeMidpointTick3").addEventListener("click", () => launchMidpoint(3, "makeMidpointTick3"));
  document.getElementById("makePerpBisector").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({ variantLabel: "", buttonId: "makePerpBisector" })
  );
  document.getElementById("makePerpBisectorRA").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({ withRightAngle: true, variantLabel: "-right", buttonId: "makePerpBisectorRA" })
  );
  document.getElementById("makePerpBisectorTicks").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({ withMidpointTicks: true, variantLabel: "-ticks", buttonId: "makePerpBisectorTicks" })
  );
  document.getElementById("makePerpBisectorBoth").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({
      withRightAngle: true,
      withMidpointTicks: true,
      variantLabel: "-both",
      buttonId: "makePerpBisectorBoth",
    })
  );
  document.getElementById("makeAngleBisector").addEventListener("click", () => launchAngleBisector(0, "makeAngleBisector"));
  document.getElementById("makeAngleBisectorTick1").addEventListener("click", () => launchAngleBisector(1, "makeAngleBisectorTick1"));
  document.getElementById("makeAngleBisectorTick2").addEventListener("click", () => launchAngleBisector(2, "makeAngleBisectorTick2"));
  document.getElementById("makeAngleBisectorTick3").addEventListener("click", () => launchAngleBisector(3, "makeAngleBisectorTick3"));
  document.getElementById("markParallel1").addEventListener("click", () => launchParallelMarks(1, "markParallel1"));
  document.getElementById("markParallel2").addEventListener("click", () => launchParallelMarks(2, "markParallel2"));
  document.getElementById("markParallel3").addEventListener("click", () => launchParallelMarks(3, "markParallel3"));
  document.getElementById("addSideMeasure").addEventListener("click", () => launchSideMeasure("addSideMeasure"));
  document.getElementById("addAngleMeasure").addEventListener("click", () => launchAngleMeasure("addAngleMeasure"));

  angleMarkPresetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveAngleMarkPreset(btn.dataset.angleMark);
    });
  });

  document.getElementById("markRightAngle").addEventListener("click", () => {
    if (!addAngleFromSelection(true, 1)) {
      session.pendingAngleIsRight = true;
      session.pendingAngleDecorator = "arc";
      session.pendingAngleArcCount = 1;
      session.activeAngleMarkPresetValue = null;
      setMode(ToolMode.ANGLE);
    }
  });

  document.getElementById("addLabel").addEventListener("click", promptLabel);
  document.getElementById("autoLabel").addEventListener("click", autoLabelPoints);

  document.getElementById("makeParallel").addEventListener("click", () => launchParallelOrPerpendicular("parallel", "makeParallel"));
  document.getElementById("makePerpendicular").addEventListener("click", () => launchParallelOrPerpendicular("perpendicular", "makePerpendicular"));
  document.getElementById("makeCongruentTriangle").addEventListener("click", () =>
    launchTriangleCopy("congruent", "makeCongruentTriangle")
  );
  document.getElementById("makeSimilarTriangle").addEventListener("click", () =>
    launchTriangleCopy("similar", "makeSimilarTriangle")
  );
  document.getElementById("transformSelectedTriangle").addEventListener("click", () =>
    launchTriangleTransform("transformSelectedTriangle")
  );
  document.getElementById("cancelTransformTriangle").addEventListener("click", cancelTransformSession);
  document.getElementById("applyTransformTriangle").addEventListener("click", () => commitTransformSession("transform-selected-triangle"));
  document.getElementById("reflectHorizontalTriangle").addEventListener("click", () => {
    if (!session.transformSession) {
      return;
    }
    session.transformSession.mirrorY *= -1;
    applyTransformPreview();
  });
  document.getElementById("reflectVerticalTriangle").addEventListener("click", () => {
    if (!session.transformSession) {
      return;
    }
    session.transformSession.mirrorX *= -1;
    applyTransformPreview();
  });

  moveXSliderEl.addEventListener("input", () => {
    if (!session.transformSession) {
      return;
    }
    session.transformSession.dx = Number(moveXSliderEl.value);
    updateMoveReadouts();
    applyTransformPreview();
  });
  moveYSliderEl.addEventListener("input", () => {
    if (!session.transformSession) {
      return;
    }
    session.transformSession.dy = Number(moveYSliderEl.value);
    updateMoveReadouts();
    applyTransformPreview();
  });

  rotationCompassEl.addEventListener("mousedown", (evt) => {
    if (!session.transformSession) {
      return;
    }
    evt.preventDefault();
    session.compassDragging = true;
    rotationCompassEl.classList.add("dragging");
    session.transformSession.angleDeg = angleFromCompassEvent(evt);
    updateCompassReadout();
    applyTransformPreview();
  });

  window.addEventListener("mousemove", (evt) => {
    if (!session.compassDragging || !session.transformSession) {
      return;
    }
    session.transformSession.angleDeg = angleFromCompassEvent(evt);
    updateCompassReadout();
    applyTransformPreview();
  });

  window.addEventListener("mouseup", () => {
    if (!session.compassDragging) {
      return;
    }
    session.compassDragging = false;
    rotationCompassEl.classList.remove("dragging");
  });

  document.getElementById("deleteSelected").addEventListener("click", deleteSelected);
  document.getElementById("hideSelected").addEventListener("click", hideSelected);
  document.getElementById("showAll").addEventListener("click", showAllHidden);
  document.getElementById("clearBoard").addEventListener("click", clearBoard);

  document.getElementById("undoBtn").addEventListener("click", () => {
    store.commandStack.undo();
    renderCurrentDoc();
  });

  document.getElementById("redoBtn").addEventListener("click", () => {
    store.commandStack.redo();
    renderCurrentDoc();
  });

  document.getElementById("downloadSvg").addEventListener("click", () => {
    downloadSvg().catch((err) => alert(err.message));
  });
  document.getElementById("downloadPng").addEventListener("click", () => {
    downloadPng().catch((err) => alert(err.message));
  });

  document.getElementById("saveDoc").addEventListener("click", saveDoc);
  document.getElementById("openDoc").addEventListener("change", (evt) => {
    const file = evt.target.files?.[0];
    if (file) {
      openDocFromFile(file);
    }
    evt.target.value = "";
  });

  document.getElementById("strokeColor").addEventListener("input", applyStyleToSelection);
  document.getElementById("resetStrokeColor").addEventListener("click", () => {
    const colorInput = document.getElementById("strokeColor");
    colorInput.value = "#000000";
    applyStyleToSelection();
  });
  document.getElementById("strokeWidth").addEventListener("input", applyStyleToSelection);
  document.getElementById("resetStrokeWidth").addEventListener("click", () => {
    const widthInput = document.getElementById("strokeWidth");
    widthInput.value = "2";
    applyStyleToSelection();
  });
  document.getElementById("lineStyle").addEventListener("change", applyStyleToSelection);
  document.getElementById("examMode").addEventListener("change", (evt) => {
    runMutation("toggle-exam-mode", () => {
      store.doc.styles.examMode = evt.target.checked;
    });
  });

  window.addEventListener("keydown", (evt) => {
    const target = evt.target;
    const isEditable =
      !!target &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const mod = evt.metaKey || evt.ctrlKey;
    const key = evt.key.toLowerCase();

    if (mod && key === "z" && !isEditable) {
      evt.preventDefault();
      if (evt.shiftKey) {
        store.commandStack.redo();
      } else {
        store.commandStack.undo();
      }
      renderCurrentDoc();
      return;
    }

    if (mod && (key === "y" || (key === "z" && evt.shiftKey)) && !isEditable) {
      evt.preventDefault();
      store.commandStack.redo();
      renderCurrentDoc();
      return;
    }

    if (evt.key === "Delete" || evt.key === "Backspace") {
      if (isEditable) {
        return;
      }
      evt.preventDefault();
      deleteSelected();
    }
    if (key === "h" && !mod && !isEditable) {
      evt.preventDefault();
      hideSelected();
      return;
    }
    if (evt.key === "Escape") {
      store.clearSelection();
      session.pendingPointIds = [];
      setMode(ToolMode.SELECT);
      renderCurrentDoc(false);
    }
  }, true);
}

wireUi();
startMarqueeSelection();
updateModeUi();
syncStyleInputsFromDoc();
renderCurrentDoc();

if (drawingHintEl) {
  drawingHintEl.addEventListener("mouseenter", () => {
    drawingHintEl.hidden = true;
  });
  drawingHintEl.addEventListener("mouseleave", () => {
    const text = canvasHintText();
    drawingHintEl.textContent = text;
    drawingHintEl.hidden = !text;
  });
}
