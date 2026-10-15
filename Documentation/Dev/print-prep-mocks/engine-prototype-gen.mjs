// Print-prep mock images: a rough prototype of the separation engine run on the
// owner's test design. Physical units throughout (28 cm print width, 55 lpi
// screen at 300/600 ppi, 45 lpi DTG fades). Scratchpad only.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/victorbendas/Documents/GitHub/Merch-From/platform/package.json');
const sharp = require('sharp');
sharp.cache(false);

const ROOT = '/Users/victorbendas/Documents/GitHub/Merch-From';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'img');
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// ---------------------------------------------------------------- colour
const S2L = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const l2s8 = (v) => { v = v <= 0 ? 0 : v >= 1 ? 1 : v; const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(c * 255); };
function lin2oklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_];
}
function oklab2lin(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((v) => Math.min(1, Math.max(0, v)));
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const lstar = (y) => (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y);
const hexOf = (lin) => '#' + lin.map((v) => l2s8(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const linOf = (r, g, b) => [S2L[r], S2L[g], S2L[b]];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------------------------------------------------------- geometry
const PRINT_W_CM = 28;
const art = await sharp(`${ROOT}/Assets/test_design.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const NW = art.info.width, NH = art.info.height, NN = NW * NH;
const PPI_N = NW / (PRINT_W_CM / 2.54);
const W3 = Math.round((PRINT_W_CM / 2.54) * 300), H3 = Math.round((NH / NW) * W3);
log(`art ${NW}x${NH} (${PPI_N.toFixed(1)} ppi at ${PRINT_W_CM} cm) -> 300 ppi canvas ${W3}x${H3}`);

// art arrays (linear colour, straight alpha)
const AR = new Float32Array(NN), AG = new Float32Array(NN), AB = new Float32Array(NN), AA = new Float32Array(NN);
for (let i = 0; i < NN; i++) { const d = art.data; AR[i] = S2L[d[i * 4]]; AG[i] = S2L[d[i * 4 + 1]]; AB[i] = S2L[d[i * 4 + 2]]; AA[i] = d[i * 4 + 3] / 255; }
// art bounds
let bx0 = NW, by0 = NH, bx1 = 0, by1 = 0;
for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) if (AA[y * NW + x] > 0.02) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
const s3 = W3 / NW;
const BB3 = { x0: Math.max(0, Math.floor(bx0 * s3) - 4), y0: Math.max(0, Math.floor(by0 * s3) - 4), x1: Math.min(W3, Math.ceil((bx1 + 1) * s3) + 4), y1: Math.min(H3, Math.ceil((by1 + 1) * s3) + 4) };
log('art bounds native', bx0, by0, bx1, by1, '300ppi', BB3);

// ---------------------------------------------------------------- morphology helpers (binary Uint8 0/1, square windows)
function dilate(m, w, h, r) { const t = new Uint8Array(m.length), o = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && !v; k++) v = m[y * w + k]; t[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && !v; k++) v = t[k * w + x]; o[y * w + x] = v; }
  return o; }
function erode(m, w, h, r) { const inv = m.map((v) => 1 - v); return dilate(inv, w, h, r).map((v) => 1 - v); }
function floodExterior(free, w, h) { // free=1 where passable; returns 1 for passable pixels connected to the border
  const ext = new Uint8Array(w * h), st = new Int32Array(w * h); let sp = 0;
  const push = (i) => { if (free[i] && !ext[i]) { ext[i] = 1; st[sp++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) { const i = st[--sp], x = i % w, y = (i / w) | 0; if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w); }
  return ext; }
// grey min filter (choke) on Uint8 maps, separable square
function minFilter(src, w, h, r) { const t = new Uint8Array(src.length), o = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) { const row = y * w; for (let x = 0; x < w; x++) { let v = 255; const a = Math.max(0, x - r), b = Math.min(w - 1, x + r); for (let k = a; k <= b; k++) { const s = src[row + k]; if (s < v) v = s; } t[row + x] = v; } }
  for (let y = 0; y < h; y++) { const a = Math.max(0, y - r), b = Math.min(h - 1, y + r); for (let x = 0; x < w; x++) { let v = 255; for (let k = a; k <= b; k++) { const s = t[k * w + x]; if (s < v) v = s; } o[y * w + x] = v; } }
  return o; }

// ---------------------------------------------------------------- silhouette (for light garments and DTG on white)
// The art is knocked out against black: its black areas are transparent. On a
// white tee the transparent holes INSIDE the illustration print black; the
// outside and the lettering's surroundings do not. The lettering (separate
// connected components at the top) is excluded from the closing so letters
// never sit in a black box; the illustration gets a round closing (Euclidean
// distance transform, r = 9 px native = 2.3 mm) plus hole filling.
const opaque = new Uint8Array(NN); for (let i = 0; i < NN; i++) opaque[i] = AA[i] >= 0.5 ? 1 : 0;
function dt1(f, n, d, v, z) { let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) { let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); } k++; v[k] = q; z[k] = s; z[k + 1] = Infinity; }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; } }
function edt(mask, w, h) { // squared distance to the nearest mask==1 pixel
  const m = Math.max(w, h), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1), g = new Float64Array(w * h);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = mask[y * w + x] ? 0 : 1e20; dt1(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; dt1(f, w, d, v, z); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
  return g; }
function roundDilate(m, w, h, r) { const g = edt(m, w, h); const o = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) o[i] = g[i] <= r * r ? 1 : 0; return o; }
function roundErode(m, w, h, r) { const inv = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) inv[i] = m[i] ? 0 : 1; const g = edt(inv, w, h); const o = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) o[i] = g[i] > r * r ? 1 : 0; return o; }
// connected components (8-connected) -> lettering = components that start near the top and sit above the illustration
const compId = new Int32Array(NN).fill(-1); const comps = [];
{ const st = new Int32Array(NN);
  for (let i = 0; i < NN; i++) { if (!opaque[i] || compId[i] >= 0) continue; const id = comps.length; let sp = 0, n = 0, y0 = NH, sy = 0; st[sp++] = i; compId[i] = id;
    while (sp) { const p = st[--sp], x = p % NW, y = (p / NW) | 0; n++; sy += y; if (y < y0) y0 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= NW || yy >= NH) continue; const q = yy * NW + xx; if (opaque[q] && compId[q] < 0) { compId[q] = id; st[sp++] = q; } } }
    comps.push({ n, y0, cy: sy / n }); } }
const isText = comps.map((c) => c.y0 < 200 && c.cy < 320);
const illus = new Uint8Array(NN); for (let i = 0; i < NN; i++) illus[i] = opaque[i] && !isText[compId[i]] ? 1 : 0;
const closedIllus = roundErode(roundDilate(illus, NW, NH, 9), NW, NH, 9);
const extIllus = floodExterior(closedIllus.map((v) => 1 - v), NW, NH);
const inIllus = extIllus.map((v) => 1 - v); // closed + filled illustration region
const silhouette = new Uint8Array(NN); for (let i = 0; i < NN; i++) silhouette[i] = inIllus[i] || opaque[i] ? 1 : 0;
const interiorHole = new Uint8Array(NN); let nHole = 0;
for (let i = 0; i < NN; i++) if (silhouette[i] && !opaque[i]) { interiorHole[i] = 1; nHole++; }
log(`lettering components ${isText.filter(Boolean).length}; interior holes printed black on light garments: ${(nHole / NN * 100).toFixed(1)}% of the image`);
await sharp(Buffer.from(silhouette.map((v, i) => (interiorHole[i] ? 128 : v ? 255 : 0))), { raw: { width: NW, height: NH, channels: 1 } }).png().toFile(path.join(HERE, 'debug-silhouette.png'));

// ---------------------------------------------------------------- garments and model colours
const TEE = {
  black: { lin: linOf(34, 40, 41), file: 'PFM0_STTU169_C002.png', name: 'Black' },
  navy: { lin: linOf(30, 47, 64), file: 'PFM0_STTU169_C727.webp', name: 'French Navy' },
  white: { lin: linOf(240, 239, 242), file: 'PFM0_STTU169_C001.webp', name: 'White' },
};
const WHITE_INK = linOf(242, 242, 240), BLACK_INK = linOf(24, 24, 26);
const OP = { ub: 0.92, inkDark: 0.96, inkLight: 0.97, hw: 0.92, black: 0.985 };

// A screen set: garment colour, colour inks in print order, and a neutral printed last
// (highlight white on darks, black on lights).
function makeSet(kind, inkList) {
  const G = kind === 'darks' ? TEE.black.lin : TEE.white.lin;
  const UB = mix(G, WHITE_INK, OP.ub);
  const X = inkList.map((k) => (kind === 'darks' ? mix(UB, k.lin, OP.inkDark) : mix(G, k.lin, OP.inkLight)));
  const XN = kind === 'darks' ? mix(UB, WHITE_INK, OP.hw) : mix(G, BLACK_INK, OP.black);
  return { kind, G, UB, X, XN, inks: inkList };
}
// target colour of art pixel i on a set (what the print must reproduce), or null if nothing prints
function targetOf(kind, G, i) { const a = AA[i];
  if (kind === 'darks' || !inIllus[i]) { if (a <= 0.004) return null; return [AR[i] * a + G[0] * (1 - a), AG[i] * a + G[1] * (1 - a), AB[i] * a + G[2] * (1 - a)]; }
  return [AR[i] * a, AG[i] * a, AB[i] * a]; } // inside the illustration on light garments: the art's black

// ---------------------------------------------------------------- LUT inversion of the print model
// visible areas a_j >= 0, sum <= 1: colour = G + sum a_j (X_j - G); weighted LS in linear RGB with
// cube-root (perceptual) weights; candidates = the 2 inks closest in hue + the neutral; exact active-set enumeration.
function gauss(M, rhs, n) { const a = M.map((r, i) => [...r, rhs[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-12) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const fct = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= fct * a[c][k]; } }
  return a.map((r, i) => r[n] / r[i]); }
function solveNode(set, P) {
  const inkList = set.inks; const o = lin2oklab(P[0], P[1], P[2]); const h = Math.atan2(o[2], o[1]);
  const hd = inkList.map((k, i) => { let d = Math.abs(Math.atan2(k.lab[2], k.lab[1]) - h); if (d > Math.PI) d = 2 * Math.PI - d; return [d, i]; }).sort((a, b) => a[0] - b[0]);
  const cand = [hd[0][1], hd[1][1], -1];
  const cols = cand.map((c) => (c < 0 ? set.XN : set.X[c]));
  const A = cols.map((x) => [x[0] - set.G[0], x[1] - set.G[1], x[2] - set.G[2]]);
  const b = [P[0] - set.G[0], P[1] - set.G[1], P[2] - set.G[2]];
  const W2 = P.map((p) => { const w = 1 / (3 * Math.pow(p + 0.008, 2 / 3)); return w * w; });
  const f = (a) => { let s = 0; for (let ch = 0; ch < 3; ch++) { let r = -b[ch]; for (let j = 0; j < 3; j++) r += A[j][ch] * a[j]; s += W2[ch] * r * r; } return s; };
  let best = [0, 0, 0], bestF = f(best);
  for (let mask = 1; mask < 8; mask++) {
    const S = [0, 1, 2].filter((j) => mask & (1 << j)); const k = S.length;
    const H = S.map((i) => S.map((j) => { let s = 0; for (let ch = 0; ch < 3; ch++) s += A[i][ch] * W2[ch] * A[j][ch]; return s; }));
    const g = S.map((i) => { let s = 0; for (let ch = 0; ch < 3; ch++) s += A[i][ch] * W2[ch] * b[ch]; return s; });
    for (const eq of [false, true]) {
      const n = eq ? k + 1 : k; const M = []; const rhs = [];
      for (let r = 0; r < k; r++) { M.push([...H[r], ...(eq ? [1] : [])]); rhs.push(g[r]); }
      if (eq) { M.push([...new Array(k).fill(1), 0]); rhs.push(1); }
      const x = gauss(M, rhs, n); if (!x) continue;
      const a = [0, 0, 0]; let ok = true, sum = 0; S.forEach((j, r) => { a[j] = x[r]; if (x[r] < -1e-7) ok = false; sum += x[r]; });
      if (!ok || sum > 1 + 1e-7) continue;
      const v = f(a); if (v < bestF) { bestF = v; best = a.map((q) => Math.max(0, q)); }
    }
  }
  const out = new Float32Array(inkList.length + 1);
  cand.forEach((c, j) => { if (c < 0) out[inkList.length] = best[j]; else out[c] += best[j]; });
  return out;
}
function buildLUT(set, NG = 33) { const nc = set.inks.length + 1; const L = new Float32Array(NG * NG * NG * nc);
  for (let ri = 0; ri < NG; ri++) for (let gi = 0; gi < NG; gi++) for (let bi = 0; bi < NG; bi++) {
    const P = [S2L[Math.round(ri * 255 / (NG - 1))], S2L[Math.round(gi * 255 / (NG - 1))], S2L[Math.round(bi * 255 / (NG - 1))]];
    L.set(solveNode(set, P), ((ri * NG + gi) * NG + bi) * nc); }
  return { L, NG, nc }; }
function lutLookup(lut, P8, out) { const { L, NG, nc } = lut; const f = (NG - 1) / 255;
  const fr = P8[0] * f, fg = P8[1] * f, fb = P8[2] * f; const r0 = Math.min(NG - 2, fr | 0), g0 = Math.min(NG - 2, fg | 0), b0 = Math.min(NG - 2, fb | 0);
  const dr = fr - r0, dg = fg - g0, db = fb - b0; out.fill(0);
  for (let c = 0; c < 8; c++) { const ir = c & 1, ig = (c >> 1) & 1, ib = (c >> 2) & 1; const w = (ir ? dr : 1 - dr) * (ig ? dg : 1 - dg) * (ib ? db : 1 - db); if (w === 0) continue;
    const base = (((r0 + ir) * NG + (g0 + ig)) * NG + (b0 + ib)) * nc; for (let k = 0; k < nc; k++) out[k] += w * L[base + k]; } }
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- palette: candidates from k-means, chosen by reproduction error
const sampleIdx = []; for (let i = 0; i < NN; i += 5) if (AA[i] > 0.95) sampleIdx.push(i);
const SL = new Float32Array(sampleIdx.length), Sa = new Float32Array(sampleIdx.length), Sb = new Float32Array(sampleIdx.length);
sampleIdx.forEach((p, k) => { const o = lin2oklab(AR[p], AG[p], AB[p]); SL[k] = o[0]; Sa[k] = o[1]; Sb[k] = o[2]; });
function kmeans(K, wgt, seed = 1) {
  let rnd = seed; const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const n = SL.length, C = []; let first = 0, best = -1; for (let k = 0; k < n; k++) { const v = wgt(k); if (v > best) { best = v; first = k; } }
  C.push([SL[first], Sa[first], Sb[first]]); const D = new Float32Array(n).fill(1e9);
  while (C.length < K) { const c = C[C.length - 1]; let tot = 0;
    for (let k = 0; k < n; k++) { const d = (SL[k] - c[0]) ** 2 + (Sa[k] - c[1]) ** 2 + (Sb[k] - c[2]) ** 2; if (d < D[k]) D[k] = d; tot += D[k] * wgt(k); }
    let r = rand() * tot, pick = 0; for (let k = 0; k < n; k++) { r -= D[k] * wgt(k); if (r <= 0) { pick = k; break; } } C.push([SL[pick], Sa[pick], Sb[pick]]); }
  const lab = new Int32Array(n);
  for (let it = 0; it < 30; it++) { const acc = C.map(() => [0, 0, 0, 0]);
    for (let k = 0; k < n; k++) { let bd = 1e9, bi = 0; for (let c = 0; c < K; c++) { const d = (SL[k] - C[c][0]) ** 2 + (Sa[k] - C[c][1]) ** 2 + (Sb[k] - C[c][2]) ** 2; if (d < bd) { bd = d; bi = c; } } lab[k] = bi; const w = wgt(k); acc[bi][0] += SL[k] * w; acc[bi][1] += Sa[k] * w; acc[bi][2] += Sb[k] * w; acc[bi][3] += w; }
    for (let c = 0; c < K; c++) if (acc[c][3] > 0) C[c] = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]]; }
  return { C, lab }; }
const mkInk = (L, a, b, share = 0) => { const lin = oklab2lin(L, a, b); return { lab: lin2oklab(...lin), lin, hex: hexOf(lin), share }; };
function clusterInks({ C, lab }, mode) { return C.map((c, ci) => { const ks = []; for (let k = 0; k < SL.length; k++) if (lab[k] === ci) ks.push(k);
  if (mode === 'centroid' || ks.length < 20) return mkInk(c[0], c[1], c[2], ks.length / SL.length);
  if (mode === 'sat25') ks.sort((x, y) => Math.hypot(Sa[y], Sb[y]) - Math.hypot(Sa[x], Sb[x]));
  else if (mode === 'bot25') ks.sort((x, y) => SL[x] - SL[y]);
  else ks.sort((x, y) => SL[y] - SL[x]);
  const top = ks.slice(0, Math.max(10, Math.floor(ks.length * (mode === 'top50' ? 0.5 : 0.25))));
  let L = 0, a = 0, b = 0; for (const k of top) { L += SL[k]; a += Sa[k]; b += Sb[k]; } return mkInk(L / top.length, a / top.length, b / top.length, ks.length / SL.length); }); }
const evalIdx = []; for (let i = 0; i < NN; i += 13) if (AA[i] > 0.5 || interiorHole[i]) evalIdx.push(i);
function paletteError(inkList, kinds = ['darks', 'lights']) { let tot = 0; const out = {};
  for (const kind of kinds) { const set = makeSet(kind, inkList); const lut = buildLUT(set, 17); const areas = new Float32Array(inkList.length + 1); const P8 = [0, 0, 0]; let e = 0, n = 0;
    for (const i of evalIdx) { const P = targetOf(kind, set.G, i); if (!P) continue; P8[0] = l2s8(P[0]); P8[1] = l2s8(P[1]); P8[2] = l2s8(P[2]); lutLookup(lut, P8, areas);
      const rep = set.G.slice(); for (let k = 0; k < inkList.length; k++) for (let ch = 0; ch < 3; ch++) rep[ch] += areas[k] * (set.X[k][ch] - set.G[ch]);
      for (let ch = 0; ch < 3; ch++) rep[ch] += areas[inkList.length] * (set.XN[ch] - set.G[ch]);
      const o1 = lin2oklab(...P), o2 = lin2oklab(...rep.map((v) => Math.max(0, v))); e += Math.hypot(o1[0] - o2[0], o1[1] - o2[1], o1[2] - o2[2]); n++; }
    out[kind] = (e / n) * 100; tot += out[kind]; }
  return { tot, ...out }; }
const weights = { chroma: (k) => 0.01 + Math.hypot(Sa[k], Sb[k]), litChroma: (k) => Math.max(0.02, SL[k] - 0.2) * (0.03 + Math.hypot(Sa[k], Sb[k])), area: () => 1 };
const pool = []; const seen = new Set();
for (const [wn, wf] of Object.entries(weights)) for (const K of [5, 6]) { const km = kmeans(K, wf, 3); for (const mode of ['centroid', 'top50', 'top25', 'sat25', 'bot25']) for (const ink of clusterInks(km, mode)) { if (!pool.some((q) => Math.hypot(q.lab[0] - ink.lab[0], q.lab[1] - ink.lab[1], q.lab[2] - ink.lab[2]) < 0.035)) pool.push({ ...ink, src: `${wn}/${K}/${mode}` }); } }
log('ink candidates in pool:', pool.length);
// greedy forward selection of 4 inks per screen set (each set is its own press setup), then one swap pass
function choosePalette(kind) {
  let chosen = [];
  for (let step = 0; step < 4; step++) { let best = null; for (const cnd of pool) { if (chosen.includes(cnd)) continue; const trial = [...chosen, cnd]; const s = paletteError(trial.length >= 2 ? trial : [cnd, cnd], [kind]).tot; if (!best || s < best.s) best = { cnd, s }; } chosen.push(best.cnd); log(`${kind} palette step ${step + 1}: +${best.cnd.hex} (${best.cnd.src}) error ${best.s.toFixed(2)}`); }
  for (let j = 0; j < 4; j++) { let cur = paletteError(chosen, [kind]).tot; for (const cnd of pool) { if (chosen.includes(cnd)) continue; const trial = chosen.slice(); trial[j] = cnd; const s = paletteError(trial, [kind]).tot; if (s < cur - 0.05) { cur = s; chosen = trial; log(`${kind} swap ${j}: ${cnd.hex} -> ${s.toFixed(2)}`); } } }
  const sorted = chosen.slice().sort((a, b) => b.lab[0] - a.lab[0]); // light -> dark = print order
  log(`${kind} inks (light->dark):`, sorted.map((k) => `${k.hex} L${k.lab[0].toFixed(2)}`).join('  '), `| mean dE_ok x100 ${paletteError(sorted, [kind]).tot.toFixed(2)}`);
  return sorted; }
const INKS = { darks: choosePalette('darks'), lights: choosePalette('lights') };
const SETS = { darks: makeSet('darks', INKS.darks), lights: makeSet('lights', INKS.lights) };

// coverage maps at native resolution, nested by print order (later plates sit inside earlier dots, same screen)
function separate(set) {
  const lut = buildLUT(set, 33); log(`LUT ${set.kind} built`);
  const inks = set.inks; const nI = inks.length, nc = nI + 1; const areas = new Float32Array(nc); const P8 = [0, 0, 0];
  const plates = []; const ub = new Uint8Array(NN); const inkMaps = inks.map(() => new Uint8Array(NN)); const neu = new Uint8Array(NN);
  for (let i = 0; i < NN; i++) {
    const P = targetOf(set.kind, set.G, i); if (!P) continue;
    P8[0] = l2s8(P[0]); P8[1] = l2s8(P[1]); P8[2] = l2s8(P[2]);
    lutLookup(lut, P8, areas);
    let later = areas[nI]; neu[i] = Math.round(Math.min(1, areas[nI]) * 255);
    for (let k = nI - 1; k >= 0; k--) { const a = areas[k]; const act = smooth(0.01, 0.06, a); const c = Math.min(1, a + act * later); inkMaps[k][i] = Math.round(c * 255); later += a; }
    ub[i] = Math.round(Math.min(1, later) * 255);
  }
  if (set.kind === 'darks') { plates.push({ role: 'underbase', map: ub, color: WHITE_INK, op: OP.ub, base: 'Aquaflex V2 White (flash)' });
    inks.forEach((k, j) => plates.push({ role: 'ink', map: inkMaps[j], color: k.lin, op: OP.inkDark, base: 'HB Opaque', ink: k }));
    plates.push({ role: 'highlight', map: neu, color: WHITE_INK, op: OP.hw, base: 'Aquaflex V2 White' }); }
  else { inks.forEach((k, j) => plates.push({ role: 'ink', map: inkMaps[j], color: k.lin, op: OP.inkLight, base: 'HB Neutral', ink: k }));
    plates.push({ role: 'black', map: neu, color: BLACK_INK, op: OP.black, base: 'HB Opaque' }); }
  return plates;
}

// ---------------------------------------------------------------- upsampling + halftone
async function up(map, w, h, W, H, kernel = 'lanczos3') { const { data, info } = await sharp(Buffer.from(map), { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel, fit: 'fill' }).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1 || data.length !== W * H) throw new Error(`up(): got ${info.channels}ch ${data.length}`); return new Uint8Array(data); }
const TN = 256; const TH = (() => { const n = TN, v = new Float32Array(n * n), idx = [...Array(n * n).keys()];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = ((i + 0.5) / n) * 2 - 1, y = ((j + 0.5) / n) * 2 - 1, ax = Math.abs(x), ay = Math.abs(y);
    v[j * n + i] = ax + ay > 1 ? (ay - 1) ** 2 + (ax - 1) ** 2 - 1 : 1 - (x * x + y * y); }
  idx.sort((a, b) => v[b] - v[a]); const t = new Float32Array(n * n); idx.forEach((p, r) => { t[p] = (r / (n * n)) * 255; }); return t; })();
function clampDots(c) { // min dot 5 %, max dot 90 % -> solid
  if (c < 6) return 0; if (c < 13) return 13; if (c > 229) return 255; return c; }
function halftone(cov, W, H, ppi, lpi, deg, x0in = 0, y0in = 0, clamp = true) {
  const out = new Uint8Array(W * H); const co = Math.cos(deg * Math.PI / 180), si = Math.sin(deg * Math.PI / 180);
  const dsx = (co * lpi) / ppi, dtx = (-si * lpi) / ppi;
  for (let y = 0; y < H; y++) { const v = y0in + (y + 0.5) / ppi, u0 = x0in + 0.5 / ppi;
    let s = (u0 * co + v * si) * lpi, t = (-u0 * si + v * co) * lpi;
    for (let x = 0; x < W; x++, s += dsx, t += dtx) { const i = y * W + x; let c = cov[i]; if (clamp) c = clampDots(c); if (c === 0) continue;
      const fs = s - Math.floor(s), ft = t - Math.floor(t); if (c > TH[((ft * TN) | 0) * TN + ((fs * TN) | 0)]) out[i] = 1; } }
  return out; }

// ---------------------------------------------------------------- run the screen separations at 300 ppi
const LPI = 55, ANGLE = 22.5, CHOKE_PX300 = 2; // 0.17 mm
const screen = {};
for (const kind of ['darks', 'lights']) {
  const plates = separate(SETS[kind]);
  for (const p of plates) {
    let m = await up(p.map, NW, NH, W3, H3);
    if (p.role === 'underbase') { m = minFilter(m, W3, H3, CHOKE_PX300); for (let i = 0; i < m.length; i++) m[i] = Math.round(m[i] * 0.96); }
    p.bin = halftone(m, W3, H3, 300, LPI, ANGLE);
    let on = 0, area = 0; for (let y = BB3.y0; y < BB3.y1; y++) for (let x = BB3.x0; x < BB3.x1; x++) { area++; on += p.bin[y * W3 + x]; }
    p.coverage = on / area;
  }
  screen[kind] = plates;
  log(kind, plates.map((p) => `${p.role}${p.ink ? ' ' + p.ink.hex : ''} ${(p.coverage * 100).toFixed(1)}%`).join(' | '));
}

// ---------------------------------------------------------------- DTG/DTF layers at 300 ppi
// alpha strictly 0/255: thin partial edges thresholded at 50 %, wider partial areas (fades) halftoned at 45 lpi.
function dtgNative(teeKey) {
  const G = TEE[teeKey].lin; const Go = lin2oklab(...G);
  const A = new Uint8Array(NN), R = new Uint8Array(NN), Gc = new Uint8Array(NN), B = new Uint8Array(NN);
  for (let i = 0; i < NN; i++) {
    let a = AA[i], c = [AR[i], AG[i], AB[i]];
    if (teeKey === 'white' && interiorHole[i]) { a = 1; c = [0, 0, 0]; } // black inside the illustration on white tees
    else if (teeKey === 'white' && inIllus[i] && a < 1) { c = [c[0] * a, c[1] * a, c[2] * a]; a = 1; } // inside the illustration: edges against the art's black
    if (a <= 0.004) continue;
    // garment knockout with a tolerance band -> fades
    const o = lin2oklab(c[0], c[1], c[2]); const d = Math.hypot(o[0] - Go[0], o[1] - Go[1], o[2] - Go[2]);
    const k = teeKey === 'white' ? smooth(0.03, 0.10, d) : smooth(0.06, 0.20, d);
    const at = a * k; if (at <= 0.004) continue;
    // decontaminate: colour that, at coverage k over the garment, averages to the target
    const dc = c.map((v, ch) => Math.min(1, Math.max(0, (v - (1 - k) * G[ch]) / k)));
    A[i] = Math.round(at * 255); R[i] = l2s8(dc[0]); Gc[i] = l2s8(dc[1]); B[i] = l2s8(dc[2]);
  }
  return { A, R, G: Gc, B };
}
async function dtgAt(teeKey, W, H, ppi, cropNative = null) {
  const n = dtgNative(teeKey);
  // resample as one RGBA image so sharp premultiplies alpha (no dark fringes from transparent neighbours)
  const rgba = new Uint8Array(NN * 4); for (let i = 0; i < NN; i++) { rgba[i * 4] = n.R[i]; rgba[i * 4 + 1] = n.G[i]; rgba[i * 4 + 2] = n.B[i]; rgba[i * 4 + 3] = n.A[i]; }
  let sh = sharp(Buffer.from(rgba), { raw: { width: NW, height: NH, channels: 4 } }); if (cropNative) sh = sh.extract(cropNative);
  const big = new Uint8Array(await sh.resize(W, H, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer());
  const A = new Uint8Array(W * H), R = new Uint8Array(W * H), Gc = new Uint8Array(W * H), B = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { R[i] = big[i * 4]; Gc[i] = big[i * 4 + 1]; B[i] = big[i * 4 + 2]; A[i] = big[i * 4 + 3]; }
  // partial-alpha regions: open with r=2 px (at 300 ppi) -> wide fades; the rest is a thin edge band
  const part = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) part[i] = A[i] > 5 && A[i] < 250 ? 1 : 0;
  const r = Math.max(1, Math.round(2 * ppi / 300)); const fade = dilate(erode(part, W, H, r), W, H, r);
  const x0in = cropNative ? cropNative.left / PPI_N : 0, y0in = cropNative ? cropNative.top / PPI_N : 0;
  const ht = halftone(A, W, H, ppi, 45, ANGLE, x0in, y0in, false);
  const alpha = new Uint8Array(W * H); let opaqueN = 0, fadeOn = 0, fadeN = 0;
  for (let i = 0; i < W * H; i++) { let on; if (fade[i] && part[i]) { on = ht[i]; fadeN++; if (on) fadeOn++; } else on = A[i] >= 128 ? 1 : 0; alpha[i] = on ? 255 : 0; if (on) opaqueN++; }
  return { alpha, R, G: Gc, B, W, H, stats: { opaquePx: opaqueN, fadePx: fadeN, fadeOnPx: fadeOn } };
}
const dtg = {};
for (const k of ['black', 'navy', 'white']) { dtg[k] = await dtgAt(k, W3, H3, 300); const s = dtg[k].stats; log(`DTG ${k}: opaque ${(s.opaquePx / (W3 * H3) * 100).toFixed(1)}% of canvas, fade area ${(s.fadePx / Math.max(1, s.opaquePx) * 100).toFixed(1)}% of printed px`); }

// ---------------------------------------------------------------- packshots + proofs
function boxBlur(src, w, h, r) { const t = new Float32Array(src.length), o = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { s += src[y * w + k]; n++; } t[y * w + x] = s / n; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { s += t[k * w + x]; n++; } o[y * w + x] = s / n; }
  return o; }
const PW = 1000, PH = 1250;
const box = { x: 0.2976 * PW, y: 0.3465 * PH, w: 0.4039 * PW, h: 0.4 * PH };
const artW = Math.min(box.w, box.h * NW / NH), artH = artW * NH / NW;
const rect = { left: Math.round(box.x + (box.w - artW) / 2), top: Math.round(box.y), width: Math.round(artW), height: Math.round(artH) };
log('art rect on packshot', rect);
const packs = {};
for (const [k, t] of Object.entries(TEE)) {
  const buf = await sharp(`${ROOT}/platform/public/packshots/${t.file}`).resize(PW, PH, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  packs[k] = new Uint8Array(buf);
  await sharp(Buffer.from(buf), { raw: { width: PW, height: PH, channels: 4 } }).webp({ quality: 88 }).toFile(path.join(OUT, `tee-${k}.webp`));
}
// box-average a 300 ppi print (flag + linear colour) by 4, then resize to the rect
async function printLayer(W, H, colourAt) { // colourAt(i) -> null | [r,g,b] linear
  const F = 4, w = Math.floor(W / F), h = Math.floor(H / F); const rgba = new Uint8Array(w * h * 4);
  for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) { let n = 0, r = 0, g = 0, b = 0;
    for (let y = by * F; y < by * F + F; y++) for (let x = bx * F; x < bx * F + F; x++) { const c = colourAt(y * W + x); if (c) { n++; r += c[0]; g += c[1]; b += c[2]; } }
    const o = (by * w + bx) * 4; if (n) { rgba[o] = l2s8(r / n); rgba[o + 1] = l2s8(g / n); rgba[o + 2] = l2s8(b / n); rgba[o + 3] = Math.round((n / (F * F)) * 255); } }
  return new Uint8Array(await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).resize(rect.width, rect.height, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer());
}
async function composeProof(teeKey, layer, file) {
  const P = new Uint8Array(packs[teeKey]); // copy
  // fabric shading from the packshot's own luminance inside the rect (mild)
  const Y = new Float32Array(rect.width * rect.height); let sum = 0, n = 0;
  for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) { const o = ((rect.top + y) * PW + rect.left + x) * 4; const v = lum([S2L[P[o]], S2L[P[o + 1]], S2L[P[o + 2]]]); Y[y * rect.width + x] = v; if (P[o + 3] > 200) { sum += v; n++; } }
  const meanY = sum / Math.max(1, n);
  const Yb = boxBlur(boxBlur(Y, rect.width, rect.height, 1), rect.width, rect.height, 1);
  for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
    const li = (y * rect.width + x) * 4; const a = layer[li + 3] / 255; if (!a) continue;
    const o = ((rect.top + y) * PW + rect.left + x) * 4; if (P[o + 3] < 128) continue;
    let ratio = (Yb[y * rect.width + x] + 0.03) / (meanY + 0.03); ratio = Math.min(1.22, Math.max(0.8, ratio)); const m = Math.pow(ratio, 0.8);
    for (let ch = 0; ch < 3; ch++) { const ink = S2L[layer[li + ch]] * m; const under = S2L[P[o + ch]]; P[o + ch] = l2s8(under * (1 - a) + ink * a); }
  }
  await sharp(Buffer.from(P), { raw: { width: PW, height: PH, channels: 4 } }).webp({ quality: 88 }).toFile(path.join(OUT, file));
}
function screenColourAt(plates, G) { return (i) => { let col = null; for (const p of plates) if (p.bin[i]) { if (!col) col = G.slice(); col = mix(col, p.color, p.op); } return col; }; }
function dtgColourAt(d) { return (i) => (d.alpha[i] ? [S2L[d.R[i]], S2L[d.G[i]], S2L[d.B[i]]] : null); }
for (const k of ['black', 'navy', 'white']) {
  const plates = k === 'white' ? screen.lights : screen.darks;
  await composeProof(k, await printLayer(W3, H3, screenColourAt(plates, TEE[k].lin)), `proof-screen-${k}.webp`);
  await composeProof(k, await printLayer(W3, H3, dtgColourAt(dtg[k])), `proof-dtg-${k}.webp`);
  log('proofs', k);
}

// ---------------------------------------------------------------- loupe crops at true size (600 ppi), the main eye
const LOUPE = 640, LPPI = 600; const sN = PPI_N / LPPI; // native px per 600-ppi px
const eye = { cx: 538, cy: 650 };
const cropN = { left: Math.round(eye.cx - (LOUPE * sN) / 2), top: Math.round(eye.cy - (LOUPE * sN) / 2), width: Math.round(LOUPE * sN), height: Math.round(LOUPE * sN) };
const x0in = cropN.left / PPI_N, y0in = cropN.top / PPI_N;
async function upCrop(map) { const { data, info } = await sharp(Buffer.from(map), { raw: { width: NW, height: NH, channels: 1 } }).extract(cropN).resize(LOUPE, LOUPE, { kernel: 'lanczos3', fit: 'fill' }).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1 || data.length !== LOUPE * LOUPE) throw new Error('upCrop'); return new Uint8Array(data); }
const loupePlates = [];
for (const p of screen.darks) { let m = await upCrop(p.map); if (p.role === 'underbase') { m = minFilter(m, LOUPE, LOUPE, 4); for (let i = 0; i < m.length; i++) m[i] = Math.round(m[i] * 0.96); } loupePlates.push({ ...p, bin: halftone(m, LOUPE, LOUPE, LPPI, LPI, ANGLE, x0in, y0in) }); }
async function writeLoupe(colourAt, G, file, blur = 0.6) {
  const rgb = new Uint8Array(LOUPE * LOUPE * 3); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < LOUPE * LOUPE; i++) { const c = colourAt(i) || G; const nz = 1 + (rnd() - 0.5) * 0.06; rgb[i * 3] = l2s8(c[0] * nz); rgb[i * 3 + 1] = l2s8(c[1] * nz); rgb[i * 3 + 2] = l2s8(c[2] * nz); }
  let s = sharp(Buffer.from(rgb), { raw: { width: LOUPE, height: LOUPE, channels: 3 } }); if (blur) s = s.blur(blur); await s.png().toFile(path.join(OUT, file)); }
await writeLoupe(screenColourAt(loupePlates, TEE.black.lin), TEE.black.lin, 'loupe-screen-black.png');
{ // DTG at 300 ppi for the same physical window, shown 2x nearest-neighbour
  const d = await dtgAt('black', LOUPE / 2, LOUPE / 2, 300, cropN);
  const big = { alpha: new Uint8Array(LOUPE * LOUPE), R: new Uint8Array(LOUPE * LOUPE), G: new Uint8Array(LOUPE * LOUPE), B: new Uint8Array(LOUPE * LOUPE) };
  for (let y = 0; y < LOUPE; y++) for (let x = 0; x < LOUPE; x++) { const s = (y >> 1) * (LOUPE / 2) + (x >> 1), t = y * LOUPE + x; big.alpha[t] = d.alpha[s]; big.R[t] = d.R[s]; big.G[t] = d.G[s]; big.B[t] = d.B[s]; }
  await writeLoupe(dtgColourAt(big), TEE.black.lin, 'loupe-dtg-black.png', 0.5);
}
{ // 1:1 crop of film darks 2 at 600 ppi, from the window where that plate has the most mid-tones
  const p = screen.darks[1]; const wN = Math.round(PPI_N); // 1 inch window = 600 px at 600 ppi
  let best = null; for (let y = 0; y + wN < NH; y += 6) for (let x = 0; x + wN < NW; x += 6) { let sc = 0; for (let yy = y; yy < y + wN; yy += 3) for (let xx = x; xx < x + wN; xx += 3) { const c = p.map[yy * NW + xx]; if (c >= 38 && c <= 217) sc++; } if (!best || sc > best.sc) best = { x, y, sc }; }
  const win = { left: best.x, top: best.y, width: wN, height: wN };
  const { data } = await sharp(Buffer.from(p.map), { raw: { width: NW, height: NH, channels: 1 } }).extract(win).resize(600, 600, { kernel: 'lanczos3', fit: 'fill' }).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const bin = halftone(new Uint8Array(data), 600, 600, 600, LPI, ANGLE, win.left / PPI_N, win.top / PPI_N);
  const g = new Uint8Array(600 * 600); for (let i = 0; i < g.length; i++) g[i] = bin[i] ? 0 : 255;
  await sharp(Buffer.from(g), { raw: { width: 600, height: 600, channels: 1 } }).png().toFile(path.join(OUT, 'film-darks-2-crop.png'));
  log('film-darks-2-crop window (native px)', win, 'mid-tone samples', best.sc);
}
log('loupes');

// ---------------------------------------------------------------- films
const MM = 300 / 25.4; const MARGIN = Math.round(15 * MM);
const FW = BB3.x1 - BB3.x0 + 2 * MARGIN, FH = BB3.y1 - BB3.y0 + 2 * MARGIN;
function regMark(cx, cy) { const r = 3.5 * MM, l = 6.5 * MM, sw = 0.35 * MM; return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="${sw}"/><line x1="${cx - l}" y1="${cy}" x2="${cx + l}" y2="${cy}" stroke="#000" stroke-width="${sw}"/><line x1="${cx}" y1="${cy - l}" x2="${cx}" y2="${cy + l}" stroke="#000" stroke-width="${sw}"/>`; }
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const marksSvg = (left, right, topLeft, topRight) => { const fs = 3.6 * MM, gapC = 9 * MM, yb = FH - MARGIN / 2 + 1.3 * MM, yt = MARGIN / 2 + 1.3 * MM;
  const t = (x, y, s, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="#000">${esc(s)}</text>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}">
  ${regMark(FW / 2, MARGIN / 2)}${regMark(FW / 2, FH - MARGIN / 2)}${regMark(MARGIN / 2, FH / 2)}${regMark(FW - MARGIN / 2, FH / 2)}
  ${t(FW / 2 - gapC, yb, left, 'end')}${t(FW / 2 + gapC, yb, right, 'start')}${t(FW / 2 - gapC, yt, topLeft, 'end')}${t(FW / 2 + gapC, yt, topRight, 'start')}
</svg>`); };
const filmIndex = {};
for (const kind of ['darks', 'lights']) {
  const plates = screen[kind]; filmIndex[kind] = [];
  for (let j = 0; j < plates.length; j++) {
    const p = plates[j]; const g = new Uint8Array(FW * FH).fill(255);
    for (let y = BB3.y0; y < BB3.y1; y++) { const fy = y - BB3.y0 + MARGIN; for (let x = BB3.x0; x < BB3.x1; x++) if (p.bin[y * W3 + x]) g[fy * FW + (x - BB3.x0 + MARGIN)] = 0; }
    const what = p.role === 'underbase' ? 'UNDERBASE · AQUAFLEX V2 WHITE' : p.role === 'highlight' ? 'HIGHLIGHT WHITE' : p.role === 'black' ? 'BLACK' : `INK ${p.ink.hex} · ${p.base.toUpperCase()}`;
    const file = `film-${kind}-${j + 1}.png`;
    const svg = marksSvg(`UNDERWRITER v3 · FRONT · ${kind.toUpperCase()} ${j + 1}/${plates.length}`, `${what} · ${LPI} LPI ${ANGLE}°`, 'TOP ↑  MERCHFROM FILM', 'PRINT AS IS · NO SCALING');
    const full = await sharp(Buffer.from(g), { raw: { width: FW, height: FH, channels: 1 } }).composite([{ input: svg }]).png().toBuffer();
    await sharp(full).resize({ height: 560, kernel: 'lanczos3' }).greyscale().png().toFile(path.join(OUT, file));
    filmIndex[kind].push(file);
  }
}
log('films', FW, 'x', FH, 'at 300 ppi');

// ---------------------------------------------------------------- inks.json
const ppiNote = { screen: '300 ppi renders (films and proofs), 600 ppi loupe; production target 600 ppi', dtg: '300 ppi' };
const json = {
  design: 'Assets/test_design.png', printWidthCm: PRINT_W_CM, nativePpiAtPrint: +PPI_N.toFixed(1), canvas300: { width: W3, height: H3 }, artBounds300: BB3,
  screen: { lpi: LPI, angle: ANGLE, dot: 'round (Euclidean)', minDot: 0.05, maxDotToSolid: 0.9, underbaseChokeMm: +(CHOKE_PX300 / MM).toFixed(2), note: ppiNote.screen },
  sets: Object.fromEntries(['darks', 'lights'].map((kind) => [kind, {
    garments: kind === 'darks' ? ['Black', 'French Navy'] : ['White'],
    screens: screen[kind].map((p, j) => ({ index: j + 1, role: p.role, hex: p.role === 'ink' ? p.ink.hex : hexOf(p.color), lstar: +lstar(lum(p.color)).toFixed(1), coveragePct: +(p.coverage * 100).toFixed(1), base: p.base, film: filmIndex[kind][j] })),
  }])),
  dtg: Object.fromEntries(Object.entries(dtg).map(([k, d]) => [k, { widthPx: W3, heightPx: H3, ppi: 300, fadeLpi: 45, printedPctOfCanvas: +(d.stats.opaquePx / (W3 * H3) * 100).toFixed(1), fadeAreaPctOfPrinted: +(d.stats.fadePx / Math.max(1, d.stats.opaquePx) * 100).toFixed(1) }])),
};
fs.writeFileSync(path.join(OUT, 'inks.json'), JSON.stringify(json, null, 2));

// ---------------------------------------------------------------- contact sheet
const tiles = [];
const addRow = async (files, h) => { const imgs = []; for (const f of files) { const b = await sharp(path.join(OUT, f)).resize({ height: h }).flatten({ background: '#ECE5DA' }).png().toBuffer(); const m = await sharp(b).metadata(); imgs.push({ b, w: m.width, h: m.height }); } tiles.push(imgs); };
await addRow(['tee-black.webp', 'proof-screen-black.webp', 'proof-dtg-black.webp', 'tee-navy.webp', 'proof-screen-navy.webp', 'proof-dtg-navy.webp', 'tee-white.webp', 'proof-screen-white.webp', 'proof-dtg-white.webp'], 420);
await addRow(['loupe-screen-black.png', 'loupe-dtg-black.png', 'film-darks-2-crop.png'], 420);
await addRow(filmIndex.darks, 300); await addRow(filmIndex.lights, 300);
const gap = 12; const CW = Math.max(...tiles.map((r) => r.reduce((s, t) => s + t.w + gap, gap))); const CH = tiles.reduce((s, r) => s + Math.max(...r.map((t) => t.h)) + gap, gap);
const sheet = []; let yy = gap; for (const r of tiles) { let xx = gap; for (const t of r) { sheet.push({ input: t.b, left: xx, top: yy }); xx += t.w + gap; } yy += Math.max(...r.map((t) => t.h)) + gap; }
await sharp({ create: { width: CW, height: CH, channels: 3, background: "#777777" } }).composite(sheet).png().toFile(path.join(OUT, 'contact.png'));
log('done', CW, 'x', CH);
