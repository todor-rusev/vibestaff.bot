import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative, sep, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { designSceneData } from "./design-scene-data.mjs";
import { investigationScene } from "../site/assets/investigation-scene.js";

// Export the actual demo's rendered DOM and the assets it uses, without its
// application runtime or fixture payload. Motion is added by the parent page.
if (!process.argv[2])
  throw new Error("Pass the product's docs/demo directory.");
const source = resolve(process.argv[2]);
const production = process.argv.includes("--site");
const output = fileURLToPath(
  new URL(
    production ? "../site/demo/room/" : "../design-previews/motion/room/",
    import.meta.url,
  ),
);
const data = await designSceneData(
  source,
  production ? investigationScene : undefined,
);
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
  const path = decodeURIComponent(new URL(req.url, "http://local").pathname);
  if (path === "/demo-data.js")
    return res
      .writeHead(200, { "content-type": "text/javascript" })
      .end(`window.DEMO_DATA=${JSON.stringify(data)};`);
  const file = resolve(source, "." + path);
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
    viewport: { width: 1280, height: production ? 2100 : 960 },
    locale: "en-US",
  });
  const assets = new Set();
  const errors = [];
  page.on("response", (response) => {
    const path = decodeURIComponent(new URL(response.url()).pathname).slice(1);
    if (response.ok() && /\.(css|svg|png|webp|woff2?|ico)$/.test(path))
      assets.add(path);
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/vibeclassic-dark.html?room=${data.state.rooms[0].id}`,
  );
  await page
    .locator(`.msg[data-seq="${data.state.rooms[0].messages.length}"]`)
    .waitFor();
  if (production) await page.locator(".mermaid-block .mm-out svg").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  if (errors.length) throw new Error(errors.join("\n"));
  const html = await page.evaluate(() => {
    const doc = document.documentElement.cloneNode(true);
    doc
      .querySelectorAll('script,link[rel="icon"],link[rel="apple-touch-icon"]')
      .forEach((node) => node.remove());
    const app = doc.querySelector("#app");
    app.setAttribute("inert", "");
    doc.querySelector("body").replaceChildren(app);
    app
      .querySelectorAll(
        '.context-menu,.popover,[role="dialog"],#rooms-view,#home-view',
      )
      .forEach((node) => node.remove());
    app
      .querySelectorAll("[contenteditable]")
      .forEach((node) => node.removeAttribute("contenteditable"));
    doc.querySelector("title").textContent = "viberoom · example conversation";
    const style = document.createElement("style");
    style.textContent =
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}body{overflow:hidden;pointer-events:none}#messages{scroll-behavior:auto!important}.msg{will-change:opacity}.motion-speaking .bubble{box-shadow:0 0 0 2px #ac8cff66,0 0 40px #9368ff20!important}";
    // Mermaid stores label bounds measured by the export browser. Allow the
    // same font's small metric differences in other engines inside node padding.
    style.textContent += ".mm-out foreignObject{overflow:visible}";
    doc.querySelector("head").append(style);
    return "<!doctype html>\n" + doc.outerHTML;
  });
  await mkdir(output, { recursive: true });
  const trimLineEnds = (text) =>
    text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
  await writeFile(resolve(output, "index.html"), trimLineEnds(html));
  await writeFile(
    resolve(output, "LICENSE"),
    await readFile(resolve(source, "../../LICENSE")),
  );
  await mkdir(resolve(output, "fonts"), { recursive: true });
  await writeFile(
    resolve(output, "fonts/OFL.txt"),
    await readFile(
      new URL("../design-previews/assets/fonts/OFL.txt", import.meta.url),
    ),
  );
  for (const path of assets) {
    const target = resolve(output, path);
    if (!target.startsWith(output)) throw new Error("Unexpected resource path");
    await mkdir(dirname(target), { recursive: true });
    if (
      production &&
      path.startsWith("fonts/") &&
      path !== "fonts/nunito.css" &&
      !path.endsWith(".woff2")
    )
      continue;
    const content = await readFile(resolve(source, path));
    let text = /\.(css|svg)$/.test(path)
      ? trimLineEnds(content.toString("utf8"))
      : null;
    if (production && text !== null) {
      // The recording has one selected font; keep only the font faces it loads.
      if (path === "theme.css")
        text = text.replace(
          /@import url\("fonts\/(?!nunito\.css)[^"]+"\);\n/g,
          "",
        );
      if (path === "fonts/nunito.css")
        text = text.replace(/@font-face\s*\{[^}]+\}/g, (face) =>
          [...assets].some(
            (asset) =>
              asset.endsWith(".woff2") &&
              face.includes(asset.split("/").at(-1)),
          )
            ? face
            : "",
        );
      text = text.replace(/\/\*[\s\S]*?\*\//g, "");
    }
    await writeFile(target, text === null ? content : text);
  }
  console.log(
    `Exported real demo DOM + ${assets.size} assets to ${relative(process.cwd(), output)}.`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
