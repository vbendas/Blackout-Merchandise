// The scan reader, against synthetic printed charts whose dot gain is known:
// the press and scanner stand-ins in synthetic-print.ts print the real films
// and scan them turned, shaded, noisy and warped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import sharp from 'sharp';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { patchesOf } from './chart-layout';
import { buildDotGainCurves } from './curve';
import { buildDotGainProfile, dotGainProblem } from './profile';
import { dotGainFor } from './curve';
import type { ChartSettings, InkKind } from './chart-layout';
import { applyH, fitHomography, readChartImage, readChartScan, ScanError, SCAN_LIMITS, filmPoints, type FilmReading, type ScanImage, type ScanReading } from './scan';
import { TYPICAL_PRESS, printFlatTints, renderSyntheticScan, type SyntheticOptions } from './synthetic-print';

/** 300 ppi at 40 lpi, a dot cell 7.5 pixels across: the house screen's geometry, a little smaller. */
const FAST: ChartSettings = { lpi: 40, angleDeg: 22.5, ppi: 300, mesh: 230, dot: 'round', films: ['underbase', 'base', 'highlight'] };
/** 250 ppi at 35 lpi: the same window of 8 dots, 30% fewer pixels. */
const SMALL: ChartSettings = { lpi: 35, angleDeg: 22.5, ppi: 250, mesh: 230, dot: 'round', films: ['base'] };

const WHITE_TEE: [number, number, number] = [236, 234, 228];
const BLACK_TEE: [number, number, number] = [28, 28, 31];
const GREY_TEE: [number, number, number] = [128, 126, 124];

function film(reading: ScanReading, kind: InkKind): FilmReading {
  const f = reading.films.find((x) => x.kind === kind);
  assert.ok(f, `${kind} is in the reading`);
  return f;
}

/** The largest distance, in points of coverage, between what was read and what is true. */
function worstError(reading: ScanReading, kind: InkKind, truth: number[] | undefined): number {
  const f = film(reading, kind);
  assert.ok(truth && f.points.length === truth.length, `${kind}: there is a wedge to compare`);
  return Math.max(...f.points.map((p, i) => Math.abs(p.printed - truth[i]))) * 100;
}

/** Quarter turns clockwise, exactly: a scan laid on the glass the other way round. */
function turn(image: ScanImage, quarters: number): ScanImage {
  let current = image;
  for (let q = 0; q < ((quarters % 4) + 4) % 4; q++) {
    const { width: w, height: h, rgb } = current;
    const out = new Uint8Array(rgb.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const from = (y * w + x) * 3;
        const to = (x * h + (h - 1 - y)) * 3;
        out[to] = rgb[from];
        out[to + 1] = rgb[from + 1];
        out[to + 2] = rgb[from + 2];
      }
    }
    current = { width: h, height: w, rgb: out };
  }
  return current;
}

const cache = new Map<string, ReturnType<typeof renderSyntheticScan>>();
/** The same synthetic print is made once however many tests read it. */
function printed(name: string, options: SyntheticOptions) {
  let hit = cache.get(name);
  if (!hit) {
    hit = renderSyntheticScan(options);
    cache.set(name, hit);
  }
  return hit;
}

const CLEAN: SyntheticOptions = {
  settings: FAST,
  rotationDeg: 2.3,
  offsetMm: { x: 3, y: -2 },
  garment: GREY_TEE,
  inks: { underbase: [245, 245, 240], base: [22, 22, 24], highlight: [245, 245, 240] },
};

// ---------------------------------------------------------------------------
// Geometry

test('a homography is recovered from four marks, and from eight with noise', () => {
  const from = [
    { x: 10, y: 10 },
    { x: 172, y: 10 },
    { x: 10, y: 155 },
    { x: 172, y: 155 },
  ];
  const truth = (p: { x: number; y: number }) => {
    const a = (2.3 * Math.PI) / 180;
    const x = 23.6 * (p.x * Math.cos(a) - p.y * Math.sin(a)) + 400;
    const y = 23.6 * (p.x * Math.sin(a) + p.y * Math.cos(a)) + 300;
    // a little perspective
    const w = 1 + 0.00002 * x - 0.00001 * y;
    return { x: x / w, y: y / w };
  };
  const exact = fitHomography(from, from.map(truth));
  assert.ok(exact);
  for (const p of [{ x: 91, y: 82 }, { x: 40, y: 120 }, { x: 160, y: 40 }]) {
    const got = applyH(exact, p);
    const want = truth(p);
    assert.ok(Math.hypot(got.x - want.x, got.y - want.y) < 0.5, `${got.x},${got.y} vs ${want.x},${want.y}`);
  }
  const more = [...from, { x: 91, y: 10 }, { x: 91, y: 155 }, { x: 10, y: 82 }, { x: 172, y: 82 }];
  const noisy = fitHomography(more, more.map((p, i) => ({ x: truth(p).x + (i % 2 ? 0.4 : -0.4), y: truth(p).y + (i % 3 ? 0.3 : -0.3) })));
  assert.ok(noisy);
  const mid = applyH(noisy, { x: 91, y: 82 });
  assert.ok(Math.hypot(mid.x - truth({ x: 91, y: 82 }).x, mid.y - truth({ x: 91, y: 82 }).y) < 1);
  assert.equal(fitHomography(from.slice(0, 3), from.slice(0, 3)), null, 'three points are not enough');
});

