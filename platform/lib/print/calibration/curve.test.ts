// The dot-gain curve: cleaning, the monotone spline, the inverse and the engine hook.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE } from '@/lib/print/defaults';
import { LINEAR_DOT_GAIN, makeTransfer, transfer } from '@/lib/print/engine/halftone';
import { mulberry32 } from '@/lib/print/engine/rng';
import type { DotGainProfile, InkSystemProfile } from '@/lib/print/types';
import {
  buildDotGainCurves,
  cleanPoints,
  compensationFor,
  curvesFromCleaned,
  dotGainFor,
  gainPointsAt,
  isNearLinear,
  monotoneSpline,
  pchipSlopes,
  printedCoverageFor,
  printedToneFor,
  sampleCurve,
} from './curve';

/** A press that adds up to `peak` of coverage at 50% and nothing at the ends (a parabola, typical of screen print). */
const parabola = (peak: number) => (c: number) => c + 4 * peak * c * (1 - c);

function chart(f: (c: number) => number, steps = 21): { input: number; printed: number }[] {
  const out: { input: number; printed: number }[] = [];
  for (let i = 0; i < steps; i++) out.push({ input: i / (steps - 1), printed: f(i / (steps - 1)) });
  return out;
}

function profileOf(points: { input: number; printed: number }[], over: Partial<DotGainProfile> = {}): DotGainProfile {
  return { measuredAt: '2026-10-15T09:00:00.000Z', method: 'manual', lpi: 55, angleDeg: 22.5, mesh: 230, points, ...over };
}

function withDotGain(dotGain?: DotGainProfile): InkSystemProfile {
  return { ...DEFAULT_INK_SYSTEM, ...(dotGain ? { dotGain } : {}) };
}

// ---------------------------------------------------------------------------
// Cleaning

test('cleaning sorts, clamps, averages repeats and pins the two ends', () => {
  const { points, moved } = cleanPoints([
    { input: 0.5, printed: 0.7 },
    { input: 0.25, printed: 0.4 },
    { input: 0.5, printed: 0.74 }, // typed twice
    { input: 0, printed: 0.02 }, // an end: noise
    { input: 1, printed: 0.97 }, // an end: noise
    { input: 0.75, printed: 1.2 }, // past 100%
    { input: Number.NaN, printed: 0.3 },
    { input: 0.9, printed: Number.POSITIVE_INFINITY },
  ]);
  assert.deepEqual(
    points.map((p) => p.input),
    [0, 0.25, 0.5, 0.75, 1],
  );
  assert.equal(points[0].printed, 0);
  assert.equal(points[points.length - 1].printed, 1);
  assert.ok(Math.abs(points[2].printed - 0.72) < 1e-9, 'repeats become their average');
  assert.equal(points[3].printed, 1, 'clamped to 100%');
  assert.equal(moved.count, 0, 'these already rise');
});

test('readings that fall are replaced by the closest rising ones, and the page can say how far it moved them', () => {
  const { points, moved } = cleanPoints([
    { input: 0.2, printed: 0.3 },
    { input: 0.3, printed: 0.5 },
    { input: 0.4, printed: 0.46 }, // a dip: noise
    { input: 0.5, printed: 0.7 },
  ]);
  const printed = points.map((p) => p.printed);
  for (let i = 1; i < printed.length; i++) assert.ok(printed[i] >= printed[i - 1], `${printed[i - 1]} then ${printed[i]}`);
  // The two readings that disagreed meet in the middle (pool-adjacent-violators): 0.48 each.
  assert.ok(Math.abs(points[2].printed - 0.48) < 1e-9);
  assert.ok(Math.abs(points[3].printed - 0.48) < 1e-9);
  assert.equal(moved.count, 2);
  assert.ok(Math.abs(moved.max - 0.02) < 1e-9);
});

