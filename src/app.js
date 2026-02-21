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

const store = new AppStore();
const statusEl = document.getElementById("statusText");
const drawingHintEl = document.getElementById("drawingHint");
const autoLabelBtn = document.getElementById("autoLabel");
const modeButtons = [...document.querySelectorAll("button[data-mode]")];
const triangleMenuBtn = document.getElementById("triangleMenuBtn");
const triangleMenuPanel = document.getElementById("triangleMenuPanel");
const triangleModeButtons = [...document.querySelectorAll("button[data-triangle-mode]")];

let currentMode = ToolMode.SELECT;
let pendingPointIds = [];
let pendingAngleIsRight = false;
let pendingAngleArcCount = 1;
let triangleVariant = "three-point";

const boardController = new BoardController(
  "jxgbox",
  (coords, evt) => handleBoardClick(coords, evt),
  (id, type, evt) => handleObjectClick(id, type, evt),
  (coords, evt) => handleBoardMove(coords, evt)
);
boardController.init();

function defaultStyle() {
  const styles = store.doc.styles;
  return {
    strokeColor: styles.examMode ? "#000000" : styles.defaultStrokeColor,
    strokeWidth: styles.defaultStrokeWidth,
    dash: styles.defaultDash,
    fontSize: styles.fontSize,
  };
}

function modeLabel(mode) {
  if (mode === ToolMode.TRIANGLE) {
    if (triangleVariant === "right") {
      return "Right Triangle";
    }
    if (triangleVariant === "isosceles") {
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
  if (currentMode === ToolMode.ANGLE) {
    return "Select points counterclockwise.";
  }
  if (currentMode === ToolMode.LABEL) {
    return "Click objects to add label. Click labeled objects to remove label.";
  }
  if (currentMode === ToolMode.SELECT) {
    return "Hold Shift to select more than one object.";
  }
  if ([ToolMode.SEGMENT, ToolMode.LINE, ToolMode.RAY, ToolMode.TRIANGLE].includes(currentMode)) {
    return "Hold Shift to move horizontal/vertical.";
  }
  return "";
}

function updateModeUi() {
  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === currentMode);
  });
  if (triangleMenuBtn) {
    triangleMenuBtn.classList.toggle("active", currentMode === ToolMode.TRIANGLE);
  }
  triangleModeButtons.forEach((btn) => {
    btn.classList.toggle("active", currentMode === ToolMode.TRIANGLE && btn.dataset.triangleMode === triangleVariant);
  });
  if (autoLabelBtn) {
    autoLabelBtn.classList.toggle("active", currentMode === ToolMode.LABEL);
  }
  statusEl.textContent = `Mode: ${modeLabel(currentMode)}`;
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
  currentMode = mode;
  pendingPointIds = [];
  if (mode !== ToolMode.ANGLE) {
    pendingAngleIsRight = false;
    pendingAngleArcCount = 1;
  }
  boardController.clearPreview();
  updateModeUi();
}

function setTriangleMode(variant) {
  const valid = ["three-point", "right", "isosceles"];
  if (!valid.includes(variant)) {
    return;
  }
  triangleVariant = variant;
  setMode(ToolMode.TRIANGLE);
}

