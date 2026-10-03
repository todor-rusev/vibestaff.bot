export const chapters = {
  agents: {
    label: "Your agent, at home",
    short: "Your agent",
    kicker: "ONE AGENT IS A GREAT START",
    title: "Your AI agent.<br>A better place<br>to <em>work.</em>",
    intro:
      "A beautiful desktop home for Claude Code, Codex, Gemini and more. Keep the agent you know. Make the everyday work feel better.",
    note: "Same way of asking. Your own agent account. A consistent interface.",
    options: [
      {
        id: "claude",
        label: "Claude",
        vendor: "claude",
        live: true,
        caption:
          "You + Claude. A conversation, a useful diagram, a clear next step.",
      },
      {
        id: "codex",
        label: "Codex",
        vendor: "codex",
        live: true,
        caption: "You + Codex. Another agent, the same comfortable interface.",
      },
      {
        id: "gemini",
        label: "Gemini",
        vendor: "gemini",
        live: true,
        caption: "You + Gemini. Pick the agent you like working with.",
      },
    ],
    details: [
      "Open a room for your project.",
      "Choose an installed agent and use its own sign-in.",
      "Ask in your own words. Add another agent only when it helps.",
    ],
  },
  memory: {
    label: "A room that remembers",
    short: "Memory",
    kicker: "PICK UP THE THREAD",
    title: "Good ideas.<br>Never <em>lost.</em>",
    intro:
      "Every conversation stays with its room — tomorrow, next month, a year from now. Pin the decisions. Find the thread again.",
    note: "Full history lives on your computer. Semantic memory is optional.",
    options: [
      {
        id: "pins",
        label: "Pin a decision",
        image: "pins",
        caption:
          "The actual pins menu: keep an important answer one click away.",
      },
      {
        id: "history",
        label: "Find a message",
        image: "history",
        caption:
          "Search the full history and jump back to the original message.",
      },
      {
        id: "meaning",
        label: "Search by meaning",
        image: "memory",
        caption:
          "Choose a long-term memory provider and the rooms it may remember. Relevant facts can return even when you use different words.",
      },
    ],
    details: [
      "The complete conversation is saved with the room.",
      "Pin a useful message or search for an earlier decision.",
      "Enable a memory provider for optional semantic recall. History does not require it.",
    ],
  },
  tools: {
    label: "Your tools, connected",
    short: "Skills & tools",
    kicker: "BRING YOUR WORLD IN",
    title: "Less repeating.<br>More <em>doing.</em>",
    intro:
      "Save a way of working as a skill. Connect the services you already use. Your agent gets the context to help with the real task.",
    note: "Private sign-in. Room access you choose. Review changes before they happen.",
    options: [
      {
        id: "connections",
        label: "Connections",
        image: "connections",
        caption:
          "The real Connections catalogue. Give your room access to the systems where your work lives.",
      },
      {
        id: "skills",
        label: "Reusable skills",
        image: "skills",
        caption:
          "A skill is a reusable how-to. Call it by name instead of explaining the same process every time.",
      },
    ],
    details: [
      "Open Connections, choose a service and sign in.",
      "Choose which rooms can use it.",
      "Add a repeatable workflow in Skills, or ask a vibemate to help write one.",
    ],
  },
  control: {
    label: "Make it your space",
    short: "Your control",
    kicker: "COMFORT WITHOUT THE COMPLEXITY",
    title: "Your pace.<br>Your <em>call.</em>",
    intro:
      "A light, readable workspace. Choose the look, follow the work, and stop a reply when you need to change direction.",
    note: "Rooms, permissions and clear controls. No IT expertise required to follow along.",
    options: [
      {
        id: "appearance",
        label: "Make it comfortable",
        image: "settings",
        caption:
          "Choose a look, font and scale in the real Appearance settings.",
      },
      {
        id: "room",
        label: "A room of your own",
        image: "claude",
        caption:
          "Keep projects separate. Address one agent or the room. Hush the room when you need a pause.",
      },
    ],
    details: [
      "Give each project a room and a working folder.",
      "Set the look and size that feel comfortable.",
      "Review permissions. Stop or hush whenever you want to change direction.",
    ],
  },
  mobile: {
    label: "Keep the room close",
    short: "On your phone",
    kicker: "AWAY FROM YOUR DESK",
    title: "The thought<br>comes <em>with you.</em>",
    intro:
      "Read a reply, send the next idea, or stop a running agent from your phone. Telegram connects you to the same room.",
    note: "Your computer stays awake with viberoom running. You choose which rooms travel.",
    options: [
      {
        id: "mobile",
        label: "See the setup",
        image: "mobile",
        caption:
          "Pair your own Telegram bot in Channels. Your phone becomes another way into the room.",
      },
    ],
    details: [
      "Ask a vibemate to help connect Telegram.",
      "Create your bot and enter its key on the private card.",
      "Pair your phone. Send /rooms to choose a room and continue.",
    ],
  },
  open: {
    label: "Open by nature",
    short: "Open source",
    kicker: "YOURS TO EXPLORE",
    title: "An open door.<br>Room for <em>your ideas.</em>",
    intro:
      "Free, open-source software for your own computer. Read the code, suggest a better way, or build on it under AGPLv3.",
    note: "viberoom is free. Your agents and optional services keep their own plans and costs.",
    options: [
      {
        id: "source",
        label: "Inside the project",
        source: true,
        caption:
          "The product, the source and the conversation about what comes next — out in the open.",
      },
    ],
    details: [
      "Explore the code and guide on GitHub.",
      "Try the app and share an issue or an idea.",
      "Contribute an improvement under the project’s AGPLv3 licence.",
    ],
  },
};
