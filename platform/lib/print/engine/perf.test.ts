// Budget check (Print-Prep-Build.md): a full front at 600 ppi with 8 plates
// in about 2 minutes, under 3 GB. Heavy, so it only runs on request:
//   PRINT_ENGINE_PERF=1 DATABASE_URL= npx tsx --test lib/print/engine/perf.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type { Raster } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE } from '@/lib/print/defaults';
import { prepareDtg, renderScreenLoupe, renderScreenProof, separateScreen } from './index';
import { BLACK, LABEL } from './testing';

/** Flat art for a 38 x 46 cm front at 200 ppi: six colours, white, a glow, fine lines. */
async function fullFrontArt(): Promise<Raster> {
  const w = 2992;
  const h = 3622;
  const colours = ['#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', '#911EB4'];
  const shapes = colours
    .map((c, i) => {
      const cx = 450 + (i % 3) * 1000;
      const cy = 700 + Math.floor(i / 3) * 1500;
      return `<circle cx="${cx}" cy="${cy}" r="420" fill="${c}"/><rect x="${cx - 300}" y="${cy + 450}" width="600" height="500" fill="${c}"/>`;
    })
    .join('');
  const lines = Array.from({ length: 40 }, (_, i) => `<line x1="100" y1="${3100 + i * 12}" x2="2890" y2="${3150 + i * 12}" stroke="#4363D8" stroke-width="${1 + (i % 4)}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g"><stop offset="0" stop-color="#E6194B" stop-opacity="1"/><stop offset="1" stop-color="#E6194B" stop-opacity="0"/></radialGradient></defs>
    <circle cx="1496" cy="1450" r="700" fill="url(#g)"/>${shapes}
    <circle cx="1496" cy="2600" r="260" fill="#FFFFFF"/>${lines}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  return { width: info.width, height: info.height, channels: 4, data: new Uint8Array(data.buffer, data.byteOffset, data.length), ppi: 200 };
}

test('full front at 600 ppi, 8 plates: time and memory', { skip: !process.env.PRINT_ENGINE_PERF }, async () => {
  const art = await fullFrontArt();
  const placement = { position: 'front_full', widthMm: 380 };
  const t0 = performance.now();
  const res = await separateScreen({ art, placement, garments: [BLACK], recipe: DEFAULT_RECIPE, inks: DEFAULT_INK_SYSTEM, label: LABEL });
  const tScreen = (performance.now() - t0) / 1000;
  const set = res.sets[0];
  const t1 = performance.now();
  const proofBg = await sharp({ create: { width: 1200, height: 1500, channels: 4, background: '#1B1C1E' } }).png().toBuffer();
  await renderScreenProof(set, { garment: BLACK, placement, packshot: { image: proofBg, printBox: { x: 0.18, y: 0.3, w: 0.65, h: 0.55 } } }, DEFAULT_INK_SYSTEM);
  await renderScreenLoupe(set, BLACK.code, DEFAULT_INK_SYSTEM);
  const tProof = (performance.now() - t1) / 1000;
  const t2 = performance.now();
  await prepareDtg({ art, placement, garments: [BLACK], recipe: DEFAULT_RECIPE });
  const tDtg = (performance.now() - t2) / 1000;
  const peakGb = process.resourceUsage().maxRSS / 1024 / 1024;
  console.log(
    JSON.stringify({
      canvas: `${set.canvas.widthPx}x${set.canvas.heightPx}`,
      plates: set.plates.map((p) => `${p.role} ${p.target.hex} ${(p.coverage * 100).toFixed(1)}%`),
      method: res.method,
      screenSeconds: +tScreen.toFixed(1),
      proofAndLoupeSeconds: +tProof.toFixed(1),
      dtgSeconds: +tDtg.toFixed(1),
      peakRssGb: +peakGb.toFixed(2),
    }),
  );
  assert.equal(res.method, 'spot', res.methodReason);
  assert.equal(set.plates.length, 8);
  assert.ok(tScreen < 120, `screen separation took ${tScreen}s`);
  assert.ok(peakGb < 3, `peak RSS ${peakGb} GB`);
});
