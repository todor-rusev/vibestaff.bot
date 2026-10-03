/*
 * alive.js — the two things the page cannot do with CSS alone.
 *
 *   arrival — a section lifts into place the first time it is scrolled to, once, and then stops being
 *             animated at all. An IntersectionObserver rather than a scroll handler: the browser does
 *             the watching, so a long page costs nothing while it is being read.
 *   tilt    — a card leans toward the pointer. Two angles written as custom properties, which the card's
 *             own transform already reads; the transform itself lives in the stylesheet, so there is one
 *             place where the card's shape is decided and JavaScript only feeds it numbers.
 *
 * Both are off where they would be wrong: a coarse pointer (a finger has no hover), a small screen, and
 * `prefers-reduced-motion`. In those cases everything is simply already in place — the page is never left
 * half-arrived, which is what a reveal built on the wrong assumption does to somebody who cannot see it.
 */
(() => {
  "use strict";

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // --- the opening, and the page resolving out of its own skeleton -----------------------------
  //
  // One timeline, and every part of it can be cut short. The scene is a courtesy, not a toll: a press,
  // a key or a scroll ends it at once and the words are already there underneath. Nothing waits on
  // `load` either — a slow image must never be the reason somebody stares at a bot.

  const boot = document.getElementById("boot");
  const bones = [...document.querySelectorAll(".sk")];

  function dress() {
    // the words in the order they are read, a beat apart, so the page assembles rather than blinks
    bones.forEach((el, i) => setTimeout(() => el.classList.add("ready"), still ? 0 : i * 95));
  }

  function openUp(now) {
    if (!boot || boot.dataset.done) return;
    boot.dataset.done = "1";
    boot.classList.add("done");
    setTimeout(() => boot.remove(), now ? 0 : 640);
    setTimeout(dress, now ? 0 : 180);
  }

  if (!boot) dress();
  else if (still) { boot.remove(); dress(); }
  else {
    // A tab opened in the background must not spend its scene on nobody: the clock starts when the tab
    // is actually looked at. Skipping it there instead would mean a middle-clicked link never shows the
    // opening at all, which is the one case where a person has not yet seen anything of the product.
    const begin = () => setTimeout(() => openUp(false), 1650);
    if (document.hidden) document.addEventListener("visibilitychange", () => { if (!document.hidden) begin(); }, { once: true });
    else begin();
    for (const event of ["pointerdown", "keydown", "wheel", "touchstart"]) {
      addEventListener(event, () => openUp(false), { once: true, passive: true });
    }
  }

  // --- how far down the page the reader is ------------------------------------------------------

  if (!still) {
    const bar = document.createElement("div");
    bar.className = "progress";
    document.body.appendChild(bar);
    let queued = 0;
    const measure = () => {
      queued = 0;
      const run = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--read", run > 0 ? (scrollY / run).toFixed(4) : "0");
    };
    addEventListener("scroll", () => { if (!queued) queued = requestAnimationFrame(measure); }, { passive: true });
    measure();
  }

  // --- arrival ---------------------------------------------------------------------------------

  const arriving = [...document.querySelectorAll(".reveal, .card")];
  if (still || !("IntersectionObserver" in window)) {
    for (const el of arriving) el.classList.add("in");
  } else {
    const watch = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // The delay is the card's place in its own group, not its place on the page: a stack read from the
        // top should cascade, but a stack a person jumps into the middle of should not wait for cards above.
        const group = [...entry.target.parentElement.children].filter((c) => arriving.includes(c));
        const step = Math.min(group.indexOf(entry.target), 5) * 70;
        entry.target.style.transitionDelay = `${step}ms`;
        entry.target.classList.add("in");
        // one arrival each: after this the element carries no observer and no delay of its own
        setTimeout(() => (entry.target.style.transitionDelay = ""), 900 + step);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    for (const el of arriving) watch.observe(el);
  }

  // --- tilt ------------------------------------------------------------------------------------

  if (still) for (const svg of document.querySelectorAll("svg.scene")) svg.pauseAnimations();
  if (still || !fine) return;

  const LEAN = 7; // degrees at the very edge of a card; past about eight it stops reading as depth
  for (const card of document.querySelectorAll(".card")) {
    let frame = 0;
    const lean = (event) => {
      if (frame) return; // one write per frame: pointermove fires far more often than the screen repaints
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card.style.setProperty("--ry", `${(x * LEAN).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${(-y * LEAN).toFixed(2)}deg`);
        // where the light lands, so the sheen follows the hand rather than sitting in a corner
        card.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const settle = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      card.classList.remove("leaning");
      for (const name of ["--ry", "--rx", "--gx", "--gy"]) card.style.removeProperty(name);
    };
    card.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { card.classList.add("leaning"); lean(e); } });
    card.addEventListener("pointermove", (e) => { if (card.classList.contains("leaning")) lean(e); });
    card.addEventListener("pointerleave", settle);
    card.addEventListener("pointercancel", settle);
  }
})();