test('a calibration row that was damaged (points that are not a list) is no points, not an error', () => {
  for (const damaged of [undefined, null, 'nope', 7, {}]) {
    const cleaned = cleanPoints(damaged as unknown as { input: number; printed: number }[]);
    assert.deepEqual(cleaned.points, [{ input: 0, printed: 0 }, { input: 1, printed: 1 }]);
    assert.equal(buildDotGainCurves(damaged as unknown as { input: number; printed: number }[]), null);
  }
});

test('nothing usable between the ends gives no curve', () => {
  assert.equal(buildDotGainCurves([]), null);
  assert.equal(buildDotGainCurves([{ input: 0, printed: 0 }, { input: 1, printed: 1 }]), null);
  assert.equal(buildDotGainCurves([{ input: Number.NaN, printed: 0.5 }]), null);
});

// ---------------------------------------------------------------------------
// The monotone spline

test('PCHIP slopes: a straight line gives its own slope, a flat side gives zero, ends keep the shape', () => {
  assert.deepEqual(pchipSlopes([0, 0.5, 1], [0, 0.5, 1]).map((m) => Math.round(m * 1e9) / 1e9), [1, 1, 1]);
  const flat = pchipSlopes([0, 0.2, 0.4, 0.6, 1], [0, 0, 0, 0.3, 1]);
  assert.equal(flat[1], 0);
  assert.equal(flat[0], 0);
  assert.ok(flat[3] > 0 && flat[4] > 0);
  assert.deepEqual(pchipSlopes([0, 1], [0, 1]), [1, 1]);
});

test('hand-worked example: three readings, one value between them', () => {
  // Points (0,0), (0.5,0.7), (1,1). Secants 1.4 and 0.6. Slopes: ends 1.8 and 0.2,
  // middle 3 / (1.5/1.4 + 1.5/0.6) = 0.84. At x = 0.25 (t = 0.5) the cubic is
  // 0.125 * 0.5 * 1.8 + 0.5 * 0.7 - 0.125 * 0.5 * 0.84 = 0.41.
  const m = pchipSlopes([0, 0.5, 1], [0, 0.7, 1]);
  assert.ok(Math.abs(m[0] - 1.8) < 1e-12);
  assert.ok(Math.abs(m[1] - 0.84) < 1e-12);
  assert.ok(Math.abs(m[2] - 0.2) < 1e-12);
  const curves = curvesFromCleaned([
    { input: 0, printed: 0 },
    { input: 0.5, printed: 0.7 },
    { input: 1, printed: 1 },
  ]);
  assert.ok(Math.abs(curves.gain(0.25) - 0.41) < 1e-12, `${curves.gain(0.25)}`);
});

test('the spline passes through every point and never leaves the band between neighbours', () => {
  const rng = mulberry32(7);
  for (let round = 0; round < 40; round++) {
    const n = 4 + Math.floor(rng() * 10);
    const xs = [0];
    const ys = [0];
    for (let i = 1; i < n; i++) {
      xs.push(xs[i - 1] + 0.02 + rng());
      // flat stretches too: ys often repeat
      ys.push(ys[i - 1] + (rng() < 0.25 ? 0 : rng()));
    }
    const sx = xs.map((x) => x / xs[n - 1]);
    const sy = ys.map((y) => (ys[n - 1] > 0 ? y / ys[n - 1] : y));
    const f = monotoneSpline(sx, sy);
    sx.forEach((x, i) => assert.ok(Math.abs(f(x) - sy[i]) < 1e-12, `round ${round} knot ${i}`));
    let prev = f(0);
    for (let i = 1; i <= 1000; i++) {
      const x = i / 1000;
      const y = f(x);
      assert.ok(y >= prev - 1e-12, `round ${round}: ${prev} then ${y} at ${x}`);
      prev = y;
      let k = 0;
      while (k + 2 < sx.length && sx[k + 1] <= x) k++;
      assert.ok(y >= sy[k] - 1e-12 && y <= sy[k + 1] + 1e-12, `round ${round}: ${y} escapes [${sy[k]}, ${sy[k + 1]}] at ${x}`);
    }
  }
});

