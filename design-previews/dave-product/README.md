# Product-first design study

An independent website direction for review. Everything is confined to this directory; it does not replace `site/` or another designer's version.

The concept: keep your agent and give it a better everyday workspace. The real application is the principal visual. Six benefit destinations change the product view and the short explanation alongside it. Warm green, peach and cream, the existing Nunito font and the current product icon connect the presentation to viberoom. Motion responds to an explicit choice; there is no pointer-driven parallax or moving background.

## Preview

From `Projects/vibestaff-site`:

```sh
node scripts/preview-designs.mjs 4879
```

Open `http://127.0.0.1:4879/dave-product/`.

Try the agent choices, Memory → Find a message, Skills & tools, How it works, and Take a closer look. URLs such as `#memory/history` and `#tools/skills` preserve the selected view; browser Back returns through those choices. The app's complete public interactive demo is linked beside the preview.

The separate 34-second investigation uses the actual exported product DOM with progressive messages, camera movement and a drawn dependency diagram. It loads on demand, pauses on close and supports seeking, chapters and a text transcript. The scenario and numbers are illustrative, not a customer result. The introductory solo-agent diagram also animates directly in the real exported DOM.

## Visual sources

`assets/*-room.html` and `assets/screens/` are exports/captures of the product's `docs/demo` renderer with an authored launch-plan fixture. The provider choices show the same example rendered with different agent identities; they do not call an AI service or migrate a real session. Other screens are captures of the product's actual pins, history search, settings, skills and connections views. They are explicitly labelled as product views and can be enlarged; the full demo link is available for free exploration. No generated decorative illustrations are used.

`film-room/` is the existing sanitized product export from the local website study; it includes its AGPLv3 licence. The self-hosted Nunito fonts include their OFL. Vendor marks come from the product demo. The current application icon is reused unchanged.

Regenerate the solo views and screen captures with:

```sh
node design-previews/dave-product/scripts/capture.mjs /absolute/path/to/agent-chat/docs/demo
```

## Validation

```sh
node design-previews/dave-product/scripts/review.mjs
```

The review checks Chromium, Firefox and WebKit; widths 320, 390, 768, 1024 and 1440; hash destinations, deep links, browser history, complete app framing, modal focus return, the real eight-message investigation and seven-node diagram, pause on close, and reduced motion. Screenshots and the result JSON go to the ignored `review/` directory.

The download button opens the official latest-release page; npm is linked separately. Product copy distinguishes local complete history from optional provider-backed semantic memory, and explains that Telegram requires the computer to remain awake and viberoom running. Provider accounts and usage costs remain separate from the free application.

This is a reviewable local alternative. It has not been published.
