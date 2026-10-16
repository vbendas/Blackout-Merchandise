// Index separations, step 2: the inks (plan section 4.3). Index prints the
// colours it has no ink for as dithers of the inks it has, so the best set is
// not the k-means average of the art (that greys out what it merges) but the
// set whose solids and mixes come nearest the art. Candidates are the art's
// own colour clusters (weighted k-means in OKLab, seeded, flat colours
// weighing most), plus the white ink; the garment is a free colour. Each art
// colour is scored by how well the set reproduces it: as a solid, or as an
// area mix in linear light (what the dither makes), with a charge for mixing
// far-apart colours in flat areas (grain, and the mixes that shift most with
// dot gain and registration). An edge's anti-aliasing is not grain, so
// hairline art does not buy grey inks. A greedy pass adds the ink that helps
// most per screen while the budget allows; swap passes then try every other
// candidate in each place, first on two-ink mixes, then on the three- and
// four-ink mixes the dither also makes (a brown from black, red and green).
// Finally each ink is pulled onto the exact flat colour it prints, so flat
// areas print solid.
import type { Hex } from '@/lib/print/types';
import { ENGINE_TUNING, WHITE_INK_HEX } from '@/lib/print/defaults';
import { SRGB8_TO_LINEAR, deltaE2000, hexToRgb8, linearToLab, linearToOklab, linearToSrgb8, oklabToLinear, rgb8ToHex, type Vec3 } from './colour';
import { kmeans, type Bins, type SetContext } from './palette';
import type { CellGrid } from './index-cells';
import { EXTRA_INK, GRAIN, MixFinder, newMix } from './index-mix';

export interface IndexInk {
  kind: 'ink' | 'white';
  /** what prints: the ink's target colour (the white ink for white) */
  hex: Hex;
  /** the art colour the ink stands for in the dither, linear */
  art: Vec3;
  /** screens it costs in this set */
  screens: number;
  /** share of the art it stands for */
  share: number;
}

export interface IndexPalette {
  inks: IndexInk[];
  /** the art's weighted mean reproduction cost (OKLab, about ΔE / 100), for the method's own checks */
  meanCost: number;
}

/** The heaviest colour bins kept for selection. */
const MAX_BINS = 3000;
/** k-means clusters offered as candidates. */
const MAX_CANDIDATES = 40;
/** Candidates closer than this (ΔE2000) are one. */
const CANDIDATE_MERGE_DE = 2.5;
/** Bins the two-ink mixes reproduce worse than this are checked for three and four ink mixes. */
const MIX_CHECK = 0.01;
/** Edge, hairline and steep-shading colours weigh this much in the clustering that offers candidates. */
const EDGE_CLUSTER_WEIGHT = 0.2;
/** The exact (three and four ink) scoring looks at the heaviest bins holding this share of the art, at most EXACT_BINS. */
const EXACT_WEIGHT = 0.995;
const EXACT_BINS = 600;
/** Stop adding inks once the art is reproduced this well on average (OKLab). */
const GOOD_ENOUGH = 0.004;
/** ... or when the best ink left improves the average by less than this per screen. */
const MIN_GAIN = 0.0005;
/** An ink is pulled onto the art colours it reproduces as a solid within this (OKLab)... */
const POLISH_OK = 0.03;
/** ... averaging the heaviest of them with those within this of it. */
const POLISH_NEAR_OK = 0.012;
const SEED = 0x1d3e5;

interface Point {
  lin: Vec3;
  ok: Vec3;
}

function pointOf(lin: Vec3): Point {
  const ok: Vec3 = [0, 0, 0];
  linearToOklab(lin[0], lin[1], lin[2], ok);
  return { lin, ok };
}

function linOfHex(hex: Hex): Vec3 {
  const [r, g, b] = hexToRgb8(hex);
  return [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]];
}

function hexOfLinear(lin: ArrayLike<number>): Hex {
  return rgb8ToHex(linearToSrgb8(lin[0]), linearToSrgb8(lin[1]), linearToSrgb8(lin[2]));
}

/**
 * 6-bit colour bins of the printing cells, heaviest first (ties by colour, so
 * the result is stable). Cells in flat areas and the rest (edges, hairlines,
 * steep shading) bin apart: `flat` is a bin's count when it holds flat cells,
 * else 0.
 */
