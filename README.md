# vibestaff.bot

The download page for [viberoom](https://github.com/todor-rusev/viberoom): one button per system,
the demo, and what the thing is.

A static site — the committed `site/` directory **is** the deployed artifact, there is no build step.
GitHub Pages serves it through `.github/workflows/pages.yml`.

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
