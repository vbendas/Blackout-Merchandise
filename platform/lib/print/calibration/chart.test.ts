// The dot-gain chart as films, a PSD and a PDF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePsdIndependently } from '@/lib/print/pack/independent';
import { readScreenPsdDetail } from '@/lib/print/pack/psd-read';
import { parsePlateLayerName } from '@/lib/print/pack/names';
import { pdfLines, shows } from '@/lib/print/pack/test-pdf';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE } from '@/lib/print/defaults';
import { targetBoxes } from '@/lib/print/engine/marks';
import type { CanvasSpec, Plate } from '@/lib/print/types';
import { buildChartFile, clearChartCache, renderChartFilms, renderChartPdf, renderChartPsd } from './chart';
import { readChartImage } from './scan';
import {
  CHART_GEOMETRY,
  CHART_HEIGHT_MM,
  CHART_MARKS,
  CHART_WIDTH_MM,
  INK_KINDS,
  chartCanvas,
  chartPatches,
  checkChartSettings,
  defaultChartSettings,
  mmToPx,
  patchesOf,
  chartPointOfLattice,
  latticeOf,
  windowCells,
  windowCorners,
  wedgeOf,
  type ChartSettings,
} from './chart-layout';

/** A small, fast chart: 300 ppi at 40 lpi (7.5 pixels to a dot). The house screen is covered below. */
const FAST: ChartSettings = { lpi: 40, angleDeg: 22.5, ppi: 300, mesh: 230, dot: 'round', films: ['underbase', 'base', 'highlight'] };

function inkShare(plate: Plate, canvas: CanvasSpec, rect: { x: number; y: number; w: number; h: number }, inset = 0): number {
  const x0 = canvas.art.x + Math.round(mmToPx(rect.x + inset, canvas.ppi));
  const x1 = canvas.art.x + Math.round(mmToPx(rect.x + rect.w - inset, canvas.ppi));
  const y0 = canvas.art.y + Math.round(mmToPx(rect.y + inset, canvas.ppi));
  const y1 = canvas.art.y + Math.round(mmToPx(rect.y + rect.h - inset, canvas.ppi));
  let on = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (plate.data[y * canvas.widthPx + x]) on++;
  return on / ((x1 - x0) * (y1 - y0));
}

test('the chart plan: 182 x 165 mm, three bands of 24 patches, 21 wedge steps in each', () => {
  assert.equal(CHART_WIDTH_MM, 182);
  assert.equal(CHART_HEIGHT_MM, 165);
  assert.equal(chartPatches().length, 72);
  for (const kind of INK_KINDS) {
    const patches = patchesOf(kind);
    assert.equal(patches.length, 24);
    assert.deepEqual(wedgeOf(kind).map((p) => p.step), Array.from({ length: 21 }, (_, i) => i * 5));
    assert.deepEqual(patches.filter((p) => p.kind === 'garment').map((p) => [p.col, p.row]), [[0, 0]]);
    assert.deepEqual(patches.filter((p) => p.kind === 'solid').map((p) => [p.col, p.row]), [[0, 1]]);
    assert.equal(patches.filter((p) => p.kind === 'garment2').length, 1);
  }
});

