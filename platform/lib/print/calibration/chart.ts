// The dot-gain test chart as production files: a film PSD (one layer per film,
// like a screen PSD, so the films print one by one from it) and a one-page PDF
// of instructions with a table for typing readings.
//
// The films are halftoned with the engine's own screen (engine/halftone.ts) at
// the house screen's lpi, angle and ppi (the recipe defaults unless staff pick
// another, with the ink system's halftone mesh), and with no dot-gain curve and
// no minimum or maximum dot: the chart has to show what the press does to raw
// film coverage, 5% dots included. The film's margins, the registration targets
// at its four corners and the label strip are the engine's too (engine/units.ts,
// engine/marks.ts), the PSD is the pack's screen PSD writer and the film layers
// are named the way production layers are.
//
// Server only (the pack writers load sharp and ag-psd); the page imports the
// layout and the curve maths, never this file.
import PDFDocument from 'pdfkit';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { hexToLab } from '@/lib/print/engine/colour';
import { makeScreen, screenRow } from '@/lib/print/engine/halftone';
import { drawLabelStrip, drawTargets, drawText, type TextStyle } from '@/lib/print/engine/marks';
import { writeScreenPsd } from '@/lib/print/pack';
import { formatNumber } from '@/lib/print/pack/names';
import { encodePng } from '@/lib/print/pack/png';
import type { CanvasSpec, GarmentColour, InkPlate, InkSystemProfile, Plate, ScreenSet } from '@/lib/print/types';
import {
  CHART_GEOMETRY,
  CHART_HEIGHT_MM,
  CHART_MARKS,
  CHART_WIDTH_MM,
  INK_KINDS,
  INK_KIND_LABELS,
  bandTopMm,
  chartCanvas,
  chartPatches,
  mmToPx,
  type ChartSettings,
  type InkKind,
  type Rect,
} from './chart-layout';

const G = CHART_GEOMETRY;

/** What a film's layer shows in a preview, and the colour its ink overlay would print in. */
const FILM_INK: Record<InkKind, string> = { underbase: '#F2F2F0', base: '#8F8F8F', highlight: '#F2F2F0' };

export interface ChartFilm {
  kind: InkKind;
  plate: Plate;
  /** share of the chart area that carries ink, 0..1 */
  coverage: number;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Pixel bounds [x0, x1) x [y0, y1) of a chart-mm rectangle on a canvas. */
function pxRect(canvas: CanvasSpec, rect: Rect): { x0: number; y0: number; x1: number; y1: number } {
  const x0 = canvas.art.x + Math.round(mmToPx(rect.x, canvas.ppi));
  const y0 = canvas.art.y + Math.round(mmToPx(rect.y, canvas.ppi));
  return { x0, y0, x1: canvas.art.x + Math.round(mmToPx(rect.x + rect.w, canvas.ppi)), y1: canvas.art.y + Math.round(mmToPx(rect.y + rect.h, canvas.ppi)) };
}

function fillRect(data: Uint8Array, stride: number, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y < y1; y++) data.fill(255, y * stride + x0, y * stride + x1);
}

/** A rectangular outline `strokeMm` thick, drawn `offsetMm` outside the rectangle. */
function frameRect(data: Uint8Array, canvas: CanvasSpec, rect: Rect, offsetMm: number, strokeMm: number): void {
  const outer = pxRect(canvas, { x: rect.x - offsetMm - strokeMm, y: rect.y - offsetMm - strokeMm, w: rect.w + 2 * (offsetMm + strokeMm), h: rect.h + 2 * (offsetMm + strokeMm) });
  const inner = pxRect(canvas, { x: rect.x - offsetMm, y: rect.y - offsetMm, w: rect.w + 2 * offsetMm, h: rect.h + 2 * offsetMm });
  const stride = canvas.widthPx;
  fillRect(data, stride, outer.x0, outer.y0, outer.x1, inner.y0);
  fillRect(data, stride, outer.x0, inner.y1, outer.x1, outer.y1);
  fillRect(data, stride, outer.x0, inner.y0, inner.x0, inner.y1);
  fillRect(data, stride, inner.x1, inner.y0, outer.x1, inner.y1);
}

