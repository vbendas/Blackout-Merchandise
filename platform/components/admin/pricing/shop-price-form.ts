// The logic behind the shop-product price editor (/admin/pricing, "Shop products (DTG/DTF)"):
// what is typed in the boxes turned into whole cents, the edits kept until Save, "set every
// garment of a type", the change to send (only the garments that changed), the search and the
// filters, and the garment the example prices are drawn for. No React and nothing server-only,
// so the editor and its tests share it. The server checks the change again (checkPodPricePatch):
// a browser can send anything.
import {
  POD_TABLE_LIMITS,
  baseCentsFor,
  type PodExtras,
  type PodGarmentPrice,
  type PodGarmentRow,
  type PodPricePatch,
} from '@/lib/pricing/pod-table';
import { euros } from '@/lib/pricing/screen-print';
import { eurosText } from './price-form';

// ---------------------------------------------------------------------------
// Money in a box

/** '17', '17.5', '17,50' and '€17' are amounts. An amount with more than two decimals is rounded to the nearest cent, half up:
 * '17.005' is 17.01 and '17.004' is 17.00. '-1', '1.2.3', '17.' and 'abc' are not amounts. Read as text, never as a float, so
 * 0.29 is 29 cents and not 28.999. */
export function centsFromText(text: string): number | null {
  const clean = text.trim().replace(/^€\s*/, '').replace(',', '.');
  const match = /^(\d{1,7})(?:\.(\d+))?$/.exec(clean);
  if (!match) return null;
  const fraction = match[2] ?? '';
  const roundUp = fraction.length > 2 && fraction.charCodeAt(2) >= 53 ? 1 : 0; // the third decimal is 5 or more
  return Number(match[1]) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2)) + roundUp;
}

const AMOUNT = 'Use an amount like 17.00.';
const PRICE_RANGE = `A price runs from ${euros(1)} to ${euros(POD_TABLE_LIMITS.maxCents)}.`;
const EXTRA_RANGE = `An extra runs from ${euros(0)} to ${euros(POD_TABLE_LIMITS.maxExtraCents)}.`;

/** A garment price in a box: at least one cent, at most the limit. */
function readPrice(text: string): { ok: true; cents: number } | { ok: false; error: string } {
  const cents = centsFromText(text);
  if (cents === null) return { ok: false, error: text.trim() === '' ? 'Enter a price like 17.00.' : AMOUNT };
  if (cents < 1 || cents > POD_TABLE_LIMITS.maxCents) return { ok: false, error: PRICE_RANGE };
  return { ok: true, cents };
}

function readExtra(text: string): { ok: true; cents: number } | { ok: false; error: string } {
  const cents = centsFromText(text);
  if (cents === null) return { ok: false, error: text.trim() === '' ? 'Enter an amount like 1.00, or 0.00 for none.' : AMOUNT };
  if (cents > POD_TABLE_LIMITS.maxExtraCents) return { ok: false, error: EXTRA_RANGE };
  return { ok: true, cents };
}

// ---------------------------------------------------------------------------
// The form

/** One garment's boxes. `set` says the owner has chosen this garment's price (typed it, or set its whole type): a garment that is
 * not set shows its placeholder and is not saved. */
export interface ShopRowValues {
  base: string;
  /** the DTF price; empty means DTF uses the base price */
  dtf: string;
  set: boolean;
}

export interface ShopFormValues {
  rows: Record<string, ShopRowValues>;
  /** euros: the extra for front and back */
  secondMain: string;
  /** euros: the extra for sleeve prints, once */
  sleeves: string;
}

/** Box name -> what is wrong with it: 'extras.secondMain', 'extras.sleeves', 'garments.STTU169.base', 'garments.STTU169.dtf',
 * and 'bulk' for the box that sets a whole type. The names the server's checks use too. */
export type ShopFormErrors = Record<string, string>;

/** The prices as last saved: what the form is compared with, and what the examples fall back on. */
export interface SavedShopPrices {
  extras: PodExtras;
  garments: Record<string, PodGarmentPrice>;
}

export function savedFromRows(rows: readonly PodGarmentRow[], extras: PodExtras): SavedShopPrices {
  const garments: Record<string, PodGarmentPrice> = {};
  for (const row of rows) {
    if (row.baseCents !== null) garments[row.code] = { cents: row.baseCents, ...(row.dtfCents !== null ? { dtfCents: row.dtfCents } : {}) };
  }
  return { extras: { ...extras }, garments };
}

function savedPrice(saved: SavedShopPrices, code: string): PodGarmentPrice | undefined {
  return Object.hasOwn(saved.garments, code) ? saved.garments[code] : undefined;
}

