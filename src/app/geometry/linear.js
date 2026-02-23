export function normalizedRayExtension(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

export function normalizedLineExtension(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 4;
}

export function rayEndpoint(a, b, extension) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { x: b.x, y: b.y };
  }
  const ext = normalizedRayExtension(extension);
  return {
    x: b.x + (dx / len) * ext,
    y: b.y + (dy / len) * ext,
  };
}