function textStyle(canvas: CanvasSpec, capMm: number): TextStyle {
  const capPx = mmToPx(capMm, canvas.ppi);
  return { capPx, strokePx: Math.max(1, capPx * 0.13) };
}

function drawLabel(data: Uint8Array, canvas: CanvasSpec, xMm: number, baselineMm: number, text: string, capMm: number, align: 'left' | 'centre' = 'left'): void {
  const x = canvas.art.x + mmToPx(xMm, canvas.ppi);
  const y = canvas.art.y + mmToPx(baselineMm, canvas.ppi);
  drawText(data, canvas.widthPx, canvas.heightPx, x, y, text, textStyle(canvas, capMm), align);
}

const degrees = (angle: number): string => `${formatNumber(angle)}°`;

/** One film: the chart's marks, titles and its own band, with every patch halftoned at its coverage. */
function drawFilm(canvas: CanvasSpec, settings: ChartSettings, kind: InkKind, order: { index: number; total: number }): Plate {
  const { widthPx: W, heightPx: H, ppi } = canvas;
  const data = new Uint8Array(W * H);
  const screen = makeScreen({ lpi: settings.lpi, angleDeg: settings.angleDeg, dot: settings.dot }, ppi);
  const thresholds = new Float32Array(W);

  // Registration targets and the label strip, as on a production film.
  drawTargets(data, canvas);
  drawLabelStrip(data, canvas, {
    left: 'BLACKOUT MERCHANDISE DOT GAIN CHART',
    right: `${order.index}/${order.total} ${INK_KIND_LABELS[kind]} · ${formatNumber(settings.lpi)} lpi ${degrees(settings.angleDeg)}`,
    topLeft: `Mesh ${settings.mesh}`,
    topRight: `${ppi} ppi`,
  });

  // Marks: solid squares, the same on every film.
  for (const mark of CHART_MARKS) {
    const half = mark.sizeMm / 2;
    const r = pxRect(canvas, { x: mark.centre.x - half, y: mark.centre.y - half, w: mark.sizeMm, h: mark.sizeMm });
    fillRect(data, W, r.x0, r.y0, r.x1, r.y1);
  }

  // Titles.
  drawLabel(data, canvas, 26, 11.5, 'DOT GAIN CHART', 3);
  drawLabel(data, canvas, 104, 11.2, `${formatNumber(settings.lpi)} LPI ${degrees(settings.angleDeg)} · ${ppi} PPI`, 2.4);
  drawLabel(data, canvas, 26, CHART_HEIGHT_MM - 8.8, 'PRINT ON THE HOUSE BLANK', 2.2);
  drawLabel(data, canvas, 104, CHART_HEIGHT_MM - 8.8, `MESH ${settings.mesh}`, 2.2);

  // This film's band: header, then every patch and its label.
  const top = bandTopMm(INK_KINDS.indexOf(kind));
  drawLabel(data, canvas, G.fieldLeftMm, top + 3.4, `${INK_KIND_LABELS[kind].toUpperCase()} · ${formatNumber(settings.lpi)} LPI ${degrees(settings.angleDeg)} · MESH ${settings.mesh}`, 2.6);
  for (const patch of chartPatches()) {
    if (patch.film !== kind) continue;
    const r = pxRect(canvas, patch.rect);
    if (patch.coverage >= 1) {
      fillRect(data, W, r.x0, r.y0, r.x1, r.y1);
    } else if (patch.coverage > 0) {
      const count = r.x1 - r.x0;
      for (let y = r.y0; y < r.y1; y++) {
        screenRow(screen, y, r.x0, count, thresholds);
        const row = y * W + r.x0;
        for (let i = 0; i < count; i++) if (patch.coverage > thresholds[i]) data[row + i] = 255;
      }
    }
    // The bare patches have no ink to find: a thin frame just outside shows where they are.
    if (patch.kind === 'garment' || patch.kind === 'garment2') frameRect(data, canvas, patch.rect, 0.6, 0.3);
    drawLabel(data, canvas, patch.centre.x, patch.rect.y + patch.rect.h + 1.4 + 2.2, patch.label, 2.2, 'centre');
  }
  return { width: W, height: H, ppi, data };
}

