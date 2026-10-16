// Simulated process (sim-*.ts) and the method dispatch (index.ts). Plates
// render at 300 ppi here to keep the suite quick; the screens, the table and
// the checks do not depend on it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GarmentColour, Hex, InkSystemProfile, PrintRecipe, Raster, ScreenSet } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, ENGINE_TUNING, WHITE_INK_HEX, mergeRecipe } from '@/lib/print/defaults';
import { dotGainFor } from '@/lib/print/calibration/curve';
import { analyseSet, makeWorkGrid, type WorkGrid } from './analyse';
import { SRGB8_TO_LINEAR, deltaE2000, hexToLab, hexToLinear, linearToLab, linearToSrgb8 } from './colour';
import { makeScreen, makeTransfer, transfer } from './halftone';
import { SET_RENDERERS, separateScreen, type SetRenderers } from './index';
import { inkSystemModel, nestedCoverageColour, plateLayer } from './model';
import { plateTransfer, type RenderInput } from './render';
import { keepShare } from './sim-lut';
import { AreaSolver, NestedModel } from './sim-model';
import { planCoverage, planSimProcess, renderSimProcessSet, simAccuracy, type SimProcessPlan, type SimRenderInput } from './sim-process';
import { printedToneOf } from './printed-tone';
import { hardBits, renderSimFilms } from './sim-screen';
import { printSize } from './units';
import { mulberry32 } from './rng';
import { BLACK, LABEL, NAVY, WHITE, distinctValues, drawArt, sha256, type Shape } from './testing';

const RECIPE: PrintRecipe = mergeRecipe(DEFAULT_RECIPE, { screenPpi: 300 });
const SYS = inkSystemModel(DEFAULT_INK_SYSTEM);
/** Five inks round the colour wheel, for art they can print. */
const INKS: Hex[] = ['#E8423A', '#F2C230', '#2F9E6B', '#3A6EE8', '#8A3AB8'];

/**
 * Art made only of colours the inks print: a recipe of plate areas that runs
 * from ink to ink across and from faint to strong down (with a ring of bare
 * underbase on darks, for pastels), printed with the print model. A perfect
 * inversion gives the art back, so what is left is the table's own error.
 */
function printableArt(inks: Hex[], g: GarmentColour, w: number, h: number): Raster {
  const dark = !g.isLight;
  const order = [...inks].sort((a, b) => hexToLab(b).L - hexToLab(a).L);
  const plates = [...(dark ? [{ role: 'underbase' as const, hex: WHITE_INK_HEX, base: SYS.underbaseInk }] : []), ...order.map((hex) => ({ role: 'ink' as const, hex, base: dark ? SYS.darkBase : SYS.lightBase }))];
  const model = new NestedModel(
    hexToLinear(g.hex),
    plates.map((p) => plateLayer(p.role, p.hex, p.base, SYS)),
  );
  const nester = new AreaSolver(
    model,
    plates.map((p) => p.role),
    plates.flatMap((p, j) => (p.role === 'underbase' ? [] : [j])),
    ENGINE_TUNING.simInkLimit,
  );
  const data = new Uint8Array(w * h * 4);
  const areas = new Float64Array(plates.length + 1);
  const cov = new Float64Array(plates.length);
  const lin = new Float64Array(3);
  const K = order.length;
  const off = dark ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      areas.fill(0);
      const t = (x / (w - 1)) * (K - 1);
      const i = Math.min(K - 2, Math.floor(t));
      const s = t - i;
      const v = 0.35 + 0.65 * (y / (h - 1));
      areas[1 + off + i] = (1 - s) * v * 0.85;
      areas[1 + off + i + 1] = s * v * 0.85;
      if (dark) areas[1] = 0.15 * v;
      nester.nest(areas, cov);
      model.eval(cov, lin);
      const o = (y * w + x) * 4;
      data[o] = linearToSrgb8(lin[0]);
      data[o + 1] = linearToSrgb8(lin[1]);
      data[o + 2] = linearToSrgb8(lin[2]);
      data[o + 3] = 255;
    }
  }
  return { width: w, height: h, channels: 4, data, ppi: 72 };
}

