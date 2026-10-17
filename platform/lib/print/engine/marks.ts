// Registration targets and the label strip on every film. The film is the
// design plus its margins (units.ts filmCanvas; owner decision, 16 Oct 2026):
// clear film at each side, and above and below the design, going out from it,
// the ink-deposit gap (clear film), then a row with a registration target at
// each end and the label strip between them, then the film's edge. So the
// targets sit at the four corners, in the top and bottom margins only, centred
// on the design's left and right edges. A target is a circle plus crosshair,
// 10 mm across, drawn from integer centres so every plate of a set carries the
// exact same pixels. Labels use the built-in stroke font (font.ts) and are
// fitted between the targets, never over them and never into the ink gap.
//
// With the default layout (10 mm at the sides, 27 mm above and below, a 10 mm
// ink gap) a target's centre is 15 mm from the design, its edge 20 mm, and
// 7 mm of film is left to the sheet's edge.
//
// A canvas stored before engine 3 has no layout: its targets sit at the four
// side centres, targetOffsetMm outside the art, with the label strip either
// side of the top and bottom ones. That geometry is kept so the label strip of
// such a film can still be redrawn (relabelPlate) and its marks checked.
import type { CanvasSpec, PixelRect } from '@/lib/print/types';
import { CAP_UNITS, glyphFor, textUnits } from './font';
import { mmToPx } from './units';

/** A target's arms reach this far from its centre (10 mm across); its ring is at 0.6 of that; lines are 0.3 mm. */
const TARGET_ARM_MM = 5;
const TARGET_RING_SHARE = 0.6;
const TARGET_STROKE_MM = 0.3;
/** clear film kept between a target or a label and the film's edge */
const EDGE_CLEAR_MM = 1;
/** clear film between a target and the label beside it */
const LABEL_CLEAR_MM = 3;
/** between the two labels of a row */
const LABEL_SPACING_MM = 6;
/** canvases from before engine 3: one margin all round, targets this far outside the art */
const LEGACY_MARGIN_MM = 25;
const LEGACY_TARGET_OFFSET_MM = 15;

export type MarkName = 'top left' | 'top right' | 'bottom left' | 'bottom right' | 'top' | 'bottom' | 'left' | 'right';

export interface TargetGeometry {
  /** target centres: top left, top right, bottom left, bottom right (on a canvas from before engine 3: top, bottom, left, right) */
  centres: { name: MarkName; x: number; y: number }[];
  ringRadiusPx: number;
  /** the crosshair's reach from the centre, which is also the target's whole reach */
  armPx: number;
  strokePx: number;
}

/**
 * Where the targets go: at the corners, in the top and bottom margins, with
 * exactly the ink gap in whole rows of clear film between the art and the
 * nearest target pixel. A target is 10 mm across unless the recipe's margins
 * leave less room. `legacyTargetOffsetMm` places the targets of a canvas made
 * before engine 3 (one without a layout).
 */
export function targetGeometry(canvas: CanvasSpec, legacyTargetOffsetMm?: number): TargetGeometry {
  const { layout, ppi, art } = canvas;
  if (!layout) return legacyTargetGeometry(canvas, legacyTargetOffsetMm ?? LEGACY_TARGET_OFFSET_MM);
  const armMm = Math.max(1, Math.min(TARGET_ARM_MM, (layout.endMarginMm - layout.inkGapMm - EDGE_CLEAR_MM) / 2, layout.sideMarginMm - EDGE_CLEAR_MM));
  const armPx = Math.round(mmToPx(armMm, ppi));
  const off = Math.round(mmToPx(layout.inkGapMm, ppi)) + armPx + 1;
  const left = art.x;
  const right = art.x + art.width - 1;
  const top = art.y - off;
  const bottom = art.y + art.height - 1 + off;
  return {
    centres: [
      { name: 'top left', x: left, y: top },
      { name: 'top right', x: right, y: top },
      { name: 'bottom left', x: left, y: bottom },
      { name: 'bottom right', x: right, y: bottom },
    ],
    ringRadiusPx: mmToPx(armMm * TARGET_RING_SHARE, ppi),
    armPx,
    strokePx: Math.max(1, mmToPx(TARGET_STROKE_MM, ppi)),
  };
}