/** The films of a chart, in press order, on the production canvas. */
export function renderChartFilms(settings: ChartSettings): { canvas: CanvasSpec; films: ChartFilm[] } {
  const canvas = chartCanvas(settings.ppi);
  const kinds = INK_KINDS.filter((k) => settings.films.includes(k));
  const films = kinds.map((kind, i): ChartFilm => {
    const plate = drawFilm(canvas, settings, kind, { index: i + 1, total: kinds.length });
    let on = 0;
    const { art, widthPx } = canvas;
    for (let y = art.y; y < art.y + art.height; y++) {
      const row = y * widthPx;
      for (let x = art.x; x < art.x + art.width; x++) if (plate.data[row + x]) on++;
    }
    return { kind, plate, coverage: on / (art.width * art.height) };
  });
  return { canvas, films };
}

// ---------------------------------------------------------------------------
// The film PSD
// ---------------------------------------------------------------------------

const PREVIEW_WIDTH_PX = 1400;

/** All films overlaid, black on white, art area only: the picture inside the PSD (ORIGINAL, do not print) and a map of the chart. */
async function chartMapPng(canvas: CanvasSpec, films: ChartFilm[]): Promise<{ png: Buffer; width: number; height: number }> {
  const { art, widthPx } = canvas;
  const block = Math.max(1, Math.floor(art.width / PREVIEW_WIDTH_PX));
  const w = Math.floor(art.width / block);
  const h = Math.floor(art.height / block);
  const grey = new Uint8Array(w * h);
  for (let by = 0; by < h; by++) {
    for (let bx = 0; bx < w; bx++) {
      let on = 0;
      for (let y = 0; y < block; y++) {
        const row = (art.y + by * block + y) * widthPx + art.x + bx * block;
        for (let x = 0; x < block; x++) {
          for (const film of films) {
            if (film.plate.data[row + x]) {
              on++;
              break;
            }
          }
        }
      }
      grey[by * w + bx] = 255 - Math.round((255 * on) / (block * block));
    }
  }
  const png = await encodePng({ width: w, height: h, channels: 1, data: grey, text: { Title: 'Blackout Merchandise dot gain chart' } });
  return { png, width: w, height: h };
}

/** The dark blank the PSD's colour preview sits on: the white films show on it. */
const PREVIEW_GARMENT: GarmentColour = { code: 'CAL', name: 'Dark blank (preview)', hex: '#1B1C1E', isLight: false };

function inkPlateFor(film: ChartFilm, index: number, settings: ChartSettings, inks: InkSystemProfile): InkPlate {
  const hex = FILM_INK[film.kind];
  return {
    index,
    role: film.kind === 'underbase' ? 'underbase' : film.kind === 'highlight' ? 'highlight' : 'ink',
    target: { hex, lab: hexToLab(hex) },
    base: film.kind === 'base' ? 'Colour base' : film.kind === 'underbase' ? inks.underbase.ink : inks.highlightWhite.ink,
    pantone: null,
    plate: film.plate,
    coverage: film.coverage,
    // The chart is imaged raw: no dot-gain curve, no minimum or maximum dot.
    halftone: { lpi: settings.lpi, angleDeg: settings.angleDeg, dot: settings.dot, minDot: 0, maxDot: 1 },
    meshSuggestion: settings.mesh,
  };
}