/** A soft round glow in two colours on a transparent ground: painted art with fades into the shirt. */
function glowArt(): Raster {
  const shapes: Shape[] = [
    { kind: 'glow', cx: 220, cy: 220, r: 200, colour: [232, 66, 58] },
    { kind: 'glow', cx: 380, cy: 230, r: 180, colour: [58, 110, 232] },
    { kind: 'circle', cx: 300, cy: 225, r: 40, colour: [242, 194, 48] },
  ];
  return drawArt(600, 450, shapes);
}

interface Planned {
  grid: WorkGrid;
  size: ReturnType<typeof printSize>;
  analysis: ReturnType<typeof analyseSet>;
  plan: SimProcessPlan;
}

async function planFor(art: Raster, g: GarmentColour, recipe: PrintRecipe, widthMm = 200): Promise<Planned> {
  const size = printSize({ position: 'front_chest', widthMm }, art.width, art.height, recipe.screenPpi);
  const grid = await makeWorkGrid(art, size);
  const analysis = analyseSet(grid, g, !g.isLight, recipe, SYS);
  return { grid, size, analysis, plan: planSimProcess(grid, analysis, recipe) };
}

function render(p: Planned, g: GarmentColour, recipe: PrintRecipe, extra: Partial<SimRenderInput> = {}): ScreenSet {
  return renderSimProcessSet({
    analysis: p.analysis,
    key: g.isLight ? 'lights' : 'darks',
    garmentCodes: [g.code],
    size: p.size,
    recipe,
    inks: DEFAULT_INK_SYSTEM,
    label: LABEL,
    garmentNames: { [g.code]: g.name },
    grid: p.grid,
    sim: p.plan,
    ...extra,
  });
}

/** ΔE2000 between the art and the model's print of the plan's coverages, pixel by pixel (the knockout zone left out). */
function modelErrors(p: Planned): { mean: number; p95: number } {
  const { grid, analysis, plan } = p;
  const cov = new Float64Array(plan.areas.length);
  const scratch = new Float64Array(plan.areas.length + 1);
  const pred: [number, number, number] = [0, 0, 0];
  const des: number[] = [];
  for (let i = 0; i < grid.width * grid.height; i++) {
    const lin: [number, number, number] = [SRGB8_TO_LINEAR[grid.rgba[i * 4]], SRGB8_TO_LINEAR[grid.rgba[i * 4 + 1]], SRGB8_TO_LINEAR[grid.rgba[i * 4 + 2]]];
    if (grid.rgba[i * 4 + 3] !== 255 || keepShare(lin, analysis.ctx.garmentLab, RECIPE.knockoutDeltaE) < 1) continue;
    planCoverage(plan, i, cov, scratch);
    nestedCoverageColour(analysis.ctx.garment, plan.layers, cov, pred);
    des.push(deltaE2000(linearToLab(lin[0], lin[1], lin[2]), linearToLab(pred[0], pred[1], pred[2])));
  }
  des.sort((a, b) => a - b);
  return { mean: des.reduce((s, v) => s + v, 0) / des.length, p95: des[Math.floor(des.length * 0.95)] };
}

test('the fast nested model and its derivative match model.ts', () => {
  const layers = [plateLayer('underbase', WHITE_INK_HEX, SYS.underbaseInk, SYS), ...INKS.map((hex) => plateLayer('ink', hex, SYS.darkBase, SYS)), plateLayer('highlight', WHITE_INK_HEX, SYS.highlightInk, SYS)];
  const g = hexToLinear(BLACK.hex);
  const model = new NestedModel(g, layers);
  const rand = mulberry32(11);
  const out = new Float64Array(3);
  const grad = new Float64Array(layers.length * 3);
  const ref: [number, number, number] = [0, 0, 0];
  for (let t = 0; t < 500; t++) {
    const c = Float64Array.from(layers.map(() => (rand() < 0.25 ? 0 : rand())));
    model.eval(c, out, grad);
    nestedCoverageColour(g, layers, c, ref);
    for (let ch = 0; ch < 3; ch++) assert.ok(Math.abs(out[ch] - ref[ch]) < 1e-12);
    for (let j = 0; j < layers.length; j++) {
      const h = 1e-7;
      const c2 = Float64Array.from(c);
      c2[j] += h;
      const o2 = new Float64Array(3);
      model.eval(c2, o2);
      for (let ch = 0; ch < 3; ch++) assert.ok(Math.abs((o2[ch] - out[ch]) / h - grad[j * 3 + ch]) < 1e-5, `d/dc${j}`);
    }
  }
});

