import { investigationScene as scene } from "./investigation-scene.js";
const $ = (selector) => document.querySelector(selector);
const iframe = $("#room");
const viewport = $("#viewport");
const camera = $("#camera");
const seek = $("#seek");
const play = $("#play");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const { duration, beats } = scene;
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
let time = 0;
let playing = !reduced.matches;
let motion = !reduced.matches;
let ready = false;
let initialising = false;
let inView = true;
let raf = 0;
let previous = 0;
let lastTextTick = -1;
let currentBeat = -1;
let frames = [];
let shots = [];
let roomWidth = 1360;
let roomHeight = 960;
let messageList;

function setPlaying(value) {
  playing = value;
  document.body.dataset.playing = String(value);
  play.textContent = value ? "Ⅱ" : "▶";
  play.setAttribute("aria-label", value ? "Pause demo" : "Play demo");
  previous = 0;
  schedule();
}
function goTo(value) {
  time = clamp(value, 0, duration);
  lastTextTick = -1;
  render();
  schedule();
}

// Full text is measured once, before it is progressively revealed. Fixed row
// heights keep camera destinations stable as the genuine message nodes type.
function measure() {
  if (!ready || !viewport.clientWidth) return;
  roomWidth = innerWidth <= 700 ? 700 : innerWidth < 1100 ? 900 : 1360;
  roomHeight = innerWidth <= 700 ? 1280 : 960;
  camera.style.width = `${roomWidth}px`;
  camera.style.height = `${roomHeight}px`;
  for (const frame of frames) {
    frame.row.style.minHeight = "";
    for (const text of frame.texts) text.node.data = text.full;
  }
  messageList.scrollTop = 0;
  iframe.getBoundingClientRect();
  const listBounds = messageList.getBoundingClientRect();
  const zoom = listBounds.height / messageList.clientHeight;
  for (const frame of frames) {
    const bubble = (
      frame.diagram
        ? frame.row.querySelector(".bubble .words > p")
        : frame.row.querySelector(".bubble-col")
    ).getBoundingClientRect();
    frame.row.style.minHeight = `${frame.row.offsetHeight}px`;
    frame.bounds = {
      x: bubble.x,
      y: bubble.y,
      width: bubble.width,
      height: bubble.height,
    };
    if (frame.diagram) {
      const b = frame.diagram.svg.getBoundingClientRect();
      frame.diagram.bounds = {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      };
    }
  }
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  const wideScale = Math.min(w / roomWidth, h / roomHeight) * 0.96;
  const wide = {
    x: (w - roomWidth * wideScale) / 2,
    y: (h - roomHeight * wideScale) / 2,
    scale: wideScale,
    angle: motion ? -2 : 0,
    scroll: 0,
  };
  const shotFor = (b, diagram = false) => {
    const scroll = clamp(
      (b.y + b.height / 2 - (listBounds.y + listBounds.height / 2)) / zoom,
      0,
      messageList.scrollHeight - messageList.clientHeight,
    );
    const scale = Math.min(
      w / (b.width + (diagram ? 35 : 65)),
      h / (b.height + (diagram ? 40 : 160)),
      diagram ? 1.8 : 1.65,
    );
    return {
      x: w / 2 - (b.x + b.width / 2) * scale,
      y:
        h * (diagram ? 0.49 : 0.43) -
        (b.y - scroll * zoom + b.height / 2) * scale,
      scale,
      angle: 0,
      scroll,
    };
  };
  const close = frames.map((frame) => shotFor(frame.bounds));
  const graph = shotFor(frames.at(-1).diagram.bounds, true);
  shots = [
    { at: 0, ...wide },
    { at: 0.04, ...wide },
  ];
  beats.forEach((beat, i) => {
    shots.push({ at: beat.start + 0.28, ...close[i] });
    shots.push({
      at: i === beats.length - 1 ? scene.diagramAt - 0.3 : beat.end,
      ...close[i],
    });
  });
  shots.push(
    { at: scene.diagramAt, ...graph },
    { at: scene.overviewAt - 0.5, ...graph },
    { at: scene.overviewAt, ...wide, scroll: graph.scroll },
    { at: duration, ...wide, scroll: graph.scroll },
  );
  lastTextTick = -1;
  render();
}
function paintCamera() {
  if (!shots.length) return;
  let before = shots[0],
    after = shots.at(-1);
  for (let i = 1; i < shots.length; i++) {
    if (time <= shots[i].at) {
      before = shots[i - 1];
      after = shots[i];
      break;
    }
  }
  const t = smooth(clamp((time - before.at) / (after.at - before.at || 1)));
  const values = Object.fromEntries(
    ["x", "y", "scale", "angle", "scroll"].map((k) => [
      k,
      mix(before[k], after[k], t),
    ]),
  );
  messageList.scrollTop = values.scroll;
  camera.style.transform = `translate3d(${values.x}px,${values.y}px,0) scale(${values.scale}) rotate(${motion ? values.angle : 0}deg)`;
}
function render() {
  if (!ready) return;
  paintCamera();
  const index = Math.max(
    0,
    beats.findIndex((b) => time >= b.start && time < b.end),
  );
  const active = time === duration ? beats.length - 1 : index;
  if (currentBeat !== active) {
    currentBeat = active;
    $("#cue-number").textContent = String(active + 1).padStart(2, "0");
    $("#cue-name").textContent = beats[active].name;
    $("#cue-action").textContent = beats[active].action;
    document
      .querySelectorAll(".chapters button")
      .forEach((b, i) =>
        i === active
          ? b.setAttribute("aria-current", "step")
          : b.removeAttribute("aria-current"),
      );
  }
  const tick = Math.floor(time * 24);
  if (tick !== lastTextTick) {
    lastTextTick = tick;
    frames.forEach((frame, i) => {
      const beat = beats[i];
      const progress = clamp((time - beat.typeAt) / beat.typeFor);
      frame.row.style.opacity =
        time < beat.start
          ? "0"
          : i === active || time >= scene.overviewAt
            ? "1"
            : ".48";
      frame.row.classList.toggle(
        "motion-speaking",
        i === active && time < scene.overviewAt,
      );
      let available = Math.floor(progress * frame.characters);
      for (const text of frame.texts) {
        const next = text.full.slice(0, Math.max(0, available));
        if (text.node.data !== next) text.node.data = next;
        available -= text.full.length;
      }
      if (frame.diagram) {
        frame.row.querySelector(".bubble .words > p").style.opacity =
          time >= scene.diagramAt && time < scene.overviewAt ? "0" : "1";
        const d = clamp((time - scene.diagramAt) / scene.diagramDrawFor);
        frame.diagram.svg.style.opacity = d > 0 ? "1" : "0";
        frame.diagram.nodes.forEach(
          (node, n) => (node.style.opacity = clamp(d * 1.6 - n * 0.08)),
        );
        frame.diagram.paths.forEach((path, n) => {
          const progress = clamp(d * 1.6 - n * 0.07);
          path.node.style.strokeDasharray = path.length;
          path.node.style.strokeDashoffset = path.length * (1 - progress);
          path.node.style.opacity = progress > 0 ? "1" : "0";
        });
        frame.diagram.labels.forEach(
          (label) => (label.style.opacity = clamp((d - 0.25) * 2)),
        );
      }
    });
  }
  seek.value = time;
  seek.style.setProperty("--progress", `${(time / duration) * 100}%`);
  $("#time").value =
    `00:${String(Math.floor(time)).padStart(2, "0")} / 00:${duration}`;
  document.body.dataset.demoTime = time.toFixed(2);
}
function schedule() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
}
function tick(now) {
  raf = 0;
  const delta = previous
    ? Math.min(0.1, Math.max(0, (now - previous) / 1000))
    : 0;
  previous = now;
  if (ready && playing && inView && document.querySelector('#film-dialog').open) {
    time = Math.min(duration, time + delta);
    render();
    if (time === duration) setPlaying(false);
    else schedule();
  } else previous = 0;
}