/** Engine 2: the side centres, pulled inward when the margin is too narrow for the offset. */
function legacyTargetGeometry(canvas: CanvasSpec, targetOffsetMm: number): TargetGeometry {
  const { ppi, art } = canvas;
  const marginMm = canvas.marginMm ?? LEGACY_MARGIN_MM;
  const offsetMm = Math.max(3, Math.min(targetOffsetMm, marginMm - 2.5));
  const armMm = Math.max(1, Math.min(6, offsetMm - 2, marginMm - offsetMm - 1));
  const off = Math.round(mmToPx(offsetMm, ppi));
  const cx = Math.round(art.x + art.width / 2);
  const cy = Math.round(art.y + art.height / 2);
  return {
    centres: [
      { name: 'top', x: cx, y: art.y - off },
      { name: 'bottom', x: cx, y: art.y + art.height - 1 + off },
      { name: 'left', x: art.x - off, y: cy },
      { name: 'right', x: art.x + art.width - 1 + off, y: cy },
    ],
    ringRadiusPx: mmToPx(armMm * TARGET_RING_SHARE, ppi),
    armPx: Math.round(mmToPx(armMm, ppi)),
    strokePx: Math.max(1, mmToPx(TARGET_STROKE_MM, ppi)),
  };
}

/** Bounding boxes of the four targets, named, clipped to the canvas (for checks). */
export function targetBoxes(canvas: CanvasSpec, legacyTargetOffsetMm?: number): (PixelRect & { name: MarkName })[] {
  const g = targetGeometry(canvas, legacyTargetOffsetMm);
  const r = g.armPx + Math.ceil(g.strokePx);
  return g.centres.map(({ name, x, y }) => ({ ...clipRect({ x: x - r, y: y - r, width: 2 * r + 1, height: 2 * r + 1 }, canvas), name }));
}

function clipRect(rect: PixelRect, canvas: CanvasSpec): PixelRect {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(canvas.widthPx, rect.x + rect.width);
  const y1 = Math.min(canvas.heightPx, rect.y + rect.height);
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}

/** Draws one target of `g` centred on (cx, cy) (255 = black on the film). */
export function drawTarget(data: Uint8Array, canvas: CanvasSpec, g: TargetGeometry, cx: number, cy: number): void {
  const half = g.strokePx / 2;
  const reach = g.armPx + Math.ceil(half);
  for (let dy = -reach; dy <= reach; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= canvas.heightPx) continue;
    for (let dx = -reach; dx <= reach; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= canvas.widthPx) continue;
      const onRing = Math.abs(Math.hypot(dx, dy) - g.ringRadiusPx) <= half;
      const onH = Math.abs(dy) <= half && Math.abs(dx) <= g.armPx;
      const onV = Math.abs(dx) <= half && Math.abs(dy) <= g.armPx;
      if (onRing || onH || onV) data[y * canvas.widthPx + x] = 255;
    }
  }
}

