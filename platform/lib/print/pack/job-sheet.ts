// job-sheet.pdf (Plan 6.3): ONE sheet per design, covering every garment that
// uses it. What the operator needs at the press: which file goes on which
// garment, the inks and press settings of each screen set, the DTG/DTF notes,
// proofs, check results, the pieces waiting in open orders, and the audit
// sign-off. Monochrome A4 landscape (the garments table is wide) in the
// standard PDF fonts, so it prints the same on any office printer. Pantone
// codes appear here: this is an admin and production document.
//
// A pure function of JobSheetInput (lib/print/types.ts): the service
// (lib/services/job-sheets.ts) works out what goes on the sheet, and
// buildJobSheetView (lib/print/job-sheet-view.ts) puts it in words. This file
// only lays those words out (fonts, columns, page breaks): the iPads at the
// production stations show the same view, so the two never disagree.
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import type { JobSheetInput } from '@/lib/print/types';
import { buildJobSheetView, EMPTY_AUDITS, NOTHING_PRINTS, stateWord, type JobSheetView, type JobSheetViewDtgPack, type JobSheetViewSet } from '@/lib/print/job-sheet-view';

const PAGE = { width: 841.89, height: 595.28, margin: 36 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
const INK = '#000000';
const GREY = '#555555';
const RULE = '#9A9A9A';

// The standard PDF fonts encode WinAnsi only; anything else would print as
// garbage, so map the few symbols we use and drop the rest.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split('').map((c) => c.codePointAt(0)!));
function pdfText(text: string): string {
  return text
    .replace(/Δ/g, 'd')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[→]/g, '->')
    .replace(/\s+/g, (m) => (m.includes('\n') ? '\n' : ' '))
    .split('')
    .map((c) => {
      const cp = c.codePointAt(0)!;
      return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || cp === 0x0a || WIN_ANSI_EXTRA.has(cp) ? c : '?';
    })
    .join('');
}

interface Cell {
  text: string;
  bold?: boolean;
  mono?: boolean;
  grey?: boolean;
  size?: number;
}
type CellInput = string | Cell;
interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right';
}
interface TableRow {
  cells: CellInput[];
  /** a colour chip at the left of one cell */
  swatch?: { col: number; hex: string };
  /** a line across the table instead of cells (a sub-heading or a note) */
  note?: string;
}

const asCell = (c: CellInput): Cell => (typeof c === 'string' ? { text: c } : c);

