/**
 * Shade Region flood fill pipeline.
 *
 * Given a click position in JSXGraph user coords and the board, this module:
 *   1. Serialises the board SVG to an off-screen canvas
 *   2. BFS flood-fills from the clicked pixel
 *   3. Traces the boundary contour (Moore neighbourhood walk)
 *   4. Simplifies the contour (Ramer–Douglas–Peucker)
 *   5. Converts the simplified pixels back to user coords
 *   6. Identifies document points near the contour (for auto-delete linking)
 *
 * Returns a Promise that resolves to
 *   { pathPoints, linkedPointIds, linkedPointPositions }
 * or null if the fill hit the board edge without enclosing a region.
 */

const BG_THRESHOLD = 200; // pixel is "background" if mean channel > this
const RDP_EPSILON = 2;     // canvas pixels
const SNAP_RADIUS_USER = 0.5; // user-coord units for linking doc points
// Rasterise at 2x so anti-aliased thin/diagonal strokes don't leave
// background-coloured gaps the fill can leak through.
const RASTER_SCALE = 2;

// ─── Coordinate helpers ───────────────────────────────────────────────────────
// Canvas is the board element scaled by RASTER_SCALE, so user↔canvas conversion
// goes through JSXGraph screen coords times that factor.

function userToCanvas(userX, userY, board) {
  const sc = new JXG.Coords(JXG.COORDS_BY_USER, [userX, userY], board).scrCoords;
  // scrCoords are [w, sx, sy] where sx/sy are pixels from the board top-left
  return { cx: sc[1] * RASTER_SCALE, cy: sc[2] * RASTER_SCALE };
}

function canvasToUser(cx, cy, board) {
  const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, [cx / RASTER_SCALE, cy / RASTER_SCALE], board);
  return { x: c.usrCoords[1], y: c.usrCoords[2] };
}

// ─── BFS flood fill ───────────────────────────────────────────────────────────
// floodFill/traceContour/rdp are exported for unit testing; they are pure and
// have no DOM dependencies.

export function floodFill(imageData, startX, startY, w, h) {
  const data = imageData.data;
  const filled = new Uint8Array(w * h);

  function isBackground(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const idx = (y * w + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return (r + g + b) / 3 > BG_THRESHOLD;
  }

  const sx = Math.round(startX);
  const sy = Math.round(startY);
  if (!isBackground(sx, sy)) return null; // clicked on a stroke

  const queue = [[sx, sy]];
  filled[sy * w + sx] = 1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let hitEdge = false;

  while (queue.length) {
    const [x, y] = queue.pop();
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
      hitEdge = true;
    }
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (filled[ny * w + nx]) continue;
      if (isBackground(nx, ny)) {
        filled[ny * w + nx] = 1;
        queue.push([nx, ny]);
      }
    }
  }

  if (hitEdge) return null; // open region – no closed boundary
  return filled;
}

// ─── Contour tracing (Moore neighbourhood walk) ───────────────────────────────

const MOORE_DIRS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

