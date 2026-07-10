import { expect } from "@playwright/test";

/**
 * Load the app with the ?e2e=1 test hook enabled and wait until the board
 * and window.__geoTest are ready. Also collects console errors / page errors
 * onto page._geoErrors so tests can assert none occurred.
 */
export async function openApp(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page._geoErrors = errors;

  await page.goto("/?e2e=1");
  await page.waitForFunction(() => window.__geoTest && document.querySelector("#jxgbox svg"));
  return page;
}

export function consoleErrors(page) {
  return page._geoErrors ?? [];
}

/** Current figure document (deep snapshot). */
export function getDoc(page) {
  return page.evaluate(() => window.__geoTest.docSnapshot());
}

/** Objects of a given type from the current document. */
export async function objectsOfType(page, type) {
  const doc = await getDoc(page);
  return doc.objects.filter((o) => o.type === type);
}

/** Click the board at user (math) coordinates. */
export async function clickBoard(page, x, y, options = {}) {
  const pos = await page.evaluate(([ux, uy]) => window.__geoTest.userToScreen(ux, uy), [x, y]);
  await page.mouse.click(pos.x, pos.y, options);
}

/** Activate a tool via its toolbar button, e.g. mode "point" or id "makeMidpoint". */
export async function selectMode(page, mode) {
  await page.click(`button[data-mode="${mode}"]`);
  await expect.poll(() => page.evaluate(() => window.__geoTest.mode())).toBe(mode);
}

export function statusText(page) {
  return page.locator("#statusText");
}
