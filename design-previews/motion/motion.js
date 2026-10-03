const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const iframe = $("#room");
const viewport = $("#viewport");
const camera = $("#camera");
const seek = $("#seek");
const play = $("#play");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const duration = 36;
const beats = [
  {
    start: 0,
    end: 7,
    typeAt: 1,
    typeFor: 3.5,
    name: "You",
    action: "An idea enters the room.",
  },
  {
    start: 7,
    end: 14,
    typeAt: 8.2,
    typeFor: 4.5,
    name: "Nova",
    action: "Bringing the right minds together.",
  },
  {
    start: 14,
    end: 20,
    typeAt: 15.2,
    typeFor: 3.5,
    name: "Kai",
    action: "A first version takes shape.",
  },
  {
    start: 20,
    end: 26,
    typeAt: 21.2,
    typeFor: 3.5,
    name: "Rio",
    action: "A fresh pair of eyes.",
  },
  {
    start: 26,
    end: 36,
    typeAt: 27.2,
    typeFor: 3.5,
    name: "Nova → You",
    action: "The team brings it back to you.",
  },
];
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
let pointer = { x: 0, y: 0 };
let eased = { x: 0, y: 0 };
let scrollDepth = 0;
let sceneShift = 0;

function setPlaying(value) {
  playing = value;
  document.body.dataset.playing = String(value);
  play.textContent = value ? "Ⅱ" : "▶";
  play.setAttribute("aria-label", value ? "Pause demo" : "Play demo");
  previous = 0;
  schedule();
}
function setMotion(value) {
  motion = value;
  document.body.dataset.motion = String(value);
  $("#motion-toggle").textContent = value ? "Parallax on" : "Parallax off";
  $("#motion-toggle").setAttribute("aria-pressed", String(value));
  if (!value) {
    eased = { x: 0, y: 0 };
    for (const prop of [
      "--pointer-x",
      "--pointer-y",
      "--scroll-depth",
      "--scene-shift",
    ])
      root.style.setProperty(prop, 0);
  }
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
  if (!ready) return;
  roomWidth = innerWidth <= 700 ? 700 : innerWidth < 1100 ? 900 : 1360;
  roomHeight = innerWidth <= 700 ? 1280 : 960;
  camera.style.width = `${roomWidth}px`;
  camera.style.height = `${roomHeight}px`;
  for (const frame of frames) {
    frame.row.style.minHeight = "";
    for (const text of frame.texts) text.node.data = text.full;
  }
  const doc = iframe.contentDocument;
  doc.querySelector("#messages").scrollTop = 0;
  // The original app scales its UI. Grow the recording canvas in screen pixels
  // when a narrower layout wraps the last reply below the conversation viewport.
  iframe.getBoundingClientRect();
  const overflow =
    frames.at(-1).row.getBoundingClientRect().bottom -
    doc.querySelector("#messages").getBoundingClientRect().bottom;
  if (overflow > 0) {
    roomHeight += Math.ceil(overflow + 24);
    camera.style.height = `${roomHeight}px`;
    iframe.getBoundingClientRect();
  }
  for (const frame of frames) {
    const bubble = frame.row
      .querySelector(".bubble-col")
      .getBoundingClientRect();
    frame.row.style.minHeight = `${frame.row.offsetHeight}px`;
    frame.bounds = {
      x: bubble.x,
      y: bubble.y,
      width: bubble.width,
      height: bubble.height,
    };
  }
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  const wideScale = Math.min(w / roomWidth, h / roomHeight) * 0.96;
  const wide = {
    x: (w - roomWidth * wideScale) / 2,
    y: (h - roomHeight * wideScale) / 2,
    scale: wideScale,
    angle: motion ? -2 : 0,
  };
  const close = frames.map((frame) => {
    const b = frame.bounds;
    const scale = Math.min(w / (b.width + 75), h / (b.height + 180), 1.45);
    return {
      x: w / 2 - (b.x + b.width / 2) * scale,
      y: h * 0.43 - (b.y + b.height / 2) * scale,
      scale,
      angle: 0,
    };
  });
  shots = [
    { at: 0, ...wide },
    { at: 1, ...wide },
    { at: 2.4, ...close[0] },
    { at: 6.7, ...close[0] },
    { at: 8.5, ...close[1] },
    { at: 13.7, ...close[1] },
    { at: 15.5, ...close[2] },
    { at: 19.7, ...close[2] },
    { at: 21.5, ...close[3] },
    { at: 25.7, ...close[3] },
    { at: 27.5, ...close[4] },
    { at: 31.5, ...close[4] },
    { at: 34, ...wide },
    { at: 36, ...wide },
  ];
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
    ["x", "y", "scale", "angle"].map((k) => [k, mix(before[k], after[k], t)]),
  );
  camera.style.transform = `translate3d(${values.x}px,${values.y}px,0) scale(${values.scale}) rotate(${motion ? values.angle : 0}deg)`;
}
function render() {
  if (!ready) return;
  paintCamera();
  const index = Math.max(
    0,
    beats.findIndex((b) => time >= b.start && time < b.end),
  );
  const active = time === duration ? 4 : index;
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
        time < beat.start ? "0" : i === active || time >= 32 ? "1" : ".48";
      frame.row.classList.toggle("motion-speaking", i === active && time < 32);
      let available = Math.floor(progress * frame.characters);
      for (const text of frame.texts) {
        const next = text.full.slice(0, Math.max(0, available));
        if (text.node.data !== next) text.node.data = next;
        available -= text.full.length;
      }
    });
  }
  seek.value = time;
  seek.style.setProperty("--progress", `${(time / duration) * 100}%`);
  $("#time").value = `00:${String(Math.floor(time)).padStart(2, "0")} / 00:36`;
  document.body.dataset.demoTime = time.toFixed(2);
}
function schedule() {
  if (!raf && !document.hidden && inView) raf = requestAnimationFrame(tick);
}
function tick(now) {
  raf = 0;
  const delta = previous ? Math.max(0, (now - previous) / 1000) : 0;
  previous = now;
  if (ready && playing) {
    time = Math.min(duration, time + delta);
    render();
    if (time === duration) setPlaying(false);
  }
  let settling = false;
  if (motion) {
    eased.x = mix(eased.x, pointer.x, 0.075);
    eased.y = mix(eased.y, pointer.y, 0.075);
    root.style.setProperty("--pointer-x", eased.x.toFixed(4));
    root.style.setProperty("--pointer-y", eased.y.toFixed(4));
    root.style.setProperty("--scroll-depth", scrollDepth.toFixed(4));
    root.style.setProperty("--scene-shift", sceneShift.toFixed(4));
    settling =
      Math.abs(eased.x - pointer.x) + Math.abs(eased.y - pointer.y) > 0.001;
  }
  if ((playing && ready) || settling) schedule();
  else previous = 0;
}