// ---------------------------------------------------------------------------
// The compensation

test('a press with no gain gives the identity, to the last digit that matters', () => {
  const curves = buildDotGainCurves(chart((c) => c));
  assert.ok(curves);
  for (let i = 0; i <= 200; i++) {
    const c = i / 200;
    assert.ok(Math.abs(curves.compensate(c) - c) < 1e-9, `compensate(${c}) = ${curves.compensate(c)}`);
    assert.ok(Math.abs(curves.gain(c) - c) < 1e-9);
  }
  assert.equal(isNearLinear(chart((c) => c)), true);
  assert.equal(isNearLinear(chart(parabola(0.15))), false);
});

test('0 and 1 stay fixed whatever was measured, and the curve never leaves 0..1', () => {
  for (const f of [parabola(0.2), parabola(-0.1), (c: number) => Math.min(1, c * 1.3), (c: number) => c * 0.8]) {
    const curves = buildDotGainCurves(chart(f));
    assert.ok(curves);
    assert.equal(curves.compensate(0), 0);
    assert.equal(curves.compensate(1), 1);
    assert.equal(curves.gain(0), 0);
    assert.equal(curves.gain(1), 1);
    assert.equal(curves.compensate(-0.3), 0);
    assert.equal(curves.compensate(1.7), 1);
    assert.equal(curves.compensate(Number.NaN), 0);
    for (let i = 0; i <= 400; i++) {
      const y = curves.compensate(i / 400);
      assert.ok(y >= 0 && y <= 1, `${y}`);
    }
  }
});

test('the compensation is monotone, for a typical press, a noisy one and random rising data', () => {
  const rng = mulberry32(21);
  const noisy = chart(parabola(0.18)).map((p) => ({ ...p, printed: p.printed + (rng() - 0.5) * 0.03 }));
  const sets = [chart(parabola(0.18)), noisy, chart(parabola(-0.12))];
  for (let round = 0; round < 30; round++) {
    const n = 5 + Math.floor(rng() * 20);
    const pts: { input: number; printed: number }[] = [];
    for (let i = 0; i < n; i++) pts.push({ input: rng(), printed: rng() });
    sets.push(pts);
  }
  for (const points of sets) {
    const curves = buildDotGainCurves(points);
    if (!curves) continue;
    let prev = curves.compensate(0);
    for (let i = 1; i <= 2000; i++) {
      const y = curves.compensate(i / 2000);
      assert.ok(y >= prev - 1e-12, `${prev} then ${y} at ${i / 2000}`);
      prev = y;
    }
  }
});

test('round trip: what the press does to the compensated film is the tone that was wanted', () => {
  for (const peak of [0.08, 0.15, 0.22]) {
    const press = parabola(peak);
    const curves = buildDotGainCurves(chart(press, 21));
    assert.ok(curves);
    for (let i = 0; i <= 100; i++) {
      const wanted = i / 100;
      const film = curves.compensate(wanted);
      // The spline between 5% steps follows the parabola to a fraction of a point.
      assert.ok(Math.abs(press(film) - wanted) < 0.004, `peak ${peak}: wanted ${wanted}, film ${film}, prints ${press(film)}`);
      assert.ok(Math.abs(curves.gain(film) - wanted) < 1e-9, 'the spline itself round-trips exactly');
    }
    for (let i = 0; i <= 100; i++) {
      const film = i / 100;
      assert.ok(Math.abs(curves.compensate(curves.gain(film)) - film) < 1e-9, `film ${film}`);
    }
  }
});