/** 'BlackoutMerch-dot-gain-chart-55lpi-22.5deg-600ppi' */
export function chartFileStem(settings: ChartSettings): string {
  return `BlackoutMerch-dot-gain-chart-${formatNumber(settings.lpi)}lpi-${formatNumber(settings.angleDeg)}deg-${settings.ppi}ppi`;
}

export interface ChartPsd {
  bytes: Buffer;
  name: string;
  /** the film layers in press order */
  films: InkKind[];
}

export async function renderChartPsd(settings: ChartSettings, inks: InkSystemProfile = DEFAULT_INK_SYSTEM): Promise<ChartPsd> {
  const { canvas, films } = renderChartFilms(settings);
  const map = await chartMapPng(canvas, films);
  const set: ScreenSet = {
    key: 'calibration',
    garmentCodes: [PREVIEW_GARMENT.code],
    needsUnderbase: false,
    method: 'spot',
    canvas,
    plates: films.map((film, i) => inkPlateFor(film, i + 1, settings, inks)),
    warnings: [],
  };
  const bytes = await writeScreenPsd({
    set,
    garments: [PREVIEW_GARMENT],
    original: { bytes: map.png, filename: 'dot-gain-chart-map.png', mime: 'image/png', widthPx: map.width, heightPx: map.height },
    label: { designCode: 'MF-DOT-GAIN-CHART', version: 1, placementLabel: 'Dot gain chart' },
    inks,
  });
  return { bytes, name: `${chartFileStem(settings)}.psd`, films: films.map((f) => f.kind) };
}

// ---------------------------------------------------------------------------
// The instructions PDF
// ---------------------------------------------------------------------------

const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const CONTENT = PAGE.width - 2 * PAGE.margin;
const GREY = '#555555';
const RULE = '#9A9A9A';

/** The standard PDF fonts carry Latin-1: anything else would print as garbage, so keep to it. */
function pdfText(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/≥/g, '>=')
    .split('')
    .map((c) => {
      const cp = c.codePointAt(0) ?? 63;
      return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || cp === 0x0a ? c : '?';
    })
    .join('');
}

function steps(settings: ChartSettings, inks: InkSystemProfile): string[] {
  const films = INK_KINDS.filter((k) => settings.films.includes(k)).map((k) => INK_KIND_LABELS[k].toLowerCase());
  const cure = `${formatNumber(inks.cure.minutesMin)} to ${formatNumber(inks.cure.minutesMax)} minutes at ${formatNumber(inks.cure.celsius)} °C`;
  return [
    `Burn the film${films.length > 1 ? 's' : ''} (${films.join(', ')}) from the PSD, one layer at a time, on a mesh of ${settings.mesh}. Use the screen angle and ruling printed on each film. The registration targets are the same on every film.`,
    'Print each film on the house blank the way you print a job: the same ink, squeegee, pressure and off-contact. Every film carries its own bare patch and a solid patch, and each wedge is read against its own. A white film needs a dark blank and a dark ink needs a light one; the films can go on separate blanks.',
    `Flash the underbase as you do in production, then cure fully (${cure}).`,
    'To scan: lay the garment flat on a flatbed, printed side down, with the four large corner squares on the glass. Scan at 600 dpi (300 at the least), 8-bit colour, with automatic levels, sharpening and colour correction off and the gamma left at the scanner’s default (about 2.2, not linear). Save as TIFF or PNG (a JPEG at its best quality also works). Smooth out wrinkles: they shift the patches.',
    'To measure instead: read each patch with a spectrophotometer or densitometer and write it in the table. Read the bare garment and the solid as well. Dot area, density, L* or reflectance all work.',
    'Open Admin, Ink system, Calibration. Upload the scan or type the readings, check the curve, then save. Packs approved before the change keep their files; new packs and re-runs use the new curve.',
  ];
}

