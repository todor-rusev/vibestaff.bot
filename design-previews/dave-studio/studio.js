const $ = (s) => document.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const dialog = $("#studio"),
  frame = $("#demo");
let loaded = false,
  readyPromise = null,
  opener = null,
  openedFromPage = false,
  actionGeneration = 0,
  currentLook = "classic";
const labels = {
  room: "Make yourself at home",
  play: "Two perspectives. One useful answer.",
  search: "An old decision, found again.",
  pins: "The things worth keeping.",
  connections: "Your tools, in the room.",
  skills: "A way of working you can reuse.",
  mobile: "The room, from your phone.",
  look: "A room that feels like you.",
};
const captions = {
  room: "Explore the actual interface. This example starts with you and one agent.",
  play: "A payment timeout, a retry, and a second pair of eyes. Illustrative scenario.",
  search:
    "The real history search, looking through the fictional example room.",
  pins: "A real pinned message. The record stays with the room.",
  connections: "Explore the catalogue. No service is connected from this demo.",
  skills:
    "Reusable instructions, available by name. The app’s actual Skills view.",
  mobile:
    "Telegram is a way into your room. Keep the computer awake and viberoom running.",
  look: "The same product, with the look you chose. You can explore its controls.",
};
const beatCaptions = [
  "A question worth checking before launch.",
  "Nova divides the investigation: retries and order creation.",
  "Kai spots the ambiguity: a timeout is not proof of failure.",
  "Nova changes the plan. Prevent duplicates at the request level.",
  "Kai catches the boundary: one key per checkout attempt, not per customer.",
  "A shared conclusion, a diagram, and a concrete regression check.",
];

function ensureDemo() {
  if (readyPromise) return readyPromise;
  $("#demo-loading").hidden = false;
  readyPromise = new Promise((resolve, reject) => {
    let timeout;
    const onReady = (e) => {
      if (
        e.origin !== location.origin ||
        e.source !== frame.contentWindow ||
        !e.data?.studio ||
        e.data.kind !== "ready"
      )
        return;
      clearTimeout(timeout);
      removeEventListener("message", onReady);
      loaded = true;
      $("#demo-loading").hidden = true;
      resolve(frame.contentWindow.STUDIO_DEMO);
    };
    addEventListener("message", onReady);
    timeout = setTimeout(() => {
      removeEventListener("message", onReady);
      readyPromise = null;
      $("#demo-loading").innerHTML =
        "<b>The preview could not open. Close it and try again, or use the full demo link below.</b>";
      reject(new Error("Demo readiness timed out"));
    }, 20000);
    // Replace the iframe's initial document rather than inserting a nested
    // history entry between the room and the page's Back destination.
    frame.contentWindow.location.replace(
      new URL(frame.dataset.src, location.href).href,
    );
  });
  return readyPromise;
}
function openStudio(action, button) {
  opener = button;
  openedFromPage = true;
  if (location.hash === `#room/${action}`) route();
  else location.hash = `room/${action}`;
}
async function route() {
  const [kind, asked] = location.hash.slice(1).split("/");
  if (kind !== "room") {
    ++actionGeneration;
    if (loaded) frame.contentWindow.STUDIO_DEMO.stop();
    if (dialog.open) dialog.close();
    openedFromPage = false;
    return;
  }
  const action = Object.hasOwn(labels, asked) ? asked : "room";
  const token = ++actionGeneration;
  if (!dialog.open) dialog.showModal();
  $("#studio-title").textContent = labels[action];
  $("#demo-caption").textContent = captions[action];
  document
    .querySelectorAll("[data-action]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.action === action)),
    );
  $("#stop-scene").hidden = action !== "play";
  try {
    const api = await ensureDemo();
    if (token !== actionGeneration || !dialog.open) return;
    api.stop();
    await api.look(currentLook);
    if (token !== actionGeneration) return;
    if (action === "play") void api.play(reduced.matches);
    else if (action === "search") await api.search();
    else if (action === "pins") await api.pins();
    else if (action === "mobile") await api.mobile();
    else if (action === "skills" || action === "connections") api.nav(action);
    else await api.reset();
    if (token === actionGeneration)
      $("#demo-caption").textContent = captions[action];
  } catch {
    /* The loader presents the failure and keeps the close control available. */
  }
}
function closeStudio() {
  if (loaded) frame.contentWindow.STUDIO_DEMO.stop();
  if (openedFromPage) {
    openedFromPage = false;
    history.back();
  } else {
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#make",
    );
    route();
  }
}
document
  .querySelectorAll("[data-demo]")
  .forEach((b) =>
    b.addEventListener("click", () => openStudio(b.dataset.demo, b)),
  );