async function initialiseRoom() {
  if (ready || initialising) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc.querySelector('.msg[data-seq="5"]')) return;
    initialising = true;
    await doc.fonts.ready;
    frames = [...doc.querySelectorAll(".msg[data-seq]")].map((row) => {
      const bubble = row.querySelector(".bubble");
      const walker = doc.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode())
        texts.push({ node: walker.currentNode, full: walker.currentNode.data });
      return {
        row,
        texts,
        characters: texts.reduce((sum, t) => sum + t.full.length, 0),
      };
    });
    if (frames.length !== beats.length)
      throw new Error("The example conversation is incomplete.");
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
$("#motion-toggle").addEventListener("click", () => {
  setMotion(!motion);
  measure();
});
addEventListener(
  "pointermove",
  (event) => {
    if (event.pointerType !== "mouse" || !motion) return;
    pointer = {
      x: clamp((event.clientX / innerWidth) * 2 - 1, -1, 1),
      y: clamp((event.clientY / innerHeight) * 2 - 1, -1, 1),
    };
    schedule();
  },
  { passive: true },
);
document.addEventListener("pointerleave", () => {
  pointer = { x: 0, y: 0 };
  schedule();
});
function onScroll() {
  scrollDepth = clamp(scrollY / innerHeight, 0, 2);
  sceneShift = clamp(
    (innerHeight / 2 - viewport.getBoundingClientRect().top) / innerHeight,
    -1,
    1,
  );
  schedule();
}
addEventListener("scroll", onScroll, { passive: true });
new ResizeObserver(measure).observe(viewport);
new IntersectionObserver(
  (entries) => {
    inView = entries[0].isIntersecting;
    previous = 0;
    if (inView) schedule();
    else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  },
  { rootMargin: "250px" },
).observe($("#demo"));
document.addEventListener("visibilitychange", () => {
  previous = 0;
  if (document.hidden && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else schedule();
});
reduced.addEventListener("change", () => {
  setMotion(!reduced.matches);
  if (reduced.matches) {
    setPlaying(false);
    goTo(duration);
  }
  measure();
});
setMotion(motion);
setPlaying(playing);
onScroll();
