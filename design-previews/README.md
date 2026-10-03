# Spatial visual studies

The current working motion direction is in [`motion/`](motion/README.md).
It replaces the storyboard presentation with progressive messages, a continuous camera sequence,
and pointer/scroll parallax. The five static studies below are retained for reference.

Five static art directions for the website: Pearl, Afterglow, Atelier, Portal, and Thread. Open `index.html`,
or run `node scripts/preview-designs.mjs` from the project root and visit the printed local address.
The direction selector switches complete compositions. The four-frame storyboard describes the
proposed camera choreography; no motion sequence is implemented in these studies.

Portal places the real product in a sculptural doorway: the proposed camera enters the space
before following the conversation. Thread unfolds real message close-ups along a curved route
around the full product: the proposed camera follows the hand-offs and returns to the room.
Their scene-specific styles are in `spatial-directions.css`.

## Product fidelity

The product panels and message close-ups are screenshots of the **actual viberoom demo renderer**,
using its styles, avatars, navigation, and message components. Only the example conversation and
room metadata are adapted. No alternative chat interface is drawn. The conversation is a scripted
illustration, not a claim that the agents performed real work during capture.

The source is the product's `docs/demo` directory. To regenerate its screenshots:

```sh
node scripts/capture-design-previews.mjs /path/to/viberoom/docs/demo
```

Capture uses the light VibeClassic, VibeClassic Dark, and 3D Clayful looks. The composition uses
local fonts and assets. Nunito's license is under `assets/fonts/OFL.txt`.

## Review

`renders/1-desktop.png` through `5-desktop.png` are the rendered landing compositions.
The corresponding mobile and storyboard images show the responsive layouts and camera plan.
Run the preview server, then `node scripts/review-design-previews.mjs` to refresh them.
Pass direction numbers to refresh a subset, for example `node scripts/review-design-previews.mjs 4 5`.

These files live outside `site/` and are not part of the deployed Pages artifact.
The existing site's implementation is unchanged by these studies.
