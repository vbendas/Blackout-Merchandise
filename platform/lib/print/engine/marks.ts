// Registration targets and the label strip on every film. Targets are a
// circle plus crosshair at the four side centres, a fixed distance outside
// the art, drawn from integer centres so every plate of a set carries the
// exact same pixels. Labels use the built-in stroke font (font.ts).
import type { CanvasSpec, PixelRect } from '@/lib/print/types';
import { CAP_UNITS, glyphFor, textUnits } from './font';
import { mmToPx } from './units';

export interface TargetGeometry {
  /** centres: top, bottom, left, right */
  centres: { x: number; y: number }[];
  ringRadiusPx: number;
  armPx: number;
  strokePx: number;
}

/** Where the targets go. Pulled inward when the margin is too narrow for the offset. */
export function targetGeometry(canvas: CanvasSpec, targetOffsetMm: number): TargetGeometry {
  const { ppi, marginMm, art } = canvas;
  const offsetMm = Math.max(3, Math.min(targetOffsetMm, marginMm - 2.5));
  const armMm = Math.max(1, Math.min(6, offsetMm - 2, marginMm - offsetMm - 1));
  const off = Math.round(mmToPx(offsetMm, ppi));
  const cx = Math.round(art.x + art.width / 2);
  const cy = Math.round(art.y + art.height / 2);
  return {
    centres: [
      { x: cx, y: art.y - off },
      { x: cx, y: art.y + art.height - 1 + off },
      { x: art.x - off, y: cy },
      { x: art.x + art.width - 1 + off, y: cy },
    ],
    ringRadiusPx: mmToPx(armMm * 0.6, ppi),
    armPx: Math.round(mmToPx(armMm, ppi)),
    strokePx: Math.max(1, mmToPx(0.3, ppi)),
  };
}

/** Bounding boxes of the four targets, clipped to the canvas (for checks). */
export function targetBoxes(canvas: CanvasSpec, targetOffsetMm: number): PixelRect[] {
  const g = targetGeometry(canvas, targetOffsetMm);
  const r = g.armPx + Math.ceil(g.strokePx);
  return g.centres.map(({ x, y }) => clipRect({ x: x - r, y: y - r, width: 2 * r + 1, height: 2 * r + 1 }, canvas));
}

function clipRect(rect: PixelRect, canvas: CanvasSpec): PixelRect {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(canvas.widthPx, rect.x + rect.width);
  const y1 = Math.min(canvas.heightPx, rect.y + rect.height);
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}

/** Draws the four targets (255 = black on the film). */
export function drawTargets(data: Uint8Array, canvas: CanvasSpec, targetOffsetMm: number): void {
  const g = targetGeometry(canvas, targetOffsetMm);
  const half = g.strokePx / 2;
  const reach = g.armPx + Math.ceil(half);
  for (const c of g.centres) {
    for (let dy = -reach; dy <= reach; dy++) {
      const y = c.y + dy;
      if (y < 0 || y >= canvas.heightPx) continue;
      for (let dx = -reach; dx <= reach; dx++) {
        const x = c.x + dx;
        if (x < 0 || x >= canvas.widthPx) continue;
        const onRing = Math.abs(Math.hypot(dx, dy) - g.ringRadiusPx) <= half;
        const onH = Math.abs(dy) <= half && Math.abs(dx) <= g.armPx;
        const onV = Math.abs(dx) <= half && Math.abs(dy) <= g.armPx;
        if (onRing || onH || onV) data[y * canvas.widthPx + x] = 255;
      }
    }
  }
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
  /** bottom margin, left of the bottom target: design, version, placement, n/N */
  left: string;
  /** bottom margin, right of the bottom target: ink, base, screen */
  right: string;
  /** top margin, left of the top target */
  topLeft?: string;
  /** top margin, right of the top target */
  topRight?: string;
}

interface Zone {
  x0: number;
  x1: number;
  centreY: number;
  anchor: 'left' | 'right';
}

