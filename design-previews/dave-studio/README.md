# Make room — an independent website direction

An editorial product site: warm paper, coral, cobalt, large Nunito type, and
small interactions that reveal a concrete benefit. The page scrolls normally.
There is no pointer-driven camera or continuous page animation.

Local preview: `http://127.0.0.1:4879/dave-studio/`.
From the website directory, start the existing preview server if needed:

```sh
node scripts/preview-designs.mjs 4879
```

## What works

- Open the actual product, explore it, close it, or return with browser Back.
- Watch two agents investigate duplicate orders after a payment retry. Pause
  and continue the stream. Their shared conclusion includes a Mermaid diagram.
- Move between two authored dates, keep a note, then search the real demo room
  and inspect its actual pinned message.
- Select a service to see its use, and open the real Connections and Skills views.
- Compare three product looks and open the selected look interactively.
- Open the real Channels settings from the Telegram section.

The paper note and service selector are explanatory interactions. They do not
connect services or edit a user's rooms. The embedded app is the public static
demo: mutations that need a running hub retain its read-only explanation.

## Product renderer and data

`demo/` is exported from `agent-chat/docs/demo/`, using the shipped renderer,
assets, native controls, and diagram rendering. `bridge.js` supplies a fictional
room and playback through the same socket event types used by the public demo.
No AI model, account, live hub, or external service is called. The two dates are
authored examples, not evidence collected over a year. Costs and the optional
memory provider are stated separately from the free application and local history.

The initial room has one agent. The colleague is added only for the collaboration
example. Navigation and responsive folding use native product controls.

`embed.css` disables transitions in the product's hidden Mermaid measurement
stage. The public stylesheet's reduced-motion `0.01ms` transition otherwise lets
intermediate node sizes enter layout and produces oversized, unreadable diagrams.
The copied product JavaScript is unchanged.

The product is AGPLv3 (`demo/LICENSE`); Nunito is OFL
(`assets/fonts/OFL.txt`, `demo/fonts/OFL.txt`).

## Rebuild and review

Run these from the website directory, using the actual public demo source path:

```sh
node design-previews/dave-studio/scripts/build-demo.mjs ../agent-chat/docs/demo
node design-previews/dave-studio/scripts/capture.mjs
node design-previews/dave-studio/scripts/review.mjs
```

The capture and review scripts accept an optional preview URL. Review output and
screenshots go to ignored `review/`. The automated checks cover Chromium,
Firefox and WebKit, widths 320–1920, lazy loading, native product navigation,
search, pins, look selection, pause/resume, Back, focus restoration, direct links,
reduced motion, diagram geometry, and asset/script errors. Browser engine tests
on Windows are not a claim of testing physical macOS/Linux or mobile devices.

This folder remains the editable source. Its exact static files are also published
at `https://vibestaff.bot/dave-studio/`, independently of the main landing page.
After editing, export the tracked source, check it, commit, and use the existing
publisher from the website directory:

```sh
npm run publish:preview -- dave-studio
npm run check
bash sync-site.sh --apply --message "Update the Make room preview"
```

Commit and push the notebook source before the public sync, so another computer
can continue from `Projects/vibestaff-site/design-previews/dave-studio/`.
