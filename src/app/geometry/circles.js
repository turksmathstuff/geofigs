export function computeCircumcenter(p1, p2, p3) {
  const ax = p1.x, ay = p1.y, bx = p2.x, by = p2.y, cx = p3.x, cy = p3.y;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(D) < 1e-12) {
    return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3 };
  }
  const ux =
    ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
  return { x: ux, y: uy };
}

export function computeIncenter(p1, p2, p3) {
  const a = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  const b = Math.hypot(p1.x - p3.x, p1.y - p3.y);
  const c = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const sum = a + b + c;
  if (sum < 1e-12) return { x: p1.x, y: p1.y };
  return {
    x: (a * p1.x + b * p2.x + c * p3.x) / sum,
    y: (a * p1.y + b * p2.y + c * p3.y) / sum,
  };
}

export function computeInradius(p1, p2, p3) {
  const a = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  const b = Math.hypot(p1.x - p3.x, p1.y - p3.y);
  const c = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const s = (a + b + c) / 2;
  if (s < 1e-12) return 0;
  const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;
  return area / s;
}

// Returns true if the arc from p1 to p3 (counterclockwise) does NOT pass through p2,
// meaning the arc needs its endpoints swapped to correctly draw through p2.
export function arc3ptNeedsSwap(p1, p2, p3) {
  const center = computeCircumcenter(p1, p2, p3);
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const t1 = norm(Math.atan2(p1.y - center.y, p1.x - center.x));
  const t2 = norm(Math.atan2(p2.y - center.y, p2.x - center.x));
  const t3 = norm(Math.atan2(p3.y - center.y, p3.x - center.x));
  const span13CCW = norm(t3 - t1);
  const t2rel = norm(t2 - t1);
  // If p2 is NOT within the CCW arc from p1 to p3, we need to swap
  return t2rel >= span13CCW;
}

// Returns true if the CCW arc from angleStart to angleCursor (around center) is the
// major arc (span > π), i.e. should swap start/end to render the minor side.
export function arcCSENeedsSwap(centerX, centerY, startX, startY, cursorX, cursorY) {
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const tStart = norm(Math.atan2(startY - centerY, startX - centerX));
  const tCursor = norm(Math.atan2(cursorY - centerY, cursorX - centerX));
  const spanCCW = norm(tCursor - tStart);
  return spanCCW > Math.PI;
}
