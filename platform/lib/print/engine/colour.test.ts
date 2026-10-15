import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SRGB8_TO_LINEAR,
  deltaE2000,
  hexToLab,
  hexToRgb8,
  labToLinear,
  linearToLab,
  linearToOklab,
  linearToSrgb8,
  linearToXyzD65,
  oklabToLinear,
  rgb8ToHex,
  rgb8ToLab,
  xyzD65ToOklab,
  type Vec3,
} from './colour';
import { mulberry32 } from './rng';

function close(actual: number, expected: number, tol: number, what: string): void {
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} vs ${expected} (tol ${tol})`);
}

test('sRGB 8-bit round-trips through linear light', () => {
  for (let i = 0; i < 256; i++) assert.equal(linearToSrgb8(SRGB8_TO_LINEAR[i]), i);
});

test('OKLab matches Ottosson’s reference table (XYZ D65 input)', () => {
  const table: [Vec3, Vec3][] = [
    [[0.95, 1, 1.089], [1, 0, 0]],
    [[1, 0, 0], [0.45, 1.236, -0.019]],
    [[0, 1, 0], [0.922, -0.671, 0.263]],
    [[0, 0, 1], [0.153, -1.415, -0.449]],
  ];
  for (const [xyz, ok] of table) {
    const got = xyzD65ToOklab(...xyz);
    for (let c = 0; c < 3; c++) close(got[c], ok[c], 0.001, `OKLab of XYZ ${xyz}`);
  }
});

test('the sRGB path to OKLab agrees with the XYZ path and inverts', () => {
  const rand = mulberry32(7);
  const q: Vec3 = [0, 0, 0];
  const back: Vec3 = [0, 0, 0];
  for (let k = 0; k < 500; k++) {
    const lin: Vec3 = [rand(), rand(), rand()];
    linearToOklab(lin[0], lin[1], lin[2], q);
    const viaXyz = xyzD65ToOklab(...linearToXyzD65(lin[0], lin[1], lin[2]));
    for (let c = 0; c < 3; c++) close(q[c], viaXyz[c], 2e-3, 'OKLab via XYZ');
    oklabToLinear(q[0], q[1], q[2], back);
    for (let c = 0; c < 3; c++) close(back[c], lin[c], 1e-6, 'OKLab inverse');
  }
  // sRGB red, a published value
  linearToOklab(1, 0, 0, q);
  close(q[0], 0.62796, 1e-4, 'red L');
  close(q[1], 0.22486, 1e-4, 'red a');
  close(q[2], 0.12585, 1e-4, 'red b');
});

test('CIE Lab D50 reference values', () => {
  const white = rgb8ToLab(255, 255, 255);
  close(white.L, 100, 1e-3, 'white L');
  close(white.a, 0, 1e-3, 'white a');
  close(white.b, 0, 1e-3, 'white b');
  const grey = rgb8ToLab(119, 119, 119);
  close(grey.L, 50.03, 0.01, 'mid grey L');
  close(grey.a, 0, 1e-3, 'mid grey a');
  // sRGB red, Bradford-adapted to D50 (ICC; as Lindbloom and d3-color give it)
  const red = rgb8ToLab(255, 0, 0);
  close(red.L, 54.29, 0.01, 'red L');
  close(red.a, 80.81, 0.01, 'red a');
  close(red.b, 69.89, 0.01, 'red b');
  // and back
  for (const hex of ['#ED90DC', '#3E0E61', '#18181A', '#5456AC']) {
    const lin = labToLinear(hexToLab(hex));
    assert.equal(rgb8ToHex(linearToSrgb8(lin[0]), linearToSrgb8(lin[1]), linearToSrgb8(lin[2])), hex);
  }
  const l = linearToLab(0, 0, 0);
  close(l.L, 0, 1e-9, 'black L');
});

// Sharma, Wu and Dalal (2005), "The CIEDE2000 color-difference formula:
// implementation notes, supplementary test data, and mathematical observations".
const SHARMA: [number, number, number, number, number, number, number][] = [
  [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425],
  [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615],
  [50, 2.8361, -74.02, 50, 0, -82.7485, 3.4412],
  [50, -1.3802, -84.2814, 50, 0, -82.7485, 1.0],
  [50, -1.1848, -84.8006, 50, 0, -82.7485, 1.0],
  [50, -0.9009, -85.5211, 50, 0, -82.7485, 1.0],
  [50, 0, 0, 50, -1, 2, 2.3669],
  [50, -1, 2, 50, 0, 0, 2.3669],
  [50, 2.49, -0.001, 50, -2.49, 0.0009, 7.1792],
  [50, 2.49, -0.001, 50, -2.49, 0.001, 7.1792],
  [50, 2.49, -0.001, 50, -2.49, 0.0011, 7.2195],
  [50, 2.49, -0.001, 50, -2.49, 0.0012, 7.2195],
  [50, -0.001, 2.49, 50, 0.0009, -2.49, 4.8045],
  [50, -0.001, 2.49, 50, 0.001, -2.49, 4.8045],
  [50, -0.001, 2.49, 50, 0.0011, -2.49, 4.7461],
  [50, 2.5, 0, 50, 0, -2.5, 4.3065],
  [50, 2.5, 0, 73, 25, -18, 27.1492],
  [50, 2.5, 0, 61, -5, 29, 22.8977],
  [50, 2.5, 0, 56, -27, -3, 31.903],
  [50, 2.5, 0, 58, 24, 15, 19.4535],
  [50, 2.5, 0, 50, 3.1736, 0.5854, 1.0],
  [50, 2.5, 0, 50, 3.2972, 0, 1.0],
  [50, 2.5, 0, 50, 1.8634, 0.5757, 1.0],
  [50, 2.5, 0, 50, 3.2592, 0.335, 1.0],
  [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
  [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
  [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
  [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
  [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
  [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
  [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
];

test('CIEDE2000 matches all 34 of Sharma’s reference pairs, both ways round', () => {
  for (const [L1, a1, b1, L2, a2, b2, expected] of SHARMA) {
    const x = { L: L1, a: a1, b: b1 };
    const y = { L: L2, a: a2, b: b2 };
    close(deltaE2000(x, y), expected, 1e-4, `ΔE00 ${JSON.stringify([x, y])}`);
    close(deltaE2000(y, x), expected, 1e-4, `ΔE00 reversed ${JSON.stringify([y, x])}`);
  }
  assert.equal(deltaE2000({ L: 40, a: 10, b: -5 }, { L: 40, a: 10, b: -5 }), 0);
});

test('hex parsing and formatting', () => {
  assert.deepEqual(hexToRgb8('#ED90DC'), [237, 144, 220]);
  assert.deepEqual(hexToRgb8('ed90dc'), [237, 144, 220]);
  assert.deepEqual(hexToRgb8('#fff'), [255, 255, 255]);
  assert.equal(rgb8ToHex(237, 144, 220), '#ED90DC');
  assert.throws(() => hexToRgb8('#12345'));
});
