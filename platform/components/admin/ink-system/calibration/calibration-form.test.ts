// The calibration page's pure side: typed readings and scan points into the points of a curve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FilmReading, ScanReading } from '@/lib/print/calibration/scan';
import type { InkKind } from '@/lib/print/calibration/chart-layout';
import { ENTRY_STEPS, disagreementNote, emptyEntries, filmNames, filmsWithWedge, parseTyped, percentText, pointsFromEntries, pointsFromScan, readableFilms } from './calibration-form';

const parabola = (peak: number) => (c: number) => c + 4 * peak * c * (1 - c);

test('typed text: a number, a comma for a decimal point, a percent sign ignored, blank is nothing, the rest is not a number', () => {
  assert.equal(parseTyped('45'), 45);
  assert.equal(parseTyped(' 45.5 '), 45.5);
  assert.equal(parseTyped('45,5'), 45.5);
  assert.equal(parseTyped('45 %'), 45);
  assert.equal(parseTyped('-2'), -2);
  assert.equal(parseTyped('.5'), 0.5);
  assert.equal(parseTyped(''), null);
  assert.equal(parseTyped('   '), null);
  assert.ok(Number.isNaN(parseTyped('abc') as number));
  assert.ok(Number.isNaN(parseTyped('4 5') as number));
  assert.ok(Number.isNaN(parseTyped('1e3') as number));
  assert.ok(Number.isNaN(parseTyped('--3') as number));
});

test('the steps staff type run from 5 to 95', () => {
  assert.equal(ENTRY_STEPS.length, 19);
  assert.equal(ENTRY_STEPS[0], 5);
  assert.equal(ENTRY_STEPS[18], 95);
});

test('dot areas typed in percent become points; blank boxes are skipped', () => {
  const entries = { ...emptyEntries(), values: { '10': '14', '25': '36,5', '50': '68', '75': '88', '90': '' } };
  const got = pointsFromEntries(entries);
  assert.deepEqual(got.problems, []);
  assert.equal(got.filled, 4);
  assert.deepEqual(got.points, [
    { input: 0.1, printed: 0.14 },
    { input: 0.25, printed: 0.365 },
    { input: 0.5, printed: 0.68 },
    { input: 0.75, printed: 0.88 },
  ]);
});

test('a box that is not a number is named, and nothing is used until it is fixed', () => {
  const got = pointsFromEntries({ ...emptyEntries(), values: { '10': '14', '45': 'sixty', '50': '68' } });
  assert.deepEqual(got.problems, ['The 45% box doesn’t hold a number.']);
  assert.deepEqual(got.points, []);
});

test('a dot area far outside 0 to 100 is a slip, and says which box', () => {
  const got = pointsFromEntries({ ...emptyEntries(), values: { '10': '14', '50': '680' } });
  assert.match(got.problems[0], /The 50% box reads 680% of the way to the solid, which is outside 0 to 100/);
  assert.deepEqual(got.points, []);
});

test('densities, L* and reflectances are measured against the garment and the solid typed with them', () => {
  const D = (r: number) => -Math.log10(r);
  const dens = pointsFromEntries({ unit: 'density', garment: String(D(0.8)), solid: String(D(0.05)), values: { '50': String(D(0.425)), '25': String(D(0.8 - 0.75 * 0.25)) } });
  assert.deepEqual(dens.problems, []);
  assert.equal(dens.points.length, 2);
  assert.ok(Math.abs(dens.points.find((p) => p.input === 0.5)!.printed - 0.5) < 1e-9);
  assert.ok(Math.abs(dens.points.find((p) => p.input === 0.25)!.printed - 0.25) < 1e-9);

  const refl = pointsFromEntries({ unit: 'reflectance', garment: '80', solid: '5', values: { '50': '42.5' } });
  assert.ok(Math.abs(refl.points[0].printed - 0.5) < 1e-9);
});

test('without the garment and the solid, readings in density can’t be used', () => {
  const none = pointsFromEntries({ unit: 'density', garment: '', solid: '1.2', values: { '50': '0.4' } });
  assert.match(none.problems[0], /bare garment and of the solid first/);
  assert.deepEqual(none.points, []);
  const same = pointsFromEntries({ unit: 'lightness', garment: '60', solid: '60', values: { '50': '50' } });
  assert.match(same.problems[0], /read the same/);
});

function film(kind: InkKind, status: FilmReading['status'], gain: (c: number) => number): FilmReading {
  const points = status === 'not_printed' ? [] : Array.from({ length: 21 }, (_, i) => ({ input: i / 20, printed: gain(i / 20), spread: 0.01 }));
  return { kind, status, contrast: 40, shading: 0, points };
}
function reading(films: FilmReading[]): ScanReading {
  return { lpi: 55, angleDeg: 22.5, geometry: { dpi: 600, rotationDeg: 0, checkErrorMm: 0.1, marksFound: 8, widthPx: 1, heightPx: 1 }, films, warnings: [], confidence: 'good' };
}

test('a scan: the films that read are offered, and the chosen ones are averaged step by step', () => {
  const r = reading([film('underbase', 'ok', parabola(0.16)), film('base', 'ok', parabola(0.2)), film('highlight', 'not_printed', (c) => c)]);
  assert.deepEqual(readableFilms(r), ['underbase', 'base']);
  assert.deepEqual(filmsWithWedge(r), ['underbase', 'base']);

  const both = pointsFromScan(r, ['underbase', 'base']);
  assert.equal(both.points.length, 21);
  assert.ok(Math.abs(both.points[10].printed - (parabola(0.16)(0.5) + parabola(0.2)(0.5)) / 2) < 1e-12);
  assert.ok(both.disagreement && Math.abs(both.disagreement.gap - 0.04) < 1e-9 && both.disagreement.step === 50);
  assert.equal(disagreementNote(both, ['underbase', 'base']), null, '4 points apart is within what one curve covers');

  const one = pointsFromScan(r, ['base']);
  assert.ok(Math.abs(one.points[10].printed - 0.7) < 1e-12);
  assert.equal(one.disagreement, null);

  assert.deepEqual(pointsFromScan(r, ['highlight']).points, []);
  assert.deepEqual(pointsFromScan(r, []).points, []);
});

test('films that disagree by more than 5 points are said to', () => {
  const r = reading([film('underbase', 'ok', parabola(0.08)), film('base', 'ok', parabola(0.22)), film('highlight', 'not_printed', (c) => c)]);
  const both = pointsFromScan(r, ['underbase', 'base']);
  const note = disagreementNote(both, ['underbase', 'base']);
  assert.match(note ?? '', /The underbase white and colour base differ by up to 14 points \(at 50%\)/);
});

test('names and percents', () => {
  assert.equal(filmNames(['underbase']), 'Underbase white');
  assert.equal(filmNames(['underbase', 'base']), 'Underbase white and colour base');
  assert.equal(filmNames(['underbase', 'base', 'highlight']), 'Underbase white, colour base and highlight white');
  assert.equal(filmNames([]), 'no film');
  assert.equal(percentText(0.456), '45.6');
});
