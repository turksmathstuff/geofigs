function screenToSvg(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) {
    return { x: clientX, y: clientY };
  }
  return pt.matrixTransform(ctm.inverse());
}

function makeLabelDraggable(svgEl, group) {
  let dragging = false;
  let startPt = { x: 0, y: 0 };
  const accumulated = { x: 0, y: 0 };

  group.style.cursor = "grab";

  group.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    group.setPointerCapture(e.pointerId);
    startPt = screenToSvg(svgEl, e.clientX, e.clientY);
    group.style.cursor = "grabbing";
  });

  group.addEventListener("pointermove", (e) => {
    if (!dragging) {
      return;
    }
    const pt = screenToSvg(svgEl, e.clientX, e.clientY);
    const tx = accumulated.x + (pt.x - startPt.x);
    const ty = accumulated.y + (pt.y - startPt.y);
    group.setAttribute("transform", `translate(${tx},${ty})`);
  });

  group.addEventListener("pointerup", (e) => {
    if (!dragging) {
      return;
    }
    dragging = false;
    group.releasePointerCapture(e.pointerId);
    const pt = screenToSvg(svgEl, e.clientX, e.clientY);
    accumulated.x += pt.x - startPt.x;
    accumulated.y += pt.y - startPt.y;
    group.style.cursor = "grab";
  });

  group.addEventListener("pointercancel", () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    group.setAttribute("transform", `translate(${accumulated.x},${accumulated.y})`);
    group.style.cursor = "grab";
  });
}

export function initPreviewLabelDrag(svgEl) {
  const groups = svgEl.querySelectorAll("[data-export-label-id]");
  for (const group of groups) {
    makeLabelDraggable(svgEl, group);
  }
  return groups.length;
}
