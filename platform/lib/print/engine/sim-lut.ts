// The simulated-process lookup table: art colour (8-bit sRGB over the set's
// garment) to what every plate prints, from inverting the print model
// (sim-model.ts). 33 nodes a side, fitted only at the nodes the art's colours
// use, applied per pixel with trilinear interpolation.
//
// The table holds areas, not coverages: how much of a halftone cell each
// plate shows on top (and the bare garment). Many coverages print the same
// colour, and because the dots of every plate nest (one screen), a blend of
// two recipes' coverages is not a blend of their colours: two inks at
// similar coverage stack instead of sitting side by side. Areas blend as the
// colours do (dots mix by area in linear light), so they are what is
// interpolated, between nodes here and between pixels on the films
// (sim-screen.ts); coverages follow from the nesting (AreaSolver.nest).
//
// Each node: a strictly convex start (the colour as a mix of the plates'
// solid colours, with a cost that grows with each solid's distance from the
// colour, AreaRecipe), then the exact model fitted in area space from
// there; then two relaxation passes pull every node toward its neighbours, so
// neighbouring nodes keep one recipe. Nodes are fitted a little under the wet
// ink limit, so that blends of them mostly fit too; a blend that does not is
// mended per colour (LutApplier).
//
// Colours within the knockout tolerance of the garment are the garment: a
// node's target is pulled smoothly onto the garment from ΔE k down to k/2, so
// a fade into the shirt thins out instead of stopping at a contour, and the
// shirt itself (transparent art) prints nothing at all.
import type { Lab } from '@/lib/print/types';
import { SRGB8_TO_LINEAR, deltaE2000, linearToLab, srgbToLinear, type Vec3 } from './colour';
import { AREA_RIDGE, AreaSolver, NestedModel, OK_WEIGHT, nnls, okDistance, oklabWithJacobian, type SimConstraints, type SimPlateKind } from './sim-model';

/** Nodes per side. */
export const LUT_SIZE = 33;

export interface SimLutSpec {
  model: NestedModel;
  limits: SimConstraints;
  garment: Vec3;
  garmentLab: Lab;
  knockoutDeltaE: number;
  /** per plate, press order */
  kinds: SimPlateKind[];
  /** per plate: the colour it shows where it is on top (an ink over its base, the bare underbase,
   * the highlight over the underbase), linear */
  solid: Vec3[];
}

/** Visible areas per node: index 0 the bare garment, then each plate in press order. */
export interface SimLut {
  /** nodes per side */
  size: number;
  /** areas per node: the garment and each plate */
  m: number;
  /** size^3 * m areas, 0..1, summing to 1 at fitted nodes */
  values: Float32Array;
  fitted: Uint8Array;
  /** nodes fitted */
  nodes: number;
}

/** Area fit: cost per unit area of a solid, plus this per ΔE of its distance from the colour. */
const AREA_COST_BASE = 0.5;
const AREA_COST_PER_DE = 0.8;
/** ... the highlight white costs this much more than the bare underbase. */
const AREA_COST_HIGHLIGHT = 4;
/** the sum-to-one row's weight in the convex start */
const AREA_ONE = 60;
/** Nodes are fitted to this share of the wet ink limit, so blends between them have room under it. */
const NODE_LIMIT_SHARE = 0.88;
/** Relaxation: each node's areas are pulled toward its neighbours' (ΔE² per unit area²), this many times. */
const MU_AREA = 20;
const RELAX_PASSES = 2;