function pointNeeds(mode) {
  if (mode === ToolMode.SEGMENT || mode === ToolMode.LINE || mode === ToolMode.RAY) {
    return 2;
  }
  if (mode === ToolMode.TRIANGLE) {
    if (triangleVariant === "right") {
      return 2;
    }
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

function getAutoLabelObjectByTargetId(targetId) {
  return store.doc.objects.find((o) => o.type === "label" && o.auto === true && o.targetId === targetId);
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

function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
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

  if (triangleVariant === "right") {
    return {
      x: pointA.x + perpX * baseLen,
      y: pointA.y + perpY * baseLen,
    };
  }

  if (triangleVariant === "isosceles") {
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

function nextAutoLabel() {
  const used = usedLabels();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let idx = 0; idx < 5000; idx += 1) {
    const candidate =
      alphabet[idx % alphabet.length] + (idx >= alphabet.length ? Math.floor(idx / alphabet.length) : "");
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `L${Date.now()}`;
}

function autoLabelAnchorForObject(obj) {
  if (obj.type === "point") {
    return null;
  }
  if (Array.isArray(obj.pointIds) && obj.pointIds.length >= 2) {
    const p1 = getPointById(obj.pointIds[0]);
    const p2 = getPointById(obj.pointIds[1]);
    if (p1 && p2) {
      return { x: (p1.x + p2.x) / 2 + 0.4, y: (p1.y + p2.y) / 2 + 0.4 };
    }
  }
  if (obj.throughPointId) {
    const p = getPointById(obj.throughPointId);
    if (p) {
      return { x: p.x + 0.4, y: p.y + 0.4 };
    }
  }
  return { x: 0, y: 0 };
}

function toggleAutoLabelForObject(targetId) {
  const target = getObjectById(targetId);
  if (!target) {
    return;
  }

  runMutation("toggle-auto-label", () => {
    if (target.type === "point") {
      if (target.name) {
        target.name = "";
      } else {
        target.name = nextAutoLabel();
      }
      return;
    }

    const existing = getAutoLabelObjectByTargetId(target.id);
    if (existing) {
      store.doc.objects = store.doc.objects.filter((o) => o.id !== existing.id);
      return;
    }

    const anchor = autoLabelAnchorForObject(target);
    addObject({
      id: makeId("label"),
      type: "label",
      x: anchor.x,
      y: anchor.y,
      text: nextAutoLabel(),
      auto: true,
      targetId: target.id,
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

function snapToAxis(anchor, raw) {
  const dx = raw.x - anchor.x;
  const dy = raw.y - anchor.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: raw.x, y: anchor.y };
  }
  return { x: anchor.x, y: raw.y };
}

function getPointInputCoords(rawCoords, evt) {
  if (!evt?.shiftKey || !pendingPointIds.length) {
    return rawCoords;
  }
  const anchor = getPointById(pendingPointIds[pendingPointIds.length - 1]);
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

function updateTrianglePreview(cursorCoords) {
  if (currentMode !== ToolMode.TRIANGLE) {
    boardController.clearPreview();
    return;
  }

  if (triangleVariant === "three-point") {
    if (pendingPointIds.length < 2) {
      boardController.clearPreview();
      return;
    }
    const p1 = getPointById(pendingPointIds[0]);
    const p2 = getPointById(pendingPointIds[1]);
    if (!p1 || !p2) {
      boardController.clearPreview();
      return;
    }
    boardController.showPreviewTriangle(pointObjectFromCoords(p1), pointObjectFromCoords(p2), cursorCoords);
    return;
  }

  if (triangleVariant === "right") {
    if (pendingPointIds.length < 1) {
      boardController.clearPreview();
      return;
    }
    const p1 = getPointById(pendingPointIds[0]);
    if (!p1) {
      boardController.clearPreview();
      return;
    }
    const p2 = cursorCoords;
    const p3 = triangleVerticesFromVariant(pointObjectFromCoords(p1), p2);
    if (!p3) {
      boardController.clearPreview();
      return;
    }
    boardController.showPreviewTriangle(pointObjectFromCoords(p1), p2, p3);
    return;
  }

  if (triangleVariant === "isosceles") {
    if (pendingPointIds.length < 2) {
      boardController.clearPreview();
      return;
    }
    const p1 = getPointById(pendingPointIds[0]);
    const p2 = getPointById(pendingPointIds[1]);
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

  if (pendingPointIds.length < 1) {
    boardController.clearPreview();
    return;
  }

  const p1 = getPointById(pendingPointIds[0]);
  if (!p1) {
    boardController.clearPreview();
    return;
  }
  boardController.clearPreview();
}

function addPointInput(pointId, skipMutation = false) {
  pendingPointIds.push(pointId);
  const need = pointNeeds(currentMode);
  if (pendingPointIds.length < need) {
    statusEl.textContent = `Mode: ${modeLabel(currentMode)} (${pendingPointIds.length}/${need})`;
    return;
  }

  const modeForCreate = currentMode;
  const pointsForCreate = pendingPointIds.slice();
  const isRightAngle = pendingAngleIsRight;
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
        style: { ...style, straightFirst: true, straightLast: true },
      });
    } else if (modeForCreate === ToolMode.RAY) {
      addObject({
        id: makeId("ray"),
        type: "line",
        pointIds: pointsForCreate,
        lineType: "ray",
        style: { ...style, straightFirst: false, straightLast: true },
      });
    } else if (modeForCreate === ToolMode.CIRCLE) {
      addObject({ id: makeId("circle"), type: "circle", pointIds: pointsForCreate, style });
    } else if (modeForCreate === ToolMode.TRIANGLE) {
      if (triangleVariant === "three-point") {
        addTriangleEdges(pointsForCreate, style);
      } else if (triangleVariant === "isosceles") {
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
        if (triangleVariant === "right") {
          addAnnotation({
            id: makeId("ang"),
            type: "angle",
            pointIds: [pointsForCreate[1], pointsForCreate[0], apexId],
            right: true,
            arcCount: 1,
            style,
          });
        }
      }
    } else if (modeForCreate === ToolMode.ANGLE) {
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        pointIds: pointsForCreate,
        right: isRightAngle,
        arcCount: isRightAngle ? 1 : pendingAngleArcCount,
        style,
      });
    }
  };

  if (skipMutation) {
    createFromPoints();
  } else {
    runMutation(`create-${modeForCreate}`, createFromPoints);
  }

  pendingPointIds = [];
  pendingAngleIsRight = false;
  boardController.clearPreview();
  updateModeUi();
}

function handleBoardClick(coords, evt) {
  if (currentMode === ToolMode.SELECT) {
    store.clearSelection();
    renderCurrentDoc();
    return;
  }

  const snappedCoords = getPointInputCoords(coords, evt);

  if (currentMode === ToolMode.POINT) {
    runMutation("create-point", () => {
      maybeCreatePoint(snappedCoords);
    });
    return;
  }

  if (pointNeeds(currentMode) > 0) {
    runMutation("create-inline-point", () => {
      const ptId = maybeCreatePoint(snappedCoords);
      addPointInput(ptId, true);
    });
  }
}

function handleObjectClick(id, type, evt) {
  const multi = evt.shiftKey || evt.metaKey || evt.ctrlKey;

  if (currentMode === ToolMode.DELETE) {
    store.clearSelection();
    store.selection.add(id);
    deleteSelected();
    return;
  }

  if (pointNeeds(currentMode) > 0 && type === "point") {
    addPointInput(id);
    return;
  }

  if (currentMode === ToolMode.LABEL) {
    toggleAutoLabelForObject(id);
    return;
  }

  if (currentMode === ToolMode.SELECT || currentMode === ToolMode.CONGRUENCY) {
    store.toggleSelection(id, multi);
    renderCurrentDoc();
  }
}

function handleBoardMove(coords, evt) {
  updateTrianglePreview(getPointInputCoords(coords, evt));
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

function buildPointMap() {
  const map = new Map();
  for (const obj of store.doc.objects) {
    if (obj.type !== "point") {
      continue;
    }
    const pt = boardController.createPoint(obj.id, obj.x, obj.y, {
      ...obj.style,
      name: obj.name,
    });
    map.set(obj.id, pt);
  }
  return map;
}

function renderCurrentDoc(applySelection = true) {
  boardController.resetBoard();
  const points = buildPointMap();

  for (const obj of store.doc.objects) {
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
          straightFirst: obj.style.straightFirst,
          straightLast: obj.style.straightLast,
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
        boardController.createParallelLine(obj.id, source, through, style);
      }
    } else if (obj.type === "perpendicular") {
      const source = boardController.getElement(obj.sourceLineId);
      const through = points.get(obj.throughPointId);
      if (source && through) {
        boardController.createPerpendicularLine(obj.id, source, through, style);
      }
    } else if (obj.type === "label") {
      boardController.createText(obj.id, obj.x, obj.y, obj.text, style);
    }
  }

  for (const ann of store.doc.annotations) {
    const style = { ...defaultStyle(), ...ann.style };
    if (ann.type === "tick") {
      const segment = boardController.getElement(ann.segmentId);
      if (segment) {
        boardController.createTickMark(ann.id, segment, ann.tickCount, style);
      }
    } else if (ann.type === "parallelMark") {
      const target = boardController.getElement(ann.targetId);
      if (target) {
        boardController.createTickMark(ann.id, target, ann.markCount, style);
      }
    } else if (ann.type === "angle") {
      const p1 = points.get(ann.pointIds[0]);
      const p2 = points.get(ann.pointIds[1]);
      const p3 = points.get(ann.pointIds[2]);
      if (p1 && p2 && p3) {
        const arcCount = Math.max(1, Number(ann.arcCount || 1));
        if (ann.right) {
          boardController.createAngle(ann.id, p1, p2, p3, {
            ...style,
            right: true,
            radius: 1,
          });
        } else {
          for (let i = 0; i < arcCount; i += 1) {
            boardController.createAngle(`${ann.id}_arc_${i + 1}`, p1, p2, p3, {
              ...style,
              right: false,
              radius: 1 + i * 0.35,
            });
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
  boardController.update();
}

function applyDoc(doc, fromCommand = false) {
  store.setDoc(doc);
  if (!fromCommand) {
    store.commandStack.clear();
  }
  renderCurrentDoc();
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

function createParallelOrPerpendicular(kind) {
  const selected = store.selectedIds();
  if (selected.length !== 2) {
    alert("Select one line/segment and one point.");
    return;
  }

  let sourceLineId = null;
  let throughPointId = null;
  for (const id of selected) {
    const obj = getObjectById(id);
    if (!obj) {
      continue;
    }
    if (["line", "segment"].includes(obj.type)) {
      sourceLineId = id;
    }
    if (obj.type === "point") {
      throughPointId = id;
    }
  }

  if (!sourceLineId || !throughPointId) {
    alert("Select one line/segment and one point.");
    return;
  }

  runMutation(`create-${kind}`, () => {
    addObject({
      id: makeId(kind === "parallel" ? "par" : "perp"),
      type: kind,
      sourceLineId,
      throughPointId,
      style: defaultStyle(),
    });
    store.clearSelection();
  });
}

function addTicks(tickCount) {
  const segments = selectedOfTypes(["segment"]);
  if (!segments.length) {
    alert("Select one or more segments first.");
    return;
  }
  const groupId = makeId("cg");

  runMutation(`tick-${tickCount}`, () => {
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
  });
}

function addParallelMarks(markCount) {
  const targets = selectedOfTypes(["segment", "line"]);
  if (!targets.length) {
    alert("Select one or more segments/lines first.");
    return;
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
  });
}

function addAngleFromSelection(isRight, arcCount = 1) {
  const pts = selectedOfTypes(["point"]);
  if (pts.length === 3) {
    runMutation("add-angle", () => {
      addAnnotation({
        id: makeId("ang"),
        type: "angle",
        pointIds: pts,
        right: isRight,
        arcCount: isRight ? 1 : arcCount,
        style: defaultStyle(),
      });
    });
    return true;
  }
  return false;
}

function promptLabel() {
  const text = prompt("Label text:");
  if (!text) {
    return;
  }

  const selectedPoint = selectedOfTypes(["point"])[0];
  runMutation("add-label", () => {
    if (selectedPoint) {
      const pt = getPointById(selectedPoint);
      addObject({
        id: makeId("label"),
        type: "label",
        x: pt.x + 0.5,
        y: pt.y + 0.5,
        text,
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
  if (currentMode === ToolMode.LABEL) {
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
  const raw = boardController.exportBoardSvg();
  const svg = exportSVG(raw, { background, tight });
  const name = `figure-${timestampForFile()}.svg`;
  triggerDownload(name, svg, "image/svg+xml");
}

async function downloadPng() {
  const background = document.getElementById("bgMode").value;
  const scale = Number(document.getElementById("pngScale").value);
  const raw = boardController.exportBoardSvg();
  const svg = exportSVG(raw, { background, tight: true });
  const blob = await exportPNG(svg, { background, scale });
  const name = `figure-${timestampForFile()}.png`;
  downloadBlob(name, blob);
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

  document.getElementById("markTick1").addEventListener("click", () => addTicks(1));
  document.getElementById("markTick2").addEventListener("click", () => addTicks(2));
  document.getElementById("markTick3").addEventListener("click", () => addTicks(3));
  document.getElementById("markParallel1").addEventListener("click", () => addParallelMarks(1));
  document.getElementById("markParallel2").addEventListener("click", () => addParallelMarks(2));
  document.getElementById("markParallel3").addEventListener("click", () => addParallelMarks(3));

  document.getElementById("markAngle1").addEventListener("click", () => {
    if (!addAngleFromSelection(false, 1)) {
      pendingAngleIsRight = false;
      pendingAngleArcCount = 1;
      setMode(ToolMode.ANGLE);
    }
  });

  document.getElementById("markAngle2").addEventListener("click", () => {
    if (!addAngleFromSelection(false, 2)) {
      pendingAngleIsRight = false;
      pendingAngleArcCount = 2;
      setMode(ToolMode.ANGLE);
    }
  });

  document.getElementById("markAngle3").addEventListener("click", () => {
    if (!addAngleFromSelection(false, 3)) {
      pendingAngleIsRight = false;
      pendingAngleArcCount = 3;
      setMode(ToolMode.ANGLE);
    }
  });

  document.getElementById("markRightAngle").addEventListener("click", () => {
    if (!addAngleFromSelection(true, 1)) {
      pendingAngleIsRight = true;
      pendingAngleArcCount = 1;
      setMode(ToolMode.ANGLE);
    }
  });

  document.getElementById("addLabel").addEventListener("click", promptLabel);
  document.getElementById("autoLabel").addEventListener("click", autoLabelPoints);

  document.getElementById("makeParallel").addEventListener("click", () => createParallelOrPerpendicular("parallel"));
  document.getElementById("makePerpendicular").addEventListener("click", () => createParallelOrPerpendicular("perpendicular"));

  document.getElementById("deleteSelected").addEventListener("click", deleteSelected);
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
  document.getElementById("strokeWidth").addEventListener("input", applyStyleToSelection);
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
    if (evt.key === "Escape") {
      store.clearSelection();
      pendingPointIds = [];
      setMode(ToolMode.SELECT);
      renderCurrentDoc(false);
    }
  }, true);
}

wireUi();
updateModeUi();
renderCurrentDoc();
