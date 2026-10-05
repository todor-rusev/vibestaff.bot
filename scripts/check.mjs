#!/usr/bin/env node
/*
 * check.mjs — the gate the site passes before it is published, run both by the sync script here and by
 * the deploy workflow in the public repository. Three guards, each of them for a failure that has actually
 * happened to a site of ours:
 *
 *   presence — a commit that silently LOSES a page must fail here, not serve 404s to visitors
 *              (the riglane.dev outage class, 2026-08-30).
 *   links    — every local href/src must resolve to a file that exists. A renamed asset is invisible in
 *              a diff and obvious to the first person who opens the page.
 *   leaks    — the private workspace's words, paths and Cyrillic never travel. The author's name is
 *              allowed in exactly one shape: the public GitHub addresses.
 *
 * Usage: node scripts/check.mjs [site-dir]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = resolve(process.argv[2] || join(ROOT, "site"));

const problems = [];
const fail = (what) => problems.push(what);

/** Every file under the site, as paths relative to it. */
function walk(dir, into = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, into);
    else into.push(relative(SITE, full).replaceAll("\\", "/"));
  }
  return into;
}

let files;
try {
  files = walk(SITE);
} catch (error) {
  console.error(
    `[check] the site is not where it should be: ${SITE} (${error.message})`,
  );
  process.exit(1);
}
const has = new Set(files);

// --- 1. presence ---------------------------------------------------------------------------------

const REQUIRED = [
  "index.html",
  "404.html",
  "CNAME",
  "robots.txt",
  "assets/site.css",
  "assets/download.js",
  "assets/world.css",
  "assets/world.js",
  "assets/world-map.js",
  "assets/film.css",
  "assets/demo-player.js",
  "assets/investigation-scene.js",
  "assets/world/studio.webp",
  "assets/world/memory.webp",
  "assets/world/connections.webp",
  "assets/world/mobile.webp",
  "demo/room/index.html",
  "assets/logo.svg",
  "compositions/teamwork.html",
  "get/windows/index.html",
  "get/mac/index.html",
  "get/linux/index.html",
];
// CNAME and robots.txt are short by nature and checked by their contents below; the pages are not
const BY_CONTENT = new Set(["CNAME", "robots.txt"]);
for (const needed of REQUIRED) {
  if (!has.has(needed)) fail(`missing: ${needed}`);
  else if (!BY_CONTENT.has(needed) && statSync(join(SITE, needed)).size < 400)
    fail(`suspiciously empty: ${needed}`);
}

const DOMAIN = "vibestaff.bot";
if (has.has("CNAME")) {
  const cname = readFileSync(join(SITE, "CNAME"), "utf8").trim();
  if (cname !== DOMAIN)
    fail(
      `CNAME says "${cname}", not "${DOMAIN}" — the custom domain would be dropped on deploy`,
    );
}

// the front page must still be the front page, not a stub
if (has.has("index.html")) {
  const page = readFileSync(join(SITE, "index.html"), "utf8");
  for (const [what, pattern] of [
    ["the download section", /id="download"/],
    [
      "the three system cards",
      /data-system="windows"[\s\S]*data-system="mac"[\s\S]*data-system="linux"/,
    ],
    ["the npm fallback", /npm install -g viberoom/],
    ["the resolver script", /assets\/download\.js/],
    [
      "the six feature destinations",
      /data-feature="interface"[\s\S]*data-feature="memory"[\s\S]*data-feature="skills"[\s\S]*data-feature="control"[\s\S]*data-feature="open"[\s\S]*data-feature="mobile"/,
    ],
    ["the room map", /id="room-map"/],
    ["the spatial world", /id="world"/],
    ["the destination explorer", /id="journey"/],
    ["the route back", /id="go-back"/],
    ["the nested guides", /data-page="memory\/how"/],
    ["the real-interface film", /id="demo"[\s\S]*src="demo\/room\/index.html"/],
    ["the playback controls", /id="play"[\s\S]*id="seek"/],
    ["the readable conversation", /class="transcript"/],
    ["the getting-started guide", /id="how"/],
  ])
    if (!pattern.test(page)) fail(`index.html has lost ${what}`);
}

// the resolver must still know which repository to ask
if (has.has("assets/download.js")) {
  const js = readFileSync(join(SITE, "assets/download.js"), "utf8");
  if (!/const REPO = "todor-rusev\/viberoom"/.test(js))
    fail("download.js no longer names the release repository");
}

// --- 2. links ------------------------------------------------------------------------------------

