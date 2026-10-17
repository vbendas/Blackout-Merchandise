// The job sheet as plain, worded data: what the PDF (lib/print/pack/job-sheet.ts) draws and what the
// iPads at the production stations show (app/station). Both are made from buildJobSheetView, so
// they say the same thing in the same words: a film is "PANTONE 237 C" on the paper sheet and on
// the screen, a set's cure line is the same line. The PDF only lays this out (fonts, columns, page
// breaks); the iPad adds its controls around it.
//
// Pure and client-safe: no database, no Node. JSON all the way down (no Buffers, no Dates), so a
// server page can hand it to a client component as it is. The images are the one thing the two
// differ in: the PDF gets the proof bytes beside the view, the iPad gets a URL on each proof.
//
// Pantone codes are in it, so only Pre-press or Production View (or the owner) may be given one:
// the service that makes it (lib/services/job-sheets.ts getJobSheetView) checks that.
import { compensationFor } from '@/lib/print/calibration/curve';
import { displayPantone, formatNumber, screenRulingText } from '@/lib/print/pack/names';
import type {
  CheckResult,
  JobSheetAuditState,
  JobSheetDtgFile,
  JobSheetDtgPack,
  JobSheetInput,
  JobSheetMethod,
  JobSheetScreenSet,
  PackManifestInk,
  PlateRole,
} from '@/lib/print/types';

/** A screen set carries the pack it was built in when the caller knows it (the station matches the
 * screens it counts by it); the sheet itself never needs it. */
export type JobSheetViewSetInput = JobSheetScreenSet & { packId?: string };

/** What the view is made from: a JobSheetInput whose proofs may carry a URL and no image (the PDF
 * passes the very input it draws, images and all). */
export type JobSheetViewInput = Omit<JobSheetInput, 'proofs' | 'screenSets'> & {
  screenSets: JobSheetViewSetInput[];
  proofs: { colourName: string; label: string; url?: string | null }[];
};

// ---------------------------------------------------------------------------
// The view

export interface JobSheetViewGarment {
  blankName: string;
  blankCode: string;
  colourName: string;
  colourCode: string;
  colourHex: string | null;
  placement: string;
  method: JobSheetMethod;
  /** 'DTG/DTF', 'Screen · Darks', 'Embroidery' */
  methodLabel: string;
  /** the file to use; null when there is none yet, and `note` says why */
  file: string | null;
  note: string | null;
  usedBy: string[];
}

export interface JobSheetViewFilm {
  /** 1-based press position */
  index: number;
  /** '2/6' */
  position: string;
  role: PlateRole;
  /** what the film is called: 'Underbase', 'Highlight white', 'PANTONE 237 C', '#5456AC (no Pantone yet)' */
  label: string;
  /** the ink's code as 'PANTONE 237 C', when it has one */
  pantone: string | null;
  /** 'HB Opaque', 'Aquaflex V2 White · flash' */
  base: string;
  hex: string;
  /** the colour the client knows it by, for a colour ink */
  clientName: string | null;
  /** 'Orchid pink · #ED90DC', or the hex alone */
  colour: string;
  /** '55 lpi 22.5°', 'Index 200 ppi' */
  ruling: string;
  lpi: number;
  angleDeg: number;
  /** threads per inch; null when no mesh is suggested */
  mesh: number | null;
  /** '230 (91T)', or '-' */
  meshText: string;
  /** '10%' */
  cover: string;
  /** the underbase only: 'Flash 4 s at 230 °C, then the colours wet on wet' */
  flash: string | null;
}

export type JobSheetViewSettingKey =
  | 'underbase'
  | 'colour_base'
  | 'traps'
  | 'highlight'
  | 'cure'
  | 'mesh'
  | 'off_contact'
  | 'squeegee'
  | 'screens'
  | 'surcharge'
  | 'dot_gain'
  | 'inks';

export interface JobSheetViewSetting {
  key: JobSheetViewSettingKey;
  label: string;
  value: string;
}

export interface JobSheetViewSet {
  /** the pack the set was built in, when known (see JobSheetViewSetInput) */
  packId: string | null;
  setName: string;
  /** 'Darks · 6 screens · spot colours' */
  title: string;
  screens: number;
  blankName: string;
  blankCode: string;
  placement: string;
  colours: string[];
  /** 'Classic tee (STTU169) · Front chest · 28 cm wide · 5 cm below the collar · prints on Black, French Navy · 280 × 336 mm at 600 ppi' */
  where: string;
  /** the set's screen PSD; null when nothing prints on it */
  file: string | null;
  films: JobSheetViewFilm[];
  /** the press settings under the films, in the sheet's order */
  settings: JobSheetViewSetting[];
  /** the sentence shown instead of films when nothing prints on the set */
  nothingPrints: string | null;
}

