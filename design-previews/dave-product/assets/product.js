import { chapters } from "./content.js";
import { investigationScene } from "./investigation-scene.js";
const $ = (s) => document.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const live = $("#solo-room");
live.dataset.vendor = "claude";
const roomReady = live.contentDocument?.querySelector("#app")
  ? Promise.resolve()
  : new Promise((resolve) =>
      live.addEventListener("load", resolve, { once: true }),
    );
const roomSnapshots = new Map();
let active = "agents",
  selected = "claude",
  imageName = "claude";
let lastChapter = null,
  lastOption = null;
let sequence = 0,
  filmLoaded = false;

function enter(el) {
  el.classList.remove("entering");
  requestAnimationFrame(() => el.classList.add("entering"));
}
function scaleRoom() {
  live.style.transform = `scale(${$("#product-surface").clientWidth / 1080})`;
}
new ResizeObserver(scaleRoom).observe($("#product-surface"));
function restoreRoom() {
  const doc = live.contentDocument;
  if (!doc?.querySelector(".msg")) return null;
  doc.querySelector("#messages").scrollTop = 0;
  return doc;
}
function drawDiagram(doc) {
  if (!doc || reduced.matches) return;
  const svg = doc.querySelector(".mm-out svg");
  if (!svg) return;
  svg.querySelectorAll("path.flowchart-link").forEach((path, i) => {
    const length = path.getTotalLength();
    path.animate(
      [
        { strokeDasharray: `${length}`, strokeDashoffset: length },
        { strokeDasharray: `${length}`, strokeDashoffset: 0 },
      ],
      { duration: 650, delay: i * 110, easing: "ease-out", fill: "backwards" },
    );
  });
  svg.querySelectorAll("g.node").forEach((node, i) =>
    node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400,
      delay: i * 120,
      fill: "backwards",
    }),
  );
}
live.addEventListener("load", async () => {
  await live.contentDocument?.fonts.ready;
  const doc = restoreRoom();
  scaleRoom();
  drawDiagram(doc);
});
$("#replay").addEventListener("click", () => {
  const doc = restoreRoom();
  if (!doc) return;
  if (!reduced.matches) {
    doc.querySelectorAll(".msg").forEach((row, i) =>
      row.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 400,
          delay: i * 300,
          fill: "backwards",
          easing: "ease-out",
        },
      ),
    );
    drawDiagram(doc);
  }
});

