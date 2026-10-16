// Screen-print pricing for runs (Documentation/Dev/Print-Prep-Plan.md section 10).
//
// A screen-printed run is priced on the number of screens its design really
// uses (the white underbase and the highlight white included), its print
// positions, the print size and the quantity. 1 to 8 screens is standard; from
// 9 to 15, each screen above 8 adds EXTRA_SCREEN_CENTS_PER_PIECE (EUR 1) per
// piece. That surcharge is a fixed rule, not a setting. Everything else lives
// in a table the owner edits at /admin/pricing.
//
// Pure functions only, no server imports: the Studio's price line, the admin
// editor and the quote service all read this one file, so they cannot disagree.
// Money is integer cents, EUR.
import { ABSOLUTE_MAX_SCREENS, EXTRA_SCREEN_CENTS_PER_PIECE, STANDARD_MAX_SCREENS } from '@/lib/print/defaults';

export { ABSOLUTE_MAX_SCREENS, EXTRA_SCREEN_CENTS_PER_PIECE, STANDARD_MAX_SCREENS };

// ---------------------------------------------------------------------------
// The table

/** The print price per piece for a number of screens: one price for each quantity break. */
export interface ScreenTier {
  /** the tier starts at this many screens and runs to the next tier's start; the last tier also covers 9 to 15 (plus the fixed surcharge) */
  fromScreens: number;
  /** cents per piece, one for each entry of `breaks` */
  printCents: number[];
}

/** A percentage of the base print price for prints this wide or wider. */
export interface SizeBand {
  fromWidthCm: number;
  /** 100 = no change */
  percent: number;
}

export interface ScreenPriceTable {
  /** quantity breaks in pieces: ascending, the first is 1 */
  breaks: number[];
  /** ascending by fromScreens; the first is 1 and the last starts at 8 at most */
  tiers: ScreenTier[];
  /** one-off cost of making each screen, charged once for each set of screens in a run (cents; 0 = none) */
  setupCentsPerScreen: number;
  /** what each print position after the first costs, as a percentage of its own price (100 = the same) */
  additionalPlacementPercent: number;
  /** margin on the garment plus the print, in percent */
  marginPercent: number;
  /** ascending by fromWidthCm; the first is 0 */
  sizeBands: SizeBand[];
}

export const SCREEN_TABLE_LIMITS = {
  /** most quantity breaks */
  maxBreaks: 8,
  /** most tiers: one for each standard screen count */
  maxTiers: STANDARD_MAX_SCREENS,
  maxSizeBands: 6,
  maxQty: 100_000,
  /** a price, a setup fee, in cents */
  maxCents: 100_000,
  maxPercent: 300,
  maxWidthCm: 200,
} as const;

/** The old seed's print costs (scripts/seed.ts): 1 colour 350, 2 colours 520, 3 colours 690 cents a piece, then 8, 15 and 22 percent
 * off at 25, 50 and 100 pieces. The placeholder table continues the same step for 4 to 8 screens. */
const SEED_FIRST_SCREEN_CENTS = 350;
const SEED_STEP_CENTS = 170;
const SEED_BREAKS: readonly (readonly [qtyFrom: number, cut: number])[] = [
  [1, 0],
  [25, 0.08],
  [50, 0.15],
  [100, 0.22],
];

/** The placeholder table used until the owner saves one. It reproduces the old seed's prices for 1, 2 and 3 screens and a 30 percent
 * margin, with no setup fee, no discount on a second print position and no size effect. */
export function defaultScreenPriceTable(): ScreenPriceTable {
  return {
    breaks: SEED_BREAKS.map(([qtyFrom]) => qtyFrom),
    tiers: Array.from({ length: STANDARD_MAX_SCREENS }, (_, i) => ({
      fromScreens: i + 1,
      printCents: SEED_BREAKS.map(([, cut]) => Math.round((SEED_FIRST_SCREEN_CENTS + SEED_STEP_CENTS * i) * (1 - cut))),
    })),
    setupCentsPerScreen: 0,
    additionalPlacementPercent: 100,
    marginPercent: 30,
    sizeBands: [{ fromWidthCm: 0, percent: 100 }],
  };
}

// ---------------------------------------------------------------------------
// Which services this prices

/** Screen print services are the codes that start with 'screen_' (screen_1c, screen_2c, screen_3c). The number in the code
 * is only a first guess at the colours: the price follows the design's real screen count. */
