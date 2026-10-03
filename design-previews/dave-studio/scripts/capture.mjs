import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = process.argv[2] || "http://127.0.0.1:4879/dave-studio/";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1.5,
  });
  await page.goto(base + "demo/", { waitUntil: "networkidle" });
  await page.locator(".mm-out svg").waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const look of ["classic", "classic-dark", "clay"]) {
    await page.evaluate((v) => window.STUDIO_DEMO.look(v), look);
    await page.waitForTimeout(250);
    await page
      .locator("#messages")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    await page.screenshot({ path: root + `assets/room-${look}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: root + "review/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: root + "review/mobile.png", fullPage: true });
  console.log("Captured the three real product looks and the new site.");
} finally {
  await browser.close();
}
