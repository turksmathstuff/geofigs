import {
  intersectDefinitions,
  nearestPointTo,
  nearestPointOnDef,
  pointFromConstraintOnObject,
} from "../geometry/intersections.js";
import { computeTangentPoints, computeTangentAtPointPosition } from "../geometry/circles.js";
import {
  angleBisectorDirectionPoint,
  perpendicularBisectorEndpointPoint,
  rightTriangleApexFromCursor,
  rightTriangleApexPoint,
  equilateralApexPoint,
  regularPolygonVertexPoint,
  regularPolygonCenterFromEdge,
} from "../geometry/constructions.js";

// One entry per constraint kind. Adding a kind means adding one entry here —
// recompute, drag, deletion cascade, and render pinning all read this table.
//
// Entry shape:
//   recompute(pointObj, ctx)  -> {x, y} | null (null = leave point untouched)
//   applyDrag(pointObj, pos, ctx) -> { pos, changedConstraint }
//       Omitted when `dragPinned` is set: drags snap back to the current position.
//       Omitted otherwise: drags pass through unchanged.
//   dependencyIds(constraint) -> ids whose deletion cascades to this point
//   dragPinned                -> drags cannot move the point at all
//   renderPinnedInSelect      -> JSXGraph point stays fixed even in select mode
//   selectDraggable           -> draggable in select mode even if style.fixed is set
//
// ctx supplies doc-dependent lookups: getPointById, getObjectById,
// getIntersectionDefinition.

