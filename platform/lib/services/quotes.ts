import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import {
  ABSOLUTE_MAX_SCREENS,
  coloursOfService,
  estimateScreens,
  isScreenServiceCode,
  priceScreenPrint,
  screensLabel,
  summariseLineScreens,
  type LineScreenPlacement,
  type LineScreens,
  type PricedPlacement,
  type ScreenPriceTable,
} from '@/lib/pricing/screen-print';
import type { PrintJobInput, PrintPlacement, PrintTechnique } from '@/lib/print/types';
import { getScreenPriceTable } from '@/lib/services/pricing-admin';

// Pricing over the seeded base_costs table: garment + print + margin per
// blank x print service x quantity break. Artists never see the components —
// only the total per unit and the grand total for their requested quantity.
//
// Screen print is the exception (Print-Prep-Plan section 10). A screen-printed
// run is priced from the screen-print price table by the number of screens the
// design really uses, which is read from the design's print files for that
// garment colour, not from the service the artist picked. base_costs still
// supplies the blank's garment cost; it has no screen rows any more.

export interface QuoteBreak {
  qtyFrom: number;
  unitCents: number;
}

export interface Quote {
  unitBaseCostCents: number;
  totalCents: number;
  breaks: QuoteBreak[];
  /** a screen-print price from a first guess at the screens, not from a design's print files */
  estimate?: boolean;
  /** the screens the estimate assumed */
  screens?: number;
}

export interface QuoteForInput {
  blankCode: string;
  printServiceCode: string;
  qty: number;
  /** screen print only: the garment colour, which decides whether a white underbase is assumed */
  colourCode?: string;
}

export type QuoteResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** All quantity breaks for a blank x print service, ascending by qtyFrom, EUR only. */
async function loadBreaks(blankCode: string, printServiceCode: string): Promise<QuoteBreak[]> {
  const rows = await db
    .select({ qtyFrom: schema.baseCosts.qtyFrom, totalCents: schema.baseCosts.totalCents })
    .from(schema.baseCosts)
    .where(
      and(
        eq(schema.baseCosts.blankCode, blankCode),
        eq(schema.baseCosts.printServiceCode, printServiceCode),
        eq(schema.baseCosts.currency, 'EUR'),
      ),
    )
    .orderBy(asc(schema.baseCosts.qtyFrom));

  return rows
    .filter((r): r is { qtyFrom: number; totalCents: number } => r.totalCents != null)
    .map((r) => ({ qtyFrom: r.qtyFrom, unitCents: r.totalCents }));
}

/**
 * Price `qty` units of a blank printed with a given service. Picks the row
 * with the largest qtyFrom <= qty (breaks are ascending, so the last one
 * that still qualifies wins). Returns null when nothing is priced for this
 * blank/service pair at all. A screen print service is priced from the
 * screen-print table, as an estimate (see quoteScreenLine for a run line).
 */
export async function quoteFor(input: QuoteForInput): Promise<Quote | null> {
  if (isScreenServiceCode(input.printServiceCode)) return quoteScreenEstimate(input);

  const breaks = await loadBreaks(input.blankCode, input.printServiceCode);
  if (breaks.length === 0) return null;

  const applicable = breaks.filter((b) => b.qtyFrom <= input.qty).at(-1) ?? breaks[0];
  const unitBaseCostCents = applicable.unitCents;

  return {
    unitBaseCostCents,
    totalCents: unitBaseCostCents * input.qty,
    breaks,
  };
}

export interface PrintServiceOption {
  code: string;
  name: string;
  /** false for run-only methods (screen print): a shop product cannot use them */
  availableInShop: boolean;
}

/** Print services offered on a given blank. */
export async function printServicesFor(blankCode: string): Promise<PrintServiceOption[]> {
  return db
    .select({ code: schema.printServices.code, name: schema.printServices.name, availableInShop: schema.printServices.availableInShop })
    .from(schema.blankPrintServices)
    .innerJoin(schema.printServices, eq(schema.blankPrintServices.printServiceCode, schema.printServices.code))
    .where(eq(schema.blankPrintServices.blankCode, blankCode));
}