/** Draws the four targets (255 = black on the film). */
export function drawTargets(data: Uint8Array, canvas: CanvasSpec, legacyTargetOffsetMm?: number): void {
  const g = targetGeometry(canvas, legacyTargetOffsetMm);
  for (const c of g.centres) drawTarget(data, canvas, g, c.x, c.y);
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export interface TextStyle {
  capPx: number;
  strokePx: number;
}

export function textWidthPx(text: string, style: TextStyle): number {
  return (textUnits(text) * style.capPx) / CAP_UNITS + style.strokePx;
}

/** Draws one line with its baseline at y. align picks which end x anchors. */
export function drawText(data: Uint8Array, stride: number, rows: number, x: number, baselineY: number, text: string, style: TextStyle, align: 'left' | 'right' | 'centre' = 'left'): void {
  const unit = style.capPx / CAP_UNITS;
  const width = textWidthPx(text, style);
  let pen = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  pen += style.strokePx / 2;
  const half = style.strokePx / 2;
  for (const ch of Array.from(text)) {
    const glyph = glyphFor(ch);
    for (const stroke of glyph.strokes) {
      const pts: [number, number][] = [];
      for (let k = 0; k + 1 < stroke.length; k += 2) pts.push([pen + stroke[k] * unit, baselineY - stroke[k + 1] * unit]);
      if (pts.length === 1) pts.push(pts[0]);
      for (let k = 0; k + 1 < pts.length; k++) drawCapsule(data, stride, rows, pts[k], pts[k + 1], half);
    }
    pen += (glyph.width + 1) * unit;
  }
}

function drawCapsule(data: Uint8Array, stride: number, rows: number, a: [number, number], b: [number, number], half: number): void {
  const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - half - 1));
  const x1 = Math.min(stride - 1, Math.ceil(Math.max(a[0], b[0]) + half + 1));
  const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - half - 1));
  const y1 = Math.min(rows - 1, Math.ceil(Math.max(a[1], b[1]) + half + 1));
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const h2 = half * half;
  for (let y = y0; y <= y1; y++) {
    const py = y + 0.5;
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      let t = len2 > 0 ? ((px - a[0]) * dx + (py - a[1]) * dy) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - (a[0] + t * dx);
      const ey = py - (a[1] + t * dy);
      if (ex * ex + ey * ey <= h2) data[y * stride + x] = 255;
    }
  }
}

// ---------------------------------------------------------------------------
// Label strip
// ---------------------------------------------------------------------------

export interface LabelLines {
  /** the bottom row, from the bottom left target: film n/N, design, version, placement, set */
  left: string;
  /** the bottom row, up to the bottom right target: ink, base, screen */
  right: string;
  /** the top row, from the top left target */
  topLeft?: string;
  /** the top row, up to the top right target */
  topRight?: string;
}

/** One row of the label strip: the film from x0 to x1 around centreY, where text may reach halfHeight above and
 * below the centre line. A row between two targets holds a text at each end (on a canvas from before engine 3,
 * each row is one side of a target and holds one text, anchored next to it). */
export interface LabelBand {
  x0: number;
  x1: number;
  centreY: number;
  halfHeight: number;
  slots: { key: keyof LabelLines; anchor: 'left' | 'right' }[];
}

/** The rows of the label strip: the bottom row (left and right), then the top row (topLeft and topRight). */
export function labelBands(canvas: CanvasSpec, legacyTargetOffsetMm?: number): LabelBand[] {
  const { layout, ppi, art } = canvas;
  if (!layout) return legacyLabelBands(canvas, legacyTargetOffsetMm ?? LEGACY_TARGET_OFFSET_MM);
  const g = targetGeometry(canvas);
  const [tl, tr, bl, br] = g.centres;
  const clear = g.armPx + Math.round(mmToPx(LABEL_CLEAR_MM, ppi));
  const gapPx = Math.round(mmToPx(layout.inkGapMm, ppi));
  const edge = Math.ceil(mmToPx(EDGE_CLEAR_MM, ppi));
  // the same reach in both rows: out of the ink gap on one side, off the film's edge on the other
  const halfHeight = Math.max(1, Math.min(tl.y - edge, art.y - gapPx - 1 - tl.y, bl.y - (art.y + art.height + gapPx), canvas.heightPx - 1 - edge - bl.y));
  return [
    { x0: bl.x + clear, x1: br.x - clear, centreY: bl.y, halfHeight, slots: [{ key: 'left', anchor: 'left' }, { key: 'right', anchor: 'right' }] },
    { x0: tl.x + clear, x1: tr.x - clear, centreY: tl.y, halfHeight, slots: [{ key: 'topLeft', anchor: 'left' }, { key: 'topRight', anchor: 'right' }] },
  ];
}

