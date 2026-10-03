import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
// Web delivery encoding; retain the composition, dimensions and alpha.
// Pass a source directory containing the four generated PNGs.
const source = process.argv[2];
if (!source) throw Error("Pass the PNG source directory.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const name of ["studio", "memory", "connections", "mobile"]) {
    const input = await readFile(resolve(source, name + ".png"));
    const encoded = await page.evaluate(async (data) => {
      const img = new Image();
      img.src = "data:image/png;base64," + data;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      return canvas.toDataURL("image/webp", 0.9).split(",")[1];
    }, input.toString("base64"));
    const output = Buffer.from(encoded, "base64");
    await writeFile(
      new URL(`../site/assets/world/${name}.webp`, import.meta.url),
      output,
    );
    console.log(`${name}: ${input.length} → ${output.length} bytes`);
  }
} finally {
  await browser.close();
}