// The table inverts the model when the art is printable: about ΔE 0.4 (darks)
// and 0.8 (lights) on average when measured. The thresholds leave room for
// that and stay near the just-noticeable difference (ΔE2000 about 1): mean 1,
// 95% within 2. What error there is comes from trilinear interpolation of a
// model that is not linear in coverage (nodes 8 sRGB levels apart) and from
// the regularisation that picks one recipe among the many that print a
// colour. The films add the halftone: over 3 mm squares (about 40 cells) the
// dots leave a sampling noise near ΔE 1 where white dots sit on a black
// shirt, so the films may be off by ΔE 2 on average, 95% within 4.
for (const g of [BLACK, WHITE]) {
  test(`the table inverts the print model: art the inks can print comes back (${g.name})`, async () => {
    const recipe = mergeRecipe(RECIPE, { method: 'sim_process', lockedInks: INKS });
    const p = await planFor(printableArt(INKS, g, 600, 300), g, recipe);
    assert.deepEqual(
      p.plan.plates.filter((q) => q.role === 'ink').map((q) => q.hex),
      [...INKS].sort((a, b) => hexToLab(b).L - hexToLab(a).L),
    );
    const err = modelErrors(p);
    assert.ok(err.mean <= 1 && err.p95 <= 2, `model ΔE mean ${err.mean.toFixed(2)}, p95 ${err.p95.toFixed(2)}`);
    const set = render(p, g, recipe);
    const acc = simAccuracy(
      set.plates.map((q) => q.plate.data),
      p.plan.layers,
      g,
      set.canvas,
      p.grid,
      recipe.knockoutDeltaE,
    );
    assert.ok(acc.blocks > 100);
    assert.ok(acc.mean <= 2 && acc.p95 <= 4, `films ΔE mean ${acc.mean.toFixed(2)}, p95 ${acc.p95.toFixed(2)}`);
    const info = set.warnings.find((w) => w.code === 'sim_process_accuracy');
    assert.ok(info && info.severity === 'info', 'the accuracy is reported');
    assert.match(info.message, /ΔE \d+\.\d from the art on average, and 95% of it within ΔE \d+\.\d/);
  });
}

test('coverages stay in 0..1, the underbase lies under every ink, and the wet ink limit holds', async () => {
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process' });
  for (const g of [BLACK, WHITE]) {
    const p = await planFor(glowArt(), g, recipe, 100);
    const { plan, grid } = p;
    const n = plan.areas.length;
    const ub = plan.plates.findIndex((q) => q.role === 'underbase');
    assert.equal(ub >= 0, g === BLACK);
    const cov = new Float64Array(n);
    let checked = 0;
    for (let i = 0; i < grid.width * grid.height; i++) {
      planCoverage(plan, i, cov);
      let wet = 0;
      for (let j = 0; j < n; j++) {
        assert.ok(cov[j] >= 0 && cov[j] <= 1, `coverage ${cov[j]}`);
        if (j !== ub) {
          wet += cov[j];
          if (ub >= 0) assert.ok(cov[ub] >= cov[j] - 1e-12, `underbase ${cov[ub]} under ink ${cov[j]}`);
        }
      }
      assert.ok(wet <= ENGINE_TUNING.simInkLimit + 1e-9, `wet ink ${wet}`);
      checked++;
    }
    assert.ok(checked > 0);
    // on the films: an ink printed where the underbase is not happens only at the choked edge
    const set = render(p, g, recipe);
    if (ub >= 0) {
      const { art, widthPx: W } = set.canvas;
      const base = set.plates[ub].plate.data;
      let inked = 0;
      let bare = 0;
      for (const plate of set.plates) {
        if (plate.role === 'underbase') continue;
        for (let y = 0; y < art.height; y++) {
          const row = (art.y + y) * W + art.x;
          for (let x = 0; x < art.width; x++) {
            if (!plate.plate.data[row + x]) continue;
            inked++;
            if (!base[row + x]) bare++;
          }
        }
      }
      assert.ok(inked > 1000);
      assert.ok(bare / inked < 0.04, `${((bare / inked) * 100).toFixed(1)}% of ink off the underbase`);
    }
  }
});