/** The boxes for a set of prices: a saved garment shows its price, any other its placeholder (or nothing, when it has none). */
export function formFromSaved(rows: readonly PodGarmentRow[], saved: SavedShopPrices): ShopFormValues {
  const values: Record<string, ShopRowValues> = {};
  for (const row of rows) {
    const price = savedPrice(saved, row.code);
    values[row.code] = price
      ? { base: eurosText(price.cents), dtf: price.dtfCents !== undefined ? eurosText(price.dtfCents) : '', set: true }
      : { base: row.placeholderCents !== null ? eurosText(row.placeholderCents) : '', dtf: '', set: false };
  }
  return { rows: values, secondMain: eurosText(saved.extras.secondMainPrintCents), sleeves: eurosText(saved.extras.sleevesCents) };
}

/** A garment the boxes have not met yet (one added to the catalogue while the page was open): not set, nothing in its boxes. */
export const EMPTY_ROW: ShopRowValues = { base: '', dtf: '', set: false };

/** Typing a base price chooses the price: the garment is set from then on. */
export function editBase(values: ShopFormValues, code: string, text: string): ShopFormValues {
  const row = values.rows[code] ?? EMPTY_ROW;
  return { ...values, rows: { ...values.rows, [code]: { ...row, base: text, set: true } } };
}

/** The DTF price is an addition to a set garment's base price, so it is typed only once the base is set. */
export function editDtf(values: ShopFormValues, code: string, text: string): ShopFormValues {
  const row = values.rows[code];
  if (!row || !row.set) return values;
  return { ...values, rows: { ...values.rows, [code]: { ...row, dtf: text } } };
}

export type TypePriceResult = { ok: true; values: ShopFormValues; count: number; /** the base price every garment of the type was set to */ cents: number } | { ok: false; error: string };

/** "Set every garment of a type to this price": each garment of the type gets the base price and becomes set (not saved until
 * Save). Their DTF prices stay as they are. */
export function applyTypePrice(values: ShopFormValues, rows: readonly PodGarmentRow[], type: string, text: string): TypePriceResult {
  const ofType = rows.filter((row) => row.type === type);
  if (ofType.length === 0) return { ok: false, error: 'Pick a garment type first.' };
  const price = readPrice(text);
  if (!price.ok) return price;
  const next: Record<string, ShopRowValues> = { ...values.rows };
  for (const row of ofType) next[row.code] = { ...(next[row.code] ?? EMPTY_ROW), base: eurosText(price.cents), set: true };
  return { ok: true, values: { ...values, rows: next }, count: ofType.length, cents: price.cents };
}

// ---------------------------------------------------------------------------
// What to save

export type ShopPatchResult =
  | { ok: true; patch: PodPricePatch; /** garments and extras that differ from what is saved */ changed: number }
  | { ok: false; errors: ShopFormErrors; /** the first box to look at, in the order the page lists them */ first: string };

/** The change the boxes make to what is saved: only the garments that are set and differ, and the extras if they differ. A garment
 * that is not set is never sent, and an empty DTF box means no DTF price. A box that can't be read is an error, by name. */
export function patchFromForm(values: ShopFormValues, rows: readonly PodGarmentRow[], saved: SavedShopPrices): ShopPatchResult {
  const errors: ShopFormErrors = {};
  const garments: Record<string, PodGarmentPrice> = {};
  // the boxes with a problem, in the order the page lists them
  const problems: string[] = [];
  const fail = (key: string, error: string) => {
    errors[key] = error;
    problems.push(key);
  };

  const extras: Partial<PodExtras> = {};
  const secondMain = readExtra(values.secondMain);
  if (!secondMain.ok) fail('extras.secondMain', secondMain.error);
  else if (secondMain.cents !== saved.extras.secondMainPrintCents) extras.secondMainPrintCents = secondMain.cents;
  const sleeves = readExtra(values.sleeves);
  if (!sleeves.ok) fail('extras.sleeves', sleeves.error);
  else if (sleeves.cents !== saved.extras.sleevesCents) extras.sleevesCents = sleeves.cents;

  for (const row of rows) {
    const boxes = values.rows[row.code];
    if (!boxes || !boxes.set) continue;
    const base = readPrice(boxes.base);
    if (!base.ok) {
      fail(`garments.${row.code}.base`, base.error);
      continue;
    }
    let dtfCents: number | undefined;
    if (boxes.dtf.trim() !== '') {
      const dtf = readPrice(boxes.dtf);
      if (!dtf.ok) {
        fail(`garments.${row.code}.dtf`, dtf.error);
        continue;
      }
      dtfCents = dtf.cents;
    }
    const before = savedPrice(saved, row.code);
    if (before && before.cents === base.cents && before.dtfCents === dtfCents) continue;
    garments[row.code] = { cents: base.cents, ...(dtfCents !== undefined ? { dtfCents } : {}) };
  }

  if (problems.length > 0) return { ok: false, errors, first: problems[0] };
  const patch: PodPricePatch = {};
  if (Object.keys(extras).length > 0) patch.extras = extras;
  const changedGarments = Object.keys(garments).length;
  if (changedGarments > 0) patch.garments = garments;
  return { ok: true, patch, changed: changedGarments + Object.keys(extras).length };
}

