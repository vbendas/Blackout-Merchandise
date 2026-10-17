// Shop-product pricing (print on demand, DTG/DTF), the pure half: the types the
// podPrice() contract speaks in, the shop price table, its checks, and the
// arithmetic that turns a base price and a set of print areas into a breakdown.
// Owner decision, 16 Oct 2026 (Documentation/Dev/Print-Prep-Plan.md, "Shop
// prices" and section 10): each garment has its own base price, which includes
// one print area up to A2 (a design up to 40 x 54 cm, which the A2 film holds with its marks) on the front or the back. A second
// main print (front and back) adds an extra, and sleeve prints add one more,
// charged ONCE whether one sleeve or both are printed. For example a T-shirt at
// EUR 17: +1 for front and back, +2 for sleeves.
//
// Which digital method a garment prints with is also settled here (owner decision, 17 Oct 2026): DTG by
// default, DTF only on garments where DTG isn't ideal, that is the garments whose catalogue family has no DTG,
// plus any garment the owner marks "Print with DTF" in the table. DTF costs the same as DTG unless the owner
// fills in a DTF price for the garment (kept for the future); artists never choose between them.
//
// Pure functions only, no server imports: the admin editor, the preview
// examples and the podPrice() service all read this one file, so they cannot
// disagree. lib/pricing/pod.ts holds the contract PL-A calls and re-exports the
// names below. Money is integer cents, EUR.
import { euros, type RunPriceLine } from '@/lib/pricing/screen-print';

// ---------------------------------------------------------------------------
// The contract's types

export type PlacementKind = 'front' | 'back' | 'sleeve' | 'other';

export interface PodPlacementInput {
  /** a print position: front_chest, front_full, front_left_chest, back, centre, front_leg, sleeve_left, sleeve_right */
  position: string;
  widthCm: number;
  heightCm?: number;
}

export interface PodPriceLine {
  key: 'base' | 'second_main_print' | 'sleeves';
  /** plain words for artists, for example "Front and back" */
  label: string;
  cents: number;
}

export interface PodPriceBreakdown {
  blankCode: string;
  lines: PodPriceLine[];
  totalCents: number;
  /** true while the garment's base price is still a placeholder the owner hasn't set */
  placeholder: boolean;
}

/** The owner's example extras (16 Oct): +EUR 1 front and back, +EUR 2 once for sleeves. */
export const DEFAULT_POD_EXTRAS = { secondMainPrintCents: 100, sleevesCents: 200 };

/** Front positions (including the bag centre and the leg print) count as the front; sleeves are sleeves. */
export function placementKind(position: string): PlacementKind {
  if (position === 'back') return 'back';
  if (position.startsWith('sleeve_')) return 'sleeve';
  if (position.startsWith('front') || position === 'centre') return 'front';
  return 'other';
}

/** The words each line of a breakdown carries. */
export const POD_LINE_LABELS: Record<PodPriceLine['key'], string> = {
  base: 'Garment with one print',
  second_main_print: 'Front and back',
  sleeves: 'Sleeve prints',
};

// ---------------------------------------------------------------------------
// The table

export interface PodExtras {
  /** added once when a product prints on the front and on the back */
  secondMainPrintCents: number;
  /** added once when a product has sleeve prints, one sleeve or both */
  sleevesCents: number;
}

/** What one garment costs the artist, for the shop. */
export interface PodGarmentPrice {
  /** the base price: includes one print area up to A2, front or back */
  cents: number;
  /** DTF price when the owner wants one that differs from the base; absent means DTF uses `cents`, which is how every
   * garment starts. It is the price of the garments that print DTF (no DTG on the garment, or marked), and it is kept
   * on the others so it is ready if one is marked later. */
  dtfCents?: number;
}

export interface PodPriceTable {
  extras: PodExtras;
  /** by blank code; a garment with no entry is still on its placeholder price */
  garments: Record<string, PodGarmentPrice>;
  /** the blank codes the owner marked "Print with DTF (DTG isn't ideal)": those garments print DTF instead of DTG. Sorted, no
   * duplicates; absent while nothing is marked, so a table saved before the marks existed reads the same. A garment with
   * no DTG prints DTF whether or not it is in here. */
  dtfInstead?: string[];
}

/** A change to the table: the extras to change, the garments to set (a whole entry, replacing the old one) or to take back to
 * the placeholder (null), and the garments to mark (true) or unmark (false) as printed with DTF instead of DTG. Saving a
 * patch leaves everything it doesn't name as it was. */
