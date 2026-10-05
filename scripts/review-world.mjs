import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const out = process.argv[2],
  engine = process.argv[3] || "chromium";
if (!out) throw Error("Pass a screenshot directory");
await mkdir(out, { recursive: true });
const browser = await { chromium, firefox, webkit }[engine].launch();
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error" && !e.text().includes("404"))
      errors.push(e.text());
  });
  await page.route("https://api.github.com/**", (r) =>
    r.fulfill({ status: 404, body: "{}" }),
  );
  await page.goto("http://127.0.0.1:4877/");
  await page.locator('body[data-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/world.png` });
  for (const route of [
    "memory",
    "memory/how",
    "interface",
    "demo",
    "download",
  ]) {
    await page.evaluate((route) => {
      location.hash = "#/" + route;
    }, route);
    await page.waitForTimeout(1000);
    if (route === "demo")
      await page.locator("#seek").evaluate((e) => {
        e.value = 30.5;
        e.dispatchEvent(new Event("input"));
      });
    await page.screenshot({ path: `${out}/${route.replace("/", "-")}.png` });
  }
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => (location.hash = "#/map"));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${out}/world-${width}.png` });
    await page.evaluate(() => (location.hash = "#/memory"));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${out}/memory-${width}.png` });
    await page.evaluate(() => (location.hash = "#/demo"));
    await page.waitForTimeout(600);
    await page.locator("#seek").evaluate((e) => {
      e.value = 30.5;
      e.dispatchEvent(new Event("input"));
    });
    await page.screenshot({ path: `${out}/demo-${width}.png` });
  }
  console.log({ engine, errors });
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
