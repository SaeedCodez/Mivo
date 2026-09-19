// Generates the extension icons (red signal dot on black) without any dependency.
import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "icons");
await mkdir(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// Coverage of a rounded square / circle by 4x4 supersampling.
function render(size) {
  const SS = 4;
  const radius = size * 0.22;
  const dot = size * 0.2;
  const c = size / 2;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let box = 0;
      let red = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const dx = Math.max(radius - px, px - (size - radius), 0);
          const dy = Math.max(radius - py, py - (size - radius), 0);
          if (dx * dx + dy * dy <= radius * radius) box++;
          if ((px - c) ** 2 + (py - c) ** 2 <= dot * dot) red++;
        }
      }
      const n = SS * SS;
      const a = box / n;
      const r = red / n;
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = Math.round(0xd7 * r);
      raw[i + 1] = Math.round(0x19 * r);
      raw[i + 2] = Math.round(0x21 * r);
      raw[i + 3] = Math.round(255 * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) await writeFile(join(out, `${size}.png`), render(size));
console.log("icons written");
