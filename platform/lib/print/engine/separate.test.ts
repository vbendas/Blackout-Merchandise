import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { InkSystemProfile, PrintRecipe, ScreenSet, SeparationInput } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, mergeRecipe } from '@/lib/print/defaults';
import { deltaE2000, hexToLab, rgb8ToLab } from './colour';
import { separateScreen, targetBoxes } from './index';
import { mmToPx } from './units';
import { BLACK, LABEL, NAVY, WHITE, distinctValues, drawArt, sha256, type Rgb, type Shape } from './testing';

const YELLOW: Rgb = [242, 194, 48];
const RED: Rgb = [215, 38, 61];
const BLUE: Rgb = [27, 79, 156];
const PURE_WHITE: Rgb = [255, 255, 255];

// 600 x 450 px over 100 mm: 152 ppi, so the work grid is the art itself
const FLAT: Shape[] = [
  { kind: 'rect', x: 40, y: 60, w: 240, h: 330, colour: YELLOW },
  { kind: 'rect', x: 280, y: 220, w: 80, h: 170, colour: BLUE },
  { kind: 'circle', cx: 440, cy: 150, r: 110, colour: RED },
  { kind: 'ring', cx: 470, cy: 340, r: 60, width: 18, colour: BLUE },
];
const WIDTH_MM = 100;
const RECIPE: PrintRecipe = mergeRecipe(DEFAULT_RECIPE, { screenPpi: 300 });

function input(shapes: Shape[], garments = [BLACK, WHITE], recipe = RECIPE, inks: InkSystemProfile = DEFAULT_INK_SYSTEM): SeparationInput {
  return { art: drawArt(600, 450, shapes), placement: { position: 'front_chest', widthMm: WIDTH_MM }, garments, recipe, inks, label: LABEL };
}

function plateOf(set: ScreenSet, hexNear: Rgb) {
  const lab = rgb8ToLab(...hexNear);
  const p = set.plates.find((q) => q.role === 'ink' && deltaE2000(q.target.lab, lab) < 3);
  assert.ok(p, `no plate near ${hexNear} in ${set.key}: ${set.plates.map((q) => q.target.hex).join(' ')}`);
  return p;
}

/** Print-area pixel of art pixel (x, y), as a canvas index. */
function at(set: ScreenSet, x: number, y: number): number {
  const { art, widthPx } = set.canvas;
  const s = art.width / 600;
  return (art.y + Math.round(y * s)) * widthPx + art.x + Math.round(x * s);
}

let flatResult: Awaited<ReturnType<typeof separateScreen>> | null = null;
async function flat() {
  flatResult ??= await separateScreen(input(FLAT));
  return flatResult;
}

test('flat three-colour art separates as spot: underbase plus three inks on black, three inks on white', async () => {
  const res = await flat();
  assert.equal(res.method, 'spot');
  assert.equal(res.needsManual, false);
  assert.match(res.methodReason, /^Flat colour: 3 inks/);
  const darks = res.sets.find((s) => s.key === 'darks');
  const lights = res.sets.find((s) => s.key === 'lights');
  assert.ok(darks && lights);
  assert.deepEqual(darks.garmentCodes, ['C002']);
  assert.deepEqual(lights.garmentCodes, ['C001']);
  assert.deepEqual(
    darks.plates.map((p) => p.role),
    ['underbase', 'ink', 'ink', 'ink'],
  );
  assert.equal(lights.plates.length, 3);
  assert.ok(lights.plates.every((p) => p.role === 'ink'));
  assert.equal(darks.needsUnderbase, true);
  assert.equal(lights.needsUnderbase, false);
});

