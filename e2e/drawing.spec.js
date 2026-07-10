import { test, expect } from "@playwright/test";
import { openApp, consoleErrors, getDoc, objectsOfType, clickBoard, selectMode } from "./helpers.js";

test.describe("drawing tools", () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test.afterEach(async ({ page }) => {
    expect(consoleErrors(page)).toEqual([]);
  });

  test("point tool places free points where clicked", async ({ page }) => {
    await selectMode(page, "point");
    await clickBoard(page, -4, 2);
    await clickBoard(page, 3, -1);

    const points = await objectsOfType(page, "point");
    expect(points).toHaveLength(2);
    expect(points[0].x).toBeCloseTo(-4, 0);
    expect(points[0].y).toBeCloseTo(2, 0);
    expect(points[1].x).toBeCloseTo(3, 0);
    expect(points[1].y).toBeCloseTo(-1, 0);
  });

  test("segment tool creates two points and a segment", async ({ page }) => {
    await selectMode(page, "segment");
    await clickBoard(page, -3, 0);
    await clickBoard(page, 3, 2);

    const doc = await getDoc(page);
    const points = doc.objects.filter((o) => o.type === "point");
    const segments = doc.objects.filter((o) => o.type === "segment");
    expect(points).toHaveLength(2);
    expect(segments).toHaveLength(1);
    expect(points.map((p) => p.id)).toEqual(expect.arrayContaining(segments[0].pointIds));
  });

  test("circle tool creates a circle from center and radius clicks", async ({ page }) => {
    await selectMode(page, "circle");
    await clickBoard(page, 0, 0);
    await clickBoard(page, 3, 0);

    const circles = await objectsOfType(page, "circle");
    expect(circles).toHaveLength(1);
  });

  test("undo and redo round-trip a point placement", async ({ page }) => {
    await selectMode(page, "point");
    await clickBoard(page, 1, 1);
    expect(await objectsOfType(page, "point")).toHaveLength(1);

    await page.click('button[data-action="undo"]');
    expect(await objectsOfType(page, "point")).toHaveLength(0);

    await page.click('button[data-action="redo"]');
    expect(await objectsOfType(page, "point")).toHaveLength(1);
  });

  test("selected object can be deleted with the keyboard", async ({ page }) => {
    await selectMode(page, "point");
    await clickBoard(page, 2, 2);
    await selectMode(page, "select");

    await clickBoard(page, 2, 2);
    await expect.poll(() => page.evaluate(() => window.__geoTest.selectedIds().length)).toBe(1);

    await page.keyboard.press("Delete");
    expect(await objectsOfType(page, "point")).toHaveLength(0);
  });

  test("marquee drag in select mode selects multiple objects", async ({ page }) => {
    await selectMode(page, "point");
    await clickBoard(page, -2, 1);
    await clickBoard(page, 2, 1);
    await selectMode(page, "select");

    const from = await page.evaluate(() => window.__geoTest.userToScreen(-5, 4));
    const to = await page.evaluate(() => window.__geoTest.userToScreen(5, -2));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();

    await expect.poll(() => page.evaluate(() => window.__geoTest.selectedIds().length)).toBe(2);
  });
});
