// The film around the design (owner decision, 16 Oct 2026): A2 portrait at
// most, 10 mm of film at the sides and 27 mm above and below, registration
// targets at the four corners only, the label strip between them, a 10 mm ink
// gap between the design and both, and no design over 40 × 54 cm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CanvasSpec, PrintRecipe, ScreenSet } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, FILM_SHEET_CM, MAX_DESIGN_CM, filmLayout, mergeRecipe } from '@/lib/print/defaults';
import { renderChartFilms } from '@/lib/print/calibration/chart';
import { hexToLab } from './colour';
import { relabelPlate, separateScreen } from './index';
import { drawLabelStrip, drawTargets, labelBands, targetBoxes, targetGeometry, type LabelLines } from './marks';
import { assertFitsFilm, canvasSpec, filmCanvas, mmToPx, printSize } from './units';
import { BLACK, LABEL, drawArt, sha256, type Shape } from './testing';

const CORNERS = ['top left', 'top right', 'bottom left', 'bottom right'];

/** Red, blue, yellow and orange with a white disc: on black, an underbase, inks and a highlight white. */
const SHAPES: Shape[] = [
  { kind: 'rect', x: 20, y: 20, w: 150, h: 120, colour: [228, 38, 44] },
  { kind: 'circle', cx: 290, cy: 90, r: 70, colour: [255, 255, 255] },
  { kind: 'rect', x: 20, y: 170, w: 150, h: 120, colour: [31, 63, 191] },
  { kind: 'circle', cx: 290, cy: 230, r: 60, colour: [255, 212, 0] },
  { kind: 'rect', x: 380, y: 30, w: 80, h: 280, colour: [247, 148, 29] },
];
const RECIPE_300: PrintRecipe = mergeRecipe(DEFAULT_RECIPE, { screenPpi: 300 });

function separation(recipe: PrintRecipe = RECIPE_300, widthMm = 80) {
  return separateScreen({ art: drawArt(480, 360, SHAPES), placement: { position: 'front', widthMm }, garments: [BLACK], recipe, inks: DEFAULT_INK_SYSTEM, label: LABEL });
}

/** The film around a target's centre, as far as its box reaches, as a hash. */
function targetPattern(data: Uint8Array, canvas: CanvasSpec, cx: number, cy: number): string {
  const g = targetGeometry(canvas);
  const r = g.armPx + Math.ceil(g.strokePx);
  const side = 2 * r + 1;
  const out = new Uint8Array(side * side);
  for (let y = 0; y < side; y++) out.set(data.subarray((cy - r + y) * canvas.widthPx + cx - r, (cy - r + y) * canvas.widthPx + cx + r + 1), y * side);
  return sha256(out);
}