export interface JobSheetViewDtgFile {
  colourCode: string;
  colourName: string;
  file: string | null;
  /** '3307 × 3969 px' */
  pixels: string;
  /** '280 × 336.1 mm' */
  size: string;
  /** '0, 2.5 mm' */
  offset: string;
  notes: string;
}

export interface JobSheetViewDtgPack {
  blankName: string;
  blankCode: string;
  placement: string;
  /** 'Classic tee (STTU169) · Front chest · 28 cm wide · 5 cm below the collar' */
  title: string;
  /** '3 garment colours · 280 × 336 mm at 300 ppi' */
  where: string;
  files: JobSheetViewDtgFile[];
}

export interface JobSheetViewProof {
  colourName: string;
  /** 'DTG/DTF', 'Screen · Darks' (with the blank and the area when there are several) */
  label: string;
  /** where an iPad loads the image from; null in the PDF's own view (it has the bytes) */
  url: string | null;
}

export interface JobSheetViewCheck {
  id: string;
  title: string;
  state: CheckResult['state'];
  /** 'REVIEW' or 'FAILED': what is spelled out is what needs a person */
  stateWord: string;
  detail: string;
}

export interface JobSheetViewChecks {
  /** 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm' */
  label: string;
  /** 'No checks recorded.' when the pack has none */
  empty: string | null;
  /** the titles of what passed, one line on the sheet */
  passed: string[];
  /** review and failed checks, spelled out */
  attention: JobSheetViewCheck[];
}

export interface JobSheetViewPieceRow {
  blankName: string;
  blankCode: string;
  colourName: string;
  colourCode: string;
  sizes: Record<string, number>;
  total: number;
  /** 'Run 2 · ORD-1A2B3C4D (120)' */
  from: string[];
}

export interface JobSheetViewPieces {
  /** every size on any row, small to large */
  sizes: string[];
  rows: JobSheetViewPieceRow[];
  /** per size, over every row */
  totals: Record<string, number>;
  total: number;
  orders: number;
  /** '163 pieces in 3 open orders, counted 2026-10-15 14:32 UTC. Open means paid and not yet packed.'; null when there are none */
  line: string | null;
  /** 'No open order for this design. Open orders are paid and not yet packed.' when there are none */
  empty: string | null;
}

export interface JobSheetViewAudit {
  label: string;
  state: JobSheetAuditState;
  /** 'Approved', 'Waiting for audit' */
  stateWord: string;
  approved: boolean;
  /** who signed it off, or '-' */
  by: string;
  /** '2026-10-15', or '-' */
  date: string;
}

export interface JobSheetView {
  design: JobSheetInput['design'];
  /** 'MF-UNDERWRITER-TEE · v3' */
  title: string;
  /** 'Underwriter tee · Underwriter band shop' */
  subtitle: string;
  /** the four facts under the title: design, version, artist approval, pre-press */
  facts: [string, string][];
  packStatus: string;
  /** ISO time the view was made, and the same as the sheet prints it: '2026-10-15 14:32 UTC' */
  generatedAt: string;
  generated: string;
  garments: {
    /** 'Garments (8)' */
    heading: string;
    rows: JobSheetViewGarment[];
    /** 'No shop product or open run uses this design yet.' when there are none */
    empty: string | null;
    /** small print under the table */
    notes: string[];
  };
  screenSets: JobSheetViewSet[];
  dtg: {
    packs: JobSheetViewDtgPack[];
    /** how to open the files; only when there are some */
    footnote: string | null;
  };
  proofs: JobSheetViewProof[];
  checks: JobSheetViewChecks[];
  pieces: JobSheetViewPieces;
  audits: JobSheetViewAudit[];
  /** 'No production file yet, so nothing to audit.' when there are none */
  auditsEmpty: string | null;
}

// ---------------------------------------------------------------------------
// Words

const STANDARD_SCREENS = 8;

const METHOD_WORDS: Record<string, string> = { spot: 'spot colours', index: 'index', sim_process: 'simulated process' };
const GAIN_METHOD_WORDS: Record<string, string> = { scan: 'from a scan', manual: 'typed in', spectro: 'from a spectrophotometer' };

export const AUDIT_WORDS: Record<JobSheetAuditState, string> = {
  approved: 'Approved',
  waiting: 'Waiting for audit',
  being_fixed: 'Being fixed',
  sent_back: 'Sent back to the artist',
  idle: 'Not needed yet',
};

