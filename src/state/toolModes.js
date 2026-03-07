export const ToolMode = Object.freeze({
  SELECT: "select",
  POINT: "point",
  SEGMENT: "segment",
  LINE: "line",
  RAY: "ray",
  TRIANGLE: "triangle",
  CIRCLE: "circle",
  ANGLE: "angle",
  ARC_3PT: "arc-3pt",
  ARC_CSE: "arc-cse",
  CONGRUENCY: "congruency",
  ADD_LABEL: "add-label",
  LABEL: "label",
  DELETE: "delete",
});

export function isToolMode(value) {
  return Object.values(ToolMode).includes(value);
}