/** The chart drawn small: the frame, the marks and each band's patches as grey squares. */
function drawMap(doc: PDFKit.PDFDocument, x: number, y: number, scale: number, settings: ChartSettings): void {
  const px = (mm: number) => mm * scale;
  doc.lineWidth(0.5).strokeColor(RULE).rect(x, y, px(CHART_WIDTH_MM), px(CHART_HEIGHT_MM)).stroke();
  doc.fillColor('#000000');
  for (const mark of CHART_MARKS) {
    const s = px(mark.sizeMm);
    doc.rect(x + px(mark.centre.x) - s / 2, y + px(mark.centre.y) - s / 2, s, s).fill();
  }
  for (const patch of chartPatches()) {
    const present = settings.films.includes(patch.film);
    const level = patch.kind === 'solid' ? 0 : patch.coverage > 0 ? Math.round(255 * (1 - patch.coverage)) : 255;
    const grey = level.toString(16).padStart(2, '0');
    doc.lineWidth(0.3).strokeColor(present ? '#000000' : RULE);
    doc.rect(x + px(patch.rect.x), y + px(patch.rect.y), px(patch.rect.w), px(patch.rect.h));
    if (present) doc.fillAndStroke(`#${grey}${grey}${grey}`, '#000000');
    else doc.stroke();
  }
  doc.fillColor('#000000');
}