export const constraintRegistry = {
  intersection: {
    dragPinned: true,
    renderPinnedInSelect: true,
    dependencyIds: (constraint) => constraint.sourceObjectIds || [],
    recompute(obj, ctx) {
      const [id1, id2] = obj.constraint.sourceObjectIds || [];
      if (!id1 || !id2) {
        return null;
      }
      const def1 = ctx.getIntersectionDefinition(ctx.getObjectById(id1));
      const def2 = ctx.getIntersectionDefinition(ctx.getObjectById(id2));
      if (!def1 || !def2) {
        return null;
      }
      const candidates = intersectDefinitions(def1, def2);
      const nearest = nearestPointTo({ x: obj.x, y: obj.y }, candidates);
      return nearest ? nearest.point : null;
    },
  },

  onObject: {
    dependencyIds: (constraint) => (constraint.sourceObjectId ? [constraint.sourceObjectId] : []),
    recompute(obj, ctx) {
      const source = ctx.getObjectById(obj.constraint.sourceObjectId);
      const def = ctx.getIntersectionDefinition(source);
      return pointFromConstraintOnObject(def, obj.constraint.attach);
    },
    applyDrag(obj, pos, ctx) {
      const source = ctx.getObjectById(obj.constraint.sourceObjectId);
      const def = ctx.getIntersectionDefinition(source);
      if (!def) {
        return { pos, changedConstraint: false };
      }
      const projected = nearestPointOnDef(pos, def);
      if (!projected) {
        return { pos, changedConstraint: false };
      }
      obj.constraint.attach = { ...projected.attach };
      return {
        pos: { x: projected.x, y: projected.y },
        changedConstraint: true,
      };
    },
  },

  midpoint: {
    dragPinned: true,
    renderPinnedInSelect: true,
    dependencyIds: (constraint) => constraint.sourcePointIds || [],
    recompute(obj, ctx) {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      const p1 = ctx.getPointById(id1);
      const p2 = ctx.getPointById(id2);
      if (!p1 || !p2) {
        return null;
      }
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    },
  },

  angleBisectorRay: {
    dragPinned: true,
    renderPinnedInSelect: true,
    dependencyIds: (constraint) => constraint.sourcePointIds || [],
    recompute(obj, ctx) {
      const [id1, id2, id3] = obj.constraint.sourcePointIds || [];
      return angleBisectorDirectionPoint(
        ctx.getPointById(id1),
        ctx.getPointById(id2),
        ctx.getPointById(id3),
        obj.constraint.distance
      );
    },
  },

  perpendicularBisectorEndpoint: {
    selectDraggable: true,
    dependencyIds: (constraint) => constraint.sourcePointIds || [],
    recompute(obj, ctx) {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      return perpendicularBisectorEndpointPoint(
        ctx.getPointById(id1),
        ctx.getPointById(id2),
        obj.constraint.side,
        obj.constraint.halfLength
      );
    },
    applyDrag(obj, pos, ctx) {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      const p1 = ctx.getPointById(id1);
      const p2 = ctx.getPointById(id2);
      if (!p1 || !p2) {
        return { pos, changedConstraint: false };
      }
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) {
        return { pos: { x: obj.x, y: obj.y }, changedConstraint: false };
      }
      const px = -dy / len;
      const py = dx / len;
      const signed = (pos.x - mx) * px + (pos.y - my) * py;
      const side = signed >= 0 ? 1 : -1;
      const halfLength = Math.max(0.2, Math.abs(signed));
      obj.constraint.side = side;
      obj.constraint.halfLength = halfLength;
      return {
        pos: { x: mx + px * halfLength * side, y: my + py * halfLength * side },
        changedConstraint: true,
      };
    },
  },

  rightTriangleApex: {
    dependencyIds: () => [],
    recompute(obj, ctx) {
      return rightTriangleApexPoint(
        ctx.getPointById(obj.constraint.rightVertexId),
        ctx.getPointById(obj.constraint.baseVertexId),
        obj.constraint.height
      );
    },
    applyDrag(obj, pos, ctx) {
      const rightVertex = ctx.getPointById(obj.constraint.rightVertexId);
      const baseVertex = ctx.getPointById(obj.constraint.baseVertexId);
      if (!rightVertex || !baseVertex) {
        return { pos, changedConstraint: false };
      }
      const projected = rightTriangleApexFromCursor(rightVertex, baseVertex, pos);
      if (!projected) {
        return { pos, changedConstraint: false };
      }
      obj.constraint.height = projected.height;
      return {
        pos: { x: projected.x, y: projected.y },
        changedConstraint: true,
      };
    },
  },

  equilateralApex: {
    dragPinned: true,
    renderPinnedInSelect: true,
    dependencyIds: (constraint) => constraint.sourcePointIds || [],
    recompute(obj, ctx) {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      return equilateralApexPoint(ctx.getPointById(id1), ctx.getPointById(id2), obj.constraint.side);
    },
  },

  regularPolygonVertex: {
    dragPinned: true,
    dependencyIds: (constraint) => constraint.sourcePointIds || [],
    recompute(obj, ctx) {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      return regularPolygonVertexPoint(
        ctx.getPointById(id1),
        ctx.getPointById(id2),
        Number(obj.constraint.sideCount),
        Number(obj.constraint.vertexIndex)
      );
    },
  },

  regularPolygonCenter: {
    dragPinned: true,
    dependencyIds: (constraint) => constraint.sourcePointIds || [],
    recompute(obj, ctx) {
      const [id1, id2] = obj.constraint.sourcePointIds || [];
      return regularPolygonCenterFromEdge(
        ctx.getPointById(id1),
        ctx.getPointById(id2),
        Number(obj.constraint.sideCount)
      );
    },
  },

  circleTangentPoint: {
    dragPinned: true,
    renderPinnedInSelect: true,
    dependencyIds: (constraint) =>
      [constraint.sourcePointId, constraint.circleId].filter(Boolean),
    recompute(obj, ctx) {
      const source = ctx.getPointById(obj.constraint.sourcePointId);
      const circleObj = ctx.getObjectById(obj.constraint.circleId);
      const center = circleObj ? ctx.getPointById(circleObj.pointIds?.[0]) : null;
      const through = circleObj ? ctx.getPointById(circleObj.pointIds?.[1]) : null;
      if (!source || !center || !through) {
        return null;
      }
      const r = Math.hypot(through.x - center.x, through.y - center.y);
      const tps = computeTangentPoints(source, center, r);
      if (!tps) {
        obj.constraint.invalid = true;
        return null;
      }
      obj.constraint.invalid = false;
      return tps[obj.constraint.side];
    },
  },

  tangentAtPointEndpoint: {
    selectDraggable: true,
    dependencyIds: (constraint) =>
      [constraint.sourcePointId, constraint.circleId].filter(Boolean),
    recompute(obj, ctx) {
      const source = ctx.getPointById(obj.constraint.sourcePointId);
      const circleObj = ctx.getObjectById(obj.constraint.circleId);
      const center = circleObj ? ctx.getPointById(circleObj.pointIds?.[0]) : null;
      if (!source || !center) {
        return null;
      }
      return computeTangentAtPointPosition(source, center, obj.constraint.side, obj.constraint.distance);
    },
    applyDrag(obj, pos, ctx) {
      const source = ctx.getPointById(obj.constraint.sourcePointId);
      const circleObj = ctx.getObjectById(obj.constraint.circleId);
      const center = circleObj ? ctx.getPointById(circleObj.pointIds?.[0]) : null;
      if (!source || !center) {
        return { pos: { x: obj.x, y: obj.y }, changedConstraint: false };
      }
      const len = Math.hypot(source.x - center.x, source.y - center.y);
      if (len < 1e-9) {
        return { pos: { x: obj.x, y: obj.y }, changedConstraint: false };
      }
      const tx = -(source.y - center.y) / len;
      const ty = (source.x - center.x) / len;
      const signed = (pos.x - source.x) * tx + (pos.y - source.y) * ty;
      const side = signed >= 0 ? 1 : -1;
      const dist = Math.max(0.2, Math.abs(signed));
      obj.constraint.side = side;
      obj.constraint.distance = dist;
      return {
        pos: { x: source.x + tx * dist * side, y: source.y + ty * dist * side },
        changedConstraint: true,
      };
    },
  },
};

export function constraintEntry(constraint) {
  return constraint ? constraintRegistry[constraint.kind] || null : null;
}