export const NOTHING_PRINTS = 'Nothing prints on this set, so it has no films.';

export const EMPTY_GARMENTS = 'No shop product or open run uses this design yet.';
export const EMPTY_PIECES = 'No open order for this design. Open orders are paid and not yet packed.';
export const EMPTY_AUDITS = 'No production file yet, so nothing to audit.';
export const NO_CHECKS = 'No checks recorded.';
export const DTG_FOOTNOTE =
  'Open each PNG in GTX Graphics Lab at 100% (no scaling). The offset is from the top left of the print area. DTF uses the same file through Brother’s DTF print path, which mirrors it and lays the white.';

const pct = (v: number) => `${(v * 100).toFixed(v >= 0.1 ? 0 : 1)}%`;
// Hundredths: traps and chokes are a quarter or a fifth of a millimetre.
const mm = (v: number) => `${formatNumber(Math.round(v * 100) / 100)} mm`;
const threadsPerCm = (tpi: number) => Math.round(tpi / 2.54);
/** 2026-10-15T14:32:10.000Z -> '2026-10-15' */
const dateOf = (iso: string) => iso.slice(0, 10);
/** 2026-10-15T14:32:10.000Z -> '2026-10-15 14:32 UTC' */
export const stampOf = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

function filmLabel(ink: PackManifestInk): string {
  if (ink.role === 'underbase') return 'Underbase';
  if (ink.role === 'highlight') return 'Highlight white';
  return ink.pantone ? displayPantone(ink.pantone) : `${ink.hex} (no Pantone yet)`;
}

export function stateWord(state: CheckResult['state']): string {
  return state === 'passed' ? 'PASSED' : state === 'review' ? 'REVIEW' : 'FAILED';
}

/** Traps as the method makes them: spot spreads the lighter ink under the darker; index cells and simulated-process
 * halftones overlap by design, so they have none (plan 4.3 step 6). */
function trapsText(set: JobSheetScreenSet): string {
  if (set.method === 'index') return 'None: index cells sit side by side';
  if (set.method === 'sim_process') return 'None: the halftones overlap by design';
  return set.trapMm !== null ? `${mm(set.trapMm)}, lighter ink spread under darker` : 'Not recorded with this set';
}

/** The dot-gain curve the films were made with: that of the ink system the set was built with. A saved curve the engine
 * can't fit is linear to it (dotGainFor), so the sheet says linear too. Index films have no halftone dots to compensate. */
function dotGainText(set: JobSheetScreenSet): string {
  if (set.method === 'index') return 'Not used: index films have no halftone dots';
  const gain = set.system.dotGain;
  if (!gain || !compensationFor(gain)) return 'Not calibrated: linear, the films carry the tones as they are';
  const how = GAIN_METHOD_WORDS[gain.method] ?? gain.method;
  return `Calibrated ${dateOf(gain.measuredAt)} (${how}) at ${formatNumber(gain.lpi)} lpi ${formatNumber(gain.angleDeg)}°, mesh ${formatNumber(gain.mesh)}: tones compensated`;
}

function viewFilms(set: JobSheetScreenSet): JobSheetViewFilm[] {
  const sys = set.system;
  const ordered = [...set.inks].sort((a, b) => a.index - b.index);
  const screens = ordered.length;
  return ordered.map((ink) => ({
    index: ink.index,
    position: `${ink.index}/${screens}`,
    role: ink.role,
    label: filmLabel(ink),
    pantone: ink.pantone ? displayPantone(ink.pantone) : null,
    base: ink.base,
    hex: ink.hex,
    clientName: ink.role === 'ink' && ink.clientName ? ink.clientName : null,
    colour: ink.role === 'ink' && ink.clientName ? `${ink.clientName} · ${ink.hex}` : ink.hex,
    ruling: screenRulingText(ink.lpi, ink.angleDeg, set.method),
    lpi: ink.lpi,
    angleDeg: ink.angleDeg,
    mesh: ink.mesh || null,
    meshText: ink.mesh ? `${ink.mesh} (${threadsPerCm(ink.mesh)}T)` : '-',
    cover: pct(ink.coverage),
    flash: ink.role === 'underbase' ? `Flash ${formatNumber(sys.underbase.flash.seconds)} s at ${formatNumber(sys.underbase.flash.celsius)} °C, then the colours wet on wet` : null,
  }));
}

