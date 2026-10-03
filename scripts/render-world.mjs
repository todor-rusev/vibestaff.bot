import { readFile, writeFile } from "node:fs/promises";
import { features } from "./landing-content.mjs";
import { destinations, worldSize } from "../site/assets/world-map.js";
import { investigationScene as scene } from "../site/assets/investigation-scene.js";
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const image = (name, cls = "") =>
  `<img class="${cls}" src="assets/world/${name}.webp" alt="" draggable="false" width="480" height="440">`;
function mate(animal, color = "coral") {
  return `<span class="mate mate-${color}" aria-hidden="true"><svg viewBox="0 0 150 170"><defs><linearGradient id="body-${animal}" x2="1" y2="1"><stop stop-color="var(--mate-light)"/><stop offset="1" stop-color="var(--mate-dark)"/></linearGradient></defs><ellipse class="mate-shadow" cx="75" cy="155" rx="44" ry="8"/><g class="mate-body"><path d="M48 85Q75 67 102 85L108 128Q75 145 42 128Z" fill="url(#body-${animal})"/><g class="arm arm-left"><path d="M47 88Q22 98 24 119"/><circle cx="24" cy="119" r="10"/></g><g class="arm arm-right"><path d="M102 88Q127 78 124 53"/><circle cx="124" cy="53" r="10"/></g><path class="mate-foot" d="M57 135l-7 14M91 135l8 14"/></g><image class="mate-head" href="demo/room/faces/${animal}.webp" x="30" y="0" width="90" height="95"/></svg></span>`;
}
function artwork(art) {
  if (art === "room")
    return `<div class="room-art"><span class="room-orbit orbit-one"></span><span class="room-orbit orbit-two"></span><img class="room-logo" src="assets/icon-256.png" width="140" height="140" alt=""/>${mate("fox")}${mate("raccoon", "blue")}<span class="thought thought-one">What if…</span><span class="thought thought-two">Let’s try.</span></div>`;
  if (art === "control")
    return `<div class="control-sculpture"><div class="control-housing"><span class="dial"><i></i></span><span class="slider slider-one"><i></i></span><span class="slider slider-two"><i></i></span><span class="control-light"></span><b>YOUR PACE</b></div><span class="control-key">Ⅱ</span></div>`;
  if (art === "open")
    return `<div class="open-sculpture"><span class="bracket left-bracket">{</span><img src="assets/icon-256.png" width="100" height="100" alt=""/><span class="bracket right-bracket">}</span><span class="open-tag">AGPLv3</span></div>`;
  if (art === "download") return `<div class="download-art">↘</div>`;
  const rig =
    art === "memory"
      ? '<span class="paper-rig"><i></i><i></i><i></i></span>'
      : art === "connections"
        ? '<span class="current-particle p1"></span><span class="current-particle p2"></span>'
        : art === "mobile"
          ? '<span class="flying-letter">↗</span>'
          : '<span class="idea-spark">✳</span>';
  return `<div class="picture-art art-${art}">${image(art)}${rig}</div>`;
}
const nodes = destinations
  .map(
    (d) =>
      `<a class="world-node node-${d.id}" data-route="${d.id}" ${features.some((f) => f.id === d.id) ? `data-feature="${d.id}"` : ""} data-x="${d.x}" data-y="${d.y}" data-tint="${d.accent}" href="#/${d.id}" style="left:${d.x}px;top:${d.y}px"><div class="node-art">${artwork(d.art)}</div><div class="node-caption">${d.id === "demo" ? `<span class="eyebrow">VIBEROOM · YOUR AGENT’S WORLD</span><h1>A little room.<br>Big <em>possibilities.</em></h1>` : `<span class="node-kicker">${esc(d.hint)}</span><h2>${esc(d.label)} <span>↗</span></h2>`}${d.id === "demo" ? '<p>Start with one agent.<br>Open up a world around it.</p><span class="watch-pill">▶ Watch a useful collaboration</span>' : ""}</div></a>`,
  )
  .join("\n");
const lines = destinations
  .filter((d) => d.id !== "demo")
  .map(
    (d) =>
      `<path class="world-link" data-link="${d.id}" d="M900 575 Q${(900 + d.x) / 2 + 80} ${(575 + d.y) / 2 - 80} ${d.x} ${d.y}"/>`,
  )
  .join("");
const articles = features
  .map(
    (f) =>
      `<section class="destination" data-page="${f.id}" id="feature-${f.id}"><p class="eyebrow">${esc(f.label)}</p><h2 tabindex="-1">${esc(f.title)}</h2><p class="destination-intro">${esc(f.intro)}</p><div class="feature-points">${f.points.map(([title, text]) => `<section><h3>${esc(title)}</h3><p>${esc(text)}</p></section>`).join("")}</div><a class="dive-link" href="#/${f.id}/how">Make it happen <span>Take a closer look ↘</span></a><a class="text-link" href="${f.href === "#how" ? "#/download" : esc(f.href)}">${esc(f.cta)} ↗</a></section><section class="destination guide" data-page="${f.id}/how"><p class="eyebrow">${esc(f.label)} / GET STARTED</p><h2 tabindex="-1">Make it<br><em>happen.</em></h2><ol>${f.steps.map((s, i) => `<li><span>0${i + 1}</span><p>${esc(s)}</p></li>`).join("")}</ol><a class="dive-link" href="${f.href === "#how" ? "#/download" : esc(f.href)}">${esc(f.cta)} ↗</a><a class="text-link" href="#/${f.id}">← Back to ${esc(f.label.toLowerCase())}</a></section>`,
  )
  .join("\n");