test('a 40 × 54 cm design makes an A2 film at 600 ppi, 9921 × 14031 px; a smaller one keeps the margins', () => {
  // The defaults are the owner's sheet: the largest design and two margins make A2 both ways.
  const m = DEFAULT_RECIPE.marks;
  assert.deepEqual(m, { sideMarginMm: 10, endMarginMm: 27, inkGapMm: 10 });
  assert.equal(MAX_DESIGN_CM.widthCm * 10 + 2 * m.sideMarginMm, FILM_SHEET_CM.widthCm * 10);
  assert.ok(Math.abs(MAX_DESIGN_CM.heightCm * 10 + 2 * m.endMarginMm - FILM_SHEET_CM.heightCm * 10) < 1e-9);

  const size = printSize({ position: 'front', widthMm: 400 }, 4000, 5400, 600);
  assert.deepEqual([size.widthPx, size.heightPx], [9449, 12756]);
  const canvas = canvasSpec(size, filmLayout(m));
  // Rounding: the print area and the left and top margins are whole pixels (236 and 638 px), and the film's size is
  // rounded once from millimetres (420 mm = 9921.26 px, 594 mm = 14031.496 px), so the right margin is 236 px and
  // the bottom one 637 px.
  assert.deepEqual([canvas.widthPx, canvas.heightPx], [9921, 14031]);
  assert.deepEqual([canvas.widthPx, canvas.heightPx], [Math.round(mmToPx(420, 600)), Math.round(mmToPx(594, 600))]);
  assert.deepEqual(canvas.art, { x: 236, y: 638, width: 9449, height: 12756 });
  assert.equal(canvas.widthPx - canvas.art.x - canvas.art.width, 236);
  assert.equal(canvas.heightPx - canvas.art.y - canvas.art.height, 637);
  assert.deepEqual(canvas.layout, m);

  // The targets: on the design's left and right edges, 15 mm above and below it (10 mm of ink gap, then the 5 mm arm),
  // and 7 mm of film left to the sheet's edge; 5 mm to the side edges.
  const g = targetGeometry(canvas);
  assert.deepEqual(
    g.centres.map((c) => [c.name, c.x, c.y]),
    [
      ['top left', 236, 283],
      ['top right', 9684, 283],
      ['bottom left', 236, 13748],
      ['bottom right', 9684, 13748],
    ],
  );
  assert.equal(g.armPx, 118);
  assert.equal(283 - g.armPx, 165, '7 mm of film above the top targets');
  assert.equal(canvas.heightPx - 1 - (13748 + g.armPx), 164, 'and below the bottom ones');
  assert.equal(236 - g.armPx, 118, '5 mm beside the targets');

  // A smaller design: the same margins, so a smaller film (30 × 39 cm for a 28 × 33.6 cm print).
  const front = canvasSpec(printSize({ position: 'front', widthMm: 280 }, 2800, 3360, 600), filmLayout(m));
  assert.deepEqual([front.widthPx, front.heightPx], [Math.round(mmToPx(300, 600)), Math.round(mmToPx(390, 600))]);
  const margins = [front.art.x, front.widthPx - front.art.x - front.art.width, front.art.y, front.heightPx - front.art.y - front.art.height];
  margins.forEach((px, i) => assert.ok(Math.abs(px - mmToPx(i < 2 ? 10 : 27, 600)) <= 1, `margin ${i}: ${px} px`));
});

test('a print over 40 × 54 cm is refused, in words, before any work is done', async () => {
  // exactly the most passes, at the house resolution and the tests'
  for (const ppi of [600, 300]) assert.doesNotThrow(() => assertFitsFilm(printSize({ position: 'front', widthMm: 400 }, 4000, 5400, ppi)));
  const input = (widthMm: number, w: number, h: number) => ({
    art: drawArt(w, h, []),
    placement: { position: 'front', widthMm },
    garments: [BLACK],
    recipe: DEFAULT_RECIPE,
    inks: DEFAULT_INK_SYSTEM,
    label: LABEL,
  });
  // 400 mm wide at 40:56 is 56 cm tall; 41 cm is too wide whatever the height; and both at once
  await assert.rejects(separateScreen(input(400, 40, 56)), /The print is 56 cm tall; a design can be at most 40 × 54 cm, portrait, because a screen film is A2 \(42 × 59\.4 cm\) with room kept for the registration marks\. Make the print smaller\./);
  await assert.rejects(separateScreen(input(410, 60, 40)), /The print is 41 cm wide; a design can be at most 40 × 54 cm/);
  await assert.rejects(separateScreen(input(450, 45, 60)), /The print is 45 cm wide and 60 cm tall;/);
  // a millimetre over is over: a 54.1 cm print is not turned or squeezed onto the film
  assert.throws(() => canvasSpec(printSize({ position: 'front', widthMm: 400 }, 4000, 5410, 600), filmLayout()), /The print is 54\.1 cm tall/);
});