function viewSettings(set: JobSheetScreenSet): JobSheetViewSetting[] {
  const sys = set.system;
  const ordered = [...set.inks].sort((a, b) => a.index - b.index);
  const screens = ordered.length;
  const heads = sys.pressHeads;
  const extra = Math.max(0, screens - STANDARD_SCREENS);
  // Only what this set has: a light garment's set has no underbase to flash and no highlight white.
  const hasUnderbase = ordered.some((i) => i.role === 'underbase');
  const hasHighlight = ordered.some((i) => i.role === 'highlight');
  const colourBases = [...new Set(ordered.filter((i) => i.role === 'ink').map((i) => i.base))];
  const settings: JobSheetViewSetting[] = [];
  const add = (key: JobSheetViewSettingKey, label: string, value: string) => settings.push({ key, label, value });
  if (hasUnderbase) {
    add('underbase', 'Underbase', `${sys.underbase.ink}${set.underbaseChokeMm !== null ? `, choked ${mm(set.underbaseChokeMm)}` : ''}, flash ${formatNumber(sys.underbase.flash.seconds)} s at ${formatNumber(sys.underbase.flash.celsius)} °C`);
  }
  add(
    'colour_base',
    'Colour base',
    colourBases.length > 0 ? `${colourBases.join(', ')}${hasUnderbase ? ', wet on wet over the underbase' : ''}` : `${sys.bases.dark} on dark garments (wet on wet over the underbase), ${sys.bases.light} on light`,
  );
  add('traps', 'Traps', trapsText(set));
  if (hasHighlight) add('highlight', 'Highlight white', `${sys.highlightWhite.ink}, last screen`);
  add('cure', 'Cure', `${formatNumber(sys.cure.minutesMin)} to ${formatNumber(sys.cure.minutesMax)} min at ${formatNumber(sys.cure.celsius)} °C`);
  add('mesh', 'Mesh', `${sys.mesh.min} to ${sys.mesh.max} tpi; halftones ${sys.mesh.halftone}, solids ${sys.mesh.solid}, underbase ${sys.mesh.underbase}`);
  add('off_contact', 'Off-contact', `${formatNumber(sys.offContactMm[0])} to ${formatNumber(sys.offContactMm[1])} mm`);
  add('squeegee', 'Squeegee', sys.squeegee);
  add('screens', 'Screens', `${screens} on a ${heads}-head press${screens > heads ? ': more than the heads, plan the run' : ''}`);
  if (extra > 0) add('surcharge', 'Surcharge', `${extra} ${extra === 1 ? 'screen' : 'screens'} above ${STANDARD_SCREENS}: €${extra} per piece on runs`);
  add('dot_gain', 'Dot gain', dotGainText(set));
  if (!sys.measured) add('inks', 'Inks', 'Not measured yet: the proof uses target colours');
  return settings;
}

function viewSet(set: JobSheetViewSetInput): JobSheetViewSet {
  const films = viewFilms(set);
  const screens = films.length;
  const where = [`${set.blankName} (${set.blankCode})`, set.placement, `prints on ${set.colours.join(', ') || 'no colour'}`];
  if (set.printSize) where.push(set.printSize);
  return {
    packId: set.packId ?? null,
    setName: set.setName,
    title: `${set.setName} · ${screens} ${screens === 1 ? 'screen' : 'screens'} · ${METHOD_WORDS[set.method] ?? set.method}`,
    screens,
    blankName: set.blankName,
    blankCode: set.blankCode,
    placement: set.placement,
    colours: [...set.colours],
    where: where.join(' · '),
    file: set.file,
    films,
    // A set with no films has no press settings either: the sheet says why nothing prints, and stops there.
    settings: screens === 0 ? [] : viewSettings(set),
    nothingPrints: screens === 0 ? (set.note ?? NOTHING_PRINTS) : null,
  };
}

function dtgNotes(file: JobSheetDtgFile, fadeLpi: number | null): string {
  const notes = [file.whitesTransparent ? 'White areas print no ink on this colour.' : 'RGB 255 prints white ink.'];
  if (file.fadeShare > 0.005) notes.push(`Fades are halftoned${fadeLpi ? ` (${formatNumber(fadeLpi)} lpi)` : ''}, so no white lies under soft edges.`);
  return notes.join(' ');
}

