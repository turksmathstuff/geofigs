import test from "node:test";
import assert from "node:assert/strict";

import {
  createEmptyFigureDoc,
  normalizeImportedFigureDoc,
  serializeFigureDocPackage,
} from "../src/state/figureDoc.js";
import { resetIds } from "../src/utils/ids.js";

test("normalizeImportedFigureDoc moves background image data out of the doc", () => {
  resetIds();

  const doc = createEmptyFigureDoc();
  doc.canvas.backgroundImage = {
    src: "data:image/png;base64,abc123",
    naturalWidth: 640,
    naturalHeight: 480,
    opacity: 1,
    x: 0,
    y: 0,
    width: 10,
    height: 8,
  };

  const { doc: normalizedDoc, backgroundImageAssets } = normalizeImportedFigureDoc(doc);
  const backgroundImage = normalizedDoc.canvas.backgroundImage;

  assert.ok(backgroundImage.assetId.startsWith("bg_"));
  assert.equal(backgroundImage.src, undefined);
  assert.equal(backgroundImageAssets[backgroundImage.assetId], "data:image/png;base64,abc123");

  const pkg = serializeFigureDocPackage(normalizedDoc, backgroundImageAssets);
  assert.equal(pkg.doc.canvas.backgroundImage.assetId, backgroundImage.assetId);
  assert.equal(pkg.backgroundImageAssets[backgroundImage.assetId], "data:image/png;base64,abc123");
});

test("background image save and reopen round-trip preserves the asset", () => {
  resetIds();

  const doc = createEmptyFigureDoc();
  doc.canvas.backgroundImage = {
    assetId: "bg_000001",
    naturalWidth: 1024,
    naturalHeight: 768,
    opacity: 1,
    x: -4,
    y: -3,
    width: 8,
    height: 6,
  };
  const packageDoc = serializeFigureDocPackage(doc, {
    bg_000001: "data:image/png;base64,roundtrip",
  });

  const savedText = JSON.stringify(packageDoc);
  const reopened = normalizeImportedFigureDoc(JSON.parse(savedText));

  assert.equal(reopened.doc.canvas.backgroundImage.assetId, "bg_000001");
  assert.equal(reopened.doc.canvas.backgroundImage.src, undefined);
  assert.equal(reopened.backgroundImageAssets.bg_000001, "data:image/png;base64,roundtrip");
});
