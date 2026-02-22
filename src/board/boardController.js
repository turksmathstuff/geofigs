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
      line = this.board.create("line", [a, b], { ...attrs, straightFirst: false, straightLast: true });
    } else {
      line = this.board.create("line", [a, b], { ...attrs, straightFirst: true, straightLast: true });
    }
    this.previewElements = [line, a, b];
    this.board.update();
  }

  registerElement(logicalId, type, el) {
    el.visProp.highlight = false;
    this.elements.set(logicalId, { type, el });
    el.on("down", (evt) => {
      let consume = true;
      if (this.onObjectClick) {
        consume = this.onObjectClick(logicalId, type, evt) !== false;
      }
      if (consume) {
        this.suppressNextBoardDown = true;
        evt.stopPropagation();
      } else {
        this.suppressNextBoardDown = false;
      }
    });
    el.on("up", () => {
      if (!this.onObjectMove) {
        return;
      }
      if (type === "point" || type === "label") {
        this.onObjectMove(logicalId, type, { x: el.X(), y: el.Y() });
      }
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

  createSegment(id, p1, p2, style = {}) {
    const el = this.board.create("segment", [p1, p2], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 0,
    });
    return this.registerElement(id, "segment", el);
  }

  createLine(id, p1, p2, style = {}) {
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
      dash: style.dash || 2,
    });
    return this.registerElement(id, "line", el);
  }

  createPerpendicularLine(id, sourceLine, throughPoint, style = {}) {
    const refLine = this.normalizeReferenceLine(sourceLine);
    const el = this.board.create("perpendicular", [refLine, throughPoint], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 2,
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
