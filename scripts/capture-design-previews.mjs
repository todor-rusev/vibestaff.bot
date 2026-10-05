import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { designSceneData } from "./design-scene-data.mjs";

// Capture the real demo renderer with an explicitly authored example conversation.
// Usage: node scripts/capture-design-previews.mjs /path/to/viberoom/docs/demo
const source = resolve(process.argv[2] || "");
if (!process.argv[2])
  throw new Error("Pass the product's docs/demo directory.");
const output = fileURLToPath(
  new URL("../design-previews/assets/", import.meta.url),
);
await mkdir(output, { recursive: true });
const data = await designSceneData(source);
const room = data.state.rooms[0];
const serialized = `window.DEMO_DATA = ${JSON.stringify(data)};`;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".ico": "image/x-icon",
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://local").pathname);
  if (path === "/demo-data.js") {
    res.writeHead(200, { "content-type": "text/javascript" }).end(serialized);
    return;
  }
  const file = resolve(source, "." + path);
  if (!file.startsWith(source + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res
      .writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
      })
      .end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
try {
  for (const [name, pageName] of [
    ["classic", "vibeclassic"],
    ["dark", "vibeclassic-dark"],
    ["clay", "3d-clayful"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1360, height: 940 },
      deviceScaleFactor: 1,
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `http://127.0.0.1:${server.address().port}/${pageName}.html?room=${room.id}`,
    );
    await page.locator('.msg[data-seq="5"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: resolve(output, `room-${name}.png`) });
    if (name === "classic") {
      await page.setViewportSize({ width: 1000, height: 1200 });
      await page.waitForTimeout(500);
      for (let seq = 1; seq <= 5; seq++) {
        const row = page.locator(`.msg[data-seq="${seq}"] .bubble-col`);
        await row.screenshot({ path: resolve(output, `message-${seq}.png`) });
      }
    }
    console.log(name, errors);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
