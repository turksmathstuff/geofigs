export class BoardController {
  constructor(containerId, onBoardClick, onObjectClick, onBoardMove, onObjectMove) {
    this.containerId = containerId;
    this.onBoardClick = onBoardClick;
    this.onObjectClick = onObjectClick;
    this.onBoardMove = onBoardMove;
    this.onObjectMove = onObjectMove;
    this.board = null;
    this.elements = new Map();
    this.suppressNextBoardDown = false;
    this.previewElements = [];
  }

  init() {
    this.board = JXG.JSXGraph.initBoard(this.containerId, {
      axis: false,
      grid: false,
      boundingbox: [-10, 10, 10, -10],
      keepaspectratio: true,
      showCopyright: false,
      showNavigation: false,
    });

    this.board.on("down", (evt) => {
      if (this.suppressNextBoardDown) {
        this.suppressNextBoardDown = false;
        return;
      }
      const coords = this.getUserCoords(evt);
      if (this.onBoardClick) {
        this.onBoardClick(coords, evt);
      }
    });

    this.board.on("move", (evt) => {
      if (!this.onBoardMove) {
        return;
      }
      const coords = this.getUserCoords(evt);
      this.onBoardMove(coords, evt);
    });
  }

  getUserCoords(evt) {
    const absPos = JXG.getPosition(evt, 0);
    const topLeft = this.board.getCoordsTopLeftCorner(evt, 0);
    const screenPos = [absPos[0] - topLeft[0], absPos[1] - topLeft[1]];
    const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, screenPos, this.board);
    return { x: c.usrCoords[1], y: c.usrCoords[2] };
  }

  screenToUser(clientX, clientY) {
    const rect = this.board.containerObj.getBoundingClientRect();
    const screenPos = [clientX - rect.left, clientY - rect.top];
    const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, screenPos, this.board);
    return { x: c.usrCoords[1], y: c.usrCoords[2] };
  }

  resetBoard() {
    this.board.removeObject(this.board.objectsList.slice());
    this.elements.clear();
    this.previewElements = [];
    this.board.fullUpdate();
  }

  clearPreview() {
    if (!this.previewElements.length) {
      return;
    }
    this.board.removeObject(this.previewElements.slice());
    this.previewElements = [];
    this.board.update();
  }

  showPreviewTriangle(p1, p2, p3) {
    this.clearPreview();
    const attrs = {
      strokeColor: "#9ca3af",
      strokeWidth: 2,
      dash: 2,
      fixed: true,
      highlight: false,
    };
    const a = this.board.create("point", [p1.x, p1.y], { visible: false, fixed: true, name: "" });
    const b = this.board.create("point", [p2.x, p2.y], { visible: false, fixed: true, name: "" });
    const c = this.board.create("point", [p3.x, p3.y], { visible: false, fixed: true, name: "" });
    const s1 = this.board.create("segment", [a, b], attrs);
    const s2 = this.board.create("segment", [b, c], attrs);
    const s3 = this.board.create("segment", [c, a], attrs);
    this.previewElements = [s1, s2, s3, a, b, c];
    this.board.update();
  }

  showPreviewLinear(p1, p2, kind = "segment") {
    this.clearPreview();
    const attrs = {
      strokeColor: "#9ca3af",
      strokeWidth: 2,
      dash: 2,
      fixed: true,
      highlight: false,
    };
    const a = this.board.create("point", [p1.x, p1.y], { visible: false, fixed: true, name: "" });
    const b = this.board.create("point", [p2.x, p2.y], { visible: false, fixed: true, name: "" });
    let line;
    if (kind === "segment") {
      line = this.board.create("segment", [a, b], attrs);
    } else if (kind === "ray") {
      const rayEnd = this.createRayEndpointPoint(a, b, p2.rayExtension);
      line = this.board.create("segment", [a, rayEnd], { ...attrs, lastArrow: true });
      this.previewElements = [line, a, b, rayEnd];
      this.board.update();
      return;
    } else {
      const lineStart = this.createLineEndpointPoint(a, b, p2.lineExtensionStart, "start");
      const lineEnd = this.createLineEndpointPoint(a, b, p2.lineExtensionEnd, "end");
      line = this.board.create("segment", [lineStart, lineEnd], { ...attrs, firstArrow: true, lastArrow: true });
      this.previewElements = [line, a, b, lineStart, lineEnd];
      this.board.update();
      return;
    }
    this.previewElements = [line, a, b];
    this.board.update();
  }

  showPreviewCircle(center, through) {
    this.clearPreview();
    const attrs = {
      strokeColor: "#9ca3af",
      strokeWidth: 2,
      dash: 2,
      fixed: true,
      highlight: false,
      fillOpacity: 0,
    };
    const c = this.board.create("point", [center.x, center.y], { visible: false, fixed: true, name: "" });
    const t = this.board.create("point", [through.x, through.y], { visible: false, fixed: true, name: "" });
    const circle = this.board.create("circle", [c, t], attrs);
    this.previewElements = [circle, c, t];
    this.board.update();
  }

  createRayEndpointPoint(p1, p2, extension = 4) {
    const getExt = () => Math.max(0, Number(typeof extension === "function" ? extension() : extension ?? 4));
    return this.board.create("point", [
      () => {
        const dx = p2.X() - p1.X();
        const dy = p2.Y() - p1.Y();
        const len = Math.hypot(dx, dy);
        const ext = getExt();
        if (len < 1e-9) {
          return p2.X();
        }
        return p2.X() + (dx / len) * ext;
      },
      () => {
        const dx = p2.X() - p1.X();
        const dy = p2.Y() - p1.Y();
        const len = Math.hypot(dx, dy);
        const ext = getExt();
        if (len < 1e-9) {
          return p2.Y();
        }
        return p2.Y() + (dy / len) * ext;
      },
    ], {
      visible: false,
      fixed: true,
      name: "",
    });
  }

  createLineEndpointPoint(p1, p2, extension = 4, side = "end") {
    const getExt = () => Math.max(0, Number(typeof extension === "function" ? extension() : extension ?? 4));
    const sign = side === "start" ? -1 : 1;
    const anchor = side === "start" ? p1 : p2;
    return this.board.create("point", [
      () => {
        const dx = p2.X() - p1.X();
        const dy = p2.Y() - p1.Y();
        const len = Math.hypot(dx, dy);
        const ext = getExt();
        if (len < 1e-9) {
          return anchor.X();
        }
        return anchor.X() + sign * (dx / len) * ext;
      },
      () => {
        const dx = p2.X() - p1.X();
        const dy = p2.Y() - p1.Y();
        const len = Math.hypot(dx, dy);
        const ext = getExt();
        if (len < 1e-9) {
          return anchor.Y();
        }
        return anchor.Y() + sign * (dy / len) * ext;
      },
    ], {
      visible: false,
      fixed: true,
      name: "",
    });
  }

  createResizeHandlePoint(x, y) {
    return this.board.create("point", [x, y], {
      size: 5,
      visible: true,
      strokeOpacity: 0,
      fillOpacity: 0,
      highlightStrokeOpacity: 0,
      highlightFillOpacity: 0,
      name: "",
      withLabel: false,
      fixed: false,
    });
  }

  linearEndpointCoords(baseP1, baseP2, extension, side = "end") {
    const ax = side === "start" ? baseP1.X() : baseP2.X();
    const ay = side === "start" ? baseP1.Y() : baseP2.Y();
    const dx = baseP2.X() - baseP1.X();
    const dy = baseP2.Y() - baseP1.Y();
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      return { x: ax, y: ay };
    }
    const sign = side === "start" ? -1 : 1;
    return {
      x: ax + sign * (dx / len) * extension,
      y: ay + sign * (dy / len) * extension,
    };
  }

  syncLinearExtentHandles(type, baseP1, baseP2, meta) {
    if (!meta?.resizeHandles?.length) {
      return;
    }
    const [startHandle, endHandle] = meta.resizeHandles;
    if (type === "line" && startHandle) {
      const c = this.linearEndpointCoords(baseP1, baseP2, meta.lineExtensionStart, "start");
      startHandle.setPosition(JXG.COORDS_BY_USER, [c.x, c.y]);
    }
    if (endHandle) {
      const c = this.linearEndpointCoords(baseP1, baseP2, type === "ray" ? meta.rayExtension : meta.lineExtensionEnd, "end");
      endHandle.setPosition(JXG.COORDS_BY_USER, [c.x, c.y]);
    }
  }

  attachLinearExtentHandles(logicalId, type, baseP1, baseP2, meta) {
    const startHandle =
      type === "line"
        ? (() => {
            const c = this.linearEndpointCoords(baseP1, baseP2, meta.lineExtensionStart, "start");
            return this.createResizeHandlePoint(c.x, c.y);
          })()
        : null;
    const endCoords = this.linearEndpointCoords(baseP1, baseP2, type === "ray" ? meta.rayExtension : meta.lineExtensionEnd, "end");
    const endHandle = this.createResizeHandlePoint(endCoords.x, endCoords.y);

    const addHandleBehavior = (handle, side) => {
      if (!handle) return;
      handle.visProp.highlight = false;
      handle.on("down", (evt) => {
        this.suppressNextBoardDown = true;
        evt.stopPropagation();
      });
      handle.on("drag", (evt) => {
        const current = this.getUserCoords(evt);
        const ax = side === "start" ? baseP1.X() : baseP2.X();
        const ay = side === "start" ? baseP1.Y() : baseP2.Y();
        const vx = baseP2.X() - baseP1.X();
        const vy = baseP2.Y() - baseP1.Y();
        const len = Math.hypot(vx, vy);
        if (len < 1e-9) {
          return;
        }
        const ux = vx / len;
        const uy = vy / len;
        const wx = current.x - ax;
        const wy = current.y - ay;
        const signed = wx * ux + wy * uy;
        const next = Math.max(0, side === "start" ? -signed : signed);
        if (type === "ray") {
          meta.rayExtension = next;
        } else if (side === "start") {
          meta.lineExtensionStart = next;
        } else {
          meta.lineExtensionEnd = next;
        }
        this.syncLinearExtentHandles(type, baseP1, baseP2, meta);
        this.board.update();
      });
      handle.on("up", (evt) => {
        this.suppressNextBoardDown = true;
        evt.stopPropagation();
        if (!this.onObjectMove) {
          return;
        }
        if (type === "ray") {
          this.onObjectMove(logicalId, "ray", { rayExtension: meta.rayExtension });
        } else {
          this.onObjectMove(logicalId, "line", {
            lineExtensionStart: meta.lineExtensionStart,
            lineExtensionEnd: meta.lineExtensionEnd,
          });
        }
      });
    };

    addHandleBehavior(startHandle, "start");
    addHandleBehavior(endHandle, "end");
    meta.resizeHandles = [startHandle, endHandle].filter(Boolean);
  }

  registerElement(logicalId, type, el, meta = {}) {
    el.visProp.highlight = false;
    this.elements.set(logicalId, { type, el, meta });
    let deferredClick = false;
    let pointerDownObjPos = null;
    let pointerDownScreenPos = null;
    let pointerDownUserPos = null;
    let dragStartLinearPoints = null;
    el.on("down", (evt) => {
      let consume = true;
      deferredClick = false;
      pointerDownObjPos =
        type === "point" || type === "label"
          ? { x: Number(el.X?.()), y: Number(el.Y?.()) }
          : null;
      pointerDownScreenPos = Array.isArray(JXG.getPosition?.(evt, 0))
        ? JXG.getPosition(evt, 0)
        : null;
      pointerDownUserPos = this.getUserCoords(evt);
      if ((type === "ray" || type === "line") && meta.basePoint1 && meta.basePoint2) {
        dragStartLinearPoints = {
          p1: { x: meta.basePoint1.X(), y: meta.basePoint1.Y() },
          p2: { x: meta.basePoint2.X(), y: meta.basePoint2.Y() },
        };
      } else {
        dragStartLinearPoints = null;
      }
      if (this.onObjectClick) {
        const result = this.onObjectClick(logicalId, type, evt);
        if (result && typeof result === "object" && result.deferUntilUp) {
          deferredClick = true;
          consume = true;
        } else {
          consume = result !== false;
        }
      }
      if (consume) {
        this.suppressNextBoardDown = true;
        evt.stopPropagation();
      } else {
        this.suppressNextBoardDown = false;
      }
    });
    el.on("drag", (evt) => {
      if (!["ray", "line"].includes(type) || !meta.basePoint1 || !meta.basePoint2 || !pointerDownUserPos || !dragStartLinearPoints) {
        return;
      }
      const current = this.getUserCoords(evt);
      const dx = current.x - pointerDownUserPos.x;
      const dy = current.y - pointerDownUserPos.y;
      meta.basePoint1.setPosition(JXG.COORDS_BY_USER, [dragStartLinearPoints.p1.x + dx, dragStartLinearPoints.p1.y + dy]);
      meta.basePoint2.setPosition(JXG.COORDS_BY_USER, [dragStartLinearPoints.p2.x + dx, dragStartLinearPoints.p2.y + dy]);
      this.syncLinearExtentHandles(type, meta.basePoint1, meta.basePoint2, meta);
      this.board.update();
    });
    el.on("up", (evt) => {
      if (deferredClick && this.onObjectClick) {
        let moved = false;
        const pointerUpScreenPos = Array.isArray(JXG.getPosition?.(evt, 0))
          ? JXG.getPosition(evt, 0)
          : null;
        if (pointerDownScreenPos && pointerUpScreenPos) {
          const dx = pointerUpScreenPos[0] - pointerDownScreenPos[0];
          const dy = pointerUpScreenPos[1] - pointerDownScreenPos[1];
          moved = Math.hypot(dx, dy) > 4;
        } else if (pointerDownObjPos && (type === "point" || type === "label")) {
          moved =
            Math.abs(pointerDownObjPos.x - Number(el.X?.())) > 1e-4 ||
            Math.abs(pointerDownObjPos.y - Number(el.Y?.())) > 1e-4;
        }
        if (!moved) {
          this.onObjectClick(logicalId, type, evt);
        }
      }
      if (!this.onObjectMove) {
        return;
      }
      if (type === "point" || type === "label") {
        this.onObjectMove(logicalId, type, { x: el.X(), y: el.Y() });
      } else if ((type === "ray" || type === "line") && meta.basePoint1 && meta.basePoint2) {
        this.onObjectMove(logicalId, type, {
          p1: { x: meta.basePoint1.X(), y: meta.basePoint1.Y() },
          p2: { x: meta.basePoint2.X(), y: meta.basePoint2.Y() },
        });
      }
      deferredClick = false;
      pointerDownObjPos = null;
      pointerDownScreenPos = null;
      pointerDownUserPos = null;
      dragStartLinearPoints = null;
    });
    return el;
  }

  getElement(logicalId) {
    return this.elements.get(logicalId)?.el;
  }

  getType(logicalId) {
    return this.elements.get(logicalId)?.type;
  }

  removeElement(logicalId) {
    const hit = this.elements.get(logicalId);
    if (hit) {
      this.board.removeObject(hit.el);
      this.elements.delete(logicalId);
    }
  }

  applyVisualState(logicalId, selected) {
    const hit = this.elements.get(logicalId);
    if (!hit) {
      return;
    }
    const attrs = selected
      ? { strokeColor: "#0f766e", strokeWidth: 3, fillColor: "#0f766e", fillOpacity: 0.2 }
      : { strokeColor: undefined, strokeWidth: undefined, fillColor: undefined, fillOpacity: undefined };
    hit.el.setAttribute(attrs);
    this.board.update();
  }

  createPoint(id, x, y, style = {}) {
    const el = this.board.create("point", [x, y], {
      size: 3,
      strokeColor: style.strokeColor || "#111",
      fillColor: style.strokeColor || "#111",
      name: "",
      withLabel: false,
      fixed: false,
    });
    return this.registerElement(id, "point", el);
  }

  createSupportPoint(x, y) {
    return this.board.create("point", [x, y], {
      visible: false,
      fixed: true,
      name: "",
      withLabel: false,
      highlight: false,
    });
  }

  createSegment(id, p1, p2, style = {}) {
    const el = this.board.create("segment", [p1, p2], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 0,
    });
    return this.registerElement(id, "segment", el);
  }

  createLine(id, p1, p2, style = {}) {
    if (style.lineType === "ray") {
      const meta = {
        basePoint1: p1,
        basePoint2: p2,
        rayExtension: Math.max(0, Number(style.rayExtension ?? 4)),
      };
      const rayEnd = this.createRayEndpointPoint(p1, p2, () => meta.rayExtension);
      const el = this.board.create("segment", [p1, rayEnd], {
        strokeColor: style.strokeColor || "#111",
        strokeWidth: style.strokeWidth || 2,
        dash: style.dash || 0,
        lastArrow: true,
      });
      const primary = this.registerElement(id, "ray", el, meta);
      this.attachLinearExtentHandles(id, "ray", p1, p2, meta);
      return primary;
    }
    if (style.lineType === "line") {
      const meta = {
        basePoint1: p1,
        basePoint2: p2,
        lineExtensionStart: Math.max(0, Number(style.lineExtensionStart ?? 4)),
        lineExtensionEnd: Math.max(0, Number(style.lineExtensionEnd ?? 4)),
      };
      const lineStart = this.createLineEndpointPoint(p1, p2, () => meta.lineExtensionStart, "start");
      const lineEnd = this.createLineEndpointPoint(p1, p2, () => meta.lineExtensionEnd, "end");
      const el = this.board.create("segment", [lineStart, lineEnd], {
        strokeColor: style.strokeColor || "#111",
        strokeWidth: style.strokeWidth || 2,
        dash: style.dash || 0,
        firstArrow: true,
        lastArrow: true,
      });
      const primary = this.registerElement(id, "line", el, meta);
      this.attachLinearExtentHandles(id, "line", p1, p2, meta);
      return primary;
    }
    const el = this.board.create("line", [p1, p2], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 0,
      straightFirst: style.straightFirst ?? true,
      straightLast: style.straightLast ?? true,
    });
    return this.registerElement(id, style.lineType || "line", el);
  }

  createCircle(id, center, through, style = {}) {
    const el = this.board.create("circle", [center, through], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 0,
      fillOpacity: 0,
    });
    return this.registerElement(id, "circle", el);
  }

  normalizeReferenceLine(sourceLine) {
    if (!sourceLine) {
      return null;
    }
    if (sourceLine.elementClass === JXG.OBJECT_CLASS_LINE && sourceLine.visProp?.straightFirst && sourceLine.visProp?.straightLast) {
      return sourceLine;
    }
    if (sourceLine.point1 && sourceLine.point2) {
      return this.board.create("line", [sourceLine.point1, sourceLine.point2], {
        visible: false,
        fixed: true,
        strokeOpacity: 0,
        highlight: false,
      });
    }
    return sourceLine;
  }

  createParallelLine(id, sourceLine, throughPoint, style = {}) {
    const refLine = this.normalizeReferenceLine(sourceLine);
    const el = this.board.create("parallel", [refLine, throughPoint], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash ?? 0,
    });
    return this.registerElement(id, "line", el);
  }

  createPerpendicularLine(id, sourceLine, throughPoint, style = {}) {
    const refLine = this.normalizeReferenceLine(sourceLine);
    const el = this.board.create("perpendicular", [refLine, throughPoint], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash ?? 0,
    });
    return this.registerElement(id, "line", el);
  }

  createAngle(id, p1, vertex, p3, style = {}) {
    const attrs = {
      radius: style.radius || 1,
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      fillOpacity: 0,
      orthoType: style.right ? "square" : "sector",
      withLabel: false,
      name: "",
    };
    const angleType = style.right ? "angle" : "nonreflexangle";
    const el = this.board.create(angleType, [p1, vertex, p3], attrs);
    return this.registerElement(id, "angle", el);
  }

  createTickMark(id, segment, tickCount, style = {}) {
    const el = this.board.create("hatch", [segment, tickCount], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
    });
    return this.registerElement(id, "congruency", el);
  }

  createParallelChevronMarks(id, target, markCount, style = {}) {
    if (!target?.point1 || !target?.point2) {
      return this.createTickMark(id, target, markCount, style);
    }
    const segments = [];
    const count = Math.max(1, Number(markCount || 1));
    const spacing = 0.42;
    const arm = 0.5;
    const spread = 0.22;

    const px = () => target.point2.X() - target.point1.X();
    const py = () => target.point2.Y() - target.point1.Y();
    const plen = () => Math.hypot(px(), py()) || 1;
    const ux = () => px() / plen();
    const uy = () => py() / plen();
    const nx = () => -uy();
    const ny = () => ux();
    const cx = () => (target.point1.X() + target.point2.X()) / 2;
    const cy = () => (target.point1.Y() + target.point2.Y()) / 2;

    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spacing;
      const mx = () => cx() + ux() * offset;
      const my = () => cy() + uy() * offset;

      // Chevron vertex stays on the line; arms trail along line direction.
      const pLeft = this.board.create("point", [() => mx() - ux() * arm + nx() * spread, () => my() - uy() * arm + ny() * spread], {
        visible: false,
        fixed: true,
        name: "",
      });
      const pMid = this.board.create("point", [() => mx(), () => my()], {
        visible: false,
        fixed: true,
        name: "",
      });
      const pRight = this.board.create("point", [() => mx() - ux() * arm - nx() * spread, () => my() - uy() * arm - ny() * spread], {
        visible: false,
        fixed: true,
        name: "",
      });
      const segA = this.board.create("segment", [pLeft, pMid], {
        strokeColor: style.strokeColor || "#111",
        strokeWidth: style.strokeWidth || 2,
        dash: 0,
      });
      const segB = this.board.create("segment", [pMid, pRight], {
        strokeColor: style.strokeColor || "#111",
        strokeWidth: style.strokeWidth || 2,
        dash: 0,
      });
      segments.push(segA, segB);
    }

    const primary = this.registerElement(id, "congruency", segments[0]);
    for (let i = 1; i < segments.length; i += 1) {
      segments[i].visProp.highlight = false;
    }
    this.board.update();
    return primary;
  }

  createText(id, x, y, text, style = {}) {
    const el = this.board.create("text", [x, y, text], {
      fontSize: style.fontSize || 20,
      color: style.strokeColor || "#111",
      fixed: false,
      draggable: true,
      display: "internal",
    });
    return this.registerElement(id, "label", el);
  }

  exportBoardSvg() {
    return this.board.renderer.svgRoot.outerHTML;
  }

  update() {
    this.board.fullUpdate();
  }
}
