export class BoardController {
  constructor(containerId, onBoardClick, onObjectClick, onBoardMove) {
    this.containerId = containerId;
    this.onBoardClick = onBoardClick;
    this.onObjectClick = onObjectClick;
    this.onBoardMove = onBoardMove;
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

  registerElement(logicalId, type, el) {
    el.visProp.highlight = false;
    this.elements.set(logicalId, { type, el });
    el.on("down", (evt) => {
      this.suppressNextBoardDown = true;
      evt.stopPropagation();
      if (this.onObjectClick) {
        this.onObjectClick(logicalId, type, evt);
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
      name: style.name || "",
      withLabel: !!style.name,
      label: { offset: [6, -6] },
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

  createParallelLine(id, sourceLine, throughPoint, style = {}) {
    const el = this.board.create("parallel", [sourceLine, throughPoint], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 2,
    });
    return this.registerElement(id, "line", el);
  }

  createPerpendicularLine(id, sourceLine, throughPoint, style = {}) {
    const el = this.board.create("perpendicular", [sourceLine, throughPoint], {
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      dash: style.dash || 2,
    });
    return this.registerElement(id, "line", el);
  }

  createAngle(id, p1, vertex, p3, style = {}) {
    const attrs = {
      radius: 1,
      strokeColor: style.strokeColor || "#111",
      strokeWidth: style.strokeWidth || 2,
      fillOpacity: 0,
      orthoType: style.right ? "square" : "sector",
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

  createText(id, x, y, text, style = {}) {
    const el = this.board.create("text", [x, y, text], {
      fontSize: style.fontSize || 16,
      color: style.strokeColor || "#111",
      fixed: true,
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
