// Films at the screen resolution, rendered from the work-grid records. Each
// plate's coverage is resampled (Lanczos-3) row by row. Where the source
// pixels around an output pixel are all hard (solid, bare, or an
// anti-aliased edge between the two) the value is thresholded at 50%, so
// edges come out smooth at any scale; elsewhere (fades, tints, a partial
// underbase) it is halftoned on the set's one screen. Then traps (each ink
// spreads under the inks printed after it), the underbase choke, thin-line
// checks, registration targets and the label strip.
import type { InkPlate, InkSystemProfile, PlateLabelInfo, PlateRole, PrintRecipe, ScreenSet, Warning } from '@/lib/print/types';
import { ENGINE_TUNING, STANDARD_MAX_SCREENS, WHITE_INK_HEX } from '@/lib/print/defaults';
import { clientColourName } from '@/lib/print/colour-names';
import { deltaE2000, hexToLab, linearToLab, roundLab } from './colour';
import { makeScreen, makeTransfer, screenRow, transfer } from './halftone';
import { chokeBy, spreadInto, thinPixels, type MaskView } from './morphology';
import { drawLabelStrip, drawTargets, type LabelLines } from './marks';
import { FieldResampler, type FieldRowFill } from './raster';
import { plannedPlates, plateFactors, type PlanPlate, type Records, type SetAnalysis } from './analyse';
import { canvasSpec, mmToPx, type PrintSize } from './units';

export interface RenderInput {
  analysis: SetAnalysis;
  key: string;
  garmentCodes: string[];
  /** the print area at recipe.screenPpi */
  size: PrintSize;
  recipe: PrintRecipe;
  inks: InkSystemProfile;
  label: PlateLabelInfo;
  /** names for warnings, by garment code */
  garmentNames: Record<string, string>;
}

interface PlateStats {
  on: number;
  halftoned: number;
}

function fillFor(rec: Records, factors: Float32Array): FieldRowFill {
  const { width: w, labA, tA, labB, tB, s } = rec;
  return (j, values, hard, range) => {
    let lo = w;
    let hi = -1;
    const base = j * w;
    for (let x = 0; x < w; x++) {
      const i = base + x;
      const va = factors[labA[i]] * (tA[i] / 255);
      const share = s[i];
      let v: number;
      let hd: number;
      if (share === 0) {
        v = va;
        hd = va === 0 || va === 1 ? 1 : 0;
      } else {
        const sf = share / 255;
        const vb = factors[labB[i]] * (tB[i] / 255);
        v = va * (1 - sf) + vb * sf;
        hd = (va === 0 || va === 1) && (vb === 0 || vb === 1) ? 1 : 0;
      }
      values[x] = v;
      hard[x] = hd;
      if (v > 0) {
        if (x < lo) lo = x;
        hi = x;
      }
    }
    range[0] = lo;
    range[1] = hi + 1;
    return hi >= 0;
  };
}

/**
 * Renders one plate into `out` (the canvas) and its footprint into `foot`
 * (print-area sized, 1 where the plate's area is): solid footprint for inks
 * (coverage of at least 50%), any coverage for the underbase.
 */
function renderPlate(
  rec: Records,
  factors: Float32Array,
  size: PrintSize,
  canvasWidth: number,
  artX: number,
  artY: number,
  recipe: PrintRecipe,
  footprint: 'solid' | 'any',
  out: Uint8Array,
  foot: Uint8Array,
): PlateStats {
  const Wp = size.widthPx;
  const Hp = size.heightPx;
  const res = new FieldResampler(rec.width, rec.height, Wp, Hp, fillFor(rec, factors));
  const screen = makeScreen(recipe.halftone, size.ppi);
  const lut = makeTransfer(recipe.halftone);
  const anyLevel = Math.max(1e-3, recipe.halftone.minDot / 2);
  const values = new Float32Array(Wp);
  const th = new Float32Array(Wp);
  const { c0, c1 } = res;
  let on = 0;
  let halftoned = 0;
  foot.fill(0);
  for (let y = 0; y < Hp; y++) {
    const range = res.row(y, values);
    if (!range) continue;
    const [x0, x1] = range;
    const hard0 = res.hard0;
    const hard1 = res.hard1;
    const outRow = (artY + y) * canvasWidth + artX;
    const footRow = y * Wp;
    let thReady = false;
    for (let x = x0; x < x1; x++) {
      const v = values[x];
      if (!(v > 0)) continue;
      const a = c0[x];
      const b = c1[x];
      const hard = hard0[a] & hard0[b] & hard1[a] & hard1[b];
      let ink: boolean;
      if (hard) {
        ink = v >= 0.5;
      } else {
        if (!thReady) {
          screenRow(screen, artY + y, artX + x0, x1 - x0, th);
          thReady = true;
        }
        ink = transfer(lut, v) > th[x - x0];
        if (ink) halftoned++;
      }
      if (ink) {
        out[outRow + x] = 255;
        on++;
      }
      if (footprint === 'solid' ? v >= 0.5 : hard ? v >= 0.5 : v > anyLevel) foot[footRow + x] = 1;
    }
  }
  return { on, halftoned };
}