export function cellBins(cells: CellGrid, maxBins = MAX_BINS): Bins {
  const KEYS = 1 << 19;
  const count = new Float64Array(KEYS);
  const sum = new Float64Array(KEYS * 3);
  const { rgb, body, flat } = cells;
  const n = cells.cw * cells.ch;
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (!body[i]) continue;
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const k = (flat[i] ? 1 << 18 : 0) | ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    count[k] += 1;
    sum[k * 3] += SRGB8_TO_LINEAR[r];
    sum[k * 3 + 1] += SRGB8_TO_LINEAR[g];
    sum[k * 3 + 2] += SRGB8_TO_LINEAR[b];
    total++;
  }
  const keys: number[] = [];
  for (let k = 0; k < KEYS; k++) if (count[k] > 0) keys.push(k);
  keys.sort((p, q) => count[q] - count[p] || p - q);
  const kept = keys.slice(0, maxBins);
  const m = kept.length;
  const bins: Bins = {
    n: m,
    weight: new Float64Array(m),
    count: new Float64Array(m),
    flat: new Float64Array(m),
    lin: new Float64Array(m * 3),
    ok: new Float64Array(m * 3),
    totalCount: total,
  };
  const q: Vec3 = [0, 0, 0];
  kept.forEach((k, i) => {
    const c = count[k];
    bins.weight[i] = c;
    bins.count[i] = c;
    bins.flat[i] = k >> 18 ? c : 0;
    for (let ch = 0; ch < 3; ch++) bins.lin[i * 3 + ch] = sum[k * 3 + ch] / c;
    linearToOklab(bins.lin[i * 3], bins.lin[i * 3 + 1], bins.lin[i * 3 + 2], q);
    bins.ok[i * 3] = q[0];
    bins.ok[i * 3 + 1] = q[1];
    bins.ok[i * 3 + 2] = q[2];
  });
  return bins;
}

interface Candidate {
  kind: 'ink' | 'white';
  hex: Hex;
  art: Point;
  screens: number;
  weight: number;
}

function whiteScreens(ctx: SetContext): number {
  // on darks the white is the highlight screen, or the underbase alone (free) without one
  return ctx.dark ? (ctx.highlightWhite ? 1 : 0) : 1;
}

