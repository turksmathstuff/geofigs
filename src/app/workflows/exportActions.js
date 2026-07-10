import { exportSVG, replaceExportLabels, triggerDownload } from "../../export/exportSvg.js";
import { exportPNG, downloadBlob } from "../../export/exportPng.js";
import { initPreviewLabelDrag } from "../../export/previewLabelDrag.js";
import { timestampForFile } from "../../utils/time.js";

export function createExportActionsWorkflow(ctx) {
  const { doc, session, boardController, renderCurrentDoc } = ctx;
  const { bgModeEl, exportLabelScaleEl, exportPointScaleEl, tightSvgEl, pngScaleEl } = ctx.dom;

  function readExportSettings() {
    return {
      background: bgModeEl.value,
      fontScale: Number(exportLabelScaleEl.value) || 1,
      pointScale: Number(exportPointScaleEl.value) || 1,
      tight: tightSvgEl.checked,
      pngScale: Number(pngScaleEl.value),
    };
  }

  function withExportSettings({ pointScale } = {}, fn) {
    session.exportPointHighlightsBlack = true;
    session.exportPointScale = pointScale ?? null;
    renderCurrentDoc(false);
    try {
      return fn();
    } finally {
      session.exportPointHighlightsBlack = false;
      session.exportPointScale = null;
      renderCurrentDoc(false);
    }
  }

  function buildExportSvg({ background, fontScale, pointScale, tight }) {
    const raw = withExportSettings({ pointScale }, () => boardController.exportBoardSvg());
    const withLabels = replaceExportLabels(raw, boardController.collectLabelExports(fontScale));
    return exportSVG(withLabels, { background, tight });
  }

  async function downloadSvg() {
    const { background, fontScale, pointScale, tight } = readExportSettings();
    const svg = buildExportSvg({ background, fontScale, pointScale, tight });
    const name = `figure-${timestampForFile()}.svg`;
    triggerDownload(name, svg, "image/svg+xml");
  }

  async function downloadPng() {
    const { background, fontScale, pointScale, pngScale } = readExportSettings();
    const svg = buildExportSvg({ background, fontScale, pointScale, tight: true });
    const blob = await exportPNG(svg, { background, scale: pngScale });
    const name = `figure-${timestampForFile()}.png`;
    downloadBlob(name, blob);
  }

  async function copySvg() {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard text copy is not available in this browser.");
    }
    const { background, fontScale, pointScale, tight } = readExportSettings();
    const svg = buildExportSvg({ background, fontScale, pointScale, tight });
    await navigator.clipboard.writeText(svg);
  }

  async function copyPng() {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Clipboard image copy is not available in this browser.");
    }
    const { background, fontScale, pointScale, pngScale } = readExportSettings();
    const svg = buildExportSvg({ background, fontScale, pointScale, tight: true });
    const blob = await exportPNG(svg, { background, scale: pngScale });
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type || "image/png"]: blob,
      }),
    ]);
  }

  async function previewExport() {
    const { background, fontScale, pointScale, tight } = readExportSettings();
    const svg = buildExportSvg({ background, fontScale, pointScale, tight });
    const content = doc.getElementById("exportPreviewContent");
    content.innerHTML = svg;
    const svgEl = content.querySelector("svg");
    const labelHint = doc.getElementById("exportPreviewLabelHint");
    if (svgEl) {
      const count = initPreviewLabelDrag(svgEl);
      if (labelHint) {
        labelHint.hidden = count === 0;
      }
    } else if (labelHint) {
      labelHint.hidden = true;
    }
    doc.getElementById("exportPreviewModal").removeAttribute("hidden");
  }

  function getPreviewSvgString() {
    const svgEl = doc.querySelector("#exportPreviewContent svg");
    if (!svgEl) {
      return null;
    }
    return new XMLSerializer().serializeToString(svgEl);
  }

  async function downloadPreviewSvg() {
    const svg = getPreviewSvgString();
    if (!svg) {
      return downloadSvg();
    }
    const name = `figure-${timestampForFile()}.svg`;
    triggerDownload(name, svg, "image/svg+xml");
  }

  async function downloadPreviewPng() {
    const svg = getPreviewSvgString();
    if (!svg) {
      return downloadPng();
    }
    const { background, pngScale } = readExportSettings();
    const blob = await exportPNG(svg, { background, scale: pngScale });
    const name = `figure-${timestampForFile()}.png`;
    downloadBlob(name, blob);
  }

  return {
    downloadSvg,
    downloadPng,
    copySvg,
    copyPng,
    previewExport,
    downloadPreviewSvg,
    downloadPreviewPng,
  };
}