function smoothstep(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

/** How much of a colour prints (0 = it is the garment), from its ΔE to the garment. */
export function keepShare(lin: Vec3, garmentLab: Lab, knockoutDeltaE: number): number {
  if (!(knockoutDeltaE > 0)) return 1;
  const de = deltaE2000(linearToLab(lin[0], lin[1], lin[2]), garmentLab);
  return smoothstep((de - 0.5 * knockoutDeltaE) / (0.5 * knockoutDeltaE));
}

/** sRGB level (0..255, fractional) of node i. */
function nodeLevel(i: number): number {
  return (i * 255) / (LUT_SIZE - 1);
}

/**
 * The convex start of a node: the colour split into areas of the plates'
 * solid colours and the bare garment, mixed in linear light, with the area
 * costs and the ridge. One answer per colour, continuous in the colour.
 * Reusable: no allocation per call.
 */
export class AreaRecipe {
  readonly m: number;
  private readonly verts: Float64Array;
  readonly vertsOk: Float64Array;
  private readonly A: Float64Array;
  private readonly b: Float64Array;
  private readonly jac = new Float64Array(9);
  private readonly ok = new Float64Array(3);

  constructor(private readonly spec: SimLutSpec) {
    const n = spec.kinds.length;
    this.m = n + 1;
    this.verts = new Float64Array(this.m * 3);
    this.verts.set(spec.garment, 0);
    spec.solid.forEach((v, j) => this.verts.set(v, (j + 1) * 3));
    this.vertsOk = new Float64Array(this.m * 3);
    const t = new Float64Array(3);
    for (let v = 0; v < this.m; v++) {
      oklabWithJacobian(this.verts[v * 3], this.verts[v * 3 + 1], this.verts[v * 3 + 2], t);
      this.vertsOk.set(t, v * 3);
    }
    this.A = new Float64Array((4 + this.m) * this.m);
    this.b = new Float64Array(4 + this.m);
  }

  /** The area costs for a target (OKLab) into cost (m). */
  costs(targetOk: Float64Array, cost: Float64Array): void {
    for (let v = 0; v < this.m; v++) {
      const extra = v > 0 && this.spec.kinds[v - 1] === 'highlight' ? AREA_COST_HIGHLIGHT : 0;
      cost[v] = AREA_COST_BASE + AREA_COST_PER_DE * okDistance(this.vertsOk, v * 3, targetOk, 0) + extra;
    }
  }

  /** Areas (garment first, then the plates) for a target colour (linear) into w. */
  solve(target: Vec3, cost: Float64Array, w: Float64Array): void {
    const { m, verts, A, b, jac, ok } = this;
    oklabWithJacobian(target[0], target[1], target[2], ok, jac);
    A.fill(0);
    b.fill(0);
    const s = Math.sqrt(AREA_RIDGE);
    for (let v = 0; v < m; v++) {
      for (let r = 0; r < 3; r++) A[r * m + v] = (jac[r * 3] * verts[v * 3] + jac[r * 3 + 1] * verts[v * 3 + 1] + jac[r * 3 + 2] * verts[v * 3 + 2]) * OK_WEIGHT[r];
      A[3 * m + v] = AREA_ONE;
      // ridge * w^2 + cost * w, as a completed square
      A[(4 + v) * m + v] = s;
      b[4 + v] = -cost[v] / (2 * s);
    }
    for (let r = 0; r < 3; r++) b[r] = (jac[r * 3] * target[0] + jac[r * 3 + 1] * target[1] + jac[r * 3 + 2] * target[2]) * OK_WEIGHT[r];
    b[3] = AREA_ONE;
    nnls(A, 4 + m, m, b, w);
    let sum = 0;
    for (let v = 0; v < m; v++) sum += w[v];
    if (sum > 0) for (let v = 0; v < m; v++) w[v] /= sum;
  }
}

/**
 * Fits the table at the nodes around the cells the art uses. `cells` holds
 * the art's pixel count per cell ((LUT_SIZE - 1)^3). Every node is fitted on
 * its own (convex start, then the exact model in area space), so the result
 * does not depend on any order.
 */
export function buildSimLut(cells: Uint32Array, spec: SimLutSpec): SimLut {
  const S = LUT_SIZE;
  const C = S - 1;
  const total = S * S * S;
  const solver = new AreaSolver(spec.model, spec.kinds, spec.limits.wet, spec.limits.inkLimit * NODE_LIMIT_SHARE);
  const recipe = new AreaRecipe(spec);
  const m = recipe.m;
  const need = new Uint8Array(total);
  for (let r = 0; r < C; r++) {
    for (let g = 0; g < C; g++) {
      for (let b = 0; b < C; b++) {
        if (cells[(r * C + g) * C + b] === 0) continue;
        for (let c = 0; c < 8; c++) need[((r + (c >> 2)) * S + g + ((c >> 1) & 1)) * S + b + (c & 1)] = 1;
      }
    }
  }
  const values = new Float32Array(total * m);
  const w = new Float64Array(m);
  const cost = new Float64Array(m);
  const lin: Vec3 = [0, 0, 0];
  const target: Vec3 = [0, 0, 0];
  const targetOk = new Float64Array(3);
  const coords = (k: number): [number, number, number] => {
    const b = k % S;
    const g = ((k - b) / S) % S;
    return [(k - b - g * S) / (S * S), g, b];
  };
  /** Target (pulled toward the garment) and costs of node k; false when it is the garment. */
  const setNode = (k: number): boolean => {
    const [r, g, b] = coords(k);
    lin[0] = srgbToLinear(nodeLevel(r) / 255);
    lin[1] = srgbToLinear(nodeLevel(g) / 255);
    lin[2] = srgbToLinear(nodeLevel(b) / 255);
    const keep = keepShare(lin, spec.garmentLab, spec.knockoutDeltaE);
    if (keep <= 0) return false;
    const gm = spec.garment;
    for (let ch = 0; ch < 3; ch++) target[ch] = gm[ch] + (lin[ch] - gm[ch]) * keep;
    oklabWithJacobian(target[0], target[1], target[2], targetOk);
    recipe.costs(targetOk, cost);
    return true;
  };
  const store = (k: number): void => {
    let sum = 0;
    for (let v = 0; v < m; v++) sum += w[v];
    for (let v = 0; v < m; v++) values[k * m + v] = sum > 0 ? w[v] / sum : v === 0 ? 1 : 0;
  };
  const order: number[] = [];
  let nodes = 0;
  for (let k = 0; k < total; k++) {
    if (!need[k]) continue;
    nodes++;
    if (!setNode(k)) {
      values[k * m] = 1;
      continue;
    }
    recipe.solve(target, cost, w);
    solver.solve(w, targetOk, cost);
    store(k);
    order.push(k);
  }
  // relaxation: neighbouring nodes settle on the same partners
  const mean = new Float64Array(m);
  const own = new Float64Array(m);
  for (let pass = 0; pass < RELAX_PASSES; pass++) {
    for (const k of order) {
      const [r, g, b] = coords(k);
      mean.fill(0);
      let count = 0;
      const add = (q: number): void => {
        if (!need[q]) return;
        for (let v = 0; v < m; v++) mean[v] += values[q * m + v];
        count++;
      };
      if (r > 0) add(k - S * S);
      if (r < C) add(k + S * S);
      if (g > 0) add(k - S);
      if (g < C) add(k + S);
      if (b > 0) add(k - 1);
      if (b < C) add(k + 1);
      if (count === 0) continue;
      for (let v = 0; v < m; v++) mean[v] /= count;
      setNode(k);
      for (let v = 0; v < m; v++) own[v] = values[k * m + v];
      w.set(own);
      const eOwn = solver.solve(w, targetOk, cost, 40, mean, MU_AREA);
      own.set(w);
      w.set(mean);
      const eMean = solver.solve(w, targetOk, cost, 40, mean, MU_AREA);
      if (!(eMean < eOwn)) w.set(own);
      store(k);
    }
  }
  return { size: S, m, values, fitted: need, nodes };
}

/** Pixels this close (ΔE-like) to an ink's solid colour print it solid, blended in from SNAP_FAR. */
const SNAP_NEAR = 1;
const SNAP_FAR = 2.5;
/** A blend over the ink limit whose merged rings print within this (ΔE-like) of the colour is kept; else it is fitted again. */
const MERGE_OK = 3;
/** Repairs of over-limit blends: iterations, the light pull toward the blend, and the limit's weight. */
const REPAIR_ITER = 15;
const REPAIR_MU = 2;
const REPAIR_LIMIT_WEIGHT = 300;

interface Anchor {
  ok: Float64Array;
  /** areas: the ink alone, solid */
  areas: Float64Array;
}

/**
 * Plate areas for art colours, from the table. Per colour: the areas of the
 * 8 nodes around it, interpolated; blended into an ink's solid where the
 * colour is that ink (flat areas print solid, not as a 95% screen). A blend
 * of neighbouring recipes can stack more wet ink than the limit allows once
 * nested; its smallest rings are then folded into their nearest neighbours,
 * and if that misses the colour it is fitted again in area space, from and
 * near the blend, with the limit. The films nest the areas into coverages
 * pixel by pixel (sim-screen.ts).
 */
export class LutApplier {
  readonly n: number;
  private readonly m: number;
  private readonly solver: AreaSolver;
  private readonly recipe: AreaRecipe;
  private readonly anchors: Anchor[] = [];
  private readonly areas: Float64Array;
  private readonly blend: Float64Array;
  private readonly cost: Float64Array;
  private readonly cov: Float64Array;
  private readonly ok = new Float64Array(3);
  private readonly lin: Vec3 = [0, 0, 0];
  private readonly repaired = new Map<number, Uint8Array>();
  /** per 24-bit colour: 0 not seen yet, 1 prints, 2 the knockout takes it out entirely (the shirt shows) */
  private readonly knockout = new Uint8Array(1 << 24);
  /** colours looked up; those whose blend broke the ink limit (folded); those folding could not save (fitted again) */
  lookups = 0;
  merges = 0;
  repairs = 0;

  constructor(
    private readonly lut: SimLut,
    private readonly spec: SimLutSpec,
  ) {
    this.m = lut.m;
    this.n = lut.m - 1;
    this.solver = new AreaSolver(spec.model, spec.kinds, spec.limits.wet, spec.limits.inkLimit);
    this.recipe = new AreaRecipe(spec);
    this.areas = new Float64Array(this.m);
    this.blend = new Float64Array(this.m);
    this.cost = new Float64Array(this.m);
    this.cov = new Float64Array(this.n);
    const lin = new Float64Array(3);
    spec.kinds.forEach((kind, j) => {
      if (kind !== 'ink') return;
      const areas = new Float64Array(this.m);
      areas[j + 1] = 1;
      this.solver.nest(areas, this.cov);
      spec.model.eval(this.cov, lin);
      if (deltaE2000(linearToLab(lin[0], lin[1], lin[2]), spec.garmentLab) < spec.knockoutDeltaE + SNAP_FAR) return;
      const ok = new Float64Array(3);
      oklabWithJacobian(lin[0], lin[1], lin[2], ok);
      this.anchors.push({ ok, areas });
    });
  }

  private readonly bestAreas = new Float64Array(64);

  /** The colour a pixel should print (pulled toward the garment as the nodes are) into lin and ok. */
  private targetOk(r: number, g: number, b: number): void {
    const { lin, ok, spec } = this;
    lin[0] = SRGB8_TO_LINEAR[r];
    lin[1] = SRGB8_TO_LINEAR[g];
    lin[2] = SRGB8_TO_LINEAR[b];
    const keep = keepShare(lin, spec.garmentLab, spec.knockoutDeltaE);
    const gm = spec.garment;
    for (let ch = 0; ch < 3; ch++) lin[ch] = gm[ch] + (lin[ch] - gm[ch]) * keep;
    oklabWithJacobian(lin[0], lin[1], lin[2], ok);
  }

  /**
   * Folds rings of a blend over the ink limit: the smallest ring with a
   * hidden disc goes to the plate whose solid colour is nearest, until the
   * nested coverages fit the limit. Each fold frees a whole hidden disc for
   * the least change of colour.
   */
  private merge(): void {
    const { areas, cov, solver, spec, m } = this;
    for (let guard = 0; guard < m; guard++) {
      solver.nest(areas, cov);
      if (solver.wetSum(cov) <= spec.limits.inkLimit) return;
      // rings: plates with area that print after-plates inside them (the innermost has no hidden disc)
      let innermost = -1;
      for (let j = spec.kinds.length - 1; j >= 0; j--) {
        if (spec.kinds[j] !== 'underbase' && areas[j + 1] > 0) {
          innermost = j;
          break;
        }
      }
      let drop = -1;
      for (let j = 0; j < spec.kinds.length; j++) {
        if (j === innermost || spec.kinds[j] === 'underbase' || !(areas[j + 1] > 0)) continue;
        if (drop < 0 || areas[j + 1] < areas[drop + 1]) drop = j;
      }
      if (drop < 0) return;
      let into = -1;
      let best = Infinity;
      for (let j = 0; j < spec.kinds.length; j++) {
        if (j === drop || !(areas[j + 1] > 0)) continue;
        const d = okDistance(this.recipe.vertsOk, (drop + 1) * 3, this.recipe.vertsOk, (j + 1) * 3);
        if (d < best) {
          best = d;
          into = j;
        }
      }
      if (into >= 0) areas[into + 1] += areas[drop + 1];
      else areas[0] += areas[drop + 1];
      areas[drop + 1] = 0;
    }
  }

  /**
   * A blend over the ink limit that folding could not save, fitted again: from
   * the blend (held near it, lightly) and from the convex start, with the
   * limit weighed heavily; the one that prints closest within the limit wins.
   * Expects the target in lin and ok (targetOk); leaves the areas in areas.
   */
  private repair(): void {
    const { areas, cov, ok, solver, m, n, lin } = this;
    this.recipe.costs(ok, this.cost);
    this.blend.set(areas);
    let bestErr = Infinity;
    for (let attempt = 0; attempt < 2 && bestErr > MERGE_OK; attempt++) {
      if (attempt === 0) {
        solver.solve(areas, ok, this.cost, REPAIR_ITER, this.blend, REPAIR_MU, REPAIR_LIMIT_WEIGHT);
      } else {
        this.recipe.solve(lin, this.cost, areas);
        solver.solve(areas, ok, this.cost, REPAIR_ITER, null, 0, REPAIR_LIMIT_WEIGHT);
      }
      solver.nestWithinLimit(areas, cov);
      const err = solver.coverageError(cov, ok);
      if (err < bestErr) {
        bestErr = err;
        this.bestAreas.set(areas.subarray(0, m));
      }
    }
    void n;
    areas.set(this.bestAreas.subarray(0, m));
  }

  /** Plate areas (0..255, press order) for an 8-bit sRGB colour into out (n). */
  areas8(r: number, g: number, b: number, out: Uint8Array): void {
    const key = (r << 16) | (g << 8) | b;
    // A colour the knockout takes out entirely is the shirt: nothing prints there. The table can't say so by itself: its
    // neighbouring nodes lie up to a cell away from the shirt colour, only partly knocked out, and blended they would leave
    // a trace of ink that the films turn into scattered minimum dots across the empty print area.
    let state = this.knockout[key];
    if (state === 0) {
      const lin = this.lin;
      lin[0] = SRGB8_TO_LINEAR[r];
      lin[1] = SRGB8_TO_LINEAR[g];
      lin[2] = SRGB8_TO_LINEAR[b];
      state = keepShare(lin, this.spec.garmentLab, this.spec.knockoutDeltaE) <= 0 ? 2 : 1;
      this.knockout[key] = state;
    }
    if (state === 2) {
      out.fill(0);
      return;
    }
    const hit = this.repaired.get(key);
    if (hit) {
      out.set(hit);
      return;
    }
    const { m, n, areas, cov, ok, solver, spec } = this;
    this.lookups++;
    lutAreas(this.lut, r, g, b, areas);
    oklabWithJacobian(SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b], ok);
    let best: Anchor | null = null;
    let bestD = SNAP_FAR;
    for (const an of this.anchors) {
      const d = okDistance(ok, 0, an.ok, 0);
      if (d < bestD) {
        bestD = d;
        best = an;
      }
    }
    if (best) {
      const t = Math.min(1, (SNAP_FAR - bestD) / (SNAP_FAR - SNAP_NEAR));
      const s = t * t * (3 - 2 * t);
      for (let v = 0; v < m; v++) areas[v] += (best.areas[v] - areas[v]) * s;
    }
    solver.nest(areas, cov);
    let repaired = false;
    if (solver.wetSum(cov) > spec.limits.inkLimit) {
      this.merge();
      solver.nestWithinLimit(areas, cov);
      this.targetOk(r, g, b);
      if (solver.coverageError(cov, ok) > MERGE_OK) {
        this.repair();
        repaired = true;
        this.repairs++;
      }
      this.merges++;
    }
    for (let j = 0; j < n; j++) {
      const v = areas[j + 1];
      out[j] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
    }
    if (repaired) this.repaired.set(key, Uint8Array.from(out));
  }
}