/** 'dtg (Direct-to-garment print), dtf (Direct-to-film print)': codes the model can pass back, with the names people read. */
export function describeServices(services: PrintServiceOption[]): string {
  return services.map((s) => `${s.code} (${s.name})`).join(', ');
}

/**
 * The print technique a service belongs to, as print prep names it: screen
 * print, or DTG/DTF. Embroidery is outside print prep and has none. A run
 * line carries the service its artist chose at quote time, so production
 * reads the technique from there, never from the shop product the run was
 * quoted off.
 */
export function techniqueOfService(code: string): PrintTechnique | null {
  if (isScreenServiceCode(code)) return 'screen';
  if (code === 'dtg' || code === 'dtf') return 'dtg_dtf';
  return null;
}

// ---------------------------------------------------------------------------
// The garment

/** A blank's garment cost at each quantity break, ascending. Every service's rows carry the same garment cost (it is
 * the blank's), so one service's rows stand for the blank: DTF, which every blank offers, then DTG, then embroidery, then
 * whatever else has rows. Screen rows are never used: they were placeholders and are no longer seeded. Null when the
 * blank has no pricing at all. */
async function loadGarmentCosts(blankCode: string): Promise<{ qtyFrom: number; cents: number }[] | null> {
  const rows = await db
    .select({ service: schema.baseCosts.printServiceCode, qtyFrom: schema.baseCosts.qtyFrom, cents: schema.baseCosts.garmentCostCents })
    .from(schema.baseCosts)
    .where(and(eq(schema.baseCosts.blankCode, blankCode), eq(schema.baseCosts.currency, 'EUR')))
    .orderBy(asc(schema.baseCosts.qtyFrom));
  const usable = rows.filter((r) => !isScreenServiceCode(r.service));
  if (usable.length === 0) return null;

  const services = [...new Set(usable.map((r) => r.service))];
  const preferred = ['dtf', 'dtg', 'embroidery'].find((s) => services.includes(s)) ?? [...services].sort()[0];
  return usable.filter((r) => r.service === preferred).map((r) => ({ qtyFrom: r.qtyFrom, cents: r.cents }));
}

function garmentCentsAt(costs: { qtyFrom: number; cents: number }[], qty: number): number {
  return (costs.filter((c) => c.qtyFrom <= qty).at(-1) ?? costs[0]).cents;
}

/** What one blank costs a piece at a quantity, whatever it is printed with (the blank's own cost, from its DTF, DTG or embroidery
 * rows). For callers that need the garment alone and have a service with no base-cost rows of its own, as screen print has none.
 * Null when the blank has no pricing at all. */
export async function blankGarmentCost(blankCode: string, qty: number): Promise<number | null> {
  const costs = await loadGarmentCosts(blankCode);
  return costs ? garmentCentsAt(costs, qty) : null;
}

async function isLightColour(colourCode: string): Promise<boolean> {
  const [row] = await db.select({ isLight: schema.colours.isLight }).from(schema.colours).where(eq(schema.colours.code, colourCode)).limit(1);
  return row?.isLight ?? false;
}

