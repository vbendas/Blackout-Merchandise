// The logic behind the screen-print price editor (/admin/pricing): the table as
// the strings in its boxes, turned back into a table (with an error for each box
// that needs a look), the rows and columns that can be added or taken away, and
// the example prices drawn from what is typed. No React and nothing server-only,
// so the editor and its tests share it. The server checks the table again
// (checkScreenPriceTable): a browser can send anything.
import {
  SCREEN_TABLE_LIMITS,
  STANDARD_MAX_SCREENS,
  checkScreenPriceTable,
  priceScreenPrint,
  screenSurchargeCents,
  screensLabel,
  type ScreenPriceTable,
} from '@/lib/pricing/screen-print';

export interface PriceFormValues {
  /** quantity breaks, in pieces */
  breaks: string[];
  tiers: { from: string; cells: string[] }[];
  /** euros for each screen */
  setup: string;
  /** percent of a position's own price */
  additional: string;
  /** percent */
  margin: string;
  bands: { from: string; percent: string }[];
}

/** Box name -> what is wrong with it. The names are the ones checkScreenPriceTable gives ('tiers.2.cells.1', 'margin'), plus 'form' for a problem with no box. */
export type PriceFormErrors = Record<string, string>;

export type PriceFormResult = { ok: true; table: ScreenPriceTable } | { ok: false; errors: PriceFormErrors; /** the first box to look at, in the order the page lists them */ first: string };

