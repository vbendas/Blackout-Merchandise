// Index separations (index-method.ts and its index-*.ts steps). Synthetic
// flat art drawn here, at 200 ppi so one art pixel is one 0.127 mm cell of a
// 600 ppi film. The full-front timing runs only on request:
//   PRINT_ENGINE_PERF=1 DATABASE_URL= npx tsx --test lib/print/engine/index-method.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type { GarmentColour, PrintRecipe, Raster, ScreenSet } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, mergeRecipe } from '@/lib/print/defaults';
import { deltaE2000, hexToRgb8, linearToLab, linearToOklab, rgb8ToLab, type Vec3 } from './colour';
import { GARMENT } from './classify';
import { analyseSet, joins, makeWorkGrid, type SetAnalysis, type WorkGrid } from './analyse';
import { targetBoxes } from './marks';
import { inkSystemModel } from './model';
import { screenProof } from './proof';
import { renderSet, type RenderInput } from './render';
import { printSize, type PrintSize } from './units';
import { BLACK, LABEL, NAVY, WHITE, drawArt, sha256, type Rgb, type Shape } from './testing';
import { cellMm } from './index-cells';
import { MixFinder, newMix } from './index-mix';
import { indexJoinCheck, indexPlateLabelLines, indexQuality, renderIndexSet, separateIndex, type IndexSeparation } from './index-method';
import { SET_RENDERERS, separateScreen, type SetRenderers } from './index';

const sys = inkSystemModel(DEFAULT_INK_SYSTEM);
const ART_PPI = 200;

/** Twelve flat colours, one per shape, no gradients: the index fixture's palette. */
const TWELVE = ['#E4262C', '#F7941D', '#FFD400', '#9ACD32', '#00843D', '#009A9A', '#4FC3F7', '#1F3FBF', '#151515', '#A855F7', '#FF5FA2', '#6B3A1E'];
const rgbOf = (hex: string): Rgb => hexToRgb8(hex) as Rgb;

/** Squares and discs (anti-aliased edges) on a 4 x 3 grid, 100 px each, on a transparent ground. */
function twelveShapes(): Shape[] {
  return TWELVE.map((hex, i): Shape => {
    const x = 20 + (i % 4) * 115;
    const y = 20 + Math.floor(i / 4) * 115;
    return i % 2 === 0 ? { kind: 'rect', x, y, w: 100, h: 100, colour: rgbOf(hex) } : { kind: 'circle', cx: x + 50, cy: y + 50, r: 50, colour: rgbOf(hex) };
  });
}

/** Fewer colours with white in them, for the highlight white on darks. */
const WITH_WHITE: Shape[] = [
  { kind: 'rect', x: 20, y: 20, w: 150, h: 120, colour: [228, 38, 44] },
  { kind: 'circle', cx: 290, cy: 90, r: 70, colour: [255, 255, 255] },
  { kind: 'rect', x: 20, y: 170, w: 150, h: 120, colour: [31, 63, 191] },
  { kind: 'circle', cx: 290, cy: 230, r: 60, colour: [255, 212, 0] },
  { kind: 'rect', x: 380, y: 30, w: 80, h: 280, colour: [247, 148, 29] },
];

interface Run {
  set: ScreenSet;
  sep: IndexSeparation;
  input: RenderInput & { grid: WorkGrid };
}

const cache = new Map<string, Promise<Run>>();

