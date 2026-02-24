export function syncStyleInputsFromDoc({ store, doc }) {
  const styles = store.doc.styles || {};
  const strokeColorEl = doc.getElementById("strokeColor");
  const strokeWidthEl = doc.getElementById("strokeWidth");
  const lineStyleEl = doc.getElementById("lineStyle");
  const examModeEl = doc.getElementById("examMode");
  if (strokeColorEl && styles.defaultStrokeColor) {
    strokeColorEl.value = styles.defaultStrokeColor;
  }
  if (strokeWidthEl && Number.isFinite(styles.defaultStrokeWidth)) {
    strokeWidthEl.value = String(styles.defaultStrokeWidth);
  }
  if (lineStyleEl) {
    lineStyleEl.value = Number(styles.defaultDash) ? "dashed" : "solid";
  }
  if (examModeEl) {
    examModeEl.checked = !!styles.examMode;
  }
}
