// The saved dot-gain measurement: what is accepted, what is refused in which words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDotGainProfile, checkDotGain, dotGainProblem, percentText, summariseDotGain } from './profile';

const parabola = (peak: number) => (c: number) => c + 4 * peak * c * (1 - c);

function good(over: Record<string, unknown> = {}) {
  return {
    measuredAt: '2026-10-15T09:00:00.000Z',
    method: 'manual',
    lpi: 55,
    angleDeg: 22.5,
    mesh: 230,
    points: [0.1, 0.25, 0.5, 0.75, 0.9].map((c) => ({ input: c, printed: parabola(0.18)(c) })),
    ...over,
  };
}

test('a measurement with readings between 0 and 100 % is accepted as it is', () => {
  const raw = good();
  assert.equal(dotGainProblem(raw), null);
  const checked = checkDotGain(raw);
  assert.ok(checked.ok);
  assert.deepEqual(checked.value, raw);
});

test('every way the screen can be described is checked in words', () => {
  assert.match(dotGainProblem(good({ lpi: 5 })) ?? '', /Lines per inch goes from 15 to 150/);
  assert.match(dotGainProblem(good({ lpi: 'fine' })) ?? '', /Lines per inch needs a number/);
  assert.match(dotGainProblem(good({ angleDeg: 270 })) ?? '', /angle goes from 0 to 180/);
  assert.match(dotGainProblem(good({ mesh: 230.5 })) ?? '', /whole number/);
  assert.match(dotGainProblem(good({ mesh: 5 })) ?? '', /mesh goes from 30 to 500/);
  assert.match(dotGainProblem(good({ method: 'guess' })) ?? '', /how the chart was read/);
  assert.match(dotGainProblem(good({ measuredAt: 'yesterday' })) ?? '', /date of the measurement isn’t valid/);
  assert.match(dotGainProblem(good({ measuredAt: '2999-01-01T00:00:00.000Z' })) ?? '', /in the future/);
  assert.match(dotGainProblem({ ...good(), extra: 1 }) ?? '', /./);
  assert.match(dotGainProblem(null) ?? '', /./);
});

test('the readings: enough of them, in order, each one a believable tone', () => {
  assert.match(dotGainProblem(good({ points: [{ input: 0.5, printed: 0.7 }] })) ?? '', /at least 3 readings/);
  assert.match(dotGainProblem(good({ points: [] })) ?? '', /at least 3 readings/);
  assert.match(dotGainProblem(good({ points: Array.from({ length: 50 }, (_, i) => ({ input: i / 50, printed: i / 50 })) })) ?? '', /41 readings or fewer/);
  assert.match(dotGainProblem(good({ points: [{ input: 0.5, printed: 1.2 }, { input: 0.6, printed: 0.7 }, { input: 0.7, printed: 0.8 }] })) ?? '', /goes from 0 to 100/);

  const order = dotGainProblem(good({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.6, printed: 0.8 }, { input: 0.5, printed: 0.7 }] }));
  assert.match(order ?? '', /Film coverages must rise: 50 % comes after 60 %/);
  const repeat = dotGainProblem(good({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.2, printed: 0.3 }, { input: 0.5, printed: 0.7 }] }));
  assert.match(repeat ?? '', /must rise/);

  const far = dotGainProblem(good({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.5, printed: 0.98 }, { input: 0.8, printed: 0.9 }] }));
  assert.match(far ?? '', /98 % measured at 50 % on the film is further than a press moves a tone/);
});

test('a small dip is noise and is accepted; a big one is a typing error and is named', () => {
  const dip = (drop: number) => good({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.3, printed: 0.5 }, { input: 0.4, printed: 0.5 - drop }, { input: 0.6, printed: 0.78 }] });
  assert.equal(dotGainProblem(dip(0.03)), null);
  assert.match(dotGainProblem(dip(0.09)) ?? '', /falls from 50 % at 30 % to 41 % at 40 %/);
});

test('building a measurement drops the ends, sorts, averages repeats and rounds', () => {
  const profile = buildDotGainProfile(
    {
      method: 'scan',
      lpi: 55,
      angleDeg: 22.5,
      mesh: 230,
      points: [
        { input: 1, printed: 1 },
        { input: 0.5, printed: 0.70004 },
        { input: 0, printed: 0.01 },
        { input: 0.25, printed: 0.4 },
        { input: 0.5, printed: 0.7 },
        { input: 0.75, printed: 0.9 },
        { input: Number.NaN, printed: 0.3 },
      ],
    },
    new Date('2026-10-15T12:34:56.000Z'),
  );
  assert.deepEqual(profile, {
    measuredAt: '2026-10-15T12:34:56.000Z',
    method: 'scan',
    lpi: 55,
    angleDeg: 22.5,
    mesh: 230,
    points: [
      { input: 0.25, printed: 0.4 },
      { input: 0.5, printed: 0.7 },
      { input: 0.75, printed: 0.9 },
    ],
  });
  assert.equal(dotGainProblem(profile), null, 'what it builds, it accepts');
  assert.equal(buildDotGainProfile({ method: 'manual', lpi: 55, angleDeg: 0, mesh: 100, points: [], measuredAt: '2026-01-02T00:00:00.000Z' }).measuredAt, '2026-01-02T00:00:00.000Z');
});

test('the numbers a person reads off a measurement', () => {
  const profile = buildDotGainProfile({ method: 'manual', lpi: 55, angleDeg: 22.5, mesh: 230, points: [0.1, 0.25, 0.5, 0.75, 0.9].map((c) => ({ input: c, printed: parabola(0.2)(c) })) });
  const summary = summariseDotGain(profile);
  assert.ok(summary);
  assert.ok(Math.abs(summary.printedAt50 - 0.7) < 1e-9);
  assert.ok(Math.abs(summary.gainAt50 - 0.2) < 1e-9);
  assert.ok(summary.filmFor50 < 0.35 && summary.filmFor50 > 0.3);
  assert.ok(Math.abs(summary.peak.at - 0.5) <= 0.1);
  assert.equal(summariseDotGain({ points: [] }), null);
});

test('percent text', () => {
  assert.equal(percentText(0.456), '45.6');
  assert.equal(percentText(0.5), '50');
  assert.equal(percentText(0.05), '5');
});