async function initialiseRoom() {
  if (ready || initialising) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc.querySelector(`.msg[data-seq="${beats.length}"]`)) return;
    initialising = true;
    await doc.fonts.ready;
    messageList = doc.querySelector("#messages");
    messageList.style.scrollBehavior = "auto";
    frames = [...doc.querySelectorAll(".msg[data-seq]")].map((row) => {
      const bubble = row.querySelector(".bubble");
      const walker = doc.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.parentElement.closest(".mermaid-block"))
          texts.push({
            node: walker.currentNode,
            full: walker.currentNode.data,
          });
      }
      const svg = row.querySelector(".mm-out svg");
      const diagram = svg
        ? {
            svg,
            nodes: [...svg.querySelectorAll("g.node")],
            paths: [...svg.querySelectorAll("path.flowchart-link")].map(
              (node) => ({ node, length: node.getTotalLength() }),
            ),
            labels: [...svg.querySelectorAll("g.edgeLabel")],
          }
        : null;
      return {
        row,
        texts,
        characters: texts.reduce((sum, t) => sum + t.full.length, 0),
        diagram,
      };
    });
    if (frames.length !== beats.length)
      throw new Error("The example conversation is incomplete.");
    if (!frames.at(-1).diagram)
      throw new Error("The example diagram is missing.");
    ready = true;
    measure();
    $("#load-state").hidden = true;
    for (const control of [play, seek, $("#restart")]) control.disabled = false;
    document.body.dataset.ready = "true";
    if (reduced.matches) goTo(duration);
    setPlaying(playing);
  } catch (error) {
    $("#load-state").textContent =
      "The demo could not open. Please reload the page.";
    console.error(error);
  }
}
iframe.addEventListener("load", initialiseRoom);
initialiseRoom();
play.addEventListener("click", () => {
  if (time >= duration) goTo(0);
  setPlaying(!playing);
});
$("#restart").addEventListener("click", () => {
  goTo(0);
  setPlaying(true);
});
seek.addEventListener("input", () => {
  setPlaying(false);
  goTo(Number(seek.value));
});
document.querySelectorAll(".chapters button").forEach((b) =>
  b.addEventListener("click", () => {
    goTo(Number(b.dataset.time));
    setPlaying(true);
  }),
);
new ResizeObserver(measure).observe(viewport);
new IntersectionObserver(
  (entries) => {
    inView = entries[0].isIntersecting;
    previous = 0;
    if (inView) schedule();
  },
  { root: null, rootMargin: "100px" },
).observe(viewport);
document.addEventListener("product:film", (event) => {
  previous = 0;
  measure();
  setPlaying(event.detail && !reduced.matches);
});
document.addEventListener("visibilitychange", () => {
  previous = 0;
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else schedule();
});
reduced.addEventListener("change", () => {
  motion = !reduced.matches;
  if (reduced.matches) {
    setPlaying(false);
    goTo(duration);
  }
  measure();
});
setPlaying(playing);
