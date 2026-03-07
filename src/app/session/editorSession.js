import { ToolMode } from "../../state/toolModes.js";

export function createEditorSession() {
  return {
    currentMode: ToolMode.SELECT,
    pendingPointIds: [],
    pendingAngleIsRight: false,
    pendingAngleArcCount: 1,
    pendingAngleDecorator: "arc",
    activeAngleMarkPresetValue: null,
    triangleVariant: "three-point",
    showPointObjects: true,
    showLineArrows: true,
    pendingRightTriangleForceIso: false,
    marqueeState: null,
    transformSession: null,
    compassDragging: false,
    perpendicularBisectorPlacement: null,
    constructionSelectionSession: null,
    tangentPickState: null,
    transientDragSnapshots: new Map(),
    exportPointHighlightsBlack: false,
  };
}