/** 520 -> '5.20'. */
export function eurosText(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formFromTable(table: ScreenPriceTable): PriceFormValues {
  return {
    breaks: table.breaks.map(String),
    tiers: table.tiers.map((tier) => ({ from: String(tier.fromScreens), cells: tier.printCents.map(eurosText) })),
    setup: eurosText(table.setupCentsPerScreen),
    additional: String(table.additionalPlacementPercent),
    margin: String(table.marginPercent),
    bands: table.sizeBands.map((band) => ({ from: String(band.fromWidthCm), percent: String(band.percent) })),
  };
}

function wholeNumber(text: string): number | null {
  const clean = text.trim();
  return /^\d{1,9}$/.test(clean) ? Number(clean) : null;
}

/** '3.50', '3,5' and '3' are amounts; '3.505', '-1' and 'abc' are not. */
export function cents(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

const WHOLE = 'Use a whole number.';
const AMOUNT = 'Use an amount like 3.50.';

/** The table the boxes say, or an error for each box that can't be read or that makes the table wrong. */
export function tableFromForm(values: PriceFormValues): PriceFormResult {
  const errors: PriceFormErrors = {};

  const breaks = values.breaks.map((text, i) => {
    const n = wholeNumber(text);
    if (n === null) errors[`breaks.${i}`] = WHOLE;
    return n ?? 0;
  });
  const tiers = values.tiers.map((tier, i) => {
    const from = wholeNumber(tier.from);
    if (from === null) errors[`tiers.${i}.from`] = WHOLE;
    const printCents = tier.cells.map((text, j) => {
      const c = cents(text);
      if (c === null) errors[`tiers.${i}.cells.${j}`] = AMOUNT;
      return c ?? 0;
    });
    return { fromScreens: from ?? 0, printCents };
  });
  const setup = cents(values.setup);
  if (setup === null) errors.setup = AMOUNT;
  const additional = wholeNumber(values.additional);
  if (additional === null) errors.additional = WHOLE;
  const margin = wholeNumber(values.margin);
  if (margin === null) errors.margin = WHOLE;
  const bands = values.bands.map((band, i) => {
    const from = wholeNumber(band.from);
    if (from === null) errors[`bands.${i}.from`] = WHOLE;
    const percent = wholeNumber(band.percent);
    if (percent === null) errors[`bands.${i}.percent`] = WHOLE;
    return { fromWidthCm: from ?? 0, percent: percent ?? 0 };
  });

  if (Object.keys(errors).length === 0) {
    const checked = checkScreenPriceTable({
      breaks,
      tiers,
      setupCentsPerScreen: setup,
      additionalPlacementPercent: additional,
      marginPercent: margin,
      sizeBands: bands,
    });
    if (checked.ok) return { ok: true, table: checked.table };
    errors[checked.field ?? 'form'] = checked.error;
  }
  return { ok: false, errors, first: firstBox(values, errors) };
}

/** The first box with an error, in the order the page lists them. */
export function firstBox(values: PriceFormValues, errors: PriceFormErrors): string {
  const order = [
    ...values.breaks.map((_, i) => `breaks.${i}`),
    ...values.tiers.flatMap((tier, i) => [`tiers.${i}.from`, ...tier.cells.map((_, j) => `tiers.${i}.cells.${j}`)]),
    'setup',
    'additional',
    'margin',
    ...values.bands.flatMap((_, i) => [`bands.${i}.from`, `bands.${i}.percent`]),
  ];
  return order.find((key) => errors[key]) ?? Object.keys(errors)[0] ?? 'form';
}

// ---------------------------------------------------------------------------
// Rows and columns

/** The next whole number up, or the last when it is already at the top. */
function nextUp(current: string, step: number, top: number): string {
  const n = wholeNumber(current);
  return String(n === null ? step : Math.min(top, n + step));
}

export function canAddBreak(values: PriceFormValues): boolean {
  return values.breaks.length < SCREEN_TABLE_LIMITS.maxBreaks;
}

/** A new quantity break after the last, priced like the last. */
export function addBreak(values: PriceFormValues): PriceFormValues {
  if (!canAddBreak(values)) return values;
  const last = values.breaks[values.breaks.length - 1];
  const lastN = wholeNumber(last) ?? 1;
  return {
    ...values,
    breaks: [...values.breaks, String(Math.min(SCREEN_TABLE_LIMITS.maxQty, lastN < 25 ? 25 : lastN * 2))],
    tiers: values.tiers.map((tier) => ({ ...tier, cells: [...tier.cells, tier.cells[tier.cells.length - 1] ?? '0.00'] })),
  };
}

/** The first break stays: every quantity needs a price. */
export function removeBreak(values: PriceFormValues, index: number): PriceFormValues {
  if (index <= 0 || index >= values.breaks.length) return values;
  return {
    ...values,
    breaks: values.breaks.filter((_, i) => i !== index),
    tiers: values.tiers.map((tier) => ({ ...tier, cells: tier.cells.filter((_, i) => i !== index) })),
  };
}

export function canAddTier(values: PriceFormValues): boolean {
  const last = wholeNumber(values.tiers[values.tiers.length - 1]?.from ?? '');
  return values.tiers.length < SCREEN_TABLE_LIMITS.maxTiers && (last === null || last < STANDARD_MAX_SCREENS);
}

/** A new tier after the last, one screen up and priced like the last. */
export function addTier(values: PriceFormValues): PriceFormValues {
  if (!canAddTier(values)) return values;
  const last = values.tiers[values.tiers.length - 1];
  return { ...values, tiers: [...values.tiers, { from: nextUp(last.from, 1, STANDARD_MAX_SCREENS), cells: [...last.cells] }] };
}

/** The first tier stays: every screen count needs a price. */
export function removeTier(values: PriceFormValues, index: number): PriceFormValues {
  if (index <= 0 || index >= values.tiers.length) return values;
  return { ...values, tiers: values.tiers.filter((_, i) => i !== index) };
}

export function canAddBand(values: PriceFormValues): boolean {
  return values.bands.length < SCREEN_TABLE_LIMITS.maxSizeBands;
}

/** A new size band after the last, 10 cm wider and at the same percentage. */
export function addBand(values: PriceFormValues): PriceFormValues {
  if (!canAddBand(values)) return values;
  const last = values.bands[values.bands.length - 1];
  return { ...values, bands: [...values.bands, { from: nextUp(last.from, 10, SCREEN_TABLE_LIMITS.maxWidthCm), percent: last.percent }] };
}

/** The first band stays: every print size needs a price. */
export function removeBand(values: PriceFormValues, index: number): PriceFormValues {
  if (index <= 0 || index >= values.bands.length) return values;
  return { ...values, bands: values.bands.filter((_, i) => i !== index) };
}

/** What a tier covers, in words: '1 screen', '3 to 4 screens', '7 to 8 screens'. The last tier runs to the standard 8; more than
 * that uses its price plus the fixed surcharge. */
export function tierLabel(values: PriceFormValues, index: number): string {
  const from = wholeNumber(values.tiers[index]?.from ?? '');
  if (from === null) return 'Screens';
  const nextFrom = wholeNumber(values.tiers[index + 1]?.from ?? '');
  const to = nextFrom === null ? STANDARD_MAX_SCREENS : nextFrom - 1;
  if (from > to) return screensLabel(from);
  return from === to ? screensLabel(from) : `${from} to ${to} screens`;
}

/** What a size band covers, in words: 'Up to 14 cm', '15 to 29 cm', '30 cm and wider'. */
export function bandLabel(values: PriceFormValues, index: number): string {
  const from = wholeNumber(values.bands[index]?.from ?? '');
  if (from === null) return 'Print width';
  const next = wholeNumber(values.bands[index + 1]?.from ?? '');
  if (index === 0) return next === null ? 'Any width' : `Up to ${next - 1} cm`;
  if (next === null) return `${from} cm and wider`;
  return next - 1 <= from ? `${from} cm` : `${from} to ${next - 1} cm`;
}

// ---------------------------------------------------------------------------
// Example prices

/** The blank an example is priced on. */
export const EXAMPLE_GARMENT_CENTS = 650;
const EXAMPLE_WIDTH_CM = 28;

export interface ExampleRow {
  screens: number;
  /** the fixed charge a piece for screens above 8, already inside unitCents */
  surchargeCents: number;
  /** one price a piece for each quantity break, surcharge included */
  unitCents: number[];
}

/** What a piece costs for every screen count, 1 to 15, at each quantity break: a blank at EXAMPLE_GARMENT_CENTS, one print
 * position at 28 cm. Drawn from the table as typed, so a typo shows before it is saved. */
export function exampleRows(table: ScreenPriceTable): ExampleRow[] {
  const rows: ExampleRow[] = [];
  for (let screens = 1; screens <= 15; screens++) {
    const unitCents = table.breaks.map((qty) => {
      const priced = priceScreenPrint(table, { garmentCents: EXAMPLE_GARMENT_CENTS, qty, placements: [{ screens, widthCm: EXAMPLE_WIDTH_CM }] });
      return priced.ok ? priced.value.unitCents : 0;
    });
    rows.push({ screens, surchargeCents: screenSurchargeCents(screens), unitCents });
  }
  return rows;
}