test('nothing prints where the art is transparent: the table nodes next to the shirt colour leave no stray dots', async () => {
  // glows well inside the print area, an empty band on the left (the glows start at x 160)
  const art = drawArt(600, 450, [
    { kind: 'glow', cx: 300, cy: 225, r: 140, colour: [232, 66, 58] },
    { kind: 'glow', cx: 330, cy: 240, r: 120, colour: [58, 110, 232] },
    { kind: 'circle', cx: 300, cy: 225, r: 30, colour: [242, 194, 48] },
  ]);
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process' });
  for (const g of [BLACK, NAVY, WHITE]) {
    const p = await planFor(art, g, recipe, 100);
    for (let i = 0; i < p.grid.width * p.grid.height; i++) {
      if (p.grid.rgba[i * 4 + 3] !== 0) continue;
      for (const field of p.plan.areas) assert.equal(field[i], 0, `${g.name}: an area where the art is transparent`);
    }
    const set = render(p, g, recipe);
    const { art: a, widthPx: W } = set.canvas;
    const band = Math.floor((120 / 600) * a.width);
    for (const plate of set.plates) {
      let stray = 0;
      for (let y = 0; y < a.height; y++) for (let x = 0; x < band; x++) if (plate.plate.data[(a.y + y) * W + a.x + x]) stray++;
      assert.equal(stray, 0, `${g.name}, film ${plate.index} (${plate.role}): ${stray} pixels inked in the empty band`);
    }
  }
});

test('the underbase prints only where the art does', async () => {
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process' });
  const p = await planFor(glowArt(), BLACK, recipe, 100);
  const set = render(p, BLACK, recipe);
  assert.equal(set.plates[0].role, 'underbase');
  assert.equal(set.needsUnderbase, true);
  const ub = set.plates[0].plate.data;
  const { art, widthPx: W } = set.canvas;
  const s = art.width / 600;
  const at = (x: number, y: number): number => (art.y + Math.round(y * s)) * W + art.x + Math.round(x * s);
  // the transparent corner is the shirt: no underbase, no ink
  for (const plate of set.plates) assert.equal(plate.plate.data[at(20, 20)], 0);
  // nor anywhere else the art is transparent: the table's nodes next to the shirt colour leave no stray dots
  const transparent = (x: number, y: number) => y < 12 || y > 430 || x > 570;
  for (const plate of set.plates) {
    let stray = 0;
    for (let y = 0; y < art.height; y++) {
      for (let x = 0; x < art.width; x++) if (transparent(x / s, y / s) && plate.plate.data[(art.y + y) * W + art.x + x]) stray++;
    }
    assert.equal(stray, 0, `film ${plate.index} (${plate.role}): ${stray} pixels inked where the art is transparent`);
  }
  // under the solid yellow disc: solid underbase
  let holes = 0;
  for (let x = 285; x < 315; x++) if (!ub[at(x, 225)]) holes++;
  assert.equal(holes, 0);
  // and where the glows fade into the shirt the underbase fades too (screened, not solid)
  let on = 0;
  let total = 0;
  for (let y = 215; y < 235; y++) {
    for (let x = 40; x < 60; x++) {
      total++;
      if (ub[at(x, y)]) on++;
    }
  }
  assert.ok(on / total < 0.6, `underbase at the fade ${on / total}`);
  // no underbase plate on a white shirt
  const light = await planFor(glowArt(), WHITE, recipe, 100);
  assert.ok(render(light, WHITE, recipe).plates.every((q) => q.role === 'ink'));
});