/** Trilinear areas of the table at an 8-bit sRGB colour. */
export function lutAreas(lut: SimLut, r8: number, g8: number, b8: number, out: Float64Array): void {
  const s = lut.size - 1;
  const n = lut.m;
  const fr = (r8 * s) / 255;
  const fg = (g8 * s) / 255;
  const fb = (b8 * s) / 255;
  const ir = Math.min(s - 1, Math.floor(fr));
  const ig = Math.min(s - 1, Math.floor(fg));
  const ib = Math.min(s - 1, Math.floor(fb));
  const tr = fr - ir;
  const tg = fg - ig;
  const tb = fb - ib;
  out.fill(0);
  const size = lut.size;
  for (let c = 0; c < 8; c++) {
    const dr = c >> 2;
    const dg = (c >> 1) & 1;
    const db = c & 1;
    const w = (dr ? tr : 1 - tr) * (dg ? tg : 1 - tg) * (db ? tb : 1 - tb);
    if (w === 0) continue;
    const o = (((ir + dr) * size + ig + dg) * size + ib + db) * n;
    for (let j = 0; j < n; j++) out[j] += w * lut.values[o + j];
  }
}

/** Table cell of an 8-bit level. */
export function lutCell(v: number): number {
  return Math.min(LUT_SIZE - 2, Math.floor((v * (LUT_SIZE - 1)) / 255));
}