test('ink targets are the art’s colours, printed light to dark, on the right bases', async () => {
  const res = await flat();
  for (const set of res.sets) {
    for (const c of [YELLOW, RED, BLUE]) {
      const p = plateOf(set, c);
      assert.ok(deltaE2000(p.target.lab, rgb8ToLab(...c)) < 2, `${set.key} ${p.target.hex}`);
      assert.equal(p.base, set.needsUnderbase ? 'HB Opaque' : 'HB Neutral');
      assert.equal(p.pantone, null);
      assert.ok(Math.abs(p.target.lab.L - hexToLab(p.target.hex).L) < 0.01);
    }
    const inks = set.plates.filter((p) => p.role === 'ink');
    for (let i = 1; i < inks.length; i++) assert.ok(inks[i - 1].target.lab.L >= inks[i].target.lab.L, 'light to dark');
    set.plates.forEach((p, i) => assert.equal(p.index, i + 1));
  }
});

test('plates are binary, canvas-sized at the screen ppi, with coverage of the print area', async () => {
  const res = await flat();
  const set = res.sets[0];
  const { canvas } = set;
  const m = Math.round(mmToPx(25, 300));
  assert.equal(canvas.ppi, 300);
  assert.equal(canvas.art.width, Math.round(mmToPx(WIDTH_MM, 300)));
  assert.equal(canvas.art.height, Math.round(mmToPx(WIDTH_MM * 0.75, 300)));
  assert.equal(canvas.widthPx, canvas.art.width + 2 * m);
  assert.equal(canvas.heightPx, canvas.art.height + 2 * m);
  for (const p of set.plates) {
    assert.equal(p.plate.data.length, canvas.widthPx * canvas.heightPx);
    assert.equal(p.plate.ppi, 300);
    const values = [...distinctValues(p.plate.data)].sort((a, b) => a - b);
    assert.deepEqual(values, [0, 255]);
    assert.ok(p.coverage > 0.02 && p.coverage < 0.6, `coverage ${p.coverage}`);
  }
  // the yellow area is a 240 x 330 px rect of 600 x 450: about 29% of the print, plus its trap
  const yellow = plateOf(set, YELLOW);
  assert.ok(Math.abs(yellow.coverage - (240 * 330) / (600 * 450)) < 0.02, `yellow ${yellow.coverage}`);
});

test('registration targets are identical on every plate and clear of the art', async () => {
  const res = await flat();
  for (const set of res.sets) {
    const boxes = targetBoxes(set.canvas, RECIPE.marks.targetOffsetMm);
    const { art, widthPx } = set.canvas;
    for (const b of boxes) {
      const overlaps = b.x < art.x + art.width && b.x + b.width > art.x && b.y < art.y + art.height && b.y + b.height > art.y;
      assert.equal(overlaps, false, 'target clear of the art');
      const crop = (data: Uint8Array): Uint8Array => {
        const out = new Uint8Array(b.width * b.height);
        for (let y = 0; y < b.height; y++) out.set(data.subarray((b.y + y) * widthPx + b.x, (b.y + y) * widthPx + b.x + b.width), y * b.width);
        return out;
      };
      const first = crop(set.plates[0].plate.data);
      assert.ok(first.some((v) => v === 255), 'a target is drawn');
      for (const p of set.plates) assert.equal(sha256(crop(p.plate.data)), sha256(first));
    }
    // and every plate carries a label strip in the bottom margin
    for (const p of set.plates) {
      let ink = 0;
      for (let y = art.y + art.height + 1; y < set.canvas.heightPx; y++) {
        for (let x = 0; x < widthPx; x++) if (p.plate.data[y * widthPx + x]) ink++;
      }
      assert.ok(ink > 500, 'label strip drawn');
    }
  }
});