export function traceContour(filled, w, h) {
  // Find the topmost filled pixel as the start
  let startX = -1, startY = -1;
  outer:
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (filled[y * w + x]) { startX = x; startY = y; break outer; }
    }
  }
  if (startX < 0) return [];

  const contour = [];
  let cx = startX, cy = startY;
  // entryDir points back at the previous boundary pixel. The start pixel is
  // topmost(-leftmost), so the pixel above it is guaranteed background and we
  // pretend we arrived from there (dir 6 = up).
  let entryDir = 6;

  // Jacob's stopping criterion: terminate only when we re-enter the start pixel
  // heading toward the same neighbour we first stepped to. A naive "stop on any
  // revisited pixel" check breaks early on concave regions, where the contour
  // legitimately passes a pixel twice (e.g. rounding a sharp corner where an arc
  // meets an edge) — that left such regions traced as their convex hull.
  let secondX = -1, secondY = -1;
  const maxSteps = w * h * 4;
  let steps = 0;

  contour.push([cx, cy]);
  while (steps++ < maxSteps) {
    // Radial sweep: scan clockwise starting just past the backtrack direction,
    // so the previous pixel is checked last (only revisited at a dead end).
    let checkDir = (entryDir + 1) % 8;
    let found = false;
    let nx = -1, ny = -1, nd = -1;
    for (let i = 0; i < 8; i++) {
      const d = (checkDir + i) % 8;
      const [dx, dy] = MOORE_DIRS[d];
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx >= 0 && ty >= 0 && tx < w && ty < h && filled[ty * w + tx]) {
        nx = tx; ny = ty; nd = (d + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break; // isolated start pixel
    if (cx === startX && cy === startY) {
      if (secondX < 0) {
        secondX = nx; secondY = ny;
      } else if (nx === secondX && ny === secondY) {
        break; // back at start, repeating the first step — contour closed
      }
    }
    cx = nx; cy = ny; entryDir = nd;
    contour.push([cx, cy]);
  }

  return contour;
}

// ─── Ramer–Douglas–Peucker ────────────────────────────────────────────────────

function perpendicularDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

export function rdp(points, epsilon) {
  if (points.length <= 2) return points.slice();
  let maxDist = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; idx = i; }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {{ x: number, y: number }} clickCoords - user coords of click
 * @param {object} board - JSXGraph board
 * @param {HTMLElement} boardEl - the board container element
 * @param {Array} docObjects - store.doc.objects (for linking points)
 * @returns {Promise<{pathPoints, linkedPointIds, linkedPointPositions} | null>}
 */
export function launchShadeRegionFill(clickCoords, board, boardEl, docObjects) {
  return new Promise((resolve) => {
    // 1. Serialise SVG to a blob URL
    const svgEl = boardEl.querySelector("svg");
    if (!svgEl) { resolve(null); return; }

    // Fill walls are geometry strokes only: drop the background image (it would
    // make every pixel read as foreground) and any existing shade fills/markers
    // (their translucent pixels sit near BG_THRESHOLD and make fills flaky).
    //
    // Also drop any <foreignObject> (JSXGraph keeps an empty placeholder one):
    // an SVG containing a foreignObject taints the canvas when drawn via <img>,
    // which makes getImageData throw and the whole fill silently fail.
    const svgClone = svgEl.cloneNode(true);
    svgClone
      .querySelectorAll(
        "[data-geo-background-image-id], [data-geo-shade-id], [data-geo-shade-marker-id], foreignObject"
      )
      .forEach((node) => node.remove());

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      try {
        // 2. Draw to an off-screen canvas at RASTER_SCALE times the board size.
        const canvasW = boardEl.offsetWidth * RASTER_SCALE;
        const canvasH = boardEl.offsetHeight * RASTER_SCALE;
        const canvas = document.createElement("canvas");
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(img, 0, 0, canvasW, canvasH);

        // getImageData throws if the canvas is tainted (e.g. an SVG <image> or
        // <foreignObject> that drawImage marks cross-origin). Treat any such
        // failure as "couldn't fill" rather than letting it hang the tool.
        const imageData = ctx.getImageData(0, 0, canvasW, canvasH);

        // 3. Convert click coords to canvas pixel coords
        const { cx: startCx, cy: startCy } = userToCanvas(clickCoords.x, clickCoords.y, board);

        // 4. BFS flood fill
        const filled = floodFill(imageData, startCx, startCy, canvasW, canvasH);
        if (!filled) { resolve(null); return; }

        // 5. Trace contour
        const contour = traceContour(filled, canvasW, canvasH);
        if (contour.length < 3) { resolve(null); return; }

        // 6. RDP simplify
        const simplified = rdp(contour, RDP_EPSILON);
        if (simplified.length < 3) { resolve(null); return; }

        // 7. Convert back to user coords
        const pathPoints = simplified.map(([px, py]) => canvasToUser(px, py, board));

        // 8. Find doc points near the contour for auto-delete linking
        const linkedPointIds = [];
        const linkedPointPositions = [];
        const docPoints = docObjects.filter((o) => o.type === "point" && !o.ghostVertex);

        for (const pt of docPoints) {
          // Check if this point is near any contour pixel (converted to user coords)
          // We do a quick check: is the point within SNAP_RADIUS_USER of any pathPoint?
          let nearest = Infinity;
          for (const pp of pathPoints) {
            const d = Math.hypot(pt.x - pp.x, pt.y - pp.y);
            if (d < nearest) nearest = d;
          }
          if (nearest < SNAP_RADIUS_USER) {
            linkedPointIds.push(pt.id);
            linkedPointPositions.push({ x: pt.x, y: pt.y });
          }
        }

        resolve({ pathPoints, linkedPointIds, linkedPointPositions });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}
