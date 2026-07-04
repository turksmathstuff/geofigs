import { computeTangentPoints, computeTangentAtPointPosition } from "../geometry/circles.js";

export function createTangentToolsWorkflow(ctx) {
  const {
    ToolMode,
    session,
    store,
    boardController,
    statusEl,
    getPointById,
    getObjectById,
    selectedOfTypes,
    makeId,
    runMutation,
    addObject,
    defaultStyle,
    showNotice,
    setMode,
    startConstructionSelectionSession,
    updateModeUi,
    renderCurrentDoc,
  } = ctx;

  // ── Tangent to Circle ───────────────────────────────────────────────────────

  function distanceToSegment(pt, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) return Math.hypot(pt.x - a.x, pt.y - a.y);
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2));
    return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy));
  }

  function computeTangentPickPoints(sourcePointId, circleId) {
    const source = getPointById(sourcePointId);
    const circleObj = getObjectById(circleId);
    const center = circleObj ? getPointById(circleObj.pointIds?.[0]) : null;
    const through = circleObj ? getPointById(circleObj.pointIds?.[1]) : null;
    if (!source || !center || !through) return null;
    const r = Math.hypot(through.x - center.x, through.y - center.y);
    return computeTangentPoints(source, center, r);
  }

  function showTangentPickGhosts() {
    const ps = session.tangentPickState;
    if (!ps) return;
    const source = getPointById(ps.sourcePointId);
    const tps = computeTangentPickPoints(ps.sourcePointId, ps.circleId);
    if (!source || !tps) return;
    const stagedSides = new Set(ps.staged.map((s) => s.side));
    boardController.showTangentPickPreview(source, tps[0], tps[1], stagedSides, ps.hoveredSide);
  }

  function updateTangentPickPreview(cursorCoords) {
    const ps = session.tangentPickState;
    if (!ps) return false;
    const source = getPointById(ps.sourcePointId);
    const tps = computeTangentPickPoints(ps.sourcePointId, ps.circleId);
    if (!source || !tps) return true;
    const stagedSides = new Set(ps.staged.map((s) => s.side));
    const HOVER_THRESHOLD = 0.4;
    let hovered = null;
    let bestDist = Infinity;
    for (let i = 0; i < 2; i++) {
      if (stagedSides.has(i)) continue;
      const d = distanceToSegment(cursorCoords, source, tps[i]);
      if (d < HOVER_THRESHOLD && d < bestDist) {
        bestDist = d;
        hovered = i;
      }
    }
    ps.hoveredSide = hovered;
    boardController.showTangentPickPreview(source, tps[0], tps[1], stagedSides, hovered);
    return true;
  }

  function commitStagedTangent(side) {
    const ps = session.tangentPickState;
    if (!ps || ps.staged.some((s) => s.side === side)) return;
    ps.staged.push({ segmentId: makeId("tseg"), tangentPointId: makeId("ttp"), side });
    showTangentPickGhosts();
    updateModeUi();
    if (ps.staged.length === 2) {
      finalizeTangentPickSession();
    }
  }

  function finalizeTangentPickSession() {
    const ps = session.tangentPickState;
    if (!ps) return;
    const { sourcePointId, circleId, staged } = ps;
    session.tangentPickState = null;
    boardController.clearPreview();
    updateModeUi();
    if (!staged.length) {
      renderCurrentDoc();
      return;
    }
    const tps = computeTangentPickPoints(sourcePointId, circleId);
    if (!tps) {
      renderCurrentDoc();
      return;
    }
    runMutation("tangent-to-circle", () => {
      for (const { segmentId, tangentPointId, side } of staged) {
        const tp = tps[side];
        addObject({
          id: tangentPointId,
          type: "point",
          x: tp.x,
          y: tp.y,
          tangentPoint: true,
          constraint: {
            kind: "circleTangentPoint",
            sourcePointId,
            circleId,
            side,
          },
          style: defaultStyle(),
        });
        addObject({
          id: segmentId,
          type: "segment",
          pointIds: [sourcePointId, tangentPointId],
          style: defaultStyle(),
        });
      }
      store.clearSelection();
    });
  }

  function handleTangentPickBoardClick() {
    const ps = session.tangentPickState;
    if (!ps) return;
    if (ps.hoveredSide !== null) {
      commitStagedTangent(ps.hoveredSide);
    } else {
      finalizeTangentPickSession();
    }
  }

  function addTangentToCircle(options = {}) {
    const quiet = !!options.quiet;
    const selectedPoints = selectedOfTypes(["point"]);
    const selectedCircles = selectedOfTypes(["circle"]);
    if (selectedPoints.length !== 1 || selectedCircles.length !== 1) {
      if (!quiet) {
        showNotice("Select exactly one point and one circle.");
        setMode(ToolMode.SELECT);
      }
      return false;
    }
    const sourcePointId = selectedPoints[0];
    const circleId = selectedCircles[0];
    const tps = computeTangentPickPoints(sourcePointId, circleId);
    if (!tps) {
      if (!quiet) {
        showNotice("Point must be outside the circle.");
        setMode(ToolMode.SELECT);
      }
      return false;
    }
    // finishConstructionSelectionSession will be called by maybeCompleteConstructionSelectionSession
    // after tryCreate returns true; set pick state now so it's in place for that render pass
    session.tangentPickState = { sourcePointId, circleId, staged: [], hoveredSide: null };
    store.clearSelection();
    return true;
  }

  function launchTangentToCircle(buttonId) {
    if (addTangentToCircle({ quiet: true })) {
      // Called directly (valid selection already present); show ghosts now
      showTangentPickGhosts();
      updateModeUi();
      return;
    }
    startConstructionSelectionSession({
      kind: "tangent-to-circle",
      label: "Tangent (Pt→Circle)",
      buttonId,
      instructions: "Select exactly one point and one circle.",
      tryCreate: () => addTangentToCircle({ quiet: true }),
    });
  }

  // ── Tangent at Point on Circle ──────────────────────────────────────────────

  function updateTangentAtPointPreview(cursorCoords) {
    if (!session.tangentAtPointPlacement) {
      return false;
    }
    const { sourcePointId, circleId } = session.tangentAtPointPlacement;
    const source = getPointById(sourcePointId);
    const circleObj = getObjectById(circleId);
    const center = circleObj ? getPointById(circleObj.pointIds?.[0]) : null;
    if (!source || !center) {
      boardController.clearPreview();
      return true;
    }
    const len = Math.hypot(source.x - center.x, source.y - center.y);
    if (len < 1e-9) {
      boardController.clearPreview();
      return true;
    }
    const tx = -(source.y - center.y) / len;
    const ty = (source.x - center.x) / len;
    const vx = cursorCoords.x - source.x;
    const vy = cursorCoords.y - source.y;
    const signed = vx * tx + vy * ty;
    const side = signed >= 0 ? 1 : -1;
    const dist = Math.max(0.2, Math.abs(signed));
    session.tangentAtPointPlacement.side = side;
    session.tangentAtPointPlacement.distance = dist;
    boardController.showPreviewLinear(
      { x: source.x, y: source.y },
      { x: source.x + tx * dist * side, y: source.y + ty * dist * side },
      "segment"
    );
    return true;
  }

  function commitTangentAtPointPlacement(cursorCoords) {
    if (!session.tangentAtPointPlacement) {
      return false;
    }
    updateTangentAtPointPreview(cursorCoords);
    const placement = session.tangentAtPointPlacement;
    session.tangentAtPointPlacement = null;
    boardController.clearPreview();
    const { sourcePointId, circleId, side, distance } = placement;
    const source = getPointById(sourcePointId);
    const circleObj = getObjectById(circleId);
    const center = circleObj ? getPointById(circleObj.pointIds?.[0]) : null;
    if (!source || !center) {
      updateModeUi();
      return true;
    }
    const endPos = computeTangentAtPointPosition(source, center, side, distance);
    if (!endPos) {
      updateModeUi();
      return true;
    }
    runMutation("tangent-at-circle-point", () => {
      const endId = makeId("pt");
      addObject({
        id: endId,
        type: "point",
        x: endPos.x,
        y: endPos.y,
        name: "",
        constraint: {
          kind: "tangentAtPointEndpoint",
          sourcePointId,
          circleId,
          side: side >= 0 ? 1 : -1,
          distance: Math.max(0.2, Number(distance) || 1),
        },
        style: { ...defaultStyle(), fixed: false },
      });
      const segId = makeId("taps");
      addObject({
        id: segId,
        type: "segment",
        pointIds: [sourcePointId, endId],
        style: { ...defaultStyle(), dash: 0, fixed: true },
      });
      store.clearSelection();
    });
    updateModeUi();
    return true;
  }

  function addTangentAtCirclePoint(options = {}) {
    const quiet = !!options.quiet;
    const selectedPoints = selectedOfTypes(["point"]);
    const selectedCircles = selectedOfTypes(["circle"]);
    if (selectedPoints.length !== 1 || selectedCircles.length !== 1) {
      if (!quiet) {
        showNotice("Select exactly one point and one circle.");
        setMode(ToolMode.SELECT);
      }
      return false;
    }
    const sourcePointId = selectedPoints[0];
    const circleId = selectedCircles[0];
    const source = getPointById(sourcePointId);
    const circleObj = getObjectById(circleId);
    const center = circleObj ? getPointById(circleObj.pointIds?.[0]) : null;
    const through = circleObj ? getPointById(circleObj.pointIds?.[1]) : null;
    if (!source || !center || !through) {
      if (!quiet) {
        showNotice("Could not find circle geometry.");
        setMode(ToolMode.SELECT);
      }
      return false;
    }
    const r = Math.hypot(through.x - center.x, through.y - center.y);
    const distToCenter = Math.hypot(source.x - center.x, source.y - center.y);
    if (distToCenter < 1e-9) {
      if (!quiet) {
        showNotice("Point cannot be the circle's center.");
        setMode(ToolMode.SELECT);
      }
      return false;
    }
    const initialDist = Math.max(0.6, r * 0.45);
    session.tangentAtPointPlacement = {
      sourcePointId,
      circleId,
      side: 1,
      distance: initialDist,
      buttonId: options.buttonId || null,
    };
    statusEl.textContent = "Mode: Tangent at Point (move cursor, click to place segment)";
    renderCurrentDoc(false);
    return true;
  }

  function launchTangentAtCirclePoint(buttonId) {
    if (addTangentAtCirclePoint({ quiet: true, buttonId })) {
      updateModeUi();
      return;
    }
    startConstructionSelectionSession({
      kind: "tangent-at-circle-point",
      label: "Tangent at Pt on Circle",
      buttonId,
      instructions: "Select exactly one point and one circle.",
      tryCreate: () => addTangentAtCirclePoint({ quiet: true, buttonId }),
    });
  }

  return {
    showTangentPickGhosts,
    updateTangentPickPreview,
    finalizeTangentPickSession,
    handleTangentPickBoardClick,
    updateTangentAtPointPreview,
    commitTangentAtPointPlacement,
    launchTangentToCircle,
    launchTangentAtCirclePoint,
  };
}
