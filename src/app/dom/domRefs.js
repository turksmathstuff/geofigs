export function createDomRefs(doc) {
  return {
    statusEl: doc.getElementById("statusText"),
    drawingHintEl: doc.getElementById("drawingHint"),
    autoLabelBtn: doc.getElementById("autoLabel"),
    boardEl: doc.getElementById("jxgbox"),
    transformPanelEl: doc.getElementById("transformPanel"),
    transformTitleEl: doc.getElementById("transformTitle"),
    moveXSliderEl: doc.getElementById("moveXSlider"),
    moveYSliderEl: doc.getElementById("moveYSlider"),
    moveXValueEl: doc.getElementById("moveXValue"),
    moveYValueEl: doc.getElementById("moveYValue"),
    rotationCompassEl: doc.getElementById("rotationCompass"),
    compassArmEl: doc.getElementById("compassArm"),
    rotateValueEl: doc.getElementById("rotateValue"),
    modeButtons: [...doc.querySelectorAll("button[data-mode]")],
    triangleMenuBtn: doc.getElementById("triangleMenuBtn"),
    triangleMenuPanel: doc.getElementById("triangleMenuPanel"),
    triangleModeButtons: [...doc.querySelectorAll("button[data-triangle-mode]")],
    angleMarkPresetButtons: [...doc.querySelectorAll("button[data-angle-mark]")],
  };
}
