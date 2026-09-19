// Builds the extension into dist/.
// Everything the first paint needs (CSS + subsetted fonts as data URIs) is inlined
// into newtab.html, so opening a tab costs one HTML parse and one tiny script.
import { build } from "esbuild";
import subsetFont from "subset-font";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");

const fonts = [
  { family: "Doto", weight: 700, file: "@fontsource/doto/files/doto-latin-700-normal.woff2", chars: "0123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { family: "Space Mono", weight: 400, file: "@fontsource/space-mono/files/space-mono-latin-400-normal.woff2", chars: ascii + "·" },
  { family: "Space Grotesk", weight: 400, file: "@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2", chars: ascii + "·’" },
  { family: "Space Grotesk", weight: 500, file: "@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2", chars: ascii + "’" },
];

async function fontFaces() {
  const rules = [];
  for (const f of fonts) {
    const input = await readFile(join(root, "node_modules", f.file));
    const out = await subsetFont(input, f.chars, { targetFormat: "woff2" });
    const uri = `data:font/woff2;base64,${out.toString("base64")}`;
    rules.push(
      `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url(${uri}) format("woff2")}`,
    );
  }
  return rules.join("\n");
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const [css, html] = await Promise.all([
  readFile(join(src, "newtab.css"), "utf8"),
  readFile(join(src, "newtab.html"), "utf8"),
]);

const minCss = (await fontFaces()).concat("\n", css.replace("/*FONTS*/", ""))
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s*([{}:;,>])\s*/g, "$1")
  .replace(/\s+/g, " ")
  .trim();

const minHtml = html
  .replace("/*STYLE*/", () => minCss)
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/>\s+</g, "><");

await writeFile(join(dist, "newtab.html"), minHtml);

await build({
  entryPoints: [join(src, "newtab.ts")],
  outfile: join(dist, "newtab.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: "chrome114",
});

const manifest = JSON.parse(await readFile(join(src, "manifest.json"), "utf8"));
manifest.version = pkg.version;
await writeFile(join(dist, "manifest.json"), JSON.stringify(manifest));
await cp(join(src, "icons"), join(dist, "icons"), { recursive: true });

console.log("built dist/ (v" + pkg.version + ")");