function safeClientName(hex: string): string | undefined {
  try {
    return clientColourName(hex);
  } catch {
    // WP6 owns the names; a missing table must not stop a separation
    return undefined;
  }
}

function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

export function setTitle(key: string, garmentNames: Record<string, string>): string {
  if (key === 'darks') return 'Darks';
  if (key === 'lights') return 'Lights';
  return garmentNames[key] ?? key;
}

/** The standard label strip of a plate. `inkName` replaces the hex once a Pantone code is known. */
export function plateLabelLines(
  label: PlateLabelInfo,
  setName: string,
  plate: Pick<InkPlate, 'index' | 'role' | 'base' | 'target' | 'halftone'>,
  total: number,
  inks: InkSystemProfile,
  inkName?: string,
): LabelLines {
  const screen = `${formatNumber(plate.halftone.lpi)} lpi ${formatNumber(plate.halftone.angleDeg)}°`;
  const what =
    plate.role === 'underbase'
      ? `Underbase · ${inks.underbase.ink} · flash`
      : plate.role === 'highlight'
        ? `Highlight white · ${inks.highlightWhite.ink}`
        : `${inkName ?? `Ink ${plate.target.hex}`} · ${plate.base}`;
  return {
    // The film's place in the press order leads: a strip too narrow for the whole line cuts from the end.
    left: `${plate.index}/${total} · ${label.designCode} v${label.version} · ${label.placementLabel} · ${setName}`,
    right: `${what} · ${screen}`,
    topLeft: 'Top ↑',
    topRight: 'Print as is · no scaling',
  };
}

function view(data: Uint8Array, stride: number, x: number, y: number, width: number, height: number): MaskView {
  return { data, stride, offset: y * stride + x, width, height };
}

/** All plates of one screen set, with marks, labels and warnings. */
export function renderSet(input: RenderInput): ScreenSet {
  const { analysis: a, size, recipe, inks, label } = input;
  const canvas = canvasSpec(size, recipe.marks.marginMm);
  const W = canvas.widthPx;
  const H = canvas.heightPx;
  const art = canvas.art;
  const area = art.width * art.height;
  const plan = plannedPlates(a);
  const total = plan.length;
  const datas = plan.map(() => new Uint8Array(W * H));
  const foot = new Uint8Array(area);
  const later = new Uint8Array(area);
  const scratch = new Uint8Array(area);
  const footView = view(foot, art.width, 0, 0, art.width, art.height);
  const laterView = view(later, art.width, 0, 0, art.width, art.height);
  const scratchView = view(scratch, art.width, 0, 0, art.width, art.height);
  const stats: { on: number; halftoned: number; thinMm2: number }[] = plan.map(() => ({ on: 0, halftoned: 0, thinMm2: 0 }));
  // whole pixels: a disc of radius n reaches exactly n pixels sideways
  const trapPx = Math.round(mmToPx(recipe.trapMm, size.ppi));
  const chokePx = Math.round(mmToPx(recipe.underbaseChokeMm, size.ppi));
  const thinRadius = mmToPx(recipe.minLineMm, size.ppi) / 2;
  const pxArea = (25.4 / size.ppi) ** 2;

  // Last printed first: each ink then spreads under the footprints of the
  // inks printed after it (darker inks, and the highlight white on top).
  const order = plan.map((_, i) => i).filter((i) => plan[i].key.role !== 'underbase').reverse();
  for (const i of order) {
    const p = plan[i];
    const plateView = view(datas[i], W, art.x, art.y, art.width, art.height);
    const st = renderPlate(a.records, plateFactors(p.key, a.entries), size, W, art.x, art.y, recipe, 'solid', datas[i], foot);
    stats[i].on = st.on;
    stats[i].halftoned = st.halftoned;
    if (thinRadius >= 1) {
      const t = thinPixels(footView, thinRadius, scratchView);
      stats[i].thinMm2 = t.thin * pxArea;
    }
    if (p.key.role === 'ink' && trapPx > 0) stats[i].on += spreadInto(plateView, laterView, trapPx);
    for (let k = 0; k < area; k++) later[k] |= foot[k];
  }
  const ub = plan.findIndex((p) => p.key.role === 'underbase');
  if (ub >= 0) {
    const plateView = view(datas[ub], W, art.x, art.y, art.width, art.height);
    const st = renderPlate(a.records, plateFactors(plan[ub].key, a.entries), size, W, art.x, art.y, recipe, 'any', datas[ub], foot);
    stats[ub].on = st.on - (chokePx > 0 ? chokeBy(plateView, footView, chokePx) : 0);
    stats[ub].halftoned = st.halftoned;
  }

  const setName = setTitle(input.key, input.garmentNames);
  const whiteLab = roundLab(hexToLab(WHITE_INK_HEX));
  const plates: InkPlate[] = plan.map((p, i) => {
    const entry = p.key.role === 'underbase' ? null : a.entries[p.key.entry];
    const role: PlateRole = p.key.role;
    const colourInk = role === 'ink' && entry !== null;
    const hex = colourInk ? entry.hex : WHITE_INK_HEX;
    const base = role === 'underbase' ? inks.underbase.ink : role === 'highlight' ? inks.highlightWhite.ink : (entry?.base ?? inks.bases.light);
    const halftoneShare = stats[i].on > 0 ? stats[i].halftoned / stats[i].on : 0;
    const plate: InkPlate = {
      index: i + 1,
      role,
      target: { hex, lab: colourInk ? roundLab(entry.lab) : whiteLab },
      base,
      pantone: null,
      clientName: role === 'underbase' ? 'White underbase' : role === 'highlight' ? 'Highlight white' : safeClientName(hex),
      plate: { width: W, height: H, ppi: size.ppi, data: datas[i] },
      coverage: area > 0 ? stats[i].on / area : 0,
      halftone: { ...recipe.halftone },
      meshSuggestion: role === 'underbase' ? inks.mesh.underbase : halftoneShare > 0.05 ? inks.mesh.halftone : inks.mesh.solid,
    };
    drawTargets(plate.plate.data, canvas, recipe.marks.targetOffsetMm);
    drawLabelStrip(plate.plate.data, canvas, recipe.marks.targetOffsetMm, plateLabelLines(label, setName, plate, total, inks));
    return plate;
  });

  return {
    key: input.key,
    garmentCodes: input.garmentCodes,
    needsUnderbase: a.dark,
    method: a.method,
    canvas,
    plates,
    warnings: setWarnings(input, plan, plates, stats),
  };
}