document.querySelectorAll("[data-action]").forEach((b) =>
  b.addEventListener("click", () => {
    history.replaceState(null, "", `#room/${b.dataset.action}`);
    route();
  }),
);
$("#close-studio").addEventListener("click", closeStudio);
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeStudio();
});
dialog.addEventListener("click", (e) => {
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    closeStudio();
});
dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));
$("#stop-scene").addEventListener("click", () => {
  if (loaded) frame.contentWindow.STUDIO_DEMO.pause();
});
addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    e.source !== frame.contentWindow ||
    !e.data?.studio
  )
    return;
  if (e.data.kind === "beat") {
    $("#demo-caption").textContent = beatCaptions[e.data.index];
    dialog.dataset.beat = e.data.index;
  }
  if (e.data.kind === "done") {
    $("#demo-caption").textContent =
      "One order, even after a retry. Two perspectives led to a more precise fix.";
    $("#stop-scene").hidden = true;
    dialog.dataset.playing = "false";
  }
  if (e.data.kind === "stopped") {
    $("#stop-scene").hidden = true;
    dialog.dataset.playing = "false";
  }
  if (e.data.kind === "beat") {
    $("#stop-scene").hidden = false;
    $("#stop-scene").textContent = "Pause Ⅱ";
    dialog.dataset.playing = "true";
  }
  if (e.data.kind === "paused") {
    $("#stop-scene").textContent = e.data.paused ? "Continue ▶" : "Pause Ⅱ";
    dialog.dataset.playing = String(!e.data.paused);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && loaded) frame.contentWindow.STUDIO_DEMO.stop();
});
addEventListener("hashchange", route);

const notes = [
  {
    date: "28 SEP 2025 · MESSAGE #2",
    quote:
      "“Guest checkout comes first. Keep account creation optional, after the order.”",
    foot: "A decision made once. A reference you can come back to.",
  },
  {
    date: "28 SEP 2026 · MESSAGE #4",
    quote:
      "“We already agreed on guest checkout. That decision is still here, in this room.”",
    foot: "A new plan. The earlier decision still informs the next step.",
  },
];
$("#year").addEventListener("input", (e) => {
  const note = notes[Number(e.target.value)];
  $("#note-date").textContent = note.date;
  $("#note-quote").textContent = note.quote;
  $("#note-foot").textContent = note.foot;
  $("#note-quote")
    .getAnimations()
    .forEach((a) => a.cancel());
  if (!reduced.matches)
    $("#note-quote").animate(
      [
        { opacity: 0.25, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 250, easing: "ease-out" },
    );
});
$("#pin-note").addEventListener("click", () => {
  const pin = $("#pin-note").getAttribute("aria-pressed") !== "true";
  $("#pin-note").setAttribute("aria-pressed", String(pin));
  $("#pin-note span").textContent = pin ? "Kept" : "Keep this";
  $("#pin-stamp").hidden = !pin;
  if (pin && !reduced.matches)
    $("#pin-stamp").animate(
      [
        { opacity: 0, transform: "rotate(-8deg) scale(1.4)" },
        { opacity: 1, transform: "rotate(-8deg) scale(1)" },
      ],
      { duration: 220, easing: "ease-out" },
    );
});
const services = {
  notion: ["NOTES → CONTEXT", "Bring the project brief into the conversation."],
  sentry: [
    "ERRORS → ANSWERS",
    "Give the investigation a real error to follow.",
  ],
  linear: [
    "TASKS → PROGRESS",
    "Find the issue and understand what is still missing.",
  ],
  wolfram: [
    "QUESTIONS → CALCULATIONS",
    "Bring a calculation into the same conversation.",
  ],
};
function chooseService(id) {
  document
    .querySelectorAll("[data-service]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.service === id)),
    );
  document
    .querySelectorAll(".connection-lines path")
    .forEach((p) => p.classList.toggle("active", p.id === `wire-${id}`));
  $("#service-tag").textContent = services[id][0];
  $("#service-copy").textContent = services[id][1];
}
document
  .querySelectorAll("[data-service]")
  .forEach((b) =>
    b.addEventListener("click", () => chooseService(b.dataset.service)),
  );
chooseService("notion");
let lookTicket = 0;
document.querySelectorAll("[data-look]").forEach((b) =>
  b.addEventListener("click", async () => {
    const token = ++lookTicket;
    currentLook = b.dataset.look;
    document
      .querySelectorAll("[data-look]")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const img = new Image();
    img.src = `assets/room-${currentLook}.png`;
    try {
      await img.decode();
    } catch {
      return;
    }
    if (token !== lookTicket) return;
    $("#look-image").src = img.src;
    $("#look-image").alt =
      `The actual viberoom interface in the ${b.textContent.trim()} look`;
    $(".look-preview").style.background = {
      classic: "#d8d5ee",
      "classic-dark": "#383951",
      clay: "#e3c2a5",
    }[currentLook];
    if (!reduced.matches)
      $("#look-image").animate([{ opacity: 0.3 }, { opacity: 1 }], {
        duration: 280,
      });
  }),
);
route();
