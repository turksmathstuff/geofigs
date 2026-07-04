import test from "node:test";
import assert from "node:assert/strict";

import { constraintRegistry, constraintEntry } from "../src/app/constraints/registry.js";
import {
  angleBisectorDirectionPoint,
  perpendicularBisectorEndpointPoint,
  rightTriangleApexPoint,
  equilateralApexPoint,
  regularPolygonVerticesFromEdge,
  regularPolygonCenterFromEdge,
  regularPolygonVertexPoint,
} from "../src/app/geometry/constructions.js";

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

function makeCtx(objects) {
  const byId = new Map(objects.map((o) => [o.id, o]));
  return {
    getObjectById: (id) => byId.get(id),
    getPointById: (id) => {
      const o = byId.get(id);
      return o && o.type === "point" ? o : null;
    },
    getIntersectionDefinition: (obj) => {
      if (!obj) return null;
      if (obj.type === "segment") {
        const a = byId.get(obj.pointIds[0]);
        const b = byId.get(obj.pointIds[1]);
        return a && b ? { id: obj.id, kind: "segment", a, b } : null;
      }
      if (obj.type === "circle") {
        const center = byId.get(obj.pointIds[0]);
        const through = byId.get(obj.pointIds[1]);
        if (!center || !through) return null;
        return { id: obj.id, kind: "circle", center, radius: Math.hypot(through.x - center.x, through.y - center.y) };
      }
      return null;
    },
  };
}

const pt = (id, x, y) => ({ id, type: "point", x, y });

test("constraintEntry returns null for missing/unknown constraints", () => {
  assert.equal(constraintEntry(null), null);
  assert.equal(constraintEntry({ kind: "nope" }), null);
  assert.ok(constraintEntry({ kind: "midpoint" }));
});

test("midpoint recompute tracks the source points", () => {
  const ctx = makeCtx([pt("a", 0, 0), pt("b", 4, 2)]);
  const obj = { id: "m", type: "point", x: 9, y: 9, constraint: { kind: "midpoint", sourcePointIds: ["a", "b"] } };
  const next = constraintRegistry.midpoint.recompute(obj, ctx);
  approx(next.x, 2);
  approx(next.y, 1);
});

test("midpoint recompute returns null when a source point is gone", () => {
  const ctx = makeCtx([pt("a", 0, 0)]);
  const obj = { id: "m", type: "point", x: 9, y: 9, constraint: { kind: "midpoint", sourcePointIds: ["a", "gone"] } };
  assert.equal(constraintRegistry.midpoint.recompute(obj, ctx), null);
});

test("intersection recompute picks the candidate nearest the current position", () => {
  const objects = [
    pt("a", -5, 0), pt("b", 5, 0),
    pt("c", 0, 0), pt("r", 3, 0),
    { id: "seg", type: "segment", pointIds: ["a", "b"] },
    { id: "circ", type: "circle", pointIds: ["c", "r"] },
  ];
  const ctx = makeCtx(objects);
  const obj = {
    id: "x", type: "point", x: 2.5, y: 0.1,
    constraint: { kind: "intersection", sourceObjectIds: ["seg", "circ"] },
  };
  const next = constraintRegistry.intersection.recompute(obj, ctx);
  approx(next.x, 3, 1e-6);
  approx(next.y, 0, 1e-6);
});

test("onObject applyDrag projects onto the source and updates attach", () => {
  const objects = [
    pt("a", 0, 0), pt("b", 10, 0),
    { id: "seg", type: "segment", pointIds: ["a", "b"] },
  ];
  const ctx = makeCtx(objects);
  const obj = {
    id: "p", type: "point", x: 5, y: 0,
    constraint: { kind: "onObject", sourceObjectId: "seg", attach: { type: "linear", t: 0.5 } },
  };
  const result = constraintRegistry.onObject.applyDrag(obj, { x: 2, y: 3 }, ctx);
  assert.equal(result.changedConstraint, true);
  approx(result.pos.x, 2, 1e-6);
  approx(result.pos.y, 0, 1e-6);
  approx(obj.constraint.attach.t, 0.2, 1e-6);
});

test("perpendicularBisectorEndpoint applyDrag updates side and halfLength", () => {
  const ctx = makeCtx([pt("a", -2, 0), pt("b", 2, 0)]);
  const obj = {
    id: "e", type: "point", x: 0, y: 1,
    constraint: { kind: "perpendicularBisectorEndpoint", sourcePointIds: ["a", "b"], side: 1, halfLength: 1 },
  };
  const result = constraintRegistry.perpendicularBisectorEndpoint.applyDrag(obj, { x: 0.5, y: -3 }, ctx);
  assert.equal(result.changedConstraint, true);
  assert.equal(obj.constraint.side, -1);
  approx(obj.constraint.halfLength, 3, 1e-6);
  approx(result.pos.x, 0, 1e-6);
  approx(result.pos.y, -3, 1e-6);
});

