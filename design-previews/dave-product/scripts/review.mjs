import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../review/", import.meta.url));
await mkdir(root, { recursive: true });
const base = process.argv[2] || "http://127.0.0.1:4879/dave-product/";
const results = [];
for (const engine of [chromium, firefox, webkit].filter(
  (e) => !process.env.REVIEW_ENGINE || e.name() === process.env.REVIEW_ENGINE,
)) {
  const browser = await engine.launch();
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1040 },
    });
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith(base) && !r.ok())
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator("#options button").first().waitFor();
    assert.equal(
      await page
        .locator("#solo-room")
        .evaluate(
          (e) =>
            Math.abs(
              e.getBoundingClientRect().width - e.parentElement.clientWidth,
            ) < 2,
        ),
      true,
      "Entire real app fits the stage",
    );
    await page.locator("[data-option=codex]").click();
    await page.waitForURL("**/#agents/codex");
    await page.waitForFunction(
      () => document.querySelector("#solo-room").dataset.vendor === "codex",
    );
    assert.ok(
      (await page.locator("#solo-room").getAttribute("data-vendor")) ===
        "codex",
    );
    for (const vendor of ["gemini", "claude"]) {
      console.log(engine.name(), vendor);
      await page.locator(`[data-option=${vendor}]`).click();
      await page.waitForFunction(
        (v) => document.querySelector("#solo-room").dataset.vendor === v,
        vendor,
      );
      await page.frameLocator("#solo-room").locator(".mm-out svg").waitFor();
      await page.waitForLoadState("networkidle");
    }
    for (const feature of ["memory", "tools", "control", "mobile", "open"]) {
      await page.locator(`[data-chapter=${feature}]`).click();
      await page.waitForURL(`**/#${feature}`);
      await page.waitForFunction(
        (f) =>
          document
            .querySelector(`[data-chapter=${f}]`)
            .getAttribute("aria-current") === "page",
        feature,
      );
      await page.locator("#how").click();
      assert.equal(await page.locator("#steps li").count(), 3);
      assert.equal(await page.locator("#how-panel").isVisible(), true);
    }
    await page.goBack();
    assert.ok(page.url().endsWith("#mobile"));
    await page.goto(base + "#memory/history", { waitUntil: "networkidle" });
    assert.equal(
      await page.locator("[data-option=history]").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#enlarge").click();
    assert.equal(await page.locator("#zoom-dialog").isVisible(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#zoom-dialog").isVisible(), false);
    await page.waitForFunction(() => document.activeElement.id === "enlarge");
    await page.locator("#open-film").click();
    await page.waitForFunction(() => document.body.dataset.ready === "true");
    await page.waitForFunction(
      () => Number(document.body.dataset.demoTime) > 0.5,
    );
    await page.locator("#seek").fill("29");
    await page.locator("#seek").dispatchEvent("input");
    const filmContent = await page.evaluate(() => {
      const doc = document.querySelector("#room").contentDocument;
      return {
        messages: doc.querySelectorAll(".msg[data-seq]").length,
        nodes: doc.querySelectorAll(".mm-out g.node").length,
      };
    });
    assert.deepEqual(filmContent, { messages: 8, nodes: 7 });
    await page.screenshot({ path: root + engine.name() + "-film.png" });
    await page.locator("[data-close=film-dialog]").click();
    const stopped = await page.locator("body").getAttribute("data-demo-time");
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator("body").getAttribute("data-demo-time"),
      stopped,
      "Film stops outside its dialog",
    );
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1040 });
      await page.goto(base, { waitUntil: "networkidle" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `No horizontal overflow at ${width}`,
      );
      await page.screenshot({
        path: root + engine.name() + "-" + width + ".png",
        fullPage: width === 1440 || width === 390,
      });
      await page.locator("[data-chapter=open]").click();
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `Open-source panel at ${width}`,
      );
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base + "#tools/skills", { waitUntil: "networkidle" });
    await page.locator("#open-film").click();
    await page.waitForFunction(() => document.body.dataset.ready === "true");
    assert.equal(
      await page.locator("#play").getAttribute("aria-label"),
      "Play demo",
    );
    assert.equal(
      await page.locator("body").getAttribute("data-demo-time"),
      "34.00",
    );
    assert.deepEqual(errors, []);
    results.push({
      browser: engine.name(),
      passed: true,
      widths: [1440, 1024, 768, 390, 320],
      checks:
        "Routes, deep links, history, actual UI, dialog focus, motion demo, pause on close, diagram, reduced motion, no overflow or failed resources",
    });
    console.log(engine.name() + ": passed");
  } finally {
    await browser.close();
  }
}
await writeFile(root + "results.json", JSON.stringify(results, null, 2) + "\n");
