# Ideas in motion — working direction 06

Run `node scripts/preview-designs.mjs 4879`, then open
`http://127.0.0.1:4879/motion/`. This is a review prototype outside the deployed `site/`.

This direction replaces the still storyboard presentation with a continuous, controllable
36-second scene. The sequence is: your request → Nova delegates → Kai responds → Rio reviews
→ Nova returns the result → camera pulls back to the whole room. The messages type into
the real product's DOM, with the camera gliding between the corresponding message bounds.
Pause, replay, seeking, and chapter selection work. This is an authored example, not a live agent session.

The visual direction uses violet, blue/coral light, and lime accents. Background light fields,
light trails, the product viewport, and foreground labels have different pointer/scroll offsets.
Reduced-motion starts on the complete conversation with playback and parallax off. Playback
suspends outside the demo area or when the tab is hidden. There is no network AI integration.

## Real product source

`room/` is generated from the actual product demo's rendered HTML, CSS, fonts, icons, and avatars.
It contains no application runtime or demo-data payload. Its source is
`agent-chat/docs/demo/vibeclassic-dark.html`, using the shared authored conversation in
`scripts/design-scene-data.mjs`. The exporter copies only the visual assets loaded by that page.
The message heights account for the product's own CSS zoom so typing does not move the camera targets.

Regenerate from a product checkout with:

```sh
node scripts/export-motion-room.mjs /path/to/viberoom/docs/demo
```

Do not edit generated product markup to invent a replacement interface. Changes to product
appearance should originate in its renderer; camera and playback belong in `motion.js`.

## Next website work

After the visual direction is settled, extend this motion language through the feature tour,
the real interactive demo, and installation flow. The old storyboard cards are planning material,
not content intended for the final landing page. The cinematic scene remains a controllable
sequence in the website; a downloadable rendered video would be a separate deliverable.

`node scripts/review-motion-preview.mjs` captures its keyframes and responsive layouts.
`node scripts/motion-preview.test.mjs` checks playback, seeking, target visibility, parallax,
responsive layout, reduced motion, and browser errors in Chromium, Firefox, and WebKit.
