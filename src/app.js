import { BoardController } from "./board/boardController.js";
import { AppStore } from "./state/store.js";
import { ToolMode, isToolMode } from "./state/toolModes.js";
import {
  createEmptyFigureDoc,
  cloneFigureDoc,
  normalizeImportedFigureDoc,
  serializeFigureDocPackage,
  validateFigureDoc,
} from "./state/figureDoc.js";
import { triggerDownload } from "./export/exportSvg.js";
import { arc3ptNeedsSwap, arcCSENeedsSwap, computeIncenter, computeInradius, computeCircumcenter } from "./app/geometry/circles.js";
import { createCircleToolWorkflow } from "./app/workflows/circleToolWorkflow.js";
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
  intersectDefinitions,
  nearestPointTo,
} from "./app/geometry/intersections.js";
import {
  angleBisectorDirectionPoint,
  perpendicularBisectorEndpointPoint,
  rightTriangleApexFromCursor,
  isoscelesApexFromCursor,
  equilateralApexFromCursor,
  regularPolygonVerticesFromEdge,
  regularPolygonCenterFromEdge,
} from "./app/geometry/constructions.js";
import { constraintEntry } from "./app/constraints/registry.js";
import { angleDegrees, nestedAngleArcRadii } from "./app/geometry/angles.js";
import { normalizedRayExtension, normalizedLineExtension, rayEndpoint } from "./app/geometry/linear.js";
import { createEditorSession } from "./app/session/editorSession.js";
import { createDomRefs } from "./app/dom/domRefs.js";
import { createModeUi } from "./app/ui/modeUi.js";
import { syncStyleInputsFromDoc as syncStyleInputsFromDocUi } from "./app/ui/styleUi.js";
import { wireUi } from "./app/ui/wireUi.js";
import { openTextModal, openNumberModal, showNotice, isModalOpen } from "./app/ui/modals.js";
import { createRenderDoc } from "./app/render/renderDoc.js";
import { createApplyDoc } from "./app/render/docApply.js";
import { createMarqueeSelectionWorkflow } from "./app/workflows/marqueeSelection.js";
import { createSelectionClickWorkflow } from "./app/workflows/selectionClicks.js";
import { createBoardMovePreviewWorkflow } from "./app/workflows/boardMovePreview.js";
import { createPointPlacementClickWorkflow } from "./app/workflows/pointPlacementClick.js";
import { createPointCollectionBoardClickWorkflow } from "./app/workflows/pointCollectionBoardClick.js";
import { createPointCollectionObjectClickWorkflow } from "./app/workflows/pointCollectionObjectClick.js";
import { createObjectClickModeBranchesWorkflow } from "./app/workflows/objectClickModeBranches.js";
import { createLabelManagementWorkflow } from "./app/workflows/labelManagementWorkflow.js";
import { createObjectClickConstructionSelectionWorkflow } from "./app/workflows/objectClickConstructionSelection.js";
import { createObjectClickNearPointRedirectWorkflow } from "./app/workflows/objectClickNearPointRedirect.js";
import { createPerpendicularBisectorPlacementBoardClickWorkflow } from "./app/workflows/perpendicularBisectorPlacementBoardClick.js";
import { createAngleModeBoardClickWorkflow } from "./app/workflows/angleModeBoardClick.js";
import { createPointInputLinearCircleCreateWorkflow } from "./app/workflows/pointInputLinearCircleCreate.js";
import { createPointInputAngleCreateWorkflow } from "./app/workflows/pointInputAngleCreate.js";
import { createPointInputTriangleCreateWorkflow } from "./app/workflows/pointInputTriangleCreate.js";
import { createObjectMoveAngleWorkflow } from "./app/workflows/objectMoveAngle.js";
import { createObjectMoveRayVisibleResizeWorkflow } from "./app/workflows/objectMoveRayVisibleResize.js";
import { createObjectMoveLineVisibleResizeWorkflow } from "./app/workflows/objectMoveLineVisibleResize.js";
import { createObjectMoveSegmentWorkflow } from "./app/workflows/objectMoveSegment.js";
import { createObjectMoveCircleWorkflow } from "./app/workflows/objectMoveCircle.js";
import { createObjectMoveRayWorkflow } from "./app/workflows/objectMoveRay.js";
import { createObjectMoveLineWorkflow } from "./app/workflows/objectMoveLine.js";
import { createObjectMovePointLabelWorkflow } from "./app/workflows/objectMovePointLabel.js";
import { createTangentToolsWorkflow } from "./app/workflows/tangentTools.js";
import { createTriangleCopyTransformWorkflow, segmentConnects } from "./app/workflows/triangleCopyTransform.js";
import { createExportActionsWorkflow } from "./app/workflows/exportActions.js";
import { createBackgroundImageWorkflow } from "./app/workflows/backgroundImage.js";
import { launchShadeRegionFill } from "./app/workflows/shadeRegionFill.js";
import { installGeoTestHook } from "./app/testHooks.js";

const store = new AppStore();
// Phase 2 scaffolding: session object will replace file-scope mutable state incrementally.
const session = createEditorSession();
const dom = createDomRefs(document);
const {
  statusEl,
  drawingHintEl,
  autoLabelBtn,
  strokeColorEl,
  strokeWidthEl,
  lineStyleEl,
  boardEl,
  modeButtons,
  triangleMenuBtn,
  triangleMenuPanel,
  triangleModeButtons,
  angleMarkPresetButtons,
} = dom;
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
  "makeRegularPolygonPlain",
  "makeRegularPolygonTicks",
  "makeRegularPolygonArcTicks",
  "makeRegularPolygonPlainCenter",
  "makeRegularPolygonTicksCenter",
  "makeRegularPolygonArcTicksCenter",
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
  "makeInscribedCircle",
  "makeInscribedCircleCenter",
  "makeCircumscribedCircle",
  "makeCircumscribedCircleCenter",
  "makeInscribedQuad",
  "makeInscribedNGon",
  "makeTangentToCircle",
  "makeTangentAtCirclePoint",
  "addArcTick1",
  "addArcTick2",
  "addArcTick3",
];

const { modeLabel, canvasHintText, updateModeUi } = createModeUi({
  store,
  session,
  dom,
  ToolMode,
  constructionSelectionButtonIds,
  getButtonById: (id) => document.getElementById(id),
  getRightAngleButton: () => document.getElementById("markRightAngle"),
});