export interface PodPricePatch {
  extras?: Partial<PodExtras>;
  garments?: Record<string, PodGarmentPrice | null>;
  dtfInstead?: Record<string, boolean>;
}

/** One garment as the admin table lists it. */
export interface PodGarmentRow {
  code: string;
  /** the name artists see */
  name: string;
  supplierName: string | null;
  /** the catalogue type ('T-shirts') */
  type: string;
  /** the saved base price; null while the garment is still on the placeholder */
  baseCents: number | null;
  /** the saved DTF price; null means DTF uses the base price */
  dtfCents: number | null;
  /** today's one-print DTG base cost (DTF for a garment that can't take DTG): the price until one is saved. Null when the garment has no cost at all. */
  placeholderCents: number | null;
  /** the garment's catalogue family offers DTG: without it the garment always prints DTF and its mark is locked on */
  offersDtg: boolean;
  /** the garment offers DTF (every garment in the catalogue does) */
  offersDtf: boolean;
  /** the owner's saved mark "Print with DTF (DTG isn't ideal)" */
  dtfInstead: boolean;
}

export const POD_TABLE_LIMITS = {
  /** a garment's base price or DTF price, in cents */
  maxCents: 100_000,
  /** an extra, in cents */
  maxExtraCents: 10_000,
  /** most garments in the table */
  maxGarments: 1000,
} as const;

/** Blank codes look like STTU169. Starting with a letter or a digit keeps '__proto__' out of the table's keys. */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

export function isGarmentCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** No garment is priced yet and the extras are the owner's: what the placeholder prices are read with. */
export function defaultPodPriceTable(): PodPriceTable {
  return { extras: { ...DEFAULT_POD_EXTRAS }, garments: {} };
}

/** The saved price of a blank, or undefined. Own keys only: a blank can't be called 'constructor'. */
export function garmentPriceOf(table: PodPriceTable, blankCode: string): PodGarmentPrice | undefined {
  return Object.hasOwn(table.garments, blankCode) ? table.garments[blankCode] : undefined;
}

/** The base price of a garment for a print method. DTF uses the DTF price when one is saved, else the base price (the same
 * as DTG); every other method (DTG) uses the base price. */
export function baseCentsFor(price: PodGarmentPrice, printServiceCode: string): number {
  return printServiceCode === 'dtf' && price.dtfCents !== undefined ? price.dtfCents : price.cents;
}

// ---------------------------------------------------------------------------
// Which digital method a garment prints with (owner, 17 Oct 2026)
//
// The garment decides, never the artist: DTG by default, and DTF only where DTG isn't ideal. That is a garment whose
// catalogue family has no DTG (jackets, bags, hats, trousers, woven shirts...) and any garment the owner marks "Print with
// DTF". It holds for shop products and for the digital lines of a run; screen print is a run's other choice.

/** The two digital methods a shop product, and the digital line of a run, can print with. */
export type DigitalMethod = 'dtg' | 'dtf';

/** What settles a garment's method: which of the two its catalogue family offers, and whether the owner marked it. */
export interface GarmentMethodFacts {
  offersDtg: boolean;
  offersDtf: boolean;
  markedDtf: boolean;
}

export interface GarmentMethod {
  code: DigitalMethod;
  /** why a garment prints DTF: 'no_dtg' (its family can't take DTG) or 'marked' (the owner's call); null for DTG, the default */
  dtfBecause: 'no_dtg' | 'marked' | null;
}

/** The method a garment prints with: DTG, unless it has no DTG or the owner marked it, then DTF. A garment that offers only DTG
 * prints DTG whatever the mark says (it can't print DTF); one that offers neither has no digital method (null). */
export function garmentMethod(facts: GarmentMethodFacts): GarmentMethod | null {
  if (facts.offersDtg && facts.offersDtf) return facts.markedDtf ? { code: 'dtf', dtfBecause: 'marked' } : { code: 'dtg', dtfBecause: null };
  if (facts.offersDtf) return { code: 'dtf', dtfBecause: 'no_dtg' };
  if (facts.offersDtg) return { code: 'dtg', dtfBecause: null };
  return null;
}

/** The mark is the owner's to change only on a garment that offers both methods. Without DTG the garment always prints DTF and
 * the toggle stays on, locked. */
export function methodLocked(facts: Pick<GarmentMethodFacts, 'offersDtg' | 'offersDtf'>): boolean {
  return !(facts.offersDtg && facts.offersDtf);
}

