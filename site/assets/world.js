import { destinations, worldSize } from "./world-map.js";
const $ = (s) => document.querySelector(s);
const world = $("#world"),
  journey = $("#journey"),
  reduced = matchMedia("(prefers-reduced-motion: reduce)");
const pages = [...document.querySelectorAll("[data-page]")],
  nodes = [...document.querySelectorAll(".world-node")],
  layers = [...document.querySelectorAll("[data-depth]")];
const valid = new Set(["map", ...pages.map((p) => p.dataset.page)]);
let route = "map",
  previousRoute = "map",
  motion = !reduced.matches,
  raf = 0,
  last = 0,
  drag = null,
  moved = false;
let camera = { x: 900, y: 600, scale: 0.7 },
  target = { ...camera },
  savedMap = null,
  fit = 0.7;
let layoutCenter = { x: worldSize.width / 2, y: worldSize.height / 2 };
let pointer = { x: 0, y: 0 },
  eased = { x: 0, y: 0 },
  positions = new Map(),
  layoutKey = "";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mobilePoints = [
  [180, 220],
  [660, 220],
  [180, 980],
  [660, 1350],
  [180, 1350],
  [660, 980],
  [420, 570],
  [420, 1580],
];
function layout() {
  const mobile = innerWidth < 700;
  const size = mobile ? { width: 840, height: 1750 } : worldSize;
  layoutCenter = { x: size.width / 2, y: size.height / 2 };
  const key = mobile ? "mobile" : "wide";
  if (layoutKey !== key) {
    savedMap = null;
    layoutKey = key;
  }
  positions = new Map(
    destinations.map((d, i) => [
      d.id,
      mobile ? { x: mobilePoints[i][0], y: mobilePoints[i][1] } : d,
    ]),
  );
  for (const node of nodes) {
    const p = positions.get(node.dataset.route);
    node.style.left = p.x + "px";
    node.style.top = p.y + "px";
  }
  const center = positions.get("demo");
  const svg = $("#room-map");
  svg.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  svg.style.width = size.width + "px";
  svg.style.height = size.height + "px";
  svg.querySelectorAll("[data-link]").forEach((path) => {
    const p = positions.get(path.dataset.link);
    path.setAttribute(
      "d",
      `M${center.x} ${center.y} Q${(center.x + p.x) / 2 + 60} ${(center.y + p.y) / 2 - 70} ${p.x} ${p.y}`,
    );
  });
  fit = Math.min(
    world.clientWidth / (size.width + 80),
    world.clientHeight / (size.height + 40),
  );
  if (!savedMap)
    savedMap = { x: size.width / 2, y: size.height / 2, scale: fit };
  else savedMap.scale = clamp(savedMap.scale, fit * 0.7, fit * 2.6);
  setDestination();
}
function setDestination() {
  const base = route.split("/")[0],
    p = positions.get(base);
  if (route === "map") target = { ...savedMap };
  else {
    const scale =
      (innerWidth < 700 ? 0.8 : Math.min(1.75, innerWidth / 900)) *
      (route.endsWith("/how") ? 1.15 : 1);
    const screenX = world.clientWidth * (innerWidth < 700 ? 0.5 : 0.25);
    const screenY = world.clientHeight * (innerWidth < 700 ? 0.17 : 0.43);
    target = {
      x: p.x + (world.clientWidth / 2 - screenX) / scale,
      y: p.y + (world.clientHeight / 2 - screenY) / scale,
      scale,
    };
  }
  if (!motion) camera = { ...target };
  schedule();
}
function paint() {
  for (const layer of layers) {
    const depth = Number(layer.dataset.depth);
    // Depth also responds to camera travel, so dragging has parallax on touch.
    // The node plane stays anchored; the other planes drift around it.
    const travel = (depth - 1) * camera.scale * 0.35;
    const px = motion
      ? eased.x * (depth - 0.35) * 76 + (layoutCenter.x - camera.x) * travel
      : 0;
    const py = motion
      ? eased.y * (depth - 0.35) * 52 + (layoutCenter.y - camera.y) * travel
      : 0;
    layer.style.transform = `translate3d(${world.clientWidth / 2 - camera.x * camera.scale + px}px,${world.clientHeight / 2 - camera.y * camera.scale + py}px,0) scale(${camera.scale})`;
  }
  document.documentElement.style.setProperty("--mouse-x", motion ? eased.x : 0);
  document.documentElement.style.setProperty("--mouse-y", motion ? eased.y : 0);
  world.dataset.scale = camera.scale.toFixed(4);
  world.dataset.center = `${camera.x.toFixed(1)},${camera.y.toFixed(1)}`;
}
function tick(now) {
  raf = 0;
  const dt = last ? Math.max(0, now - last) : 16;
  last = now;
  const t = motion ? 1 - Math.exp(-dt / 115) : 1;
  for (const k of ["x", "y", "scale"]) camera[k] += (target[k] - camera[k]) * t;
  eased.x += (pointer.x - eased.x) * t;
  eased.y += (pointer.y - eased.y) * t;
  paint();
  const unsettled =
    Math.abs(camera.x - target.x) +
      Math.abs(camera.y - target.y) +
      Math.abs(camera.scale - target.scale) * 100 +
      Math.abs(pointer.x - eased.x) +
      Math.abs(pointer.y - eased.y) >
    0.015;
  if (unsettled) schedule();
  else {
    camera = { ...target };
    last = 0;
    paint();
    world.dataset.moving = "false";
  }
}
function schedule() {
  if (!raf && !document.hidden) {
    world.dataset.moving = "true";
    raf = requestAnimationFrame(tick);
  }
}
function readRoute() {
  let value = location.hash.replace(/^#\/?/, "") || "map";
  if (value === "explore") value = "map";
  if (value.startsWith("feature-")) value = value.slice(8);
  return valid.has(value) ? value : "map";
}
function showRoute() {
  const next = readRoute();
  if (next === route && document.body.dataset.route) return;
  previousRoute = route;
  if (route === "map") savedMap = { ...target };
  route = next;
  const base = route.split("/")[0],
    d = destinations.find((d) => d.id === base);
  document.body.dataset.route = route;
  document.body.dataset.section = base;
  document.body.classList.toggle("inside-world", route !== "map");
  world.inert = route !== "map";
  journey.inert = route === "map";
  nodes.forEach((n) => {
    n.dataset.selected = String(n.dataset.route === base);
    n.setAttribute("aria-current", n.dataset.route === base ? "page" : "false");
  });
  pages.forEach((p) => {
    p.hidden = p.dataset.page !== route;
  });
  $(".journey-scroll").scrollTop = 0;
  $("#crumb-path").replaceChildren();
  if (d) {
    const a = document.createElement("a");
    a.href = `#/${base}`;
    a.textContent = d.label;
    $("#crumb-path").append(" / ", a);
    if (route.endsWith("/how")) $("#crumb-path").append(" / Make it happen");
  }
  $("#route-status").textContent =
    route === "map"
      ? "The room. Choose a destination."
      : d.label + (route.endsWith("/how") ? ". Getting started." : "");
  setDestination();
  if (route === "map")
    nodes
      .find((n) => n.dataset.route === previousRoute.split("/")[0])
      ?.focus({ preventScroll: true });
  else {
    const heading = pages
      .find((p) => p.dataset.page === route)
      ?.querySelector("h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }
  document.dispatchEvent(new CustomEvent("world:route", { detail: { route } }));
}
document.addEventListener("click", (e) => {
  const local = e.target.closest('a[href="#npm"]');
  if (local) {
    e.preventDefault();
    $("#npm")?.scrollIntoView({
      behavior: motion ? "smooth" : "instant",
      block: "start",
    });
    return;
  }
  const link = e.target.closest('a[href^="#/"]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (moved && link.closest("#world")) {
    e.preventDefault();
    moved = false;
    return;
  }
  const next = link.hash.slice(2);
  if (!valid.has(next)) return;
  e.preventDefault();
  if (next === route) return;
  history.pushState({ world: true }, "", link.hash);
  showRoute();
});
$("#go-back").addEventListener("click", () => {
  if (history.state?.world) history.back();
  else {
    history.replaceState(
      null,
      "",
      route.endsWith("/how") ? `#/${route.split("/")[0]}` : "#/map",
    );
    showRoute();
  }
});
addEventListener("popstate", showRoute);
addEventListener("hashchange", showRoute);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && route !== "map") {
    $("#go-back").click();
  }
});
world.addEventListener("pointerdown", (e) => {
  if (route !== "map" || e.button !== 0) return;
  drag = { x: e.clientX, y: e.clientY, camera: { ...target }, id: e.pointerId };
  moved = false;
});
addEventListener(
  "pointermove",
  (e) => {
    if (motion && e.pointerType !== "touch") {
      pointer = {
        x: clamp((e.clientX / innerWidth) * 2 - 1, -1, 1),
        y: clamp((e.clientY / innerHeight) * 2 - 1, -1, 1),
      };
      schedule();
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 7) {
      moved = true;
      world.classList.add("dragging");
      world.setPointerCapture(e.pointerId);
      target = {
        ...drag.camera,
        x: drag.camera.x - dx / target.scale,
        y: drag.camera.y - dy / target.scale,
      };
      savedMap = { ...target };
      schedule();
    }
  },
  { passive: true },
);
function endDrag() {
  drag = null;
  world.classList.remove("dragging");
  setTimeout(() => {
    moved = false;
  }, 0);
}
addEventListener("pointerup", endDrag);
addEventListener("pointercancel", endDrag);
function zoom(factor) {
  if (route !== "map") return;
  target.scale = clamp(target.scale * factor, fit * 0.7, fit * 2.6);
  savedMap = { ...target };
  schedule();
}
$("#zoom-in").addEventListener("click", () => zoom(1.2));
$("#zoom-out").addEventListener("click", () => zoom(1 / 1.2));
$("#reset-view").addEventListener("click", () => {
  savedMap = null;
  layout();
});
world.addEventListener(
  "wheel",
  (e) => {
    if (route !== "map") return;
    e.preventDefault();
    zoom(Math.exp(-e.deltaY * 0.001));
  },
  { passive: false },
);
function setMotion(value) {
  motion = value;
  document.body.dataset.motion = String(value);
  $("#motion-toggle").textContent = value ? "Motion on" : "Motion off";
  $("#motion-toggle").setAttribute("aria-pressed", String(value));
  if (!value) {
    eased = { x: 0, y: 0 };
    camera = { ...target };
  }
  schedule();
  document.dispatchEvent(new CustomEvent("world:motion", { detail: value }));
}
$("#motion-toggle").addEventListener("click", () => setMotion(!motion));
reduced.addEventListener("change", () => setMotion(!reduced.matches));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  } else schedule();
});
addEventListener("resize", layout);
document.querySelectorAll("[data-copy]").forEach((button) =>
  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select the command to copy";
    }
    setTimeout(() => (button.textContent = original), 1800);
  }),
);
document.documentElement.classList.add("spatial");
setMotion(motion);
layout();
camera = { ...target };
showRoute();
paint();