test('the targets are at the four corners only, and the label strip stays between them and out of the ink gap, however long its lines', () => {
  const lines: LabelLines = {
    left: '12/15 · MF-A-VERY-LONG-DESIGN-CODE-FOR-THE-UNDERWRITER-TOUR v12 · Left sleeve, lower · French Navy and Heather Grey',
    right: 'PANTONE 2685 C · HB Opaque · 55 lpi 22.5° · mesh 230 · flash 4 s at 230 °C',
    topLeft: 'Top ↑',
    topRight: 'Print as is · no scaling',
  };
  for (const widthMm of [30, 60, 120, 280, 400]) {
    const ppi = 300;
    const canvas = filmCanvas(printSize({ position: 'front', widthMm }, 1000, 1100, ppi), filmLayout());
    const { widthPx: W, heightPx: H, art } = canvas;
    const g = targetGeometry(canvas);
    const boxes = targetBoxes(canvas);
    assert.deepEqual(boxes.map((b) => b.name), CORNERS);
    const inBox = (x: number, y: number) => boxes.some((b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
    const gap = Math.round(mmToPx(10, ppi));
    const clearOfArt = (y: number) => y < art.y - gap || y >= art.y + art.height + gap;

    const targets = new Uint8Array(W * H);
    drawTargets(targets, canvas);
    const labels = new Uint8Array(W * H);
    drawLabelStrip(labels, canvas, lines);
    let labelInk = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (targets[i]) {
          assert.ok(inBox(x, y) && clearOfArt(y), `${widthMm} mm: target ink at (${x}, ${y}) outside the four corners`);
        }
        if (!labels[i]) continue;
        labelInk++;
        assert.ok(clearOfArt(y), `${widthMm} mm: label ink at (${x}, ${y}) in the art or the ink gap`);
        // 3 mm of clear film between a label and the target at either end of its row
        for (const c of g.centres) {
          if (Math.abs(y - c.y) > g.armPx) continue;
          assert.ok(Math.abs(x - c.x) > g.armPx + mmToPx(3, ppi) - 1, `${widthMm} mm: label ink at (${x}, ${y}) within 3 mm of the ${c.name} target`);
        }
      }
    }
    // a strip too narrow for the text cuts it short or leaves it out; it never reaches a target
    if (widthMm >= 60) assert.ok(labelInk > 300, `${widthMm} mm: the strip is drawn (${labelInk} px)`);
  }
});

test('every film carries the same corner targets: spot, index and simulated process, underbase to highlight, and the dot-gain chart', async () => {
  const sets: ScreenSet[] = [];
  for (const method of ['spot', 'index', 'sim_process'] as const) {
    const res = await separation(mergeRecipe(RECIPE_300, { method }));
    assert.equal(res.sets[0].method, method);
    sets.push(...res.sets);
  }
  assert.deepEqual([...new Set(sets.flatMap((s) => s.plates.map((p) => p.role)))].sort(), ['highlight', 'ink', 'underbase']);
  let reference: string | null = null;
  for (const set of sets) {
    const g = targetGeometry(set.canvas);
    assert.deepEqual(g.centres.map((c) => c.name), CORNERS);
    for (const p of set.plates) {
      for (const c of g.centres) {
        const pattern = targetPattern(p.plate.data, set.canvas, c.x, c.y);
        reference ??= pattern;
        assert.equal(pattern, reference, `${set.method} film ${p.index} (${p.role}): the ${c.name} target`);
      }
    }
  }
  const chart = renderChartFilms({ lpi: 40, angleDeg: 22.5, ppi: 300, mesh: 230, dot: 'round', films: ['underbase', 'base', 'highlight'] });
  assert.deepEqual(chart.canvas.layout, DEFAULT_RECIPE.marks);
  const g = targetGeometry(chart.canvas);
  for (const film of chart.films) {
    for (const c of g.centres) assert.equal(targetPattern(film.plate.data, chart.canvas, c.x, c.y), reference, `chart ${film.kind}: the ${c.name} target`);
  }
});

