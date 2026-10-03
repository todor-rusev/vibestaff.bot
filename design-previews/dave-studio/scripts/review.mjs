import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.argv[2] || "http://127.0.0.1:4879/dave-studio/";
const out = fileURLToPath(new URL("../review/", import.meta.url));
await mkdir(out, { recursive: true });
const results = [];

async function review(name, engine) {
  const browser = await engine.launch();
  const result = { browser: name, checks: 0, errors: [], failedRequests: [] };
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => result.errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      result.failedRequests.push(`${r.status()} ${r.url()}`);
  });
  const check = (value, message) => {
    assert.ok(value, `${name}: ${message}`);
    result.checks++;
  };
  const child = (fn) => page.evaluate(fn);
  const childView = (view) =>
    page.waitForFunction(
      (v) =>
        document
          .querySelector("#demo")
          .contentDocument?.querySelector(`.shell.view-${v}`),
      view,
    );
  async function action(action) {
    await page.locator(`[data-action="${action}"]`).click();
    await page.waitForFunction((a) => location.hash === `#room/${a}`, action);
  }
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    check(
      (await page.locator("#demo").getAttribute("src")) === null,
      "demo stays unloaded until requested",
    );
    for (const width of [1920, 1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `no horizontal overflow at ${width}px`,
      );
    }
    await page.screenshot({ path: out + `${name}-320.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#year").fill("1");
    check(
      (await page.locator("#note-date").textContent()).includes("2026"),
      "timeline moves to the current year",
    );
    await page.locator("#pin-note").click();
    check(await page.locator("#pin-stamp").isVisible(), "note can be kept");
    await page.locator("#pin-note").click();
    check(await page.locator("#pin-stamp").isHidden(), "note can be unpinned");
    await page.locator('[data-service="sentry"]').click();
    check(
      (await page.locator("#service-copy").textContent()).includes("error"),
      "service changes its explanation",
    );
    for (const look of ["classic-dark", "clay", "classic"]) {
      await page.locator(`[data-look="${look}"]`).click();
      await page.waitForFunction(
        (l) =>
          document.querySelector("#look-image").src.endsWith(`room-${l}.png`),
        look,
      );
      check(true, `${look} preview loads`);
    }
    const opener = page.locator(".poster-image");
    await opener.click();
    await page.waitForFunction(
      () => document.querySelector("#demo-loading").hidden,
    );
    await childView("room");
    check(
      await child(
        () =>
          document
            .querySelector("#demo")
            .contentWindow.DEMO_DATA.state.rooms[0].participants.filter(
              (p) => p.kind === "agent",
            ).length === 1,
      ),
      "the room starts with one agent",
    );
    await action("search");
    await page.waitForFunction(() =>
      document
        .querySelector("#demo")
        .contentDocument.querySelector("#search-panel")
        ?.innerText.includes("2 hits"),
    );
    check(true, "native search finds both years");
    await action("pins");
    await page.waitForFunction(
      () =>
        document
          .querySelector("#demo")
          .contentDocument.querySelector("#pins-panel")?.hidden === false,
    );
    check(
      await child(() =>
        document
          .querySelector("#demo")
          .contentDocument.querySelector("#pins-panel")
          .textContent.includes("guest checkout"),
      ),
      "native pin contains the original decision",
    );
    await action("connections");
    await childView("connections");
    check(true, "actual Connections page opens");
    await action("skills");
    await childView("skills");
    check(true, "actual Skills page opens");
    await action("room");
    await childView("room");
    check(
      await child(
        () =>
          document
            .querySelector("#demo")
            .contentDocument.querySelector("#search").value === "",
      ),
      "returning clears the search",
    );
    await action("play");
    await page.waitForFunction(
      () => document.querySelector("#studio").dataset.beat === "1",
    );
    await page.locator("#stop-scene").click();
    await page.waitForFunction(
      () => document.querySelector("#studio").dataset.playing === "false",
    );
    const before = await child(
      () =>
        document
          .querySelector("#demo")
          .contentWindow.DEMO_DATA.state.rooms[0].messages.at(-1).text,
    );
    await page.waitForTimeout(650);
    check(
      (await child(
        () =>
          document
            .querySelector("#demo")
            .contentWindow.DEMO_DATA.state.rooms[0].messages.at(-1).text,
      )) === before,
      "pause stops the stream",
    );
    await page.locator("#stop-scene").click();
    await page.waitForFunction(
      (t) =>
        document
          .querySelector("#demo")
          .contentWindow.DEMO_DATA.state.rooms[0].messages.at(-1).text !== t,
      before,
    );
    check(true, "resume continues the stream");
    await page.locator("#close-studio").click();
    await page.waitForFunction(() => !document.querySelector("#studio").open);
    check(
      await child(() =>
        document
          .querySelector("#demo")
          .contentWindow.DEMO_DATA.state.rooms[0].messages.every(
            (m) => !m.streaming,
          ),
      ),
      "close stops the scene",
    );
    check(
      await page.evaluate(
        () =>
          document.activeElement === document.querySelector(".poster-image"),
      ),
      "close restores focus",
    );
    await opener.click();
    await page.waitForFunction(() => document.querySelector("#studio").open);
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector("#studio").open);
    check(true, "browser Back closes the room");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base + "?review=reduced#room/play", { waitUntil: "load" });
    await page.waitForFunction(() =>
      document
        .querySelector("#demo")
        .contentDocument?.querySelector('.msg[data-seq="10"] .mm-out svg'),
    );
    await page.waitForFunction(
      () => document.querySelector("#studio").dataset.playing === "false",
    );
    check(
      await child(
        () =>
          document.querySelector("#demo").contentWindow.DEMO_DATA.state.rooms[0]
            .messages.length === 8,
      ),
      "reduced motion presents the whole example",
    );
    const graphWidth = await child(
      () =>
        document
          .querySelector("#demo")
          .contentDocument.querySelector('.msg[data-seq="10"] .mm-out svg')
          .viewBox.baseVal.width,
    );
    check(
      graphWidth > 100 && graphWidth < 1500,
      "diagram has readable geometry in reduced motion",
    );
    await page.mouse.move(1, 1);
    await page.screenshot({ path: out + `${name}-demo.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() =>
      document
        .querySelector("#demo")
        .contentDocument.querySelector(".shell")
        .classList.contains("side-collapsed"),
    );
    check(true, "product folds its own sidebar on a phone");
    await page.screenshot({ path: out + `${name}-mobile-demo.png` });
    await page.locator("#close-studio").click();
    await page.waitForFunction(() => !document.querySelector("#studio").open);
    check(true, "direct link can be closed without leaving the site");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-demo="mobile"]').click();
    await childView("settings");
    await page.waitForFunction(() =>
      document
        .querySelector("#demo")
        .contentDocument.body.innerText.includes("Telegram"),
    );
    check(true, "mobile opens the actual Channels settings");
    await page.locator("#close-studio").click();
    await page.waitForFunction(() => !document.querySelector("#studio").open);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: out + `${name}-desktop.png`,
      fullPage: true,
    });
    check(result.errors.length === 0, "no JavaScript errors");
    check(result.failedRequests.length === 0, "no failed asset requests");
  } catch (e) {
    result.failure = e.stack;
    await page
      .screenshot({ path: out + `${name}-failure.png` })
      .catch(() => {});
  } finally {
    await browser.close();
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
await Promise.all([
  review("chromium", chromium),
  review("firefox", firefox),
  review("webkit", webkit),
]);
await writeFile(out + "results.json", JSON.stringify(results, null, 2));
if (results.some((r) => r.failure)) process.exitCode = 1;