test('the highlight white prints the brightest areas, last, with the underbase under it', async () => {
  const art = drawArt(600, 450, [
    { kind: 'glow', cx: 220, cy: 220, r: 200, colour: [232, 66, 58] },
    { kind: 'glow', cx: 380, cy: 230, r: 180, colour: [58, 110, 232] },
    { kind: 'circle', cx: 300, cy: 225, r: 60, colour: [255, 255, 255] },
    { kind: 'rect', x: 40, y: 380, w: 520, h: 50, colour: [250, 250, 250] },
  ]);
  const res = await separateScreen(sepInput([], [BLACK], mergeRecipe(RECIPE, { method: 'sim_process' }), art));
  const set = res.sets[0];
  const roles = set.plates.map((q) => q.role);
  assert.equal(roles[0], 'underbase');
  assert.equal(roles[roles.length - 1], 'highlight');
  // the whites print with the white ink, never as a mixed white colour ink
  assert.ok(set.plates.every((q) => q.role !== 'ink' || deltaE2000(q.target.lab, hexToLab(WHITE_INK_HEX)) > ENGINE_TUNING.whiteDeltaE));
  const hw = set.plates[roles.length - 1].plate.data;
  const ub = set.plates[0].plate.data;
  const { art: a, widthPx: W } = set.canvas;
  const s = a.width / 600;
  const at = (x: number, y: number): number => (a.y + Math.round(y * s)) * W + a.x + Math.round(x * s);
  for (const [x, y] of [
    [300, 225],
    [300, 405],
  ]) {
    assert.equal(hw[at(x, y)], 255);
    assert.equal(ub[at(x, y)], 255);
  }
  assert.equal(hw[at(150, 220)], 0, 'no highlight on the red glow');
  assert.equal(set.plates[roles.length - 1].clientName, 'Highlight white');
});

test('films are binary, one screen for every plate, and the same input gives the same bytes', async () => {
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process' });
  const a = await separateScreen({ art: glowArt(), placement: { position: 'front_chest', widthMm: 100 }, garments: [BLACK, WHITE], recipe, inks: DEFAULT_INK_SYSTEM, label: LABEL });
  const b = await separateScreen({ art: glowArt(), placement: { position: 'front_chest', widthMm: 100 }, garments: [BLACK, WHITE], recipe, inks: DEFAULT_INK_SYSTEM, label: LABEL });
  assert.equal(a.method, 'sim_process');
  assert.equal(a.needsManual, false);
  assert.equal(a.methodReason, 'The recipe asks for simulated process.');
  assert.equal(a.sets.length, b.sets.length);
  for (let s = 0; s < a.sets.length; s++) {
    assert.equal(a.sets[s].method, 'sim_process');
    assert.equal(a.sets[s].plates.length, b.sets[s].plates.length);
    for (let q = 0; q < a.sets[s].plates.length; q++) {
      const plate = a.sets[s].plates[q];
      assert.equal(sha256(plate.plate.data), sha256(b.sets[s].plates[q].plate.data));
      assert.deepEqual([...distinctValues(plate.plate.data, 3)].sort((x, y) => x - y), [0, 255]);
      assert.deepEqual(plate.halftone, recipe.halftone);
      assert.equal(plate.index, q + 1);
    }
  }
  assert.deepEqual(
    a.sets.map((s) => s.plates.map((q) => [q.target.hex, q.coverage])),
    b.sets.map((s) => s.plates.map((q) => [q.target.hex, q.coverage])),
  );
});