function setWarnings(input: RenderInput, plan: PlanPlate[], plates: InkPlate[], stats: { thinMm2: number }[]): Warning[] {
  const { analysis: a, recipe, inks, garmentNames } = input;
  const out: Warning[] = [];
  const setName = setTitle(input.key, garmentNames);
  const name = (p: InkPlate): string => (p.role === 'ink' ? `${p.clientName ?? 'ink'} (${p.target.hex})` : 'the highlight white');
  // a draft for index or simulated process is not what will print: no line warnings on it
  const thin = plates
    .map((p, i) => ({ p, mm2: plan[i].key.role === 'underbase' || a.method !== 'spot' ? 0 : stats[i].thinMm2 }))
    .filter((t) => t.mm2 >= ENGINE_TUNING.thinLineMinAreaMm2)
    .sort((a, b) => b.mm2 - a.mm2);
  if (thin.length > 0) {
    const listed = thin.slice(0, 3).map((t) => name(t.p));
    const more = thin.length > 3 ? ` and ${thin.length - 3} more` : '';
    out.push({
      code: 'thin_lines',
      severity: 'review',
      message: `${setName}: lines under ${formatNumber(recipe.minLineMm)} mm in ${listed.join(', ')}${more} may close up in screen print.`,
    });
  }
  const screens = plates.length;
  if (screens > inks.pressHeads) {
    out.push({ code: 'press_heads', severity: 'review', message: `${setName}: ${screens} screens, more than the ${inks.pressHeads} heads on the press. Plan the run for it.` });
  }
  if (screens > STANDARD_MAX_SCREENS) {
    const extra = screens - STANDARD_MAX_SCREENS;
    out.push({ code: 'extra_screens', severity: 'info', message: `${setName}: ${screens} screens, ${extra} above the standard ${STANDARD_MAX_SCREENS}. A screen-printed run pays €${extra} per piece more.` });
  }
  for (const e of a.entries) {
    if (e.kind !== 'ink') continue;
    const de = deltaE2000(linearToLab(e.appearance[0], e.appearance[1], e.appearance[2]), a.ctx.garmentLab);
    if (de < ENGINE_TUNING.lowContrastDeltaE) {
      const garment = garmentNames[a.reference.code] ?? a.reference.name;
      out.push({ code: 'low_contrast_ink', severity: 'review', message: `${safeClientName(e.hex) ?? 'An ink'} (${e.hex}) barely shows on ${garment} (ΔE ${de.toFixed(1)}).` });
    }
  }
  const garments = input.garmentCodes.map((c) => garmentNames[c] ?? c).join(', ');
  if (plates.length === 0) {
    out.push({ code: 'empty_print', severity: 'block', message: `Screen print: nothing prints on ${garments}. The art is the same colour as the shirt.` });
  } else if (a.stats.knockedOut >= 0.01) {
    out.push({
      code: 'knocked_out',
      severity: 'info',
      message: `On ${garmentNames[a.reference.code] ?? a.reference.name}, ${Math.round(a.stats.knockedOut * 100)}% of the art is within ΔE ${formatNumber(recipe.knockoutDeltaE)} of the shirt colour, so the shirt shows there instead of ink.`,
    });
  }
  return out;
}
