import { test, expect } from "@playwright/test";
import { openApp, clickBoard, selectMode } from "./helpers.js";

test.describe("export and save", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__geoClipboard = { text: "", writes: [] };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            window.__geoClipboard.text = text;
          },
          write: async (items) => {
            window.__geoClipboard.writes.push(items);
          },
        },
      });
      window.ClipboardItem = class ClipboardItem {
        constructor(items) {
          this.items = items;
        }
      };
    });
    await openApp(page);
    await selectMode(page, "segment");
    await clickBoard(page, -3, -1);
    await clickBoard(page, 3, 1);
  });

  test("Download SVG produces an .svg file containing the figure", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.click("#downloadSvg");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.svg$/);
    const content = await streamToString(await download.createReadStream());
    expect(content).toContain("<svg");
    expect(content).toContain("line");
  });

  test("Save .geofig produces a document that reopens", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.click("#saveDoc");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.geofig$/);
    const raw = await streamToString(await download.createReadStream());
    const saved = JSON.parse(raw);
    const doc = saved.doc ?? saved;
    expect(doc.objects.filter((o) => o.type === "segment")).toHaveLength(1);
    expect(doc.objects.filter((o) => o.type === "point")).toHaveLength(2);
  });

  test("Copy SVG writes the exported SVG source to the clipboard", async ({ page }) => {
    await page.click("#copySvg");

    const copied = await page.evaluate(() => window.__geoClipboard.text);
    expect(copied).toContain("<svg");
    expect(copied).toContain("line");
    await expect(page.locator("#appModalDialog")).toContainText("SVG copied to clipboard.");
  });

  test("Copy PNG writes an image/png clipboard item", async ({ page }) => {
    await page.click("#copyPng");
    await expect(page.locator("#appModalDialog")).toContainText("PNG copied to clipboard.");

    const copiedTypes = await page.evaluate(() =>
      window.__geoClipboard.writes.map((items) =>
        items.map((item) => Object.keys(item.items))
      )
    );
    expect(copiedTypes).toEqual([[["image/png"]]]);
  });
});

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
