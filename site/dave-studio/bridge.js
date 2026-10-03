(() => {
  // This adapter feeds the unmodified product renderer through its demo socket.
  // It is confined to this fictional recording; there is no live hub connection.
  const sockets = new Set();
  const DemoSocket = window.WebSocket;
  window.WebSocket = class extends DemoSocket {
    constructor(...args) {
      super(...args);
      sockets.add(this);
    }
    close() {
      sockets.delete(this);
      super.close();
    }
  };
  const data = window.DEMO_DATA,
    room = data.state.rooms[0];
  const baseline = structuredClone(room.messages);
  const baselinePeople = structuredClone(room.participants);
  let generation = 0,
    paused = false;
  const waiting = [];
  function resume() {
    paused = false;
    while (waiting.length) waiting.shift()();
  }
  async function checkpoint() {
    if (paused) await new Promise((r) => waiting.push(r));
  }
  function emit(message) {
    for (const socket of sockets)
      socket.onmessage?.({ data: JSON.stringify(message) });
  }
  function event(e) {
    emit({ type: "room.event", roomId: room.id, event: e });
  }
  function status(id, state) {
    const p = room.participants.find((p) => p.id === id);
    if (!p || p.kind !== "agent") return;
    Object.assign(p, { status: state });
    event({ type: "participant", participant: p });
  }
  function message(m) {
    const i = room.messages.findIndex((x) => x.id === m.id);
    if (i >= 0) room.messages[i] = m;
    else room.messages.push(m);
    event({ type: "message", message: m });
  }
  function notify(kind, extra = {}) {
    parent.postMessage({ studio: true, kind, ...extra }, location.origin);
  }
  function openRoom() {
    document.querySelector(`[data-room="${room.id}"]`)?.click();
  }
  function clearPanels() {
    const search = document.querySelector("#search");
    if (search?.value) {
      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const pins = document.querySelector("#pins-panel");
    if (pins && !pins.hidden) document.querySelector("#pins-btn")?.click();
  }
  const script = [
    [
      "human",
      "Before launch: could a payment retry place the same order twice?",
    ],
    [
      "claude-nova",
      "@Kai Check the retry behaviour. I’ll trace order creation. Let’s compare the two paths.",
    ],
    [
      "codex-kai",
      "A timeout does not mean the first request failed. If it succeeded, the retry could create another order.",
    ],
    [
      "claude-nova",
      "Then blocking double-clicks is not enough. We need to recognise the same checkout attempt across retries.",
    ],
    [
      "codex-kai",
      "Yes — but not by customer. Someone may genuinely place a second order. Reuse a key for one checkout attempt; create a new key for the next.",
    ],
    [
      "claude-nova",
      "Agreed. One key per checkout attempt.\n\n```mermaid\nflowchart LR\n A[Checkout attempt] --> B[One request key]\n B --> C[First request]\n B --> D[Retry after timeout]\n C --> E[One order]\n D --> E\n```\n\n**Check:** make the server save the order, interrupt the response, then retry. The result must still be one order.",
    ],
  ];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function diagramReady() {
    return new Promise((resolve) => {
      const ready = () =>
        document.querySelector('.msg[data-id="scene-5"] .mermaid-block.ok');
      if (ready()) return resolve();
      const observer = new MutationObserver(() => {
        if (ready()) finish();
      });
      const timer = setTimeout(finish, 4000);
      function finish() {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
      observer.observe(document.querySelector("#messages"), {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    });
  }
  const api = {
    async reset() {
      const token = ++generation;
      resume();
      clearPanels();
      room.messages = structuredClone(baseline);
      room.participants = structuredClone(baselinePeople);
      emit({ type: "snapshot", snapshot: data.state });
      await sleep(40);
      if (token !== generation) return false;
      openRoom();
      notify("reset");
      return true;
    },
    async play(reduced = false) {
      if (!(await api.reset())) return;
      const token = ++generation;
      room.messages = room.messages.slice(0, 2);
      room.participants.push(structuredClone(data.studioColleague));
      emit({ type: "snapshot", snapshot: data.state });
      for (let i = 0; i < script.length; i++) {
        await checkpoint();
        if (token !== generation) return;
        const [from, text] = script[i];
        const m = {
          id: "scene-" + i,
          seq: i + 5,
          kind: "chat",
          from,
          fromName:
            from === "human" ? "You" : from === "claude-nova" ? "Nova" : "Kai",
          to: [],
          toNames: [],
          text: "",
          ts: Date.UTC(2026, 8, 28, 10, i),
          streaming: from !== "human",
          toolCalls: [],
        };
        status(from, "thinking");
        message(m);
        notify("beat", { index: i });
        if (from === "human" || reduced) {
          m.text = text;
          message(m);
        } else {
          const words = text.match(/\S+\s*/g) || [];
          for (let k = 0; k < words.length; k += 3) {
            await checkpoint();
            if (token !== generation) return;
            const chunk = words.slice(k, k + 3).join("");
            m.text += chunk;
            event({ type: "chunk", id: m.id, text: chunk });
            await sleep(150);
          }
        }
        m.streaming = false;
        message(m);
        status(from, "idle");
        await sleep(reduced ? 0 : i === 5 ? 100 : 1100);
      }
      await diagramReady();
      if (token === generation) {
        document.querySelector("#jump-latest")?.click();
        notify("done");
      }
    },
    stop() {
      generation++;
      resume();
      room.participants.forEach((p) => status(p.id, "idle"));
      for (const m of room.messages)
        if (m.streaming) {
          m.streaming = false;
          message(m);
        }
      notify("stopped");
    },
    pause() {
      paused = !paused;
      if (!paused) resume();
      notify("paused", { paused });
    },
    async search() {
      if (!(await api.reset())) return;
      const input = document.querySelector("#search");
      input.value = "guest checkout";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      notify("search");
    },
    async pins() {
      if (!(await api.reset())) return;
      document.querySelector("#pins-btn")?.click();
      notify("pins");
    },
    nav(name) {
      api.stop();
      clearPanels();
      document.querySelector(`[data-nav="${name}"]`)?.click();
    },
    async look(look) {
      if (data.state.settings.appearance.look === look) return;
      await fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({ appearance: { look } }),
      });
    },
    async mobile() {
      api.nav("settings");
      const token = generation;
      await sleep(50);
      if (token !== generation) return;
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === "Channels",
      );
      button?.click();
    },
  };
  window.STUDIO_DEMO = api;
  // Use the product's own folded participant column at narrow preview widths.
  // Only restore a column that this adapter folded, preserving manual choices.
  const narrow = matchMedia("(max-width: 700px)");
  let automaticallyFolded = false;
  function fitPreview() {
    const shell = document.querySelector(".shell"),
      toggle = document.querySelector("#side-toggle");
    if (!shell || !toggle) return;
    const folded = shell.classList.contains("side-collapsed");
    if (narrow.matches && !folded) {
      toggle.click();
      automaticallyFolded = true;
    } else if (!narrow.matches && automaticallyFolded) {
      if (folded) toggle.click();
      automaticallyFolded = false;
    }
  }
  narrow.addEventListener("change", fitPreview);
  const ready = setInterval(() => {
    if (document.querySelector('.msg[data-seq="4"]')) {
      clearInterval(ready);
      // The default demo query is only an initial destination. Keeping it would
      // reopen the room when a later settings snapshot arrives on another page.
      window.DEMO_QUERY = "";
      fitPreview();
      notify("ready");
    }
  }, 50);
})();
