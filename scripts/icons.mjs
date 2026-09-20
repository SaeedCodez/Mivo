// Generates the extension icons from scripts/icon.png (pixel "M" on black). Needs macOS `sips`.
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "icon.png");
const out = join(here, "..", "src", "icons");
await mkdir(out, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  execFileSync("sips", ["-z", String(size), String(size), source, "--out", join(out, `${size}.png`)], {
    stdio: "ignore",
  });
}
console.log("icons written");