function route() {
  const [requested, optionId] = location.hash.slice(1).split("/");
  if (requested === "get" || requested === "team") return;
  active = Object.hasOwn(chapters, requested) ? requested : "agents";
  const c = chapters[active];
  const option = c.options.find((o) => o.id === optionId) || c.options[0];
  selected = option.id;
  const chapterChanged = lastChapter !== active;
  const optionChanged = lastOption !== `${active}/${selected}`;
  if (chapterChanged) {
    $("#kicker").textContent = c.kicker;
    $("#headline").innerHTML = c.title;
    $("#description").textContent = c.intro;
    $("#note").textContent = c.note;
    $("#steps").replaceChildren(
      ...c.details.map((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        return li;
      }),
    );
    $("#how-panel").hidden = true;
    $("#how").setAttribute("aria-expanded", "false");
    $("#how span").textContent = "+";
    enter($("#intro"));
  }
  $("#options").setAttribute("aria-label", `${c.short}: choose what to see`);
  // Keep the focused control in place when only the product view changes.
  if (chapterChanged)
    $("#options").replaceChildren(
      ...c.options.map((o) => {
        const button = document.createElement("button");
        button.dataset.option = o.id;
        if (o.vendor) {
          const img = document.createElement("img");
          img.src = `assets/vendor-icons/${o.vendor}.svg`;
          img.alt = "";
          button.append(img);
        }
        button.append(document.createTextNode(o.label));
        button.addEventListener("click", () => navigate(`${active}/${o.id}`));
        return button;
      }),
    );
  $("#options")
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.option === selected)),
    );
  document.querySelectorAll("[data-chapter]").forEach((a) => {
    if (a.dataset.chapter === active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("#window-label").textContent = option.vendor
    ? `YOUR ROOM, WITH ${option.label.toUpperCase()}`
    : c.label.toUpperCase();
  $("#stage-caption").textContent = option.caption;
  $("#replay").hidden = !option.live;
  $("#enlarge").hidden = !!option.source;
  if (optionChanged) changeView(option);
  $("#announcement").textContent =
    `${c.label}. ${option.label}. ${option.caption}`;
  document.title = `viberoom — ${c.label.toLowerCase()}`;
  lastChapter = active;
  lastOption = `${active}/${selected}`;
}
function navigate(hash) {
  if (location.hash === `#${hash}`) route();
  else location.hash = hash;
}
async function changeView(option) {
  const ticket = ++sequence;
  imageName = option.image || option.vendor || "claude";
  if (option.live && live.dataset.vendor !== option.vendor) {
    // Keep one frame: frame navigations otherwise add joint-history entries.
    if (!roomSnapshots.has(option.vendor)) {
      roomSnapshots.set(
        option.vendor,
        fetch(`assets/${option.vendor}-room.html`).then((r) => {
          if (!r.ok) throw new Error("The product view could not load.");
          return r.text();
        }),
      );
    }
    try {
      const html = await roomSnapshots.get(option.vendor);
      await roomReady;
      if (ticket !== sequence) return;
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const doc = live.contentDocument;
      doc.getAnimations().forEach((animation) => animation.cancel());
      doc.body.replaceChildren(
        doc.importNode(parsed.querySelector("#app"), true),
      );
      live.dataset.vendor = option.vendor;
      drawDiagram(restoreRoom());
    } catch {
      roomSnapshots.delete(option.vendor);
      if (ticket === sequence) {
        lastOption = null;
        $("#stage-caption").textContent =
          "This view could not load. Please try again.";
      }
      return;
    }
  }
  if (option.image) {
    const image = new Image();
    image.src = `assets/screens/${option.image}.png`;
    try {
      await image.decode();
    } catch {
      /* The image keeps descriptive alternative text on failure. */
    }
    if (ticket !== sequence) return;
    $("#product-image").src = image.src;
    $("#product-image").alt = `Actual viberoom interface — ${option.caption}`;
  }
  live.hidden = !option.live;
  $("#product-image").hidden = !option.image;
  $("#source-view").hidden = !option.source;
  enter($("#product-surface"));
  scaleRoom();
}
window.addEventListener("hashchange", route);
document.querySelectorAll('[data-chapter],a[href="#agents"]').forEach((a) =>
  a.addEventListener("click", () => {
    if (innerWidth < 901 || $("#explore").getBoundingClientRect().top < -100)
      $("#explore").scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
      });
  }),
);
$("#how").addEventListener("click", () => {
  const open = $("#how-panel").hidden;
  $("#how-panel").hidden = !open;
  $("#how").setAttribute("aria-expanded", String(open));
  $("#how span").textContent = open ? "−" : "+";
});
$("#enlarge").addEventListener("click", () => {
  $("#zoom-title").textContent = chapters[active].label;
  $("#zoom-image").src = `assets/screens/${imageName}.png`;
  $("#zoom-image").alt = $("#stage-caption").textContent;
  $("#zoom-dialog").showModal();
});
$("#zoom-dialog").addEventListener("close", () =>
  $("#enlarge").focus({ preventScroll: true }),
);
document
  .querySelectorAll("[data-close]")
  .forEach((b) =>
    b.addEventListener("click", () =>
      document.getElementById(b.dataset.close).close(),
    ),
  );
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  }),
);
investigationScene.beats.forEach((beat) => {
  const b = document.createElement("button");
  b.dataset.time = beat.start;
  b.textContent = beat.action;
  $(".chapters").append(b);
  const li = document.createElement("li");
  const name = document.createElement("strong");
  name.textContent = beat.fromName + ": ";
  li.append(
    name,
    document.createTextNode(
      beat.text
        .replace(
          /```mermaid[\s\S]*?```/g,
          "[The dependency diagram appears in the product.]",
        )
        .replace(/\*\*/g, ""),
    ),
  );
  $("#transcript").append(li);
});
$("#open-film").addEventListener("click", async () => {
  $("#film-dialog").showModal();
  if (!filmLoaded) {
    filmLoaded = true;
    $("#room").src = $("#room").dataset.src;
    await import("./demo-player.js");
  }
  document.dispatchEvent(new CustomEvent("product:film", { detail: true }));
});
$("#film-dialog").addEventListener("close", () => {
  document.dispatchEvent(new CustomEvent("product:film", { detail: false }));
  $("#open-film").focus({ preventScroll: true });
});
route();