const chapters = scene.beats
  .map(
    (b, i) =>
      `<button data-time="${b.start + 0.3}"><span>0${i + 1}</span>${esc(b.chapter)}</button>`,
  )
  .join("");
const transcript = `<details class="transcript"><summary>Read the investigation <span>+</span></summary><ol>${scene.beats.map((b) => `<li><strong>${esc(b.fromName)}</strong><p>${esc(b.text.split("```")[0].replaceAll("**", ""))}</p></li>`).join("")}<li><strong>The cause</strong><p>${esc(scene.diagramDescription)}</p></li></ol></details>`;
const film = (
  await readFile(new URL("./world-film.html", import.meta.url), "utf8")
)
  .replace("<!-- DURATION -->", scene.duration)
  .replace("<!-- CHAPTERS -->", chapters)
  .replace("<!-- TRANSCRIPT -->", transcript);
const downloads = await readFile(
  new URL("./landing-download.html", import.meta.url),
  "utf8",
);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Your AI agent, a beautiful room, and a world of possibilities. Explore memory, skills, connections and useful collaboration. Free and open source."><meta name="theme-color" content="#edf2e6"><title>viberoom · a little room, big possibilities</title><link rel="canonical" href="https://vibestaff.bot/"><link rel="icon" href="assets/icon-256.png"><link rel="stylesheet" href="assets/world.css"><link rel="stylesheet" href="assets/film.css"><script type="module" src="assets/world.js"></script><script type="module" src="assets/demo-player.js"></script><script defer src="assets/download.js"></script></head><body>
<div class="atmosphere" aria-hidden="true"><span class="wash wash-mint"></span><span class="wash wash-peach"></span><span class="wash wash-lilac"></span><div class="sky-grain"></div></div>
<header class="site-header"><a class="brand" href="#/map"><img src="assets/icon-256.png" width="38" height="38" alt="">viberoom</a><span class="brand-note">Your agent. Your world.</span><nav aria-label="Main navigation"><a href="#/map">Explore</a><a href="#/demo">See it happen</a><a class="get-app" href="#/download">Come on in ↗</a></nav></header>
<nav class="breadcrumbs" aria-label="Your place in the world"><button id="go-back">← Go back</button><a href="#/map">The room</a><span id="crumb-path"></span></nav>
<main><section id="world" class="world-viewport" aria-label="Explore the viberoom world"><div class="world-layer back-layer" data-depth=".25"><div class="world-orbit"></div><span class="back-word">room to think.</span><span class="back-word second">space to be you.</span></div><div class="world-layer link-layer" data-depth=".7"><svg id="room-map" viewBox="0 0 ${worldSize.width} ${worldSize.height}" aria-hidden="true">${lines}</svg></div><div class="world-layer node-layer" data-depth="1">${nodes}</div><div class="world-layer front-layer" data-depth="1.8" aria-hidden="true"><span class="glass-ring ring-a"></span><span class="glass-ring ring-b"></span><span class="ribbon-piece"></span><span class="loose-paper"></span></div></section>
<section id="journey" aria-label="Inside a possibility"><div class="journey-scroll">${articles}<section class="destination film-destination" data-page="demo">${film}</section><section class="destination download-destination" data-page="download">${downloads}<div id="how" class="start-note"><h3>Start with just one.</h3><p>Make a room, choose your agent and start a conversation. Add another mind when an independent check would help.</p></div></section></div><nav class="related-nodes" aria-label="Keep exploring">${features.map((f) => `<a href="#/${f.id}">${esc(f.label)}</a>`).join("")}</nav></section></main>
<footer class="world-controls"><div class="explore-hint"><span class="hint-dot"></span> Drag to wander. Choose a world.</div><div class="map-controls"><button id="zoom-out" aria-label="Zoom out">−</button><button id="reset-view" aria-label="Return to the full map">⌖</button><button id="zoom-in" aria-label="Zoom in">+</button></div><button id="motion-toggle" aria-pressed="true">Motion on</button><a class="source-link" href="https://github.com/todor-rusev/viberoom">Open source ↗</a></footer><div class="sr-only" id="route-status" aria-live="polite"></div>
<noscript><style>.world-viewport,.breadcrumbs,.world-controls{display:none}.destination{display:block!important}#journey{position:static;display:block}body{overflow:auto}.theatre,.playback,.chapters{display:none}</style><p class="noscript-note">Explore the guides below. Turn on JavaScript for the spatial map and animated investigation.</p></noscript></body></html>`;
await writeFile(new URL("../site/index.html", import.meta.url), html);
console.log(
  "Rendered the spatial site, eight destinations and the investigation.",
);