/** A uniform field of one plate's area, rendered on its own through renderSimFilms. */
function uniformFilm(coverage: number, gain: Parameters<typeof makeTransfer>[1]): number {
  const grid = 40;
  const size = printSize({ position: 'front_chest', widthMm: 40 }, grid, grid, 300);
  const sys = SYS;
  const layers = [plateLayer('ink', '#3A6EE8', sys.lightBase, sys)];
  const nester = new AreaSolver(new NestedModel(hexToLinear(WHITE.hex), layers), ['ink'], [0], ENGINE_TUNING.simInkLimit);
  const areas = [new Uint8Array(grid * grid).fill(Math.round(coverage * 255))];
  const W = size.widthPx;
  const out = [new Uint8Array(W * size.heightPx)];
  renderSimFilms({
    areas,
    hard: hardBits(areas, grid, grid, nester),
    srcW: grid,
    srcH: grid,
    size,
    canvasWidth: W,
    artX: 0,
    artY: 0,
    halftone: RECIPE.halftone,
    gain: gain ?? ((c) => c),
    nester,
    underbase: -1,
    out,
    foot: new Uint8Array(W * size.heightPx),
  });
  // the middle, away from the resampler's edges
  let on = 0;
  let total = 0;
  for (let y = 60; y < size.heightPx - 60; y++) {
    for (let x = 60; x < W - 60; x++) {
      total++;
      if (out[0][y * W + x]) on++;
    }
  }
  return on / total;
}

test('every plate is screened through the dot-gain curve from lib/print/calibration (dotGainFor)', async () => {
  const want = 0.4;
  const v = Math.round(want * 255) / 255;
  // the curve is applied: a strong made-up curve moves the film
  assert.ok(Math.abs(uniformFilm(want, (c) => c) - v) < 0.02);
  assert.ok(Math.abs(uniformFilm(want, (c) => c * c) - v * v) < 0.02);
  // and by default it is the ink system's: whatever dotGainFor gives for a profile with a measured curve
  const measured: InkSystemProfile = {
    ...DEFAULT_INK_SYSTEM,
    dotGain: { measuredAt: '2026-10-15T00:00:00Z', method: 'manual', lpi: 55, angleDeg: 22.5, mesh: 230, points: [{ input: 0, printed: 0 }, { input: 0.5, printed: 0.7 }, { input: 1, printed: 1 }] },
  };
  const curve = dotGainFor(measured);
  const expected = transfer(makeTransfer({ minDot: 0, maxDot: 1 }, curve), v);
  assert.ok(Math.abs(uniformFilm(want, curve) - expected) < 0.02);
  // spot plates take the same curve, with the mesh limits
  assert.deepEqual(plateTransfer(RECIPE.halftone, measured), makeTransfer(RECIPE.halftone, curve));
  // and a simulated-process set takes the ink system's curve when no other is given
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process' });
  const p = await planFor(glowArt(), WHITE, recipe, 60);
  const byDefault = render(p, WHITE, recipe, { inks: measured });
  const explicit = render(p, WHITE, recipe, { inks: measured, gain: curve });
  byDefault.plates.forEach((q, i) => assert.equal(sha256(q.plate.data), sha256(explicit.plates[i].plate.data)));
  const other = render(p, WHITE, recipe, { inks: measured, gain: (c) => Math.min(1, c * 1.6) });
  assert.ok(other.plates.some((q, i) => q.coverage !== byDefault.plates[i].coverage), 'another curve, other films');
  // the screen itself is the recipe's: one lattice for every plate
  assert.equal(makeScreen(RECIPE.halftone, 300).angleDeg, 22.5);
});

test('with a calibrated press the accuracy figure is the print\'s: compensated films are not reported lighter than they print', async () => {
  const measured: InkSystemProfile = {
    ...DEFAULT_INK_SYSTEM,
    dotGain: { measuredAt: '2026-10-16T00:00:00Z', method: 'manual', lpi: 55, angleDeg: 22.5, mesh: 230, points: [{ input: 0.25, printed: 0.36 }, { input: 0.5, printed: 0.65 }, { input: 0.75, printed: 0.86 }] },
  };
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process', lockedInks: INKS });
  const p = await planFor(printableArt(INKS, WHITE, 600, 300), WHITE, recipe);
  const figure = (set: ScreenSet, tone: ReturnType<typeof printedToneOf>) =>
    simAccuracy(
      set.plates.map((q) => q.plate.data),
      p.plan.layers,
      WHITE,
      set.canvas,
      p.grid,
      recipe.knockoutDeltaE,
      tone,
    ).mean;
  const plain = figure(render(p, WHITE, recipe), null);
  const calibratedSet = render(p, WHITE, recipe, { inks: measured });
  const calibrated = figure(calibratedSet, printedToneOf(calibratedSet, measured));
  const filmOnly = figure(calibratedSet, null);
  assert.ok(Math.abs(calibrated - plain) < 0.75, `calibrated ΔE ${calibrated.toFixed(2)}, uncalibrated ${plain.toFixed(2)}`);
  assert.ok(filmOnly > plain + 1, `the compensated films alone read ΔE ${filmOnly.toFixed(2)}`);
  // the set's own warning reports the print
  const info = calibratedSet.warnings.find((w) => w.code === 'sim_process_accuracy');
  assert.ok(info?.message.includes(`ΔE ${calibrated.toFixed(1)} from the art`), info?.message);
});