test('no patch overlaps another, a mark or the chart edge, and the marks are clear of the patches', () => {
  const rects = chartPatches().map((p) => ({ ...p.rect, id: `${p.film}:${p.kind}:${p.step}` }));
  for (const [i, a] of rects.entries()) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= CHART_WIDTH_MM && a.y + a.h <= CHART_HEIGHT_MM, a.id);
    for (const b of rects.slice(i + 1)) {
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${a.id} overlaps ${b.id}`);
    }
    for (const mark of CHART_MARKS) {
      const half = mark.sizeMm / 2;
      const gapX = Math.max(mark.centre.x - half - (a.x + a.w), a.x - (mark.centre.x + half));
      const gapY = Math.max(mark.centre.y - half - (a.y + a.h), a.y - (mark.centre.y + half));
      assert.ok(Math.max(gapX, gapY) >= 6, `${a.id} is only ${Math.max(gapX, gapY)} mm from the ${mark.id} mark`);
    }
  }
  const [tl, tr, bl, br] = ['tl', 'tr', 'bl', 'br'].map((id) => CHART_MARKS.find((m) => m.id === id)!);
  assert.ok(tl.sizeMm > tr.sizeMm && tl.sizeMm > bl.sizeMm && tl.sizeMm > br.sizeMm, 'the top left mark is the biggest');
});

test('the measuring window is a whole, even number of dots and fits inside its patch', () => {
  for (const [lpi, angle] of [[55, 22.5], [40, 22.5], [45, 45], [65, 15], [30, 0], [85, 75], [20, 22.5]] as const) {
    const n = windowCells(lpi, angle);
    assert.ok(n >= 4 && n % 2 === 0, `${lpi} lpi ${angle}°: ${n}`);
    if (lpi >= 30) {
      const side = n * (25.4 / lpi);
      const rad = ((Math.min(angle % 90, 90 - (angle % 90)) * Math.PI) / 180) || 0;
      const reach = side * (Math.cos(rad) + Math.sin(rad));
      assert.ok(reach <= CHART_GEOMETRY.patchMm - 2 * CHART_GEOMETRY.windowInsetMm + 1e-9, `${lpi} lpi ${angle}°: window reaches ${reach} mm`);
    }
  }
  assert.equal(windowCells(55, 22.5), 12);
});

test('lattice coordinates and chart positions are each other’s inverse, and a window’s corners stay inside its patch', () => {
  for (const [lpi, angle] of [[55, 22.5], [40, 0], [45, 45], [65, 15], [85, 75], [30, 100]] as const) {
    for (const p of [{ x: 0, y: 0 }, { x: 91, y: 82.5 }, { x: 170, y: 140.3 }]) {
      const { s, t } = latticeOf(p, lpi, angle);
      const back = chartPointOfLattice(s, t, lpi, angle);
      assert.ok(Math.hypot(back.x - p.x, back.y - p.y) < 1e-9, `${lpi} lpi ${angle}°`);
    }
    // one cell along the screen is one cell's width on the chart
    const a = chartPointOfLattice(0, 0, lpi, angle);
    const b = chartPointOfLattice(1, 0, lpi, angle);
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 25.4 / lpi) < 1e-9);
    for (const patch of chartPatches()) {
      for (const c of windowCorners(patch.centre, lpi, angle)) {
        const inset = CHART_GEOMETRY.windowInsetMm - 1e-6;
        assert.ok(c.x >= patch.rect.x + inset - 1e-6 && c.x <= patch.rect.x + patch.rect.w - inset + 1e-6, `${lpi} lpi ${angle}° ${patch.film} ${patch.kind} ${patch.step}: x ${c.x}`);
        assert.ok(c.y >= patch.rect.y + inset - 1e-6 && c.y <= patch.rect.y + patch.rect.h - inset + 1e-6, `${lpi} lpi ${angle}° y ${c.y}`);
      }
    }
  }
});

test('each film carries its own band, the marks and the registration targets, and nothing of the other bands', () => {
  const { canvas, films } = renderChartFilms(FAST);
  assert.equal(films.length, 3);
  assert.deepEqual(films.map((f) => f.kind), ['underbase', 'base', 'highlight']);
  assert.equal(canvas.ppi, 300);
  for (const film of films) {
    assert.equal(film.plate.data.length, canvas.widthPx * canvas.heightPx);
    for (const mark of CHART_MARKS) {
      const half = mark.sizeMm / 2;
      assert.equal(inkShare(film.plate, canvas, { x: mark.centre.x - half, y: mark.centre.y - half, w: mark.sizeMm, h: mark.sizeMm }, 0.3), 1, `${film.kind}: ${mark.id} mark is solid`);
    }
    for (const patch of chartPatches()) {
      const own = patch.film === film.kind;
      const share = inkShare(film.plate, canvas, patch.rect, CHART_GEOMETRY.windowInsetMm);
      if (!own || patch.kind === 'garment' || patch.kind === 'garment2') assert.equal(share, 0, `${film.kind} should be empty at ${patch.film} ${patch.kind} ${patch.step}`);
      else if (patch.kind === 'solid') assert.equal(share, 1);
    }
    assert.ok(film.coverage > 0.05 && film.coverage < 0.3, `${film.kind} covers ${film.coverage}`);
  }
  // Binary, and the targets and marks are identical from film to film.
  for (const f of films) for (const v of f.plate.data) if (v !== 0 && v !== 255) assert.fail(`not binary: ${v}`);
});

test('the chart is on a production film: corner targets outside the chart area, and the reader still finds its own marks with them printed', () => {
  const settings: ChartSettings = { ...FAST, films: ['base'] };
  const { canvas, films } = renderChartFilms(settings);
  assert.deepEqual(canvas.layout, DEFAULT_RECIPE.marks);
  const { art, widthPx: W, heightPx: H } = canvas;
  for (const box of targetBoxes(canvas)) {
    assert.ok(box.y + box.height <= art.y || box.y >= art.y + art.height, `the ${box.name} target is above or below the chart area`);
  }
  // The whole film printed, targets and label strip included, black on a white tee with no dot gain, and scanned at
  // the film's resolution: the reader frames the chart by its own squares and reads the wedge as the film has it.
  const tee = [236, 234, 228];
  const ink = [22, 22, 24];
  const rgb = new Uint8Array(W * H * 3);
  const film = films[0].plate.data;
  for (let i = 0; i < W * H; i++) rgb.set(film[i] ? ink : tee, i * 3);
  const reading = readChartImage({ width: W, height: H, rgb }, settings);
  assert.equal(reading.geometry.marksFound, 8, 'the four corner squares and the four edge marks');
  assert.ok(Math.abs(reading.geometry.dpi - 300) < 1.5, `dpi ${reading.geometry.dpi}`);
  const base = reading.films.find((f) => f.kind === 'base');
  assert.ok(base && base.status === 'ok', JSON.stringify(base?.status));
  assert.equal(base.points.length, 21);
  for (const p of base.points) assert.ok(Math.abs(p.printed - p.input) < 0.03, `${p.input * 100}% reads ${(p.printed * 100).toFixed(1)}%`);
});

test('the wedge images coverage linearly: each step carries the share of ink it names, 5% dots included', () => {
  const { canvas, films } = renderChartFilms(FAST);
  for (const film of films) {
    let prev = -1;
    for (const patch of wedgeOf(film.kind)) {
      const share = inkShare(film.plate, canvas, patch.rect, CHART_GEOMETRY.windowInsetMm);
      assert.ok(Math.abs(share - patch.coverage) <= 0.02, `${film.kind} ${patch.step}%: ${share}`);
      assert.ok(share >= prev, 'rising');
      prev = share;
    }
  }
});

test('films not asked for are not made; the rest keep their place and their art', () => {
  const only = renderChartFilms({ ...FAST, films: ['base'] });
  assert.deepEqual(only.films.map((f) => f.kind), ['base']);
  const all = renderChartFilms(FAST);
  // Inside the chart area the colour base film is the same pixels whether or not the others are made
  // (only its label strip, in the margin, says "1/1" instead of "2/3").
  const { art, widthPx } = all.canvas;
  for (let y = art.y; y < art.y + art.height; y++) {
    const a = only.films[0].plate.data.subarray(y * widthPx + art.x, y * widthPx + art.x + art.width);
    const b = all.films[1].plate.data.subarray(y * widthPx + art.x, y * widthPx + art.x + art.width);
    if (!Buffer.from(a).equals(Buffer.from(b))) assert.fail(`row ${y} of the chart area differs`);
  }
});

test('settings: the house screen by default, anything else checked in words', () => {
  const house = defaultChartSettings();
  assert.deepEqual({ lpi: house.lpi, angleDeg: house.angleDeg, ppi: house.ppi, mesh: house.mesh }, { lpi: 55, angleDeg: 22.5, ppi: 600, mesh: 230 });
  assert.deepEqual(house.films, ['underbase', 'base']);

  const ok = checkChartSettings({ lpi: '45', angleDeg: '45', mesh: '255', films: 'highlight,underbase' });
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && { ...ok.value }, { lpi: 45, angleDeg: 45, ppi: 600, mesh: 255, dot: 'round', films: ['underbase', 'highlight'] });

  const bad = (raw: Record<string, unknown>) => {
    const r = checkChartSettings(raw);
    return r.ok ? 'ok' : r.error;
  };
  assert.match(bad({ lpi: 5 }), /Lines per inch goes from 15 to 150/);
  assert.match(bad({ lpi: 'x' }), /needs a number/);
  assert.match(bad({ angleDeg: 200 }), /angle goes from 0 to 180/);
  assert.match(bad({ ppi: 100 }), /resolution goes from 300 to 1200/);
  assert.match(bad({ ppi: 600.5 }), /whole number/);
  assert.match(bad({ mesh: 1000 }), /mesh goes from 30 to 500/);
  assert.match(bad({ lpi: 150, ppi: 600 }), /too fine to image/);
  assert.match(bad({ films: 'magenta' }), /Pick the films/);
  assert.match(bad({ films: [] }), /at least one film/);
  assert.match(bad({ dot: 'square' }), /round or elliptical/);
});

test('the PSD has one layer per film, named like production layers, and the films read back exactly', async () => {
  const psd = await renderChartPsd(FAST);
  assert.equal(psd.name, 'MerchFrom-dot-gain-chart-40lpi-22.5deg-300ppi.psd');
  assert.equal(psd.bytes.subarray(0, 4).toString('latin1'), '8BPS');
  const parsed = await readScreenPsdDetail(psd.bytes);
  const canvas = chartCanvas(300);
  assert.equal(parsed.widthPx, canvas.widthPx);
  assert.equal(parsed.heightPx, canvas.heightPx);
  assert.equal(parsed.ppi, 300);
  assert.equal(parsed.plates.length, 3);
  assert.equal(parsed.hasOriginal, true);
  assert.equal(parsed.effectsOn, false);
  assert.deepEqual(
    parsed.plates.map((p) => parsePlateLayerName(p.name)?.role),
    ['underbase', 'ink', 'highlight'],
  );
  assert.ok(parsed.plates.every((p) => parsePlateLayerName(p.name)?.lpi === 40 && parsePlateLayerName(p.name)?.angleDeg === 22.5));
  const { films } = renderChartFilms(FAST);
  parsed.plates.forEach((p, i) => assert.ok(Buffer.from(p.plate.data).equals(Buffer.from(films[i].plate.data)), `film ${i + 1} reads back exactly`));
});

test('a decoder other than the writer’s reads the same stack: films on top, the garment preview and the picture of the chart under them', async () => {
  const psd = await renderChartPsd(FAST);
  const independent = await parsePsdIndependently(psd.bytes);
  const canvas = chartCanvas(300);
  assert.equal(independent.width, canvas.widthPx);
  assert.equal(independent.height, canvas.heightPx);
  assert.equal(independent.resolutionInfo?.horizontal, 300);
  assert.deepEqual(
    independent.layers.map((l) => l.name),
    ['3/3  Highlight white · Aquaflex V2 White · 40 lpi 22.5°', '2/3  Ink #8F8F8F · Colour base · 40 lpi 22.5°', '1/3  Underbase · Aquaflex V2 White · flash · 40 lpi 22.5°', 'GARMENT · Dark blank (preview)', 'ORIGINAL (do not print)'],
  );
  assert.deepEqual(independent.layers.slice(0, 3).map((l) => l.isHidden), [false, false, false], 'every film is visible, so they print one by one the way an operator does');
});

test('a one-film chart is a one-layer PSD', async () => {
  const psd = await renderChartPsd({ ...FAST, films: ['base'] });
  const parsed = await readScreenPsdDetail(psd.bytes);
  assert.equal(parsed.plates.length, 1);
  assert.match(parsed.plates[0].name, /^1\/1 /);
});

test('the instructions are one A4 page with the steps, the screen and a table to write in', async () => {
  const pdf = await renderChartPdf(FAST, DEFAULT_INK_SYSTEM, new Date('2026-10-15T12:00:00Z'));
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  const raw = pdf.toString('latin1');
  assert.equal((raw.match(/\/Type\s*\/Page\b/g) ?? []).length, 1, 'one page');
  assert.match(raw, /\/MediaBox\s*\[\s*0\s+0\s+595\.28\s+841\.89\s*\]/);
  const lines = pdfLines(pdf);
  for (const phrase of ['Dot gain test chart', '40 lpi', '22.5°', '300 ppi', 'mesh 230', 'Underbase white', 'Colour base', 'Highlight white', 'Bare garment', '95 % on the film', '600 dpi', 'Packs approved before the change keep their files']) {
    assert.ok(shows(lines, phrase), `the page should say "${phrase}"`);
  }
});

test('the house screen: 600 ppi, 55 lpi, 22.5°, the films fit a PSD of a few MB and write in seconds', async () => {
  const started = Date.now();
  const psd = await renderChartPsd(defaultChartSettings());
  assert.ok(psd.bytes.length < 40 * 1024 * 1024, `${psd.bytes.length} bytes`);
  assert.ok(Date.now() - started < 60000);
  const parsed = await readScreenPsdDetail(psd.bytes);
  assert.equal(parsed.ppi, 600);
  assert.equal(parsed.plates.length, 2);
  assert.deepEqual([parsed.widthPx, parsed.heightPx], [chartCanvas(600).widthPx, chartCanvas(600).heightPx]);
});

test('the same chart asked for twice is made once', async () => {
  clearChartCache();
  const a = await buildChartFile('pdf', FAST);
  const b = await buildChartFile('pdf', FAST);
  assert.equal(a, b);
  assert.equal(a.contentType, 'application/pdf');
  assert.match(a.name, /-instructions\.pdf$/);
  const c = await buildChartFile('pdf', { ...FAST, lpi: 45 });
  assert.notEqual(a, c);
  const psd = await buildChartFile('psd', { ...FAST, films: ['base'] });
  assert.equal(psd.contentType, 'image/vnd.adobe.photoshop');
  assert.match(psd.name, /\.psd$/);
});
