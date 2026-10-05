const directions = {
  1: {
    title: "Good ideas.<br><em>Great company.</em>",
    description:
      "Bring your AI assistants together.<br>Watch a little teamwork turn<br>“what if” into “look at this”.",
    image: "classic",
    label: "01 / PEARL",
    name: "A luminous room<br>with real depth.",
    copy: "Pearlescent surfaces, a substantial floating window, a soft reflection, and a foreground lens that pulls a real message out of the conversation. Gentle colour; confident scale.",
  },
  2: {
    title: "One room.<br><em>Many brilliant minds.</em>",
    description:
      "Your idea sets it in motion.<br>Your AI teammates take it further. Together.",
    image: "dark",
    label: "02 / AFTERGLOW",
    name: "Give the conversation<br>a cinematic stage.",
    copy: "A dark horizon, luminous edges, a low camera, and the real interface suspended above its reflection. The strongest contrast and the most theatrical depth. Motion would travel through the room in a single continuous shot.",
  },
  3: {
    title: "Your idea.<br><em>A world of<br>possibility.</em>",
    description:
      "A space for the things you want to make.<br>And the minds that help you make them.",
    image: "clay",
    label: "03 / ATELIER",
    name: "Warm materials.<br>A room you can feel.",
    copy: "Cream, mint, terracotta, and the product’s own 3D Clayful look. An angled work surface with a foreground detail, tangible edges and broad soft shadows. Tactile and casual, with a more architectural composition.",
  },
  4: {
    title: "A little room.<br><em>A lot of<br>possibility.</em>",
    description:
      "Step inside with an idea.<br>See what a little company can do.",
    image: "classic",
    label: "04 / PORTAL",
    name: "Don’t just show a window.<br>Invite people inside.",
    copy: "A sculptural doorway, deep lavender recesses, warm light and broad stone steps. The real room sits inside an architectural space. The camera would pass through the doorway, level out with the interface, then follow the conversation from person to person.",
  },
  5: {
    title: "One thought.<br><em>A whole team.</em>",
    description:
      "An idea gets passed around.<br>Something wonderful comes back.",
    image: "classic",
    label: "05 / THREAD",
    name: "Let the conversation<br>be the landscape.",
    copy: "Real message close-ups unfold along a single winding thread, at different depths around the full product. The camera would follow that thread from your request to Nova’s hand-off and Rio’s review, then return to the shared room. Airy blue, plum, and a small flash of lime.",
  },
};
const id = Number(new URLSearchParams(location.search).get("v"));
const choice = directions[id] ? id : 1;
const d = directions[choice];
document.body.dataset.direction = choice;
document.querySelector("#hero-title").innerHTML = d.title;
document.querySelector("#hero-description").innerHTML = d.description;
document.querySelector("#direction-label").textContent = d.label;
document.querySelector("#direction-title").innerHTML = d.name;
document.querySelector("#direction-copy").textContent = d.copy;
for (const target of ["#room-image", "#reflection-image"])
  document.querySelector(target).src = `assets/room-${d.image}.png`;
document
  .querySelector(`[data-choice="${choice}"]`)
  .setAttribute("aria-current", "page");
document.title = `viberoom · ${d.label}`;
