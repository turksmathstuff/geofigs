import { distance } from "./intersections.js";

export function angleBisectorDirectionPoint(pointA, vertex, pointB, distanceOut = 1) {
  if (!pointA || !vertex || !pointB) {
    return null;
  }
  const ax = pointA.x - vertex.x;
  const ay = pointA.y - vertex.y;
  const bx = pointB.x - vertex.x;
  const by = pointB.y - vertex.y;
  const alen = Math.hypot(ax, ay);
  const blen = Math.hypot(bx, by);
  if (alen < 1e-9 || blen < 1e-9) {
    return null;
  }
  const sx = ax / alen + bx / blen;
  const sy = ay / alen + by / blen;
  const slen = Math.hypot(sx, sy);
  if (slen < 1e-9) {
    return null;
  }
  const out = Math.max(0.5, Number(distanceOut) || 1);
  return {
    x: vertex.x + (sx / slen) * out,
    y: vertex.y + (sy / slen) * out,
  };
}

export function perpendicularBisectorEndpointPoint(pointA, pointB, side, halfLength) {
  if (!pointA || !pointB) {
    return null;
  }
  const mx = (pointA.x + pointB.x) / 2;
  const my = (pointA.y + pointB.y) / 2;
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return null;
  }
  const px = -dy / len;
  const py = dx / len;
  const s = side >= 0 ? 1 : -1;
  const h = Math.max(0.2, Number(halfLength) || 1);
  return { x: mx + px * h * s, y: my + py * h * s };
}

export function rightTriangleApexFromCursor(pointRight, pointBase, cursor, options = {}) {
  const baseLen = distance(pointRight, pointBase);
  if (baseLen < 0.0001) {
    return null;
  }
  const vx = pointBase.x - pointRight.x;
  const vy = pointBase.y - pointRight.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const rawHeight = (cursor.x - pointRight.x) * perpX + (cursor.y - pointRight.y) * perpY;
  let height = Math.abs(rawHeight) < 0.0001 ? baseLen * 0.8 : rawHeight;
  if (options.forceIsosceles) {
    height = baseLen * (rawHeight < 0 ? -1 : 1);
  }
  return {
    x: pointRight.x + perpX * height,
    y: pointRight.y + perpY * height,
    height,
  };
}

export function rightTriangleApexPoint(rightVertex, baseVertex, height) {
  if (!rightVertex || !baseVertex) {
    return null;
  }
  const baseLen = distance(rightVertex, baseVertex);
  if (baseLen < 0.0001) {
    return null;
  }
  const vx = baseVertex.x - rightVertex.x;
  const vy = baseVertex.y - rightVertex.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const h = Number.isFinite(height) ? height : baseLen * 0.8;
  return {
    x: rightVertex.x + perpX * h,
    y: rightVertex.y + perpY * h,
  };
}

export function isoscelesApexFromCursor(pointA, pointB, cursor) {
  const baseLen = distance(pointA, pointB);
  if (baseLen < 0.0001) {
    return null;
  }
  const vx = pointB.x - pointA.x;
  const vy = pointB.y - pointA.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;

  const projectedHeight = (cursor.x - midX) * perpX + (cursor.y - midY) * perpY;
  const fallbackHeight = baseLen * 0.6;
  const height = Math.abs(projectedHeight) < 0.0001 ? fallbackHeight : projectedHeight;
  return {
    x: midX + perpX * height,
    y: midY + perpY * height,
  };
}

export function equilateralApexFromCursor(pointA, pointB, cursor) {
  const baseLen = distance(pointA, pointB);
  if (baseLen < 0.0001) {
    return null;
  }
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;
  const vx = pointB.x - pointA.x;
  const vy = pointB.y - pointA.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const signedSide = (cursor.x - midX) * perpX + (cursor.y - midY) * perpY;
  const side = signedSide < 0 ? -1 : 1;
  const height = (Math.sqrt(3) / 2) * baseLen;
  return {
    x: midX + perpX * height * side,
    y: midY + perpY * height * side,
    side,
  };
}

export function equilateralApexPoint(pointA, pointB, side) {
  if (!pointA || !pointB) {
    return null;
  }
  const baseLen = distance(pointA, pointB);
  if (baseLen < 0.0001) {
    return null;
  }
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;
  const vx = pointB.x - pointA.x;
  const vy = pointB.y - pointA.y;
  const perpX = -vy / baseLen;
  const perpY = vx / baseLen;
  const s = Number(side) < 0 ? -1 : 1;
  const height = (Math.sqrt(3) / 2) * baseLen;
  return {
    x: midX + perpX * height * s,
    y: midY + perpY * height * s,
  };
}

export function regularPolygonVerticesFromEdge(pointA, pointB, sideCount) {
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const sideLength = Math.hypot(dx, dy);
  if (sideLength < 1e-9 || sideCount < 3) {
    return null;
  }
  const turn = (2 * Math.PI) / sideCount;
  const cosTurn = Math.cos(turn);
  const sinTurn = Math.sin(turn);
  const vertices = [{ x: pointA.x, y: pointA.y }, { x: pointB.x, y: pointB.y }];
  let edgeX = dx;
  let edgeY = dy;
  while (vertices.length < sideCount) {
    const prev = vertices[vertices.length - 1];
    const nextX = prev.x + edgeX * cosTurn - edgeY * sinTurn;
    const nextY = prev.y + edgeX * sinTurn + edgeY * cosTurn;
    vertices.push({ x: nextX, y: nextY });
    const rotX = edgeX * cosTurn - edgeY * sinTurn;
    const rotY = edgeX * sinTurn + edgeY * cosTurn;
    edgeX = rotX;
    edgeY = rotY;
  }
  return vertices;
}

export function regularPolygonCenterFromEdge(pointA, pointB, sideCount) {
  if (!pointA || !pointB) {
    return null;
  }
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const sideLength = Math.hypot(dx, dy);
  if (sideLength < 1e-9 || sideCount < 3) {
    return null;
  }
  const apothem = sideLength / (2 * Math.tan(Math.PI / sideCount));
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;
  const ux = dx / sideLength;
  const uy = dy / sideLength;
  return {
    x: midX - uy * apothem,
    y: midY + ux * apothem,
  };
}

export function regularPolygonVertexPoint(pointA, pointB, sideCount, vertexIndex) {
  if (!pointA || !pointB || sideCount < 3) {
    return null;
  }
  const index = Number(vertexIndex);
  if (!Number.isInteger(index) || index < 0 || index >= sideCount) {
    return null;
  }
  if (index === 0) {
    return { x: pointA.x, y: pointA.y };
  }
  if (index === 1) {
    return { x: pointB.x, y: pointB.y };
  }
  const vertices = regularPolygonVerticesFromEdge(pointA, pointB, sideCount);
  return vertices?.[index] || null;
}
