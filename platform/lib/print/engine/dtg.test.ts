import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DtgLayer, Raster } from '@/lib/print/types';
import { DEFAULT_RECIPE } from '@/lib/print/defaults';
import { prepareDtg } from './index';
import { BLACK, WHITE, drawArt, sha256, type Shape } from './testing';

const NEAR_BLACK: [number, number, number] = [16, 16, 18];
const SHAPES: Shape[] = [
  // an opaque near-black panel: the shirt on black, ink on white
  { kind: 'rect', x: 0, y: 0, w: 300, h: 450, colour: NEAR_BLACK },
  { kind: 'circle', cx: 150, cy: 120, r: 60, colour: [255, 255, 255] },
  { kind: 'glow', cx: 450, cy: 220, r: 120, colour: [215, 38, 61] },
  { kind: 'ring', cx: 150, cy: 330, r: 70, width: 16, colour: [27, 79, 156] },
];

function art(): Raster {
  const a = drawArt(600, 450, SHAPES);
  // a one-pixel speck, well under 0.25 mm once printed
  const i = (40 * 600 + 560) * 4;
  a.data.set([240, 240, 240, 255], i);
  return a;
}

async function layers(): Promise<Record<string, DtgLayer>> {
  const res = await prepareDtg({ art: art(), placement: { position: 'front_chest', widthMm: 100 }, garments: [BLACK, WHITE], recipe: DEFAULT_RECIPE });
  return Object.fromEntries(res.layers.map((l) => [l.garmentCode, l]));
}

/** RGBA of the layer at art pixel (x, y), or null outside the crop. */
function pixel(l: DtgLayer, x: number, y: number): number[] | null {
  const s = l.printAreaPx.width / 600;
  const cx = Math.round(x * s) - l.offsetPx.x;
  const cy = Math.round(y * s) - l.offsetPx.y;
  if (cx < 0 || cy < 0 || cx >= l.raster.width || cy >= l.raster.height) return null;
  const i = (cy * l.raster.width + cx) * 4;
  return [...l.raster.data.subarray(i, i + 4)];
}

test('alpha is strictly 0 or 255, at 300 ppi, cropped to the print', async () => {
  const ls = await layers();
  for (const l of Object.values(ls)) {
    assert.equal(l.raster.ppi, 300);
    assert.equal(l.raster.channels, 4);
    assert.equal(l.printAreaPx.width, Math.round((100 / 25.4) * 300));
    assert.ok(l.offsetPx.x >= 0 && l.offsetPx.y >= 0);
    assert.ok(l.offsetPx.x + l.raster.width <= l.printAreaPx.width && l.offsetPx.y + l.raster.height <= l.printAreaPx.height);
    const d = l.raster.data;
    for (let i = 0; i < d.length; i += 4) {
      assert.ok(d[i + 3] === 0 || d[i + 3] === 255, `alpha ${d[i + 3]}`);
      if (d[i + 3] === 0) assert.equal(d[i] + d[i + 1] + d[i + 2], 0, 'transparent pixels carry no colour');
    }
  }
});

test('the garment colour is knocked out per garment', async () => {
  const ls = await layers();
  const onBlack = pixel(ls.C002, 60, 400);
  assert.ok(onBlack === null || onBlack[3] === 0, 'near-black panel is the black shirt');
  const onWhite = pixel(ls.C001, 60, 400);
  assert.ok(onWhite && onWhite[3] === 255, 'near-black panel prints on white');
  assert.deepEqual(onWhite.slice(0, 3), NEAR_BLACK);
});

test('whites: white ink on dark garments, nothing on white garments', async () => {
  const ls = await layers();
  assert.equal(ls.C002.whitesTransparent, false);
  assert.equal(ls.C001.whitesTransparent, true);
  assert.deepEqual(pixel(ls.C002, 150, 120), [255, 255, 255, 255]);
  const w = pixel(ls.C001, 150, 120);
  assert.ok(w && w[3] === 0, 'RGB 255 on a white shirt prints no ink');
  const d = ls.C001.raster.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 255) assert.ok(!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255), 'no RGB 255 left on white');
  }
});