/** True when the owner marked the garment "Print with DTF (DTG isn't ideal)". */
export function isMarkedDtf(table: PodPriceTable, blankCode: string): boolean {
  return table.dtfInstead?.includes(blankCode) ?? false;
}

/** The two print services a shop product prints with. */
export function isDigitalService(code: string): boolean {
  return code === 'dtg' || code === 'dtf';
}

/** What a caller can say to ask for the garment's digital method: 'digital' (a run line's word for it), or 'dtg' / 'dtf', which
 * still work but are corrected when the garment prints the other. */
export function isDigitalAsk(code: string): boolean {
  return code === 'digital' || isDigitalService(code);
}

/** The label of the owner's mark in the Shop products tab. */
export const DTF_MARK_LABEL = "Print with DTF (DTG isn't ideal)";

/** The rule, in the one sentence the admin shows. */
export const DTF_RULE = "A shop product prints DTG, or DTF on a garment where DTG isn't ideal: one with no DTG, or one you mark in the table below.";

/** The short note that goes with a product or a run line whose method was corrected, or that moved with its garment. Artists
 * hear DTG or DTF only here: the garment decided, so it matters only when it is DTF. */
export function printedNote(method: DigitalMethod): string {
  return method === 'dtf' ? "Printed DTF on this garment, since DTG isn't ideal for it." : 'Printed DTG on this garment.';
}

// ---------------------------------------------------------------------------
// Checks

export type PodTableCheck = { ok: true; table: PodPriceTable } | { ok: false; error: string; /** the input to look at, in the editor's naming ('extras.sleeves', 'garments.STTU169.base') */ field?: string };
export type PodPatchCheck = { ok: true; patch: PodPricePatch } | { ok: false; error: string; field?: string };