// ---------------------------------------------------------------------------
// A clean scan of all three films

test('a clean scan, turned 2.3 degrees and off to one side: every wedge point within two points of the truth', () => {
  const scan = printed('clean', CLEAN);
  const reading = readChartImage(scan.image, FAST);

  assert.equal(reading.geometry.marksFound, 8, 'the four corners and the four edge marks');
  assert.ok(Math.abs(reading.geometry.dpi - 300) < 1.5, `dpi ${reading.geometry.dpi}`);
  assert.ok(Math.abs(reading.geometry.rotationDeg - 2.3) < 0.05, `rotation ${reading.geometry.rotationDeg}`);
  assert.ok((reading.geometry.checkErrorMm ?? 9) < 0.2, `edge marks ${reading.geometry.checkErrorMm} mm off`);

  for (const kind of ['underbase', 'base', 'highlight'] as const) {
    const f = film(reading, kind);
    assert.equal(f.status, 'ok');
    assert.ok(f.contrast > 30, `${kind} contrast ${f.contrast}`);
    assert.equal(f.points.length, 21);
    assert.deepEqual(f.points.map((p) => p.input), Array.from({ length: 21 }, (_, i) => i / 20));
    const err = worstError(reading, kind, scan.truth[kind]);
    // 2% shading across the scan, fibre noise and sensor noise are on: without them the reader is within a tenth of a point.
    assert.ok(err < 2, `${kind}: worst error ${err.toFixed(2)} points`);
  }
  assert.equal(reading.warnings.filter((w) => w.severity !== 'info').length, 0, JSON.stringify(reading.warnings));
  assert.equal(reading.confidence, 'good');
  // The wedge really is a press: gain in the middle, none at the ends.
  const base = film(reading, 'base');
  assert.ok(base.points[10].printed - 0.5 > 0.1, 'about 15 points of gain at 50%');
  assert.ok(Math.abs(base.points[0].printed) < 0.01 && Math.abs(base.points[20].printed - 1) < 0.01);
});

test('the chart can be scanned any way up: the same readings after any quarter turn', () => {
  const scan = printed('clean', CLEAN);
  const upright = readChartImage(scan.image, FAST);
  for (const quarters of [1, 2, 3]) {
    const turned = readChartImage(turn(scan.image, quarters), FAST);
    assert.equal(turned.geometry.marksFound, 8);
    for (const kind of ['underbase', 'base', 'highlight'] as const) {
      film(turned, kind).points.forEach((p, i) => assert.ok(Math.abs(p.printed - film(upright, kind).points[i].printed) < 0.003, `${quarters} quarter turns, ${kind} step ${i}`));
    }
  }
});

// ---------------------------------------------------------------------------
// Other garments and inks

test('a white ink on a black garment reads as well as a black one on white', () => {
  const scan = printed('white-on-black', { settings: { ...SMALL, films: ['underbase'] }, garment: BLACK_TEE, inks: { underbase: [240, 240, 236] }, rotationDeg: -1.4, offsetMm: { x: -2, y: 3 }, seed: 5 });
  const reading = readChartImage(scan.image, SMALL);
  const err = worstError(reading, 'underbase', scan.truth.underbase);
  assert.ok(err < 1.5, `worst error ${err.toFixed(2)} points`);
  assert.equal(film(reading, 'base').status, 'not_printed');
  assert.equal(film(reading, 'highlight').status, 'not_printed');
  assert.equal(reading.confidence, 'good', 'bands that were not printed are only noted');
  assert.equal(reading.warnings.filter((w) => w.code === 'not_printed').length, 2);
});