test('traps: yellow spreads about 0.25 mm under the blue it meets, and only there', async () => {
  const res = await flat();
  const set = res.sets.find((s) => s.key === 'lights');
  assert.ok(set);
  const yellow = plateOf(set, YELLOW).plate.data;
  const blue = plateOf(set, BLUE).plate.data;
  const trapPx = Math.round(mmToPx(RECIPE.trapMm, 300));
  // a row through the yellow/blue edge at art x = 280
  const row = at(set, 0, 300);
  const start = at(set, 260, 300);
  let blueFirst = -1;
  let yellowLast = -1;
  for (let i = start; i < at(set, 330, 300); i++) {
    if (blue[i] && blueFirst < 0) blueFirst = i;
    if (yellow[i]) yellowLast = i;
  }
  assert.ok(blueFirst > 0 && yellowLast > 0);
  const overlap = yellowLast - blueFirst + 1;
  assert.ok(Math.abs(overlap - trapPx) <= 1, `overlap ${overlap} px, trap ${trapPx} px`);
  // no spread into bare garment: the yellow edge at art x = 40 is not widened
  let firstYellow = -1;
  for (let i = row; i < at(set, 80, 300); i++) {
    if (yellow[i]) {
      firstYellow = i;
      break;
    }
  }
  const expected = at(set, 40, 300);
  assert.ok(Math.abs(firstYellow - expected) <= 1, `left edge ${firstYellow - row} vs ${expected - row}`);
});

test('the underbase is the union of the inks, choked about 0.2 mm', async () => {
  const res = await flat();
  const set = res.sets.find((s) => s.key === 'darks');
  assert.ok(set);
  const ub = set.plates[0];
  assert.equal(ub.role, 'underbase');
  assert.equal(ub.base, 'Aquaflex V2 White');
  assert.equal(ub.target.hex, '#F2F2F0');
  const yellow = plateOf(set, YELLOW).plate.data;
  const chokePx = Math.round(mmToPx(RECIPE.underbaseChokeMm, 300));
  const from = at(set, 20, 200);
  const to = at(set, 80, 200);
  let firstInk = -1;
  let firstBase = -1;
  for (let i = from; i < to; i++) {
    if (yellow[i] && firstInk < 0) firstInk = i;
    if (ub.plate.data[i] && firstBase < 0) firstBase = i;
  }
  assert.ok(Math.abs(firstBase - firstInk - chokePx) <= 1, `inset ${firstBase - firstInk} px, choke ${chokePx} px`);
  // solid under the bright yellow
  let holes = 0;
  for (let i = at(set, 100, 200); i < at(set, 200, 200); i++) if (!ub.plate.data[i]) holes++;
  assert.equal(holes, 0);
});

test('same input, same bytes', async () => {
  const a = await flat();
  const b = await separateScreen(input(FLAT));
  assert.equal(a.sets.length, b.sets.length);
  for (let s = 0; s < a.sets.length; s++) {
    assert.equal(a.sets[s].plates.length, b.sets[s].plates.length);
    for (let p = 0; p < a.sets[s].plates.length; p++) assert.equal(sha256(a.sets[s].plates[p].plate.data), sha256(b.sets[s].plates[p].plate.data));
  }
  assert.deepEqual(
    a.sets.map((s) => s.plates.map((p) => [p.target.hex, p.coverage])),
    b.sets.map((s) => s.plates.map((p) => [p.target.hex, p.coverage])),
  );
});

test('white in the art: highlight white printed last on darks, knocked out on a white shirt', async () => {
  const res = await separateScreen(input([...FLAT, { kind: 'circle', cx: 160, cy: 200, r: 50, colour: PURE_WHITE }]));
  assert.equal(res.method, 'spot');
  const darks = res.sets.find((s) => s.key === 'darks');
  const lights = res.sets.find((s) => s.key === 'lights');
  assert.ok(darks && lights);
  assert.deepEqual(
    darks.plates.map((p) => p.role),
    ['underbase', 'ink', 'ink', 'ink', 'highlight'],
  );
  assert.equal(darks.plates[4].clientName, 'Highlight white');
  assert.equal(lights.plates.length, 3, 'the white shirt is the white');
  // the highlight sits on the white circle only
  const hw = darks.plates[4].plate.data;
  assert.equal(hw[at(darks, 160, 200)], 255);
  assert.equal(hw[at(darks, 100, 300)], 0);
});