const TEXT = /\.(html|css|js|json|svg|xml|txt)$/i;
// Generated product HTML contains entity-encoded CSS URLs. Decode their quotes
// before resolving paths, and read href/src attributes without matching data-src.
function entities(text) {
  for (let i = 0; i < 2; i++)
    text = text.replace(
      /&(amp|quot|apos|lt|gt);/g,
      (_, key) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" })[key],
    );
  return text;
}
for (const file of files.filter((f) => /\.(html|css)$/i.test(f))) {
  const body = entities(readFileSync(join(SITE, file), "utf8"));
  const here = dirname(file);
  const targets = [
    ...[...body.matchAll(/(?<![\w:-])(?:href|src)\s*=\s*(["'])(.*?)\1/gs)].map(
      (m) => m[2],
    ),
    ...[
      ...body.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g),
    ].map((m) => m[1] ?? m[2] ?? m[3]),
  ];
  for (const target of targets) {
    if (/^(https?:|mailto:|data:|\/\/|#|\?)/i.test(target) || target === "")
      continue;
    const resource = target.split(/[?#]/, 1)[0];
    let path = resource.startsWith("/")
      ? resource.slice(1)
      : join(here, resource).replaceAll("\\", "/");
    if (path === "." || path === "./") path = "index.html";
    else if (path === "" || path.endsWith("/")) path += "index.html";
    if (!has.has(path) && !has.has(`${path}/index.html`))
      fail(`${file}: ${target} points at nothing`);
  }
}

// --- 3. leaks ------------------------------------------------------------------------------------

/** The author's name belongs in the public addresses and nowhere else; everything else here never travels. */
const PUBLIC_NAME =
  /(?:github\.com\/todor-rusev\/|todor-rusev\.github\.io|"todor-rusev\/viberoom")/g;
const FORBIDDEN = [
  [/[Ѐ-ӿ]/, "Cyrillic (the workspace's discussion language)"],
  [/\btodor\b/i, "the author's name outside a public GitHub address"],
  [/\bnotebook\b/i, "the private repository's name"],
  [/\bagent-chat\b/i, "the private project folder"],
  [/\b(WORK_TOPICS|RandomNotes|scratchpad)\b/i, "a private workspace folder"],
  [/\begt\.com\b/i, "a work address"],
  // a drive letter, but not the ":" of "https://" — the character before a real one is never a letter
  [/(?<![A-Za-z])[A-Za-z]:[\\/][A-Za-z0-9_.-]/, "a path on somebody's disk"],
  [/\bhelper_Astra\b|\bClaude_[Ѐ-ӿA-Za-z]+/, "a room participant's name"],
  [/\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/, "a GitHub token"],
];
// This reviewed upstream Mermaid bundle embeds the public Language Server Protocol's
// protocol.notebook.js module. Pin its exact bytes before allowing that public term;
// every other leak rule still scans it, and a changed bundle requires a fresh review.
const MERMAID_PUBLIC_SHA256 = "581ed7d74bd9048d0e3a91363927d72ef22942d7722546b27f7cc29e35390eb8";
for (const file of files.filter((f) => TEXT.test(f))) {
  const raw = readFileSync(join(SITE, file), "utf8");
  let text = raw.replace(PUBLIC_NAME, "«public»");
  if (file.endsWith("/demo/vendor/mermaid.min.js")) {
    if (createHash("sha256").update(raw).digest("hex") !== MERMAID_PUBLIC_SHA256)
      fail(`${file}: the reviewed public Mermaid bundle has changed`);
    else text = text.replace(/\bnotebook\b/g, "«public-module»");
  }
  // The product's public demo uses this fictional input placeholder on every OS.
  // Allow only this exact attribute context; real paths elsewhere still fail.
  text = text.replace(
    /(<input id="(?:room|tpl-room)-dir" type="text" placeholder=")C:\\projects\\my-app(")/g,
    "$1«public-placeholder»$2",
  );
  for (const [pattern, what] of FORBIDDEN) {
    const hit = text.match(pattern);
    if (!hit) continue;
    const line = text.slice(0, hit.index).split("\n").length;
    fail(`${file}:${line}: ${what} — "${hit[0]}"`);
  }
}

// --- the verdict ---------------------------------------------------------------------------------

if (problems.length) {
  console.error(
    `[check] ${problems.length} problem${problems.length === 1 ? "" : "s"}; nothing is published:`,
  );
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}
console.log(
  `[check] ${files.length} files, ${REQUIRED.length} required pages present, links resolve, leak scan clean`,
);
