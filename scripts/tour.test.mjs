import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

// Serve the committed artifact. No build tooling or external AI service is involved.
const root = fileURLToPath(new URL("../site/", import.meta.url));
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  const file = resolve(
    root,
    "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
  );
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res
      .writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const engine = process.argv[2] || "chromium";
const browser = await { chromium, firefox, webkit }[engine].launch();
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route("https://api.github.com/**", (r) =>
    r.fulfill({ status: 404, body: "{}" }),
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(base))
      errors.push(r.status() + " " + r.url());
  });
  await page.goto(base);
  await page.locator('body[data-ready="true"]').waitFor();
  const route = async (value) =>
    page.waitForFunction(
      (value) => document.body.dataset.route === value,
      value,
    );
  const navigate = async (value) => {
    await page.evaluate((value) => {
      location.hash = "#/" + value;
    }, value);
    await route(value);
  };
  assert.equal(await page.locator(".world-node").count(), 8);
  assert.equal(await page.locator(".world-link").count(), 7);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight > innerHeight,
    ),
    false,
    "the map fills one viewport",
  );
  assert.equal(
    await page
      .locator(".picture-art>img")
      .evaluateAll((imgs) =>
        imgs.every((i) => i.complete && i.naturalWidth > 0),
      ),
    true,
  );
  await page.mouse.move(30, 180);
  await page.waitForTimeout(600);
  const before = await page
    .locator("[data-depth]")
    .evaluateAll((nodes) =>
      nodes.map((e) => new DOMMatrix(getComputedStyle(e).transform).m41),
    );
  await page.mouse.move(1390, 810);
  await page.waitForTimeout(600);
  const after = await page
    .locator("[data-depth]")
    .evaluateAll((nodes) =>
      nodes.map((e) => new DOMMatrix(getComputedStyle(e).transform).m41),
    );
  const distances = after.map((n, i) => Math.abs(n - before[i]));
  assert.ok(
    distances[3] > 150 && distances[3] > distances[0] * 4,
    "foreground and background travel at visibly different depths",
  );
  const arm = page.locator(".mate-coral .arm-right");
  const armBefore = await arm.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForFunction(
    (before) =>
      getComputedStyle(document.querySelector(".mate-coral .arm-right"))
        .transform !== before,
    armBefore,
    { timeout: 5000 },
  );
  await page.locator('[data-feature="memory"]').click();
  await route("memory");
  assert.equal(await page.locator("#world").evaluate((e) => e.inert), true);
  await page.locator('[data-page="memory"] .dive-link').click();
  await route("memory/how");
  assert.equal(await page.locator('[data-page="memory/how"] li').count(), 3);
  await page.locator("#go-back").click();
  await route("memory");
  await page.locator("#go-back").click();
  await route("map");
  assert.equal(
    await page.evaluate(() => document.activeElement.dataset.feature),
    "memory",
  );
  await page.goForward();
  await route("memory");
  await page.keyboard.press("Escape");
  await route("map");
  for (const id of ["interface", "skills", "control", "open", "mobile"]) {
    await page.locator('[data-feature="' + id + '"]').click();
    await route(id);
    assert.equal(
      await page
        .locator('[data-page="' + id + '"] .feature-points section')
        .count(),
      3,
    );
    await page.locator('[data-page="' + id + '"] .dive-link').click();
    await route(id + "/how");
    await page.keyboard.press("Escape");
    await route(id);
    await page.keyboard.press("Escape");
    await route("map");
  }
  await page.mouse.move(45, 450);
  await page.mouse.down();
  await page.mouse.move(135, 510, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  await page.locator('#world[data-moving="false"]').waitFor();
  const pan = await page.locator("#world").getAttribute("data-center");
  await page.locator("#zoom-in").click();
  await page.waitForTimeout(650);
  await page.locator('#world[data-moving="false"]').waitFor();
  const scale = Number(await page.locator("#world").getAttribute("data-scale"));
  await page.locator('.site-header a[href="#/demo"]').click();
  await route("demo");
  await page.keyboard.press("Escape");
  await route("map");
  await page.waitForTimeout(950);
  await page.locator('#world[data-moving="false"]').waitFor();
  const restored = (await page.locator("#world").getAttribute("data-center"))
    .split(",")
    .map(Number);
  assert.ok(
    pan.split(",").every((n, i) => Math.abs(Number(n) - restored[i]) < 0.5),
    "back restores the map position",
  );
  assert.ok(
    Math.abs(
      Number(await page.locator("#world").getAttribute("data-scale")) - scale,
    ) < 0.003,
    "back restores map zoom",
  );
  await page.locator("#reset-view").click();
  await page.waitForTimeout(700);
  await navigate("demo");
  const room = page.locator("#room").contentFrame();
  assert.equal(await room.locator(".msg[data-seq]").count(), 8);
  const seek = async (time) =>
    page.locator("#seek").evaluate((e, t) => {
      e.value = t;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    }, time);
  await seek(0.05);
  const startCamera = await page.locator("#camera").getAttribute("style");
  await page.locator("#play").click();
  await page.waitForFunction(() => Number(document.body.dataset.demoTime) > 2);
  assert.match(
    await room.locator('.msg[data-seq="1"] .bubble').textContent(),
    /Orders are down 18%/,
  );
  assert.notEqual(
    await page.locator("#camera").getAttribute("style"),
    startCamera,
  );
  await page.locator("#play").click();
  const paused = await page.locator("body").getAttribute("data-demo-time");
  await page.waitForTimeout(150);
  assert.equal(
    await page.locator("body").getAttribute("data-demo-time"),
    paused,
  );
  await seek(16.3);
  assert.match(
    await room.locator('.msg[data-seq="5"] .bubble').textContent(),
    /desktop has the same timeouts/,
  );
  await seek(20);
  assert.match(
    await room.locator('.msg[data-seq="6"] .bubble').textContent(),
    /remount clears the payment token/,
  );
  await seek(28.2);
  assert.ok(
    await room
      .locator("path.flowchart-link")
      .first()
      .evaluate((e) => parseFloat(e.style.strokeDashoffset) > 0),
  );
  await seek(31);
  assert.equal(await room.locator("g.node").count(), 7);
  assert.match(
    await room.locator(".mm-out svg").textContent(),
    /Keep the form mounted/,
  );
  await seek(1);
  assert.equal(
    await room.locator('.msg[data-seq="8"] .bubble .words>p').textContent(),
    "",
  );
  await page.locator(".chapters button").nth(4).click();
  assert.equal(await page.locator("#cue-name").textContent(), "Kai");
  const running = Number(
    await page.locator("body").getAttribute("data-demo-time"),
  );
  await navigate("memory");
  await page.waitForTimeout(200);
  assert.ok(
    Number(await page.locator("body").getAttribute("data-demo-time")) -
      running <
      0.2,
    "film suspends outside its destination",
  );
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await navigate("map");
    await page.locator("#reset-view").click();
    await page.waitForTimeout(700);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      width + "px overflow",
    );
    await navigate("memory/how");
    assert.equal(
      await page.locator('[data-page="memory/how"]').isVisible(),
      true,
    );
    const pane = await page.locator("#journey").boundingBox();
    assert.ok(
      pane.x >= 0 && pane.x + pane.width <= width + 1,
      width + "px journey fits",
    );
    await navigate("demo");
    await page.waitForTimeout(100);
    await seek(31);
    const graph = await room.locator(".mm-out svg").boundingBox(),
      view = await page.locator("#viewport").boundingBox();
    assert.ok(
      graph.x >= view.x - 10 &&
        graph.x + graph.width <= view.x + view.width + 10,
      width + "px graph fits horizontally",
    );
    assert.ok(
      graph.y >= view.y - 12 &&
        graph.y + graph.height <= view.y + view.height + 12,
      width + "px graph fits vertically",
    );
  }
  await navigate("download");
  assert.equal(
    await page.locator('[data-role="button"][href="#npm"]').count(),
    3,
  );
  await page.locator('[data-role="button"]').first().click();
  assert.equal(
    await page.locator("body").getAttribute("data-route"),
    "download",
  );
  const deep = await context.newPage();
  await deep.goto(base + "/#/mobile/how");
  await deep.locator('body[data-route="mobile/how"]').waitFor();
  await deep.locator("#go-back").click();
  await deep.locator('body[data-route="mobile"]').waitFor();
  await deep.locator("#go-back").click();
  await deep.locator('body[data-route="map"]').waitFor();
  const quiet = await browser.newPage({ reducedMotion: "reduce" });
  await quiet.route("https://api.github.com/**", (r) =>
    r.fulfill({ status: 404, body: "{}" }),
  );
  await quiet.goto(base + "/#/demo");
  await quiet.locator('body[data-ready="true"]').waitFor();
  assert.equal(
    await quiet.locator("body").getAttribute("data-motion"),
    "false",
  );
  assert.equal(
    await quiet.locator("body").getAttribute("data-playing"),
    "false",
  );
  assert.equal(
    await quiet.locator("body").getAttribute("data-demo-time"),
    "34.00",
  );
  const plain = await browser.newPage({ javaScriptEnabled: false });
  await plain.goto(base);
  assert.equal(await plain.locator(".destination:visible").count(), 14);
  assert.equal(await plain.locator(".transcript").count(), 1);
  assert.equal(await plain.locator("[data-system]").count(), 3);
  assert.deepEqual(errors, []);
  console.log(
    engine +
      ": depth parallax, articulated movement, all destinations, nested navigation, restored pan/zoom, investigation, diagram, five widths, reduced motion and no-JS passed",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