function labelZones(canvas: CanvasSpec, targetOffsetMm: number): { bottomLeft: Zone; bottomRight: Zone; topLeft: Zone; topRight: Zone; maxHalfHeight: number } {
  const g = targetGeometry(canvas, targetOffsetMm);
  const pad = Math.round(mmToPx(3, canvas.ppi));
  const gap = g.armPx + Math.round(mmToPx(3, canvas.ppi));
  const [top, bottom] = g.centres;
  // half the band between the art (plus 2 mm) and the canvas edge (minus 1 mm)
  const clearArt = mmToPx(2, canvas.ppi);
  const bandTop = canvas.art.y + canvas.art.height + clearArt;
  const bandBottom = canvas.heightPx - mmToPx(1, canvas.ppi);
  const maxHalfHeight = Math.max(1, Math.min(bottom.y - bandTop, bandBottom - bottom.y));
  return {
    bottomLeft: { x0: pad, x1: bottom.x - gap, centreY: bottom.y, anchor: 'right' },
    bottomRight: { x0: bottom.x + gap, x1: canvas.widthPx - pad, centreY: bottom.y, anchor: 'left' },
    topLeft: { x0: pad, x1: top.x - gap, centreY: top.y, anchor: 'right' },
    topRight: { x0: top.x + gap, x1: canvas.widthPx - pad, centreY: top.y, anchor: 'left' },
    maxHalfHeight,
  };
}

const CAP_SIZES_MM = [3, 2.5, 2];

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

function fitText(text: string, zone: Zone, ppi: number, maxHalfHeight: number): { lines: string[]; style: TextStyle } {
  const avail = Math.max(0, zone.x1 - zone.x0);
  const styleFor = (capMm: number): TextStyle => {
    const capPx = mmToPx(capMm, ppi);
    return { capPx, strokePx: Math.max(1, capPx * 0.13) };
  };
  for (const capMm of CAP_SIZES_MM) {
    const style = styleFor(capMm);
    if (style.capPx / 2 > maxHalfHeight) continue;
    if (textWidthPx(text, style) <= avail) return { lines: [text], style };
  }
  for (const capMm of CAP_SIZES_MM) {
    const style = styleFor(capMm);
    if (style.capPx * 1.25 > maxHalfHeight) continue;
    const two = splitInTwo(text);
    if (two && two.every((l) => textWidthPx(l, style) <= avail)) return { lines: two, style };
  }
  // Last resort: the smallest size, cut to fit.
  const style = styleFor(CAP_SIZES_MM[CAP_SIZES_MM.length - 1]);
  let cut = text;
  while (cut.length > 1 && textWidthPx(`${cut}…`, style) > avail) cut = cut.slice(0, -1);
  return { lines: [cut === text ? text : `${cut.trimEnd()}…`], style };
}

function drawZone(data: Uint8Array, canvas: CanvasSpec, zone: Zone, text: string, maxHalfHeight: number): void {
  if (!text) return;
  const { lines, style } = fitText(text, zone, canvas.ppi, maxHalfHeight);
  const lead = style.capPx * 1.5;
  const blockHeight = style.capPx + (lines.length - 1) * lead;
  let baseline = Math.round(zone.centreY - blockHeight / 2 + style.capPx);
  const x = zone.anchor === 'right' ? zone.x1 : zone.x0;
  for (const line of lines) {
    drawText(data, canvas.widthPx, canvas.heightPx, x, baseline, line, style, zone.anchor);
    baseline += Math.round(lead);
  }
}

/** Draws the label strip text into the margins of a plate canvas. */
export function drawLabelStrip(data: Uint8Array, canvas: CanvasSpec, targetOffsetMm: number, lines: LabelLines): void {
  const z = labelZones(canvas, targetOffsetMm);
  drawZone(data, canvas, z.bottomLeft, lines.left.toUpperCase(), z.maxHalfHeight);
  drawZone(data, canvas, z.bottomRight, lines.right.toUpperCase(), z.maxHalfHeight);
  if (lines.topLeft) drawZone(data, canvas, z.topLeft, lines.topLeft.toUpperCase(), z.maxHalfHeight);
  if (lines.topRight) drawZone(data, canvas, z.topRight, lines.topRight.toUpperCase(), z.maxHalfHeight);
}

/** Clears the label zones (not the targets), so a plate can be relabelled. */
export function clearLabelStrip(data: Uint8Array, canvas: CanvasSpec, targetOffsetMm: number): void {
  const z = labelZones(canvas, targetOffsetMm);
  const h = Math.ceil(z.maxHalfHeight);
  for (const zone of [z.bottomLeft, z.bottomRight, z.topLeft, z.topRight]) {
    const y0 = Math.max(0, Math.floor(zone.centreY - h));
    const y1 = Math.min(canvas.heightPx, Math.ceil(zone.centreY + h + 1));
    const x0 = Math.max(0, Math.floor(zone.x0));
    const x1 = Math.min(canvas.widthPx, Math.ceil(zone.x1));
    for (let y = y0; y < y1; y++) data.fill(0, y * canvas.widthPx + x0, y * canvas.widthPx + Math.max(x0, x1));
  }
}
