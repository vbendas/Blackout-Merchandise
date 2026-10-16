// Murray-Davies: dot area from reflectance, density, lightness and colour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coverageFromReadings,
  dotAreaFromColour,
  dotAreaFromDensity,
  dotAreaFromLightness,
  dotAreaFromReflectance,
  lightnessOfLuminance,
  linearToSrgb,
  luminance,
  luminanceOfLightness,
  srgbToLinear,
} from './murray-davies';

const near = (a: number | null, b: number, tol = 1e-9) => assert.ok(a !== null && Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('reflectance: the paper reads 0, the solid 1, and a tint in between by its share of the light', () => {
  near(dotAreaFromReflectance(0.8, 0.05, 0.8), 0);
  near(dotAreaFromReflectance(0.8, 0.05, 0.05), 1);
  near(dotAreaFromReflectance(0.8, 0.05, 0.425), 0.5);
  near(dotAreaFromReflectance(0.8, 0.05, 0.5), 0.4);
});

test('a white ink on a dark garment reads the same way: the sign takes care of itself', () => {
  near(dotAreaFromReflectance(0.02, 0.8, 0.02), 0);
  near(dotAreaFromReflectance(0.02, 0.8, 0.8), 1);
  near(dotAreaFromReflectance(0.02, 0.8, 0.41), 0.5);
});

test('no contrast between paper and solid is no answer, not a division by zero', () => {
  assert.equal(dotAreaFromReflectance(0.5, 0.5, 0.4), null);
  assert.equal(dotAreaFromReflectance(Number.NaN, 0.5, 0.4), null);
  assert.equal(dotAreaFromDensity(0.1, 0.1, 0.5), null);
  assert.equal(dotAreaFromColour([0.4, 0.4, 0.4], [0.4, 0.4, 0.4], [0.2, 0.2, 0.2]), null);
});

test('density is the same law written with logarithms', () => {
  // A paper at R = 0.8, a solid at 0.05 and a tint at 0.425 (50%), read as densities.
  const D = (r: number) => -Math.log10(r);
  near(dotAreaFromDensity(D(0.8), D(0.05), D(0.425)), 0.5, 1e-12);
  near(dotAreaFromDensity(D(0.8), D(0.05), D(0.5)), 0.4, 1e-12);
  // paper-relative densities (the paper is 0) give the same answer
  near(dotAreaFromDensity(0, D(0.05) - D(0.8), D(0.425) - D(0.8)), 0.5, 1e-12);
  // and a white ink brighter than the garment (negative density step)
  near(dotAreaFromDensity(D(0.02), D(0.8), D(0.41)), 0.5, 1e-12);
});

test('lightness goes through luminance, and L* round-trips', () => {
  for (const L of [0, 5, 8, 8.5, 20, 50, 75, 100]) near(lightnessOfLuminance(luminanceOfLightness(L)), L, 1e-9);
  near(luminanceOfLightness(100), 1, 1e-12);
  near(luminanceOfLightness(50), 0.184187, 1e-5);
  const Y = (L: number) => luminanceOfLightness(L);
  // half-way between L* 90 and L* 20 in light is not half-way in L*
  const mid = lightnessOfLuminance((Y(90) + Y(20)) / 2);
  near(dotAreaFromLightness(90, 20, mid), 0.5, 1e-9);
  assert.ok(mid > 55 && mid < 70, `${mid}`);
});

test('sRGB codes convert to linear light and back', () => {
  near(srgbToLinear(0), 0);
  near(srgbToLinear(255), 1);
  near(srgbToLinear(128), 0.21586, 1e-5);
  for (const code of [0, 3, 10, 50, 128, 200, 255]) near(linearToSrgb(srgbToLinear(code)), code, 1e-9);
  near(luminance([1, 1, 1]), 1, 1e-12);
});

test('colour: for grey it is the luminance formula, for a coloured ink it follows the channels that move', () => {
  near(dotAreaFromColour([0.8, 0.8, 0.8], [0.05, 0.05, 0.05], [0.425, 0.425, 0.425]), 0.5);
  // Yellow on white: only blue moves. Luminance would barely register it; the projection reads it fully.
  const paper: [number, number, number] = [0.85, 0.85, 0.85];
  const solid: [number, number, number] = [0.85, 0.8, 0.05];
  const half: [number, number, number] = [0.85, 0.825, 0.45];
  near(dotAreaFromColour(paper, solid, half), 0.5, 1e-3);
  near(dotAreaFromColour(paper, solid, paper), 0);
  near(dotAreaFromColour(paper, solid, solid), 1);
});

test('typed readings: dot area is taken as it is, in percent, and blanks stay blank', () => {
  assert.deepEqual(coverageFromReadings('dot_area', null, null, [10, null, 55.5, Number.NaN]), [0.1, null, 0.555, null]);
});

test('typed readings: reflectance, density and L* need the garment and the solid, and use them', () => {
  const refl = coverageFromReadings('reflectance', 80, 5, [80, 42.5, 5, null]);
  assert.ok(refl);
  near(refl[0], 0);
  near(refl[1], 0.5);
  near(refl[2], 1);
  assert.equal(refl[3], null);

  const D = (r: number) => -Math.log10(r);
  const dens = coverageFromReadings('density', D(0.8), D(0.05), [D(0.425)]);
  assert.ok(dens);
  near(dens[0], 0.5, 1e-12);

  const lstar = coverageFromReadings('lightness', 90, 20, [lightnessOfLuminance((luminanceOfLightness(90) + luminanceOfLightness(20)) / 2)]);
  assert.ok(lstar);
  near(lstar[0], 0.5, 1e-9);
});

test('typed readings: a missing or useless garment/solid pair is one refusal, not a wrong curve', () => {
  assert.equal(coverageFromReadings('density', null, 1.2, [0.4]), null);
  assert.equal(coverageFromReadings('density', 0.1, null, [0.4]), null);
  assert.equal(coverageFromReadings('lightness', 60, 60, [50]), null);
  assert.equal(coverageFromReadings('reflectance', 50, 50, [40]), null);
  assert.equal(coverageFromReadings('reflectance', -1, 50, [40]), null);
});