test('a tone past the largest dot mixes solid cells and largest dots, keeping the tone', () => {
  // 93% sits in the mesh's gap (90% is the largest dot): rounding would print 90% everywhere
  const film = uniformFilm(0.93, (c) => c);
  assert.ok(Math.abs(film - Math.round(0.93 * 255) / 255) < 0.02, `film ${film}`);
  // and 3% sits under the smallest dot (5%): some cells get a 5% dot, the rest none
  const faint = uniformFilm(0.03, (c) => c);
  assert.ok(Math.abs(faint - Math.round(0.03 * 255) / 255) < 0.012, `film ${faint}`);
});

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const FLAT: Shape[] = [
  { kind: 'rect', x: 40, y: 60, w: 240, h: 330, colour: [242, 194, 48] },
  { kind: 'circle', cx: 440, cy: 150, r: 110, colour: [215, 38, 61] },
];

function spies(over: Partial<SetRenderers> = {}): { renderers: SetRenderers; calls: { method: string; input: RenderInput & { grid?: WorkGrid; sim?: SimProcessPlan } }[] } {
  const calls: { method: string; input: RenderInput & { grid?: WorkGrid; sim?: SimProcessPlan } }[] = [];
  const renderers: SetRenderers = {
    spot: (input) => (calls.push({ method: 'spot', input }), (over.spot ?? SET_RENDERERS.spot)(input)),
    index: (input) => (calls.push({ method: 'index', input }), (over.index ?? SET_RENDERERS.index)(input)),
    simProcess: (input) => (calls.push({ method: 'sim_process', input }), (over.simProcess ?? SET_RENDERERS.simProcess)(input)),
  };
  return { renderers, calls };
}

function sepInput(shapes: Shape[], garments: GarmentColour[], recipe: PrintRecipe, art?: Raster) {
  return { art: art ?? drawArt(600, 450, shapes), placement: { position: 'front_chest', widthMm: 100 }, garments, recipe, inks: DEFAULT_INK_SYSTEM, label: LABEL };
}

test('dispatch: each set renders by its method', async () => {
  // flat art: spot, for both sets
  const spot = spies();
  const flat = await separateScreen(sepInput(FLAT, [BLACK, WHITE], RECIPE), spot.renderers);
  assert.equal(flat.method, 'spot');
  assert.deepEqual(
    spot.calls.map((c) => c.method),
    ['spot', 'spot'],
  );
  // a forced method wins: simulated process gets the work grid and the plan made for the joins
  const sim = spies();
  const forced = await separateScreen(sepInput(FLAT, [BLACK], mergeRecipe(RECIPE, { method: 'sim_process' })), sim.renderers);
  assert.deepEqual(
    sim.calls.map((c) => c.method),
    ['sim_process'],
  );
  assert.ok(sim.calls[0].input.grid && sim.calls[0].input.sim, 'grid and plan passed');
  assert.equal(forced.sets[0].method, 'sim_process');
  assert.equal(forced.needsManual, false);
  // index gets the grid; nothing to finish by hand
  const idx = spies();
  const index = await separateScreen(sepInput(FLAT, [WHITE], mergeRecipe(RECIPE, { method: 'index' })), idx.renderers);
  assert.deepEqual(
    idx.calls.map((c) => c.method),
    ['index'],
  );
  assert.ok(idx.calls[0].input.grid);
  assert.equal(index.method, 'index');
  assert.equal(index.needsManual, false);
  assert.ok(!index.warnings.some((w) => w.code === 'needs_index'));
});

