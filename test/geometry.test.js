import test from "node:test";
import assert from "node:assert/strict";

import { angleDegrees, nestedAngleArcRadii } from "../src/app/geometry/angles.js";
import {
  computeCircumcenter,
  computeIncenter,
  computeInradius,
  computeTangentAtPointPosition,
  computeTangentPoints,
  arc3ptNeedsSwap,
  arcCSENeedsSwap,
} from "../src/app/geometry/circles.js";
import {
  distance,
  intersectInfiniteLines,
  pointFitsLinearDef,
  pointFitsIntersectionDef,
  nearestPointOnLinearDef,
  nearestPointOnCircleDef,
  nearestPointOnDef,
  intersectLineAndCircle,
} from "../src/app/geometry/intersections.js";
import {
  transformPointAround,
  transformPointBySession,
  projectPolygon,
  polygonsOverlap,
  centroid,
  minVertexDistance,
} from "../src/app/geometry/transforms.js";
import {
  normalizedRayExtension,
  normalizedLineExtension,
  rayEndpoint,
} from "../src/app/geometry/linear.js";

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

function approxPoint(actual, expected, tolerance = 1e-9) {
  approx(actual.x, expected.x, tolerance);
  approx(actual.y, expected.y, tolerance);
}

test("distance and line intersection helpers", () => {
  approx(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);

  const hit = intersectInfiniteLines(
    { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
    { a: { x: 0, y: 1 }, b: { x: 1, y: 0 } },
  );
  assert.deepEqual(hit, { x: 0.5, y: 0.5 });
  assert.equal(intersectInfiniteLines(
    { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } },
    { a: { x: 0, y: 1 }, b: { x: 1, y: 1 } },
  ), null);
});

test("linear definition point tests and nearest points", () => {
  const segment = { kind: "segment", a: { x: 0, y: 0 }, b: { x: 10, y: 0 } };
  const ray = { kind: "ray", a: { x: 0, y: 0 }, b: { x: 10, y: 0 } };
  const line = { kind: "line", a: { x: 0, y: 0 }, b: { x: 10, y: 0 } };

  assert.equal(pointFitsLinearDef({ x: 5, y: 0 }, segment), true);
  assert.equal(pointFitsLinearDef({ x: -1, y: 0 }, segment), false);
  assert.equal(pointFitsLinearDef({ x: -1, y: 0 }, ray), false);
  assert.equal(pointFitsLinearDef({ x: -1, y: 0 }, line), true);

  assert.deepEqual(nearestPointOnLinearDef({ x: 14, y: 3 }, segment), {
    x: 10,
    y: 0,
    attach: { type: "linear", t: 1 },
  });
  assert.deepEqual(nearestPointOnLinearDef({ x: -2, y: 3 }, ray), {
    x: 0,
    y: 0,
    attach: { type: "linear", t: 0 },
  });
  assert.equal(nearestPointOnLinearDef({ x: 1, y: 2 }, { kind: "line", a: { x: 1, y: 1 }, b: { x: 1, y: 1 } }), null);
});

test("circle projection and intersection helpers", () => {
  const circle = { kind: "circle", center: { x: 0, y: 0 }, radius: 5 };
  assert.equal(pointFitsIntersectionDef({ x: 3, y: 4 }, circle), true);
  assert.deepEqual(nearestPointOnCircleDef({ x: 0, y: 0 }, circle).attach, { type: "circle", angle: 0 });
  approxPoint(nearestPointOnCircleDef({ x: 0, y: 0 }, circle), { x: 5, y: 0 });
  assert.deepEqual(nearestPointOnDef({ x: 7, y: 0 }, circle).attach, { type: "circle", angle: 0 });
  approxPoint(nearestPointOnDef({ x: 7, y: 0 }, circle), { x: 5, y: 0 });

  const intersections = intersectLineAndCircle(
    { a: { x: -10, y: 0 }, b: { x: 10, y: 0 } },
    circle,
  );
  assert.equal(intersections.length, 2);
  approx(intersections[0].y, 0);
  approx(intersections[1].y, 0);
  approx(Math.abs(intersections[0].x), 5);
  approx(Math.abs(intersections[1].x), 5);
  assert.notEqual(intersections[0].x, intersections[1].x);
  assert.equal(intersections[0].x < 0 && intersections[1].x > 0, true);

  assert.deepEqual(intersectLineAndCircle(
    { a: { x: -10, y: 6 }, b: { x: 10, y: 6 } },
    circle,
  ), []);
});

test("triangle centers", () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 6, y: 0 };
  const p3 = { x: 0, y: 8 };

  approxPoint(computeCircumcenter(p1, p2, p3), { x: 3, y: 4 });
  const incenter = computeIncenter(p1, p2, p3);
  approx(incenter.x, 2);
  approx(incenter.y, 2);
  approx(computeInradius(p1, p2, p3), 2);
});

test("triangle center collinear fallback", () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 3, y: 0 };
  const p3 = { x: 6, y: 0 };

  approxPoint(computeCircumcenter(p1, p2, p3), { x: 3, y: 0 });
});

test("arc swap helpers", () => {
  assert.equal(arc3ptNeedsSwap({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }), true);
  assert.equal(arc3ptNeedsSwap({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }), false);
  assert.equal(arcCSENeedsSwap(0, 0, 1, 0, 0, -1), true);
});

test("tangent construction", () => {
  const tangents = computeTangentPoints({ x: 10, y: 0 }, { x: 0, y: 0 }, 5);
  assert.equal(tangents.length, 2);
  approx(distance(tangents[0], { x: 0, y: 0 }), 5);
  approx(distance(tangents[1], { x: 0, y: 0 }), 5);
  assert.equal(computeTangentPoints({ x: 3, y: 0 }, { x: 0, y: 0 }, 5), null);

  const tangentAtPoint = computeTangentAtPointPosition({ x: 5, y: 0 }, { x: 0, y: 0 }, 1, 3);
  approx(tangentAtPoint.x, 5);
  approx(tangentAtPoint.y, 3);
});

test("angle and linear utilities", () => {
  approx(angleDegrees({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), 90);
  const radii = nestedAngleArcRadii(1, 3);
  approx(radii[0], 1);
  approx(radii[1], 0.72);
  approx(radii[2], 0.44);
  assert.equal(normalizedRayExtension(-2), 4);
  assert.equal(normalizedLineExtension(-2), 4);
  approxPoint(rayEndpoint({ x: 0, y: 0 }, { x: 3, y: 4 }, 2), { x: 4.2, y: 5.6 });
});

test("transform and polygon helpers", () => {
  const rotated = transformPointAround({ x: 2, y: 0 }, { x: 0, y: 0 }, 1, Math.PI / 2, { x: 1, y: -1 });
  approx(rotated.x, 1);
  approx(rotated.y, 1);

  const sessionPoint = transformPointBySession({ x: 2, y: 0 }, { x: 0, y: 0 }, Math.PI / 2, { x: 1, y: -1 }, -1, 1);
  approx(sessionPoint.x, 1);
  approx(sessionPoint.y, -3);

  assert.deepEqual(projectPolygon([{ x: 0, y: 0 }, { x: 2, y: 0 }], { x: 1, y: 0 }), { min: 0, max: 2 });
  assert.equal(polygonsOverlap(
    [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
    [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 1 }],
  ), true);
  assert.equal(polygonsOverlap(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }],
  ), false);
  assert.deepEqual(centroid([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }]), { x: 1, y: 1 });
  assert.equal(minVertexDistance([{ x: 0, y: 0 }], [{ x: 3, y: 4 }], distance), 5);
});
