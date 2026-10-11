/*
 * mix.js — what the page cannot do with CSS alone.
 *
 *   opening   — the bot that draws itself, ended by any press, key or scroll, and gone under reduced motion;
 *   robots    — every vibemate is a copy of one drawing (#robot), put inline so each can move its own parts;
 *   the room  — a short conversation in the chat on the stage: whoever speaks works its mouth and lights its
 *               antenna, the others turn their eyes to it, and the line from it to the room runs;
 *   arrival   — sections lift in once, and each panel's picture plays when it arrives and on hover;
 *   the note  — the THEN/NOW slider of the band.
 *
 * Under prefers-reduced-motion everything is simply in place: the conversation is shown whole, nothing loops.
 */
(() => {
  "use strict";

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- robots: one drawing, a copy inline in each place ----------------------------------------

  const drawing = document.getElementById("robot");
  for (const use of document.querySelectorAll('svg use[href="#robot"]')) {
    const svg = use.ownerSVGElement;
    for (const part of drawing.children) svg.appendChild(part.cloneNode(true));
    use.remove();
  }

  // --- the opening, and the words settling after it ---------------------------------------------

  const boot = document.getElementById("boot");
  const bones = [...document.querySelectorAll(".sk")];
  let started = false;
  const dress = () => bones.forEach((el, i) => setTimeout(() => el.classList.add("ready"), still ? 0 : i * 95));
  function openUp() {
    if (!boot || boot.dataset.done) return;
    boot.dataset.done = "1";
    boot.classList.add("done");
    setTimeout(() => boot.remove(), 640);
    setTimeout(() => { dress(); startRoom(); }, 180);
  }
  if (!boot) { dress(); startRoom(); }
  else if (still) { boot.remove(); dress(); startRoom(); }
  else {
    const begin = () => setTimeout(openUp, 1650);
    if (document.hidden) document.addEventListener("visibilitychange", () => { if (!document.hidden) begin(); }, { once: true });
    else begin();
    for (const event of ["pointerdown", "keydown", "wheel", "touchstart"]) addEventListener(event, openUp, { once: true, passive: true });
  }

  // --- the room on the stage --------------------------------------------------------------------

  const SCRIPT = [
    { who: "you", text: "<i>@Nova</i> plan the CSV fix. <i>@Rio</i>, review it when it lands." },
    { who: "nova", text: "Three steps: quoted commas, empty lines, and a test for each. <i>@Kai</i>, yours?" },
    { who: "kai", text: "Taking the tests. Six written, six passing." },
    { who: "rio", text: "One case left: a file with semicolons. Flagging it." },
    { who: "nova", text: "Good catch — handled. <i>@You</i>, ready when you are." },
  ];
  const PEOPLE = {
    you: { name: "You", role: "", tint: null, initial: "Y" },
    nova: { name: "Nova", role: "plans", tint: "lavender", initial: "N" },
    kai: { name: "Kai", role: "builds", tint: "mint", initial: "K" },
    rio: { name: "Rio", role: "reviews", tint: "butter", initial: "R" },
  };
  const stage = document.getElementById("stage");
  const list = document.getElementById("msgs");
  const mates = Object.fromEntries([...document.querySelectorAll(".mate")].map((m) => [m.dataset.mate, m]));
  const beams = Object.fromEntries([...document.querySelectorAll("[data-beam]")].map((b) => [b.dataset.beam, b]));
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  function line(step) {
    const who = PEOPLE[step.who];
    const li = document.createElement("li");
    li.className = `msg${step.who === "you" ? " me" : ""}`;
    if (who.tint) li.dataset.tint = who.tint;
    li.innerHTML = `<span class="av">${who.initial}</span><div><b>${who.name}${who.role ? `<small>${who.role}</small>` : ""}</b><p>${step.text}</p></div>`;
    return li;
  }

  // where each vibemate's eyes are, so the others can look at whoever speaks
  function lookAt(speaker) {
    const target = mates[speaker]?.getBoundingClientRect();
    for (const [name, mate] of Object.entries(mates)) {
      const eyes = mate.querySelector(".bot");
      if (!eyes) continue;
      let dx = 0, dy = 0;
      if (target && name !== speaker) {
        const me = mate.getBoundingClientRect();
        const x = target.left + target.width / 2 - (me.left + me.width / 2);
        const y = target.top + target.height / 2 - (me.top + me.height / 2);
        const d = Math.hypot(x, y) || 1;
        dx = (x / d) * 3.2;
        dy = (y / d) * 2.4;
      } else if (target) {
        // the speaker looks at the room in the middle
        const room = stage.querySelector(".room-card").getBoundingClientRect();
        const me = mate.getBoundingClientRect();
        const x = room.left + room.width / 2 - (me.left + me.width / 2);
        const d = Math.abs(x) || 1;
        dx = (x / d) * 2.6;
      }
      eyes.style.setProperty("--lx", `${dx.toFixed(2)}px`);
      eyes.style.setProperty("--ly", `${dy.toFixed(2)}px`);
    }
  }

  async function play() {
    for (;;) {
      for (const step of SCRIPT) {
        const mate = mates[step.who];
        lookAt(step.who);
        if (step.who !== "you") {
          mate.classList.add("typing-now");
          await wait(900);
          mate.classList.remove("typing-now");
        }
        mate.classList.add("talking");
        beams[step.who]?.classList.add("live");
        list.appendChild(line(step));
        await wait(step.who === "you" ? 1500 : 1900);
        mate.classList.remove("talking");
        beams[step.who]?.classList.remove("live");
        await wait(320);
      }
      // the end of the exchange: everyone pleased with it, then the room clears for the next round
      lookAt(null);
      for (const name of ["nova", "kai", "rio"]) mates[name].classList.add("happy");
      await wait(1900);
      for (const name of ["nova", "kai", "rio"]) mates[name].classList.remove("happy");
      for (const li of list.children) li.classList.add("out");
      await wait(420);
      list.replaceChildren();
      await wait(600);
    }
  }

  function startRoom() {
    if (started || !list) return;
    started = true;
    if (still) {
      for (const step of SCRIPT) list.appendChild(line(step));
      return;
    }
    // the stage plays only while it can be seen: a loop nobody watches is work for nothing
    let running = false;
    const begin = () => { if (!running) { running = true; play(); } };
    const box = stage.getBoundingClientRect();
    if (box.top < innerHeight && box.bottom > 0) begin();
    else if ("IntersectionObserver" in window) {
      const seen = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { begin(); seen.disconnect(); } });
      seen.observe(stage);
    } else begin();
  }

  // --- arrival, and each panel's picture -------------------------------------------------------

  const arriving = [...document.querySelectorAll(".reveal")];
  if (still || !("IntersectionObserver" in window)) for (const el of arriving) el.classList.add("in");
  else {
    const watch = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const group = [...entry.target.parentElement.children].filter((c) => arriving.includes(c));
        const step = Math.min(group.indexOf(entry.target), 5) * 80;
        entry.target.style.transitionDelay = `${step}ms`;
        entry.target.classList.add("in");
        if (entry.target.classList.contains("panel")) setTimeout(() => replay(entry.target), 420 + step);
        setTimeout(() => (entry.target.style.transitionDelay = ""), 900 + step);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.18 });
    for (const el of arriving) watch.observe(el);
  }
  function replay(panel) {
    if (still) return;
    panel.classList.remove("play");
    void panel.offsetWidth; // a fresh start for the same animation
    panel.classList.add("play");
  }
  for (const panel of document.querySelectorAll(".panel")) panel.addEventListener("pointerenter", () => replay(panel));

  // --- the band's note, then and now ------------------------------------------------------------

  const slider = document.querySelector(".time-travel input");
  if (slider) {
    const note = document.querySelector(".memory-note");
    const date = note.querySelector(".note-date");
    const quote = note.querySelector("blockquote");
    slider.addEventListener("input", () => {
      const when = slider.value === "1" ? "now" : "then";
      quote.style.opacity = "0";
      setTimeout(() => {
        date.textContent = date.dataset[when];
        quote.textContent = quote.dataset[when];
        quote.style.opacity = "1";
        note.style.transform = when === "now" ? "rotate(0.8deg)" : "";
      }, still ? 0 : 200);
    });
  }
})();
