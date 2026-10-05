// One source for the authored product fixture, playback and transcript.
const diagram = `flowchart TD
 A[Coupon request times out] --> B[Safari dismisses error]
 B --> C[Payment form remounts]
 C --> D[Payment token is lost]
 D --> E[Order cannot complete]
 C -. Focused fix .-> F[Keep the form mounted]
 F --> G[Replay passes + regression test]`;
const script = [
  [
    "human",
    "You",
    0,
    3.5,
    "The question",
    "Orders fell after the release.",
    "@Nova Orders are down 18% since Tuesday’s release. Traffic, pricing or checkout? Find the cause before we roll back.",
  ],
  [
    "claude-nova",
    "Nova",
    3.5,
    7,
    "Two evidence trails",
    "You trace the data. I’ll trace the code.",
    "@Kai Take sessions and checkout events. I’ll compare the code and the release. Let’s find where the paths meet.",
  ],
  [
    "codex-kai",
    "Kai",
    7,
    10.7,
    "A pattern",
    "One browser. One particular path.",
    "Traffic and desktop conversion are steady. The drop is mobile Safari, after Apply coupon. I’ll trace that path.",
  ],
  [
    "claude-nova",
    "Nova",
    10.7,
    14,
    "First explanation",
    "A plausible cause needs a check.",
    "The new coupon request can time out before payment. That could explain the failed submits. I’ll prepare a rollback.",
  ],
  [
    "codex-kai",
    "Kai",
    14,
    17.8,
    "The challenge",
    "The same timeout. A different outcome.",
    "Wait: desktop has the same timeouts. Only mobile remounts the payment form when the coupon error is dismissed.",
  ],
  [
    "claude-nova",
    "Nova",
    17.8,
    21.5,
    "A better conclusion",
    "That changes the fix.",
    "You’re right. The remount clears the payment token; the timeout only triggers it. Keep the release. Fix the form lifecycle.",
  ],
  [
    "codex-kai",
    "Kai",
    21.5,
    25.2,
    "Verify the fix",
    "Reproduce it. Fix it. Keep the test.",
    "Replay confirms it: keep the form mounted and payment succeeds. I’ll add timeout + retry to the regression tests.",
  ],
  [
    "claude-nova",
    "Nova → You",
    25.2,
    34,
    "Connect the evidence",
    "A cause, a focused fix, and a test.",
    "**Root cause found.** The data narrowed the path. The code explained it. The second check changed the fix.\n\n```mermaid\n" +
      diagram +
      "\n```",
  ],
];
export const investigationScene = {
  slug: "checkout-investigation",
  title: "The missing orders",
  topic: "Find the cause before the rollback",
  emoji: "🔎",
  duration: 34,
  diagramAt: 27.5,
  diagramDrawFor: 2.6,
  overviewAt: 33.2,
  diagramDescription:
    "Coupon timeout → Safari dismisses the error → payment form remounts → payment token is lost → order fails. Fix: keep the form mounted, then verify with a replay and a regression test.",
  beats: script.map(([from, name, start, end, chapter, action, text], i) => ({
    from,
    fromName: from === "human" ? "You" : from === "codex-kai" ? "Kai" : "Nova",
    name,
    start,
    end,
    typeAt: start + 0.28,
    typeFor: i === 7 ? 1.7 : end - start - 0.7,
    chapter,
    action,
    text,
    to:
      i === 7
        ? ["human"]
        : from === "claude-nova"
          ? ["codex-kai"]
          : ["claude-nova"],
    toNames: i === 7 ? ["You"] : from === "claude-nova" ? ["Kai"] : ["Nova"],
  })),
};
