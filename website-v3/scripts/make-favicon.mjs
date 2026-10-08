// Wraps a PNG (default: the built /icon route render) into app/favicon.ico.
// Usage: node scripts/make-favicon.mjs <source.png>
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('usage: make-favicon.mjs <source.png>');
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(src).resize(s, s).png().toBuffer()));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const o = 6 + 16 * i;
  head[o] = s;
  head[o + 1] = s;
  head.writeUInt16LE(1, o + 4);
  head.writeUInt16LE(32, o + 6);
  head.writeUInt32LE(pngs[i].length, o + 8);
  head.writeUInt32LE(offset, o + 12);
  offset += pngs[i].length;
});
writeFileSync(new URL('../app/favicon.ico', import.meta.url), Buffer.concat([head, ...pngs]));
console.log('favicon.ico written');
