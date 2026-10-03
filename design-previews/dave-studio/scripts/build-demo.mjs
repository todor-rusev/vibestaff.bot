import {
  readFile,
  writeFile,
  readdir,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { resolve, join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
const source = resolve(process.argv[2]);
const dest = fileURLToPath(new URL("../demo/", import.meta.url));
const sandbox = { window: {} };
runInNewContext(await readFile(join(source, "demo-data.js"), "utf8"), sandbox);
const data = sandbox.window.DEMO_DATA;
const room = data.state.rooms[0];
room.id = "studio-example";
room.name = room.settings.name = "The next chapter";
room.dir = "/projects/next-chapter";
room.humanName = room.settings.humanName = "You";
room.settings.topic = "A small shop. A thoughtful launch.";
room.settings.emoji = "✦";
room.focused = false;
room.hops = 0;
room.permissions = [];
room.proposals = [];
room.customRulesText = "";
room.participants = room.participants.filter((p) =>
  ["human", "claude-nova", "codex-kai"].includes(p.id),
);
room.participants.forEach((p) => {
  p.status = "idle";
  p.notes = "";
  delete p.sawFromSeq;
  delete p.sessionId;
  delete p.notesWrittenAt;
  if (p.kind === "human") p.name = "You";
  p.tagline =
    p.id === "claude-nova"
      ? "Find a useful next step"
      : p.id === "codex-kai"
        ? "A fresh pair of eyes"
        : "";
});
data.studioColleague = structuredClone(
  room.participants.find((p) => p.id === "codex-kai"),
);
room.participants = room.participants.filter((p) => p.id !== "codex-kai");
const message = (seq, from, text, ts) => ({
  id: "studio-" + seq,
  seq,
  kind: "chat",
  from,
  fromName: from === "human" ? "You" : from === "claude-nova" ? "Nova" : "Kai",
  to: [],
  toNames: [],
  text,
  ts,
  streaming: false,
  toolCalls: [],
});
room.messages = [
  message(
    1,
    "human",
    "Let’s keep checkout simple. A guest should be able to buy without creating an account.",
    Date.UTC(2025, 8, 28, 9, 10),
  ),
  message(
    2,
    "claude-nova",
    "**Decision: guest checkout comes first.**\n\nKeep account creation optional, after the order. We will use this as the reference when reviewing the launch.",
    Date.UTC(2025, 8, 28, 9, 11),
  ),
  message(
    3,
    "human",
    "Before we launch, show me a clear plan. What needs to happen first?",
    Date.UTC(2026, 8, 28, 9, 10),
  ),
  message(
    4,
    "claude-nova",
    "**A small plan. A clear way forward.**\n\nThe catalogue and checkout can move in parallel. Both need to be ready before the first order.\n\n```mermaid\nflowchart LR\n A[Your idea] --> B[The catalogue]\n A --> C[Guest checkout]\n B --> D[First order]\n C --> D\n```\n\nWe already agreed on guest checkout. That decision is still here, in this room.",
    Date.UTC(2026, 8, 28, 9, 11),
  ),
];
room.messages[1].pinned = true;
room.createdAt = room.messages[0].ts;
room.lastMessageAt = room.messages.at(-1).ts;
data.state.rooms = [room];
data.state.openRooms = [room.id];
data.state.settings.humanName = "You";
data.state.settings.humanDescription = "";
data.state.settings.appearance = {
  ...data.state.settings.appearance,
  look: "classic",
  font: "nunito",
  chatFontSize: 17,
};
data.files = {};
data.images = {};
data.automations = { [room.id]: { jobs: [], runs: [] } };
data.memory = {
  user: { revision: 0, enabled: false, notes: [] },
  rooms: { [room.id]: { revision: 0, enabled: false, notes: [] } },
};
// Keep the public catalogue, but omit machine-specific install and login paths.
for (const r of [...(data.state.recipes || []), ...(room.recipes || [])])
  for (const key of [
    "installedAt",
    "installation",
    "install",
    "loginStatus",
    "loginFlow",
    "loginTerminalLine",
  ])
    delete r[key];
for (const p of room.participants) delete p.launch;
delete data.studioColleague.launch;
async function copyTree(dir, out) {
  await mkdir(out, { recursive: true });
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name),
      target = join(out, entry.name);
    if (entry.isDirectory()) {
      if (["fonts", "images"].includes(entry.name)) continue;
      await copyTree(file, target);
    } else {
      if (entry.name === "demo-data.js" || entry.name.endsWith(".html"))
        continue;
      if (
        ![".js", ".css", ".svg", ".png", ".webp", ".ico", ".json"].includes(
          extname(entry.name),
        )
      )
        continue;
      let content = await readFile(file);
      if (entry.name === "theme.css")
        content = Buffer.from(
          content
            .toString()
            .replace(/@import url\("fonts\/(?!nunito\.css)[^"]+"\);\r?\n/g, ""),
        );
      await writeFile(target, content);
    }
  }
}
await copyTree(source, dest);
await mkdir(join(dest, "fonts"), { recursive: true });
for (const name of [
  "nunito.css",
  "nunito-latin.woff2",
  "nunito-latin-ext.woff2",
  "nunito-cyrillic.woff2",
  "nunito-cyrillic-ext.woff2",
  "nunito-vietnamese.woff2",
])
  await copyFile(join(source, "fonts", name), join(dest, "fonts", name));
await copyFile(join(source, "../../LICENSE"), join(dest, "LICENSE"));
await copyFile(
  fileURLToPath(new URL("../assets/fonts/OFL.txt", import.meta.url)),
  join(dest, "fonts/OFL.txt"),
);
let html = await readFile(join(source, "vibeclassic.html"), "utf8");
html = html.replace(
  "</head>",
  '<link rel="stylesheet" href="../embed.css">\n</head>',
);
html = html.replace(
  '<script src="app.js"></script>',
  '<script src="../bridge.js"></script>\n  <script src="app.js"></script>',
);
await writeFile(join(dest, "index.html"), html);
await writeFile(
  join(dest, "demo-data.js"),
  "window.DEMO_DATA = " + JSON.stringify(data) + ";\n",
);
console.log(
  "Exported a self-contained public demo with a fictional studio fixture.",
);