test('dot gain asks for less on the film, dot loss for more', () => {
  const gain = buildDotGainCurves(chart(parabola(0.2)));
  const loss = buildDotGainCurves(chart(parabola(-0.1)));
  assert.ok(gain && loss);
  assert.ok(gain.compensate(0.5) < 0.5 - 0.1);
  assert.ok(loss.compensate(0.5) > 0.5 + 0.04);
  assert.ok(Math.abs(gainPointsAt(gain, 0.5) - 0.2) < 1e-9);
  assert.ok(Math.abs(gainPointsAt(loss, 0.5) + 0.1) < 1e-9);
  assert.equal(gainPointsAt(gain, 0), 0);
  assert.equal(gainPointsAt(gain, 1), 0);
});

test('where dots below the mesh limit do not print, the inverse jumps over the flat start and the flat end', () => {
  // Nothing prints below 8%; everything past 94% is solid.
  const points = [
    { input: 0.05, printed: 0 },
    { input: 0.1, printed: 0.04 },
    { input: 0.25, printed: 0.3 },
    { input: 0.5, printed: 0.68 },
    { input: 0.75, printed: 0.9 },
    { input: 0.9, printed: 0.99 },
    { input: 0.95, printed: 1 },
  ];
  const curves = buildDotGainCurves(points);
  assert.ok(curves);
  assert.equal(curves.compensate(0), 0, 'zero stays zero');
  assert.ok(curves.compensate(0.001) >= 0.05 - 1e-9, `a tiny wanted tone needs at least the smallest dot that prints: ${curves.compensate(0.001)}`);
  assert.ok(curves.compensate(0.999) <= 0.95 + 1e-9);
  assert.equal(curves.compensate(1), 1, 'solid stays solid');
  assert.ok(curves.compensate(0.995) < 0.95 + 1e-9);
  // monotone across both jumps
  let prev = 0;
  for (let i = 0; i <= 1000; i++) {
    const y = curves.compensate(i / 1000);
    assert.ok(y >= prev - 1e-12);
    prev = y;
  }
});

test('a tone that is exactly a flat stretch’s level comes back at the start of the stretch, and just above it jumps over', () => {
  // The press holds 50% from 40 to 60% on the film (a dip the readings made flat): the smallest film coverage that prints 50% is 40%.
  const curves = buildDotGainCurves([
    { input: 0.2, printed: 0.3 },
    { input: 0.4, printed: 0.5 },
    { input: 0.5, printed: 0.5 },
    { input: 0.6, printed: 0.5 },
    { input: 0.8, printed: 0.8 },
  ]);
  assert.ok(curves);
  assert.ok(Math.abs(curves.compensate(0.5) - 0.4) < 1e-6, `${curves.compensate(0.5)}`);
  assert.ok(Math.abs(curves.compensate(0.5 - 1e-15) - 0.4) < 1e-6, 'rounding on either side of the level does not move it');
  assert.ok(Math.abs(curves.compensate(0.5 + 1e-15) - 0.4) < 1e-6);
  assert.ok(curves.compensate(0.5001) >= 0.6, `${curves.compensate(0.5001)}`);
  let prev = 0;
  for (let i = 0; i <= 1000; i++) {
    const y = curves.compensate(i / 1000);
    assert.ok(y >= prev - 1e-12);
    prev = y;
  }
});

test('sampleCurve gives n + 1 points from 0 to 1', () => {
  const pts = sampleCurve((x) => x * x, 10);
  assert.equal(pts.length, 11);
  assert.deepEqual(pts[0], { x: 0, y: 0 });
  assert.deepEqual(pts[10], { x: 1, y: 1 });
});

// ---------------------------------------------------------------------------
// The engine hook

test('without a profile, dotGainFor is the engine’s own linear curve', () => {
  assert.equal(dotGainFor(withDotGain()), LINEAR_DOT_GAIN);
  assert.equal(dotGainFor(DEFAULT_INK_SYSTEM), LINEAR_DOT_GAIN);
  assert.equal(compensationFor(undefined), null);
  assert.equal(printedCoverageFor(undefined), null);
});