test('one black film on a white tee: the other two bands are skipped, not misread', () => {
  const scan = printed('black-on-white', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, rotationDeg: 0.6, seed: 9 });
  const reading = readChartImage(scan.image, SMALL);
  assert.equal(film(reading, 'base').status, 'ok');
  assert.ok(worstError(reading, 'base', scan.truth.base) < 1.5);
  assert.deepEqual(reading.films.filter((f) => f.status === 'not_printed').map((f) => f.kind), ['underbase', 'highlight']);
  assert.deepEqual(film(reading, 'underbase').points, []);
  assert.equal(filmPoints(reading, 'underbase'), null);
  const pts = filmPoints(reading, 'base');
  assert.equal(pts?.length, 21);
});

test('the marks are found even when another ink on the same garment is stronger than the one they are printed in', () => {
  // A white film and then a black one on grey: the marks end up black, the weaker contrast, beside white patches that are far stronger.
  const scan = printed('white-then-black', { settings: { ...SMALL, films: ['underbase', 'base'] }, garment: GREY_TEE, inks: { underbase: [245, 245, 240], base: [22, 22, 24] }, rotationDeg: 1.7, offsetMm: { x: 4, y: -3 }, seed: 4 });
  const reading = readChartImage(scan.image, SMALL);
  assert.equal(reading.geometry.marksFound, 8);
  assert.ok(worstError(reading, 'underbase', scan.truth.underbase) < 2);
  assert.ok(worstError(reading, 'base', scan.truth.base) < 2);
});

test('a coloured ink is read by the channels that show it: yellow on white barely moves luminance', () => {
  const scan = printed('yellow', { settings: SMALL, garment: WHITE_TEE, inks: { base: [236, 200, 28] }, seed: 3 });
  const reading = readChartImage(scan.image, SMALL);
  const f = film(reading, 'base');
  assert.notEqual(f.status, 'not_printed');
  const err = worstError(reading, 'base', scan.truth.base);
  assert.ok(err < 2, `worst error ${err.toFixed(2)} points`);
});

// ---------------------------------------------------------------------------
// Things that go wrong, and what the reader says

test('a steady fall-off of light along a band is corrected for completely, and said', () => {
  const scan = printed('tilted', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, tilt: 0.14, shading: 0, weave: 0.005, noiseCodes: 0.3, seed: 11 });
  const reading = readChartImage(scan.image, SMALL);
  const err = worstError(reading, 'base', scan.truth.base);
  assert.ok(err < 1, `worst error ${err.toFixed(2)} points with 14% of the light lost per 100 mm`);
  // The two ends of the band see different light: against the near end alone the far patches would read off by that much.
  assert.ok(film(reading, 'base').shading > 0.1, `shading ${film(reading, 'base').shading}`);
  const said = reading.warnings.find((w) => w.code === 'shading');
  assert.ok(said, JSON.stringify(reading.warnings));
  assert.match(said.message, /corrected for/);
  assert.equal(reading.confidence, 'check');
});

test('strong random shading over the whole scan still costs only a few points', () => {
  const scan = printed('shaded', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, shading: 0.16, weave: 0.01, seed: 11 });
  const reading = readChartImage(scan.image, SMALL);
  assert.ok(worstError(reading, 'base', scan.truth.base) < 4.5);
});

test('noise on the scan costs a little accuracy and the reader still finds the chart', () => {
  const scan = printed('noisy', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, noiseCodes: 7, weave: 0.06, seed: 13 });
  const reading = readChartImage(scan.image, SMALL);
  assert.ok(worstError(reading, 'base', scan.truth.base) < 3, 'noise averages out over a window of many dots');
});

/** A stain over one patch of the colour base band, by what the patch is. */
function stained(name: string, where: { kind: 'garment' | 'garment2' | 'solid' | 'step'; step?: number }, over: { strength: number; r?: number; shift?: { x: number; y: number } }) {
  const patch = patchesOf('base').find((p) => p.kind === where.kind && (where.step === undefined || p.step === where.step));
  assert.ok(patch);
  const x = patch.centre.x + (over.shift?.x ?? 0);
  const y = patch.centre.y + (over.shift?.y ?? 0);
  return printed(name, { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, stains: [{ x, y, r: over.r ?? 8, strength: over.strength }], seed: 31 });
}

test('a seam or stain across the far end of a band is told apart from light, and only the near end is used', () => {
  const scan = stained('stain-far-garment', { kind: 'garment2' }, { strength: 0.5, r: 9 });
  const reading = readChartImage(scan.image, SMALL);
  const said = reading.warnings.find((w) => w.code === 'uneven_garment');
  assert.ok(said, JSON.stringify(reading.warnings));
  assert.match(said.message, /Only the near end was used/);
  assert.equal(said.film, 'base');
  assert.equal(reading.confidence, 'check');
  assert.ok(film(reading, 'base').shading > 0.25);
  // the stain is not light, so it does not drag the wedge: the patches away from it still read true (a little less well
  // than with both ends, since the scan's own shading is no longer corrected along the band)
  const truth = scan.truth.base as number[];
  const near = film(reading, 'base').points.slice(0, 10).map((p, i) => Math.abs(p.printed - truth[i]) * 100);
  assert.ok(Math.max(...near) < 3, `${Math.max(...near).toFixed(2)} points`);
});