test('black and navy share the dark screens; white gets its own', async () => {
  const res = await separateScreen(input(FLAT, [BLACK, NAVY, WHITE]));
  const darks = res.sets.find((s) => s.key === 'darks');
  assert.ok(darks);
  assert.deepEqual(darks.garmentCodes, ['C002', 'C727']);
  assert.equal(res.sets.length, 2);
});

test('a garment the shared screens would miss gets its own set', async () => {
  // a large opaque black panel: on black it is the shirt, on navy it must print
  const panel: Shape = { kind: 'rect', x: 0, y: 0, w: 600, h: 450, colour: [16, 16, 18] };
  const res = await separateScreen(input([panel, ...FLAT], [BLACK, NAVY]));
  assert.deepEqual(
    res.sets.map((s) => [s.key, s.garmentCodes]),
    [
      ['darks', ['C002']],
      ['C727', ['C727']],
    ],
  );
  assert.ok(res.warnings.some((w) => w.code === 'own_screen_set'));
  assert.ok(res.warnings.some((w) => w.code === 'solid_background'));
});

test('a fade prints as halftoned tints of its ink, edges stay hard', async () => {
  const shapes: Shape[] = [
    { kind: 'glow', cx: 300, cy: 225, r: 200, colour: RED },
    { kind: 'circle', cx: 300, cy: 225, r: 60, colour: RED },
  ];
  const res = await separateScreen(input(shapes, [WHITE]));
  assert.equal(res.method, 'spot');
  const set = res.sets[0];
  assert.equal(set.plates.length, 1);
  const red = set.plates[0].plate.data;
  // the glow at 40-50% alpha: a halftoned mid tone (the sRGB-blended glow
  // looks darker than a halftone of the same share, so coverage runs higher)
  const { art, widthPx } = set.canvas;
  const s = art.width / 600;
  let on = 0;
  let total = 0;
  let edges = 0;
  for (let y = Math.round(225 * s) - 12; y < Math.round(225 * s) + 12; y++) {
    for (let x = Math.round(400 * s); x < Math.round(420 * s); x++) {
      const i = (art.y + y) * widthPx + art.x + x;
      total++;
      if (red[i]) on++;
      if (red[i] !== red[i - 1]) edges++;
    }
  }
  assert.ok(on / total > 0.4 && on / total < 0.85, `tint coverage ${on / total}`);
  assert.ok(edges > total / 10, 'dots, not a solid area');
  assert.equal(red[at(set, 300, 225)], 255, 'solid core');
  assert.equal(red[at(set, 300, 25)] ?? 0, 0, 'nothing past the glow');
});

test('screen budget: more colours than screens is flagged; over the press heads is flagged', async () => {
  const palette: Rgb[] = [
    [230, 25, 75],
    [60, 180, 75],
    [255, 225, 25],
    [0, 130, 200],
    [245, 130, 48],
    [145, 30, 180],
    [70, 240, 240],
    [240, 50, 230],
    [128, 0, 0],
    [0, 0, 128],
  ];
  const shapes: Shape[] = palette.map((c, i) => ({ kind: 'rect', x: 20 + (i % 5) * 115, y: 40 + Math.floor(i / 5) * 200, w: 100, h: 170, colour: c }));
  const tight = await separateScreen(input(shapes, [WHITE]));
  assert.equal(tight.method, 'index', tight.methodReason);
  assert.equal(tight.needsManual, false);
  assert.equal(tight.sets[0].method, 'index');
  assert.ok(tight.sets[0].plates.length <= 8);
  assert.ok(!tight.warnings.some((w) => w.code === 'needs_index'));

  const wide = await separateScreen(input(shapes, [WHITE], mergeRecipe(RECIPE, { maxScreens: 15 })));
  assert.equal(wide.method, 'spot', wide.methodReason);
  assert.equal(wide.sets[0].plates.length, 10);
  const codes = wide.sets[0].warnings.map((w) => w.code);
  assert.ok(codes.includes('press_heads'));
  assert.ok(codes.includes('extra_screens'));
});
