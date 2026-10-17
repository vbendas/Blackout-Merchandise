// For tests of the job sheet: every phrase of a JobSheetView the PDF is meant to print, and a check
// that the PDF says all of it and nothing the view lacks. The iPad shows the view and the paper shows
// the PDF drawn from the same view, so this is how a test proves they never disagree.
// Not used outside tests.
import { pdfLines, shows } from '@/lib/print/pack/test-pdf';
import type { JobSheetView } from '@/lib/print/job-sheet-view';

/** What the standard PDF fonts make of a string (lib/print/pack/job-sheet.ts pdfText), for what a test compares. */
export function pdfish(text: string): string {
  return text.replace(/Δ/g, 'd').replace(/[≤]/g, '<=').replace(/[≥]/g, '>=').replace(/[→]/g, '->');
}

/** Every phrase of the view that is on the paper sheet, one string each. The sheet draws its small labels (the facts' and the
 * settings' names, the time it was made) in capitals, so they are listed in capitals. */
export function viewTexts(view: JobSheetView): string[] {
  const label = (text: string) => text.toUpperCase();
  const out: string[] = [view.title, view.subtitle, view.packStatus, label(`Generated ${view.generated}`)];
  for (const [name, value] of view.facts) out.push(label(name), value);

  out.push(view.garments.heading);
  if (view.garments.empty) out.push(view.garments.empty);
  for (const g of view.garments.rows) {
    out.push(g.blankName, g.blankCode, g.colourName, g.colourCode, g.placement, g.methodLabel, ...g.usedBy);
    if (g.file) out.push(g.file);
    else out.push(g.note ?? '-');
  }
  out.push(...view.garments.notes);

  for (const set of view.screenSets) {
    out.push(set.title, set.where);
    if (set.file) out.push(set.file);
    if (set.nothingPrints) out.push(set.nothingPrints);
    for (const f of set.films) {
      out.push(f.position, f.label, f.base, f.colour, f.ruling, f.meshText, f.cover);
      if (f.flash) out.push(f.flash);
    }
    for (const s of set.settings) out.push(label(s.label), s.value);
  }

  for (const pack of view.dtg.packs) {
    out.push(pack.title, pack.where);
    for (const f of pack.files) out.push(f.colourName, f.file ?? '-', f.pixels, f.size, f.offset, f.notes);
  }
  if (view.dtg.footnote) out.push(view.dtg.footnote);

  for (const p of view.proofs) out.push(p.colourName, p.label);

  for (const group of view.checks) {
    out.push(group.label);
    if (group.empty) out.push(group.empty);
    if (group.passed.length > 0) out.push('PASSED', group.passed.join(', '));
    for (const c of group.attention) out.push(c.stateWord, c.title, c.detail);
  }

  const pieces = view.pieces;
  if (pieces.empty) out.push(pieces.empty);
  if (pieces.line) out.push(pieces.line);
  if (pieces.rows.length > 0) {
    out.push(...pieces.sizes);
    for (const r of pieces.rows) out.push(r.blankName, r.blankCode, r.colourName, String(r.total), ...r.from, ...pieces.sizes.map((s) => (r.sizes[s] ? String(r.sizes[s]) : '-')));
    out.push('Total', String(pieces.total), ...pieces.sizes.map((s) => (pieces.totals[s] ? String(pieces.totals[s]) : '-')));
  }

  if (view.auditsEmpty) out.push(view.auditsEmpty);
  for (const a of view.audits) out.push(a.label, a.stateWord, a.by, a.date);
  return out.map(pdfish);
}

/** What the paper adds that is not in the view: the page's own furniture and its fixed words. */
const PAPER_ONLY = [
  'MERCHFROM · JOB SHEET',
  // section headings
  'SCREEN SETS',
  'DTG/DTF FILES',
  'PROOFS',
  'CHECKS',
  'PIECES WAITING',
  'AUDIT SIGN-OFF',
  // table headers
  'GARMENT (BLANK, CODE)',
  'COLOUR',
  'PLACEMENT',
  'METHOD',
  'FILE TO USE',
  'FOR',
  '#',
  'FILM (MAGNAMIX)',
  'BASE',
  'RULING',
  'MESH TPI',
  'COVER',
  'GARMENT COLOUR',
  'FILE (PNG)',
  'PIXELS',
  'SIZE',
  'OFFSET (X, Y)',
  'NOTES',
  'GARMENT',
  'TOTAL',
  'FROM',
  'PRODUCTION FILE',
  'PRE-PRESS',
  'AUDITED BY',
  'DATE',
  // the lines to fill in
  'FILMS OR FILES CHECKED AGAINST THIS SHEET BY',
  'PRINTED BY',
  'SIGNATURE',
];

/** Whether every line the PDF draws comes from the view (or is page furniture), and the other way round: the phrases
 * of the view the PDF does not show, and the lines of the PDF that the view does not have. Both lists empty is parity. */
export function compareWithPdf(view: JobSheetView, pdf: Buffer): { missing: string[]; extra: string[] } {
  const lines = pdfLines(pdf);
  const missing = viewTexts(view).filter((phrase) => !shows(lines, phrase));

  // A paper line is of the view when the view says it, in any case (labels are drawn uppercase, and a wrapped
  // phrase is drawn in pieces, each of them part of the phrase).
  const said = viewTexts(view).join('\n').toUpperCase().replace(/\s+/g, ' ');
  const flat = said.replace(/ /g, '');
  const furniture = new Set(PAPER_ONLY.map((w) => w.toUpperCase()));
  const extra = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => {
      const upper = line.toUpperCase();
      if (furniture.has(upper) || /^PAGE \d+ OF \d+$/.test(upper.replace(/^.* · PAGE/, 'PAGE'))) return false;
      return !said.includes(upper.replace(/\s+/g, ' ')) && !flat.includes(upper.replace(/\s+/g, ''));
    });
  return { missing, extra };
}