const boardController = new BoardController(
  "jxgbox",
  (coords, evt) => handleBoardClick(coords, evt),
  (id, type, evt) => handleObjectClick(id, type, evt),
  (coords, evt) => handleBoardMove(coords, evt),
  (id, type, pos, options) => handleObjectMove(id, type, pos, options),
  (id, type, evt) => handleObjectDoubleClick(id, type, evt)
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

function defaultRegularPolygonControlPointColor() {
  return defaultIntersectionPointColor();
}

function defaultAttachedPointColor() {
  return store.doc.styles.examMode ? "#000000" : "#00c7b7";
}

function getBackgroundImageAssetsObject() {
  return Object.fromEntries(store.backgroundImageAssets?.entries?.() || []);
}

function setBackgroundImageAsset(assetId, src) {
  if (!store.backgroundImageAssets || typeof store.backgroundImageAssets.set !== "function") {
    store.backgroundImageAssets = new Map();
  }
  store.backgroundImageAssets.set(assetId, src);
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

function setMode(mode) {
  if (!isToolMode(mode)) {
    return;
  }
  if (session.transformSession) {
    cancelTransformSession();
  }
  session.perpendicularBisectorPlacement = null;
  session.tangentAtPointPlacement = null;
  session.constructionSelectionSession = null;
  if (session.tangentPickState?.staged?.length > 0) {
    finalizeTangentPickSession();
  }
  session.tangentPickState = null;
  session.shadeRegionNotice = null;
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

function startConstructionSelectionSession(selectionSession) {
  if (!selectionSession) {
    return;
  }
  if (session.currentMode !== ToolMode.SELECT) {
    setMode(ToolMode.SELECT);
  } else {
    session.perpendicularBisectorPlacement = null;
    session.tangentAtPointPlacement = null;
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
  if (!session.perpendicularBisectorPlacement && !session.tangentAtPointPlacement) {
    updateModeUi();
    renderCurrentDoc(false);
    if (session.tangentPickState) {
      showTangentPickGhosts();
    }
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
  const valid = ["three-point", "right", "isosceles", "equilateral"];
  if (!valid.includes(variant)) {
    return;
  }
  session.triangleVariant = variant;
  setMode(ToolMode.TRIANGLE);
}

const POINTS_NEEDED = {
  [ToolMode.SEGMENT]: 2,
  [ToolMode.LINE]: 2,
  [ToolMode.RAY]: 2,
  [ToolMode.CIRCLE]: 2,
  [ToolMode.TRIANGLE]: 3,
  [ToolMode.ANGLE]: 3,
  [ToolMode.ARC_3PT]: 3,
  [ToolMode.ARC_CSE]: 3,
};

function pointNeeds(mode) {
  return POINTS_NEEDED[mode] ?? 0;
}

function getObjectById(id) {
  return store.doc.objects.find((o) => o.id === id);
}

function getPointById(id) {
  const o = getObjectById(id);
  if (!o || o.type !== "point") return null;
  if (o.ghostVertex) {
    const el = boardController.getElement(id);
    if (el) return { ...o, x: el.X(), y: el.Y() };
  }
  return o;
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
    let px = obj.x, py = obj.y;
    if (obj.ghostVertex) {
      const el = boardController.getElement(obj.id);
      if (el) { px = el.X(); py = el.Y(); }
    }
    const d = Math.hypot(coords.x - px, coords.y - py);
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

// Doc-dependent lookups handed to constraint registry entries.
const constraintCtx = {
  getPointById: (id) => getPointById(id),
  getObjectById: (id) => getObjectById(id),
  getIntersectionDefinition: (obj) => getIntersectionDefinition(obj),
};

function applyPointConstraintToDraggedPosition(pointObj, pos) {
  if (!pointObj?.constraint || !pos) {
    return { pos, changedConstraint: false };
  }
  const entry = constraintEntry(pointObj.constraint);
  if (!entry) {
    return { pos, changedConstraint: false };
  }
  if (entry.dragPinned) {
    return { pos: { x: pointObj.x, y: pointObj.y }, changedConstraint: false };
  }
  if (entry.applyDrag) {
    return entry.applyDrag(pointObj, pos, constraintCtx);
  }
  return { pos, changedConstraint: false };
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
  if (!id || session.transientDragSnapshots.has(id)) {
    return;
  }
  session.transientDragSnapshots.set(id, store.snapshot());
}

function commitTransientSnapshotIfPresent(id, label) {
  if (!id || !session.transientDragSnapshots.has(id)) {
    return false;
  }
  const before = session.transientDragSnapshots.get(id);
  session.transientDragSnapshots.delete(id);
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

function lineLikeLabelOffsetFromPoints(p1, p2, normalDistance = 0.34, tangentBias = 0.08) {
  if (!p1 || !p2) {
    return { x: 0.4, y: 0.4 };
  }
  const dx = Number(p2.x ?? 0) - Number(p1.x ?? 0);
  const dy = Number(p2.y ?? 0) - Number(p1.y ?? 0);
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  let nx = -uy;
  let ny = ux;

  // Prefer the upward-facing normal so default labels land just off the object.
  if (ny < 0 || (Math.abs(ny) < 1e-6 && nx < 0)) {
    nx *= -1;
    ny *= -1;
  }

  return {
    x: nx * normalDistance + ux * tangentBias,
    y: ny * normalDistance + uy * tangentBias,
  };
}

function defaultLabelOffsetForObject(obj) {
  if (!obj) {
    return { x: 0.4, y: 0.4 };
  }
  if (obj.type === "point") {
    return { x: 0.42, y: 0.38 };
  }
  if (Array.isArray(obj.pointIds) && obj.pointIds.length >= 2) {
    const p1 = getPointById(obj.pointIds[0]);
    const p2 = getPointById(obj.pointIds[1]);
    return lineLikeLabelOffsetFromPoints(p1, p2);
  }
  if (obj.type === "circle" && Array.isArray(obj.pointIds) && obj.pointIds.length >= 2) {
    const center = getPointById(obj.pointIds[0]);
    const through = getPointById(obj.pointIds[1]);
    if (center && through) {
      const dx = Number(through.x ?? 0) - Number(center.x ?? 0);
      const dy = Number(through.y ?? 0) - Number(center.y ?? 0);
      const length = Math.hypot(dx, dy) || 1;
      return {
        x: (dx / length) * 0.28,
        y: (dy / length) * 0.28,
      };
    }
  }
  return { x: 0.4, y: 0.4 };
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
  if (!obj || !Array.isArray(obj.pointIds)) {
    return null;
  }
  if (obj.type === "circle" && obj.pointIds.length >= 2) {
    const center = getPointById(obj.pointIds[0]);
    const through = getPointById(obj.pointIds[1]);
    if (!center || !through) {
      return null;
    }
    const radius = distance(center, through);
    if (!Number.isFinite(radius) || radius < 1e-9) {
      return null;
    }
    return { id: obj.id, kind: "circle", center, radius };
  }
  if ((obj.type === "inscribed-circle" || obj.type === "circumscribed-circle") && obj.pointIds.length >= 3) {
    const p1 = getPointById(obj.pointIds[0]);
    const p2 = getPointById(obj.pointIds[1]);
    const p3 = getPointById(obj.pointIds[2]);
    if (!p1 || !p2 || !p3) {
      return null;
    }
    let center, radius;
    if (obj.type === "inscribed-circle") {
      center = computeIncenter(p1, p2, p3);
      radius = computeInradius(p1, p2, p3);
    } else {
      center = computeCircumcenter(p1, p2, p3);
      radius = distance(center, p1);
    }
    if (!Number.isFinite(radius) || radius < 1e-9) {
      return null;
    }
    return { id: obj.id, kind: "circle", center, radius };
  }
  if (obj.type === "arc-cse" && obj.pointIds.length >= 2) {
    const center = getPointById(obj.pointIds[0]);
    const start = getPointById(obj.pointIds[1]);
    if (!center || !start) return null;
    const radius = distance(center, start);
    if (!Number.isFinite(radius) || radius < 1e-9) return null;
    return { id: obj.id, kind: "circle", center, radius };
  }
  if (obj.type === "arc-3pt" && obj.pointIds.length >= 3) {
    const p1 = getPointById(obj.pointIds[0]);
    const p2 = getPointById(obj.pointIds[1]);
    const p3 = getPointById(obj.pointIds[2]);
    if (!p1 || !p2 || !p3) return null;
    const center = computeCircumcenter(p1, p2, p3);
    const radius = distance(center, p1);
    if (!Number.isFinite(radius) || radius < 1e-9) return null;
    return { id: obj.id, kind: "circle", center, radius };
  }
  return null;
}

function getIntersectionDefinition(obj) {
  return getLinearDefinition(obj) || getCircleDefinition(obj);
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
    const next = constraintEntry(obj.constraint)?.recompute?.(obj, constraintCtx);
    if (next) {
      obj.x = next.x;
      obj.y = next.y;
    }
  }
  purgeStaleShadeRegions();
}

function purgeStaleShadeRegions() {
  // Staleness is detected only through linked points. A region bounded solely
  // by point-free geometry (e.g. the gap between two circles) has no linked
  // points and will go stale silently if that geometry moves.
  const stale = store.doc.objects.filter((obj) => {
    if (obj.type !== "shade-region") return false;
    return (obj.linkedPointIds || []).some((pid, i) => {
      const pt = getPointById(pid);
      if (!pt) return true; // point deleted
      const stored = obj.linkedPointPositions?.[i];
      if (!stored) return false;
      return Math.hypot(pt.x - stored.x, pt.y - stored.y) > 0.05;
    });
  });
  if (stale.length > 0) {
    store.doc.objects = store.doc.objects.filter((o) => !stale.includes(o));
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

function syncPointIdsToBoard(pointIds = []) {
  let changed = false;
  for (const id of pointIds) {
    const obj = getPointById(id);
    const el = boardController.getElement(id);
    if (!obj || !el?.setPosition) {
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

const TRIANGLE_PREVIEW_APEX_FNS = {
  "three-point": (p1, p2, cursor) => cursor,
  right: (p1, p2, cursor, evt) =>
    rightTriangleApexFromCursor(p1, p2, cursor, { forceIsosceles: rightTriangleIsoModifierActive(evt) }),
  isosceles: (p1, p2, cursor) => isoscelesApexFromCursor(p1, p2, cursor),
  equilateral: (p1, p2, cursor) => equilateralApexFromCursor(p1, p2, cursor),
};

function updateTrianglePreview(cursorCoords, evt) {
  if (session.currentMode !== ToolMode.TRIANGLE) {
    boardController.clearPreview();
    return;
  }
  const apexFn = TRIANGLE_PREVIEW_APEX_FNS[session.triangleVariant];
  if (!apexFn || session.pendingPointIds.length < 2) {
    boardController.clearPreview();
    return;
  }
  const p1 = getPointById(session.pendingPointIds[0]);
  const p2 = getPointById(session.pendingPointIds[1]);
  if (!p1 || !p2) {
    boardController.clearPreview();
    return;
  }
  const a = pointObjectFromCoords(p1);
  const b = pointObjectFromCoords(p2);
  const apex = apexFn(a, b, cursorCoords, evt);
  if (!apex) {
    boardController.clearPreview();
    return;
  }
  boardController.showPreviewTriangle(a, b, apex);
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

function updateArc3PtPreview(cursorCoords) {
  if (session.currentMode !== ToolMode.ARC_3PT) {
    return false;
  }
  if (session.pendingPointIds.length < 2) {
    boardController.clearPreview();
    return true;
  }
  const p1 = getPointById(session.pendingPointIds[0]);
  const p2 = getPointById(session.pendingPointIds[1]);
  if (!p1 || !p2) {
    boardController.clearPreview();
    return true;
  }
  boardController.showPreviewArc3Pt(pointObjectFromCoords(p1), pointObjectFromCoords(p2), cursorCoords);
  return true;
}

function updateArcCSEPreview(cursorCoords) {
  if (session.currentMode !== ToolMode.ARC_CSE) {
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
  if (session.pendingPointIds.length < 2) {
    boardController.showPreviewCircle(pointObjectFromCoords(center), cursorCoords);
    return true;
  }
  const start = getPointById(session.pendingPointIds[1]);
  if (!start) {
    boardController.clearPreview();
    return true;
  }
  const r = Math.hypot(start.x - center.x, start.y - center.y);
  const angle = Math.atan2(cursorCoords.y - center.y, cursorCoords.x - center.x);
  const snappedEnd = { x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) };
  const swap = arcCSENeedsSwap(center.x, center.y, start.x, start.y, cursorCoords.x, cursorCoords.y);
  session.arcCSESwapStartEnd = swap;
  boardController.showPreviewArcCSE(pointObjectFromCoords(center), pointObjectFromCoords(start), snappedEnd, swap);
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
    if (handlePointInputLinearCircleCreate(modeForCreate, pointsForCreate, style)) {
      // handled by linear/circle point-input creation workflow
    } else if (handlePointInputTriangleCreate(modeForCreate, pointsForCreate, style)) {
      // handled by triangle point-input creation workflow
    } else if (handlePointInputAngleCreate(modeForCreate, pointsForCreate, isRightAngle, style)) {
      // handled by angle point-input creation workflow
    } else if (handlePointInputArcCreate(modeForCreate, pointsForCreate, style)) {
      // handled by arc point-input creation workflow
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

// While a construction-selection session opts in with `allowPointPlacement`,
// clicking empty board space drops a new point (snapping to existing geometry)
// and feeds it to the session — so e.g. Regular Polygon can be used by clicking
// two points instead of pre-selecting them.
function handleConstructionPointPlacementBoardClick(coords, evt) {
  const cs = session.constructionSelectionSession;
  if (!cs || !cs.allowPointPlacement) {
    return false;
  }
  const tag = String(evt?.target?.tagName || "").toLowerCase();
  const isBoardBackground = tag === "svg" || evt?.target === boardEl;
  if (!isBoardBackground) {
    return false;
  }
  if (evt?.shiftKey || evt?.metaKey || evt?.ctrlKey) {
    return false;
  }
  const snappedCoords = getPointInputCoords(coords, evt);
  const pointSnap = findPreferredPointSnap(snappedCoords);
  let newId = null;
  runMutation("create-point", () => {
    if (pointSnap?.sourceObjectIds) {
      newId = maybeCreateIntersectionPoint(pointSnap);
    } else if (pointSnap?.sourceObjectId) {
      newId = maybeCreateAttachedPoint(pointSnap);
    } else {
      newId = maybeCreatePoint(snappedCoords);
    }
  });
  if (newId) {
    store.selection.add(newId);
    renderCurrentDoc();
    maybeCompleteConstructionSelectionSession();
  }
  return true;
}

function handleBoardClick(coords, evt) {
  if (session.tangentPickState) {
    handleTangentPickBoardClick();
    return;
  }
  if (handlePerpendicularBisectorPlacementBoardClick(coords, evt)) {
    return;
  }
  if (session.tangentAtPointPlacement) {
    const tag = String(evt?.target?.tagName || "").toLowerCase();
    const isBoardBackground = tag === "svg" || evt?.target === boardEl;
    if (isBoardBackground) {
      const adjusted = getPointInputCoords(coords, evt);
      commitTangentAtPointPlacement(adjusted);
      return;
    }
    return;
  }
  if (handleConstructionPointPlacementBoardClick(coords, evt)) {
    return;
  }
  if (session.currentMode === ToolMode.SELECT) {
    if (handleSelectBoardClick(evt)) {
      return;
    }
  }

  const snappedCoords = getPointInputCoords(coords, evt);

  if (session.currentMode === ToolMode.ADD_LABEL) {
    addManualLabelAtCoords(coords);
    return;
  }

  if (session.currentMode === ToolMode.SHADE_REGION) {
    if (session.shadeFillInFlight) {
      return;
    }
    session.shadeFillInFlight = true;
    const fillColor = document.getElementById("shadeFillColor")?.value || "#9ca3af";
    const fillOpacityRaw = Number(document.getElementById("shadeFillOpacity")?.value);
    const fillOpacity = Number.isFinite(fillOpacityRaw) && fillOpacityRaw > 0 ? fillOpacityRaw : 0.25;
    launchShadeRegionFill(coords, boardController.board, boardEl, store.doc.objects).then((result) => {
      session.shadeFillInFlight = false;
      if (session.currentMode !== ToolMode.SHADE_REGION) {
        return;
      }
      if (!result) {
        session.shadeRegionNotice =
          "Couldn't fill here — click inside a closed region that is fully on screen.";
        updateModeUi();
        setTimeout(() => {
          if (session.shadeRegionNotice) {
            session.shadeRegionNotice = null;
            updateModeUi();
          }
        }, 4000);
        return;
      }
      session.shadeRegionNotice = null;
      const { pathPoints, linkedPointIds, linkedPointPositions } = result;
      runMutation("shade-region", () => {
        store.doc.objects.push({
          id: makeId("shade"),
          type: "shade-region",
          pathPoints,
          linkedPointIds,
          linkedPointPositions,
          marker: { x: coords.x, y: coords.y },
          style: {
            fillColor,
            fillOpacity,
            strokeWidth: 0,
          },
        });
      });
      updateModeUi();
    });
    return;
  }

  if (handlePointModeBoardClick(snappedCoords)) {
    return;
  }

  if (handleAngleModeBoardClick()) {
    return;
  }

  // For ARC_CSE 3rd click: snap end point to circle radius from center
  if (session.currentMode === ToolMode.ARC_CSE && session.pendingPointIds.length === 2) {
    const center = getPointById(session.pendingPointIds[0]);
    const start = getPointById(session.pendingPointIds[1]);
    if (center && start) {
      const r = Math.hypot(start.x - center.x, start.y - center.y);
      const angle = Math.atan2(snappedCoords.y - center.y, snappedCoords.x - center.x);
      const snapped = { x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) };
      session.arcCSESwapStartEnd = arcCSENeedsSwap(center.x, center.y, start.x, start.y, snappedCoords.x, snappedCoords.y);
      runMutation("create-inline-point", () => {
        const ptId = maybeCreatePoint(snapped);
        addPointInput(ptId, true);
      });
      return;
    }
  }

  if (handlePointCollectionBoardClick(snappedCoords, evt)) {
    return;
  }
}

const handledObjectClicks = new WeakMap();

function handleObjectClick(id, type, evt) {
  if (session.tangentPickState) {
    const eventType = String(evt?.type || "").toLowerCase();
    if (eventType.includes("up") || eventType.includes("end")) {
      handleTangentPickBoardClick();
    }
    if (evt?.stopPropagation) evt.stopPropagation();
    return;
  }
  const multi = evt.shiftKey || evt.metaKey || evt.ctrlKey;
  const eventType = String(evt?.type || "").toLowerCase();
  const isReleaseEvent = eventType.includes("up") || eventType.includes("end");
  if (evt && typeof evt === "object") {
    const clickKey = `${type}:${id}`;
    const dedupeStamp = `${eventType}:${Number(evt.timeStamp || 0)}`;
    let handled = handledObjectClicks.get(evt);
    if (!handled || handled.stamp !== dedupeStamp) {
      handled = { stamp: dedupeStamp, keys: new Set() };
      handledObjectClicks.set(evt, handled);
    }
    if (handled.keys.has(clickKey)) {
      return;
    }
    handled.keys.add(clickKey);
  }
  const nearPointRedirect = handleObjectClickNearPointRedirect(id, type, evt);
  if (nearPointRedirect.matched) {
    return nearPointRedirect.returnValue;
  }

  const modeBranchClick = handleObjectClickModeBranches(id);
  if (modeBranchClick.matched) {
    return modeBranchClick.returnValue;
  }

  const constructionSelectionClick = handleObjectClickConstructionSelection(id, multi, isReleaseEvent);
  if (constructionSelectionClick.matched) {
    return constructionSelectionClick.returnValue;
  }

  if (pointNeeds(session.currentMode) > 0) {
    const pointCollectionClick = handlePointCollectionObjectClick(id, type, evt);
    if (pointCollectionClick.matched) {
      return pointCollectionClick.returnValue;
    }
  }

  const selectionClickResult = handleSelectObjectClick(id, multi, isReleaseEvent);
  if (selectionClickResult) {
    return selectionClickResult === true ? undefined : selectionClickResult;
  }
}

function handleObjectDoubleClick(id, type, evt) {
  if (type !== "label") {
    return false;
  }
  editLabelText(id);
  return true;
}

// Shared dependency bag for all workflow factories (§3.3). Each factory
// destructures only the keys it needs; wireWorkflow merges every factory's
// returned API back into the bag so later factories can consume the outputs
// of earlier ones (e.g. boardMovePreview uses the tangent previews).
// renderCurrentDoc/applyDoc are consts defined after this block, so they are
// exposed as thunks.
const workflowCtx = {
  JXG,
  doc: document,
  win: window,
  dom,
  boardEl,
  statusEl,
  ToolMode,
  store,
  session,
  boardController,
  modeLabel,
  updateModeUi,
  setMode,
  showNotice,
  makeId,
  defaultStyle,
  pointNeeds,
  getPointById,
  getObjectById,
  selectedOfTypes,
  addObject,
  addAnnotation,
  addPointInput,
  addTriangleEdges,
  deleteSelected,
  runMutation,
  ensureTransientSnapshot,
  commitTransientSnapshotIfPresent,
  updateConstrainedPointsLive,
  recomputeConstrainedPoints,
  syncPointIdsToBoard,
  setBackgroundImageAsset,
  openLabelModal,
  autoLabelAnchorForObject,
  followLabelForTargetObject,
  toggleAutoLabelForObject,
  labelFollowBaseAnchor,
  findPreferredPointSnap,
  findNearbyVisiblePoint,
  maybeCreatePoint,
  maybeCreateIntersectionPoint,
  maybeCreateAttachedPoint,
  maybeCreateMidpointPoint,
  maybeCreatePerpendicularBisectorEndpointPoint,
  maybeAxisLockDraggedPoint,
  applyPointConstraintToDraggedPosition,
  rightTriangleApexFromCursor,
  isoscelesApexFromCursor,
  equilateralApexFromCursor,
  triangleVerticesFromVariant,
  ccwAnglePointIds,
  rightTriangleIsoModifierActive,
  normalizedRayExtension,
  normalizedLineExtension,
  getRayExtensionForObject,
  getPointInputCoords,
  updateLinearPreview,
  updateCirclePreview,
  updateAnglePreview,
  updateTrianglePreview,
  updateArc3PtPreview,
  updateArcCSEPreview,
  updatePerpendicularBisectorPreview,
  startConstructionSelectionSession,
  maybeCompleteConstructionSelectionSession,
  handleObjectClick,
  renderCurrentDoc: (...args) => renderCurrentDoc(...args),
  applyDoc: (...args) => applyDoc(...args),
};

function wireWorkflow(factory) {
  const api = factory(workflowCtx);
  Object.assign(workflowCtx, api);
  return api;
}

const { startMarqueeSelection } = wireWorkflow(createMarqueeSelectionWorkflow);
const { handleSelectBoardClick, handleSelectObjectClick } = wireWorkflow(createSelectionClickWorkflow);
const { handlePointModeBoardClick } = wireWorkflow(createPointPlacementClickWorkflow);
const { handlePointCollectionBoardClick } = wireWorkflow(createPointCollectionBoardClickWorkflow);
const { handlePointCollectionObjectClick } = wireWorkflow(createPointCollectionObjectClickWorkflow);
const { addManualLabelAtCoords, addManualLabelForTarget, toggleManualLabelMode } =
  wireWorkflow(createLabelManagementWorkflow);
const { handleObjectClickModeBranches } = wireWorkflow(createObjectClickModeBranchesWorkflow);
const { handleObjectClickConstructionSelection } = wireWorkflow(createObjectClickConstructionSelectionWorkflow);
const { handleObjectClickNearPointRedirect } = wireWorkflow(createObjectClickNearPointRedirectWorkflow);
const { handlePerpendicularBisectorPlacementBoardClick } =
  wireWorkflow(createPerpendicularBisectorPlacementBoardClickWorkflow);
const { handleAngleModeBoardClick } = wireWorkflow(createAngleModeBoardClickWorkflow);
const { handlePointInputLinearCircleCreate } = wireWorkflow(createPointInputLinearCircleCreateWorkflow);
const { handlePointInputAngleCreate } = wireWorkflow(createPointInputAngleCreateWorkflow);
const { handlePointInputArcCreate } = wireWorkflow(createCircleToolWorkflow);
const { handlePointInputTriangleCreate } = wireWorkflow(createPointInputTriangleCreateWorkflow);
const { handleObjectMoveAngle } = wireWorkflow(createObjectMoveAngleWorkflow);
const { handleObjectMoveRayVisibleResize } = wireWorkflow(createObjectMoveRayVisibleResizeWorkflow);
const { handleObjectMoveLineVisibleResize } = wireWorkflow(createObjectMoveLineVisibleResizeWorkflow);
const { handleObjectMoveSegment } = wireWorkflow(createObjectMoveSegmentWorkflow);
const { handleObjectMoveCircle } = wireWorkflow(createObjectMoveCircleWorkflow);
const { handleObjectMoveRay } = wireWorkflow(createObjectMoveRayWorkflow);
const { handleObjectMoveLine } = wireWorkflow(createObjectMoveLineWorkflow);
const { handleObjectMovePointLabel } = wireWorkflow(createObjectMovePointLabelWorkflow);

const {
  showTangentPickGhosts,
  updateTangentPickPreview,
  finalizeTangentPickSession,
  handleTangentPickBoardClick,
  updateTangentAtPointPreview,
  commitTangentAtPointPlacement,
  launchTangentToCircle,
  launchTangentAtCirclePoint,
} = wireWorkflow(createTangentToolsWorkflow);

const { handleBoardMove } = wireWorkflow(createBoardMovePreviewWorkflow);

function handleObjectMove(id, type, pos, options = {}) {
  const transient = !!options?.transient;

  if (type === "inscribed-polygon") {
    const polyObj = getObjectById(id);
    if (!polyObj || polyObj.type !== "inscribed-polygon") return;
    if (transient) {
      ensureTransientSnapshot(id);
      polyObj.handleAngles = pos.handleAngles;
      // Sync ghost stub positions from live JSXGraph elements
      for (const vid of (polyObj.vertexIds || [])) {
        const el = boardController.getElement(vid);
        const stub = getObjectById(vid);
        if (el && stub) { stub.x = el.X(); stub.y = el.Y(); }
      }
      for (const hid of (polyObj.handleIds || [])) {
        const el = boardController.getElement(hid);
        const stub = getObjectById(hid);
        if (el && stub) { stub.x = el.X(); stub.y = el.Y(); }
      }
    } else {
      commitTransientSnapshotIfPresent(id, "inscribed-polygon-drag");
    }
    return;
  }

  if (type === "arcTick") {
    const ann = store.doc.annotations.find((a) => a.id === id);
    if (!ann) return;
    if (options?.transient) {
      ensureTransientSnapshot(id);
      return;
    }
    if (options?.commit) {
      ann.tickLen = pos.tickLen;
      if (!commitTransientSnapshotIfPresent(id, "arc-tick-resize")) {
        renderCurrentDoc();
      }
    }
    return;
  }

  if (handleObjectMoveAngle(id, type, pos, transient)) {
    return;
  }
  if (type === "ray") {
    const rayObj = getObjectById(id);
    if (!rayObj || rayObj.type !== "line" || rayObj.lineType !== "ray") {
      return;
    }
    if (handleObjectMoveRayVisibleResize(id, rayObj, pos, transient)) {
      return;
    }
    if (handleObjectMoveRay(id, type, rayObj, pos, transient)) {
      return;
    }
    return;
  }

  if (type === "line") {
    const lineObj = getObjectById(id);
    if (!lineObj || !["line", "parallel", "perpendicular"].includes(lineObj.type)) {
      return;
    }
    if (handleObjectMoveLine(id, type, lineObj, pos, transient)) {
      return;
    }
    if (handleObjectMoveLineVisibleResize(id, lineObj, pos, transient)) {
      return;
    }
    return;
  }

  if (type === "segment") {
    const segObj = getObjectById(id);
    if (!segObj) {
      return;
    }
    if (handleObjectMoveSegment(id, type, segObj, pos, transient)) {
      return;
    }
    return;
  }

  if (type === "circle") {
    const circleObj = getObjectById(id);
    if (!circleObj) {
      return;
    }
    if (handleObjectMoveCircle(id, type, circleObj, pos, transient)) {
      return;
    }
    return;
  }

  if (handleObjectMovePointLabel(id, type, pos, options, transient)) {
    return;
  }
}

function removeWithDependencies(selectedSet) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const obj of [...store.doc.objects]) {
      if (selectedSet.has(obj.id)) {
        // Cascade down: deleting a polygon also deletes its ghost vertex/handle stubs
        if (obj.type === "inscribed-polygon") {
          for (const vid of [...(obj.vertexIds || []), ...(obj.handleIds || [])]) {
            if (!selectedSet.has(vid)) { selectedSet.add(vid); changed = true; }
          }
        }
        // Cascade up: deleting a ghost vertex also deletes its parent polygon
        if (obj.ghostVertex && obj.polygonId && !selectedSet.has(obj.polygonId)) {
          selectedSet.add(obj.polygonId);
          changed = true;
        }
        // Cascade: deleting a tangent segment deletes its tangentPoint endpoints
        if (obj.type === "segment") {
          for (const pid of obj.pointIds || []) {
            const pt = getObjectById(pid);
            if (pt?.tangentPoint && !selectedSet.has(pid)) {
              selectedSet.add(pid);
              changed = true;
            }
          }
        }
        // Cascade: deleting a tangentPoint deletes its parent segment
        if (obj.tangentPoint) {
          for (const other of store.doc.objects) {
            if (other.type === "segment" && other.pointIds?.includes(obj.id) && !selectedSet.has(other.id)) {
              selectedSet.add(other.id);
              changed = true;
            }
          }
        }
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
      const constraintDeps =
        constraintEntry(obj.constraint)?.dependencyIds?.(obj.constraint) || [];
      if (constraintDeps.some((depId) => selectedSet.has(depId))) {
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

function updatePointObjectsToggleButton() {
  const btn = document.getElementById("togglePointObjects");
  if (!btn) {
    return;
  }
  btn.textContent = session.showPointObjects ? "Hide Points" : "Show Points";
}

function updateLineArrowsToggleButton() {
  const btn = document.getElementById("toggleLineArrows");
  if (!btn) {
    return;
  }
  btn.textContent = session.showLineArrows ? "Hide Arrows" : "Show Arrows";
}

function togglePointObjectsVisibility() {
  session.showPointObjects = !session.showPointObjects;
  updatePointObjectsToggleButton();
  renderCurrentDoc(false);
}

function toggleLineArrowsVisibility() {
  session.showLineArrows = !session.showLineArrows;
  updateLineArrowsToggleButton();
  renderCurrentDoc(false);
}

function buildPointMap() {
  const map = new Map();
  const polygonControlIds = regularPolygonControlPointIds();
  const arcControlIds = arc3ptControlPointIds();
  const circleRadiusIds = circleRadiusPointIds();
  for (const obj of store.doc.objects) {
    if (obj.type !== "point") {
      continue;
    }
    if (obj.ghostVertex) {
      continue; // populated from inscribed-polygon rendering in renderDoc
    }
    if (obj.tangentPoint) {
      const hideTangentPoint = obj.hidden || !session.showPointObjects;
      const tangentPointColor = session.exportPointHighlightsBlack ? "#000000" : "#c026d3";
      const pt = hideTangentPoint
        ? boardController.createSupportPoint(obj.x, obj.y)
        : boardController.createPoint(obj.id, obj.x, obj.y, {
            strokeColor: tangentPointColor,
            fillColor: tangentPointColor,
            size: 4,
            layer: 10,
            fixed: true,
          });
      if (!hideTangentPoint && pt?.rendNode) {
        pt.rendNode.setAttribute("data-tangent-point", "true");
      }
      map.set(obj.id, pt);
      continue;
    }
    const pointConstraintEntry = constraintEntry(obj.constraint);
    const isPolygonControlPoint = polygonControlIds.has(obj.id);
    const isArcControlPoint = arcControlIds.has(obj.id);
    const isCircleRadiusPoint = circleRadiusIds.has(obj.id);
    const pointHighlightColor = session.exportPointHighlightsBlack
      ? "#000000"
      : isPolygonControlPoint
        ? defaultRegularPolygonControlPointColor()
        : isArcControlPoint
          ? "#e57373"
          : isCircleRadiusPoint
            ? "#ea580c"
            : obj.style?.strokeColor;
    const hidePointObject = obj.hidden || !session.showPointObjects ||
      (session.exportPointHighlightsBlack && isArcControlPoint);
    const pt = hidePointObject
      ? boardController.createSupportPoint(obj.x, obj.y)
      : boardController.createPoint(obj.id, obj.x, obj.y, {
          ...obj.style,
          strokeColor: pointHighlightColor,
          size: session.exportPointScale != null
            ? (obj.constraint ? 4 : (obj.style?.size ?? 3)) * session.exportPointScale
            : obj.constraint ? 4 : obj.style?.size,
          layer: obj.constraint ? 10 : obj.style?.layer,
          fixed:
            pointConstraintEntry?.selectDraggable
              ? session.currentMode !== ToolMode.SELECT
              : session.currentMode !== ToolMode.SELECT ||
                Boolean(pointConstraintEntry?.renderPinnedInSelect) ||
                obj.style?.fixed,
        });
    const hasLabel = obj.name || store.doc.objects.some((o) => o.type === "label" && o.targetId === obj.id);
    if (isCircleRadiusPoint && !hidePointObject && !hasLabel && pt?.rendNode) {
      pt.rendNode.setAttribute("data-circle-through-point", "true");
    }
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

const renderCurrentDoc = createRenderDoc({
  store,
  boardController,
  session,
  buildPointMap,
  defaultStyle,
  getRayExtensionForObject,
  getLineExtentsForObject,
  syncFollowLabelPosition,
  nestedAngleArcRadii,
  pointNeeds,
  recomputeConstrainedPoints,
});

const applyDoc = createApplyDoc({
  store,
  normalizedRayExtension,
  normalizedLineExtension,
  migratePointNamesToDraggableLabels,
  renderCurrentDoc,
  syncStyleInputsFromDoc,
});

function syncStyleInputsFromDoc() {
  syncStyleInputsFromDocUi({ store, doc: document });
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

const {
  findTriangleFromSelection,
  launchTriangleCopy,
  launchTriangleTransform,
  cancelTransformSession,
  commitTransformSession,
  applyTransformPreview,
  updateMoveReadouts,
  updateCompassReadout,
  angleFromCompassEvent,
} = wireWorkflow(createTriangleCopyTransformWorkflow);

function applyStyleToSelection() {
  const color = strokeColorEl.value;
  const width = Number(strokeWidthEl.value);
  const lineStyle = lineStyleEl.value;
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
      showNotice("Select a point and one line/segment/parallel/perpendicular.");
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
      showNotice("Select one or more segments, or exactly two points.");
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
      showNotice("Select one or more segments/lines/parallel/perpendicular objects first.");
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

function promptRegularPolygonSideCount() {
  return openNumberModal({
    title: "Regular Polygon",
    label: "Number of sides (n)",
    initial: 5,
    min: 3,
    max: 24,
    submitLabel: "Create",
  });
}

function circleRadiusPointIds() {
  const ids = new Set();
  for (const obj of store.doc.objects) {
    if (obj.type === "circle" && obj.pointIds?.length >= 2) {
      ids.add(obj.pointIds[1]);
    }
  }
  return ids;
}

function arc3ptControlPointIds() {
  const ids = new Set();
  for (const obj of store.doc.objects) {
    if (obj.type === "arc-3pt" && obj.pointIds?.length >= 3) {
      ids.add(obj.pointIds[1]);
    }
  }
  return ids;
}

function regularPolygonControlPointIds() {
  const ids = new Set();
  for (const obj of store.doc.objects) {
    if (obj.type !== "point" || !obj.constraint) {
      continue;
    }
    if (obj.constraint.kind !== "regularPolygonVertex" && obj.constraint.kind !== "regularPolygonCenter") {
      continue;
    }
    for (const id of obj.constraint.sourcePointIds || []) {
      if (id) {
        ids.add(id);
      }
    }
  }
  return ids;
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
      showNotice("Select exactly one segment or exactly two points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const [pointAId, pointBId] = endpoints;
  if (!pointAId || !pointBId || pointAId === pointBId) {
    if (!quiet) {
      showNotice("Select two distinct endpoints.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const pointA = getPointById(pointAId);
  const pointB = getPointById(pointBId);
  if (!pointA || !pointB || distance(pointA, pointB) < 1e-9) {
    if (!quiet) {
      showNotice("Selected endpoints must be distinct points.");
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
      showNotice("Select exactly 3 points (with the vertex second) or one angle mark.");
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
      showNotice("Cannot bisect a degenerate or straight angle selection.");
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
      showNotice("Select exactly one segment or exactly two points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const [pointAId, pointBId] = endpoints;
  const pointA = getPointById(pointAId);
  const pointB = getPointById(pointBId);
  if (!pointA || !pointB || distance(pointA, pointB) < 1e-9) {
    if (!quiet) {
      showNotice("Selected endpoints must be distinct points.");
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

function addRegularPolygonVariant(options = {}, runtime = {}) {
  const quiet = !!runtime.quiet;
  const endpoints = midpointSelectionEndpoints();
  if (!endpoints) {
    if (!quiet) {
      showNotice("Select exactly one segment or exactly two points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const [pointAId, pointBId] = endpoints;
  if (!pointAId || !pointBId || pointAId === pointBId) {
    if (!quiet) {
      showNotice("Select two distinct endpoints.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const pointA = getPointById(pointAId);
  const pointB = getPointById(pointBId);
  if (!pointA || !pointB || distance(pointA, pointB) < 1e-9) {
    if (!quiet) {
      showNotice("Selected endpoints must be distinct points.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }

  // Selection is valid; the side-count modal resolves asynchronously and the
  // construction completes (or is dropped on cancel) when it does.
  void completeRegularPolygonVariant(options, pointAId, pointBId, pointA, pointB);
  return true;
}

async function completeRegularPolygonVariant(options, pointAId, pointBId, pointA, pointB) {
  const sideCount = await promptRegularPolygonSideCount();
  if (sideCount === null) {
    return;
  }
  const vertices = regularPolygonVerticesFromEdge(pointA, pointB, sideCount);
  if (!vertices) {
    return;
  }
  const center = options.withCenter ? regularPolygonCenterFromEdge(pointA, pointB, sideCount) : null;
  const style = defaultStyle();

  runMutation(`regular-polygon-${sideCount}`, () => {
    const pointIds = [pointAId, pointBId];
    for (let i = 2; i < sideCount; i += 1) {
      const vertex = vertices[i];
      const vertexId = makeId("pt");
      addObject({
        id: vertexId,
        type: "point",
        x: vertex.x,
        y: vertex.y,
        name: "",
        constraint: {
          kind: "regularPolygonVertex",
          sourcePointIds: [pointAId, pointBId],
          sideCount,
          vertexIndex: i,
        },
        style: { ...style },
      });
      pointIds.push(vertexId);
    }

    for (let i = 0; i < sideCount; i += 1) {
      addObject({
        id: makeId("seg"),
        type: "segment",
        pointIds: [pointIds[i], pointIds[(i + 1) % sideCount]],
        construction: "regularPolygon",
        constructionSourcePointIds: [pointAId, pointBId],
        style: { ...style },
      });
    }

    if (options.withTickMarks) {
      const groupId = makeId("cg");
      for (let i = 0; i < sideCount; i += 1) {
        addAnnotation({
          id: makeId("tick"),
          type: "tickPoints",
          groupId,
          pointIds: [pointIds[i], pointIds[(i + 1) % sideCount]],
          tickCount: 1,
          style: { ...style },
        });
      }
    }

    if (options.withSingleTickArcs) {
      const groupId = makeId("rpa");
      for (let i = 0; i < sideCount; i += 1) {
        const prevId = pointIds[(i - 1 + sideCount) % sideCount];
        const vertexId = pointIds[i];
        const nextId = pointIds[(i + 1) % sideCount];
        addAnnotation({
          id: makeId("ang"),
          type: "angle",
          groupId,
          pointIds: [prevId, vertexId, nextId],
          right: false,
          arcCount: 1,
          decorator: "arcTick",
          tickCount: 1,
          style: { ...style },
        });
      }
    }

    if (center) {
      addObject({
        id: makeId("pt"),
        type: "point",
        x: center.x,
        y: center.y,
        name: "",
        constraint: {
          kind: "regularPolygonCenter",
          sourcePointIds: [pointAId, pointBId],
          sideCount,
        },
        style: { ...style },
      });
    }

    store.clearSelection();
  });
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

// ── Inscribed / Circumscribed Circles ───────────────────────────────────────

function addInscribedCircle(withCenter, options = {}) {
  const quiet = !!options.quiet;
  const pointIds = findTriangleFromSelection();
  if (!pointIds) {
    if (!quiet) {
      showNotice("Select 3 triangle vertices or the 3 sides first.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  runMutation(withCenter ? "inscribed-circle-center" : "inscribed-circle", () => {
    addObject({
      id: makeId("ic"),
      type: "inscribed-circle",
      pointIds,
      showCenter: withCenter,
      style: defaultStyle(),
    });
    store.clearSelection();
  });
  return true;
}

function launchInscribedCircle(withCenter, buttonId) {
  if (addInscribedCircle(withCenter, { quiet: true })) return;
  const label = withCenter ? "Inscribed + Incenter" : "Inscribed";
  startConstructionSelectionSession({
    kind: `inscribed-circle-${withCenter ? "center" : "plain"}`,
    label,
    buttonId,
    instructions: "Select 3 triangle vertices or the 3 sides.",
    tryCreate: () => addInscribedCircle(withCenter, { quiet: true }),
  });
}

function addCircumscribedCircle(withCenter, options = {}) {
  const quiet = !!options.quiet;
  const pointIds = findTriangleFromSelection();
  if (!pointIds) {
    if (!quiet) {
      showNotice("Select 3 triangle vertices or the 3 sides first.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  runMutation(withCenter ? "circumscribed-circle-center" : "circumscribed-circle", () => {
    addObject({
      id: makeId("cc"),
      type: "circumscribed-circle",
      pointIds,
      showCenter: withCenter,
      style: defaultStyle(),
    });
    store.clearSelection();
  });
  return true;
}

function launchCircumscribedCircle(withCenter, buttonId) {
  if (addCircumscribedCircle(withCenter, { quiet: true })) return;
  const label = withCenter ? "Circumscribed + Circumcenter" : "Circumscribed";
  startConstructionSelectionSession({
    kind: `circumscribed-circle-${withCenter ? "center" : "plain"}`,
    label,
    buttonId,
    instructions: "Select 3 triangle vertices or the 3 sides.",
    tryCreate: () => addCircumscribedCircle(withCenter, { quiet: true }),
  });
}

// ── Inscribed Polygon ────────────────────────────────────────────────────────

function computeInscribedPolygonVertex(cx, cy, cr, t1, t2) {
  const det = Math.sin(t2 - t1);
  if (Math.abs(det) < 1e-10) {
    return { x: cx + cr * (Math.cos(t1) + Math.cos(t2)) / 2, y: cy + cr * (Math.sin(t1) + Math.sin(t2)) / 2 };
  }
  const r1 = cr + Math.cos(t1) * cx + Math.sin(t1) * cy;
  const r2 = cr + Math.cos(t2) * cx + Math.sin(t2) * cy;
  return {
    x: (r1 * Math.sin(t2) - r2 * Math.sin(t1)) / det,
    y: (r2 * Math.cos(t1) - r1 * Math.cos(t2)) / det,
  };
}

function addInscribedPolygon(n, options = {}) {
  const quiet = !!options.quiet;
  const selectedCircles = selectedOfTypes(["circle"]);
  if (selectedCircles.length !== 1) {
    if (!quiet) {
      showNotice("Select exactly one circle first.");
      setMode(ToolMode.SELECT);
    }
    return false;
  }
  const circleId = selectedCircles[0];
  const sides = Math.max(3, Math.round(n));
  const TWO_PI = 2 * Math.PI;
  const handleAngles = Array.from({ length: sides }, (_, i) => (i * TWO_PI) / sides);
  const polyId = makeId("ip");
  const vertexIds = Array.from({ length: sides }, () => makeId("ipv"));
  const handleIds = Array.from({ length: sides }, () => makeId("iph"));
  const circleObj = getObjectById(circleId);
  const centerPt = circleObj ? getPointById(circleObj.pointIds?.[0]) : null;
  const throughPt = circleObj ? getPointById(circleObj.pointIds?.[1]) : null;
  const cx = centerPt?.x ?? 0, cy = centerPt?.y ?? 0;
  const cr = centerPt && throughPt ? Math.hypot(throughPt.x - cx, throughPt.y - cy) : 1;
  runMutation(`inscribed-polygon-${sides}`, () => {
    addObject({
      id: polyId,
      type: "inscribed-polygon",
      circleId,
      n: sides,
      handleAngles,
      vertexIds,
      handleIds,
      style: defaultStyle(),
    });
    for (let i = 0; i < sides; i++) {
      const { x, y } = computeInscribedPolygonVertex(cx, cy, cr, handleAngles[i], handleAngles[(i + 1) % sides]);
      addObject({
        id: vertexIds[i],
        type: "point",
        x, y,
        ghostVertex: true,
        polygonId: polyId,
        style: { ...defaultStyle(), strokeColor: "#60a5fa" },
      });
      const hx = cx + cr * Math.cos(handleAngles[i]);
      const hy = cy + cr * Math.sin(handleAngles[i]);
      addObject({
        id: handleIds[i],
        type: "point",
        x: hx, y: hy,
        ghostVertex: true,
        polygonId: polyId,
        style: { ...defaultStyle(), strokeColor: "#e57373" },
      });
    }
    store.clearSelection();
  });
  return true;
}

function launchInscribedPolygon(n, buttonId) {
  if (addInscribedPolygon(n, { quiet: true })) return;
  const label = n === 4 ? "Circle Inscribed in Quad" : `Circle Inscribed in ${n}-gon`;
  startConstructionSelectionSession({
    kind: `inscribed-polygon-${n}`,
    label,
    buttonId,
    instructions: "Select a circle.",
    tryCreate: () => addInscribedPolygon(n, { quiet: true }),
  });
}

function launchInscribedQuad(buttonId) {
  launchInscribedPolygon(4, buttonId);
}

async function launchInscribedNGon(buttonId) {
  const n = await openNGonModal();
  if (n === null) return;
  launchInscribedPolygon(n, buttonId);
}

// ── Arc Ticks ────────────────────────────────────────────────────────────────

function addArcTicks(tickCount, options = {}) {
  const quiet = !!options.quiet;
  const selectedArcs = selectedOfTypes(["arc-3pt", "arc-cse"]);
  if (!selectedArcs.length) {
    if (!quiet) setMode(ToolMode.SELECT);
    return false;
  }
  const groupId = makeId("atg");
  runMutation(`arc-tick-${tickCount}`, () => {
    for (const arcId of selectedArcs) {
      addAnnotation({
        id: makeId("atk"),
        type: "arcTick",
        groupId,
        arcId,
        tickCount,
        style: defaultStyle(),
      });
    }
    store.clearSelection();
  });
  return true;
}

function launchArcTicks(tickCount, buttonId) {
  if (addArcTicks(tickCount, { quiet: true })) return;
  startConstructionSelectionSession({
    kind: `arc-ticks-${tickCount}`,
    label: `Arc Ticks (${tickCount})`,
    buttonId,
    instructions: "Select one or more arcs.",
    tryCreate: () => addArcTicks(tickCount, { quiet: true }),
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

function launchRegularPolygonVariant(options = {}) {
  if (addRegularPolygonVariant(options, { quiet: true })) {
    return;
  }
  const kindSuffix = options.withTickMarks
    ? options.withCenter
      ? "-ticks-center"
      : "-ticks"
    : options.withSingleTickArcs
      ? options.withCenter
        ? "-arctick-center"
        : "-arctick"
      : options.withCenter
        ? "-center"
        : "";
  const labelSuffix =
    options.withTickMarks && options.withCenter
      ? " + Ticks + Center"
      : options.withSingleTickArcs && options.withCenter
        ? " + Arc Tick + Center"
        : options.withTickMarks
          ? " + Ticks"
          : options.withSingleTickArcs
            ? " + Arc Tick"
            : options.withCenter
              ? " + Center"
              : "";
  startConstructionSelectionSession({
    kind: `regular-polygon${kindSuffix}`,
    label: `Regular Polygon${labelSuffix}`,
    buttonId: options.buttonId || null,
    instructions:
      "Click two points (or select a segment / two existing points) to set the first edge.",
    allowPointPlacement: true,
    tryCreate: () => addRegularPolygonVariant(options, { quiet: true }),
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
      showNotice("Select exactly one segment.");
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
  void (async () => {
    const text = await openTextModal({
      title: "Side Length",
      label: "Side length label",
      initial: defaultText,
      submitLabel: "Add Label",
    });
    if (text === null) {
      return;
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
  })();
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
      showNotice("Select 3 points or one angle mark.");
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
  void (async () => {
    const textInput = await openTextModal({
      title: "Angle Measure",
      label: "Angle measure label",
      initial: rounded,
      submitLabel: "Add Label",
    });
    if (textInput === null) {
      return;
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
  })();
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


function normalizeManualLabelText(text) {
  return String(text ?? "")
    .trim()
    .replace(/<sup>\s*o\s*<\/sup>/gi, "°")
    .replace(/\^\(o\)/g, "°")
    .replace(/\^o\b/g, "°");
}

async function editLabelText(labelId) {
  const label = getObjectById(labelId);
  if (!label || label.type !== "label") {
    return;
  }
  const text = await openLabelModal(label.text || "");
  if (!text || text === label.text) {
    return;
  }
  runMutation("edit-label", () => {
    label.text = text;
  });
}

function isEditorModalOpen() {
  const exportPreviewEl = document.getElementById("exportPreviewModal");
  const exportPreviewOpen = !!exportPreviewEl && !exportPreviewEl.hasAttribute("hidden");
  return Boolean(isModalOpen() || exportPreviewOpen);
}

function openNGonModal() {
  return openNumberModal({
    title: "Circle Inscribed in n-gon",
    label: "Number of sides",
    initial: 5,
    min: 3,
    max: 24,
    submitLabel: "Create",
  });
}

async function openLabelModal(initialValue = "") {
  const value = await openTextModal({
    title: "Add Label",
    label: "Label text",
    initial: initialValue,
    help: "Examples: `sqrt(x+3)`, `x^2`, `A_1`, `x^o` for degrees.",
    submitLabel: "Add Label",
  });
  return value === null ? "" : normalizeManualLabelText(value);
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

const {
  downloadSvg,
  downloadPng,
  copySvg,
  copyPng,
  previewExport,
  downloadPreviewSvg,
  downloadPreviewPng,
} = wireWorkflow(createExportActionsWorkflow);

function saveDoc() {
  const content = JSON.stringify(
    serializeFigureDocPackage(store.doc, getBackgroundImageAssetsObject()),
    null,
    2,
  );
  const name = `figure-${timestampForFile()}.geofig`;
  triggerDownload(name, content, "application/json");
}

const { uploadBackgroundImageFromFile, clearBackgroundImage } =
  wireWorkflow(createBackgroundImageWorkflow);

function openDocFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const { doc, backgroundImageAssets } = normalizeImportedFigureDoc(parsed);
      validateFigureDoc(doc);
      store.setBackgroundImageAssets(backgroundImageAssets);
      applyDoc(cloneFigureDoc(doc));
    } catch (err) {
      showNotice(`Cannot open document: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

wireUi({
  dom,
  doc: document,
  win: window,
  store,
  session,
  ToolMode,
  setMode,
  setTriangleMode,
  launchSegmentTicks,
  launchMidpoint,
  launchPerpendicularBisectorVariant,
  launchAngleBisector,
  launchRegularPolygonVariant,
  launchParallelMarks,
  launchSideMeasure,
  launchAngleMeasure,
  setActiveAngleMarkPreset,
  addAngleFromSelection,
  toggleManualLabelMode,
  autoLabelPoints,
  launchParallelOrPerpendicular,
  launchTriangleCopy,
  launchTriangleTransform,
  cancelTransformSession,
  commitTransformSession,
  applyTransformPreview,
  updateMoveReadouts,
  angleFromCompassEvent,
  updateCompassReadout,
  deleteSelected,
  hideSelected,
  isEditorModalOpen,
  showAllHidden,
  togglePointObjectsVisibility,
  toggleLineArrowsVisibility,
  clearBoard,
  renderCurrentDoc,
  downloadSvg,
  downloadPng,
  copySvg,
  copyPng,
  previewExport,
  downloadPreviewSvg,
  downloadPreviewPng,
  saveDoc,
  openDocFromFile,
  uploadBackgroundImageFromFile,
  clearBackgroundImage,
  applyStyleToSelection,
  runMutation,
  launchInscribedCircle,
  launchCircumscribedCircle,
  launchInscribedQuad,
  launchInscribedNGon,
  launchTangentToCircle,
  launchTangentAtCirclePoint,
  launchArcTicks,
});
startMarqueeSelection();
updateModeUi();
syncStyleInputsFromDoc();
updatePointObjectsToggleButton();
updateLineArrowsToggleButton();
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

installGeoTestHook({ window, store, session, boardController });
