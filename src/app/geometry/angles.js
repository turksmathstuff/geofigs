export function angleDegrees(p1, vertex, p3) {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p3.x - vertex.x;
  const v2y = p3.y - vertex.y;
  const a1 = Math.atan2(v1y, v1x);
  const a2 = Math.atan2(v2y, v2x);
  let diff = Math.abs((a2 - a1) * (180 / Math.PI));
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

export function nestedAngleArcRadii(baseRadius, arcCount) {
  const count = Math.max(1, Number(arcCount || 1));
  const outer = Math.max(0.15, Number(baseRadius || 1));
  if (count === 1) {
    return [outer];
  }
  const maxStepThatFits = Math.max(0.06, (outer - 0.18) / (count - 1));
  const step = Math.min(0.28, maxStepThatFits);
  return Array.from({ length: count }, (_, i) => Math.max(0.15, outer - i * step));
}