const PRICE_WORDS = `A price runs from ${euros(1)} to ${euros(POD_TABLE_LIMITS.maxCents)}.`;
const EXTRA_WORDS = `An extra runs from ${euros(0)} to ${euros(POD_TABLE_LIMITS.maxExtraCents)}.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWholeCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

type Bad = { ok: false; error: string; field?: string };

function bad(error: string, field?: string): Bad {
  return { ok: false, error, ...(field ? { field } : {}) };
}

type Read<T> = { ok: true; value: T } | Bad;

function readExtra(raw: unknown, field: string): Read<number> {
  if (!isWholeCents(raw) || raw < 0 || raw > POD_TABLE_LIMITS.maxExtraCents) return bad(EXTRA_WORDS, field);
  return { ok: true, value: raw + 0 };
}

function readGarment(raw: unknown, code: string): Read<PodGarmentPrice> {
  if (!isRecord(raw)) return bad(`The price of ${code} is missing.`, `garments.${code}.base`);
  const cents = raw.cents;
  if (!isWholeCents(cents) || cents < 1 || cents > POD_TABLE_LIMITS.maxCents) return bad(PRICE_WORDS, `garments.${code}.base`);
  const dtf = raw.dtfCents;
  if (dtf === undefined || dtf === null) return { ok: true, value: { cents } };
  if (!isWholeCents(dtf) || dtf < 1 || dtf > POD_TABLE_LIMITS.maxCents) return bad(PRICE_WORDS, `garments.${code}.dtf`);
  return { ok: true, value: { cents, dtfCents: dtf } };
}

/** The garments marked "Print with DTF": a list of blank codes, sorted and without duplicates. Missing (a table saved before the
 * marks existed) or null is none. */
function readMarkList(raw: unknown): Read<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return bad('The garments printed with DTF are missing.', 'dtfInstead');
  if (raw.length > POD_TABLE_LIMITS.maxGarments) return bad(`Use at most ${POD_TABLE_LIMITS.maxGarments} garments.`, 'dtfInstead');
  const codes = new Set<string>();
  for (const code of raw) {
    if (typeof code !== 'string' || !isGarmentCode(code)) return bad(`"${String(code).slice(0, 40)}" is not a garment code.`, 'dtfInstead');
    codes.add(code);
  }
  return { ok: true, value: [...codes].sort() };
}

/** A table from untrusted input (a settings row): every number checked, the shape fixed, wrong values named in plain words.
 * Prices are whole cents, a base price is at least one cent, and an extra may be zero. */
export function checkPodPriceTable(input: unknown): PodTableCheck {
  if (!isRecord(input)) return bad('The shop price table is missing.');

  const rawExtras = input.extras;
  if (!isRecord(rawExtras)) return bad('The extras are missing.', 'extras');
  const secondMain = readExtra(rawExtras.secondMainPrintCents, 'extras.secondMain');
  if (!secondMain.ok) return secondMain;
  const sleeves = readExtra(rawExtras.sleevesCents, 'extras.sleeves');
  if (!sleeves.ok) return sleeves;

  const rawGarments = input.garments;
  if (!isRecord(rawGarments)) return bad('The garment prices are missing.', 'garments');
  const codes = Object.keys(rawGarments);
  if (codes.length > POD_TABLE_LIMITS.maxGarments) return bad(`Use at most ${POD_TABLE_LIMITS.maxGarments} garments.`, 'garments');
  const garments: Record<string, PodGarmentPrice> = {};
  for (const code of codes) {
    if (!isGarmentCode(code)) return bad(`"${code.slice(0, 40)}" is not a garment code.`, 'garments');
    const read = readGarment(rawGarments[code], code);
    if (!read.ok) return read;
    garments[code] = read.value;
  }

  const marked = readMarkList(input.dtfInstead);
  if (!marked.ok) return marked;

  return {
    ok: true,
    table: { extras: { secondMainPrintCents: secondMain.value, sleevesCents: sleeves.value }, garments, ...(marked.value.length > 0 ? { dtfInstead: marked.value } : {}) },
  };
}

/** A patch from untrusted input (a form): the extras it names, the garments it names and the garments it marks, each checked like a
 * table's. A garment of null goes back to its placeholder. An empty patch is refused: there is nothing to save. */
export function checkPodPricePatch(input: unknown): PodPatchCheck {
  if (!isRecord(input)) return bad('There is nothing to save.');
  const patch: PodPricePatch = {};

  if (input.extras !== undefined) {
    if (!isRecord(input.extras)) return bad('The extras are missing.', 'extras');
    const extras: Partial<PodExtras> = {};
    if (input.extras.secondMainPrintCents !== undefined) {
      const read = readExtra(input.extras.secondMainPrintCents, 'extras.secondMain');
      if (!read.ok) return read;
      extras.secondMainPrintCents = read.value;
    }
    if (input.extras.sleevesCents !== undefined) {
      const read = readExtra(input.extras.sleevesCents, 'extras.sleeves');
      if (!read.ok) return read;
      extras.sleevesCents = read.value;
    }
    if (Object.keys(extras).length > 0) patch.extras = extras;
  }

  if (input.garments !== undefined) {
    if (!isRecord(input.garments)) return bad('The garment prices are missing.', 'garments');
    const codes = Object.keys(input.garments);
    if (codes.length > POD_TABLE_LIMITS.maxGarments) return bad(`Use at most ${POD_TABLE_LIMITS.maxGarments} garments.`, 'garments');
    const garments: Record<string, PodGarmentPrice | null> = {};
    for (const code of codes) {
      if (!isGarmentCode(code)) return bad(`"${code.slice(0, 40)}" is not a garment code.`, 'garments');
      const raw = input.garments[code];
      if (raw === null) {
        garments[code] = null;
        continue;
      }
      const read = readGarment(raw, code);
      if (!read.ok) return read;
      garments[code] = read.value;
    }
    if (codes.length > 0) patch.garments = garments;
  }

  if (input.dtfInstead !== undefined) {
    if (!isRecord(input.dtfInstead)) return bad('The garments printed with DTF are missing.', 'garments');
    const codes = Object.keys(input.dtfInstead);
    if (codes.length > POD_TABLE_LIMITS.maxGarments) return bad(`Use at most ${POD_TABLE_LIMITS.maxGarments} garments.`, 'garments');
    const marks: Record<string, boolean> = {};
    for (const code of codes) {
      if (!isGarmentCode(code)) return bad(`"${code.slice(0, 40)}" is not a garment code.`, 'garments');
      const on = input.dtfInstead[code];
      if (typeof on !== 'boolean') return bad(`Say whether ${code} prints DTF: on or off.`, `garments.${code}.method`);
      marks[code] = on;
    }
    if (codes.length > 0) patch.dtfInstead = marks;
  }

  if (!patch.extras && !patch.garments && !patch.dtfInstead) return bad('There is nothing to save.');
  return { ok: true, patch };
}

/** The table with a patch applied: its garments set or cleared, its extras changed, its marks switched on or off. The old table is
 * not touched. */
export function applyPodPricePatch(table: PodPriceTable, patch: PodPricePatch): PodPriceTable {
  const garments: Record<string, PodGarmentPrice> = { ...table.garments };
  for (const [code, price] of Object.entries(patch.garments ?? {})) {
    if (price === null) delete garments[code];
    else garments[code] = price;
  }
  const marked = new Set(table.dtfInstead ?? []);
  for (const [code, on] of Object.entries(patch.dtfInstead ?? {})) {
    if (on) marked.add(code);
    else marked.delete(code);
  }
  const dtfInstead = [...marked].sort();
  return { extras: { ...table.extras, ...patch.extras }, garments, ...(dtfInstead.length > 0 ? { dtfInstead } : {}) };
}

// ---------------------------------------------------------------------------
// A price

/** What a garment costs with these print areas: the base price, "Front and back" when the product has a front area and a back
 * area, and "Sleeve prints" once when it has any sleeve. Print size does not change the price: the base covers up to A2. A line
 * stays in the breakdown even when its extra is set to zero, so the artist still sees what the product prints on. */
export function buildPodBreakdown(input: {
  blankCode: string;
  baseCents: number;
  placeholder: boolean;
  extras?: PodExtras;
  placements: readonly Pick<PodPlacementInput, 'position'>[];
}): PodPriceBreakdown {
  const extras = input.extras ?? { secondMainPrintCents: DEFAULT_POD_EXTRAS.secondMainPrintCents, sleevesCents: DEFAULT_POD_EXTRAS.sleevesCents };
  const kinds = new Set(input.placements.map((p) => placementKind(p.position)));
  const lines: PodPriceLine[] = [{ key: 'base', label: POD_LINE_LABELS.base, cents: input.baseCents }];
  if (kinds.has('front') && kinds.has('back')) lines.push({ key: 'second_main_print', label: POD_LINE_LABELS.second_main_print, cents: extras.secondMainPrintCents });
  if (kinds.has('sleeve')) lines.push({ key: 'sleeves', label: POD_LINE_LABELS.sleeves, cents: extras.sleevesCents });
  return { blankCode: input.blankCode, lines, totalCents: lines.reduce((sum, line) => sum + line.cents, 0), placeholder: input.placeholder };
}

/** What more print positions add to one piece of a RUN printed DTG or DTF (owner decision, 16 Oct 2026: "DTG/DTF pays also extras
 * for new print positions"): the same extras as a shop product, with the same words and the same arithmetic, line by line, on top
 * of the run's own price for the garment with one print. +1 when the run prints front and back; sleeve prints once, whether one
 * sleeve or both. A line stays when its extra is set to zero. Nothing for a single front or back print. */
export function runExtraLines(extras: PodExtras, placements: readonly Pick<PodPlacementInput, 'position'>[]): RunPriceLine[] {
  const lines: RunPriceLine[] = [];
  for (const line of buildPodBreakdown({ blankCode: '', baseCents: 0, placeholder: false, extras, placements }).lines) {
    if (line.key !== 'base') lines.push({ key: line.key, label: line.label, cents: line.cents });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Examples, in the words the admin page shows

export interface PodExample {
  key: string;
  /** 'Front and back with sleeves' */
  label: string;
  positions: string[];
}

export const POD_EXAMPLES: readonly PodExample[] = [
  { key: 'one', label: 'One print, front or back', positions: ['front_chest'] },
  { key: 'front_back', label: 'Front and back', positions: ['front_chest', 'back'] },
  { key: 'front_sleeve', label: 'Front with one sleeve', positions: ['front_chest', 'sleeve_left'] },
  { key: 'front_sleeves', label: 'Front with both sleeves', positions: ['front_chest', 'sleeve_left', 'sleeve_right'] },
  { key: 'all', label: 'Front and back with sleeves', positions: ['front_chest', 'back', 'sleeve_left', 'sleeve_right'] },
];

export interface PodExampleRow {
  key: string;
  label: string;
  totalCents: number;
  /** '€17 + €1 + €2' */
  sum: string;
}

/** What each example costs for a base price, from the same arithmetic a product is priced with. */
export function podExampleRows(baseCents: number, extras: PodExtras): PodExampleRow[] {
  return POD_EXAMPLES.map((example) => {
    const breakdown = buildPodBreakdown({ blankCode: '', baseCents, placeholder: false, extras, placements: example.positions.map((position) => ({ position })) });
    return { key: example.key, label: example.label, totalCents: breakdown.totalCents, sum: breakdown.lines.map((line) => euros(line.cents)).join(' + ') };
  });
}
