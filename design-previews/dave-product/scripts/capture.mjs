import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { designSceneData } from "../../../scripts/design-scene-data.mjs";

const source = resolve(process.argv[2]);
const output = fileURLToPath(new URL("../assets/screens/", import.meta.url));
await mkdir(output, { recursive: true });
const scene = {
  title: "Launch day",
  slug: "launch-day",
  topic: "A clear plan for our next launch",
  emoji: "✦",
  beats: [
    {
      from: "human",
      fromName: "You",
      to: ["claude-nova"],
      toNames: ["Nova"],
      text: "@Nova Turn my notes into a launch plan. What needs to happen first — and what can run in parallel?",
    },
    {
      from: "claude-nova",
      fromName: "Nova",
      to: ["human"],
      toNames: ["You"],
      text: "**Here is the critical path.**\n\nFinish the offer, test a real payment, then open the doors. Photography can happen alongside the payment test.\n\n```mermaid\nflowchart LR\n A[Agree the offer] --> B[Test a payment]\n A --> C[Product photos]\n B --> D[Launch day]\n C --> D\n```\n\n- **Today:** agree the offer and the owner of each task.\n- **Tomorrow:** test payment and prepare the photos.\n- **Before launch:** check both paths, then publish.\n\nI have kept the dependencies visible so nothing gets lost between the tasks.",
    },
  ],
};
const base = await designSceneData(source, scene);
base.state.settings.appearance.chatFontSize = 18;
base.state.rooms[0].messages[1].pinned = true;
base.state.rooms[0].focused = false;
const variants = {};
for (const vendor of ["claude", "codex", "gemini"]) {
  const d = structuredClone(base);
  const p = d.state.rooms[0].participants.find((p) => p.kind === "agent");
  p.agentType = vendor;
  p.agentVendor = { claude: "Claude", codex: "Codex", gemini: "Gemini" }[
    vendor
  ];
  p.agentLabel = p.agentVendor;
  p.tagline = "Make the next step clear";
  p.model = null;
  p.configOptions = [];
  p.agentInfo = { name: p.agentVendor };
  variants[vendor] = d;
}
let active = "claude";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
const server = createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, "http://local").pathname);
  if (name === "/demo-data.js")
    return res
      .writeHead(200, { "content-type": "text/javascript" })
      .end(`window.DEMO_DATA=${JSON.stringify(variants[active])};`);
  const file = resolve(source, "." + name);
  if (!file.startsWith(source + sep)) return res.writeHead(403).end();
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
  const page = await browser.newPage({
    viewport: { width: 1080, height: 790 },
    deviceScaleFactor: 1.5,
  });
  async function open(vendor = "claude") {
    active = vendor;
    await page.goto(
      `http://127.0.0.1:${server.address().port}/vibeclassic.html?room=${base.state.rooms[0].id}`,
    );
    await page.locator(".mm-out svg").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        ":root{zoom:1!important}*,*::before,*::after{animation:none!important;caret-color:transparent!important}",
    });
    await page.locator("#messages").evaluate((e) => (e.scrollTop = 0));
    await page.waitForTimeout(300);
  }
  async function save(name) {
    await page.screenshot({ path: output + name + ".png" });
    console.log("Captured " + name);
  }
  for (const vendor of Object.keys(variants)) {
    await open(vendor);
    await save(vendor);
    const html = await page.evaluate(() => {
      const doc = document.documentElement.cloneNode(true);
      doc
        .querySelectorAll(
          'script,link[rel="icon"],link[rel="apple-touch-icon"]',
        )
        .forEach((e) => e.remove());
      const app = doc.querySelector("#app");
      app.setAttribute("inert", "");
      doc.querySelector("body").replaceChildren(app);
      const base = document.createElement("base");
      base.href = "../film-room/";
      doc.querySelector("head").prepend(base);
      const style = document.createElement("style");
      style.textContent =
        "body{pointer-events:none;overflow:hidden}.mm-out foreignObject{overflow:visible}";
      doc.querySelector("head").append(style);
      return ("<!doctype html>\n" + doc.outerHTML).replace(/[ \t]+$/gm, "");
    });
    await writeFile(resolve(output, "../" + vendor + "-room.html"), html);
  }
  await open();
  await page.locator("#pins-btn").click();
  await save("pins");
  await page.locator("#pins-btn").click();
  await page.locator("#search").fill("payment");
  await page.waitForTimeout(600);
  await save("history");
  await page.locator('[data-nav="connections"]').click();
  await page.waitForTimeout(200);
  await page
    .getByText("Connected", { exact: true })
    .evaluate((e) => e.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(200);
  await save("connections");
  await page.locator('[data-nav="skills"]').click();
  await page.waitForTimeout(200);
  await save("skills");
  await page.locator('[data-nav="settings"]').click();
  await page.waitForTimeout(200);
  await save("settings");
  await writeFile(
    output + "settings-text.txt",
    await page.locator("body").innerText(),
  );
  console.log((await page.locator("body").innerText()).slice(0, 3500));
  await page.getByText("Long-term memory", { exact: true }).first().click();
  await page.waitForTimeout(200);
  await save("memory");
  await page.getByText("Channels", { exact: true }).first().click();
  await page.waitForTimeout(200);
  await save("mobile");
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