test("rightTriangleApex applyDrag records the projected height", () => {
  const ctx = makeCtx([pt("r", 0, 0), pt("b", 4, 0)]);
  const obj = {
    id: "apex", type: "point", x: 0, y: 2,
    constraint: { kind: "rightTriangleApex", rightVertexId: "r", baseVertexId: "b", height: 2 },
  };
  const result = constraintRegistry.rightTriangleApex.applyDrag(obj, { x: 1, y: 3 }, ctx);
  assert.equal(result.changedConstraint, true);
  approx(obj.constraint.height, 3, 1e-6);
  approx(result.pos.x, 0, 1e-6);
  approx(result.pos.y, 3, 1e-6);
});

test("circleTangentPoint recompute flags invalid when the source is inside the circle", () => {
  const objects = [
    pt("s", 1, 0),
    pt("c", 0, 0), pt("t", 3, 0),
    { id: "circ", type: "circle", pointIds: ["c", "t"] },
  ];
  const ctx = makeCtx(objects);
  const obj = {
    id: "tp", type: "point", x: 0, y: 3,
    constraint: { kind: "circleTangentPoint", sourcePointId: "s", circleId: "circ", side: 0 },
  };
  assert.equal(constraintRegistry.circleTangentPoint.recompute(obj, ctx), null);
  assert.equal(obj.constraint.invalid, true);
});

test("dependencyIds cover every source reference per kind", () => {
  assert.deepEqual(
    constraintRegistry.intersection.dependencyIds({ kind: "intersection", sourceObjectIds: ["o1", "o2"] }),
    ["o1", "o2"]
  );
  assert.deepEqual(
    constraintRegistry.onObject.dependencyIds({ kind: "onObject", sourceObjectId: "o1" }),
    ["o1"]
  );
  assert.deepEqual(
    constraintRegistry.circleTangentPoint.dependencyIds({ kind: "circleTangentPoint", sourcePointId: "p", circleId: "c" }),
    ["p", "c"]
  );
  assert.deepEqual(
    constraintRegistry.tangentAtPointEndpoint.dependencyIds({ kind: "tangentAtPointEndpoint", sourcePointId: "p", circleId: "c" }),
    ["p", "c"]
  );
  for (const kind of ["midpoint", "angleBisectorRay", "perpendicularBisectorEndpoint", "equilateralApex", "regularPolygonVertex", "regularPolygonCenter"]) {
    assert.deepEqual(
      constraintRegistry[kind].dependencyIds({ kind, sourcePointIds: ["p1", "p2"] }),
      ["p1", "p2"],
      kind
    );
  }
  assert.deepEqual(constraintRegistry.rightTriangleApex.dependencyIds({ kind: "rightTriangleApex" }), []);
});

test("angleBisectorDirectionPoint bisects a right angle", () => {
  const next = angleBisectorDirectionPoint({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, 1);
  approx(next.x, Math.SQRT1_2, 1e-9);
  approx(next.y, Math.SQRT1_2, 1e-9);
});

test("perpendicularBisectorEndpointPoint offsets from the midpoint", () => {
  const next = perpendicularBisectorEndpointPoint({ x: -2, y: 0 }, { x: 2, y: 0 }, 1, 3);
  approx(next.x, 0);
  approx(next.y, 3);
});

test("rightTriangleApexPoint places the apex perpendicular to the base", () => {
  const next = rightTriangleApexPoint({ x: 0, y: 0 }, { x: 4, y: 0 }, 2);
  approx(next.x, 0);
  approx(next.y, 2);
});

test("equilateralApexPoint honors the side sign", () => {
  const up = equilateralApexPoint({ x: 0, y: 0 }, { x: 2, y: 0 }, 1);
  approx(up.x, 1, 1e-9);
  approx(up.y, Math.sqrt(3), 1e-9);
  const down = equilateralApexPoint({ x: 0, y: 0 }, { x: 2, y: 0 }, -1);
  approx(down.y, -Math.sqrt(3), 1e-9);
});

test("regularPolygonVerticesFromEdge builds a unit square", () => {
  const vertices = regularPolygonVerticesFromEdge({ x: 0, y: 0 }, { x: 1, y: 0 }, 4);
  assert.equal(vertices.length, 4);
  approx(vertices[2].x, 1, 1e-9);
  approx(vertices[2].y, 1, 1e-9);
  approx(vertices[3].x, 0, 1e-9);
  approx(vertices[3].y, 1, 1e-9);
});

test("regularPolygonCenterFromEdge finds the square center", () => {
  const center = regularPolygonCenterFromEdge({ x: 0, y: 0 }, { x: 1, y: 0 }, 4);
  approx(center.x, 0.5, 1e-9);
  approx(center.y, 0.5, 1e-9);
});

test("regularPolygonVertexPoint returns edge endpoints for indices 0 and 1", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 1, y: 0 };
  assert.deepEqual(regularPolygonVertexPoint(a, b, 5, 0), { x: 0, y: 0 });
  assert.deepEqual(regularPolygonVertexPoint(a, b, 5, 1), { x: 1, y: 0 });
  assert.equal(regularPolygonVertexPoint(a, b, 5, 7), null);
});
