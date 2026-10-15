import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { PrintTechnique } from '@/lib/print/types';

// Pricing over the seeded base_costs table: garment + print + margin per
// blank x print service x quantity break. Artists never see the components —
// only the total per unit and the grand total for their requested quantity.

export interface QuoteBreak {
  qtyFrom: number;
  unitCents: number;
}

export interface Quote {
  unitBaseCostCents: number;
  totalCents: number;
  breaks: QuoteBreak[];
}

export interface QuoteForInput {
  blankCode: string;
  printServiceCode: string;
  qty: number;
}

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
 * blank/service pair at all.
 */
export async function quoteFor(input: QuoteForInput): Promise<Quote | null> {
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
  if (code.startsWith('screen_')) return 'screen';
  if (code === 'dtg' || code === 'dtf') return 'dtg_dtf';
  return null;
}
