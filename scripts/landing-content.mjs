export const features = [
  {
    id: "interface",
    tint: "violet",
    label: "One familiar place",
    title: "Your agent. A better everyday interface.",
    summary:
      "One agent or a whole team. A beautiful, consistent home for both.",
    intro:
      "Keep the AI agent you know. Give it a room you enjoy spending time in. Claude, Codex, Gemini and other supported CLI agents share the same clear interface in viberoom.",
    points: [
      [
        "Start with just one",
        "A room with you and one agent is a complete way to use viberoom. Add a colleague whenever another perspective would help.",
      ],
      [
        "Keep your way of asking",
        "Use your own words, familiar requests and the agent’s capabilities. The conversation stays familiar even when you switch agents.",
      ],
      [
        "Make it feel like you",
        "Choose a look, a comfortable font and the scale that suits your screen. Files, diagrams and messages have room to breathe.",
      ],
    ],
    steps: [
      "Open a room and choose its working folder.",
      "Add your preferred agent and use its own sign-in.",
      "Start a conversation. Invite another agent only when you want to.",
    ],
    cta: "Explore the real interface",
    href: "https://todor-rusev.github.io/viberoom/demo/vibeclassic.html",
    visual: "interface",
    visualTitle: "Same conversation. Your choice of agent.",
  },
  {
    id: "memory",
    tint: "mint",
    label: "Pick up where you left off",
    title: "A year later is still the same room.",
    summary: "Full history, pins, and semantic search when you want it.",
    intro:
      "The room keeps the whole conversation on your computer. A restart or a new agent session doesn’t make the earlier messages disappear. Come back tomorrow — or a year from now.",
    points: [
      [
        "Every word has a place",
        "Search the room’s history and return to the original messages. Pin the decisions, references and replies you want close at hand.",
      ],
      [
        "Search by meaning",
        "Enable long-term memory for semantic recall: relevant remembered facts can return when you ask about an idea in different words.",
      ],
      [
        "You choose what remembers",
        "Choose a memory provider and the rooms it may learn from. Full conversation history remains a separate record; it doesn’t require that optional service.",
      ],
    ],
    steps: [
      "Keep talking in the same room; its history stays there.",
      "Pin an important message so it is easy to revisit.",
      "For semantic recall, open Settings → Long-term memory and choose the provider and rooms.",
    ],
    cta: "See how memory works",
    href: "https://github.com/todor-rusev/viberoom#what-they-remember",
    visual: "memory",
    visualTitle: "The thread stays with you.",
  },
  {
    id: "skills",
    tint: "coral",
    label: "Bring your world in",
    title: "Your ways of working. Your favourite tools.",
    summary: "Reusable skills and connections to the systems you already use.",
    intro:
      "Teach the room a repeatable way of doing something with a skill. Connect the services where your work lives so an agent can find the page, issue or reference you mean.",
    points: [
      [
        "A skill is a reusable how-to",
        "Keep instructions for a recurring task and call the skill by name. Share the same approach with the agents that need it.",
      ],
      [
        "Connections open the right doors",
        "Choose a service from Connections, sign in, and decide which rooms may use it. Your own compatible server can join the catalogue too.",
      ],
      [
        "Review what gets written",
        "Access keys are entered on a private card. Before a connected system is changed, you can review the exact request and approve it.",
      ],
    ],
    steps: [
      "Open Skills to add a workflow, or ask a vibemate to help create one.",
      "Open Connections and choose the system you want to use.",
      "Sign in, choose access, then ask your agent to use it in a real task.",
    ],
    cta: "Browse the project guide",
    href: "https://github.com/todor-rusev/viberoom",
    visual: "skills",
    visualTitle: "A little instruction. A new possibility.",
  },
  {
    id: "control",
    tint: "blue",
    label: "Stay in charge",
    title: "A light interface. The controls you need.",
    summary:
      "Clear choices, visible work, and a stop button when you need one.",
    intro:
      "You don’t need to become an IT specialist to follow the conversation. Open a room, say what you need, and see what the agent is doing. The controls are there when you want them.",
    points: [
      [
        "Keep the conversation clear",
        "Separate projects into rooms. Address one agent, talk to everyone, or work quietly with a single assistant.",
      ],
      [
        "Pause the noise",
        "Stop a reply or hush the room. Review requested permissions and choose when work continues.",
      ],
      [
        "Keep the work close",
        "Rooms work with a folder you choose. Your conversation history stays on your computer; agents and optional connected services use their own providers.",
      ],
    ],
    steps: [
      "Choose a room for the thing you want to do.",
      "Follow the replies and review permission requests as they appear.",
      "Use Stop or Hush whenever you need to change direction.",
    ],
    cta: "Start with a room",
    href: "#how",
    visual: "control",
    visualTitle: "Your pace. Your call.",
  },
  {
    id: "open",
    tint: "lime",
    label: "Open by nature",
    title: "Read it. Change it. Make it yours.",
    summary: "Open source. Free to use, inspect and improve.",
    intro:
      "viberoom is open source under the AGPLv3 licence. You can inspect how it works, report a problem, contribute an improvement or adapt it under the licence.",
    points: [
      [
        "The source is there",
        "Explore the code and development on GitHub. The way the product works is something you can inspect.",
      ],
      [
        "A free home for your agents",
        "viberoom is free. Your AI agents and any optional external services keep their own accounts, plans and usage costs.",
      ],
      [
        "A project you can help shape",
        "Bring a suggestion, an issue or a contribution. Better rooms can come from the people who use them.",
      ],
    ],
    steps: [
      "Open the repository and explore the guide.",
      "Check the licence and the issue tracker.",
      "Try the app, share feedback or contribute a change.",
    ],
    cta: "Open on GitHub",
    href: "https://github.com/todor-rusev/viberoom",
    visual: "open",
    visualTitle: "Built in the open. Ready for your ideas.",
  },
  {
    id: "mobile",
    tint: "orchid",
    label: "Take the room with you",
    title: "A thought doesn’t wait for your desk.",
    summary: "Continue the conversation from your phone through Telegram.",
    intro:
      "Pair Telegram once and your rooms come with you. Read an agent’s reply, send the next thought or stop a running response from the phone in your pocket.",
    points: [
      [
        "Same room, another way in",
        "Replies arrive in Telegram and your answers return to the room. Use /rooms to find the rooms that are open.",
      ],
      [
        "Choose what travels",
        "Keep any room off the phone from that room’s settings. Pairing uses your own Telegram bot and a private key card.",
      ],
      [
        "Your computer does the work",
        "Keep the computer awake and viberoom running while you use the phone. Telegram is the mobile connection to that room.",
      ],
    ],
    steps: [
      "Ask a vibemate to help set up Telegram.",
      "Create your bot, enter its key on the private card and pair your phone.",
      "Send /rooms in Telegram and carry on with the conversation.",
    ],
    cta: "Read the phone guide",
    href: "https://github.com/todor-rusev/viberoom#from-your-phone",
    visual: "mobile",
    visualTitle: "The room goes where the thought goes.",
  },
];