function viewDtgPack(pack: JobSheetDtgPack): JobSheetViewDtgPack {
  const colours = `${pack.files.length} garment ${pack.files.length === 1 ? 'colour' : 'colours'}`;
  return {
    blankName: pack.blankName,
    blankCode: pack.blankCode,
    placement: pack.placement,
    title: `${pack.blankName} (${pack.blankCode}) · ${pack.placement}`,
    where: [colours, pack.printSize].filter(Boolean).join(' · '),
    files: pack.files.map((f) => ({
      colourCode: f.colourCode,
      colourName: f.colourName,
      file: f.file,
      pixels: `${formatNumber(f.widthPx)} × ${formatNumber(f.heightPx)} px`,
      size: `${formatNumber(f.sizeMm.width)} × ${formatNumber(f.sizeMm.height)} mm`,
      offset: `${formatNumber(f.offsetMm.x)}, ${formatNumber(f.offsetMm.y)} mm`,
      notes: dtgNotes(f, pack.fadeLpi),
    })),
  };
}

function viewChecks(group: JobSheetInput['checks'][number]): JobSheetViewChecks {
  return {
    label: group.label,
    empty: group.checks.length === 0 ? NO_CHECKS : null,
    passed: group.checks.filter((c) => c.state === 'passed').map((c) => c.title),
    attention: group.checks
      .filter((c) => c.state !== 'passed')
      .map((c) => ({ id: c.id, title: c.title, state: c.state, stateWord: stateWord(c.state), detail: c.detail })),
  };
}

function viewPieces(input: JobSheetViewInput): JobSheetViewPieces {
  const { pieces } = input;
  const totals: Record<string, number> = {};
  for (const size of pieces.sizes) totals[size] = pieces.rows.reduce((n, r) => n + (r.sizes[size] ?? 0), 0);
  return {
    sizes: [...pieces.sizes],
    rows: pieces.rows.map((r) => ({
      blankName: r.blankName,
      blankCode: r.blankCode,
      colourName: r.colourName,
      colourCode: r.colourCode,
      sizes: { ...r.sizes },
      total: r.total,
      from: r.from.map((f) => `${f.ref} (${f.qty})`),
    })),
    totals,
    total: pieces.total,
    orders: pieces.orders,
    line:
      pieces.rows.length === 0
        ? null
        : `${pieces.total} ${pieces.total === 1 ? 'piece' : 'pieces'} in ${pieces.orders} open ${pieces.orders === 1 ? 'order' : 'orders'}, counted ${stampOf(input.generatedAt)}. Open means paid and not yet packed.`,
    empty: pieces.rows.length === 0 ? EMPTY_PIECES : null,
  };
}

/** The job sheet as data: every word the PDF prints (apart from the page furniture: page numbers and the signature lines). */
export function buildJobSheetView(input: JobSheetViewInput): JobSheetView {
  const { design } = input;
  const version = design.versionNumber === null ? '' : ` · v${design.versionNumber}`;
  const n = input.garments.length;
  return {
    design: { ...design },
    title: `${design.code}${version}`,
    subtitle: `${design.name} · ${design.shopName}`,
    facts: [
      ['Design', design.code],
      ['Version', design.versionNumber === null ? 'Nothing prepared yet' : `v${design.versionNumber}`],
      ['Artist approved', design.approvedAt ? dateOf(design.approvedAt) : 'Not approved by the artist yet'],
      ['Pre-press', input.packStatus],
    ],
    packStatus: input.packStatus,
    generatedAt: input.generatedAt,
    generated: stampOf(input.generatedAt),
    garments: {
      heading: `Garments${n > 0 ? ` (${n})` : ''}`,
      rows: input.garments.map((g) => ({
        blankName: g.blankName,
        blankCode: g.blankCode,
        colourName: g.colourName,
        colourCode: g.colourCode,
        colourHex: g.colourHex,
        placement: g.placement,
        method: g.method,
        methodLabel: g.methodLabel,
        file: g.file,
        note: g.note,
        usedBy: [...g.usedBy],
      })),
      empty: n === 0 ? EMPTY_GARMENTS : null,
      // Small print under the table, such as why a placement says "Standard position" and not a distance.
      notes: [...input.placementNotes],
    },
    screenSets: input.screenSets.map(viewSet),
    dtg: { packs: input.dtgPacks.map(viewDtgPack), footnote: input.dtgPacks.length > 0 ? DTG_FOOTNOTE : null },
    proofs: input.proofs.map((p) => ({ colourName: p.colourName, label: p.label, url: p.url ?? null })),
    checks: input.checks.map(viewChecks),
    pieces: viewPieces(input),
    audits: input.audits.map((a) => ({
      label: a.label,
      state: a.state,
      stateWord: AUDIT_WORDS[a.state],
      approved: a.state === 'approved',
      by: a.by ?? '-',
      date: a.at ? dateOf(a.at) : '-',
    })),
    auditsEmpty: input.audits.length === 0 ? EMPTY_AUDITS : null,
  };
}