async function blankOffers(blankCode: string, printServiceCode: string): Promise<boolean> {
  const [row] = await db
    .select({ code: schema.blankPrintServices.printServiceCode })
    .from(schema.blankPrintServices)
    .where(and(eq(schema.blankPrintServices.blankCode, blankCode), eq(schema.blankPrintServices.printServiceCode, printServiceCode)))
    .limit(1);
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Screen print: an estimate with no design behind it (get_quote, a backing product)

/** The usual print width, for a price with no placement to read it from. */
const ESTIMATE_WIDTH_CM = 28;

/** A screen service priced for a blank and a quantity with no design: the screens are guessed from the service's colours (and
 * a white underbase and highlight white on a dark garment), so the answer is always an estimate. */
async function quoteScreenEstimate(input: QuoteForInput): Promise<Quote | null> {
  if (!(await blankOffers(input.blankCode, input.printServiceCode))) return null;
  const garment = await loadGarmentCosts(input.blankCode);
  if (!garment) return null;

  const table = await getScreenPriceTable();
  // With no colour named a dark garment is assumed: a guess should not undercharge.
  const light = input.colourCode ? await isLightColour(input.colourCode) : false;
  const screens = estimateScreens(coloursOfService(input.printServiceCode), light);

  const unitAt = (qty: number): number | null => {
    const priced = priceScreenPrint(table, { garmentCents: garmentCentsAt(garment, qty), qty, placements: [{ screens, widthCm: ESTIMATE_WIDTH_CM }] });
    return priced.ok ? priced.value.unitCents : null;
  };
  const breaks: QuoteBreak[] = [];
  for (const from of table.breaks) {
    const unit = unitAt(from);
    if (unit === null) return null;
    breaks.push({ qtyFrom: from, unitCents: unit });
  }
  const unitBaseCostCents = unitAt(input.qty);
  if (unitBaseCostCents === null) return null;
  return { unitBaseCostCents, totalCents: unitBaseCostCents * input.qty, breaks, estimate: true, screens };
}

// ---------------------------------------------------------------------------
// Screen print: a run line, priced by the design's screens

export interface ScreenLineInput {
  blankCode: string;
  printServiceCode: string;
  colourCode: string;
  colourName?: string;
  qty: number;
  /** the design the line prints; null when it has none yet */
  designId: string | null;
  /** every print position of the line, the main one first */
  placements: { position: string; widthCm: number; offsetYcm?: number }[];
  /** tells lines apart when they share no design, so each guess keeps its own setup */
  lineKey?: string;
}

export interface ScreenLineQuote {
  /** what one piece costs the artist, the surcharge included */
  unitCents: number;
  totalCents: number;
  garmentCents: number;
  printCents: number;
  marginCents: number;
  /** the part of unitCents that is the fixed charge for screens above 8 */
  surchargeCents: number;
  screens: LineScreens;
}

/** A stored placement (cm) as print prep names it (mm). What the line didn't say is the usual front chest at 28 cm, the way
 * pre-press reads it for an order. */
function toPrintPlacement(p: { position?: string; widthCm?: number; offsetYcm?: number }): PrintPlacement {
  return {
    position: p.position || 'front_chest',
    widthMm: Math.round((p.widthCm ?? ESTIMATE_WIDTH_CM) * 10),
    ...(p.offsetYcm === undefined || p.offsetYcm === null ? {} : { offsetYMm: Math.round(p.offsetYcm * 10) }),
  };
}

interface FoundSet {
  screens: number;
  packId: string;
  setKey: string | null;
  /** the artist's standing approval covers these print files for this colour */
  approved: boolean;
}

/** Why a design has no screen files for a line yet: none at all for the blank, none at this print position and size, none that
 * cover this garment colour, or files that print nothing on it. */
type MissingFiles = 'files' | 'position' | 'colour' | 'empty';

/** Screen print files of a design for one blank, print position and garment colour: from the version the artist approved,
 * else the newest with print files (the rule an order finds its files by, packsFor in prepress.ts). The version that has files
 * for the blank and position decides, so a colour its files don't print yet is found missing, never taken from older art.
 * `busy` is true while a job is making the design's screen files again, so a count read now may be about to change. */
async function findScreenSet(input: {
  designId: string;
  blankCode: string;
  colourCode: string;
  placement: PrintPlacement;
}): Promise<{ found: FoundSet | null; busy: boolean; missing: MissingFiles }> {
  const pipeline = await import('@/lib/print/pipeline');

  const [versions, [approval], jobs] = await Promise.all([
    db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, input.designId)).orderBy(desc(schema.designVersions.version)),
    db
      .select()
      .from(schema.designApprovals)
      .where(and(eq(schema.designApprovals.designId, input.designId), isNull(schema.designApprovals.invalidatedAt)))
      .orderBy(desc(schema.designApprovals.approvedAt))
      .limit(1),
    db
      .select({ input: schema.printJobs.input })
      .from(schema.printJobs)
      .where(
        and(
          sql`${schema.printJobs.input} ->> 'designId' = ${input.designId}`,
          inArray(schema.printJobs.status, ['queued', 'running']),
          inArray(schema.printJobs.kind, ['prepare', 'rerun']),
        ),
      ),
  ]);

  const busy = jobs.some((job) => {
    const queued = job.input as Partial<PrintJobInput> | null;
    return Array.isArray(queued?.techniques) && queued.techniques.includes('screen') && (!queued.blankCode || queued.blankCode === input.blankCode);
  });

  const ordered = approval ? [...versions.filter((v) => v.id === approval.designVersionId), ...versions.filter((v) => v.id !== approval.designVersionId)] : versions;
  let anyForBlank = false;
  for (const version of ordered) {
    const all = await pipeline.loadPacksForVersion(version.id);
    const current = all.filter((p) => p.buildStatus === 'ready' && !pipeline.isSuperseded(p));
    const ofBlank = current.filter((p) => p.technique === 'screen' && pipeline.packInfo(p)?.blankCode === input.blankCode);
    if (ofBlank.length > 0) anyForBlank = true;
    const matching = ofBlank.filter((p) => pipeline.samePlacement(pipeline.packPlacement(p), input.placement));
    if (matching.length === 0) continue;

    const pack = matching.find((p) => (p.garmentCodes as string[]).includes(input.colourCode));
    if (!pack) return { found: null, busy, missing: 'colour' };
    const screens = pack.screenCount ?? pipeline.storedManifest(pack)?.inks.length ?? 0;
    // A set where nothing prints has no screens to count: the colour is as good as missing.
    if (screens < 1) return { found: null, busy, missing: 'empty' };
    return {
      found: {
        screens,
        packId: pack.id,
        setKey: pack.screenSetKey,
        approved: Boolean(approval && approval.designVersionId === version.id && pipeline.approvalCovers(approval, pack, all, input.colourCode)),
      },
      busy,
      missing: 'files',
    };
  }
  return { found: null, busy, missing: anyForBlank ? 'position' : 'files' };
}

