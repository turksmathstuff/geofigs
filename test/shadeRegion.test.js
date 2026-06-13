import test from "node:test";
import assert from "node:assert/strict";

import { floodFill, traceContour, rdp } from "../src/app/workflows/shadeRegionFill.js";
import {
  createEmptyFigureDoc,
  cloneFigureDoc,
  validateFigureDoc,
} from "../src/state/figureDoc.js";

// Build a white image with optional black pixels, shaped like canvas ImageData.
function makeImage(w, h, blackPixels = []) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (const [x, y] of blackPixels) {
    const idx = (y * w + x) * 4;
    data[idx] = 0;
    data[idx + 1] = 0;
    data[idx + 2] = 0;
  }
  return { data };
}

// Square outline from (x0,y0) to (x1,y1) inclusive.
function squareOutline(x0, y0, x1, y1) {
  const px = [];
  for (let x = x0; x <= x1; x++) {
    px.push([x, y0], [x, y1]);
  }
  for (let y = y0 + 1; y < y1; y++) {
    px.push([x0, y], [x1, y]);
  }
  return px;
}

test("floodFill fills the interior of a closed outline", () => {
  const w = 20, h = 20;
  const img = makeImage(w, h, squareOutline(5, 5, 14, 14));
  const filled = floodFill(img, 10, 10, w, h);
  assert.ok(filled, "expected a filled region");

  let count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (filled[y * w + x]) {
        count++;
        assert.ok(x > 5 && x < 14 && y > 5 && y < 14, `pixel (${x},${y}) escaped the outline`);
      }
    }
  }
  // Interior is 8x8 (coords 6..13)
  assert.equal(count, 64);
});

test("floodFill returns null when the region is open (reaches the canvas edge)", () => {
  const w = 20, h = 20;
  const img = makeImage(w, h, squareOutline(5, 5, 14, 14));
  assert.equal(floodFill(img, 2, 2, w, h), null);
});

test("floodFill returns null when clicking on a stroke", () => {
  const w = 20, h = 20;
  const img = makeImage(w, h, squareOutline(5, 5, 14, 14));
  assert.equal(floodFill(img, 5, 5, w, h), null);
});

test("floodFill leaks through a gap in the outline and returns null", () => {
  const w = 20, h = 20;
  const outline = squareOutline(5, 5, 14, 14).filter(([x, y]) => !(x === 10 && y === 5));
  const img = makeImage(w, h, outline);
  assert.equal(floodFill(img, 10, 10, w, h), null);
});

test("traceContour walks the perimeter of a filled block", () => {
  const w = 20, h = 20;
  const filled = new Uint8Array(w * h);
  for (let y = 6; y <= 13; y++) {
    for (let x = 6; x <= 13; x++) {
      filled[y * w + x] = 1;
    }
  }
  const contour = traceContour(filled, w, h);
  assert.ok(contour.length >= 4, "contour should have at least the corners");
  for (const [x, y] of contour) {
    const onPerimeter = x === 6 || x === 13 || y === 6 || y === 13;
    assert.ok(onPerimeter, `contour point (${x},${y}) is not on the block perimeter`);
  }
  const has = (px, py) => contour.some(([x, y]) => x === px && y === py);
  assert.ok(has(6, 6) && has(13, 6) && has(13, 13) && has(6, 13), "missing a corner");
});

test("traceContour follows a concave (arc-shaped) boundary instead of its convex hull", () => {
  // Mimics the failing figure: a square corner region bounded by two straight
  // edges and a circular arc that bulges *into* the region (concave boundary).
  // The contour walk must round the sharp corner where the arc meets an edge —
  // which requires revisiting a pixel — rather than cutting straight across.
  const w = 60, h = 60;
  const cxC = 5, cyC = 5, r = 49; // circle centred at one corner
  const filled = new Uint8Array(w * h);
  for (let y = 5; y <= 54; y++) {
    for (let x = 5; x <= 54; x++) {
      // far-corner region: inside the box but outside the quarter circle
      if (Math.hypot(x - cxC, y - cyC) > r) filled[y * w + x] = 1;
    }
  }
  const contour = traceContour(filled, w, h);

  // The contour must reach the far corner (~54,54) and trace the arc back, not
  // collapse to the straight chord between the arc's endpoints.
  const simplified = rdp(contour, 1.5);
  assert.ok(
    simplified.length >= 5,
    `expected the arc edge to survive simplification, got ${simplified.length} points`
  );
  const reachesFarCorner = contour.some(([x, y]) => x >= 52 && y >= 52);
  assert.ok(reachesFarCorner, "contour never reached the far corner");
  // A point well off the chord between the two straight-edge ends proves the
  // curved side was traced (the bug returned a 3-point triangle / its hull).
  const midArc = contour.some(([x, y]) => x > 25 && x < 50 && y > 25 && y < 50);
  assert.ok(midArc, "contour skipped the concave arc (traced the convex hull)");
});

test("rdp collapses collinear points and keeps corners", () => {
  const line = [[0, 0], [1, 0.1], [2, -0.1], [3, 0], [4, 0.05], [5, 0]];
  assert.deepEqual(rdp(line, 1), [[0, 0], [5, 0]]);

  const lShape = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]];
  assert.deepEqual(rdp(lShape, 1), [[0, 0], [10, 0], [10, 10]]);
});

test("shade-region objects survive a save/load round-trip", () => {
  const doc = createEmptyFigureDoc();
  doc.objects.push({
    id: "shade_1",
    type: "shade-region",
    pathPoints: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }],
    linkedPointIds: ["p_1", "p_2"],
    linkedPointPositions: [{ x: 0, y: 0 }, { x: 4, y: 0 }],
    marker: { x: 2, y: 1 },
    style: { fillColor: "#fde047", fillOpacity: 0.4, strokeWidth: 0 },
  });

  const reloaded = JSON.parse(JSON.stringify(cloneFigureDoc(doc)));
  assert.ok(validateFigureDoc(reloaded));
  assert.deepEqual(reloaded.objects, doc.objects);
});
