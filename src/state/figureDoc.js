import { makeId } from "../utils/ids.js";

export const FIGURE_DOC_VERSION = 1;

export function createEmptyFigureDoc() {
  return {
    version: FIGURE_DOC_VERSION,
    canvas: {
      width: 800,
      height: 600,
      background: "transparent",
      backgroundImage: null,
    },
    objects: [],
    annotations: [],
    styles: {
      defaultStrokeColor: "#000000",
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

export function serializeFigureDocPackage(doc, backgroundImageAssets = {}) {
  return {
    version: FIGURE_DOC_VERSION,
    doc,
    backgroundImageAssets,
  };
}

export function normalizeImportedFigureDoc(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid document format.");
  }

  const doc = input.doc || input.figureDoc || input;
  const backgroundImageAssets = { ...(input.backgroundImageAssets || {}) };
  const backgroundImage = doc?.canvas?.backgroundImage;

  if (backgroundImage?.src && !backgroundImage.assetId) {
    const assetId = makeId("bg");
    backgroundImageAssets[assetId] = backgroundImage.src;
    doc.canvas.backgroundImage = {
      ...backgroundImage,
      assetId,
    };
    delete doc.canvas.backgroundImage.src;
  }

  return {
    doc,
    backgroundImageAssets,
  };
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

  const ids = new Set();
  input.objects.forEach((obj, index) => {
    if (!obj || typeof obj !== "object") {
      throw new Error(`Object #${index + 1} is not an object.`);
    }
    if (typeof obj.id !== "string" || !obj.id) {
      throw new Error(`Object #${index + 1} is missing an id.`);
    }
    if (typeof obj.type !== "string" || !obj.type) {
      throw new Error(`Object "${obj.id}" is missing a type.`);
    }
    if (ids.has(obj.id)) {
      throw new Error(`Duplicate object id "${obj.id}".`);
    }
    ids.add(obj.id);
    if (obj.type === "point" && (!Number.isFinite(obj.x) || !Number.isFinite(obj.y))) {
      throw new Error(`Point "${obj.id}" is missing numeric x/y coordinates.`);
    }
    if (obj.pointIds !== undefined && !Array.isArray(obj.pointIds)) {
      throw new Error(`Object "${obj.id}" has a non-array pointIds field.`);
    }
  });

  for (const obj of input.objects) {
    for (const refId of obj.pointIds || []) {
      if (!ids.has(refId)) {
        throw new Error(`Object "${obj.id}" references missing point "${refId}".`);
      }
    }
  }

  input.annotations.forEach((ann, index) => {
    if (!ann || typeof ann !== "object" || typeof ann.id !== "string" || !ann.id) {
      throw new Error(`Annotation #${index + 1} is malformed.`);
    }
  });

  return true;
}