class Sheet {
  readonly doc: PDFKit.PDFDocument;
  y = PAGE.margin;

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
  }

  get bottom(): number {
    return PAGE.height - PAGE.margin - 22;
  }

  addPage(): void {
    this.doc.addPage();
    this.y = PAGE.margin;
  }

  ensure(height: number): void {
    if (this.y + height <= this.bottom) return;
    this.addPage();
  }

  label(text: string, x: number, y: number, width?: number, align: 'left' | 'right' = 'left'): void {
    this.doc.font('Courier').fontSize(7).fillColor(GREY).text(pdfText(text.toUpperCase()), x, y, { width, lineBreak: !!width, align });
  }

  /** Draws text and returns its height. */
  text(text: string, x: number, y: number, opts: { width?: number; size?: number; bold?: boolean; colour?: string; mono?: boolean; align?: 'left' | 'right' } = {}): number {
    const font = opts.mono ? (opts.bold ? 'Courier-Bold' : 'Courier') : opts.bold ? 'Helvetica-Bold' : 'Helvetica';
    this.doc.font(font).fontSize(opts.size ?? 9).fillColor(opts.colour ?? INK);
    const clean = pdfText(text);
    const height = this.doc.heightOfString(clean, { width: opts.width });
    this.doc.text(clean, x, y, { width: opts.width, align: opts.align });
    return height;
  }

  /** The height text would take, without drawing it. */
  measure(text: string, width: number, opts: { size?: number; bold?: boolean; mono?: boolean } = {}): number {
    const font = opts.mono ? (opts.bold ? 'Courier-Bold' : 'Courier') : opts.bold ? 'Helvetica-Bold' : 'Helvetica';
    this.doc.font(font).fontSize(opts.size ?? 9);
    return this.doc.heightOfString(pdfText(text), { width });
  }

  rule(y = this.y, weight = 0.5): void {
    this.doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).lineWidth(weight).strokeColor(RULE).stroke();
  }

  /** A section heading, kept on the same page as the first `keepWith` points of what follows. */
  section(title: string, keepWith = 40): void {
    this.ensure(34 + keepWith);
    this.y += 10;
    this.rule(this.y, 0.75);
    this.y += 6;
    this.doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(pdfText(title), PAGE.margin, this.y);
    this.y += 18;
  }

  /** A line of body text under a heading; returns nothing, moves down. */
  paragraph(text: string, opts: { size?: number; colour?: string; bold?: boolean; gap?: number } = {}): void {
    const height = this.measure(text, CONTENT_WIDTH, opts);
    this.ensure(height + 4);
    this.text(text, PAGE.margin, this.y, { width: CONTENT_WIDTH, size: opts.size, colour: opts.colour ?? INK, bold: opts.bold });
    this.y += height + (opts.gap ?? 4);
  }

  /** label/value pairs in columns; each row of them is as tall as its tallest value */
  private factRowHeights(rows: [string, string][], columns: number): number[] {
    const colWidth = CONTENT_WIDTH / columns;
    const heights: number[] = [];
    for (let i = 0; i < rows.length; i += columns) {
      heights.push(11 + Math.max(...rows.slice(i, i + columns).map(([, v]) => this.measure(v, colWidth - 10, { size: 9 }))));
    }
    return heights;
  }

  factsHeight(rows: [string, string][], columns = 3): number {
    return this.factRowHeights(rows, columns).reduce((n, h) => n + h + 6, 0);
  }

  facts(rows: [string, string][], columns = 3): void {
    const colWidth = CONTENT_WIDTH / columns;
    const heights = this.factRowHeights(rows, columns);
    for (let i = 0; i < rows.length; i += columns) {
      const h = heights[i / columns];
      this.ensure(h + 6);
      rows.slice(i, i + columns).forEach(([k, v], j) => {
        const x = PAGE.margin + j * colWidth;
        this.label(k, x, this.y);
        this.text(v, x, this.y + 10, { width: colWidth - 10 });
      });
      this.y += h + 6;
    }
  }

  /** What a row takes up, its rule included. A colour chip takes 12 pt of its cell. */
  private rowHeight(columns: Column[], row: TableRow): number {
    if (row.note) return this.measure(row.note, CONTENT_WIDTH, { size: 8, bold: true }) + 4;
    const room = (i: number) => (row.swatch?.col === i ? 12 : 0);
    const heights = row.cells.map(asCell).map((c, i) => this.measure(c.text, columns[i].width - 6 - room(i), { size: c.size ?? (c.mono ? 8 : 8.5), bold: c.bold, mono: c.mono }));
    return Math.max(12, ...heights) + 4;
  }

  /** The height of a whole table on one page: its header and every row. */
  tableHeight(columns: Column[], rows: TableRow[]): number {
    return 15 + rows.reduce((n, row) => n + this.rowHeight(columns, row), 0);
  }

  /** A table with a header row that repeats on every page; widths in points. */
  table(columns: Column[], rows: TableRow[]): void {
    const x0 = PAGE.margin;
    const header = () => {
      let x = x0;
      for (const col of columns) {
        this.label(col.header, x, this.y, col.width - 4, col.align ?? 'left');
        x += col.width;
      }
      this.y += 11;
      this.rule(this.y, 0.5);
      this.y += 4;
    };
    this.ensure(32);
    header();
    for (const row of rows) {
      const height = this.rowHeight(columns, row);
      if (this.y + height + 2 > this.bottom) {
        this.addPage();
        header();
      }
      if (row.note) {
        this.text(row.note, x0, this.y, { width: CONTENT_WIDTH, size: 8, colour: GREY, bold: true });
        this.y += height;
        continue;
      }
      const cells = row.cells.map(asCell);
      let x = x0;
      cells.forEach((c, i) => {
        let cx = x;
        if (row.swatch?.col === i) {
          this.doc.rect(x, this.y + 1, 8, 8).fillColor(row.swatch.hex).fill();
          this.doc.rect(x, this.y + 1, 8, 8).lineWidth(0.4).strokeColor(INK).stroke();
          cx += 12;
        }
        this.text(c.text, cx, this.y, {
          width: columns[i].width - 6 - (cx - x),
          size: c.size ?? (c.mono ? 8 : 8.5),
          bold: c.bold,
          mono: c.mono,
          colour: c.grey ? GREY : INK,
          align: columns[i].align,
        });
        x += columns[i].width;
      });
      this.y += height;
      this.doc.moveTo(x0, this.y - 2).lineTo(x0 + CONTENT_WIDTH, this.y - 2).lineWidth(0.25).strokeColor('#CCCCCC').stroke();
    }
  }
}