test('each set says why it has its method, so a pack never shows another set\'s reason', async () => {
  // a white glow: it needs the white ink on black, and is the shirt on white
  const shapes: Shape[] = [...FLAT, { kind: 'glow', cx: 420, cy: 330, r: 120, colour: [255, 255, 255] }];
  const res = await separateScreen(sepInput(shapes, [BLACK, WHITE], RECIPE));
  const darks = res.sets.find((s) => s.key === 'darks');
  const lights = res.sets.find((s) => s.key === 'lights');
  assert.ok(darks && lights);
  assert.equal(darks.methodReason, res.methodReason, 'the darks set leads');
  assert.match(lights.methodReason ?? '', /^Flat colour: 2 inks/);
  assert.notEqual(lights.methodReason, res.methodReason);
});

test('dispatch: a method whose renderer is still a stub falls back to a spot draft for the auditor', async () => {
  const stub = spies({
    index: () => {
      throw new Error('not implemented: P2-A renderIndexSet');
    },
  });
  const res = await separateScreen(sepInput(FLAT, [WHITE], mergeRecipe(RECIPE, { method: 'index' })), stub.renderers);
  assert.deepEqual(
    stub.calls.map((c) => c.method),
    ['index', 'spot'],
  );
  assert.equal(res.method, 'index');
  assert.equal(res.needsManual, true);
  const flag = res.warnings.find((w) => w.code === 'needs_index');
  assert.ok(flag && flag.severity === 'review');
  assert.match(res.methodReason, /spot draft/);
  assert.equal(res.sets[0].methodReason, res.methodReason, 'the draft set says it is a draft');
  // any other failure is not swallowed
  const broken = spies({
    simProcess: () => {
      throw new Error('boom');
    },
  });
  await assert.rejects(separateScreen(sepInput(FLAT, [WHITE], mergeRecipe(RECIPE, { method: 'sim_process' })), broken.renderers), /boom/);
});

test('dispatch: index sets join garments by what the index films print on them (indexJoinCheck)', async () => {
  // ten flat colours and a black panel: on black the panel is the shirt, on navy the films would print it navy
  const palette: [number, number, number][] = [
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
  const shapes: Shape[] = [
    { kind: 'rect', x: 0, y: 0, w: 600, h: 40, colour: [21, 21, 21] },
    ...palette.map((c, i): Shape => ({ kind: 'rect', x: 20 + (i % 5) * 115, y: 60 + Math.floor(i / 5) * 190, w: 100, h: 170, colour: c })),
  ];
  const res = await separateScreen(sepInput(shapes, [BLACK, NAVY], RECIPE));
  assert.equal(res.method, 'index', res.methodReason);
  assert.equal(res.needsManual, false);
  assert.deepEqual(
    res.sets.map((s) => [s.key, s.garmentCodes, s.method]),
    [
      ['darks', ['C002'], 'index'],
      ['C727', ['C727'], 'index'],
    ],
  );
});

test('dispatch: garments share simulated-process screens only when those screens print them well', async () => {
  const recipe = mergeRecipe(RECIPE, { method: 'sim_process' });
  // soft glows on a transparent ground: black and navy share the darks
  const shared = await separateScreen(sepInput([], [BLACK, NAVY], recipe, glowArt()));
  assert.deepEqual(
    shared.sets.map((s) => [s.key, s.garmentCodes]),
    [['darks', ['C002', 'C727']]],
  );
  // an opaque near-black panel is the shirt on black, but must print on navy
  const panel: Shape[] = [{ kind: 'rect', x: 0, y: 0, w: 600, h: 450, colour: [16, 16, 18] }];
  const art = drawArt(600, 450, [...panel, { kind: 'glow', cx: 300, cy: 225, r: 200, colour: [232, 66, 58] }]);
  const own = await separateScreen(sepInput([], [BLACK, NAVY], recipe, art));
  assert.deepEqual(
    own.sets.map((s) => [s.key, s.garmentCodes]),
    [
      ['darks', ['C002']],
      ['C727', ['C727']],
    ],
  );
  assert.ok(own.warnings.some((w) => w.code === 'own_screen_set'));
});
