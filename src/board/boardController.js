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

  disablePreviewHitTesting(elements) {
    for (const el of elements) {
      if (!el) {
        continue;
      }
      const nodes = [
        el.rendNode,
        el.rendNodeStroke,
        el.rendNodeFill,
        el.rendNodeTriangleStart,
        el.rendNodeTriangleEnd,
      ];
      for (const node of nodes) {
        if (node?.style) {
          node.style.pointerEvents = "none";
        }
      }
    }
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
    this.disablePreviewHitTesting(this.previewElements);
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
      this.disablePreviewHitTesting(this.previewElements);
      this.board.update();
      return;
    } else {
      const lineStart = this.createLineEndpointPoint(a, b, p2.lineExtensionStart, "start");
      const lineEnd = this.createLineEndpointPoint(a, b, p2.lineExtensionEnd, "end");
      line = this.board.create("segment", [lineStart, lineEnd], { ...attrs, firstArrow: true, lastArrow: true });
      this.previewElements = [line, a, b, lineStart, lineEnd];
      this.disablePreviewHitTesting(this.previewElements);
      this.board.update();
      return;
    }
    this.previewElements = [line, a, b];
    this.disablePreviewHitTesting(this.previewElements);
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
    this.disablePreviewHitTesting(this.previewElements);
    this.board.update();
  }

  showPreviewAngle(p1, vertex, p3, options = {}) {
    this.clearPreview();
    const right = !!options.right;
    const arcCount = Math.max(1, Number(options.arcCount || 1));
    const decorator = options.decorator || "arc";
    const tickCount = Math.max(1, Number(options.tickCount || 1));
    const pointA = this.board.create("point", [p1.x, p1.y], { visible: false, fixed: true, name: "" });
    const pointV = this.board.create("point", [vertex.x, vertex.y], { visible: false, fixed: true, name: "" });
    const pointB = this.board.create("point", [p3.x, p3.y], { visible: false, fixed: true, name: "" });
    const preview = [pointA, pointV, pointB];
    if (right) {
      const mark = this.createRightAngleMarkParts(pointA, pointV, pointB, {
        radius: 1,
        strokeColor: "#9ca3af",
        strokeWidth: 2,
        dash: 2,
        fixed: true,
        highlight: false,
      });
      if (mark) {
        preview.push(...mark.all);
      }
    } else {
      if (decorator === "arcTick") {
        const mark = this.createArcTickAngleMarkParts(pointA, pointV, pointB, {
          radius: 1,
          tickCount,
          strokeColor: "#9ca3af",
          strokeWidth: 2,
          dash: 2,
          fixed: true,
          highlight: false,
        });
        if (mark) {
          preview.push(...mark.all);
        }
      } else {
        for (let i = 0; i < arcCount; i += 1) {
          const mark = this.createArcAngleMarkParts(pointA, pointV, pointB, {
            radius: 1 + i * 0.35,
            strokeColor: "#9ca3af",
            strokeWidth: 2,
            dash: 2,
            fixed: true,
            highlight: false,
          });
          if (mark) {
            preview.push(...mark.all);
          }
        }
      }
    }
    this.previewElements = preview;
    this.disablePreviewHitTesting(this.previewElements);
    this.board.update();
  }

  createFunctionalSupportPoint(xFn, yFn) {
    return this.board.create("point", [xFn, yFn], {
      visible: false,
      fixed: true,
      name: "",
      withLabel: false,
      highlight: false,
    });
  }

  angleMarkFrame(p1, vertex, p3) {
    const vx = () => vertex.X();
    const vy = () => vertex.Y();
    const a1 = () => Math.atan2(p1.Y() - vy(), p1.X() - vx());
    const a2 = () => Math.atan2(p3.Y() - vy(), p3.X() - vx());
    const delta = () => {
      let d = a2() - a1();
      while (d <= -Math.PI) d += Math.PI * 2;
      while (d > Math.PI) d -= Math.PI * 2;
      if (Math.abs(d) < 1e-6) {
        d = Math.PI / 12;
      }
      return d;
    };
    return { vx, vy, a1, delta };
  }

  createArcAngleMarkParts(p1, vertex, p3, style = {}) {
    const radius = Math.max(0.15, Number(style.radius || 1));
    const frame = this.angleMarkFrame(p1, vertex, p3);
    const pStart = this.createFunctionalSupportPoint(
      () => frame.vx() + Math.cos(frame.a1()) * radius,
      () => frame.vy() + Math.sin(frame.a1()) * radius
    );
    const pEnd = this.createFunctionalSupportPoint(
      () => frame.vx() + Math.cos(frame.a1() + frame.delta()) * radius,
      () => frame.vy() + Math.sin(frame.a1() + frame.delta()) * radius
    );
    const arc = this.board.create("arc", [vertex, pStart, pEnd], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash ?? 0,
      fillOpacity: 0,
      fixed: !!style.fixed,
      highlight: !!style.highlight,
      withLabel: false,
      name: "",
    });
    return { primary: arc, all: [arc, pStart, pEnd] };
  }

  createArcTickAngleMarkParts(p1, vertex, p3, style = {}) {
    const tickCount = Math.max(1, Number(style.tickCount || 1));
    const radius = Math.max(0.15, Number(style.radius || 1));
    const base = this.createArcAngleMarkParts(p1, vertex, p3, style);
    const frame = this.angleMarkFrame(p1, vertex, p3);
    const tickLen = Math.max(0.2, radius * 0.42);
    const absDelta = () => Math.abs(frame.delta());
    const spread = () => Math.min(Math.PI / 10, Math.max(Math.PI / 36, absDelta() / 6));
    const tickOffsets = tickCount === 1
      ? [0]
      : tickCount === 2
        ? [-spread() * 0.75, spread() * 0.75]
        : [-spread(), 0, spread()];
    const extra = [];
    for (const offset of tickOffsets) {
      const center = this.createFunctionalSupportPoint(
        () => frame.vx() + Math.cos(frame.a1() + frame.delta() / 2 + offset) * radius,
        () => frame.vy() + Math.sin(frame.a1() + frame.delta() / 2 + offset) * radius
      );
      const pInner = this.createFunctionalSupportPoint(
        () => frame.vx() + Math.cos(frame.a1() + frame.delta() / 2 + offset) * (radius - tickLen / 2),
        () => frame.vy() + Math.sin(frame.a1() + frame.delta() / 2 + offset) * (radius - tickLen / 2)
      );
      const pOuter = this.createFunctionalSupportPoint(
        () => frame.vx() + Math.cos(frame.a1() + frame.delta() / 2 + offset) * (radius + tickLen / 2),
        () => frame.vy() + Math.sin(frame.a1() + frame.delta() / 2 + offset) * (radius + tickLen / 2)
      );
      const tick = this.board.create("segment", [pInner, pOuter], {
        strokeColor: style.strokeColor || "#111",
        strokeWidth: style.strokeWidth || 2,
        dash: 0,
        fixed: !!style.fixed,
        highlight: !!style.highlight,
      });
      extra.push(tick, center, pInner, pOuter);
    }
    return { primary: base.primary, all: [...base.all, ...extra] };
  }

  createRightAngleMarkParts(p1, vertex, p3, style = {}) {
    const side = Math.max(0.15, Number(style.radius || 1) * 0.7);
    const vx = () => vertex.X();
    const vy = () => vertex.Y();
    const ux1 = () => {
      const dx = p1.X() - vx();
      const dy = p1.Y() - vy();
      const len = Math.hypot(dx, dy) || 1;
      return dx / len;
    };
    const uy1 = () => {
      const dx = p1.X() - vx();
      const dy = p1.Y() - vy();
      const len = Math.hypot(dx, dy) || 1;
      return dy / len;
    };
    const ux2 = () => {
      const dx = p3.X() - vx();
      const dy = p3.Y() - vy();
      const len = Math.hypot(dx, dy) || 1;
      return dx / len;
    };
    const uy2 = () => {
      const dx = p3.X() - vx();
      const dy = p3.Y() - vy();
      const len = Math.hypot(dx, dy) || 1;
      return dy / len;
    };

    const pA = this.createFunctionalSupportPoint(
      () => vx() + ux1() * side,
      () => vy() + uy1() * side
    );
    const pB = this.createFunctionalSupportPoint(
      () => vx() + ux2() * side,
      () => vy() + uy2() * side
    );
    const pCorner = this.createFunctionalSupportPoint(
      () => vx() + (ux1() + ux2()) * side,
      () => vy() + (uy1() + uy2()) * side
    );

    const attrs = {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash ?? 0,
      fixed: !!style.fixed,
      highlight: !!style.highlight,
    };
    const seg1 = this.board.create("segment", [pA, pCorner], attrs);
    const seg2 = this.board.create("segment", [pCorner, pB], attrs);
    return { primary: seg1, all: [seg1, seg2, pA, pB, pCorner] };
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
        if (this.onObjectMove) {
          if (type === "ray") {
            this.onObjectMove(logicalId, "ray", { rayExtension: meta.rayExtension }, { transient: true });
          } else {
            this.onObjectMove(logicalId, "line", {
              lineExtensionStart: meta.lineExtensionStart,
              lineExtensionEnd: meta.lineExtensionEnd,
            }, { transient: true });
          }
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
          this.onObjectMove(logicalId, "ray", { rayExtension: meta.rayExtension }, { transient: false });
        } else {
          this.onObjectMove(logicalId, "line", {
            lineExtensionStart: meta.lineExtensionStart,
            lineExtensionEnd: meta.lineExtensionEnd,
          }, { transient: false });
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
    let dragStartCirclePoints = null;
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
      if ((type === "ray" || type === "line" || type === "segment") && meta.basePoint1 && meta.basePoint2) {
        dragStartLinearPoints = {
          p1: { x: meta.basePoint1.X(), y: meta.basePoint1.Y() },
          p2: { x: meta.basePoint2.X(), y: meta.basePoint2.Y() },
        };
      } else {
        dragStartLinearPoints = null;
      }
      if (type === "circle" && meta.centerPoint && meta.throughPoint) {
        dragStartCirclePoints = {
          p1: { x: meta.centerPoint.X(), y: meta.centerPoint.Y() },
          p2: { x: meta.throughPoint.X(), y: meta.throughPoint.Y() },
        };
      } else {
        dragStartCirclePoints = null;
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
      if (!["ray", "line", "segment"].includes(type) || !meta.basePoint1 || !meta.basePoint2 || !pointerDownUserPos || !dragStartLinearPoints) {
        return;
      }
      const current = this.getUserCoords(evt);
      let dx = current.x - pointerDownUserPos.x;
      let dy = current.y - pointerDownUserPos.y;
      if (evt?.shiftKey) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dy = 0;
        } else {
          dx = 0;
        }
      }
      meta.basePoint1.setPosition(JXG.COORDS_BY_USER, [dragStartLinearPoints.p1.x + dx, dragStartLinearPoints.p1.y + dy]);
      meta.basePoint2.setPosition(JXG.COORDS_BY_USER, [dragStartLinearPoints.p2.x + dx, dragStartLinearPoints.p2.y + dy]);
      this.syncLinearExtentHandles(type, meta.basePoint1, meta.basePoint2, meta);
      if (this.onObjectMove) {
        this.onObjectMove(logicalId, type, {
          p1: { x: meta.basePoint1.X(), y: meta.basePoint1.Y() },
          p2: { x: meta.basePoint2.X(), y: meta.basePoint2.Y() },
        }, { transient: true });
      }
      this.board.update();
    });
    el.on("drag", (evt) => {
      if (type !== "circle" || !meta.centerPoint || !meta.throughPoint || !pointerDownUserPos || !dragStartCirclePoints) {
        return;
      }
      const current = this.getUserCoords(evt);
      let dx = current.x - pointerDownUserPos.x;
      let dy = current.y - pointerDownUserPos.y;
      if (evt?.shiftKey) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dy = 0;
        } else {
          dx = 0;
        }
      }
      meta.centerPoint.setPosition(JXG.COORDS_BY_USER, [dragStartCirclePoints.p1.x + dx, dragStartCirclePoints.p1.y + dy]);
      meta.throughPoint.setPosition(JXG.COORDS_BY_USER, [dragStartCirclePoints.p2.x + dx, dragStartCirclePoints.p2.y + dy]);
      if (this.onObjectMove) {
        this.onObjectMove(logicalId, type, {
          p1: { x: meta.centerPoint.X(), y: meta.centerPoint.Y() },
          p2: { x: meta.throughPoint.X(), y: meta.throughPoint.Y() },
        }, { transient: true, shiftKey: !!evt?.shiftKey });
      }
      this.board.update();
    });
    if (type === "point" || type === "label") {
      el.on("drag", (evt) => {
        if (!this.onObjectMove) {
          return;
        }
        if (pointerDownObjPos) {
          const moved =
            Math.abs(pointerDownObjPos.x - Number(el.X?.())) > 1e-4 ||
            Math.abs(pointerDownObjPos.y - Number(el.Y?.())) > 1e-4;
          if (!moved) {
            return;
          }
        }
        this.onObjectMove(logicalId, type, { x: el.X(), y: el.Y() }, { transient: true, shiftKey: !!evt?.shiftKey });
      });
    }
    el.on("up", (evt) => {
      let pointOrLabelMoved = false;
      if (pointerDownObjPos && (type === "point" || type === "label")) {
        pointOrLabelMoved =
          Math.abs(pointerDownObjPos.x - Number(el.X?.())) > 1e-4 ||
          Math.abs(pointerDownObjPos.y - Number(el.Y?.())) > 1e-4;
      }
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
      if ((type === "point" || type === "label") && pointOrLabelMoved) {
        this.onObjectMove(logicalId, type, { x: el.X(), y: el.Y() }, { transient: false, shiftKey: !!evt?.shiftKey });
      } else if ((type === "ray" || type === "line" || type === "segment") && meta.basePoint1 && meta.basePoint2) {
        this.onObjectMove(logicalId, type, {
          p1: { x: meta.basePoint1.X(), y: meta.basePoint1.Y() },
          p2: { x: meta.basePoint2.X(), y: meta.basePoint2.Y() },
        }, { transient: false });
      } else if (type === "circle" && meta.centerPoint && meta.throughPoint) {
        this.onObjectMove(logicalId, type, {
          p1: { x: meta.centerPoint.X(), y: meta.centerPoint.Y() },
          p2: { x: meta.throughPoint.X(), y: meta.throughPoint.Y() },
        }, { transient: false, shiftKey: !!evt?.shiftKey });
      }
      deferredClick = false;
      pointerDownObjPos = null;
      pointerDownScreenPos = null;
      pointerDownUserPos = null;
      dragStartLinearPoints = null;
      dragStartCirclePoints = null;
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
    let attrs;
    if (selected && hit.type === "point") {
      attrs = {
        strokeColor: "#0f766e",
        fillColor: "#0f766e",
        fillOpacity: 0.18,
        strokeWidth: 3,
        size: 7,
      };
    } else if (selected) {
      attrs = { strokeColor: "#0f766e", strokeWidth: 3, fillColor: "#0f766e", fillOpacity: 0.2 };
    } else {
      attrs = { strokeColor: undefined, strokeWidth: undefined, fillColor: undefined, fillOpacity: undefined, size: undefined };
    }
    hit.el.setAttribute(attrs);
    this.board.update();
  }

  createPoint(id, x, y, style = {}) {
    const el = this.board.create("point", [x, y], {
      size: style.size || 3,
      strokeColor: style.strokeColor || "#111",
      fillColor: style.strokeColor || "#111",
      name: "",
      withLabel: false,
      fixed: !!style.fixed,
      layer: style.layer ?? 9,
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
    return this.registerElement(id, "segment", el, { basePoint1: p1, basePoint2: p2 });
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
    return this.registerElement(id, "circle", el, { centerPoint: center, throughPoint: through });
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

  defaultCanvasSpanningLineExtension() {
    const bbox = this.board?.getBoundingBox?.() || [-10, 10, 10, -10];
    const minX = Math.min(bbox[0], bbox[2]);
    const maxX = Math.max(bbox[0], bbox[2]);
    const minY = Math.min(bbox[1], bbox[3]);
    const maxY = Math.max(bbox[1], bbox[3]);
    const diag = Math.hypot(maxX - minX, maxY - minY) || 20;
    return diag * 0.4;
  }

  rayDistanceToInsetBounds(origin, dir, bounds) {
    const eps = 1e-9;
    let best = Infinity;
    const { x, y } = origin;
    const { dx, dy } = dir;
    const { minX, maxX, minY, maxY } = bounds;

    if (Math.abs(dx) > eps) {
      const tx1 = (minX - x) / dx;
      const y1 = y + tx1 * dy;
      if (tx1 > 0 && y1 >= minY - 1e-6 && y1 <= maxY + 1e-6) {
        best = Math.min(best, tx1);
      }
      const tx2 = (maxX - x) / dx;
      const y2 = y + tx2 * dy;
      if (tx2 > 0 && y2 >= minY - 1e-6 && y2 <= maxY + 1e-6) {
        best = Math.min(best, tx2);
      }
    }

    if (Math.abs(dy) > eps) {
      const ty1 = (minY - y) / dy;
      const x1 = x + ty1 * dx;
      if (ty1 > 0 && x1 >= minX - 1e-6 && x1 <= maxX + 1e-6) {
        best = Math.min(best, ty1);
      }
      const ty2 = (maxY - y) / dy;
      const x2 = x + ty2 * dx;
      if (ty2 > 0 && x2 >= minX - 1e-6 && x2 <= maxX + 1e-6) {
        best = Math.min(best, ty2);
      }
    }

    return Number.isFinite(best) ? best : null;
  }

  canvasInsetLineExtents(throughPoint, baseA, baseB) {
    const bbox = this.board?.getBoundingBox?.() || [-10, 10, 10, -10];
    const rawMinX = Math.min(bbox[0], bbox[2]);
    const rawMaxX = Math.max(bbox[0], bbox[2]);
    const rawMinY = Math.min(bbox[1], bbox[3]);
    const rawMaxY = Math.max(bbox[1], bbox[3]);
    const width = Math.max(1e-6, rawMaxX - rawMinX);
    const height = Math.max(1e-6, rawMaxY - rawMinY);
    const insetX = width * 0.03;
    const insetY = height * 0.03;
    const bounds = {
      minX: rawMinX + insetX,
      maxX: rawMaxX - insetX,
      minY: rawMinY + insetY,
      maxY: rawMaxY - insetY,
    };

    const dx0 = baseB.X() - baseA.X();
    const dy0 = baseB.Y() - baseA.Y();
    const len = Math.hypot(dx0, dy0) || 1;
    const ux = dx0 / len;
    const uy = dy0 / len;
    const origin = { x: throughPoint.X(), y: throughPoint.Y() };
    const dPlus = this.rayDistanceToInsetBounds(origin, { dx: ux, dy: uy }, bounds);
    const dMinus = this.rayDistanceToInsetBounds(origin, { dx: -ux, dy: -uy }, bounds);
    if (dPlus == null || dMinus == null) {
      const fallback = this.defaultCanvasSpanningLineExtension();
      return { start: fallback, end: fallback };
    }
    // baseA/baseB are offset 0.5 units on either side of throughPoint in the line direction
    return {
      start: Math.max(0, dMinus - 0.5),
      end: Math.max(0, dPlus - 0.5),
    };
  }

  createDirectedBasePointsThroughPoint(throughPoint, refLine, perpendicular = false) {
    const baseA = this.board.create("point", [
      () => {
        const dx0 = refLine.point2.X() - refLine.point1.X();
        const dy0 = refLine.point2.Y() - refLine.point1.Y();
        const len = Math.hypot(dx0, dy0) || 1;
        const ux = perpendicular ? -dy0 / len : dx0 / len;
        return throughPoint.X() - ux * 0.5;
      },
      () => {
        const dx0 = refLine.point2.X() - refLine.point1.X();
        const dy0 = refLine.point2.Y() - refLine.point1.Y();
        const len = Math.hypot(dx0, dy0) || 1;
        const uy = perpendicular ? dx0 / len : dy0 / len;
        return throughPoint.Y() - uy * 0.5;
      },
    ], {
      visible: false,
      fixed: true,
      name: "",
    });
    const baseB = this.board.create("point", [
      () => {
        const dx0 = refLine.point2.X() - refLine.point1.X();
        const dy0 = refLine.point2.Y() - refLine.point1.Y();
        const len = Math.hypot(dx0, dy0) || 1;
        const ux = perpendicular ? -dy0 / len : dx0 / len;
        return throughPoint.X() + ux * 0.5;
      },
      () => {
        const dx0 = refLine.point2.X() - refLine.point1.X();
        const dy0 = refLine.point2.Y() - refLine.point1.Y();
        const len = Math.hypot(dx0, dy0) || 1;
        const uy = perpendicular ? dx0 / len : dy0 / len;
        return throughPoint.Y() + uy * 0.5;
      },
    ], {
      visible: false,
      fixed: true,
      name: "",
    });
    return { baseA, baseB };
  }

  createParallelLine(id, sourceLine, throughPoint, style = {}) {
    const refLine = this.normalizeReferenceLine(sourceLine);
    const { baseA, baseB } = this.createDirectedBasePointsThroughPoint(throughPoint, refLine, false);
    const canvasExtents = this.canvasInsetLineExtents(throughPoint, baseA, baseB);
    const meta = {
      lineExtensionStart: Math.max(0, Number(style.lineExtensionStart ?? canvasExtents.start)),
      lineExtensionEnd: Math.max(0, Number(style.lineExtensionEnd ?? canvasExtents.end)),
    };
    const lineStart = this.createLineEndpointPoint(baseA, baseB, () => meta.lineExtensionStart, "start");
    const lineEnd = this.createLineEndpointPoint(baseA, baseB, () => meta.lineExtensionEnd, "end");
    const el = this.board.create("segment", [lineStart, lineEnd], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash ?? 0,
      firstArrow: true,
      lastArrow: true,
    });
    const primary = this.registerElement(id, "line", el, meta);
    this.attachLinearExtentHandles(id, "line", baseA, baseB, meta);
    return primary;
  }

  createPerpendicularLine(id, sourceLine, throughPoint, style = {}) {
    const refLine = this.normalizeReferenceLine(sourceLine);
    const { baseA, baseB } = this.createDirectedBasePointsThroughPoint(throughPoint, refLine, true);
    const canvasExtents = this.canvasInsetLineExtents(throughPoint, baseA, baseB);
    const meta = {
      lineExtensionStart: Math.max(0, Number(style.lineExtensionStart ?? canvasExtents.start)),
      lineExtensionEnd: Math.max(0, Number(style.lineExtensionEnd ?? canvasExtents.end)),
    };
    const lineStart = this.createLineEndpointPoint(baseA, baseB, () => meta.lineExtensionStart, "start");
    const lineEnd = this.createLineEndpointPoint(baseA, baseB, () => meta.lineExtensionEnd, "end");
    const el = this.board.create("segment", [lineStart, lineEnd], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash ?? 0,
      firstArrow: true,
      lastArrow: true,
    });
    const primary = this.registerElement(id, "line", el, meta);
    this.attachLinearExtentHandles(id, "line", baseA, baseB, meta);
    return primary;
  }

  createAngle(id, p1, vertex, p3, style = {}) {
    const parts = style.right
      ? this.createRightAngleMarkParts(p1, vertex, p3, style)
      : style.decorator === "arcTick"
        ? this.createArcTickAngleMarkParts(p1, vertex, p3, style)
        : this.createArcAngleMarkParts(p1, vertex, p3, style);
    if (!parts?.primary) {
      return null;
    }
    const primary = this.registerElement(id, "angle", parts.primary);
    for (const el of parts.all) {
      if (el !== parts.primary && el?.visProp) {
        el.visProp.highlight = false;
      }
    }
    return primary;
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
