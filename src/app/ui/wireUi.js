function bindModeButtons({ dom, setMode, setTriangleMode }) {
  const { modeButtons, triangleMenuPanel, triangleModeButtons } = dom;
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });
  if (!triangleModeButtons?.length) {
    return;
  }
  triangleModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setTriangleMode(btn.dataset.triangleMode);
    });
  });
}

function bindConstructionButtons({
  doc,
  launchSegmentTicks,
  launchMidpoint,
  launchPerpendicularBisectorVariant,
  launchAngleBisector,
  launchRegularPolygonVariant,
  launchParallelMarks,
  launchSideMeasure,
  launchAngleMeasure,
  toggleManualLabelMode,
  autoLabelPoints,
  launchParallelOrPerpendicular,
  launchTriangleCopy,
  launchTriangleTransform,
}) {
  doc.getElementById("markTick1").addEventListener("click", () => launchSegmentTicks(1, "markTick1"));
  doc.getElementById("markTick2").addEventListener("click", () => launchSegmentTicks(2, "markTick2"));
  doc.getElementById("markTick3").addEventListener("click", () => launchSegmentTicks(3, "markTick3"));
  doc.getElementById("makeMidpoint").addEventListener("click", () => launchMidpoint(0, "makeMidpoint"));
  doc.getElementById("makeMidpointTick1").addEventListener("click", () => launchMidpoint(1, "makeMidpointTick1"));
  doc.getElementById("makeMidpointTick2").addEventListener("click", () => launchMidpoint(2, "makeMidpointTick2"));
  doc.getElementById("makeMidpointTick3").addEventListener("click", () => launchMidpoint(3, "makeMidpointTick3"));
  doc.getElementById("makePerpBisector").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({ variantLabel: "", buttonId: "makePerpBisector" })
  );
  doc.getElementById("makePerpBisectorRA").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({ withRightAngle: true, variantLabel: "-right", buttonId: "makePerpBisectorRA" })
  );
  doc.getElementById("makePerpBisectorTicks").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({ withMidpointTicks: true, variantLabel: "-ticks", buttonId: "makePerpBisectorTicks" })
  );
  doc.getElementById("makePerpBisectorBoth").addEventListener("click", () =>
    launchPerpendicularBisectorVariant({
      withRightAngle: true,
      withMidpointTicks: true,
      variantLabel: "-both",
      buttonId: "makePerpBisectorBoth",
    })
  );
  doc.getElementById("makeAngleBisector").addEventListener("click", () => launchAngleBisector(0, "makeAngleBisector"));
  doc.getElementById("makeAngleBisectorTick1").addEventListener("click", () => launchAngleBisector(1, "makeAngleBisectorTick1"));
  doc.getElementById("makeAngleBisectorTick2").addEventListener("click", () => launchAngleBisector(2, "makeAngleBisectorTick2"));
  doc.getElementById("makeAngleBisectorTick3").addEventListener("click", () => launchAngleBisector(3, "makeAngleBisectorTick3"));
  doc.getElementById("makeRegularPolygonPlain").addEventListener("click", () =>
    launchRegularPolygonVariant({ buttonId: "makeRegularPolygonPlain" })
  );
  doc.getElementById("makeRegularPolygonTicks").addEventListener("click", () =>
    launchRegularPolygonVariant({ withTickMarks: true, buttonId: "makeRegularPolygonTicks" })
  );
  doc.getElementById("makeRegularPolygonArcTicks").addEventListener("click", () =>
    launchRegularPolygonVariant({ withSingleTickArcs: true, buttonId: "makeRegularPolygonArcTicks" })
  );
  doc.getElementById("makeRegularPolygonPlainCenter").addEventListener("click", () =>
    launchRegularPolygonVariant({ withCenter: true, buttonId: "makeRegularPolygonPlainCenter" })
  );
  doc.getElementById("makeRegularPolygonTicksCenter").addEventListener("click", () =>
    launchRegularPolygonVariant({
      withTickMarks: true,
      withCenter: true,
      buttonId: "makeRegularPolygonTicksCenter",
    })
  );
  doc.getElementById("makeRegularPolygonArcTicksCenter").addEventListener("click", () =>
    launchRegularPolygonVariant({
      withSingleTickArcs: true,
      withCenter: true,
      buttonId: "makeRegularPolygonArcTicksCenter",
    })
  );
  doc.getElementById("markParallel1").addEventListener("click", () => launchParallelMarks(1, "markParallel1"));
  doc.getElementById("markParallel2").addEventListener("click", () => launchParallelMarks(2, "markParallel2"));
  doc.getElementById("markParallel3").addEventListener("click", () => launchParallelMarks(3, "markParallel3"));
  doc.getElementById("addSideMeasure").addEventListener("click", () => launchSideMeasure("addSideMeasure"));
  doc.getElementById("addAngleMeasure").addEventListener("click", () => launchAngleMeasure("addAngleMeasure"));

  doc.getElementById("addLabel").addEventListener("click", toggleManualLabelMode);
  doc.getElementById("autoLabel").addEventListener("click", autoLabelPoints);

  doc.getElementById("makeParallel").addEventListener("click", () => launchParallelOrPerpendicular("parallel", "makeParallel"));
  doc.getElementById("makePerpendicular").addEventListener("click", () => launchParallelOrPerpendicular("perpendicular", "makePerpendicular"));
  doc.getElementById("makeCongruentTriangle").addEventListener("click", () =>
    launchTriangleCopy("congruent", "makeCongruentTriangle")
  );
  doc.getElementById("makeSimilarTriangle").addEventListener("click", () =>
    launchTriangleCopy("similar", "makeSimilarTriangle")
  );
  doc.getElementById("transformSelectedTriangle").addEventListener("click", () =>
    launchTriangleTransform("transformSelectedTriangle")
  );
}