async function run(name: string, shapes: Shape[], garment: GarmentColour, recipeOverride: Partial<PrintRecipe> = {}, w = 480, h = 360): Promise<Run> {
  const key = `${name}|${garment.code}|${JSON.stringify(recipeOverride)}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const recipe = mergeRecipe(DEFAULT_RECIPE, { method: 'index', ...recipeOverride });
      const art: Raster = drawArt(w, h, shapes);
      const size: PrintSize = printSize({ position: 'front_chest', widthMm: (w / ART_PPI) * 25.4 }, w, h, recipe.screenPpi);
      const grid = await makeWorkGrid(art, size);
      const dark = !garment.isLight;
      const analysis: SetAnalysis = analyseSet(grid, garment, dark, recipe, sys);
      const input = {
        analysis,
        key: dark ? 'darks' : 'lights',
        garmentCodes: [garment.code],
        size,
        recipe,
        inks: DEFAULT_INK_SYSTEM,
        label: LABEL,
        garmentNames: { [garment.code]: garment.name },
        grid,
      };
      return { set: renderIndexSet(input), sep: separateIndex(input), input };
    })();
    cache.set(key, hit);
  }
  return hit;
}

/** Index into the canvas of print-area pixel (x, y). */
function px(set: ScreenSet, x: number, y: number): number {
  const { art, widthPx } = set.canvas;
  return (art.y + y) * widthPx + art.x + x;
}

const colourPlates = (set: ScreenSet) => set.plates.filter((p) => p.role !== 'underbase');

test('no two colour films print the same spot: one ink per cell, never overlapping', async () => {
  for (const r of [await run('twelve', twelveShapes(), WHITE), await run('twelve', twelveShapes(), BLACK), await run('white', WITH_WHITE, BLACK)]) {
    const { art } = r.set.canvas;
    const films = colourPlates(r.set).map((p) => p.plate.data);
    assert.ok(films.length >= 3);
    let overlaps = 0;
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) {
        const i = px(r.set, x, y);
        let n = 0;
        for (const f of films) if (f[i]) n++;
        if (n > 1) overlaps++;
      }
    }
    assert.equal(overlaps, 0, `${r.set.key}: ${overlaps} pixels under two inks`);
  }
});

test('every printing cell is covered by exactly one film over its whole square, bare cells by none', async () => {
  for (const r of [await run('twelve', twelveShapes(), WHITE), await run('white', WITH_WHITE, BLACK)]) {
    const { set, sep } = r;
    const { cw, ch, cellPx, widthPx, heightPx } = sep.cells;
    const films = colourPlates(set);
    // which film each entry prints on: inks by their target, the white on darks as the highlight
    const filmOf = sep.entries.map((e) => films.findIndex((p) => (e.kind === 'white' && set.needsUnderbase ? p.role === 'highlight' : p.role === 'ink' && p.target.hex === e.hex)));
    assert.ok(filmOf.every((f) => f >= 0), `every entry has a film: ${filmOf}`);
    const ub = set.plates.find((p) => p.role === 'underbase')?.plate.data ?? null;
    let printing = 0;
    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const L = sep.labels[cy * cw + cx];
        if (L !== GARMENT) printing++;
        for (let y = cy * cellPx; y < Math.min(heightPx, (cy + 1) * cellPx); y++) {
          for (let x = cx * cellPx; x < Math.min(widthPx, (cx + 1) * cellPx); x++) {
            const i = px(set, x, y);
            films.forEach((f, k) => {
              const want = L !== GARMENT && filmOf[L] === k ? 255 : 0;
              if (f.plate.data[i] !== want) assert.fail(`cell ${cx},${cy} (label ${L}): film ${f.index} is ${f.plate.data[i]}, wants ${want}`);
            });
            if (L === GARMENT && ub && ub[i]) assert.fail(`underbase under bare cell ${cx},${cy}`);
          }
        }
      }
    }
    assert.ok(printing > 0.3 * cw * ch, `${printing} printing cells`);
  }
});

test('darks: the underbase is under the ink cells, choked at the outline by at least the recipe choke', async () => {
  for (const r of [await run('twelve', twelveShapes(), BLACK), await run('white', WITH_WHITE, BLACK)]) {
    const { set, sep } = r;
    const ub = set.plates[0];
    assert.equal(ub.role, 'underbase');
    assert.ok(sep.underbase);
    const { cw, ch, cellPx, body } = sep.cells;
    // the choke in whole cells: 0.2 mm is 1.57 cells of 0.127 mm, so 2
    assert.equal(sep.chokeCells, 2);
    const reach = sep.chokeCells;
    let inkCells = 0;
    let based = 0;
    for (let cy = 0; cy < ch; cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const i = cy * cw + cx;
        const L = sep.labels[i];
        // the film agrees with the cell map, over the whole square
        const on = ub.plate.data[px(set, cx * cellPx + 1, cy * cellPx + 1)] !== 0;
        assert.equal(on, sep.underbase[i] === 1, `underbase film vs map at ${cx},${cy}`);
        if (L === GARMENT) continue;
        inkCells++;
        // inside the outline by the choke: every cell within reach is art
        let inside = true;
        for (let dy = -reach; dy <= reach && inside; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            if (x < 0 || y < 0 || x >= cw || y >= ch || !body[y * cw + x]) {
              inside = false;
              break;
            }
          }
        }
        assert.equal(sep.underbase[i] === 1, inside, `cell ${cx},${cy}: underbase ${sep.underbase[i]}, inside the choke ${inside}`);
        if (inside) based++;
      }
    }
    assert.ok(based / inkCells > 0.85, `underbase under ${((100 * based) / inkCells).toFixed(1)}% of the ink cells`);
    // every underbase pixel has an ink on top (the white prints as the highlight)
    const films = colourPlates(set).map((p) => p.plate.data);
    const { art } = set.canvas;
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) {
        const i = px(set, x, y);
        if (ub.plate.data[i] && !films.some((f) => f[i])) assert.fail(`bare underbase at ${x},${y}`);
      }
    }
  }
  // lights: no underbase at all
  const lights = await run('twelve', twelveShapes(), WHITE);
  assert.equal(lights.set.needsUnderbase, false);
  assert.ok(lights.set.plates.every((p) => p.role === 'ink'));
  assert.equal(lights.sep.underbase, null);
});

test('cells are 3 x 3 px at 600 ppi, 0.127 mm, on one grid shared by every film', async () => {
  const { set, sep } = await run('twelve', twelveShapes(), BLACK);
  assert.equal(sep.cells.cellPx, 3);
  assert.equal(sep.cells.cellPpi, 200);
  assert.ok(Math.abs(cellMm(sep.cells) - 0.127) < 1e-12);
  assert.ok(Math.abs((3 / 600) * 25.4 - 0.127) < 1e-12);
  const { art, widthPx: W } = set.canvas;
  let shortest = Infinity;
  for (const p of set.plates) {
    const d = p.plate.data;
    assert.equal(p.halftone.lpi, 200, 'the film records its grid: 200 cells per inch');
    assert.equal(p.halftone.angleDeg, 0);
    // every run of ink starts and ends on a cell boundary, across and down
    for (let y = 0; y < art.height; y++) {
      const row = (art.y + y) * W + art.x;
      let start = -1;
      for (let x = 0; x <= art.width; x++) {
        const v = x < art.width ? d[row + x] : 0;
        if (v && start < 0) start = x;
        if (!v && start >= 0) {
          assert.equal(start % 3, 0, `${p.role} ${p.target.hex}: run starts at ${start}`);
          assert.ok(x % 3 === 0 || x === art.width, `${p.role}: run ends at ${x}`);
          if (x < art.width) shortest = Math.min(shortest, x - start);
          start = -1;
        }
      }
    }
    for (let x = 1; x < art.width; x += 7) {
      let start = -1;
      for (let y = 0; y <= art.height; y++) {
        const v = y < art.height ? d[(art.y + y) * W + art.x + x] : 0;
        if (v && start < 0) start = y;
        if (!v && start >= 0) {
          assert.equal(start % 3, 0, `${p.role}: column run starts at ${start}`);
          assert.ok(y % 3 === 0 || y === art.height);
          start = -1;
        }
      }
    }
    // binary, no halftone dots
    const values = new Set<number>();
    for (let i = 0; i < d.length; i += 5) values.add(d[i]);
    assert.deepEqual([...values].sort((a, b) => a - b), [0, 255]);
  }
  assert.equal(shortest, 3, 'the smallest ink feature on any film is one cell');
});

test('same input, same bytes', async () => {
  const a = await run('twelve', twelveShapes(), BLACK);
  const recipe = a.input.recipe;
  const b = renderIndexSet({ ...a.input, grid: { ...a.input.grid, rgba: new Uint8Array(a.input.grid.rgba) } });
  assert.equal(a.set.plates.length, b.plates.length);
  a.set.plates.forEach((p, i) => {
    assert.equal(sha256(p.plate.data), sha256(b.plates[i].plate.data), `film ${p.index}`);
    assert.equal(p.target.hex, b.plates[i].target.hex);
    assert.equal(p.coverage, b.plates[i].coverage);
  });
  const again = separateIndex({ grid: a.input.grid, analysis: a.input.analysis, size: a.input.size, recipe });
  assert.equal(sha256(again.labels), sha256(a.sep.labels));
  assert.deepEqual(
    again.entries.map((e) => e.hex),
    a.sep.entries.map((e) => e.hex),
  );
});

test('the films are the same whether the set is separated again or the joins’ separation is reused', async () => {
  const r = await run('white', WITH_WHITE, BLACK);
  const { grid, size, recipe } = r.input;
  // a separation of its own (the cached one stays untouched), checked against two garments first, as the joins do
  const sep = separateIndex(r.input);
  indexJoinCheck(sep, grid, size, BLACK, sys, recipe.knockoutDeltaE);
  indexJoinCheck(sep, grid, size, NAVY, sys, recipe.knockoutDeltaE);
  const reused = renderIndexSet({ ...r.input, separation: sep });
  assert.equal(reused.plates.length, r.set.plates.length);
  r.set.plates.forEach((p, i) => {
    assert.equal(sha256(reused.plates[i].plate.data), sha256(p.plate.data), `film ${p.index}`);
    assert.equal(reused.plates[i].target.hex, p.target.hex);
  });
  assert.deepEqual(reused.warnings, r.set.warnings);

  // and the engine hands it over: a set that two garments share is separated once
  const input = {
    art: drawArt(480, 360, WITH_WHITE),
    placement: { position: 'front_chest', widthMm: (480 / ART_PPI) * 25.4 },
    garments: [BLACK, NAVY],
    recipe: mergeRecipe(DEFAULT_RECIPE, { method: 'index' }),
    inks: DEFAULT_INK_SYSTEM,
    label: LABEL,
  };
  let handed = 0;
  const spy: SetRenderers = {
    ...SET_RENDERERS,
    index: (i) => {
      if (i.separation) handed++;
      return renderIndexSet(i);
    },
  };
  const once = await separateScreen(input, spy);
  assert.equal(handed, 1);
  assert.deepEqual(once.sets.map((s) => s.garmentCodes), [[BLACK.code, NAVY.code]]);
  const twice = await separateScreen(input, { ...SET_RENDERERS, index: (i) => renderIndexSet({ ...i, separation: undefined }) });
  once.sets[0].plates.forEach((p, i) => assert.equal(sha256(p.plate.data), sha256(twice.sets[0].plates[i].plate.data)));
});

/** Mean colour of a shape's interior as printed: the dither's cells averaged in linear light. */
function patchDeltaE(sep: IndexSeparation, i: number, colours: (L: number) => [number, number, number]): number {
  const { cw } = sep.cells;
  const x = 20 + (i % 4) * 115;
  const y = 20 + Math.floor(i / 4) * 115;
  const acc = [0, 0, 0];
  let n = 0;
  for (let cy = y + 6; cy < y + 94; cy++) {
    for (let cx = x + 6; cx < x + 94; cx++) {
      if (i % 2 === 1 && Math.hypot(cx - (x + 50), cy - (y + 50)) > 44) continue;
      const c = colours(sep.labels[cy * cw + cx]);
      acc[0] += c[0];
      acc[1] += c[1];
      acc[2] += c[2];
      n++;
    }
  }
  return deltaE2000(linearToLab(acc[0] / n, acc[1] / n, acc[2] / n), rgb8ToLab(...rgbOf(TWELVE[i])));
}

test('twelve flat colours on 8 screens: the inks hold eight exactly and dither all but one of the rest within ΔE 3.5', async () => {
  for (const garment of [WHITE, BLACK]) {
    const { sep } = await run('twelve', twelveShapes(), garment);
    const dark = !garment.isLight;
    // white needs no screen: 8 inks on white, 7 plus the underbase on black (whose black is the shirt)
    assert.equal(sep.entries.length, dark ? 7 : 8);
    const art = (L: number) => (L === GARMENT ? sep.garment : sep.art[L]);
    const des = TWELVE.map((_, i) => patchDeltaE(sep, i, art));
    const inkPatches = TWELVE.filter((hex) => sep.entries.some((e) => e.hex === hex)).length;
    assert.ok(inkPatches >= 7, `${inkPatches} colours are inks`);
    // the black square on the black shirt is the shirt, by design; every other colour is an ink or a
    // mix within ΔE 3.5, except lime: no mix of these inks comes near it
    const shirt = rgb8ToLab(...rgbOf(garment.hex));
    const off = TWELVE.filter((hex, i) => deltaE2000(rgb8ToLab(...rgbOf(hex)), shirt) > DEFAULT_RECIPE.knockoutDeltaE && des[i] > 3.5);
    assert.deepEqual(off, ['#9ACD32'], `${garment.name}: ${des.map((d) => d.toFixed(1)).join(' ')}`);
    // a colour that is an ink prints solid: no speckle in flat areas
    TWELVE.forEach((hex, i) => {
      if (sep.entries.some((e) => e.hex === hex)) assert.ok(des[i] < 0.5, `${hex} is an ink but prints ΔE ${des[i].toFixed(2)} off`);
    });
    // index earns its keep: the same inks without the dither (each cell its nearest ink) do far worse
    const nearest = TWELVE.map((hex) => {
      const lab = rgb8ToLab(...rgbOf(hex));
      let best = deltaE2000(lab, linearToLab(sep.garment[0], sep.garment[1], sep.garment[2]));
      for (const c of sep.art) best = Math.min(best, deltaE2000(lab, linearToLab(c[0], c[1], c[2])));
      return best;
    });
    const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
    assert.ok(mean(des) < mean(nearest) / 2, `dither ${mean(des).toFixed(2)} vs nearest ink ${mean(nearest).toFixed(2)}`);
    // over the whole art, in 1 mm blocks, as the inks' own colours and as the print model draws them
    const q = indexQuality(sep);
    const qp = indexQuality(sep, 'print', sys);
    assert.ok(q.meanDeltaE < 2, `art ΔE ${q.meanDeltaE.toFixed(2)}`);
    assert.ok(qp.meanDeltaE < 2.5, `print ΔE ${qp.meanDeltaE.toFixed(2)}`);
  }
  // with screens to spare every colour holds
  const wide = await run('twelve', twelveShapes(), WHITE, { maxScreens: 10 });
  const art = (L: number) => (L === GARMENT ? wide.sep.garment : wide.sep.art[L]);
  const des = TWELVE.map((_, i) => patchDeltaE(wide.sep, i, art));
  assert.ok(Math.max(...des) < 2.5, `10 screens: ${des.map((d) => d.toFixed(1)).join(' ')}`);
  assert.ok(wide.sep.entries.length <= 10);
});

test('the colour the inks miss is flagged for review, named', async () => {
  const { set } = await run('twelve', twelveShapes(), WHITE);
  const w = set.warnings.find((x) => x.code === 'index_colour_loss');
  assert.ok(w, set.warnings.map((x) => x.code).join(' '));
  assert.equal(w.severity, 'review');
  assert.match(w.message, /#9ACD32/);
  const wide = await run('twelve', twelveShapes(), WHITE, { maxScreens: 10 });
  assert.ok(!wide.set.warnings.some((x) => x.code === 'index_colour_loss'));
});

test('darks: the white in the art is the highlight white, printed last over its underbase', async () => {
  const { set, sep } = await run('white', WITH_WHITE, BLACK);
  const roles = set.plates.map((p) => p.role);
  assert.equal(roles[0], 'underbase');
  assert.equal(roles[roles.length - 1], 'highlight');
  const hw = set.plates[set.plates.length - 1].plate.data;
  const ub = set.plates[0].plate.data;
  // the middle of the white disc (art 290, 90): highlight on underbase, no other ink
  const i = px(set, 290 * 3, 90 * 3);
  assert.equal(hw[i], 255);
  assert.equal(ub[i], 255);
  for (const p of set.plates.slice(1, -1)) assert.equal(p.plate.data[i], 0);
  // flat colours print solid: the red block is all one film
  const red = set.plates.find((p) => p.role === 'ink' && p.target.hex === '#E4262C');
  assert.ok(red);
  for (let y = 40; y < 120; y += 3) for (let x = 40; x < 150; x += 3) assert.equal(red.plate.data[px(set, x * 3, y * 3)], 255);
  assert.ok(sep.entries.some((e) => e.kind === 'white'));
});

test('marks and label strips are the spot films’ own', async () => {
  const r = await run('twelve', twelveShapes(), BLACK);
  const spot = renderSet(r.input);
  const index = r.set;
  assert.deepEqual(index.canvas, spot.canvas);
  const { widthPx: W } = index.canvas;
  const crop = (data: Uint8Array, b: { x: number; y: number; width: number; height: number }): string => {
    const out = new Uint8Array(b.width * b.height);
    for (let y = 0; y < b.height; y++) out.set(data.subarray((b.y + y) * W + b.x, (b.y + y) * W + b.x + b.width), y * b.width);
    return sha256(out);
  };
  for (const b of targetBoxes(index.canvas, r.input.recipe.marks.targetOffsetMm)) {
    const want = crop(spot.plates[0].plate.data, b);
    for (const p of index.plates) assert.equal(crop(p.plate.data, b), want, `target on film ${p.index}`);
  }
  // the top margin (top target and the 'Top' and 'Print as is' labels) is the same on every film of both
  const top = { x: 0, y: 0, width: W, height: index.canvas.art.y };
  const want = crop(spot.plates[0].plate.data, top);
  for (const p of index.plates) assert.equal(crop(p.plate.data, top), want, `top margin on film ${p.index}`);
  // and every film carries its label strip below the art
  const { art } = index.canvas;
  for (const p of index.plates) {
    let ink = 0;
    for (let y = art.y + art.height + 1; y < index.canvas.heightPx; y++) for (let x = 0; x < W; x++) if (p.plate.data[y * W + x]) ink++;
    assert.ok(ink > 500, `label strip on film ${p.index}`);
  }
  // the screen line names the cell grid, not a halftone screen
  const lines = indexPlateLabelLines(LABEL, 'Darks', index.plates[1], index.plates.length, DEFAULT_INK_SYSTEM);
  assert.match(lines.right, /· HB Opaque · Index 200 ppi$/);
  assert.match(lines.left, /^2\/8 · MF-TEST v1 · Front · Darks$/);
});

test('the proof composites index films with the print model: the dithered orange reads as orange', async () => {
  const { set } = await run('twelve', twelveShapes(), WHITE);
  const shot = await sharp({ create: { width: 1000, height: 750, channels: 4, background: '#F3F3F1' } })
    .png()
    .toBuffer();
  // at packshot scale, as the Studio shows it: the 61 mm print over 100 px, about five cells per proof pixel
  const proof = await screenProof(set, WHITE, { image: shot, printBox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 } }, DEFAULT_INK_SYSTEM);
  const { data, info } = await sharp(proof.image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // the middle of the orange disc (art centre 185, 70, radius 50)
  const s = 100 / 480;
  const acc = [0, 0, 0];
  let n = 0;
  for (let y = 75 + Math.round(70 * s) - 3; y <= 75 + Math.round(70 * s) + 3; y++) {
    for (let x = 100 + Math.round(185 * s) - 3; x <= 100 + Math.round(185 * s) + 3; x++) {
      const o = (y * info.width + x) * 3;
      acc[0] += data[o];
      acc[1] += data[o + 1];
      acc[2] += data[o + 2];
      n++;
    }
  }
  const seen = rgb8ToLab(Math.round(acc[0] / n), Math.round(acc[1] / n), Math.round(acc[2] / n));
  // red and yellow cells, HB Neutral on a near-white shirt: orange, within the dither's 2.2 and the base's tint
  const de = deltaE2000(seen, rgb8ToLab(247, 148, 29));
  assert.ok(de < 4, `orange proofs ΔE ${de.toFixed(1)} off`);
  // and the red and yellow films are what makes it
  const red = set.plates.find((p) => p.target.hex === '#E4262C');
  const yellow = set.plates.find((p) => p.target.hex === '#FFD400');
  assert.ok(red && yellow);
  let r = 0;
  let yw = 0;
  for (let y = 60; y < 80; y++) {
    for (let x = 175; x < 195; x++) {
      const i = px(set, x * 3 + 1, y * 3 + 1);
      if (red.plate.data[i]) r++;
      if (yellow.plate.data[i]) yw++;
    }
  }
  assert.equal(r + yw, 400, 'every cell of the disc prints red or yellow');
  assert.ok(r > 150 && yw > 150, `red ${r}, yellow ${yw}`);
});

test('set joins: a garment shares index films only when they print right on it', async () => {
  // opaque inks over the underbase print the same on navy as on black
  const r = await run('white', WITH_WHITE, BLACK);
  const { grid, size, recipe } = r.input;
  const self = indexJoinCheck(r.sep, grid, size, BLACK, sys, recipe.knockoutDeltaE);
  assert.ok(self.meanDeltaE < 2, `the reference proofs ΔE ${self.meanDeltaE.toFixed(2)} off`);
  const navy = indexJoinCheck(r.sep, grid, size, NAVY, sys, recipe.knockoutDeltaE);
  assert.ok(joins(navy, self), `navy ${navy.meanDeltaE.toFixed(2)} / ${navy.p95DeltaE.toFixed(2)}`);
  // the twelve's black square is the shirt on black: on navy it prints as navy, on white as white
  const t = await run('twelve', twelveShapes(), BLACK);
  const tSelf = indexJoinCheck(t.sep, t.input.grid, t.input.size, BLACK, sys, recipe.knockoutDeltaE);
  const tNavy = indexJoinCheck(t.sep, t.input.grid, t.input.size, NAVY, sys, recipe.knockoutDeltaE);
  assert.ok(tNavy.meanDeltaE > tSelf.meanDeltaE + 0.8, `navy ${tNavy.meanDeltaE.toFixed(2)} vs ${tSelf.meanDeltaE.toFixed(2)}`);
  const tWhite = indexJoinCheck(t.sep, t.input.grid, t.input.size, WHITE, sys, recipe.knockoutDeltaE);
  assert.ok(!joins(tWhite, tSelf), `white ${tWhite.meanDeltaE.toFixed(1)} / ${tWhite.p95DeltaE.toFixed(1)}`);
});

test('mixes: a colour between two inks is made of those two, in the right shares', () => {
  const points: Vec3[] = [
    [1, 0, 0],
    [0, 0, 1],
    [0, 0, 0],
  ];
  const lin = new Float64Array(points.flat());
  const ok = new Float64Array(9);
  points.forEach((c, p) => linearToOklab(c[0], c[1], c[2], ok.subarray(p * 3, p * 3 + 3)));
  const finder = new MixFinder(lin, ok);
  const mix = newMix();
  const x = new Float64Array(3);
  linearToOklab(0.3, 0, 0.7, x);
  finder.best(0.3, 0, 0.7, x[0], x[1], x[2], mix);
  assert.equal(mix.n, 2);
  const shares = new Map<number, number>();
  for (let s = 0; s < mix.n; s++) shares.set(mix.idx[s], mix.w[s]);
  assert.ok(Math.abs((shares.get(0) ?? 0) - 0.3) < 1e-9 && Math.abs((shares.get(1) ?? 0) - 0.7) < 1e-9, JSON.stringify([...shares]));
  assert.ok(mix.dist < 1e-9);
  // a colour none of them can make goes to its nearest mix, never past the inks
  linearToOklab(0, 1, 0, x);
  finder.best(0, 1, 0, x[0], x[1], x[2], mix);
  for (let s = 0; s < mix.n; s++) assert.ok(mix.w[s] >= 0 && mix.w[s] <= 1);
  assert.ok(mix.lin[1] === 0, 'green is out of reach');
});

test('full front at 600 ppi: index separation time and memory', { skip: !process.env.PRINT_ENGINE_PERF }, async () => {
  // 380 x 459 mm at 200 ppi: the twelve colours tiled, 2992 x 3616 px
  const w = 2992;
  const h = 3616;
  const parts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const ox = (k % 2) * 1490;
    const oy = Math.floor(k / 2) * 1190;
    twelveShapes().forEach((sh) => {
      if (sh.kind === 'rect') parts.push(`<rect x="${sh.x * 3 + ox}" y="${sh.y * 3 + oy}" width="${sh.w * 3}" height="${sh.h * 3}" fill="rgb(${sh.colour.join(',')})"/>`);
      if (sh.kind === 'circle') parts.push(`<circle cx="${sh.cx * 3 + ox}" cy="${sh.cy * 3 + oy}" r="${sh.r * 3}" fill="rgb(${sh.colour.join(',')})"/>`);
    });
  }
  const art = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${parts.join('')}</svg>`))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raster: Raster = { width: art.info.width, height: art.info.height, channels: 4, data: new Uint8Array(art.data.buffer, art.data.byteOffset, art.data.length), ppi: 200 };
  const recipe = mergeRecipe(DEFAULT_RECIPE, { method: 'index' });
  const size = printSize({ position: 'front_full', widthMm: 380 }, w, h, 600);
  const grid = await makeWorkGrid(raster, size);
  const analysis = analyseSet(grid, BLACK, true, recipe, sys);
  const t0 = performance.now();
  const set = renderIndexSet({ analysis, key: 'darks', garmentCodes: [BLACK.code], size, recipe, inks: DEFAULT_INK_SYSTEM, label: LABEL, garmentNames: {}, grid });
  const seconds = (performance.now() - t0) / 1000;
  const peakGb = process.resourceUsage().maxRSS / 1024 / 1024;
  console.log(JSON.stringify({ canvas: `${set.canvas.widthPx}x${set.canvas.heightPx}`, films: set.plates.length, seconds: +seconds.toFixed(1), peakRssGb: +peakGb.toFixed(2) }));
  assert.ok(seconds < 60, `index separation took ${seconds}s`);
  assert.ok(peakGb < 3, `peak RSS ${peakGb} GB`);
});
