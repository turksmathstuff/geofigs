function readSvgSize(svgString) {
  const xml = new DOMParser().parseFromString(svgString, "image/svg+xml");
  if (xml.querySelector("parsererror")) {
    return { width: 800, height: 600 };
  }
  const svg = xml.documentElement;

  const widthAttr = Number.parseFloat(svg.getAttribute("width"));
  const heightAttr = Number.parseFloat(svg.getAttribute("height"));
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr) && widthAttr > 0 && heightAttr > 0) {
    return { width: widthAttr, height: heightAttr };
  }

  const viewBox = (svg.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((v) => Number.isFinite(v));
  if (viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return { width: 800, height: 600 };
}

function ensureSvgNamespaces(svgString) {
  const xml = new DOMParser().parseFromString(svgString, "image/svg+xml");
  if (xml.querySelector("parsererror")) {
    return svgString;
  }
  const svg = xml.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== "svg") {
    return svgString;
  }
  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!svg.getAttribute("xmlns:xlink")) {
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  sanitizeSvgForCanvas(xml);
  return new XMLSerializer().serializeToString(xml);
}

function isSafeSvgUrl(value) {
  if (!value) {
    return true;
  }
  const text = String(value).trim().replace(/^['"]|['"]$/g, "");
  if (!text) {
    return true;
  }
  if (text.startsWith("#") || text.startsWith("data:")) {
    return true;
  }
  if (text.startsWith("http:") || text.startsWith("https:") || text.startsWith("//")) {
    return false;
  }
  return true;
}

function sanitizeCssUrls(cssText) {
  if (!cssText) {
    return cssText;
  }
  let cleaned = String(cssText);
  cleaned = cleaned.replace(/@import\s+[^;]+;?/gi, "");
  cleaned = cleaned.replace(/url\(([^)]+)\)/gi, (match, raw) => (isSafeSvgUrl(raw) ? match : "none"));
  return cleaned;
}

function sanitizeSvgForCanvas(xml) {
  const svg = xml?.documentElement;
  if (!svg) {
    return;
  }

  for (const node of [...xml.querySelectorAll("script,foreignObject")]) {
    node.remove();
  }

  for (const styleNode of [...xml.querySelectorAll("style")]) {
    styleNode.textContent = sanitizeCssUrls(styleNode.textContent || "");
  }

  for (const el of [...xml.querySelectorAll("*")]) {
    for (const attrName of ["href", "xlink:href"]) {
      const raw = el.getAttribute(attrName);
      if (!raw) {
        continue;
      }
      if (!isSafeSvgUrl(raw)) {
        const tag = el.tagName?.toLowerCase?.() || "";
        if (["image", "feimage", "use", "link"].includes(tag)) {
          el.remove();
          break;
        }
        el.removeAttribute(attrName);
      }
    }

    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
      el.setAttribute("style", sanitizeCssUrls(styleAttr));
    }

    for (const paintAttr of ["fill", "stroke", "filter", "clip-path", "mask"]) {
      const v = el.getAttribute(paintAttr);
      if (v && /\burl\(/i.test(v) && !/url\(\s*#/.test(v)) {
        el.removeAttribute(paintAttr);
      }
    }
  }
}

async function loadSvgImage(svgString) {
  const normalizedSvg = ensureSvgNamespaces(svgString);
  const img = new Image();
  img.crossOrigin = "anonymous";

  let blobUrl = null;
  try {
    const svgBlob = new Blob([normalizedSvg], { type: "image/svg+xml;charset=utf-8" });
    blobUrl = URL.createObjectURL(svgBlob);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("blob-url-load-failed"));
      img.src = blobUrl;
    });
    return { img, svgString: normalizedSvg, cleanup: () => URL.revokeObjectURL(blobUrl) };
  } catch (_err) {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Unable to convert SVG to PNG."));
      img.src = dataUrl;
    });
    return { img, svgString: normalizedSvg, cleanup: () => {} };
  }
}

export async function exportPNG(svgString, options) {
  const { img, svgString: normalizedSvg, cleanup } = await loadSvgImage(svgString);
  const sourceSize = readSvgSize(normalizedSvg);
  const canvas = document.createElement("canvas");
  const scale = Number(options.scale || 2);
  canvas.width = Math.max(1, Math.round(sourceSize.width * scale));
  canvas.height = Math.max(1, Math.round(sourceSize.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cleanup();
    throw new Error("Canvas rendering is unavailable.");
  }
  if (options.background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  try {
    return await new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas conversion failed."));
          }
        }, "image/png");
      } catch (err) {
        if (String(err?.message || "").toLowerCase().includes("tainted")) {
          reject(new Error("PNG export failed: canvas was tainted by an external SVG resource."));
          return;
        }
        reject(err);
      }
    });
  } finally {
    cleanup();
  }
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