/** The art's colour clusters as candidate inks, near duplicates merged, the garment's colours dropped, whites folded into the white ink. */
function candidates(bins: Bins, ctx: SetContext): Candidate[] {
  const K = Math.min(MAX_CANDIDATES, bins.n);
  const raw: { hex: Hex; lab: ReturnType<typeof linearToLab>; w: number }[] = [];
  if (K > 0) {
    // the candidates are the flat colours first: edge blends weigh little in the clustering
    const weight = new Float64Array(bins.n);
    for (let b = 0; b < bins.n; b++) weight[b] = bins.flat[b] > 0 ? bins.weight[b] : EDGE_CLUSTER_WEIGHT * bins.weight[b];
    const cl = kmeans({ ...bins, weight }, K, SEED + K);
    const lin: Vec3 = [0, 0, 0];
    for (let c = 0; c < cl.k; c++) {
      if (cl.weights[c] <= 0) continue;
      oklabToLinear(cl.centres[c * 3], cl.centres[c * 3 + 1], cl.centres[c * 3 + 2], lin);
      const hex = hexOfLinear(lin);
      const l = linOfHex(hex);
      raw.push({ hex, lab: linearToLab(l[0], l[1], l[2]), w: cl.weights[c] });
    }
  }
  raw.sort((a, b) => b.w - a.w || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  const kept: typeof raw = [];
  for (const c of raw) {
    const near = kept.find((k) => deltaE2000(k.lab, c.lab) < CANDIDATE_MERGE_DE);
    if (near) near.w += c.w;
    else kept.push({ ...c });
  }
  const whiteLin = linOfHex(WHITE_INK_HEX);
  const whiteLab = linearToLab(whiteLin[0], whiteLin[1], whiteLin[2]);
  const out: Candidate[] = [];
  let white: Candidate | null = null;
  for (const c of kept) {
    if (deltaE2000(c.lab, ctx.garmentLab) <= ctx.knockoutDeltaE) continue;
    if (deltaE2000(c.lab, whiteLab) <= ENGINE_TUNING.whiteDeltaE) {
      // the art's whites print as the white ink; the heaviest white is what it stands for
      if (white) white.weight += c.w;
      else white = { kind: 'white', hex: WHITE_INK_HEX, art: pointOf(linOfHex(c.hex)), screens: whiteScreens(ctx), weight: c.w };
      continue;
    }
    out.push({ kind: 'ink', hex: c.hex, art: pointOf(linOfHex(c.hex)), screens: 1, weight: c.w });
  }
  // white is always on offer (pastels mix from it), unless it is the shirt
  if (!white && deltaE2000(whiteLab, ctx.garmentLab) > ctx.knockoutDeltaE) {
    white = { kind: 'white', hex: WHITE_INK_HEX, art: pointOf(whiteLin), screens: whiteScreens(ctx), weight: 0 };
  }
  if (white) out.push(white);
  return out;
}

/**
 * How well a two-colour mix (by area, linear light) reproduces x: OKLab
 * distance plus the grain charge, scaled by `grain` (0 for an edge's
 * anti-aliasing, which no one sees as grain).
 */
function mixCost(x: Point, p: Point, q: Point, scratch: Vec3, grain: number): number {
  const e0 = q.lin[0] - p.lin[0];
  const e1 = q.lin[1] - p.lin[1];
  const e2 = q.lin[2] - p.lin[2];
  const len2 = e0 * e0 + e1 * e1 + e2 * e2;
  let t = len2 > 0 ? ((x.lin[0] - p.lin[0]) * e0 + (x.lin[1] - p.lin[1]) * e1 + (x.lin[2] - p.lin[2]) * e2) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  linearToOklab(p.lin[0] + t * e0, p.lin[1] + t * e1, p.lin[2] + t * e2, scratch);
  const d = Math.hypot(scratch[0] - x.ok[0], scratch[1] - x.ok[1], scratch[2] - x.ok[2]);
  const contrast = Math.hypot(q.ok[0] - p.ok[0], q.ok[1] - p.ok[1], q.ok[2] - p.ok[2]);
  return d + grain * GRAIN * Math.sqrt(t * (1 - t)) * contrast + EXTRA_INK;
}

/** Bin x point costs: solids and two-colour mixes. Points are the candidates, then the garment. */
class CostTable {
  readonly B: number;
  readonly P: number;
  readonly single: Float32Array;
  readonly pair: Float32Array;
  private readonly pairIndex: Int32Array;
  private readonly NP: number;

  constructor(bins: Bins, points: Point[]) {
    const B = bins.n;
    const P = points.length;
    this.B = B;
    this.P = P;
    this.NP = (P * (P - 1)) / 2;
    this.pairIndex = new Int32Array(P * P).fill(-1);
    let k = 0;
    for (let p = 0; p < P; p++) {
      for (let q = p + 1; q < P; q++) {
        this.pairIndex[p * P + q] = k;
        this.pairIndex[q * P + p] = k;
        k++;
      }
    }
    this.single = new Float32Array(B * P);
    this.pair = new Float32Array(B * this.NP);
    const scratch: Vec3 = [0, 0, 0];
    for (let b = 0; b < B; b++) {
      const x: Point = {
        lin: [bins.lin[b * 3], bins.lin[b * 3 + 1], bins.lin[b * 3 + 2]],
        ok: [bins.ok[b * 3], bins.ok[b * 3 + 1], bins.ok[b * 3 + 2]],
      };
      const grain = bins.flat[b] > 0 ? 1 : 0;
      for (let p = 0; p < P; p++) {
        const o = points[p].ok;
        this.single[b * P + p] = Math.hypot(o[0] - x.ok[0], o[1] - x.ok[1], o[2] - x.ok[2]);
      }
      for (let p = 0; p < P; p++) {
        for (let q = p + 1; q < P; q++) this.pair[b * this.NP + this.pairIndex[p * P + q]] = mixCost(x, points[p], points[q], scratch, grain);
      }
    }
  }

  pairCost(b: number, p: number, q: number): number {
    return this.pair[b * this.NP + this.pairIndex[p * this.P + q]];
  }

  /** Per-bin cost of a point set (members include the garment), for the first `limit` bins. */
  costs(members: number[], out: Float64Array, limit = this.B): void {
    const { P } = this;
    for (let b = 0; b < limit; b++) {
      let v = Infinity;
      for (let i = 0; i < members.length; i++) {
        const p = members[i];
        const s = this.single[b * P + p];
        if (s < v) v = s;
        for (let j = i + 1; j < members.length; j++) {
          const c = this.pair[b * this.NP + this.pairIndex[p * P + members[j]]];
          if (c < v) v = c;
        }
      }
      out[b] = v;
    }
  }

  /** Weighted total when point c joins members, given the members' per-bin costs. */
  totalWith(c: number, members: number[], base: Float64Array, w: Float64Array): number {
    const { B, P } = this;
    let total = 0;
    for (let b = 0; b < B; b++) {
      let v = base[b];
      const s = this.single[b * P + c];
      if (s < v) v = s;
      const row = b * this.NP;
      for (let i = 0; i < members.length; i++) {
        const pc = this.pair[row + this.pairIndex[c * P + members[i]]];
        if (pc < v) v = pc;
      }
      total += w[b] * v;
    }
    return total;
  }
}

function weighted(costs: Float64Array, w: Float64Array): number {
  let s = 0;
  for (let b = 0; b < costs.length; b++) s += w[b] * costs[b];
  return s;
}

/**
 * The index inks for a set: at most `budget` colour screens (white counts
 * when it needs a screen of its own), the garment free. Locked inks (the
 * capsule's or the auditor's) are used as they are.
 */
export function chooseIndexPalette(cells: CellGrid, ctx: SetContext, budget: number, lockedInks?: Hex[]): IndexPalette {
  if (lockedInks && lockedInks.length > 0) {
    const inks = lockedInks.map((hex): IndexInk => {
      const h = rgb8ToHex(...hexToRgb8(hex));
      return { kind: 'ink', hex: h, art: linOfHex(h), screens: 1, share: 1 / lockedInks.length };
    });
    return { inks, meanCost: 0 };
  }
  const bins = cellBins(cells);
  if (bins.n === 0) return { inks: [], meanCost: 0 };
  const cands = candidates(bins, ctx);
  const C = cands.length;
  const garment = pointOf([ctx.garment[0], ctx.garment[1], ctx.garment[2]]);
  const table = new CostTable(bins, [...cands.map((c) => c.art), garment]);
  const G = C;
  const w = bins.weight;
  const W = w.reduce((s, v) => s + v, 0) || 1;
  const B = bins.n;

  // greedy: the ink that helps most per screen, while the screens allow
  const chosen: number[] = [];
  let screens = 0;
  const cur = new Float64Array(B);
  table.costs([G], cur);
  let E = weighted(cur, w);
  const taken = new Uint8Array(C);
  for (;;) {
    if (E / W <= GOOD_ENOUGH) break;
    const members = [...chosen, G];
    let best = -1;
    let bestScore = 0;
    for (let c = 0; c < C; c++) {
      if (taken[c] || screens + cands[c].screens > budget) continue;
      const gain = E - table.totalWith(c, members, cur, w);
      const score = gain / Math.max(1, cands[c].screens);
      if (score > bestScore + 1e-12) {
        bestScore = score;
        best = c;
      }
    }
    if (best < 0 || bestScore < MIN_GAIN * W) break;
    chosen.push(best);
    taken[best] = 1;
    screens += cands[best].screens;
    table.costs([...chosen, G], cur);
    E = weighted(cur, w);
  }

  // swaps: each chosen ink against every candidate left
  const base = new Float64Array(B);
  for (let pass = 0; pass < 3 && chosen.length > 0; pass++) {
    let improved = false;
    for (let si = 0; si < chosen.length; si++) {
      const s = chosen[si];
      const rest = chosen.filter((_, i) => i !== si);
      const members = [...rest, G];
      table.costs(members, base);
      let bestE = E;
      let best = -1;
      for (let c = 0; c < C; c++) {
        if (taken[c]) continue;
        if (screens - cands[s].screens + cands[c].screens > budget) continue;
        const e = table.totalWith(c, members, base, w);
        if (e < bestE - 1e-9 * W) {
          bestE = e;
          best = c;
        }
      }
      if (best >= 0) {
        taken[s] = 0;
        taken[best] = 1;
        screens += cands[best].screens - cands[s].screens;
        chosen[si] = best;
        E = bestE;
        improved = true;
      }
    }
    if (!improved) break;
  }

  // the same swaps scored as the dither will mix: three and four ink mixes
  // count too (a brown from black, red and green), which the pair table cannot see
  const points = [...cands.map((c) => c.art), garment];
  const mixFor = (members: number[]): MixFinder => {
    const lin = new Float64Array(members.length * 3);
    const ok = new Float64Array(members.length * 3);
    members.forEach((p, i) => {
      for (let ch = 0; ch < 3; ch++) {
        lin[i * 3 + ch] = points[p].lin[ch];
        ok[i * 3 + ch] = points[p].ok[ch];
      }
    });
    return new MixFinder(lin, ok);
  };
  const mix = newMix();
  // the bins that carry the art (they come heaviest first): the long tail of
  // anti-aliased edge colours would cost time and not change the choice
  let exactBins = 0;
  for (let acc = 0; exactBins < B && exactBins < EXACT_BINS && acc < EXACT_WEIGHT * W; exactBins++) acc += w[exactBins];
  const exactTotal = (members: number[], out: Float64Array, limit = exactBins): number => {
    table.costs(members, out, limit);
    let finder: MixFinder | null = null;
    let total = 0;
    for (let b = 0; b < limit; b++) {
      if (out[b] > MIX_CHECK) {
        finder ??= mixFor(members);
        finder.best(bins.lin[b * 3], bins.lin[b * 3 + 1], bins.lin[b * 3 + 2], bins.ok[b * 3], bins.ok[b * 3 + 1], bins.ok[b * 3 + 2], mix, bins.flat[b] > 0 ? 1 : 0);
        if (mix.cost < out[b]) out[b] = mix.cost;
      }
      total += w[b] * out[b];
    }
    return total;
  };
  E = exactTotal([...chosen, G], cur);
  for (let pass = 0; pass < 2 && chosen.length > 0; pass++) {
    let improved = false;
    for (let si = 0; si < chosen.length; si++) {
      const s = chosen[si];
      let bestE = E;
      let best = -1;
      for (let c = 0; c < C; c++) {
        if (taken[c]) continue;
        if (screens - cands[s].screens + cands[c].screens > budget) continue;
        const members = chosen.map((p, i) => (i === si ? c : p));
        members.push(G);
        const e = exactTotal(members, base);
        if (e < bestE - 1e-6 * W) {
          bestE = e;
          best = c;
        }
      }
      if (best >= 0) {
        taken[s] = 0;
        taken[best] = 1;
        screens += cands[best].screens - cands[s].screens;
        chosen[si] = best;
        E = bestE;
        improved = true;
      }
    }
    if (!improved) break;
  }
  E = exactTotal([...chosen, G], cur, B);

  // each ink onto the exact flat colour it prints as a solid: the heaviest
  // art colour it serves, averaged (linear light) with the colours right
  // around it, so noise is evened out but anti-aliased edges do not pull
  const P = table.P;
  const share = new Float64Array(chosen.length);
  const solidOf = new Int32Array(B).fill(-1);
  const anchor = new Int32Array(chosen.length).fill(-1);
  for (let b = 0; b < B; b++) {
    let bestI = -1;
    let bd = Infinity;
    for (let i = 0; i < chosen.length; i++) {
      const d = table.single[b * P + chosen[i]];
      if (d < bd) {
        bd = d;
        bestI = i;
      }
    }
    if (bestI < 0 || table.single[b * P + G] < bd) continue;
    share[bestI] += w[b];
    if (bd > POLISH_OK || bins.flat[b] === 0) continue;
    solidOf[b] = bestI;
    if (anchor[bestI] < 0 || w[b] > w[anchor[bestI]]) anchor[bestI] = b;
  }
  const sums = chosen.map(() => [0, 0, 0, 0]);
  for (let b = 0; b < B; b++) {
    const i = solidOf[b];
    if (i < 0) continue;
    const h = anchor[i];
    const d = Math.hypot(bins.ok[b * 3] - bins.ok[h * 3], bins.ok[b * 3 + 1] - bins.ok[h * 3 + 1], bins.ok[b * 3 + 2] - bins.ok[h * 3 + 2]);
    if (d > POLISH_NEAR_OK) continue;
    const s = sums[i];
    s[0] += w[b] * bins.lin[b * 3];
    s[1] += w[b] * bins.lin[b * 3 + 1];
    s[2] += w[b] * bins.lin[b * 3 + 2];
    s[3] += w[b];
  }
  const inks: IndexInk[] = chosen.map((c, i) => {
    const cand = cands[c];
    const s = sums[i];
    const art = s[3] > 0 ? linOfHex(hexOfLinear([s[0] / s[3], s[1] / s[3], s[2] / s[3]])) : cand.art.lin;
    const hex = cand.kind === 'white' ? WHITE_INK_HEX : hexOfLinear(art);
    return { kind: cand.kind, hex, art, screens: cand.screens, share: share[i] / W };
  });
  inks.sort((a, b) => b.share - a.share || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  return { inks, meanCost: E / W };
}
