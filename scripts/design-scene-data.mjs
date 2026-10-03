import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

// An authored example for both screenshots and the motion study.
export async function designSceneData(source, scene) {
  const sandbox = { window: {} };
  runInNewContext(
    await readFile(resolve(source, "demo-data.js"), "utf8"),
    sandbox,
  );
  const data = sandbox.window.DEMO_DATA;
  const room = data.state.rooms[0];
  room.name = "Our little studio";
  room.settings.name = room.name;
  room.dir = "/projects/our-little-studio";
  room.humanName = "You";
  room.settings.humanName = "You";
  room.settings.topic = "A new home for a pottery studio";
  room.focused = true;
  room.hops = 0;
  room.settings.emoji = "🪴";
  room.messages = [
    {
      from: "human",
      fromName: "You",
      to: ["claude-nova"],
      toNames: ["Nova"],
      text: "@Nova I'd love a website for my pottery studio. Something warm and simple. Can we make it together?",
    },
    {
      from: "claude-nova",
      fromName: "Nova",
      to: ["codex-kai", "opencode-rio"],
      toNames: ["Kai", "Rio"],
      text: "Absolutely. Let's give the pieces room to breathe.\n\n@Kai build a first version: a big photograph, the collection, and a little about the studio.\n@Rio take a fresh look at the words and the way it feels on a phone.",
    },
    {
      from: "codex-kai",
      fromName: "Kai",
      to: ["opencode-rio"],
      toNames: ["Rio"],
      text: "I'm on the layout. Soft colours, generous photographs, nothing in the way.\n\n@Rio the first version is ready for your eyes. Can a visitor find their favourite piece in a couple of taps?",
    },
    {
      from: "opencode-rio",
      fromName: "Rio",
      to: ["codex-kai"],
      toNames: ["Kai"],
      text: "The pieces look lovely. One small change: bring the collection higher on the phone. Let people see the work before the introduction.\n\n@Kai then it is ready to show.",
    },
    {
      from: "claude-nova",
      fromName: "Nova",
      to: ["human"],
      toNames: ["You"],
      text: "**Your studio has a first home.**\n\nKai built it. Rio gave it a second pair of eyes. The collection now comes first, on every screen.\n\nWhat would you like to change?",
    },
  ].map((m, i) => ({
    ...m,
    id: `site-scene-${i + 1}`,
    seq: i + 1,
    kind: "chat",
    ts: 1789045148000 + i * 45000,
    streaming: false,
    toolCalls: [],
  }));
  room.lastMessageAt = room.messages.at(-1).ts;
  if (scene) {
    room.name = room.settings.name = scene.title;
    room.settings.topic = scene.topic;
    room.settings.emoji = scene.emoji;
    room.dir = `/projects/${scene.slug}`;
    room.participants = room.participants.filter(
      (p) => p.kind === "human" || scene.beats.some((b) => b.from === p.id),
    );
    room.messages = scene.beats.map((beat, i) => ({
      id: `${scene.slug}-${i + 1}`,
      seq: i + 1,
      kind: "chat",
      ts: 1789045148000 + i * 45000,
      from: beat.from,
      fromName: beat.fromName,
      to: beat.to,
      toNames: beat.toNames,
      text: beat.text,
      streaming: false,
      toolCalls: [],
    }));
    room.lastMessageAt = room.messages.at(-1).ts;
  }
  room.permissions = [];
  room.proposals = [];
  room.participants.forEach((p) => {
    p.status = "idle";
    p.notes = "";
    delete p.sawFromSeq;
    if (p.kind === "human") p.name = "You";
  });
  data.state.settings.humanName = "You";
  data.state.settings.appearance.chatFontSize = 16;
  data.state.rooms = [room];
  data.state.openRooms = [room.id];

  return data;
}
