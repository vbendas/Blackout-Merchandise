// Builds scripts/fonts/og-halftone.png: a grayscale halftone dot screen
// (bone dots on #141414) of the gallery cover crop, used by
// app/opengraph-image.tsx. Run: node scripts/gen-og-halftone.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 540;
const H = 630;
const CELL = 9;

const { data, info } = await sharp(path.join(root, 'public/gallery/7a.png'))
  .extract({ left: 0, top: 0, width: 928, height: 1083 })
  .resize(W / CELL, H / CELL, { fit: 'fill' })
  .grayscale()
  .normalise()
  .raw()
  .toBuffer({ resolveWithObject: true });

let dots = '';
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const v = data[y * info.width + x] / 255;
    const r = Math.pow(v, 0.9) * CELL * 0.62;
    if (r < 0.4) continue;
    // 45deg-ish offset on alternate rows for a screen look
    const cx = x * CELL + CELL / 2 + (y % 2 ? CELL / 4 : 0);
    dots += `<circle cx="${cx.toFixed(1)}" cy="${(y * CELL + CELL / 2).toFixed(1)}" r="${r.toFixed(2)}"/>`;
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#141414"/><g fill="#ede4dd">${dots}</g></svg>`;
await sharp(Buffer.from(svg)).png().toFile(path.join(root, 'scripts/fonts/og-halftone.png'));
console.log('ok');