test('a patch with a stain on half of it is called uneven, by name', () => {
  const scan = stained('stain-half-patch', { kind: 'step', step: 40 }, { strength: 0.6, r: 5, shift: { x: -4, y: 0 } });
  const reading = readChartImage(scan.image, SMALL);
  const said = reading.warnings.find((w) => w.code === 'noisy');
  assert.ok(said, JSON.stringify(reading.warnings));
  assert.match(said.message, /the 40% patch is uneven/);
  assert.equal(reading.confidence, 'check');
});

test('a 0% patch that reads something, and readings that fall, are named', () => {
  const zero = readChartImage(stained('stain-zero', { kind: 'step', step: 0 }, { strength: 0.5, r: 7 }).image, SMALL);
  const zeroSaid = zero.warnings.find((w) => w.code === 'zero_off');
  assert.ok(zeroSaid, JSON.stringify(zero.warnings));
  assert.match(zeroSaid.message, /the 0% patch reads \d+(\.\d+)?% when it should read nothing/);

  const dip = readChartImage(stained('stain-dip', { kind: 'step', step: 25 }, { strength: 0.55, r: 9 }).image, SMALL);
  const dipSaid = dip.warnings.find((w) => w.code === 'not_monotone');
  assert.ok(dipSaid, JSON.stringify(dip.warnings));
  assert.match(dipSaid.message, /the readings fall from 25% to 30% on the film/);
});

test('a garment that is stretched or rippled is flagged, because the patches are not where the marks say', () => {
  const scan = printed('warped', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, warpMm: 2.2, seed: 17 });
  const reading = readChartImage(scan.image, SMALL);
  assert.ok((reading.geometry.checkErrorMm ?? 0) > SCAN_LIMITS.reviewCheckMm, `edge marks only ${reading.geometry.checkErrorMm} mm off`);
  const flagged = reading.warnings.find((w) => w.code === 'misaligned');
  assert.ok(flagged, JSON.stringify(reading.warnings));
  assert.notEqual(reading.confidence, 'good');
  assert.match(flagged.message, /mm from where the corners put them/);
});

test('a scan at 150 dpi is flagged as low resolution, and still reads', () => {
  const scan = printed('low-res', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, scanDpi: 150, seed: 19 });
  const reading = readChartImage(scan.image, SMALL);
  assert.ok(Math.abs(reading.geometry.dpi - 150) < 1);
  assert.ok(reading.warnings.some((w) => w.code === 'low_resolution'));
  assert.ok(worstError(reading, 'base', scan.truth.base) < 3);
});

test('an ink that hardly shows against the garment is read with a warning; one that does not show at all is left out', () => {
  const dim = printed('dim', { settings: SMALL, garment: [200, 200, 200], inks: { base: [180, 182, 184] }, seed: 23 });
  const reading = readChartImage(dim.image, SMALL);
  assert.ok(['low_contrast', 'not_printed'].includes(film(reading, 'base').status));
});

test('nothing printed on a scan means no curve, and the reader says so', () => {
  const blank = printed('blank-band', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, seed: 29 });
  // paint the four corner squares out: the chart can't be found
  const wiped: ScanImage = { ...blank.image, rgb: Uint8Array.from(blank.image.rgb) };
  const [w, h] = [wiped.width, wiped.height];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x < w * 0.2 || x > w * 0.8) && (y < h * 0.25 || y > h * 0.75)) wiped.rgb.fill(236, (y * w + x) * 3, (y * w + x) * 3 + 3);
  assert.throws(() => readChartImage(wiped, SMALL), (err: unknown) => err instanceof ScanError && err.code === 'no_marks' && /four corner squares/.test(err.message));
});

test('files that are not scans of the chart are refused in words', async () => {
  assert.throws(() => readChartImage({ width: 200, height: 200, rgb: new Uint8Array(200 * 200 * 3) }, FAST), (err: unknown) => err instanceof ScanError && err.code === 'too_small');
  const flat: ScanImage = { width: 800, height: 600, rgb: new Uint8Array(800 * 600 * 3).fill(200) };
  assert.throws(() => readChartImage(flat, FAST), (err: unknown) => err instanceof ScanError && err.code === 'no_marks');
  await assert.rejects(readChartScan(Buffer.from('this is not an image'), FAST), (err: unknown) => err instanceof ScanError && err.code === 'unreadable' && /TIFF, PNG or JPEG/.test(err.message));
});