test('relabelling redraws only the label strip; a film from before engine 3 keeps its side marks and gets its strip where it was', async () => {
  const set = (await separation()).sets[0];
  const plate = set.plates.find((p) => p.role === 'ink')!;
  const before = new Uint8Array(plate.plate.data);
  relabelPlate(set, plate.index, LABEL, DEFAULT_INK_SYSTEM, undefined, 'PANTONE 186 C');
  const bands = labelBands(set.canvas);
  const inBand = (x: number, y: number, list = bands) => list.some((b) => x >= Math.floor(b.x0) && x < Math.ceil(b.x1) && Math.abs(y - b.centreY) <= Math.ceil(b.halfHeight));
  const W = set.canvas.widthPx;
  let changed = 0;
  for (let i = 0; i < before.length; i++) {
    if (before[i] === plate.plate.data[i]) continue;
    changed++;
    assert.ok(inBand(i % W, Math.floor(i / W)), `only the label rows change, not (${i % W}, ${Math.floor(i / W)})`);
  }
  assert.ok(changed > 100, 'the Pantone code went onto the strip');

  // A canvas as packs made before engine 3 stored it: one 25 mm margin, no layout, the targets at the side centres
  // 15 mm out (the recipe's old targetOffsetMm). Relabelling it keeps to that geometry.
  const size = printSize({ position: 'front', widthMm: 80 }, 480, 360, 300);
  const m = Math.round(mmToPx(25, 300));
  const legacy: CanvasSpec = { widthPx: size.widthPx + 2 * m, heightPx: size.heightPx + 2 * m, ppi: 300, marginMm: 25, art: { x: m, y: m, width: size.widthPx, height: size.heightPx } };
  const data = new Uint8Array(legacy.widthPx * legacy.heightPx);
  drawTargets(data, legacy, 15);
  drawLabelStrip(data, legacy, { left: '2/4 · MF-TEST v1 · Front · Darks', right: 'Ink #E4262C · HB Opaque · 55 lpi 22.5°', topLeft: 'Top ↑', topRight: 'Print as is · no scaling' }, 15);
  const boxes = targetBoxes(legacy, 15);
  assert.deepEqual(boxes.map((b) => b.name), ['top', 'bottom', 'left', 'right']);
  const crops = () => boxes.map((b) => targetPattern(data, legacy, b.x + (b.width - 1) / 2, b.y + (b.height - 1) / 2));
  const targetsBefore = crops();
  const legacySet: ScreenSet = {
    key: 'darks',
    garmentCodes: [BLACK.code],
    needsUnderbase: true,
    method: 'spot',
    canvas: legacy,
    plates: [{ index: 2, role: 'ink', target: { hex: '#E4262C', lab: hexToLab('#E4262C') }, base: 'HB Opaque', plate: { width: legacy.widthPx, height: legacy.heightPx, ppi: 300, data }, coverage: 0, halftone: { ...DEFAULT_RECIPE.halftone }, meshSuggestion: 230 }],
    warnings: [],
  };
  const old = new Uint8Array(data);
  relabelPlate(legacySet, 2, LABEL, DEFAULT_INK_SYSTEM, 15, 'PANTONE 186 C');
  assert.deepEqual(crops(), targetsBefore, 'the side targets are untouched');
  const oldBands = labelBands(legacy, 15);
  let moved = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === old[i]) continue;
    moved++;
    assert.ok(inBand(i % legacy.widthPx, Math.floor(i / legacy.widthPx), oldBands), 'the strip is redrawn where the old engine put it');
  }
  assert.ok(moved > 100);

  // A recipe stored before engine 3 carries only the old fields: they read as the new layout, and a merge drops them.
  const stored = { ...DEFAULT_RECIPE, marks: { marginMm: 25, targetOffsetMm: 15 } } as unknown as PrintRecipe;
  assert.deepEqual(filmLayout(stored.marks), { sideMarginMm: 10, endMarginMm: 27, inkGapMm: 10 });
  assert.deepEqual(mergeRecipe(stored, { maxScreens: 6 }).marks, { sideMarginMm: 10, endMarginMm: 27, inkGapMm: 10 });
  // and handed to the engine as it was stored (a job from before the change, run again), it makes films of the new layout
  const again = await separation(stored);
  assert.deepEqual(again.sets[0].canvas.layout, DEFAULT_RECIPE.marks);
  assert.deepEqual(targetGeometry(again.sets[0].canvas).centres.map((c) => c.name), CORNERS);
});
