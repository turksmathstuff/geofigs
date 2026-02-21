export const ToolMode = Object.freeze({
  SELECT: "select",
  POINT: "point",
  SEGMENT: "segment",
  LINE: "line",
  RAY: "ray",
  TRIANGLE: "triangle",
  CIRCLE: "circle",
  ANGLE: "angle",
  CONGRUENCY: "congruency",
  LABEL: "label",
  DELETE: "delete",
});

export function isToolMode(value) {
  return Object.values(ToolMode).includes(value);
}