test('a scan that claims more pixels than the reader takes is refused before it is decoded', async () => {
  // 69 bytes of PNG that say 15000 x 12000 px (180 megapixels, 540 MB once decoded)
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(15000, 0);
  header.writeUInt32BE(12000, 4);
  header[8] = 8;
  header[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.alloc(100))), chunk('IEND', Buffer.alloc(0))]);
  await assert.rejects(readChartScan(png, FAST), (err: unknown) => err instanceof ScanError && err.code === 'unreadable' && /too large to read/.test(err.message));
});

// ---------------------------------------------------------------------------
// File formats

test('PNG, JPEG and TIFF scans all read, and agree', async () => {
  const scan = printed('black-on-white', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, rotationDeg: 0.6, seed: 9 });
  const { width, height, rgb } = scan.image;
  const raw = () => sharp(Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength), { raw: { width, height, channels: 3 } });
  const direct = readChartImage(scan.image, SMALL);
  const files: [string, Buffer, number][] = [
    ['png', await raw().png().toBuffer(), 0.001],
    ['tiff', await raw().tiff({ compression: 'lzw' }).toBuffer(), 0.001],
    ['jpeg', await raw().jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer(), 0.012],
  ];
  for (const [name, bytes, tolerance] of files) {
    const reading = await readChartScan(bytes, SMALL);
    assert.equal(reading.geometry.marksFound, 8, name);
    film(reading, 'base').points.forEach((p, i) => assert.ok(Math.abs(p.printed - film(direct, 'base').points[i].printed) <= tolerance, `${name} step ${i}: ${p.printed} vs ${film(direct, 'base').points[i].printed}`));
  }
});

test('a grey scan (one channel) is read too', async () => {
  const scan = printed('black-on-white', { settings: SMALL, garment: WHITE_TEE, inks: { base: [20, 20, 22] }, rotationDeg: 0.6, seed: 9 });
  const { width, height, rgb } = scan.image;
  const grey = await sharp(Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength), { raw: { width, height, channels: 3 } }).greyscale().png().toBuffer();
  const reading = await readChartScan(grey, SMALL);
  assert.ok(worstError(reading, 'base', scan.truth.base) < 2);
});

// ---------------------------------------------------------------------------
// The whole calibration, end to end

test('closing the loop: a curve made from a scan of the chart brings printed tints to the tones that were asked for', () => {
  const scan = printed('clean', CLEAN);
  const reading = readChartImage(scan.image, FAST);
  const points = filmPoints(reading, 'base');
  assert.ok(points);
  const curves = buildDotGainCurves(points);
  assert.ok(curves);

  const wanted = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const without = printFlatTints(wanted, FAST, undefined, TYPICAL_PRESS);
  const withCurve = printFlatTints(wanted, FAST, curves.compensate, TYPICAL_PRESS);
  const off = (got: number[]) => Math.max(...got.map((g, i) => Math.abs(g - wanted[i]))) * 100;
  assert.ok(off(without) > 10, `uncompensated, the press is ${off(without).toFixed(1)} points out`);
  assert.ok(off(withCurve) < 3.5, `compensated, ${off(withCurve).toFixed(1)} points out: ${withCurve.map((g) => g.toFixed(3)).join(' ')}`);
  assert.ok(off(withCurve) < off(without) / 3);

  // And the same through the engine's hook, from a saved profile.
  const profile = buildDotGainProfile({ method: 'scan', lpi: FAST.lpi, angleDeg: FAST.angleDeg, mesh: FAST.mesh, points });
  assert.equal(dotGainProblem(profile), null);
  const hook = dotGainFor({ ...DEFAULT_INK_SYSTEM, dotGain: profile });
  const viaHook = printFlatTints(wanted, FAST, hook, TYPICAL_PRESS);
  assert.ok(off(viaHook) < 3.5, `through dotGainFor: ${off(viaHook).toFixed(1)} points out`);
});

test('the three films of one press agree to a couple of points, so one curve serves them all', () => {
  const reading = readChartImage(printed('clean', CLEAN).image, FAST);
  const a = film(reading, 'underbase').points;
  const b = film(reading, 'base').points;
  const c = film(reading, 'highlight').points;
  for (let i = 0; i < a.length; i++) assert.ok(Math.max(a[i].printed, b[i].printed, c[i].printed) - Math.min(a[i].printed, b[i].printed, c[i].printed) < 0.025, `step ${i}`);
});