/** Engine 2: either side of the top and bottom targets, from 3 mm inside the canvas's edge. */
function legacyLabelBands(canvas: CanvasSpec, targetOffsetMm: number): LabelBand[] {
  const g = legacyTargetGeometry(canvas, targetOffsetMm);
  const pad = Math.round(mmToPx(3, canvas.ppi));
  const gap = g.armPx + Math.round(mmToPx(3, canvas.ppi));
  const [top, bottom] = g.centres;
  // half the band between the art (plus 2 mm) and the canvas edge (minus 1 mm)
  const bandTop = canvas.art.y + canvas.art.height + mmToPx(2, canvas.ppi);
  const bandBottom = canvas.heightPx - mmToPx(1, canvas.ppi);
  const halfHeight = Math.max(1, Math.min(bottom.y - bandTop, bandBottom - bottom.y));
  const W = canvas.widthPx;
  return [
    { x0: pad, x1: bottom.x - gap, centreY: bottom.y, halfHeight, slots: [{ key: 'left', anchor: 'right' }] },
    { x0: bottom.x + gap, x1: W - pad, centreY: bottom.y, halfHeight, slots: [{ key: 'right', anchor: 'left' }] },
    { x0: pad, x1: top.x - gap, centreY: top.y, halfHeight, slots: [{ key: 'topLeft', anchor: 'right' }] },
    { x0: top.x + gap, x1: W - pad, centreY: top.y, halfHeight, slots: [{ key: 'topRight', anchor: 'left' }] },
  ];
}

const CAP_SIZES_MM = [3, 2.5, 2];
/** baseline to baseline, in cap heights */
const LEAD = 1.5;

function styleFor(capMm: number, ppi: number): TextStyle {
  const capPx = mmToPx(capMm, ppi);
  return { capPx, strokePx: Math.max(1, capPx * 0.13) };
}

/** Whether `lines` lines, centred on a row, stay within halfHeight of its centre line: the caps, a comma's
 * descent below the last baseline (a sixth of the cap) and half the stroke. */
function fitsHeight(style: TextStyle, lines: number, halfHeight: number): boolean {
  const block = style.capPx + (lines - 1) * LEAD * style.capPx;
  return block / 2 + style.capPx / CAP_UNITS + style.strokePx / 2 <= halfHeight;
}

