export function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function intersectInfiniteLines(l1, l2) {
  const x1 = l1.a.x;
  const y1 = l1.a.y;
  const x2 = l1.b.x;
  const y2 = l1.b.y;
  const x3 = l2.a.x;
  const y3 = l2.a.y;
  const x4 = l2.b.x;
  const y4 = l2.b.y;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) {
    return null;
  }
  const cross1 = x1 * y2 - y1 * x2;
  const cross2 = x3 * y4 - y3 * x4;
  const px = (cross1 * (x3 - x4) - (x1 - x2) * cross2) / den;
  const py = (cross1 * (y3 - y4) - (y1 - y2) * cross2) / den;
  return { x: px, y: py };
}

export function pointFitsLinearDef(pt, def) {
  const ax = def.a.x;
  const ay = def.a.y;
  const bx = def.b.x;
  const by = def.b.y;
  const vx = bx - ax;
  const vy = by - ay;
  const wx = pt.x - ax;
  const wy = pt.y - ay;
  const vLen2 = vx * vx + vy * vy;
  if (vLen2 < 1e-12) {
    return false;
  }
  const t = (wx * vx + wy * vy) / vLen2;
  if (def.kind === "segment") {
    return t >= -1e-6 && t <= 1 + 1e-6;
  }
  if (def.kind === "ray") {
    return t >= -1e-6;
  }
  return true;
}

export function pointFitsIntersectionDef(pt, def) {
  if (!def) {
    return false;
  }
  if (def.kind === "circle") {
    const d = distance(pt, def.center);
    return Math.abs(d - def.radius) <= 1e-4;
  }
  return pointFitsLinearDef(pt, def);
}

export function nearestPointOnLinearDef(rawPoint, def) {
  if (!rawPoint || !def || !def.a || !def.b) {
    return null;
  }
  const ax = def.a.x;
  const ay = def.a.y;
  const bx = def.b.x;
  const by = def.b.y;
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-12) {
    return null;
  }
  const wx = rawPoint.x - ax;
  const wy = rawPoint.y - ay;
  let t = (wx * vx + wy * vy) / len2;
  if (def.kind === "segment") {
    t = Math.max(0, Math.min(1, t));
  } else if (def.kind === "ray") {
    t = Math.max(0, t);
  }
  return {
    x: ax + t * vx,
    y: ay + t * vy,
    attach: { type: "linear", t },
  };
}

export function nearestPointOnCircleDef(rawPoint, def) {
  if (!rawPoint || !def || def.kind !== "circle") {
    return null;
  }
  const dx = rawPoint.x - def.center.x;
  const dy = rawPoint.y - def.center.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return {
      x: def.center.x + def.radius,
      y: def.center.y,
      attach: { type: "circle", angle: 0 },
    };
  }
  const angle = Math.atan2(dy, dx);
  return {
    x: def.center.x + Math.cos(angle) * def.radius,
    y: def.center.y + Math.sin(angle) * def.radius,
    attach: { type: "circle", angle },
  };
}

export function nearestPointOnDef(rawPoint, def) {
  if (!def) {
    return null;
  }
  if (def.kind === "circle") {
    return nearestPointOnCircleDef(rawPoint, def);
  }
  return nearestPointOnLinearDef(rawPoint, def);
}

export function intersectLineAndCircle(lineDef, circleDef) {
  const x1 = lineDef.a.x;
  const y1 = lineDef.a.y;
  const x2 = lineDef.b.x;
  const y2 = lineDef.b.y;
  const cx = circleDef.center.x;
  const cy = circleDef.center.y;
  const r = circleDef.radius;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const A = dx * dx + dy * dy;
  if (A < 1e-12) {
    return [];
  }
  const fx = x1 - cx;
  const fy = y1 - cy;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < -1e-9) {
    return [];
  }
  if (Math.abs(disc) <= 1e-9) {
    const t = -B / (2 * A);
    return [{ x: x1 + t * dx, y: y1 + t * dy }];
  }
  const sqrtDisc = Math.sqrt(Math.max(0, disc));
  const t1 = (-B - sqrtDisc) / (2 * A);
  const t2 = (-B + sqrtDisc) / (2 * A);
  return [
    { x: x1 + t1 * dx, y: y1 + t1 * dy },
    { x: x1 + t2 * dx, y: y1 + t2 * dy },
  ];
}