test('a profile the readings cannot support is linear too: the engine never fails a job over a calibration', () => {
  assert.equal(dotGainFor(withDotGain(profileOf([]))), LINEAR_DOT_GAIN);
  assert.equal(dotGainFor(withDotGain(profileOf([{ input: 0, printed: 0 }, { input: 1, printed: 1 }]))), LINEAR_DOT_GAIN);
  const broken = profileOf([]);
  (broken as unknown as { points: unknown }).points = 'nope';
  assert.equal(dotGainFor(withDotGain(broken)), LINEAR_DOT_GAIN);
});

test('a profile on the diagonal is the identity', () => {
  const fn = dotGainFor(withDotGain(profileOf(chart((c) => c))));
  for (let i = 0; i <= 100; i++) assert.ok(Math.abs(fn(i / 100) - i / 100) < 1e-9);
});

test('a measured profile compensates, and plugs into the engine’s transfer table', () => {
  const press = parabola(0.18);
  const profile = profileOf(chart(press));
  const fn = dotGainFor(withDotGain(profile));
  assert.ok(fn(0.5) < 0.4);
  assert.equal(fn(0), 0);
  assert.equal(fn(1), 1);

  const spec = { ...DEFAULT_RECIPE.halftone, minDot: 0, maxDot: 1 };
  const lut = makeTransfer(spec, fn);
  const linear = makeTransfer(spec);
  let prev = 0;
  for (let i = 0; i <= 200; i++) {
    const wanted = i / 200;
    const imaged = transfer(lut, wanted);
    assert.ok(imaged >= prev - 1e-6, `monotone at ${wanted}`);
    prev = imaged;
    // The film carries less than the linear film in the mid tones, and the press brings it back to what was wanted.
    assert.ok(imaged <= transfer(linear, wanted) + 1e-6);
    assert.ok(Math.abs(press(imaged) - wanted) < 0.006, `wanted ${wanted}: film ${imaged}, prints ${press(imaged)}`);
  }
});

// ---------------------------------------------------------------------------
// What the press does: the forward curve, for proofs

test('without a calibration, the printed tone of a film is the film’s own coverage', () => {
  assert.equal(printedToneFor(withDotGain()), LINEAR_DOT_GAIN);
  assert.equal(printedToneFor(DEFAULT_INK_SYSTEM), LINEAR_DOT_GAIN);
  // a calibration the readings can't support is linear too, as it is for the compensation
  assert.equal(printedToneFor(withDotGain(profileOf([]))), LINEAR_DOT_GAIN);
  assert.equal(printedToneFor(withDotGain(profileOf([{ input: 0, printed: 0 }, { input: 1, printed: 1 }]))), LINEAR_DOT_GAIN);
  const broken = profileOf([]);
  (broken as unknown as { points: unknown }).points = null;
  assert.equal(printedToneFor(withDotGain(broken)), LINEAR_DOT_GAIN);
});

test('the printed tone passes through every measured point', () => {
  const points = [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9].map((c) => ({ input: c, printed: parabola(0.17)(c) }));
  const tone = printedToneFor(withDotGain(profileOf(points)));
  for (const p of points) assert.ok(Math.abs(tone(p.input) - p.printed) < 1e-12, `${p.input}`);
  // and between them it follows the press
  assert.ok(Math.abs(tone(0.5) - 0.67) < 1e-12);
  assert.ok(Math.abs(tone(0.33) - parabola(0.17)(0.33)) < 0.005);
});

