export const FIGURE_DOC_VERSION = 1;

export function createEmptyFigureDoc() {
  return {
    version: FIGURE_DOC_VERSION,
    canvas: {
      width: 800,
      height: 600,
      background: "transparent",
    },
    objects: [],
    annotations: [],
    styles: {
      defaultStrokeColor: "#111111",
      defaultStrokeWidth: 2,
      defaultDash: 0,
      rayExtension: 4,
      lineExtensionStart: 4,
      lineExtensionEnd: 4,
      fontSize: 20,
      fontFamily: "Segoe UI, Arial, sans-serif",
      examMode: false,
    },
    metadata: {
      title: "Untitled Figure",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function cloneFigureDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

export function validateFigureDoc(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid document format.");
  }
  if (input.version !== FIGURE_DOC_VERSION) {
    throw new Error(
      `Unsupported document version ${input.version}. Expected ${FIGURE_DOC_VERSION}.`
    );
  }
  if (!Array.isArray(input.objects) || !Array.isArray(input.annotations)) {
    throw new Error("Document is missing objects or annotations arrays.");
  }
  return true;
}
