export function createRenderDoc(ctx) {
  const {
    store,
    boardController,
    session,
    buildPointMap,
    defaultStyle,
    getRayExtensionForObject,
    getLineExtentsForObject,
    syncFollowLabelPosition,
    nestedAngleArcRadii,
    pointNeeds,
    recomputeConstrainedPoints,
  } = ctx;

  return function renderCurrentDoc(applySelection = true) {
    const normalizeLabelText = (text) =>
      String(text ?? "")
        .replace(/<sup>\s*o\s*<\/sup>/gi, "°")
        .replace(/\^\(o\)/g, "°")
        .replace(/\^o\b/g, "°");

    recomputeConstrainedPoints();
    boardController.resetBoard();
    const points = buildPointMap();

    for (const obj of store.doc.objects) {
      if (obj.hidden) {
        continue;
      }
      if (obj.type === "point") {
        continue;
      }
      const style = { ...defaultStyle(), ...obj.style };
      if (obj.type === "segment") {
        const p1 = points.get(obj.pointIds[0]);
        const p2 = points.get(obj.pointIds[1]);
        if (p1 && p2) {
          const isInvalidTangent = obj.pointIds.some((pid) => {
            const pt = store.doc.objects.find((o) => o.id === pid);
            return pt?.constraint?.kind === "circleTangentPoint" && pt.constraint.invalid;
          });
          boardController.createSegment(obj.id, p1, p2, isInvalidTangent ? { ...style, strokeColor: "#9ca3af" } : style);
        }
      } else if (obj.type === "line") {
        const p1 = points.get(obj.pointIds[0]);
        const p2 = points.get(obj.pointIds[1]);
        if (p1 && p2) {
          boardController.createLine(obj.id, p1, p2, {
            ...style,
            showArrows: session.showLineArrows,
            rayExtension: getRayExtensionForObject(obj),
            ...getLineExtentsForObject(obj),
            lineType: obj.lineType,
          });
        }
      } else if (obj.type === "circle") {
        const center = points.get(obj.pointIds[0]);
        const through = points.get(obj.pointIds[1]);
        if (center && through) {
          boardController.createCircle(obj.id, center, through, style);
        }
      } else if (obj.type === "parallel") {
        const source = boardController.getElement(obj.sourceLineId);
        const through = points.get(obj.throughPointId);
        if (source && through) {
          const parallelStyle = { ...style };
          if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionStart")) {
            delete parallelStyle.lineExtensionStart;
          }
          if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionEnd")) {
            delete parallelStyle.lineExtensionEnd;
          }
          parallelStyle.showArrows = session.showLineArrows;
          boardController.createParallelLine(obj.id, source, through, parallelStyle);
        }
      } else if (obj.type === "perpendicular") {
        const source = boardController.getElement(obj.sourceLineId);
        const through = points.get(obj.throughPointId);
        if (source && through) {
          const perpendicularStyle = { ...style };
          if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionStart")) {
            delete perpendicularStyle.lineExtensionStart;
          }
          if (!Object.prototype.hasOwnProperty.call(obj.style || {}, "lineExtensionEnd")) {
            delete perpendicularStyle.lineExtensionEnd;
          }
          perpendicularStyle.showArrows = session.showLineArrows;
          boardController.createPerpendicularLine(obj.id, source, through, perpendicularStyle);
        }
      } else if (obj.type === "label") {
        syncFollowLabelPosition(obj);
        boardController.createText(obj.id, obj.x, obj.y, normalizeLabelText(obj.text), style);
      } else if (obj.type === "arc-3pt") {
        const p1 = points.get(obj.pointIds[0]);
        const p2 = points.get(obj.pointIds[1]);
        const p3 = points.get(obj.pointIds[2]);
        if (p1 && p2 && p3) {
          boardController.createArc3Pt(obj.id, p1, p2, p3, obj.swapStartEnd, style);
        }
      } else if (obj.type === "arc-cse") {
        const center = points.get(obj.pointIds[0]);
        const start = points.get(obj.pointIds[1]);
        const end = points.get(obj.pointIds[2]);
        if (center && start && end) {
          boardController.createArcCSE(obj.id, center, start, end, obj.swapStartEnd, style);
        }
      } else if (obj.type === "inscribed-circle") {
        const p1 = points.get(obj.pointIds[0]);
        const p2 = points.get(obj.pointIds[1]);
        const p3 = points.get(obj.pointIds[2]);
        if (p1 && p2 && p3) {
          boardController.createInscribedCircle(obj.id, p1, p2, p3, !!obj.showCenter, style);
        }
      } else if (obj.type === "circumscribed-circle") {
        const p1 = points.get(obj.pointIds[0]);
        const p2 = points.get(obj.pointIds[1]);
        const p3 = points.get(obj.pointIds[2]);
        if (p1 && p2 && p3) {
          boardController.createCircumscribedCircle(obj.id, p1, p2, p3, !!obj.showCenter, style);
        }
      } else if (obj.type === "inscribed-polygon") {
        const circleEl = boardController.getElement(obj.circleId);
        if (circleEl) {
          boardController.createInscribedPolygon(
            obj.id, circleEl, obj.n, obj.handleAngles || [], style,
            { showHandles: !session.exportPointHighlightsBlack },
            obj.vertexIds || [],
            obj.handleIds || []
          );
          for (const gid of [...(obj.vertexIds || []), ...(obj.handleIds || [])]) {
            const el = boardController.getElement(gid);
            if (el) points.set(gid, el);
          }
        }
      }
    }

    for (const ann of store.doc.annotations) {
      if (ann.hidden) {
        continue;
      }
      const style = { ...defaultStyle(), ...ann.style };
      if (ann.type === "tick") {
        const segment = boardController.getElement(ann.segmentId);
        if (segment) {
          boardController.createTickMark(ann.id, segment, ann.tickCount, style);
        }
      } else if (ann.type === "tickPoints") {
        const p1 = points.get(ann.pointIds?.[0]);
        const p2 = points.get(ann.pointIds?.[1]);
        if (p1 && p2) {
          boardController.createPointPairTickMarks(ann.id, p1, p2, ann.tickCount, style);
        }
      } else if (ann.type === "midpointTick") {
        const p1 = points.get(ann.pointIds?.[0]);
        const pm = points.get(ann.pointIds?.[1]);
        const p2 = points.get(ann.pointIds?.[2]);
        if (p1 && pm && p2) {
          boardController.createMidpointTickMarks(ann.id, p1, pm, p2, ann.tickCount, style);
        }
      } else if (ann.type === "parallelMark") {
        const target = boardController.getElement(ann.targetId);
        if (target) {
          boardController.createParallelChevronMarks(ann.id, target, ann.markCount, style);
        }
      } else if (ann.type === "angle") {
        const p1 = points.get(ann.pointIds[0]);
        const p2 = points.get(ann.pointIds[1]);
        const p3 = points.get(ann.pointIds[2]);
        if (p1 && p2 && p3) {
          const arcCount = Math.max(1, Number(ann.arcCount || 1));
          const decorator =
            ann.decorator === "arcTick" ? "arcTick" : ann.decorator === "tickOnly" ? "tickOnly" : "arc";
          const tickCount = Math.max(1, Number(ann.tickCount || arcCount || 1));
          const baseRadius = Math.max(0.15, Number(ann.style?.radius || 1));
          if (ann.right) {
            boardController.createAngle(ann.id, p1, p2, p3, {
              ...style,
              right: true,
              radius: baseRadius,
            });
          } else {
            if (decorator === "arcTick" || decorator === "tickOnly") {
              boardController.createAngle(ann.id, p1, p2, p3, {
                ...style,
                right: false,
                decorator,
                tickCount,
                radius: baseRadius,
              });
            } else {
              const radii = nestedAngleArcRadii(baseRadius, arcCount);
              for (let i = 0; i < radii.length; i += 1) {
                boardController.createAngle(`${ann.id}_arc_${i + 1}`, p1, p2, p3, {
                  ...style,
                  right: false,
                  decorator: "arc",
                  radius: radii[i],
                });
              }
            }
          }
        }
      } else if (ann.type === "arcTick") {
        const arcEl = boardController.getElement(ann.arcId);
        if (arcEl) {
          boardController.createArcTickMark(ann.id, arcEl, ann.tickCount, style, ann.tickLen,
            { showHandle: !session.exportPointHighlightsBlack }
          );
        }
      }
    }

    if (applySelection) {
      for (const id of store.selectedIds()) {
        boardController.applyVisualState(id, true);
      }
    }
    if (pointNeeds(session.currentMode) > 0 && session.pendingPointIds.length) {
      for (const id of session.pendingPointIds) {
        boardController.applyVisualState(id, true);
      }
    }
    boardController.update();
  };
}
