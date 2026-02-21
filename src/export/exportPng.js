function readSvgSize(svgString) {
  const xml = new DOMParser().parseFromString(svgString, "image/svg+xml");
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

export async function exportPNG(svgString, options) {
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  img.src = svgUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Unable to convert SVG to PNG."));
  });
  URL.revokeObjectURL(svgUrl);

  const sourceSize = readSvgSize(svgString);
  const canvas = document.createElement("canvas");
  const scale = Number(options.scale || 2);
  canvas.width = Math.max(1, Math.round(sourceSize.width * scale));
  canvas.height = Math.max(1, Math.round(sourceSize.height * scale));

  const ctx = canvas.getContext("2d");
  if (options.background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas conversion failed."));
      }
    }, "image/png");
  });
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
