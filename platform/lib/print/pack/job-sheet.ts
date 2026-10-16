// job-sheet.pdf (Plan 6.3): ONE sheet per design, covering every garment that
// uses it. What the operator needs at the press: which file goes on which
// garment, the inks and press settings of each screen set, the DTG/DTF notes,
// proofs, check results, the pieces waiting in open orders, and the audit
// sign-off. Monochrome A4 landscape (the garments table is wide) in the
// standard PDF fonts, so it prints the same on any office printer. Pantone
// codes appear here: this is an admin and production document.
//
// A pure function of JobSheetInput (lib/print/types.ts): the service
// (lib/services/job-sheets.ts) works out what goes on the sheet and its words.
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import type { CheckResult, JobSheetAuditState, JobSheetDtgPack, JobSheetInput, JobSheetScreenSet, PackManifestInk } from '@/lib/print/types';
import { compensationFor } from '@/lib/print/calibration/curve';
import { displayPantone, formatNumber, screenRulingText } from './names';

const PAGE = { width: 841.89, height: 595.28, margin: 36 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
const INK = '#000000';
const GREY = '#555555';
const RULE = '#9A9A9A';
const STANDARD_SCREENS = 8;

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

const pct = (v: number) => `${(v * 100).toFixed(v >= 0.1 ? 0 : 1)}%`;
// Hundredths: traps and chokes are a quarter or a fifth of a millimetre.
const mm = (v: number) => `${formatNumber(Math.round(v * 100) / 100)} mm`;
const threadsPerCm = (tpi: number) => Math.round(tpi / 2.54);
/** 2026-10-15T14:32:10.000Z -> '2026-10-15' */
const dateOf = (iso: string) => iso.slice(0, 10);
/** 2026-10-15T14:32:10.000Z -> '2026-10-15 14:32 UTC' */
const stampOf = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

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

function inkLabel(ink: PackManifestInk): string {
  if (ink.role === 'underbase') return 'Underbase';
  if (ink.role === 'highlight') return 'Highlight white';
  return ink.pantone ? displayPantone(ink.pantone) : `${ink.hex} (no Pantone yet)`;
}

function stateWord(state: CheckResult['state']): string {
  return state === 'passed' ? 'PASSED' : state === 'review' ? 'REVIEW' : 'FAILED';
}

const AUDIT_WORDS: Record<JobSheetAuditState, string> = {
  approved: 'Approved',
  waiting: 'Waiting for audit',
  being_fixed: 'Being fixed',
  sent_back: 'Sent back to the artist',
  idle: 'Not needed yet',
};

async function thumbnail(image: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(image).flatten({ background: '#ffffff' }).resize({ width: 360, height: 450, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    return null;
  }
}

const METHOD_WORDS: Record<string, string> = { spot: 'spot colours', index: 'index', sim_process: 'simulated process' };

function drawGarments(s: Sheet, input: JobSheetInput): void {
  const n = input.garments.length;
  s.section(`Garments${n > 0 ? ` (${n})` : ''}`, 60);
  if (n === 0) {
    s.paragraph('No shop product or open run uses this design yet.', { colour: GREY });
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
      input.garments.map((g) => ({
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
  // Small print under the table, such as why a placement says "Standard position" and not a distance.
  for (const note of input.placementNotes) s.paragraph(note, { size: 8, colour: GREY });
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

/** A screen set worked out before it is drawn, so the sheet knows how tall it is and keeps it on one page. */
interface SetPlan {
  title: string;
  where: string;
  rows: TableRow[];
  settings: [string, string][];
}

function planScreenSet(set: JobSheetScreenSet): SetPlan {
  const sys = set.system;
  const ordered = [...set.inks].sort((a, b) => a.index - b.index);
  const screens = ordered.length;
  const where = [`${set.blankName} (${set.blankCode})`, set.placement, `prints on ${set.colours.join(', ') || 'no colour'}`];
  if (set.printSize) where.push(set.printSize);

  const rows: TableRow[] = [];
  for (const ink of ordered) {
    rows.push({
      cells: [
        { text: `${ink.index}/${screens}`, mono: true },
        { text: inkLabel(ink), bold: true },
        ink.base,
        ink.role === 'ink' && ink.clientName ? `${ink.clientName} · ${ink.hex}` : ink.hex,
        screenRulingText(ink.lpi, ink.angleDeg, set.method),
        ink.mesh ? `${ink.mesh} (${threadsPerCm(ink.mesh)}T)` : '-',
        pct(ink.coverage),
      ],
      swatch: { col: 3, hex: ink.hex },
    });
    if (ink.role === 'underbase') {
      rows.push({ cells: [], note: `Flash ${formatNumber(sys.underbase.flash.seconds)} s at ${formatNumber(sys.underbase.flash.celsius)} °C, then the colours wet on wet` });
    }
  }

  const heads = sys.pressHeads;
  const extra = Math.max(0, screens - STANDARD_SCREENS);
  // Only what this set has: a light garment's set has no underbase to flash and no highlight white.
  const hasUnderbase = ordered.some((i) => i.role === 'underbase');
  const hasHighlight = ordered.some((i) => i.role === 'highlight');
  const colourBases = [...new Set(ordered.filter((i) => i.role === 'ink').map((i) => i.base))];
  const settings: [string, string][] = [];
  if (hasUnderbase) {
    settings.push(['Underbase', `${sys.underbase.ink}${set.underbaseChokeMm !== null ? `, choked ${mm(set.underbaseChokeMm)}` : ''}, flash ${formatNumber(sys.underbase.flash.seconds)} s at ${formatNumber(sys.underbase.flash.celsius)} °C`]);
  }
  settings.push([
    'Colour base',
    colourBases.length > 0 ? `${colourBases.join(', ')}${hasUnderbase ? ', wet on wet over the underbase' : ''}` : `${sys.bases.dark} on dark garments (wet on wet over the underbase), ${sys.bases.light} on light`,
  ]);
  settings.push(['Traps', trapsText(set)]);
  if (hasHighlight) settings.push(['Highlight white', `${sys.highlightWhite.ink}, last screen`]);
  settings.push(
    ['Cure', `${formatNumber(sys.cure.minutesMin)} to ${formatNumber(sys.cure.minutesMax)} min at ${formatNumber(sys.cure.celsius)} °C`],
    ['Mesh', `${sys.mesh.min} to ${sys.mesh.max} tpi; halftones ${sys.mesh.halftone}, solids ${sys.mesh.solid}, underbase ${sys.mesh.underbase}`],
    ['Off-contact', `${formatNumber(sys.offContactMm[0])} to ${formatNumber(sys.offContactMm[1])} mm`],
    ['Squeegee', sys.squeegee],
    ['Screens', `${screens} on a ${heads}-head press${screens > heads ? ': more than the heads, plan the run' : ''}`],
  );
  if (extra > 0) settings.push(['Surcharge', `${extra} ${extra === 1 ? 'screen' : 'screens'} above ${STANDARD_SCREENS}: €${extra} per piece on runs`]);
  settings.push(['Dot gain', dotGainText(set)]);
  if (!sys.measured) settings.push(['Inks', 'Not measured yet: the proof uses target colours']);

  return {
    title: `${set.setName} · ${screens} ${screens === 1 ? 'screen' : 'screens'} · ${METHOD_WORDS[set.method] ?? set.method}`,
    where: where.join(' · '),
    rows,
    settings,
  };
}

/** Traps as the method makes them: spot spreads the lighter ink under the darker; index cells and simulated-process
 * halftones overlap by design, so they have none (plan 4.3 step 6). */
function trapsText(set: JobSheetScreenSet): string {
  if (set.method === 'index') return 'None: index cells sit side by side';
  if (set.method === 'sim_process') return 'None: the halftones overlap by design';
  return set.trapMm !== null ? `${mm(set.trapMm)}, lighter ink spread under darker` : 'Not recorded with this set';
}

const GAIN_METHOD_WORDS: Record<string, string> = { scan: 'from a scan', manual: 'typed in', spectro: 'from a spectrophotometer' };

/** The dot-gain curve the films were made with: that of the ink system the set was built with. A saved curve the engine
 * can't fit is linear to it (dotGainFor), so the sheet says linear too. Index films have no halftone dots to compensate. */
function dotGainText(set: JobSheetScreenSet): string {
  if (set.method === 'index') return 'Not used: index films have no halftone dots';
  const gain = set.system.dotGain;
  if (!gain || !compensationFor(gain)) return 'Not calibrated: linear, the films carry the tones as they are';
  const how = GAIN_METHOD_WORDS[gain.method] ?? gain.method;
  return `Calibrated ${dateOf(gain.measuredAt)} (${how}) at ${formatNumber(gain.lpi)} lpi ${formatNumber(gain.angleDeg)}°, mesh ${formatNumber(gain.mesh)}: tones compensated`;
}

/** The height of a screen set: its heading, its films and its press settings. */
function setHeight(s: Sheet, set: JobSheetScreenSet, plan: SetPlan): number {
  const head = 6 + 16 + s.measure(plan.where, CONTENT_WIDTH, { size: 8.5 }) + 6;
  if (set.inks.length === 0) return head + s.measure(set.note ?? NOTHING_PRINTS, CONTENT_WIDTH, { size: 8.5, bold: true }) + 8;
  return head + s.tableHeight(INK_COLUMNS, plan.rows) + 2 + s.factsHeight(plan.settings, 3) + 4;
}

const NOTHING_PRINTS = 'Nothing prints on this set, so it has no films.';

/** The room the first set needs, for the section heading to stay with it (never more than a page). */
function firstSetKeep(s: Sheet, set: JobSheetScreenSet): number {
  return Math.min(setHeight(s, set, planScreenSet(set)), s.bottom - PAGE.margin - 40);
}

function drawScreenSet(s: Sheet, set: JobSheetScreenSet): void {
  const plan = planScreenSet(set);
  // A set is read on one page when it fits on one: its films and its settings belong together.
  s.ensure(Math.min(setHeight(s, set, plan), s.bottom - PAGE.margin));
  s.y += 6;
  const titleHeight = s.text(plan.title, PAGE.margin, s.y, { size: 10.5, bold: true, width: CONTENT_WIDTH - 330 });
  if (set.file) s.text(set.file, PAGE.margin + CONTENT_WIDTH - 325, s.y + 2, { size: 7.5, mono: true, width: 325, align: 'right' });
  s.y += Math.max(16, titleHeight + 2);
  s.paragraph(plan.where, { size: 8.5, colour: GREY, gap: 6 });

  if (set.inks.length === 0) {
    s.paragraph(set.note ?? NOTHING_PRINTS, { size: 8.5, bold: true, gap: 8 });
    return;
  }
  s.table(INK_COLUMNS, plan.rows);
  s.y += 2;
  s.facts(plan.settings, 3);
  s.y += 4;
}

function dtgNotes(file: JobSheetDtgPack['files'][number], fadeLpi: number | null): string {
  const notes = [file.whitesTransparent ? 'White areas print no ink on this colour.' : 'RGB 255 prints white ink.'];
  if (file.fadeShare > 0.005) notes.push(`Fades are halftoned${fadeLpi ? ` (${formatNumber(fadeLpi)} lpi)` : ''}, so no white lies under soft edges.`);
  return notes.join(' ');
}

const DTG_COLUMNS: Column[] = [
  { header: 'Garment colour', width: 110 },
  { header: 'File (PNG)', width: 262 },
  { header: 'Pixels', width: 85 },
  { header: 'Size', width: 90 },
  { header: 'Offset (x, y)', width: 80 },
  { header: 'Notes', width: 142.89 },
];

function dtgRows(pack: JobSheetDtgPack): TableRow[] {
  return pack.files.map((f) => ({
    cells: [
      { text: f.colourName, bold: true },
      f.file ? { text: f.file, mono: true, size: 7.5 } : { text: '-', grey: true },
      `${formatNumber(f.widthPx)} × ${formatNumber(f.heightPx)} px`,
      `${formatNumber(f.sizeMm.width)} × ${formatNumber(f.sizeMm.height)} mm`,
      `${formatNumber(f.offsetMm.x)}, ${formatNumber(f.offsetMm.y)} mm`,
      { text: dtgNotes(f, pack.fadeLpi), size: 8 },
    ],
  }));
}

function dtgWhere(pack: JobSheetDtgPack): string {
  const colours = `${pack.files.length} garment ${pack.files.length === 1 ? 'colour' : 'colours'}`;
  return [colours, pack.printSize].filter(Boolean).join(' · ');
}

function dtgHeight(s: Sheet, pack: JobSheetDtgPack): number {
  return 6 + 16 + s.measure(dtgWhere(pack), CONTENT_WIDTH, { size: 8.5 }) + 6 + s.tableHeight(DTG_COLUMNS, dtgRows(pack)) + 4;
}

function drawDtgPack(s: Sheet, pack: JobSheetDtgPack): void {
  s.ensure(Math.min(dtgHeight(s, pack), s.bottom - PAGE.margin));
  s.y += 6;
  s.text(`${pack.blankName} (${pack.blankCode}) · ${pack.placement}`, PAGE.margin, s.y, { size: 10.5, bold: true, width: CONTENT_WIDTH });
  s.y += 16;
  s.paragraph(dtgWhere(pack), { size: 8.5, colour: GREY, gap: 6 });
  s.table(DTG_COLUMNS, dtgRows(pack));
  s.y += 4;
}

async function drawProofs(s: Sheet, input: JobSheetInput): Promise<void> {
  if (input.proofs.length === 0) return;
  s.section('Proofs', 170);
  const perRow = 6;
  const gap = 10;
  const w = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow;
  const h = Math.min(150, w * 1.25);
  for (let i = 0; i < input.proofs.length; i += perRow) {
    s.ensure(h + 34);
    const row = input.proofs.slice(i, i + perRow);
    for (let j = 0; j < row.length; j++) {
      const x = PAGE.margin + j * (w + gap);
      const jpeg = await thumbnail(row[j].image);
      if (jpeg) s.doc.image(jpeg, x, s.y, { fit: [w, h], align: 'center', valign: 'center' });
      s.doc.rect(x, s.y, w, h).lineWidth(0.4).strokeColor(RULE).stroke();
      s.text(row[j].colourName, x, s.y + h + 3, { size: 8, bold: true, width: w });
      s.text(row[j].label, x, s.y + h + 13, { size: 7, width: w, colour: GREY });
    }
    s.y += h + 32;
  }
}

function drawChecks(s: Sheet, input: JobSheetInput): void {
  if (input.checks.length === 0) return;
  s.section('Checks', 50);
  for (const group of input.checks) {
    s.ensure(30);
    s.text(group.label, PAGE.margin, s.y, { size: 8.5, bold: true, width: CONTENT_WIDTH });
    s.y += 13;
    if (group.checks.length === 0) {
      s.y += s.text('No checks recorded.', PAGE.margin, s.y, { colour: GREY, size: 8.5 }) + 4;
      continue;
    }
    // What passed is one line of titles; only what needs a person (review, failed) is spelled out.
    const passed = group.checks.filter((c) => c.state === 'passed');
    if (passed.length > 0) {
      const titles = passed.map((c) => c.title).join(', ');
      const h = Math.max(12, s.measure(titles, CONTENT_WIDTH - 52, { size: 8.5 }));
      s.ensure(h + 6);
      s.text(stateWord('passed'), PAGE.margin, s.y, { mono: true, bold: true, size: 8 });
      s.text(titles, PAGE.margin + 52, s.y, { size: 8.5, width: CONTENT_WIDTH - 52, colour: GREY });
      s.y += h + 5;
    }
    for (const c of group.checks.filter((x) => x.state !== 'passed')) {
      const h = Math.max(12, s.measure(c.detail, CONTENT_WIDTH - 170, { size: 8.5 }));
      s.ensure(h + 6);
      s.text(stateWord(c.state), PAGE.margin, s.y, { mono: true, bold: true, size: 8 });
      s.text(c.title, PAGE.margin + 52, s.y, { bold: true, size: 8.5, width: 112 });
      s.text(c.detail, PAGE.margin + 170, s.y, { size: 8.5, width: CONTENT_WIDTH - 170 });
      s.y += h + 5;
    }
    s.y += 4;
  }
}

function drawPieces(s: Sheet, input: JobSheetInput): void {
  const { pieces } = input;
  if (pieces.rows.length === 0) {
    s.section('Pieces waiting', 40);
    s.paragraph('No open order for this design. Open orders are paid and not yet packed.', { colour: GREY });
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
      { text: r.from.map((f) => `${f.ref} (${f.qty})`).join('\n'), size: 7.5, grey: true },
    ],
  }));
  const totals = pieces.sizes.map((size) => pieces.rows.reduce((n, r) => n + (r.sizes[size] ?? 0), 0));
  rows.push({ cells: [{ text: 'Total', bold: true }, '', ...totals.map((t) => ({ text: qty(t), bold: true })), { text: String(pieces.total), bold: true }, '', ''] });

  // A short table is read whole: the heading, its line and the table stay on one page when they fit on one.
  s.section('Pieces waiting', Math.min(26 + s.tableHeight(columns, rows), s.bottom - PAGE.margin - 40));
  const line = `${pieces.total} ${pieces.total === 1 ? 'piece' : 'pieces'} in ${pieces.orders} open ${pieces.orders === 1 ? 'order' : 'orders'}, counted ${stampOf(input.generatedAt)}. Open means paid and not yet packed.`;
  s.paragraph(line, { size: 8.5, colour: GREY, gap: 6 });
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

function drawSignOff(s: Sheet, input: JobSheetInput): void {
  const rows: TableRow[] = input.audits.map((a) => ({
    cells: [a.label, { text: AUDIT_WORDS[a.state], bold: a.state === 'approved' }, a.by ?? '-', a.at ? dateOf(a.at) : '-'],
  }));
  // The sign-off is one block: the files' audit state and the lines under it stay on a page together.
  const table = rows.length > 0 ? s.tableHeight(AUDIT_COLUMNS, rows) + 10 : 20;
  s.section('Audit sign-off', Math.min(table + SIGNATURE_LINES, s.bottom - PAGE.margin - 40));
  if (rows.length > 0) {
    s.table(AUDIT_COLUMNS, rows);
    s.y += 10;
  } else {
    s.paragraph('No production file yet, so nothing to audit.', { colour: GREY });
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
  const { design } = input;
  const version = design.versionNumber === null ? '' : ` · v${design.versionNumber}`;
  const title = `${design.code}${version}`;

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
  s.label(`Generated ${stampOf(input.generatedAt)}`, PAGE.margin, s.y, CONTENT_WIDTH, 'right');
  s.y += 12;
  const titleHeight = s.text(title, PAGE.margin, s.y, { size: 20, bold: true, width: CONTENT_WIDTH });
  s.y += Math.max(28, titleHeight + 4);
  s.y += s.text(`${design.name} · ${design.shopName}`, PAGE.margin, s.y, { size: 10, colour: GREY, width: CONTENT_WIDTH }) + 6;
  s.facts(
    [
      ['Design', design.code],
      ['Version', design.versionNumber === null ? 'Nothing prepared yet' : `v${design.versionNumber}`],
      ['Artist approved', design.approvedAt ? dateOf(design.approvedAt) : 'Not approved by the artist yet'],
      ['Pre-press', input.packStatus],
    ],
    4,
  );

  drawGarments(s, input);

  if (input.screenSets.length > 0) {
    s.section('Screen sets', firstSetKeep(s, input.screenSets[0]));
    for (const set of input.screenSets) drawScreenSet(s, set);
  }
  if (input.dtgPacks.length > 0) {
    s.section('DTG/DTF files', Math.min(dtgHeight(s, input.dtgPacks[0]), s.bottom - PAGE.margin - 40));
    for (const pack of input.dtgPacks) drawDtgPack(s, pack);
    s.paragraph(
      'Open each PNG in GTX Graphics Lab at 100% (no scaling). The offset is from the top left of the print area. DTF uses the same file through Brother’s DTF print path, which mirrors it and lays the white.',
      { size: 8, colour: GREY },
    );
  }
  await drawProofs(s, input);
  drawChecks(s, input);
  drawPieces(s, input);
  drawSignOff(s, input);

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