/** What is missing, in the words a quote says it in, up to the 'so its screen count is an estimate'. */
function missingFilesReason(missing: MissingFiles, busy: boolean, colour: string, where: string): string {
  if (busy) return `The print files for this design on ${colour}${where} are still being prepared`;
  switch (missing) {
    case 'position':
      return `There are no print files for this design at this print position and size${where} yet`;
    case 'colour':
      return `The print files for this design don't cover ${colour}${where} yet`;
    case 'empty':
      return `The print files for this design print nothing on ${colour}${where}`;
    default:
      return `The print files for this design on ${colour}${where} aren't ready yet`;
  }
}

function positionWords(position: string): string {
  return position.replace(/_/g, ' ');
}

/** The price of one line of a screen-printed run. The screens come from the design's print files for this garment colour at
 * each print position, the white underbase and highlight white included; where there are none yet (no artwork, files not
 * ready, being made again) the line is priced on a guess and says so, with the reason. More than 15 screens is refused. */
export async function quoteScreenLine(input: ScreenLineInput, table?: ScreenPriceTable): Promise<QuoteResult<ScreenLineQuote>> {
  const prices = table ?? (await getScreenPriceTable());
  const garment = await loadGarmentCosts(input.blankCode);
  if (!garment) return { ok: false, error: `No pricing configured for ${input.blankCode} with ${input.printServiceCode}.` };
  const garmentCents = garmentCentsAt(garment, input.qty);

  const light = await isLightColour(input.colourCode);
  const colours = coloursOfService(input.printServiceCode);
  const guess = estimateScreens(colours, light);
  const colour = input.colourName ?? input.colourCode;
  const several = input.placements.length > 1;

  const assumed = `${screensLabel(guess)} (${colours} ${colours === 1 ? 'colour' : 'colours'}${light ? '' : ', plus the white underbase and highlight white'})`;

  const placements: LineScreenPlacement[] = [];
  const priced: PricedPlacement[] = [];
  const reasons: string[] = [];
  let unapproved = false;

  for (const placement of input.placements) {
    const printPlacement = toPrintPlacement(placement);
    const where = several ? ` (${positionWords(printPlacement.position)})` : '';
    let screens = guess;
    let basis: LineScreenPlacement['basis'] = 'estimate';
    let approved = false;
    // a job is making the design's screen files: whatever is read now may change when it finishes
    let pending = false;
    // A guess is shared by lines of one design, blank, position and lightness; with no design each line keeps its own.
    let setId = `est:${input.designId ?? `line-${input.lineKey ?? ''}`}:${input.blankCode}:${printPlacement.position}:${printPlacement.widthMm}:${light ? 'light' : 'dark'}`;

    if (!input.designId) {
      reasons.push(`This line has no artwork yet, so its screen count${where} is an estimate: ${assumed}.`);
    } else {
      const lookup = await findScreenSet({ designId: input.designId, blankCode: input.blankCode, colourCode: input.colourCode, placement: printPlacement });
      pending = lookup.busy;
      if (lookup.found && !lookup.busy) {
        screens = lookup.found.screens;
        setId = lookup.found.packId;
        approved = lookup.found.approved;
        basis = 'pack';
        if (!approved) unapproved = true;
      } else if (lookup.found) {
        // The files that are there are being made again: their count is the best there is, and it may change.
        screens = lookup.found.screens;
        setId = lookup.found.packId;
        reasons.push(`The print files for this design on ${colour}${where} are being prepared again, so the screen count may change. For now the quote uses ${screensLabel(screens)}.`);
      } else {
        reasons.push(`${missingFilesReason(lookup.missing, lookup.busy, colour, where)}, so its screen count is an estimate: ${assumed}.`);
      }
    }

    if (screens > ABSOLUTE_MAX_SCREENS) {
      return {
        ok: false,
        error: `The print files for this design need ${screensLabel(screens)} on ${colour}${where}, more than the ${ABSOLUTE_MAX_SCREENS} we can print. Ask for fewer screens and quote again.`,
      };
    }
    placements.push({ position: printPlacement.position, widthCm: printPlacement.widthMm / 10, screens, basis, setId, approved, ...(pending ? { pending: true } : {}) });
    priced.push({ screens, widthCm: printPlacement.widthMm / 10 });
  }

  const price = priceScreenPrint(prices, { garmentCents, qty: input.qty, placements: priced });
  if (!price.ok) return { ok: false, error: price.error };

  const lineBasis: LineScreens['basis'] = reasons.length > 0 ? 'estimate' : 'pack';
  let note: string | undefined;
  if (reasons.length > 0) note = `${reasons.join(' ')} The price follows the real count once the print files are ready.`;
  else if (unapproved) note = "These screens come from the design's print files, which haven't been approved yet. If the count changes, the price follows.";

  const screens: LineScreens = {
    basis: lineBasis,
    count: Math.max(...placements.map((p) => p.screens)),
    surchargeCentsPerPiece: price.value.surchargeCents,
    placements,
    summary: summariseLineScreens(placements, lineBasis),
    ...(note ? { note } : {}),
  };
  return {
    ok: true,
    value: {
      unitCents: price.value.unitCents,
      totalCents: price.value.unitCents * input.qty,
      garmentCents: price.value.garmentCents,
      printCents: price.value.printCents,
      marginCents: price.value.marginCents,
      surchargeCents: price.value.surchargeCents,
      screens,
    },
  };
}
