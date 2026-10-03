import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const out = fileURLToPath(
  new URL("../design-previews/motion/renders/", import.meta.url),
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("http://127.0.0.1:4879/motion/");
  await page.locator('body[data-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#play").click();
  const seek = async (time) =>
    page.locator("#seek").evaluate((el, t) => {
      el.value = t;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, time);
  for (const time of [0, 6, 13, 19, 25, 31, 36]) {
    await seek(time);
    await page.screenshot({ path: `${out}/desktop-${time}.png` });
  }
  await page.mouse.move(1350, 260);
  await page.waitForTimeout(550);
  await page.screenshot({ path: `${out}/parallax.png` });
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    await seek(13);
    await page.screenshot({
      path: `${out}/width-${width}.png`,
      fullPage: true,
    });
    const issues = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      titleOverflow:
        document.querySelector("h1").scrollWidth >
        document.querySelector("h1").clientWidth,
    }));
    console.log(width, issues);
  }
  console.log("errors", errors);
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