export function isScreenServiceCode(code: string): boolean {
  return code.startsWith('screen_');
}

// ---------------------------------------------------------------------------
// Words

/** 300 -> '€3', 150 -> '€1.50'. */
export function euros(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}€${rest === 0 ? whole : `${whole}.${String(rest).padStart(2, '0')}`}`;
}

export function screensLabel(n: number): string {
  return `${n} ${n === 1 ? 'screen' : 'screens'}`;
}

// ---------------------------------------------------------------------------
// Validation

export type TableCheck = { ok: true; table: ScreenPriceTable } | { ok: false; error: string; /** the input to look at, in the editor's naming ('tiers.2.cells.1', 'margin') */ field?: string };

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function bad(error: string, field?: string): TableCheck {
  return { ok: false, error, ...(field ? { field } : {}) };
}

/** A table from untrusted input (a form, a settings row): every number checked, the shape fixed, wrong values named in plain words.
 * The prices must make sense too: more screens never cost less, and more pieces never cost more a piece. */
export function checkScreenPriceTable(input: unknown): TableCheck {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return bad('The price table is missing.');
  const raw = input as Record<string, unknown>;
  const L = SCREEN_TABLE_LIMITS;

  // quantity breaks
  const rawBreaks = raw.breaks;
  if (!Array.isArray(rawBreaks) || rawBreaks.length === 0) return bad('Add at least one quantity break.', 'breaks');
  if (rawBreaks.length > L.maxBreaks) return bad(`Use at most ${L.maxBreaks} quantity breaks.`, 'breaks');
  const breaks: number[] = [];
  for (const [i, value] of rawBreaks.entries()) {
    if (!isInt(value) || value < 1 || value > L.maxQty) return bad(`Quantity breaks are whole numbers of pieces, from 1 to ${L.maxQty.toLocaleString('en-GB')}.`, `breaks.${i}`);
    if (i === 0 && value !== 1) return bad('The first quantity break must be 1 piece, so every quantity has a price.', `breaks.${i}`);
    if (i > 0 && value <= breaks[i - 1]) return bad(`Quantity breaks must go up: ${value} comes after ${breaks[i - 1]}.`, `breaks.${i}`);
    breaks.push(value);
  }

  // tiers
  const rawTiers = raw.tiers;
  if (!Array.isArray(rawTiers) || rawTiers.length === 0) return bad('Add at least one screen tier.', 'tiers');
  if (rawTiers.length > L.maxTiers) return bad(`Use at most ${L.maxTiers} screen tiers.`, 'tiers');
  const tiers: ScreenTier[] = [];
  for (const [i, value] of rawTiers.entries()) {
    const tier = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    if (!tier || !isInt(tier.fromScreens) || tier.fromScreens < 1 || tier.fromScreens > STANDARD_MAX_SCREENS) {
      return bad(`A tier starts at a whole number of screens, from 1 to ${STANDARD_MAX_SCREENS}. More than ${STANDARD_MAX_SCREENS} screens uses the last tier plus the fixed surcharge.`, `tiers.${i}.from`);
    }
    if (i === 0 && tier.fromScreens !== 1) return bad('The first tier must start at 1 screen.', `tiers.${i}.from`);
    if (i > 0 && tier.fromScreens <= tiers[i - 1].fromScreens) return bad(`Tiers must go up: ${tier.fromScreens} screens comes after ${tiers[i - 1].fromScreens}.`, `tiers.${i}.from`);
    const cells = tier.printCents;
    if (!Array.isArray(cells) || cells.length !== breaks.length) return bad('Every tier needs a price for every quantity break.', `tiers.${i}.cells.0`);
    const printCents: number[] = [];
    for (const [j, cell] of cells.entries()) {
      if (!isInt(cell) || cell < 0 || cell > L.maxCents) return bad(`Prices run from ${euros(0)} to ${euros(L.maxCents)} a piece.`, `tiers.${i}.cells.${j}`);
      printCents.push(cell);
    }
    tiers.push({ fromScreens: tier.fromScreens, printCents });
  }

  // prices that make sense
  const tierName = (i: number) => {
    const from = tiers[i].fromScreens;
    const to = (tiers[i + 1]?.fromScreens ?? STANDARD_MAX_SCREENS + 1) - 1;
    return from >= to ? screensLabel(from) : `${from} to ${to} screens`;
  };
  for (let i = 0; i < tiers.length; i++) {
    for (let j = 0; j < breaks.length; j++) {
      if (j > 0 && tiers[i].printCents[j] > tiers[i].printCents[j - 1]) {
        return bad(`For ${tierName(i)}, ${breaks[j]} pieces cost more a piece than ${breaks[j - 1]}. A bigger quantity should not cost more.`, `tiers.${i}.cells.${j}`);
      }
      if (i > 0 && tiers[i].printCents[j] < tiers[i - 1].printCents[j]) {
        return bad(`At ${breaks[j]} pieces, ${tierName(i)} cost less than ${tierName(i - 1)}. More screens should not cost less.`, `tiers.${i}.cells.${j}`);
      }
    }
  }

  // the other settings
  if (!isInt(raw.setupCentsPerScreen) || raw.setupCentsPerScreen < 0 || raw.setupCentsPerScreen > L.maxCents) {
    return bad(`The setup fee for each screen runs from ${euros(0)} to ${euros(L.maxCents)}.`, 'setup');
  }
  if (!isInt(raw.additionalPlacementPercent) || raw.additionalPlacementPercent < 0 || raw.additionalPlacementPercent > L.maxPercent) {
    return bad(`A second print position costs from 0 to ${L.maxPercent} percent of its own price.`, 'additional');
  }
  if (!isInt(raw.marginPercent) || raw.marginPercent < 0 || raw.marginPercent > L.maxPercent) {
    return bad(`The margin runs from 0 to ${L.maxPercent} percent.`, 'margin');
  }

  // print sizes
  const rawBands = raw.sizeBands;
  if (!Array.isArray(rawBands) || rawBands.length === 0) return bad('Add at least one print size band.', 'bands');
  if (rawBands.length > L.maxSizeBands) return bad(`Use at most ${L.maxSizeBands} print size bands.`, 'bands');
  const sizeBands: SizeBand[] = [];
  for (const [i, value] of rawBands.entries()) {
    const band = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    if (!band || !isInt(band.fromWidthCm) || band.fromWidthCm < 0 || band.fromWidthCm > L.maxWidthCm) {
      return bad(`A size band starts at a whole number of centimetres, from 0 to ${L.maxWidthCm}.`, `bands.${i}.from`);
    }
    if (i === 0 && band.fromWidthCm !== 0) return bad('The first size band must start at 0 cm, so every print has a price.', `bands.${i}.from`);
    if (i > 0 && band.fromWidthCm <= sizeBands[i - 1].fromWidthCm) return bad(`Size bands must go up: ${band.fromWidthCm} cm comes after ${sizeBands[i - 1].fromWidthCm} cm.`, `bands.${i}.from`);
    if (!isInt(band.percent) || band.percent < 1 || band.percent > L.maxPercent) return bad(`A size band runs from 1 to ${L.maxPercent} percent of the base price.`, `bands.${i}.percent`);
    sizeBands.push({ fromWidthCm: band.fromWidthCm, percent: band.percent });
  }

  return {
    ok: true,
    table: { breaks, tiers, setupCentsPerScreen: raw.setupCentsPerScreen, additionalPlacementPercent: raw.additionalPlacementPercent, marginPercent: raw.marginPercent, sizeBands },
  };
}

// ---------------------------------------------------------------------------
// Lookups

/** The tier a number of screens falls in; more than the last tier starts at uses the last. */
export function tierFor(table: ScreenPriceTable, screens: number): ScreenTier {
  let found = table.tiers[0];
  for (const tier of table.tiers) if (tier.fromScreens <= screens) found = tier;
  return found;
}

/** Index of the quantity break a quantity falls in; a quantity under the first break uses the first. */
export function breakIndexFor(table: ScreenPriceTable, qty: number): number {
  let found = 0;
  table.breaks.forEach((from, i) => {
    if (from <= qty) found = i;
  });
  return found;
}

export function sizeBandFor(table: ScreenPriceTable, widthCm: number): SizeBand {
  let found = table.sizeBands[0];
  for (const band of table.sizeBands) if (band.fromWidthCm <= widthCm) found = band;
  return found;
}

/** The base print price for one print position: tier and quantity break, before the size band and any second-position rate. */
export function basePrintCents(table: ScreenPriceTable, screens: number, qty: number): number {
  return tierFor(table, screens).printCents[breakIndexFor(table, qty)];
}

// ---------------------------------------------------------------------------
// The fixed rule: each screen above 8 adds EUR 1 a piece, up to 15

export function isPrintableScreenCount(screens: number): boolean {
  return Number.isInteger(screens) && screens >= 1 && screens <= ABSOLUTE_MAX_SCREENS;
}

export function screensAboveStandard(screens: number): number {
  return Math.max(0, Math.floor(screens) - STANDARD_MAX_SCREENS);
}

/** Cents a piece added for the screens above 8. */
export function screenSurchargeCents(screens: number): number {
  return screensAboveStandard(screens) * EXTRA_SCREEN_CENTS_PER_PIECE;
}

export interface ScreenEffect {
  screens: number;
  /** screens above the standard 8 */
  over: number;
  /** cents a piece */
  surchargeCents: number;
  /** more than the press can print */
  refused: boolean;
  /** '6 screens: no surcharge', '11 screens: +€3 per piece' */
  line: string;
  /** the fixed rule, in a sentence */
  rule: string;
}

/** The fixed rule in a sentence: 'On a run, each screen above 8 adds €1 per piece, up to 15 screens.' */
export const SCREEN_RULE = `On a run, each screen above ${STANDARD_MAX_SCREENS} adds ${euros(EXTRA_SCREEN_CENTS_PER_PIECE)} per piece, up to ${ABSOLUTE_MAX_SCREENS} screens.`;

/** What a screen count does to a run's price, in the words the Studio and the assistant use. */
export function describeScreenEffect(screens: number): ScreenEffect {
  const count = Number.isFinite(screens) ? Math.floor(screens) : 0;
  const over = screensAboveStandard(count);
  const refused = count > ABSOLUTE_MAX_SCREENS;
  let line: string;
  if (count < 1) line = 'No screens to print yet';
  else if (refused) line = `${screensLabel(count)}: more than the ${ABSOLUTE_MAX_SCREENS} we can print`;
  else if (over === 0) line = `${screensLabel(count)}: no surcharge`;
  else line = `${screensLabel(count)}: +${euros(over * EXTRA_SCREEN_CENTS_PER_PIECE)} per piece`;
  return { screens: count, over, surchargeCents: refused ? 0 : over * EXTRA_SCREEN_CENTS_PER_PIECE, refused, line, rule: SCREEN_RULE };
}

// ---------------------------------------------------------------------------
// A price

export interface PricedPlacement {
  screens: number;
  widthCm: number;
}

export interface ScreenPriceInput {
  /** the blank's cost a piece */
  garmentCents: number;
  qty: number;
  /** every print position on the garment */
  placements: PricedPlacement[];
}

export interface PlacementPrice {
  screens: number;
  widthCm: number;
  /** tier and quantity break only */
  baseCents: number;
  /** after the size band, and the second-position rate for every position but the dearest */
  printCents: number;
  /** cents a piece for screens above 8 */
  surchargeCents: number;
  /** priced at the second-position rate */
  additional: boolean;
}

export interface ScreenPrice {
  garmentCents: number;
  /** all positions, before the margin */
  printCents: number;
  marginCents: number;
  /** all positions */
  surchargeCents: number;
  /** what one piece costs the artist */
  unitCents: number;
  /** in the order given */
  placements: PlacementPrice[];
}

export type PriceResult = { ok: true; value: ScreenPrice } | { ok: false; error: string };

/** What one piece of a screen-printed run costs: garment, plus the print at each position (tier by its own screen count, quantity
 * break, size band; every position after the dearest at the second-position rate), plus the margin on those, plus the fixed
 * surcharge for screens above 8. A position that needs more than 15 screens is refused. */
export function priceScreenPrint(table: ScreenPriceTable, input: ScreenPriceInput): PriceResult {
  if (input.placements.length === 0) return { ok: false, error: 'Say where the print goes.' };
  for (const placement of input.placements) {
    if (placement.screens > ABSOLUTE_MAX_SCREENS) {
      return { ok: false, error: `${screensLabel(placement.screens)} is more than the ${ABSOLUTE_MAX_SCREENS} we can print. Use fewer screens.` };
    }
    if (!isPrintableScreenCount(placement.screens)) return { ok: false, error: 'A print needs at least one screen.' };
  }

  const sized = input.placements.map((placement) =>
    Math.round((basePrintCents(table, placement.screens, input.qty) * sizeBandFor(table, placement.widthCm).percent) / 100),
  );
  // The dearest position pays in full: the discount for a second one never lands on the print that costs most.
  const first = sized.indexOf(Math.max(...sized));
  const placements: PlacementPrice[] = input.placements.map((placement, i) => ({
    screens: placement.screens,
    widthCm: placement.widthCm,
    baseCents: basePrintCents(table, placement.screens, input.qty),
    printCents: i === first ? sized[i] : Math.round((sized[i] * table.additionalPlacementPercent) / 100),
    surchargeCents: screenSurchargeCents(placement.screens),
    additional: i !== first,
  }));

  const printCents = placements.reduce((sum, p) => sum + p.printCents, 0);
  const surchargeCents = placements.reduce((sum, p) => sum + p.surchargeCents, 0);
  const marginCents = Math.round(((input.garmentCents + printCents) * table.marginPercent) / 100);
  return {
    ok: true,
    value: { garmentCents: input.garmentCents, printCents, marginCents, surchargeCents, unitCents: input.garmentCents + printCents + marginCents + surchargeCents, placements },
  };
}

/** The one-off cost of making the screens of a run: each set of screens once (a set shared by several garment colours counts once),
 * at the most screens any of its lines uses. */
export function setupCentsFor(table: ScreenPriceTable, sets: readonly { id: string; screens: number }[]): number {
  const byId = new Map<string, number>();
  for (const set of sets) byId.set(set.id, Math.max(byId.get(set.id) ?? 0, set.screens));
  let screens = 0;
  for (const count of byId.values()) screens += count;
  return screens * table.setupCentsPerScreen;
}

// ---------------------------------------------------------------------------
// A first guess, when the design's screens are not known yet

/** Colours for a screen service with no number in its code. */
const DEFAULT_ESTIMATE_COLOURS = 3;

/** The colours a legacy service code names: screen_2c is 2. */
export function coloursOfService(code: string): number {
  const match = /^screen_(\d+)c$/.exec(code);
  const n = match ? Number(match[1]) : DEFAULT_ESTIMATE_COLOURS;
  return Math.min(STANDARD_MAX_SCREENS, Math.max(1, n));
}

/** How many screens a job probably needs: its colours, and on a dark garment the white underbase and the highlight white. Never
 * more than the standard 8, so a guess never carries the surcharge. */
export function estimateScreens(colours: number, lightGarment: boolean): number {
  return Math.min(STANDARD_MAX_SCREENS, Math.max(1, Math.round(colours) + (lightGarment ? 0 : 2)));
}

// ---------------------------------------------------------------------------
// What a quote line records about its screens

export interface LineScreenPlacement {
  position: string;
  widthCm: number;
  screens: number;
  /** 'pack': from the design's print files; 'estimate': a first guess */
  basis: 'pack' | 'estimate';
  /** what the one-off setup is shared by: the print files' id, or an 'est:' key for a guess */
  setId: string;
  /** the artist has approved the print files this count comes from (always false for a guess) */
  approved: boolean;
  /** the design's screen files are being made (again) while this was priced, so the count can still change */
  pending?: boolean;
}

export interface LineScreens {
  /** 'estimate' when any position is a guess */
  basis: 'pack' | 'estimate';
  /** the most screens any position of the line uses */
  count: number;
  /** cents a piece, all positions */
  surchargeCentsPerPiece: number;
  placements: LineScreenPlacement[];
  /** '6 screens: no surcharge', 'Estimate: 4 screens: no surcharge' */
  summary: string;
  /** why it is a guess, or what to know about the count; absent when there is nothing to add */
  note?: string;
}

function positionWords(position: string): string {
  return position.replace(/_/g, ' ');
}

/** The one line a quote shows for a line's screens. */
export function summariseLineScreens(placements: readonly LineScreenPlacement[], basis: 'pack' | 'estimate'): string {
  const surcharge = placements.reduce((sum, p) => sum + screenSurchargeCents(p.screens), 0);
  const prefix = basis === 'estimate' ? 'Estimate: ' : '';
  if (placements.length === 1) return `${prefix}${describeScreenEffect(placements[0].screens).line}`;
  const parts = placements.map((p) => `${positionWords(p.position)} ${screensLabel(p.screens)}`).join(', ');
  return `${prefix}${parts}: ${surcharge > 0 ? `+${euros(surcharge)} per piece` : 'no surcharge'}`;
}