function bindAngleMarkButtons({ dom, doc, session, ToolMode, setMode, setActiveAngleMarkPreset, addAngleFromSelection }) {
  const { angleMarkPresetButtons } = dom;
  angleMarkPresetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveAngleMarkPreset(btn.dataset.angleMark);
    });
  });

  doc.getElementById("markRightAngle").addEventListener("click", () => {
    if (!addAngleFromSelection(true, 1)) {
      session.pendingAngleIsRight = true;
      session.pendingAngleDecorator = "arc";
      session.pendingAngleArcCount = 1;
      session.activeAngleMarkPresetValue = null;
      setMode(ToolMode.ANGLE);
    }
  });
}

function bindTransformControls({
  dom,
  doc,
  win,
  session,
  cancelTransformSession,
  commitTransformSession,
  applyTransformPreview,
  updateMoveReadouts,
  angleFromCompassEvent,
  updateCompassReadout,
}) {
  const { moveXSliderEl, moveYSliderEl, rotationCompassEl } = dom;

  doc.getElementById("cancelTransformTriangle").addEventListener("click", cancelTransformSession);
  doc.getElementById("applyTransformTriangle").addEventListener("click", () => commitTransformSession("transform-selected-triangle"));
  doc.getElementById("reflectHorizontalTriangle").addEventListener("click", () => {
    if (!session.transformSession) {
      return;
    }
    session.transformSession.mirrorY *= -1;
    applyTransformPreview();
  });
  doc.getElementById("reflectVerticalTriangle").addEventListener("click", () => {
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

  win.addEventListener("mousemove", (evt) => {
    if (!session.compassDragging || !session.transformSession) {
      return;
    }
    session.transformSession.angleDeg = angleFromCompassEvent(evt);
    updateCompassReadout();
    applyTransformPreview();
  });

  win.addEventListener("mouseup", () => {
    if (!session.compassDragging) {
      return;
    }
    session.compassDragging = false;
    rotationCompassEl.classList.remove("dragging");
  });
}

function bindSelectionActions({
  doc,
  deleteSelected,
  hideSelected,
  showAllHidden,
  clearBoard,
  togglePointObjectsVisibility,
  toggleLineArrowsVisibility,
}) {
  doc.getElementById("deleteSelected").addEventListener("click", deleteSelected);
  doc.getElementById("hideSelected").addEventListener("click", hideSelected);
  doc.getElementById("showAll").addEventListener("click", showAllHidden);
  doc.getElementById("togglePointObjects").addEventListener("click", togglePointObjectsVisibility);
  doc.getElementById("toggleLineArrows").addEventListener("click", toggleLineArrowsVisibility);
  doc.getElementById("clearBoard").addEventListener("click", clearBoard);
}

function bindUndoRedoActions({ doc, store, renderCurrentDoc }) {
  doc.getElementById("undoBtn").addEventListener("click", () => {
    store.commandStack.undo();
    renderCurrentDoc();
  });

  doc.getElementById("redoBtn").addEventListener("click", () => {
    store.commandStack.redo();
    renderCurrentDoc();
  });
}

function bindExportActions({ doc, downloadSvg, downloadPng, previewExport }) {
  doc.getElementById("previewExportBtn").addEventListener("click", () => {
    previewExport().catch((err) => alert(err.message));
  });
  doc.getElementById("downloadSvg").addEventListener("click", () => {
    downloadSvg().catch((err) => alert(err.message));
  });
  doc.getElementById("downloadPng").addEventListener("click", () => {
    downloadPng().catch((err) => alert(err.message));
  });
  doc.getElementById("previewDownloadSvg").addEventListener("click", () => {
    downloadSvg().catch((err) => alert(err.message));
  });
  doc.getElementById("previewDownloadPng").addEventListener("click", () => {
    downloadPng().catch((err) => alert(err.message));
  });
  const closePreview = () => doc.getElementById("exportPreviewModal").setAttribute("hidden", "");
  doc.getElementById("closeExportPreview").addEventListener("click", closePreview);
  doc.getElementById("cancelExportPreview").addEventListener("click", closePreview);
  doc.getElementById("exportPreviewBackdrop").addEventListener("click", closePreview);
}

function bindFileActions({ doc, saveDoc, openDocFromFile }) {
  doc.getElementById("saveDoc").addEventListener("click", saveDoc);
  doc.getElementById("openDoc").addEventListener("change", (evt) => {
    const file = evt.target.files?.[0];
    if (file) {
      openDocFromFile(file);
    }
    evt.target.value = "";
  });
}

function bindStyleActions({ doc, store, applyStyleToSelection, runMutation }) {
  doc.getElementById("strokeColor").addEventListener("input", applyStyleToSelection);
  doc.getElementById("resetStrokeColor").addEventListener("click", () => {
    const colorInput = doc.getElementById("strokeColor");
    colorInput.value = "#000000";
    applyStyleToSelection();
  });
  doc.getElementById("strokeWidth").addEventListener("input", applyStyleToSelection);
  doc.getElementById("resetStrokeWidth").addEventListener("click", () => {
    const widthInput = doc.getElementById("strokeWidth");
    widthInput.value = "2";
    applyStyleToSelection();
  });
  doc.getElementById("lineStyle").addEventListener("change", applyStyleToSelection);
  doc.getElementById("examMode").addEventListener("change", (evt) => {
    runMutation("toggle-exam-mode", () => {
      store.doc.styles.examMode = evt.target.checked;
    });
  });
}

function bindKeyboardShortcuts({ win, store, session, setMode, ToolMode, renderCurrentDoc, deleteSelected, hideSelected }) {
  win.addEventListener(
    "keydown",
    (evt) => {
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
    },
    true
  );
}

export function wireUi(deps) {
  bindModeButtons(deps);
  bindConstructionButtons(deps);
  bindAngleMarkButtons(deps);
  bindTransformControls(deps);
  bindSelectionActions(deps);
  bindUndoRedoActions(deps);
  bindExportActions(deps);
  bindFileActions(deps);
  bindStyleActions(deps);
  bindKeyboardShortcuts(deps);
}