test('fades are halftoned; hard edges are not', async () => {
  const ls = await layers();
  for (const l of Object.values(ls)) {
    assert.ok(l.fadeShare > 0.05 && l.fadeShare < 0.9, `fade share ${l.fadeShare}`);
    // glow at about 50% alpha: a mix of dots
    let on = 0;
    let n = 0;
    for (let y = 205; y < 235; y++) {
      for (let x = 500; x < 520; x++) {
        const p = pixel(l, x, y);
        n++;
        if (p && p[3] === 255) on++;
      }
    }
    assert.ok(on / n > 0.15 && on / n < 0.85, `${l.garmentCode} glow coverage ${on / n}`);
    // the ring's band is solid across its width, with no dots in it
    let solid = 0;
    for (let x = 216; x < 226; x++) {
      const p = pixel(l, x, 330);
      if (p && p[3] === 255) solid++;
    }
    assert.equal(solid, 10, `${l.garmentCode} ring`);
  }
});

test('specks under the smallest feature are dropped', async () => {
  const ls = await layers();
  const p = pixel(ls.C002, 560, 40);
  assert.ok(p === null || p[3] === 0);
});

test('same input, same bytes', async () => {
  const a = await layers();
  const b = await layers();
  for (const code of Object.keys(a)) {
    assert.equal(sha256(a[code].raster.data), sha256(b[code].raster.data));
    assert.deepEqual(a[code].offsetPx, b[code].offsetPx);
  }
});

test('a proof shows the print at true size: tall art runs past the print box instead of shrinking into it', async () => {
  const { renderDtgProof } = await import('./index');
  const sharp = (await import('sharp')).default;
  // A plain grey "packshot" with a print box half its width wide and 0.4 of its height tall (a square box on a 4:5 photo).
  const shot = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#808080' } }).png().toBuffer();
  const box = { x: 0.25, y: 0.1, w: 0.5, h: 0.4 };
  const proofOf = async (w: number, h: number) => {
    const art = drawArt(w, h, [{ kind: 'rect', x: 0, y: 0, w, h, colour: [215, 38, 61] }]);
    const res = await prepareDtg({ art, placement: { position: 'front_chest', widthMm: 100 }, garments: [WHITE], recipe: DEFAULT_RECIPE });
    const proof = await renderDtgProof(res.layers[0], { garment: WHITE, placement: { position: 'front_chest', widthMm: 100 }, packshot: { image: shot, printBox: box } });
    const { data, info } = await sharp(proof.image).raw().toBuffer({ resolveWithObject: true });
    const red = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return data[i] > data[i + 1] + 40;
    };
    const mid = Math.floor(info.width / 2);
    const rows: number[] = [];
    for (let y = 0; y < info.height; y++) if (red(mid, y)) rows.push(y);
    let across = 0;
    for (let x = 0; x < info.width; x++) if (red(x, rows[0] + 3)) across++;
    const boxW = box.w * info.width;
    return { overflow: proof.overflow ?? 0, width: across / boxW, height: (rows[rows.length - 1] - rows[0] + 1) / boxW };
  };

  // Square art fits the square box: the box's width, as tall as wide, nothing past it.
  const square = await proofOf(300, 300);
  assert.equal(square.overflow, 0);
  assert.ok(Math.abs(square.width - 1) < 0.02, `square print spans ${square.width} of the box`);
  assert.ok(Math.abs(square.height - 1) < 0.02, `square print is ${square.height} box widths tall`);

  // 2:3 art keeps the box's full width and runs one and a half widths down, past the box: a third of it.
  const tall = await proofOf(300, 450);
  assert.ok(Math.abs(tall.width - 1) < 0.02, `tall print spans ${tall.width} of the box, not shrunk`);
  assert.ok(Math.abs(tall.height - 1.5) < 0.03, `tall print is ${tall.height} box widths tall`);
  assert.ok(Math.abs(tall.overflow - 1 / 3) < 0.01, `overflow ${tall.overflow}`);
});
