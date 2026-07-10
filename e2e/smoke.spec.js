import { test, expect } from "@playwright/test";
import { openApp, consoleErrors, getDoc, statusText } from "./helpers.js";

test.describe("app boot", () => {
  test("loads with an empty document and a rendered board", async ({ page }) => {
    await openApp(page);

    await expect(page).toHaveTitle(/Geometry Figure Generator/);
    await expect(page.locator("#jxgbox svg")).toBeVisible();
    await expect(statusText(page)).toContainText("Mode: Select");
    await expect(page.locator("#protocolWarning")).toBeHidden();

    const doc = await getDoc(page);
    expect(doc.objects).toEqual([]);

    expect(consoleErrors(page)).toEqual([]);
  });

  test("mode buttons switch tool mode and status text", async ({ page }) => {
    await openApp(page);

    for (const [mode, label] of [
      ["point", /point/i],
      ["segment", /segment/i],
      ["circle", /circle/i],
      ["select", /select/i],
    ]) {
      await page.click(`button[data-mode="${mode}"]`);
      await expect.poll(() => page.evaluate(() => window.__geoTest.mode())).toBe(mode);
      await expect(statusText(page)).toContainText(label);
    }
  });

  test("Escape returns to select mode", async ({ page }) => {
    await openApp(page);
    await page.click('button[data-mode="point"]');
    await page.keyboard.press("Escape");
    await expect.poll(() => page.evaluate(() => window.__geoTest.mode())).toBe("select");
  });
});
