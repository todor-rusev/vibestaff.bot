import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const out = fileURLToPath(
  new URL("../design-previews/renders/", import.meta.url),
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1240 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requested = process.argv.slice(2).map(Number);
  const directions = requested.length ? requested : [1, 2, 3, 4, 5];
  if (directions.some((direction) => ![1, 2, 3, 4, 5].includes(direction))) {
    throw new Error("Choose visual directions from 1 to 5.");
  }
  for (const direction of directions) {
    await page.goto(`http://127.0.0.1:4878/?v=${direction}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(out, `${direction}-desktop.png`) });
    await page.locator("#storyboard").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(out, `${direction}-storyboard.png`),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:4878/?v=${direction}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: resolve(out, `${direction}-mobile-top.png`),
    });
    await page.screenshot({
      path: resolve(out, `${direction}-mobile.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    console.log({ direction, overflow });
    console.log(
      await page.locator("h1").evaluate((e) => ({
        titleWidth: e.clientWidth,
        textWidth: e.scrollWidth,
      })),
    );
    await page.setViewportSize({ width: 1440, height: 1240 });
  }
  console.log({ errors });
} finally {
  await browser.close();
}
