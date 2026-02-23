export function transformPointAround(point, center, scale, angleRad, offset) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
  const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
  return {
    x: center.x + rx * scale + offset.x,
    y: center.y + ry * scale + offset.y,
  };
}

export function transformPointBySession(base, center, angleRad, offset, mirrorX = 1, mirrorY = 1) {
  const dx = (base.x - center.x) * mirrorX;
  const dy = (base.y - center.y) * mirrorY;
  const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
  const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
  return {
    x: center.x + rx + offset.x,
    y: center.y + ry + offset.y,
  };
}

export function projectPolygon(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const v = p.x * axis.x + p.y * axis.y;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return { min, max };
}

export function polygonsOverlap(polyA, polyB) {
  const polys = [polyA, polyB];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const edge = { x: b.x - a.x, y: b.y - a.y };
      const axis = { x: -edge.y, y: edge.x };
      const axisLen = Math.hypot(axis.x, axis.y);
      if (axisLen < 1e-9) {
        continue;
      }
      axis.x /= axisLen;
      axis.y /= axisLen;
      const projA = projectPolygon(polyA, axis);
      const projB = projectPolygon(polyB, axis);
      if (projA.max < projB.min || projB.max < projA.min) {
        return false;
      }
    }
  }
  return true;
}

export function centroid(points) {
  return {
    x: (points[0].x + points[1].x + points[2].x) / 3,
    y: (points[0].y + points[1].y + points[2].y) / 3,
  };
}

export function minVertexDistance(polyA, polyB, distanceFn) {
  let best = Infinity;
  for (const a of polyA) {
    for (const b of polyB) {
      best = Math.min(best, distanceFn(a, b));
    }
  }
  return best;
}