/** Splits 'a · b · c · d' into two lines at the separator nearest the middle. */
function splitInTwo(text: string): [string, string] | null {
  const parts = text.split(' · ');
  if (parts.length < 2) return null;
  let best: [string, string] | null = null;
  let bestDiff = Infinity;
  for (let k = 1; k < parts.length; k++) {
    const a = parts.slice(0, k).join(' · ');
    const b = parts.slice(k).join(' · ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

interface Fitted {
  lines: string[];
  style: TextStyle;
}

/** The text in `avail` px: one line at the largest size that fits, else two lines split at a ' · ', else the
 * smallest size cut short with an ellipsis; null when not even that fits (nothing is drawn rather than run into a target). */
function fitText(text: string, avail: number, ppi: number, halfHeight: number): Fitted | null {
  for (const capMm of CAP_SIZES_MM) {
    const style = styleFor(capMm, ppi);
    if (fitsHeight(style, 1, halfHeight) && textWidthPx(text, style) <= avail) return { lines: [text], style };
  }
  const two = splitInTwo(text);
  if (two) {
    for (const capMm of CAP_SIZES_MM) {
      const style = styleFor(capMm, ppi);
      if (fitsHeight(style, 2, halfHeight) && two.every((l) => textWidthPx(l, style) <= avail)) return { lines: two, style };
    }
  }
  // Last resort: the smallest size, cut to fit.
  const style = styleFor(CAP_SIZES_MM[CAP_SIZES_MM.length - 1], ppi);
  if (!fitsHeight(style, 1, halfHeight)) return null;
  let cut = text;
  while (cut.length > 1 && textWidthPx(`${cut}…`, style) > avail) cut = cut.slice(0, -1);
  const line = cut === text ? text : `${cut.trimEnd()}…`;
  return textWidthPx(line, style) <= avail ? { lines: [line], style } : null;
}

interface Placed {
  fitted: Fitted;
  x: number;
  anchor: 'left' | 'right';
}

/** The texts of a row, fitted: two texts share one size on one line when they fit side by side; otherwise the row is
 * shared in proportion to their lengths and each is fitted to its part, so they never meet. */
function fitBand(band: LabelBand, lines: LabelLines, ppi: number): Placed[] {
  const texts = band.slots.map((s) => ({ ...s, text: (lines[s.key] ?? '').toUpperCase() })).filter((t) => t.text);
  const avail = band.x1 - band.x0;
  if (texts.length === 0 || avail <= 0) return [];
  const xOf = (anchor: 'left' | 'right'): number => (anchor === 'left' ? band.x0 : band.x1);
  if (texts.length === 1) {
    const fitted = fitText(texts[0].text, avail, ppi, band.halfHeight);
    return fitted ? [{ fitted, x: xOf(texts[0].anchor), anchor: texts[0].anchor }] : [];
  }
  const [a, b] = texts;
  const spacing = Math.round(mmToPx(LABEL_SPACING_MM, ppi));
  for (const capMm of CAP_SIZES_MM) {
    const style = styleFor(capMm, ppi);
    if (!fitsHeight(style, 1, band.halfHeight)) continue;
    if (textWidthPx(a.text, style) + spacing + textWidthPx(b.text, style) <= avail) {
      return [
        { fitted: { lines: [a.text], style }, x: xOf(a.anchor), anchor: a.anchor },
        { fitted: { lines: [b.text], style }, x: xOf(b.anchor), anchor: b.anchor },
      ];
    }
  }
  const small = styleFor(CAP_SIZES_MM[CAP_SIZES_MM.length - 1], ppi);
  const wa = textWidthPx(a.text, small);
  const wb = textWidthPx(b.text, small);
  const share = Math.max(0, avail - spacing);
  const availA = Math.floor((share * wa) / (wa + wb));
  const out: Placed[] = [];
  const fa = fitText(a.text, availA, ppi, band.halfHeight);
  const fb = fitText(b.text, share - availA, ppi, band.halfHeight);
  if (fa) out.push({ fitted: fa, x: xOf(a.anchor), anchor: a.anchor });
  if (fb) out.push({ fitted: fb, x: xOf(b.anchor), anchor: b.anchor });
  return out;
}

function drawPlaced(data: Uint8Array, canvas: CanvasSpec, band: LabelBand, p: Placed): void {
  const { lines, style } = p.fitted;
  const lead = style.capPx * LEAD;
  const blockHeight = style.capPx + (lines.length - 1) * lead;
  let baseline = Math.round(band.centreY - blockHeight / 2 + style.capPx);
  for (const line of lines) {
    drawText(data, canvas.widthPx, canvas.heightPx, p.x, baseline, line, style, p.anchor);
    baseline += Math.round(lead);
  }
}

/** Draws the label strip into the top and bottom margins of a plate canvas, between the targets. */
export function drawLabelStrip(data: Uint8Array, canvas: CanvasSpec, lines: LabelLines, legacyTargetOffsetMm?: number): void {
  for (const band of labelBands(canvas, legacyTargetOffsetMm)) {
    for (const p of fitBand(band, lines, canvas.ppi)) drawPlaced(data, canvas, band, p);
  }
}

/** Clears the label rows (not the targets, not the art), so a plate can be relabelled. */
export function clearLabelStrip(data: Uint8Array, canvas: CanvasSpec, legacyTargetOffsetMm?: number): void {
  for (const band of labelBands(canvas, legacyTargetOffsetMm)) {
    const h = Math.ceil(band.halfHeight);
    const y0 = Math.max(0, Math.floor(band.centreY - h));
    const y1 = Math.min(canvas.heightPx, Math.ceil(band.centreY + h + 1));
    const x0 = Math.max(0, Math.floor(band.x0));
    const x1 = Math.min(canvas.widthPx, Math.ceil(band.x1));
    for (let y = y0; y < y1; y++) data.fill(0, y * canvas.widthPx + x0, y * canvas.widthPx + Math.max(x0, x1));
  }
}