export async function renderChartPdf(settings: ChartSettings, inks: InkSystemProfile = DEFAULT_INK_SYSTEM, now: Date = new Date()): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE.margin,
    info: { Title: 'Blackout Merchandise dot gain test chart', Author: 'Blackout Merchandise', Subject: 'Instructions for the dot gain test chart', CreationDate: now },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    doc.on('end', () => resolve());
    doc.on('error', reject);
  });

  let y = PAGE.margin;
  doc.font('Courier').fontSize(7).fillColor(GREY).text('BLACKOUT MERCHANDISE · DOT GAIN TEST CHART', PAGE.margin, y, { lineBreak: false });
  y += 14;
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000').text('Dot gain test chart', PAGE.margin, y, { lineBreak: false });
  y += 28;
  const films = INK_KINDS.filter((k) => settings.films.includes(k)).map((k) => INK_KIND_LABELS[k]);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(GREY)
    .text(pdfText(`${formatNumber(settings.lpi)} lpi · ${degrees(settings.angleDeg)} · ${settings.ppi} ppi · mesh ${settings.mesh} · ${films.join(', ')}`), PAGE.margin, y, { width: CONTENT });
  y += 22;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#000000')
    .text(
      pdfText(
        'A halftone dot prints bigger than it is on the film. This chart measures by how much, across the whole tone range. The engine then puts smaller dots on every new film, so a 50% tint prints as 50% and not as 65%.',
      ),
      PAGE.margin,
      y,
      { width: CONTENT },
    );
  y = doc.y + 10;

  steps(settings, inks).forEach((text, i) => {
    const line = pdfText(text);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(`${i + 1}`, PAGE.margin, y, { width: 14, lineBreak: false });
    doc.font('Helvetica').fontSize(9).text(line, PAGE.margin + 18, y, { width: CONTENT - 18 });
    y = doc.y + 4;
  });
  y += 6;

  // The map on the left, what to read off it on the right.
  const scale = 0.62;
  drawMap(doc, PAGE.margin, y, scale, settings);
  const mapRight = PAGE.margin + CHART_WIDTH_MM * scale + 16;
  const legend = [
    'The chart area is 182 x 165 mm: it fits on an A4 flatbed.',
    'Large squares at the corners: the scan reader’s frame. The top left one is the biggest, so it knows which way up the scan is.',
    'Top to bottom, the bands are the underbase white, the colour base and the highlight white. Each has a bare garment patch, a solid patch, then 0, 5 ... 100% of the film.',
    'A band that is not printed is simply skipped.',
  ];
  let ly = y;
  for (const line of legend) {
    doc.font('Helvetica').fontSize(8).fillColor(GREY).text(pdfText(line), mapRight, ly, { width: PAGE.width - PAGE.margin - mapRight });
    ly = doc.y + 4;
  }
  y += CHART_HEIGHT_MM * scale + 14;

  // The table for typed readings.
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text('Readings', PAGE.margin, y, { lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(GREY).text(pdfText('Unit used: dot area %   density   L*   reflectance %   (circle one)'), PAGE.margin + 60, y + 0.5, { lineBreak: false });
  y += 14;
  const columns = ['Patch', ...INK_KINDS.map((k) => INK_KIND_LABELS[k])];
  const widths = [110, (CONTENT - 110) / 3, (CONTENT - 110) / 3, (CONTENT - 110) / 3];
  const rowHeight = 12.2;
  const rows: string[] = ['Bare garment', 'Solid', ...Array.from({ length: 19 }, (_, i) => `${(i + 1) * 5} % on the film`)];
  const tableWidth = widths.reduce((a, b) => a + b, 0);
  let x = PAGE.margin;
  doc.font('Courier').fontSize(6.5).fillColor(GREY);
  columns.forEach((c, i) => {
    doc.text(pdfText(c.toUpperCase()), x + 3, y + 3, { width: widths[i] - 6, lineBreak: false });
    x += widths[i];
  });
  y += rowHeight;
  doc.lineWidth(0.5).strokeColor(RULE).moveTo(PAGE.margin, y).lineTo(PAGE.margin + tableWidth, y).stroke();
  for (const label of rows) {
    doc.font('Helvetica').fontSize(8).fillColor('#000000').text(pdfText(label), PAGE.margin + 3, y + 2.6, { width: widths[0] - 6, lineBreak: false });
    x = PAGE.margin + widths[0];
    for (let c = 1; c < widths.length; c++) {
      doc.lineWidth(0.4).strokeColor(RULE).rect(x + 4, y + 1.6, widths[c] - 8, rowHeight - 3).stroke();
      x += widths[c];
    }
    y += rowHeight;
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Both, with a small cache: the page asks for the PSD and the PDF separately,
// and the same settings always give the same chart.
// ---------------------------------------------------------------------------

export type ChartFormat = 'psd' | 'pdf';

export interface ChartFile {
  bytes: Buffer;
  name: string;
  contentType: string;
}

const CACHE_LIMIT = 3;
const cache = new Map<string, ChartFile>();

function cacheKey(format: ChartFormat, settings: ChartSettings, inks: InkSystemProfile): string {
  const cure = format === 'pdf' ? `${inks.cure.minutesMin}/${inks.cure.minutesMax}/${inks.cure.celsius}` : `${inks.underbase.ink}/${inks.highlightWhite.ink}`;
  return [format, settings.lpi, settings.angleDeg, settings.ppi, settings.mesh, settings.dot, settings.films.join('+'), cure].join('|');
}

/** One chart file, from the cache when the same one was made a moment ago. */
export async function buildChartFile(format: ChartFormat, settings: ChartSettings, inks: InkSystemProfile = DEFAULT_INK_SYSTEM): Promise<ChartFile> {
  const key = cacheKey(format, settings, inks);
  const hit = cache.get(key);
  if (hit) return hit;
  let file: ChartFile;
  if (format === 'psd') {
    const psd = await renderChartPsd(settings, inks);
    file = { bytes: psd.bytes, name: psd.name, contentType: 'image/vnd.adobe.photoshop' };
  } else {
    file = { bytes: await renderChartPdf(settings, inks), name: `${chartFileStem(settings)}-instructions.pdf`, contentType: 'application/pdf' };
  }
  cache.set(key, file);
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return file;
}

/** Forgets the cache (tests). */
export function clearChartCache(): void {
  cache.clear();
}
