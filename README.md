# vibestaff.bot

A spatial introduction to [viberoom](https://github.com/todor-rusev/viberoom). The whole site is a
navigable world: six feature destinations, a collaboration investigation, and downloads. The room
sits at its centre. Choose a node, move into its explanation, dive into the practical guide and go
back to the same map position and zoom.

The committed `site/` directory is the deployed artifact. GitHub Pages serves it through
`.github/workflows/pages.yml`; deployment needs no build step.

## The spatial navigation

`site/assets/world-map.js` describes the destinations. `world.js` owns the camera, drag and zoom,
layer parallax, fragment routes, browser history and keyboard focus. The URL records the current
destination (`#/memory`) and its nested guide (`#/memory/how`). A direct link supports a useful
Go back even without an earlier in-app history entry. The map remembers a visitor's pan and zoom
while they explore a topic. On narrow screens its nodes form a taller connected world.

The art, links and foreground objects move on separate depth planes. Illustrations are accompanied
by articulated agent arms and heads, turning pages, travelling signals and moving controls.
The Motion switch and the system's reduced-motion preference disable decorative animation and
camera easing. Normal links, buttons and keyboard focus remain available.

Copy lives in `scripts/landing-content.mjs`. Run `npm run render` after editing it,
`scripts/render-world.mjs`, the map or `scripts/world-film.html`; commit the resulting HTML.
The six guides, their steps, downloads and a readable demo transcript are also present without JS.

## The investigation

`site/assets/investigation-scene.js` is the single source for the authored dialogue, timings,
chapters and transcript. The 34-second example investigates a checkout regression: one agent
compares events, the other checks code, a counterexample changes the initial conclusion, and the
cause and focused fix are drawn in a Mermaid diagram. The scene and its illustrative data are
explicitly labelled. No agents run or receive visitor input on the website.

`demo-player.js` types into and frames the real product DOM exported in `site/demo/room/`.
There is no separate imitation chat UI. Camera moves take around 280 ms, with the next reply
starting on arrival. Playback offers pause, replay, seeking and chapters; it suspends outside the
demo destination, outside the visible panel and in a hidden tab. Reduced motion starts on the
finished scene and permits manual playback.

Regenerate the product fixture after changing dialogue or the diagram:

```sh
node scripts/export-motion-room.mjs /path/to/product/docs/demo --site
npm run render
```

The exporter waits for the actual product's Mermaid renderer and fonts, then saves the rendered
interface and required assets without the app runtime or fixture payload. It includes the product's
AGPLv3 licence and font licence. Without `--site`, it still refreshes the earlier standalone study.

## Artwork

The four original illustrations were made with the built-in image_gen tool. Their complete prompts
and final asset paths are recorded in `scripts/world-art-prompts.json`. The site uses WebP assets
in `site/assets/world/`, under 1 MB together. `scripts/encode-world-art.mjs <png-directory>`
encodes generated PNG originals for web delivery, retaining their dimensions and alpha.
Nunito and all animation assets are local; animation has no CDN dependency. The font licence is in
`site/assets/fonts/OFL.txt`.

## Verification

```sh
npm ci
npx playwright install chromium firefox webkit
npm run check
npm test
npm test -- firefox
npm test -- webkit
```

The tests serve the static artifact and cover distinct parallax depths, articulated movement,
all feature routes and nested guides, history, focus, restored pan and zoom, the investigation,
diagram drawing, five widths, downloads, reduced motion and the no-JS content.
`scripts/review-world.mjs <screenshot-directory> [engine]` takes visual review images from a
local site server at port 4877. Review the actual movement and typography when changing artwork,
layout, camera timing or the source product styles.

## The page never carries a version

`site/assets/download.js` asks GitHub for the newest release and matches its assets by shape
(`viberoom-<version>-<os>-<arch>.<ext>`, written by `shell/electron-builder.yml`). Publishing a release
therefore needs no edit here.

Three states, each of them said out loud rather than left blank:

| state | when | what the button does |
| --- | --- | --- |
| ready | the release has a file for that system | downloads it, and says the size and the tag |
| none | no file for that system, or no release yet | offers `npm install -g viberoom`, and says why |
| unreachable | GitHub did not answer (offline, rate limit) | opens the releases page |

**Windows has a second channel.** When the Microsoft Store listing exists, put its address in `STORE_URL`
at the top of `download.js`: the Store becomes the first button and the direct installer stays beside it.
Until then the card offers whatever the release holds.

`/get/windows/`, `/get/mac/` and `/get/linux/` are stable addresses that resolve the same way and hand the
file over — for a README badge, or a link in a conversation.

## Publishing

```
node scripts/check.mjs        # the gate, on its own
bash sync-site.sh             # dry run: copy tracked files, gate them, report
bash sync-site.sh --apply     # commit and push to the public site repository
```

The public repository is written **only** through `sync-site.sh`. It builds an ephemeral copy from the
git-tracked files, runs the gate, and commits with a **pinned** identity — never the one in the machine's
git config.

## The gate

`scripts/check.mjs` runs before every publish, here and in the workflow:

- **presence** — the pages, the stylesheet, the resolver and the `CNAME` all exist and are not stubs.
- **links** — every local `href`/`src`/`url()` resolves to a file that is really there.
- **leaks** — no Cyrillic, no private folder names, no paths from a disk, no tokens. The author's name is
  allowed in exactly one shape: the public GitHub addresses.

## The domain

`vibestaff.bot` is registered at Porkbun. GitHub Pages needs, at the registrar:

| type | host | answer |
| --- | --- | --- |
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME | `www` | `<owner>.github.io` |

`site/CNAME` carries the domain into the artifact; without it every deploy drops the custom domain, which
is why the gate refuses to publish when it is missing or says something else.


## Temporary unlisted content
An optional `.deploy/temporary-content.bin` holds an authenticated encrypted static-page overlay. Pages restores it after the existing public-site gate using the repository secret `SITE_OVERLAY_KEY`; the route and personal artwork are absent from the public source tree. The resulting website is public to anyone with its URL, and Pages deployment artifacts can also expose its contents to GitHub users. This is obscurity, not access control.

To remove the temporary page, remove the encrypted bundle and publish through `sync-site.sh --apply`; then remove the unused repository secret. A complete Pages deployment replaces the old artifact, so the route disappears. The restoration script validates the random route, file paths, allowed types, noindex directive and local dependencies before writing any content.
