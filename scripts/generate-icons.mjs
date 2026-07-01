import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/vite.svg", "utf-8");

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "fill" })
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`Generated public/icon-${size}.png`);
}