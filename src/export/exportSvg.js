import { buildExportLabelGroup } from "./exportLabelSvg.js";

function parseViewBox(viewBoxText) {
  if (!viewBoxText) {
    return null;
  }
  const values = viewBoxText
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((v) => Number.isFinite(v));
  if (values.length !== 4) {
    return null;
  }
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

function normalizeSvgMarkup(svgString) {
  let out = String(svgString || "");
  if (!out) {
    return out;
  }
  const needsXlink = /xlink:href\s*=/i.test(out) && !/xmlns:xlink\s*=/i.test(out);
  const needsSvgNs = /<svg\b/i.test(out) && !/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(out);
  if (!needsXlink && !needsSvgNs) {
    return out;
  }
  out = out.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let nextAttrs = attrs;
    if (needsSvgNs) {
      nextAttrs += ' xmlns="http://www.w3.org/2000/svg"';
    }
    if (needsXlink) {
      nextAttrs += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
    }
    return `<svg${nextAttrs}>`;
  });
  return out;
}

export function replaceExportLabels(svgString, labels = []) {
  if (!labels.length) {
    return svgString;
  }
  const xml = new DOMParser().parseFromString(normalizeSvgMarkup(svgString), "image/svg+xml");
  if (xml.querySelector("parsererror")) {
    return svgString;
  }
  const svg = xml.documentElement;
  for (const label of labels) {
    if (label.id) {
      const original = svg.querySelector(`[data-geo-label-id="${CSS.escape(label.id)}"]`);
      original?.remove();
    }
    svg.appendChild(buildExportLabelGroup(xml, label));
  }
  return new XMLSerializer().serializeToString(xml);
}

function getFallbackBounds(svg, options) {
  const fromViewBox = parseViewBox(svg.getAttribute("viewBox"));
  if (fromViewBox) {
    return fromViewBox;
  }

  const width = Number(svg.getAttribute("width")) || Number(options.width) || 800;
  const height = Number(svg.getAttribute("height")) || Number(options.height) || 600;
  return { x: 0, y: 0, width, height };
}

function computeTightBounds(svgMarkup, fallback) {
  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-100000px";
  mount.style.top = "-100000px";
  mount.style.visibility = "hidden";
  mount.style.pointerEvents = "none";
  mount.innerHTML = svgMarkup;
  const svg = mount.querySelector("svg");
  if (!svg) {
    return fallback;
  }

  document.body.appendChild(mount);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const nodes = svg.querySelectorAll("path,line,circle,ellipse,polygon,polyline,rect,text,use,image");

  for (const node of nodes) {
    if (node.closest("defs")) {
      continue;
    }
    if (node.getAttribute("display") === "none" || node.getAttribute("visibility") === "hidden") {
      continue;
    }
    try {
      const bb = node.getBBox();
      if (!Number.isFinite(bb.x) || !Number.isFinite(bb.y) || !Number.isFinite(bb.width) || !Number.isFinite(bb.height)) {
        continue;
      }
      if (bb.width <= 0 && bb.height <= 0) {
        continue;
      }
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    } catch (_err) {
      // Some SVG nodes don't support getBBox in all browsers.
    }
  }

  mount.remove();

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return fallback;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return { x: minX, y: minY, width, height };
}

function padBounds(bounds, padding = 0) {
  const pad = Math.max(0, Number(padding) || 0);
  if (!pad) {
    return bounds;
  }
  return {
    x: bounds.x - pad,
    y: bounds.y - pad,
    width: Math.max(1, bounds.width + pad * 2),
    height: Math.max(1, bounds.height + pad * 2),
  };
}

export function exportSVG(svgString, options = {}) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(normalizeSvgMarkup(svgString), "image/svg+xml");
  const svg = xml.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== "svg") {
    return svgString;
  }
  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (svg.querySelector("image")) {
    if (!svg.getAttribute("xmlns:xlink")) {
      svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }
  }
  for (const el of svg.querySelectorAll("[data-arc-glow], [data-ghost-point], [data-circle-through-point]")) {
    el.remove();
  }
  const fallbackBounds = getFallbackBounds(svg, options);
  const baseBounds = options.tight
    ? computeTightBounds(new XMLSerializer().serializeToString(svg), fallbackBounds)
    : fallbackBounds;
  const bounds = options.tight ? padBounds(baseBounds, options.tightPadding ?? 8) : baseBounds;

  svg.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  svg.setAttribute("width", String(Math.ceil(bounds.width)));
  svg.setAttribute("height", String(Math.ceil(bounds.height)));

  if (options.background === "white") {
    const bg = xml.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", String(bounds.x));
    bg.setAttribute("y", String(bounds.y));
    bg.setAttribute("width", String(bounds.width));
    bg.setAttribute("height", String(bounds.height));
    bg.setAttribute("fill", "white");
    svg.insertBefore(bg, svg.firstChild);
  }

  return new XMLSerializer().serializeToString(xml);
}

export function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