/** The box ids of a garment, in the editor's naming. */
export function garmentKey(code: string, box: 'base' | 'dtf'): string {
  return `garments.${code}.${box}`;
}

// ---------------------------------------------------------------------------
// Looking at the table

/** A garment's price: 'placeholder' (not set, today's cost shown), 'unsaved' (set in the boxes, not saved yet or changed since),
 * 'set' (saved, unchanged) or 'none' (not set and no cost to stand on). */
export type RowState = 'placeholder' | 'unsaved' | 'set' | 'none';

export function rowState(row: PodGarmentRow, values: ShopFormValues, saved: SavedShopPrices): RowState {
  const boxes = values.rows[row.code];
  const before = savedPrice(saved, row.code);
  if (!boxes?.set) return before ? 'set' : row.placeholderCents === null ? 'none' : 'placeholder';
  if (!before) return 'unsaved';
  const base = centsFromText(boxes.base);
  const dtf = boxes.dtf.trim() === '' ? undefined : centsFromText(boxes.dtf);
  return base === before.cents && (dtf ?? undefined) === before.dtfCents ? 'set' : 'unsaved';
}

export type ShowFilter = 'all' | 'placeholder' | 'set';

export interface RowFilter {
  query: string;
  /** a catalogue type, or '' for all */
  type: string;
  /** 'placeholder' and 'set' follow what is saved, so a garment doesn't leave the list while its price is typed */
  show: ShowFilter;
}

/** The garments that match a search over name, code, supplier name and type, a type and a saved/placeholder filter. */
export function filterRows(rows: readonly PodGarmentRow[], saved: SavedShopPrices, filter: RowFilter): PodGarmentRow[] {
  const words = filter.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (filter.type && row.type !== filter.type) return false;
    const isSaved = savedPrice(saved, row.code) !== undefined;
    if (filter.show === 'placeholder' && isSaved) return false;
    if (filter.show === 'set' && !isSaved) return false;
    if (words.length === 0) return true;
    const text = `${row.name} ${row.code} ${row.supplierName ?? ''} ${row.type}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** The types the garments are in, in the order they first appear, with how many garments each has. */
export function typeOptions(rows: readonly PodGarmentRow[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  return [...counts].map(([type, count]) => ({ type, count }));
}

/** How many garments are still on their placeholder price (not saved). */
export function placeholderCount(rows: readonly PodGarmentRow[], saved: SavedShopPrices): number {
  return rows.filter((row) => savedPrice(saved, row.code) === undefined).length;
}

// ---------------------------------------------------------------------------
// The example prices

/** The garment the examples start on: a T-shirt with a saved price, else any T-shirt, else the first garment. */
export function defaultPreviewCode(rows: readonly PodGarmentRow[], saved: SavedShopPrices): string | null {
  const shirts = rows.filter((row) => row.type === 'T-shirts');
  return (shirts.find((row) => savedPrice(saved, row.code)) ?? shirts[0] ?? rows[0])?.code ?? null;
}

export interface PreviewBase {
  baseCents: number;
  extras: PodExtras;
  /** the price is the placeholder, not one the owner set */
  placeholder: boolean;
}

/** What the examples are drawn from for a garment and a print method: the typed price while it can be read, else the saved one,
 * else the placeholder; the typed extras while they can be read, else the saved ones. Null for a garment with no price at all. */
export function previewBase(values: ShopFormValues, rows: readonly PodGarmentRow[], saved: SavedShopPrices, code: string, method: 'dtg' | 'dtf'): PreviewBase | null {
  const row = rows.find((r) => r.code === code);
  if (!row) return null;
  const typedMain = readExtra(values.secondMain);
  const typedSleeves = readExtra(values.sleeves);
  const extras: PodExtras = {
    secondMainPrintCents: typedMain.ok ? typedMain.cents : saved.extras.secondMainPrintCents,
    sleevesCents: typedSleeves.ok ? typedSleeves.cents : saved.extras.sleevesCents,
  };

  const boxes = values.rows[code];
  const before = savedPrice(saved, code);
  const typed = boxes?.set ? readPrice(boxes.base) : null;
  if (boxes?.set && typed?.ok) {
    const dtf = boxes.dtf.trim() === '' ? null : readPrice(boxes.dtf);
    const price: PodGarmentPrice = { cents: typed.cents, ...(dtf?.ok ? { dtfCents: dtf.cents } : {}) };
    return { baseCents: baseCentsFor(price, method), extras, placeholder: false };
  }
  if (before) return { baseCents: baseCentsFor(before, method), extras, placeholder: false };
  return row.placeholderCents === null ? null : { baseCents: row.placeholderCents, extras, placeholder: true };
}
