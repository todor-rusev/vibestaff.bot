import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// A named design stays editable under design-previews/ and is exported verbatim
// to the same path in the Pages artifact. Source scripts and review output stay out.
const root = fileURLToPath(new URL("../", import.meta.url));
const name = process.argv[2];
if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new Error("Choose a named design preview");
const source = resolve(root, "design-previews", name), site = resolve(root, "site"), target = resolve(site, name);
if (!target.startsWith(site + sep) || target === source || !existsSync(join(source, "index.html"))) throw new Error("Invalid preview export");
if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error("Preview export cannot follow a linked target");
const tracked = execFileSync("git", ["ls-files", "-z", "--", "."], { cwd: source, encoding: "utf8" }).split("\0").filter(Boolean);
const files = tracked.filter(path => !path.startsWith("scripts/") && !path.startsWith("review/") && path !== "README.md");
if (!files.includes("index.html")) throw new Error("Preview index must be tracked");
const paths = new Set(files);
function checked(base, path) {
  const result = resolve(base, path);
  if (!result.startsWith(base + sep)) throw new Error("Preview export path escaped its directory");
  return result;
}
// Remove stale files only inside this exact named export, preserving other pages.
function prune(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = checked(target, relative(target, join(directory, entry.name)));
    if (entry.isSymbolicLink()) throw new Error("Preview export cannot follow linked files");
    if (entry.isDirectory()) prune(path);
    else if (!paths.has(relative(target, path).replaceAll("\\", "/"))) unlinkSync(path);
  }
}
mkdirSync(target, { recursive: true });
prune(target);
for (const path of files) {
  const destination = checked(target, path);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(checked(source, path), destination);
}
console.log(`[publish-preview] ${name}: ${files.length} tracked public files exported to site/${name}/`);
