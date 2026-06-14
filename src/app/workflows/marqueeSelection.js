function inBounds(pt, bounds) {
  return pt.x >= bounds.minX && pt.x <= bounds.maxX && pt.y >= bounds.minY && pt.y <= bounds.maxY;
}

export function createMarqueeSelectionWorkflow(ctx) {
  const {
    store,
    session,
    boardEl,
    boardController,
    ToolMode,
    getPointById,
    renderCurrentDoc,
    doc,
    win,
  } = ctx;

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
    if (session.marqueeState?.rectEl) {
      session.marqueeState.rectEl.remove();
    }
  }

  function clearMarqueeState() {
    removeMarqueeRect();
    session.marqueeState = null;
  }

  function startMarqueeSelection() {
    if (!boardEl) {
      return;
    }

    boardEl.addEventListener("mousedown", (evt) => {
      if (session.currentMode !== ToolMode.SELECT || evt.button !== 0) {
        return;
      }
      // Construction sessions are click-to-pick / click-to-place flows. Arming a
      // marquee here is both unwanted and unsafe: a synchronous prompt() (e.g.
      // the polygon side-count box) can swallow the matching mouseup, leaving a
      // stale marquee that draws a phantom rectangle on the next move.
      if (session.constructionSelectionSession) {
        return;
      }
      const tag = String(evt.target?.tagName || "").toLowerCase();
      if (tag !== "svg" && evt.target !== boardEl) {
        return;
      }
      // Drop any stale marquee (e.g. one whose mouseup was swallowed by a modal)
      // before arming a new one, so its rectangle can't be orphaned.
      clearMarqueeState();
      const rect = boardEl.getBoundingClientRect();
      const wrapRect = boardEl.parentElement.getBoundingClientRect();
      session.marqueeState = {
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

    win.addEventListener("mousemove", (evt) => {
      if (!session.marqueeState || session.currentMode !== ToolMode.SELECT) {
        return;
      }
      // The primary button is no longer held — the mouseup that should have
      // ended this marquee never reached us (commonly swallowed by a modal such
      // as the polygon side-count prompt). Abandon it instead of drawing a
      // phantom rectangle that tracks the cursor.
      if ((evt.buttons & 1) === 0) {
        clearMarqueeState();
        return;
      }
      session.marqueeState.lastX = evt.clientX;
      session.marqueeState.lastY = evt.clientY;
      const dx = Math.abs(evt.clientX - session.marqueeState.startX);
      const dy = Math.abs(evt.clientY - session.marqueeState.startY);
      if (!session.marqueeState.dragging && Math.max(dx, dy) < 6) {
        return;
      }
      session.marqueeState.dragging = true;
      if (!session.marqueeState.rectEl) {
        const rectEl = doc.createElement("div");
        rectEl.className = "marquee-select";
        boardEl.parentElement.appendChild(rectEl);
        session.marqueeState.rectEl = rectEl;
      }
      const minX = Math.max(session.marqueeState.boardRect.left, Math.min(session.marqueeState.startX, evt.clientX));
      const minY = Math.max(session.marqueeState.boardRect.top, Math.min(session.marqueeState.startY, evt.clientY));
      const maxX = Math.min(session.marqueeState.boardRect.right, Math.max(session.marqueeState.startX, evt.clientX));
      const maxY = Math.min(session.marqueeState.boardRect.bottom, Math.max(session.marqueeState.startY, evt.clientY));
      session.marqueeState.rectEl.style.left = `${minX - session.marqueeState.wrapRect.left}px`;
      session.marqueeState.rectEl.style.top = `${minY - session.marqueeState.wrapRect.top}px`;
      session.marqueeState.rectEl.style.width = `${Math.max(0, maxX - minX)}px`;
      session.marqueeState.rectEl.style.height = `${Math.max(0, maxY - minY)}px`;
    });

    win.addEventListener("mouseup", () => {
      if (!session.marqueeState) {
        return;
      }
      if (session.marqueeState.dragging) {
        const p1 = boardController.screenToUser(session.marqueeState.startX, session.marqueeState.startY);
        const p2 = boardController.screenToUser(session.marqueeState.lastX, session.marqueeState.lastY);
        const bounds = {
          minX: Math.min(p1.x, p2.x),
          maxX: Math.max(p1.x, p2.x),
          minY: Math.min(p1.y, p2.y),
          maxY: Math.max(p1.y, p2.y),
        };
        applyMarqueeSelection(bounds, session.marqueeState.additive);
      }
      removeMarqueeRect();
      session.marqueeState = null;
    });
  }

  return {
    startMarqueeSelection,
  };
}