test('the printed tone is monotone, fixed at 0 and 1, and clamped, for a clean press, a noisy one and a lossy one', () => {
  const rng = mulberry32(5);
  const noisy = chart(parabola(0.15)).map((p) => ({ ...p, printed: p.printed + (rng() - 0.5) * 0.04 }));
  for (const points of [chart(parabola(0.2)), noisy, chart(parabola(-0.1)), chart((c) => Math.min(1, c * 1.25))]) {
    const tone = printedToneFor(withDotGain(profileOf(points)));
    assert.equal(tone(0), 0);
    assert.equal(tone(1), 1);
    assert.equal(tone(-0.5), 0);
    assert.equal(tone(1.5), 1);
    assert.equal(tone(Number.NaN), 0);
    let prev = 0;
    for (let i = 1; i <= 2000; i++) {
      const y = tone(i / 2000);
      assert.ok(y >= prev - 1e-12 && y >= 0 && y <= 1, `${prev} then ${y} at ${i / 2000}`);
      prev = y;
    }
  }
});

test('compensation followed by the printed tone is the identity: what the engine asks for is what the proof shows', () => {
  const plateaus = [
    { input: 0.05, printed: 0 },
    { input: 0.1, printed: 0.04 },
    { input: 0.25, printed: 0.3 },
    { input: 0.5, printed: 0.68 },
    { input: 0.75, printed: 0.9 },
    { input: 0.9, printed: 0.99 },
    { input: 0.95, printed: 1 },
  ];
  const rng = mulberry32(11);
  const noisy = chart(parabola(0.18)).map((p) => ({ ...p, printed: p.printed + (rng() - 0.5) * 0.03 }));
  const random: { input: number; printed: number }[] = Array.from({ length: 14 }, () => ({ input: rng(), printed: rng() }));
  for (const points of [chart(parabola(0.08)), chart(parabola(0.22)), chart(parabola(-0.12)), chart((c) => c), plateaus, noisy, random]) {
    const inks = withDotGain(profileOf(points));
    const compensate = dotGainFor(inks);
    const tone = printedToneFor(inks);
    for (let i = 0; i <= 1000; i++) {
      const wanted = i / 1000;
      assert.ok(Math.abs(tone(compensate(wanted)) - wanted) < 1e-9, `wanted ${wanted}: film ${compensate(wanted)}, prints ${tone(compensate(wanted))}`);
    }
    // The other way round, a flat stretch of the press can't be told apart, so what comes back is the film coverage where the
    // stretch begins, never more than the film had. The one exception is a film that has gone solid: solid is wanted as
    // solid (1 is fixed), so the flat tail comes back as 1.
    for (let i = 0; i <= 1000; i++) {
      const film = i / 1000;
      if (tone(film) >= 1 - 1e-12) continue;
      assert.ok(compensate(tone(film)) <= film + 1e-9, `film ${film}`);
    }
  }
});

test('a clean press round-trips both ways, and the linear identity is the identity', () => {
  const inks = withDotGain(profileOf(chart(parabola(0.18))));
  const compensate = dotGainFor(inks);
  const tone = printedToneFor(inks);
  for (let i = 0; i <= 200; i++) {
    const c = i / 200;
    assert.ok(Math.abs(compensate(tone(c)) - c) < 1e-9, `film ${c}`);
  }
  const straight = withDotGain(profileOf(chart((c) => c)));
  for (let i = 0; i <= 100; i++) assert.ok(Math.abs(printedToneFor(straight)(i / 100) - i / 100) < 1e-9);
});

test('the printed tone shows gain: a 50% film prints heavier than 50%, a lossy press lighter', () => {
  assert.ok(printedToneFor(withDotGain(profileOf(chart(parabola(0.2)))))(0.5) > 0.65);
  assert.ok(printedToneFor(withDotGain(profileOf(chart(parabola(-0.1)))))(0.5) < 0.45);
});

test('the same profile object is fitted once', () => {
  const profile = profileOf(chart(parabola(0.15)));
  assert.equal(compensationFor(profile), compensationFor(profile));
  assert.equal(printedCoverageFor(profile), printedCoverageFor(profile));
  // the two directions come from the one fit
  const inks = withDotGain(profile);
  assert.equal(printedToneFor(inks), printedCoverageFor(profile));
  assert.equal(dotGainFor(inks), compensationFor(profile));
});
