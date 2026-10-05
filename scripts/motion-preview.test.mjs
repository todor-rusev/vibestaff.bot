import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";

const url = process.env.MOTION_PREVIEW_URL || "http://127.0.0.1:4879/motion/";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(url);
    await page.locator('body[data-ready="true"]').waitFor();
    const seek = async (time) =>
      page.locator("#seek").evaluate((e, t) => {
        e.value = t;
        e.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);
    const room = page.locator("#room").contentFrame();
    const user = room.locator('.msg[data-seq="1"] .bubble');
    await seek(1.2);
    const textBefore = await user.textContent();
    const cameraBefore = await page.locator("#camera").getAttribute("style");
    await page.locator("#play").click();
    await page.waitForTimeout(900);
    assert.ok(
      (await user.textContent()).length > textBefore.length,
      `${name}: text types during playback`,
    );
    assert.notEqual(
      await page.locator("#camera").getAttribute("style"),
      cameraBefore,
      `${name}: camera moves during playback`,
    );
    await page.locator("#play").click();
    const paused = await page.locator("body").getAttribute("data-demo-time");
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator("body").getAttribute("data-demo-time"),
      paused,
      `${name}: pause freezes time`,
    );
    for (const [time, seq] of [
      [6, 1],
      [13, 2],
      [19, 3],
      [25, 4],
      [31, 5],
    ]) {
      await seek(time);
      assert.ok(
        (await room.locator(`.msg[data-seq="${seq}"] .bubble`).textContent())
          .length > 50,
      );
      assert.equal(
        await room
          .locator(`.msg[data-seq="${seq}"]`)
          .evaluate((e) => e.style.opacity),
        "1",
      );
    }
    await seek(0);
    assert.equal(
      await room.locator('.msg[data-seq="5"] .bubble').textContent(),
      "",
    );
    await page.locator(".chapters button").nth(3).click();
    assert.equal(await page.locator("#cue-name").textContent(), "Rio");
    await seek(36);
    assert.match(
      await room.locator('.msg[data-seq="5"] .bubble').textContent(),
      /What would you like to change/,
    );
    const field = page.locator(".field-blue");
    await page.mouse.move(40, 40);
    await page.waitForTimeout(180);
    const before = await field.evaluate((e) => getComputedStyle(e).transform);
    await page.mouse.move(1380, 1080);
    await page.waitForTimeout(250);
    assert.notEqual(
      await field.evaluate((e) => getComputedStyle(e).transform),
      before,
      `${name}: depth responds to pointer`,
    );
    await page.locator("#motion-toggle").click();
    assert.equal(
      await page.locator("body").getAttribute("data-motion"),
      "false",
    );
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1200 });
      await page.waitForTimeout(120);
      await seek(31);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name}: ${width}px overflow`,
      );
      const visibility = await room
        .locator('.msg[data-seq="5"] .bubble')
        .evaluate((e) => ({
          bottom: e.getBoundingClientRect().bottom,
          limit: document.querySelector("#messages").getBoundingClientRect()
            .bottom,
        }));
      assert.ok(
        visibility.bottom <= visibility.limit + 1,
        `${name}: last response is not clipped at ${width}px: ${JSON.stringify(visibility)}`,
      );
    }
    const quiet = await browser.newPage({
      viewport: { width: 1280, height: 960 },
      reducedMotion: "reduce",
    });
    quiet.on("pageerror", (e) => errors.push(e.message));
    await quiet.goto(url);
    await quiet.locator('body[data-ready="true"]').waitFor();
    assert.equal(
      await quiet.locator("body").getAttribute("data-playing"),
      "false",
    );
    assert.equal(
      await quiet.locator("body").getAttribute("data-motion"),
      "false",
    );
    assert.equal(
      await quiet.locator("body").getAttribute("data-demo-time"),
      "36.00",
    );
    assert.deepEqual(errors, []);
    console.log(
      `${name}: playback, pause, seek, chapters, parallax, 5 sizes, reduced motion — passed`,
    );
  } finally {
    await browser.close();
  }
}