export const icons = {
  interface:
    '<rect x="3" y="4" width="26" height="24" rx="6"/><path d="M3 11h26M10 11v17"/><g class="rig-part"><path d="M16 17h7m-7 5h4"/><circle cx="7" cy="7.5" r=".7"/></g>',
  memory:
    '<path d="M16 8C11 4 6 5 3 7v20c4-3 8-3 13 0 5-3 9-3 13 0V7c-3-2-8-3-13 1v19"/><g class="rig-part"><path d="M7 12l5 1M7 17l5 1M20 13l5-1M20 18l5-1"/></g>',
  skills:
    '<path d="M5 13v-6h9M18 25h9v-7"/><g class="rig-part"><path d="M13 12l7 7m-5-9l7 7m-12-2l7 7M5 19l8-8 8 8-8 8zM20 6l6 6M22 4l6 6"/></g>',
  control:
    '<path d="M4 8h24M4 16h24M4 24h24"/><g class="rig-part"><circle cx="11" cy="8" r="3"/><circle cx="22" cy="16" r="3"/><circle cx="15" cy="24" r="3"/></g>',
  open: '<path d="M11 8L3 16l8 8M21 8l8 8-8 8"/><g class="rig-part"><path d="M18 5l-4 22"/></g>',
  mobile:
    '<rect x="7" y="2" width="18" height="28" rx="5"/><path d="M13 6h6M14 26h4"/><g class="rig-part"><path d="M11 12h10v7h-5l-4 3v-3h-1z"/></g>',
};
