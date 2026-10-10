// The privacy page (site/privacy/index.html) is the product's own policy, Projects/agent-chat/PRIVACY.md, drawn in the
// site's frame: one text, so the page the Store links to never says other than the policy the product carries.
// Run after PRIVACY.md changes, and commit the page: `npm run render:privacy`. The check (scripts/check.mjs) fails when
// the committed page is not what this would draw.
//
// The policy uses a small part of Markdown, and only that part is read: `#`/`##` headings, paragraphs, `- ` lists,
// **bold**, `code` and bare https links. Anything else in it stops the render rather than going out half-drawn.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
export const POLICY = join(site, "..", "agent-chat", "PRIVACY.md");
export const PAGE = join(site, "site", "privacy", "index.html");

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function inline(text) {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(^|[\s(])(https:\/\/[^\s)<]+)/g, (_, before, url) => `${before}<a href="${url}">${url.replace(/^https:\/\//, "")}</a>`);
}

export function renderPrivacy(markdown) {
  const blocks = markdown.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  let title = null;
  const body = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    if (/^# /.test(block)) { title = block.slice(2).trim(); continue; }
    // deeper headings, numbered lists, quotes, code blocks, tables, [links](…), *emphasis* or _emphasis_: not drawn
    if (lines.some((line) => /^(#{3,}|\d+\. |> |```|\|)/.test(line) || /\]\(|(^|[^*])\*[^*\s][^*]*\*(?!\*)|(^|\s)_[^_\s][^_]*_(\s|$)/.test(line)))
      throw new Error(`PRIVACY.md uses Markdown this page does not draw: ${lines[0]}`);
    if (/^## /.test(block)) { body.push(`  <h2>${inline(block.slice(3).trim())}</h2>`); continue; }
    if (lines.every((line, i) => (i === 0 ? /^- / : /^(- |  \S)/).test(line))) {
      const items = block.split(/\n(?=- )/).map((item) => item.replace(/^- /, "").replace(/\n\s+/g, " "));
      body.push(`  <ul>\n${items.map((item) => `    <li>${inline(item)}</li>`).join("\n")}\n  </ul>`);
      continue;
    }
    body.push(`  <p>${inline(lines.join(" "))}</p>`);
  }
  if (!title) throw new Error("PRIVACY.md has no title");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy — viberoom</title>
<meta name="description" content="What viberoom keeps, where it keeps it, and what leaves your computer.">
<link rel="icon" href="/assets/favicon.ico" sizes="any">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<header class="bar"><div class="wrap">
  <a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="30" height="30">viberoom</a>
  <nav><a class="btn primary sm" href="/#download">Download</a></nav>
</div></header>
<main><section class="wrap" style="padding:80px 0;max-width:760px">
  <h1>${inline(title)}</h1>
${body.join("\n")}
</section></main>
<footer><div class="wrap"><span>vibestaff.bot — the home of viberoom</span>
<nav><a href="/privacy/">Privacy</a><a href="https://github.com/todor-rusev/viberoom">GitHub</a><a href="https://www.npmjs.com/package/viberoom">npm</a></nav></div></footer>
</body></html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(dirname(PAGE), { recursive: true });
  writeFileSync(PAGE, renderPrivacy(readFileSync(POLICY, "utf8")));
  console.log(`drawn: ${PAGE}`);
}