async function thumbnail(image: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(image).flatten({ background: '#ffffff' }).resize({ width: 360, height: 450, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    return null;
  }
}

function drawGarments(s: Sheet, view: JobSheetView): void {
  const { garments } = view;
  s.section(garments.heading, 60);
  if (garments.empty) {
    s.paragraph(garments.empty, { colour: GREY });
  } else {
    s.table(
      [
        { header: 'Garment (blank, code)', width: 150 },
        { header: 'Colour', width: 112 },
        { header: 'Placement', width: 168 },
        { header: 'Method', width: 78 },
        { header: 'File to use', width: 187 },
        { header: 'For', width: 74.89 },
      ],
      garments.rows.map((g) => ({
        cells: [
          { text: `${g.blankName}\n${g.blankCode}`, bold: false },
          { text: `${g.colourName}\n${g.colourCode}`, bold: true },
          g.placement,
          g.methodLabel,
          g.file ? { text: g.file, mono: true, size: 7.5 } : { text: g.note ?? '-', grey: true },
          { text: g.usedBy.join('\n'), grey: true, size: 8 },
        ],
        swatch: g.colourHex ? { col: 1, hex: g.colourHex } : undefined,
      })),
    );
    s.y += 2;
  }
  for (const note of garments.notes) s.paragraph(note, { size: 8, colour: GREY });
}

const INK_COLUMNS: Column[] = [
  { header: '#', width: 40 },
  { header: 'Film (MagnaMix)', width: 190 },
  { header: 'Base', width: 140 },
  { header: 'Colour', width: 200 },
  { header: 'Ruling', width: 90 },
  { header: 'Mesh tpi', width: 70 },
  { header: 'Cover', width: 39.89 },
];

/** A screen set laid out before it is drawn, so the sheet knows how tall it is and keeps it on one page. */
interface SetPlan {
  title: string;
  where: string;
  rows: TableRow[];
  settings: [string, string][];
}

function planScreenSet(set: JobSheetViewSet): SetPlan {
  const rows: TableRow[] = [];
  for (const film of set.films) {
    rows.push({
      cells: [{ text: film.position, mono: true }, { text: film.label, bold: true }, film.base, film.colour, film.ruling, film.meshText, film.cover],
      swatch: { col: 3, hex: film.hex },
    });
    if (film.flash) rows.push({ cells: [], note: film.flash });
  }
  return { title: set.title, where: set.where, rows, settings: set.settings.map((x) => [x.label, x.value]) };
}

/** The height of a screen set: its heading, its films and its press settings. */
function setHeight(s: Sheet, set: JobSheetViewSet, plan: SetPlan): number {
  const head = 6 + 16 + s.measure(plan.where, CONTENT_WIDTH, { size: 8.5 }) + 6;
  if (set.films.length === 0) return head + s.measure(set.nothingPrints ?? NOTHING_PRINTS, CONTENT_WIDTH, { size: 8.5, bold: true }) + 8;
  return head + s.tableHeight(INK_COLUMNS, plan.rows) + 2 + s.factsHeight(plan.settings, 3) + 4;
}

/** The room the first set needs, for the section heading to stay with it (never more than a page). */
function firstSetKeep(s: Sheet, set: JobSheetViewSet): number {
  return Math.min(setHeight(s, set, planScreenSet(set)), s.bottom - PAGE.margin - 40);
}

function drawScreenSet(s: Sheet, set: JobSheetViewSet): void {
  const plan = planScreenSet(set);
  // A set is read on one page when it fits on one: its films and its settings belong together.
  s.ensure(Math.min(setHeight(s, set, plan), s.bottom - PAGE.margin));
  s.y += 6;
  const titleHeight = s.text(plan.title, PAGE.margin, s.y, { size: 10.5, bold: true, width: CONTENT_WIDTH - 330 });
  if (set.file) s.text(set.file, PAGE.margin + CONTENT_WIDTH - 325, s.y + 2, { size: 7.5, mono: true, width: 325, align: 'right' });
  s.y += Math.max(16, titleHeight + 2);
  s.paragraph(plan.where, { size: 8.5, colour: GREY, gap: 6 });

  if (set.films.length === 0) {
    s.paragraph(set.nothingPrints ?? NOTHING_PRINTS, { size: 8.5, bold: true, gap: 8 });
    return;
  }
  s.table(INK_COLUMNS, plan.rows);
  s.y += 2;
  s.facts(plan.settings, 3);
  s.y += 4;
}

const DTG_COLUMNS: Column[] = [
  { header: 'Garment colour', width: 110 },
  { header: 'File (PNG)', width: 262 },
  { header: 'Pixels', width: 85 },
  { header: 'Size', width: 90 },
  { header: 'Offset (x, y)', width: 80 },
  { header: 'Notes', width: 142.89 },
];

function dtgRows(pack: JobSheetViewDtgPack): TableRow[] {
  return pack.files.map((f) => ({
    cells: [
      { text: f.colourName, bold: true },
      f.file ? { text: f.file, mono: true, size: 7.5 } : { text: '-', grey: true },
      f.pixels,
      f.size,
      f.offset,
      { text: f.notes, size: 8 },
    ],
  }));
}

function dtgHeight(s: Sheet, pack: JobSheetViewDtgPack): number {
  return 6 + 16 + s.measure(pack.where, CONTENT_WIDTH, { size: 8.5 }) + 6 + s.tableHeight(DTG_COLUMNS, dtgRows(pack)) + 4;
}

function drawDtgPack(s: Sheet, pack: JobSheetViewDtgPack): void {
  s.ensure(Math.min(dtgHeight(s, pack), s.bottom - PAGE.margin));
  s.y += 6;
  s.text(pack.title, PAGE.margin, s.y, { size: 10.5, bold: true, width: CONTENT_WIDTH });
  s.y += 16;
  s.paragraph(pack.where, { size: 8.5, colour: GREY, gap: 6 });
  s.table(DTG_COLUMNS, dtgRows(pack));
  s.y += 4;
}

/** The proofs are the view's, in its order; `images` are their bytes, the same length and order. */
async function drawProofs(s: Sheet, view: JobSheetView, images: Buffer[]): Promise<void> {
  if (view.proofs.length === 0) return;
  s.section('Proofs', 170);
  const perRow = 6;
  const gap = 10;
  const w = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow;
  const h = Math.min(150, w * 1.25);
  for (let i = 0; i < view.proofs.length; i += perRow) {
    s.ensure(h + 34);
    const row = view.proofs.slice(i, i + perRow);
    for (let j = 0; j < row.length; j++) {
      const x = PAGE.margin + j * (w + gap);
      const jpeg = await thumbnail(images[i + j]);
      if (jpeg) s.doc.image(jpeg, x, s.y, { fit: [w, h], align: 'center', valign: 'center' });
      s.doc.rect(x, s.y, w, h).lineWidth(0.4).strokeColor(RULE).stroke();
      s.text(row[j].colourName, x, s.y + h + 3, { size: 8, bold: true, width: w });
      s.text(row[j].label, x, s.y + h + 13, { size: 7, width: w, colour: GREY });
    }
    s.y += h + 32;
  }
}

function drawChecks(s: Sheet, view: JobSheetView): void {
  if (view.checks.length === 0) return;
  s.section('Checks', 50);
  for (const group of view.checks) {
    s.ensure(30);
    s.text(group.label, PAGE.margin, s.y, { size: 8.5, bold: true, width: CONTENT_WIDTH });
    s.y += 13;
    if (group.empty) {
      s.y += s.text(group.empty, PAGE.margin, s.y, { colour: GREY, size: 8.5 }) + 4;
      continue;
    }
    // What passed is one line of titles; only what needs a person (review, failed) is spelled out.
    if (group.passed.length > 0) {
      const titles = group.passed.join(', ');
      const h = Math.max(12, s.measure(titles, CONTENT_WIDTH - 52, { size: 8.5 }));
      s.ensure(h + 6);
      s.text(stateWord('passed'), PAGE.margin, s.y, { mono: true, bold: true, size: 8 });
      s.text(titles, PAGE.margin + 52, s.y, { size: 8.5, width: CONTENT_WIDTH - 52, colour: GREY });
      s.y += h + 5;
    }
    for (const c of group.attention) {
      const h = Math.max(12, s.measure(c.detail, CONTENT_WIDTH - 170, { size: 8.5 }));
      s.ensure(h + 6);
      s.text(c.stateWord, PAGE.margin, s.y, { mono: true, bold: true, size: 8 });
      s.text(c.title, PAGE.margin + 52, s.y, { bold: true, size: 8.5, width: 112 });
      s.text(c.detail, PAGE.margin + 170, s.y, { size: 8.5, width: CONTENT_WIDTH - 170 });
      s.y += h + 5;
    }
    s.y += 4;
  }
}

function drawPieces(s: Sheet, view: JobSheetView): void {
  const { pieces } = view;
  if (pieces.empty) {
    s.section('Pieces waiting', 40);
    s.paragraph(pieces.empty, { colour: GREY });
    return;
  }

  const garment = 150;
  const colour = 100;
  const totalW = 44;
  const gap = 14;
  const sizeCount = pieces.sizes.length;
  const sizeW = Math.max(24, Math.min(38, (CONTENT_WIDTH - garment - colour - totalW - gap - 160) / Math.max(1, sizeCount)));
  const from = CONTENT_WIDTH - garment - colour - totalW - gap - sizeW * sizeCount;
  const columns: Column[] = [
    { header: 'Garment', width: garment },
    { header: 'Colour', width: colour },
    ...pieces.sizes.map((size) => ({ header: size, width: sizeW, align: 'right' as const })),
    { header: 'Total', width: totalW, align: 'right' as const },
    { header: '', width: gap },
    { header: 'From', width: from },
  ];
  const qty = (n: number | undefined) => (n ? String(n) : '-');
  const rows: TableRow[] = pieces.rows.map((r) => ({
    cells: [
      `${r.blankName}\n${r.blankCode}`,
      { text: r.colourName, bold: true },
      ...pieces.sizes.map((size) => qty(r.sizes[size])),
      { text: String(r.total), bold: true },
      '',
      { text: r.from.join('\n'), size: 7.5, grey: true },
    ],
  }));
  rows.push({ cells: [{ text: 'Total', bold: true }, '', ...pieces.sizes.map((size) => ({ text: qty(pieces.totals[size]), bold: true })), { text: String(pieces.total), bold: true }, '', ''] });

  // A short table is read whole: the heading, its line and the table stay on one page when they fit on one.
  s.section('Pieces waiting', Math.min(26 + s.tableHeight(columns, rows), s.bottom - PAGE.margin - 40));
  s.paragraph(pieces.line ?? '', { size: 8.5, colour: GREY, gap: 6 });
  s.table(columns, rows);
}

const AUDIT_COLUMNS: Column[] = [
  { header: 'Production file', width: 380 },
  { header: 'Pre-press', width: 160 },
  { header: 'Audited by', width: 150 },
  { header: 'Date', width: 79.89 },
];

/** The two lines of blanks for the pressroom to fill in, which take this much room. */
const SIGNATURE_LINES = 80;

function drawSignOff(s: Sheet, view: JobSheetView): void {
  const rows: TableRow[] = view.audits.map((a) => ({
    cells: [a.label, { text: a.stateWord, bold: a.approved }, a.by, a.date],
  }));
  // The sign-off is one block: the files' audit state and the lines under it stay on a page together.
  const table = rows.length > 0 ? s.tableHeight(AUDIT_COLUMNS, rows) + 10 : 20;
  s.section('Audit sign-off', Math.min(table + SIGNATURE_LINES, s.bottom - PAGE.margin - 40));
  if (rows.length > 0) {
    s.table(AUDIT_COLUMNS, rows);
    s.y += 10;
  } else {
    s.paragraph(view.auditsEmpty ?? EMPTY_AUDITS, { colour: GREY });
  }

  const line = (label: string, x: number, width: number) => {
    s.label(label, x, s.y);
    s.doc.moveTo(x, s.y + 24).lineTo(x + width, s.y + 24).lineWidth(0.5).strokeColor(INK).stroke();
  };
  const third = (CONTENT_WIDTH - 40) / 3;
  s.ensure(SIGNATURE_LINES);
  line('Films or files checked against this sheet by', PAGE.margin, third);
  line('Date', PAGE.margin + third + 20, third);
  line('Signature', PAGE.margin + 2 * (third + 20), third);
  s.y += 40;
  line('Printed by', PAGE.margin, third);
  line('Date', PAGE.margin + third + 20, third);
  line('Signature', PAGE.margin + 2 * (third + 20), third);
  s.y += 32;
}

/** The job sheet as an A4 landscape PDF. */
export async function renderJobSheetPdf(input: JobSheetInput): Promise<Buffer> {
  // Every word on the sheet comes from the view; `input` only adds the proof images.
  const view = buildJobSheetView(input);
  const { design, title } = view;

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: PAGE.margin,
    bufferPages: true,
    info: { Title: pdfText(`Job sheet ${title}`), Author: 'MerchFrom', Subject: pdfText(design.name), CreationDate: new Date(input.generatedAt) },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    doc.on('end', () => resolve());
    doc.on('error', reject);
  });
  const s = new Sheet(doc);

  // Header
  s.label('MerchFrom · Job sheet', PAGE.margin, s.y);
  s.label(`Generated ${view.generated}`, PAGE.margin, s.y, CONTENT_WIDTH, 'right');
  s.y += 12;
  const titleHeight = s.text(title, PAGE.margin, s.y, { size: 20, bold: true, width: CONTENT_WIDTH });
  s.y += Math.max(28, titleHeight + 4);
  s.y += s.text(view.subtitle, PAGE.margin, s.y, { size: 10, colour: GREY, width: CONTENT_WIDTH }) + 6;
  s.facts(view.facts, 4);

  drawGarments(s, view);

  if (view.screenSets.length > 0) {
    s.section('Screen sets', firstSetKeep(s, view.screenSets[0]));
    for (const set of view.screenSets) drawScreenSet(s, set);
  }
  if (view.dtg.packs.length > 0) {
    s.section('DTG/DTF files', Math.min(dtgHeight(s, view.dtg.packs[0]), s.bottom - PAGE.margin - 40));
    for (const pack of view.dtg.packs) drawDtgPack(s, pack);
    if (view.dtg.footnote) s.paragraph(view.dtg.footnote, { size: 8, colour: GREY });
  }
  await drawProofs(
    s,
    view,
    input.proofs.map((p) => p.image),
  );
  drawChecks(s, view);
  drawPieces(s, view);
  drawSignOff(s, view);

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('Courier')
      .fontSize(7)
      .fillColor(GREY)
      .text(pdfText(`${title} · ${design.name} · page ${i - range.start + 1} of ${range.count}`.toUpperCase()), PAGE.margin, PAGE.height - PAGE.margin + 6, {
        width: CONTENT_WIDTH,
        align: 'right',
        lineBreak: false,
      });
    doc.page.margins.bottom = bottom;
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
