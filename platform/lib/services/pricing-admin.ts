import { revalidateTag } from 'next/cache';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { can, PermissionError, requirePermission, type Actor } from '@/lib/auth/permissions';
import { CATALOGUE_CATEGORIES } from '@/lib/catalog/categories';
import { blankDisplayName } from '@/lib/catalog/display-names';
import {
  applyPodPricePatch,
  baseCentsFor,
  checkPodPricePatch,
  checkPodPriceTable,
  defaultPodPriceTable,
  garmentPriceOf,
  type PodExtras,
  type PodGarmentRow,
  type PodPricePatch,
  type PodPriceTable,
} from '@/lib/pricing/pod-table';
import { checkScreenPriceTable, defaultScreenPriceTable, isScreenServiceCode, type ScreenPriceTable } from '@/lib/pricing/screen-print';

// Admin pricing tools: base costs (garment + print + margin per blank x
// print service x quantity break), the screen-print price table for runs, the
// shop price table for print-on-demand products (DTG/DTF), and shipping zones.
// Artists never see these — only get_quote's totals, a product's price
// breakdown and the catalogue's "from" prices (loadShopFromPrices).
//
// Who reads what: a shop product is priced from the shop price table
// (podPrice, lib/pricing/pod.ts), and a garment the table doesn't price yet
// stands on its one-piece DTG base cost (DTF where it has no DTG) as a
// placeholder. Runs are priced from the base-cost rows by quantity break
// (DTG/DTF/embroidery) or from the screen-print table (screen print).

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type BaseCostRow = typeof schema.baseCosts.$inferSelect;

/** The catalogue's "from" prices are cached (app/api/catalogue/catalogue-data.ts, tag 'catalogue'): a change to what a garment
 * costs is shown at once, not up to an hour later. Outside a request (a script, a test) there is nothing to refresh. */
function refreshCataloguePrices(): void {
  try {
    revalidateTag('catalogue', 'max');
  } catch {
    // no request scope: nothing is cached here
  }
}

export interface SetBaseCostInput {
  blankCode: string;
  printServiceCode: string;
  qtyFrom?: number;
  garmentCostCents: number;
  printCostCents: number;
  marginCents: number;
}

/** Upsert on the (blank, print service, qty break) unique constraint. */
export async function setBaseCost(input: SetBaseCostInput): Promise<ServiceResult<BaseCostRow>> {
  // A screen-printed run is priced by its screen count from the screen-print price table, and its garment cost comes from
  // the blank's other rows. A row saved here would be read by nothing, so it is refused rather than silently ignored.
  if (isScreenServiceCode(input.printServiceCode)) {
    return {
      ok: false,
      error: "Screen print runs are priced by screen count in the screen-print price table (Admin, Pricing), not per blank. The blank's garment cost comes from its DTF, DTG or embroidery row.",
    };
  }
  const qtyFrom = input.qtyFrom ?? 1;
  const [row] = await db
    .insert(schema.baseCosts)
    .values({
      blankCode: input.blankCode,
      printServiceCode: input.printServiceCode,
      qtyFrom,
      garmentCostCents: input.garmentCostCents,
      printCostCents: input.printCostCents,
      marginCents: input.marginCents,
    })
    .onConflictDoUpdate({
      target: [schema.baseCosts.blankCode, schema.baseCosts.printServiceCode, schema.baseCosts.qtyFrom],
      set: {
        garmentCostCents: input.garmentCostCents,
        printCostCents: input.printCostCents,
        marginCents: input.marginCents,
      },
    })
    .returning();
  if (!row) return { ok: false, error: 'Failed to save the base cost.' };
  // A one-piece DTG or DTF row is the placeholder shop price of a garment the shop table doesn't price yet.
  refreshCataloguePrices();
  return { ok: true, value: row };
}

export async function listBaseCosts(blankCode: string): Promise<BaseCostRow[]> {
  return db
    .select()
    .from(schema.baseCosts)
    .where(eq(schema.baseCosts.blankCode, blankCode))
    .orderBy(asc(schema.baseCosts.printServiceCode), asc(schema.baseCosts.qtyFrom));
}

// ---------------------------------------------------------------------------
// The screen-print price table (Print-Prep-Plan section 10)
//
// One JSON row in app_settings, so no table of its own. Until the owner saves one the
// placeholder defaults (lib/pricing/screen-print.ts) price every run, and the page says so.

const SCREEN_TABLE_KEY = 'screen_print_price_table';

export interface ScreenPriceTableState {
  table: ScreenPriceTable;
  /** nobody has saved a table yet: the placeholder defaults are in use */
  placeholder: boolean;
  /** when it was last saved */
  updatedAt: string | null;
}

/** The table as saved (or the placeholder), with where it came from. A stored row that no longer passes the checks is
 * ignored, so a hand-edited row can never leave runs without a price. */
export async function getScreenPriceTableState(): Promise<ScreenPriceTableState> {
  const [row] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, SCREEN_TABLE_KEY)).limit(1);
  const stored = (row?.valueJson as { table?: unknown } | null)?.table;
  if (row && stored !== undefined) {
    const checked = checkScreenPriceTable(stored);
    if (checked.ok) return { table: checked.table, placeholder: false, updatedAt: row.updatedAt.toISOString() };
    console.error(`[pricing] the saved screen-print price table is not valid (${checked.error}); the placeholder is used.`);
  }
  return { table: defaultScreenPriceTable(), placeholder: true, updatedAt: null };
}

export async function getScreenPriceTable(): Promise<ScreenPriceTable> {
  return (await getScreenPriceTableState()).table;
}

export type SaveTableResult = { ok: true; value: ScreenPriceTableState } | { ok: false; error: string; /** the input to look at, from checkScreenPriceTable */ field?: string };

/** Saves the table: Manage access to Catalogue and pricing, every number checked, the change recorded in the activity log. */
export async function setScreenPriceTable(actor: Actor, input: unknown): Promise<SaveTableResult> {
  if (!can(actor, 'catalogue', 'manage')) return { ok: false, error: new PermissionError('catalogue', 'manage').message };

  const checked = checkScreenPriceTable(input);
  if (!checked.ok) return { ok: false, error: checked.error, field: checked.field };

  const now = new Date();
  await db
    .insert(schema.appSettings)
    .values({
      key: SCREEN_TABLE_KEY,
      value: 'json',
      valueJson: { version: 1, table: checked.table, updatedBy: actor.userId },
      description: 'Screen-print price table for runs (Admin, Pricing)',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.appSettings.key,
      set: { valueJson: { version: 1, table: checked.table, updatedBy: actor.userId }, updatedAt: now },
    });

  // Loaded here, not at the top: quotes read this file on every request and have no use for the team module.
  const { recordStaffActivity } = await import('@/lib/services/team');
  await recordStaffActivity(actor, {
    area: 'catalogue',
    action: 'pricing.screen_table',
    itemType: 'pricing',
    itemId: SCREEN_TABLE_KEY,
    detail: { summary: 'Changed the screen-print price table' },
  });

  return { ok: true, value: { table: checked.table, placeholder: false, updatedAt: now.toISOString() } };
}

// ---------------------------------------------------------------------------
// The shop price table (Print-Prep-Plan section 1, "Shop prices", and section 10)
//
// What a shop product (print on demand, DTG/DTF) costs the artist: a base price for each garment, which covers one print area up
// to A2 on the front or the back, and two extras (front and back; sleeve prints, once). One JSON row in app_settings, like the
// screen-print table, so the schema is untouched. Until the owner saves a garment's price it is a placeholder: today's one-print
// DTG base cost (base_costs), and everything that prices from it says so (podPrice's `placeholder`).

const POD_TABLE_KEY = 'pod_price_table';

export interface PodPriceTableState {
  table: PodPriceTable;
  /** when it was last saved; null when nothing has been saved and every garment is on its placeholder */
  updatedAt: string | null;
}

/** The table as saved, with the owner's example extras when nothing is saved. A stored row that no longer passes the checks is
 * ignored, so a hand-edited row can never leave shop products without a price. */
export async function getPodPriceTableState(): Promise<PodPriceTableState> {
  const [row] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, POD_TABLE_KEY)).limit(1);
  const stored = (row?.valueJson as { table?: unknown } | null)?.table;
  if (row && stored !== undefined) {
    const checked = checkPodPriceTable(stored);
    if (checked.ok) return { table: checked.table, updatedAt: row.updatedAt.toISOString() };
    console.error(`[pricing] the saved shop price table is not valid (${checked.error}); the placeholder prices are used.`);
  }
  return { table: defaultPodPriceTable(), updatedAt: null };
}

/** A shop product prints DTG or DTF; the shop price table prices those two. */
const SHOP_METHODS = ['dtg', 'dtf'] as const;

function isShopMethod(code: string): boolean {
  return (SHOP_METHODS as readonly string[]).includes(code);
}

/** The cost of one piece at the first quantity break, from base_costs rows listed by ascending qty_from. */
function onePieceTotal(rows: { qtyFrom: number; totalCents: number | null }[]): number | null {
  const priced = rows.filter((r): r is { qtyFrom: number; totalCents: number } => r.totalCents != null);
  return (priced.filter((r) => r.qtyFrom <= 1).at(-1) ?? priced[0])?.totalCents ?? null;
}

/** What each blank costs today for one print and one piece, as the seeded base costs say: DTG, else DTF for a garment that can't
 * take DTG. This is a garment's price until the owner saves one. A blank with neither is left out. */
export async function loadPlaceholderBases(blankCodes: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (blankCodes.length === 0) return prices;
  const rows = await db
    .select({ blankCode: schema.baseCosts.blankCode, service: schema.baseCosts.printServiceCode, qtyFrom: schema.baseCosts.qtyFrom, totalCents: schema.baseCosts.totalCents })
    .from(schema.baseCosts)
    .where(and(inArray(schema.baseCosts.blankCode, blankCodes), inArray(schema.baseCosts.printServiceCode, [...SHOP_METHODS]), eq(schema.baseCosts.currency, 'EUR')))
    .orderBy(asc(schema.baseCosts.qtyFrom));
  for (const code of blankCodes) {
    const ofBlank = rows.filter((r) => r.blankCode === code);
    const price = onePieceTotal(ofBlank.filter((r) => r.service === 'dtg')) ?? onePieceTotal(ofBlank.filter((r) => r.service === 'dtf'));
    if (price !== null) prices.set(code, price);
  }
  return prices;
}

/** One piece of a blank for one print service at the first quantity break (embroidery, which print prep leaves as it was). */
async function loadServiceBase(blankCode: string, printServiceCode: string): Promise<number | null> {
  const rows = await db
    .select({ qtyFrom: schema.baseCosts.qtyFrom, totalCents: schema.baseCosts.totalCents })
    .from(schema.baseCosts)
    .where(and(eq(schema.baseCosts.blankCode, blankCode), eq(schema.baseCosts.printServiceCode, printServiceCode), eq(schema.baseCosts.currency, 'EUR')))
    .orderBy(asc(schema.baseCosts.qtyFrom));
  return onePieceTotal(rows);
}

export interface PodBase {
  /** the base price: one print area up to A2, front or back */
  baseCents: number;
  /** the owner hasn't set this garment's price: it is today's base cost standing in */
  placeholder: boolean;
  /** the extras to add for more print areas; null for a method the shop table doesn't cover (nothing is added) */
  extras: PodExtras | null;
}

/** The base price podPrice() starts from, or null for a blank that isn't in the catalogue or has no price at all.
 * - DTG and DTF: the owner's price for the garment (DTF uses the DTF price when one is saved), else the placeholder.
 * - Any other method (embroidery, which print prep leaves as it was): the blank's own base cost for it, flagged as a placeholder,
 *   with no extras. */
export async function resolvePodBase(blankCode: string, printServiceCode: string): Promise<PodBase | null> {
  const [blank] = await db.select({ code: schema.blanks.code }).from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
  if (!blank) return null;

  if (!isShopMethod(printServiceCode)) {
    const legacy = await loadServiceBase(blankCode, printServiceCode);
    return legacy === null ? null : { baseCents: legacy, placeholder: true, extras: null };
  }

  const { table } = await getPodPriceTableState();
  const saved = garmentPriceOf(table, blankCode);
  if (saved) return { baseCents: baseCentsFor(saved, printServiceCode), placeholder: false, extras: table.extras };
  const placeholder = (await loadPlaceholderBases([blankCode])).get(blankCode);
  return placeholder === undefined ? null : { baseCents: placeholder, placeholder: true, extras: table.extras };
}

/** The "from" price of each garment, as the catalogue, list_blanks and get_blank show it: what a shop product of it costs with
 * one print area, by the cheapest shop method it offers. That is the garment's price in the shop price table (DTF at its own
 * price where the owner set one and the garment offers DTF), else the placeholder it stands on, the same number podPrice() uses.
 * A run's quantity breaks never set it, nor does embroidery. A garment with no price at all is left out. Without `blankCodes`,
 * every blank in the catalogue. */
export async function loadShopFromPrices(blankCodes?: readonly string[]): Promise<Map<string, number>> {
  const codes = blankCodes ? [...new Set(blankCodes)] : (await db.select({ code: schema.blanks.code }).from(schema.blanks)).map((r) => r.code);
  const prices = new Map<string, number>();
  if (codes.length === 0) return prices;
  const [{ table }, placeholders, offered] = await Promise.all([
    getPodPriceTableState(),
    loadPlaceholderBases(codes),
    db
      .select({ blankCode: schema.blankPrintServices.blankCode, service: schema.blankPrintServices.printServiceCode })
      .from(schema.blankPrintServices)
      .where(and(inArray(schema.blankPrintServices.blankCode, codes), inArray(schema.blankPrintServices.printServiceCode, [...SHOP_METHODS]))),
  ]);
  const methods = new Map<string, string[]>();
  for (const row of offered) methods.set(row.blankCode, [...(methods.get(row.blankCode) ?? []), row.service]);
  for (const code of codes) {
    const saved = garmentPriceOf(table, code);
    if (saved) {
      const offers = methods.get(code) ?? [];
      prices.set(code, offers.length > 0 ? Math.min(...offers.map((method) => baseCentsFor(saved, method))) : saved.cents);
      continue;
    }
    const placeholder = placeholders.get(code);
    if (placeholder !== undefined) prices.set(code, placeholder);
  }
  return prices;
}

/** The catalogue's types in the order the Studio lists them; a type it doesn't know comes after, by name. */
function typeRank(type: string): number {
  const at = (CATALOGUE_CATEGORIES as readonly string[]).indexOf(type);
  return at === -1 ? CATALOGUE_CATEGORIES.length : at;
}

/** Every garment for the admin table, by type and then name: its saved price when there is one, and the placeholder it stands
 * on when there isn't. Catalogue and pricing "View". */
export async function listPodGarments(actor: Actor): Promise<PodGarmentRow[]> {
  requirePermission(actor, 'catalogue', 'view');

  const [blankRows, state] = await Promise.all([
    db
      .select({ code: schema.blanks.code, name: schema.blanks.name, supplierName: schema.blanks.supplierName, type: schema.blanks.type })
      .from(schema.blanks)
      .where(eq(schema.blanks.isActive, true))
      .orderBy(asc(schema.blanks.displayOrder), asc(schema.blanks.name), asc(schema.blanks.code)),
    getPodPriceTableState(),
  ]);
  const placeholders = await loadPlaceholderBases(blankRows.map((r) => r.code));

  const rows = blankRows.map((r): PodGarmentRow => {
    const saved = garmentPriceOf(state.table, r.code);
    return {
      code: r.code,
      name: blankDisplayName(r.code, r.name),
      supplierName: r.supplierName,
      type: r.type,
      baseCents: saved?.cents ?? null,
      dtfCents: saved?.dtfCents ?? null,
      placeholderCents: placeholders.get(r.code) ?? null,
    };
  });
  // Array.sort is stable: garments of one type keep the catalogue's own order.
  return rows.sort((a, b) => typeRank(a.type) - typeRank(b.type) || (typeRank(a.type) === CATALOGUE_CATEGORIES.length ? a.type.localeCompare(b.type) : 0));
}

export type SavePodResult = { ok: true; value: PodPriceTableState } | { ok: false; error: string; /** the input to look at, in the editor's naming */ field?: string };

/** A sentence for the activity log: what a patch changed. */
function describePodPatch(patch: PodPricePatch): string {
  const entries = Object.values(patch.garments ?? {});
  const set = entries.filter((price) => price !== null).length;
  const cleared = entries.length - set;
  const parts: string[] = [];
  if (set > 0) parts.push(`${set} ${set === 1 ? 'garment' : 'garments'}`);
  if (cleared > 0) parts.push(`${cleared} back to the placeholder`);
  if (patch.extras) parts.push('the extras');
  return `Changed shop-product prices: ${parts.join(', ')}`;
}

/** Saves a change to the shop price table: Manage access to Catalogue and pricing, every number checked, and every garment named
 * one that is in the catalogue. The change is merged into the table as it stands now, so a garment the patch doesn't name keeps
 * its price whatever else was saved meanwhile. Recorded in the staff activity log. Returns the table as it is after the save. */
export async function setPodPrices(actor: Actor, input: unknown): Promise<SavePodResult> {
  if (!can(actor, 'catalogue', 'manage')) return { ok: false, error: new PermissionError('catalogue', 'manage').message };

  const checked = checkPodPricePatch(input);
  if (!checked.ok) return { ok: false, error: checked.error, field: checked.field };
  const patch = checked.patch;

  // A garment can be priced only if the catalogue has it. Taking one back to the placeholder is always allowed, so a stale
  // entry for a blank that has gone can still be cleared.
  const toSet = Object.entries(patch.garments ?? {}).filter(([, price]) => price !== null).map(([code]) => code);
  if (toSet.length > 0) {
    const known = new Set((await db.select({ code: schema.blanks.code }).from(schema.blanks).where(inArray(schema.blanks.code, toSet))).map((r) => r.code));
    const unknown = toSet.find((code) => !known.has(code));
    if (unknown) return { ok: false, error: `${unknown} is not a garment in the catalogue.`, field: `garments.${unknown}.base` };
  }

  const current = await getPodPriceTableState();
  const merged = checkPodPriceTable(applyPodPricePatch(current.table, patch));
  if (!merged.ok) return { ok: false, error: merged.error, field: merged.field };

  const now = new Date();
  const valueJson = { version: 1, table: merged.table, updatedBy: actor.userId };
  await db
    .insert(schema.appSettings)
    .values({ key: POD_TABLE_KEY, value: 'json', valueJson, description: 'Shop price table for print-on-demand products, DTG/DTF (Admin, Pricing)', updatedAt: now })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { valueJson, updatedAt: now } });
  // the catalogue's "from" prices are the garments' shop prices
  refreshCataloguePrices();

  // Loaded here, not at the top: quotes read this file on every request and have no use for the team module.
  const { recordStaffActivity } = await import('@/lib/services/team');
  await recordStaffActivity(actor, {
    area: 'catalogue',
    action: 'pricing.shop_table',
    itemType: 'pricing',
    itemId: POD_TABLE_KEY,
    detail: { summary: describePodPatch(patch), garments: Object.keys(patch.garments ?? {}) },
  });

  return { ok: true, value: { table: merged.table, updatedAt: now.toISOString() } };
}

export type ShippingZoneRow = typeof schema.shippingZones.$inferSelect;

export interface UpdateShippingZonePatch {
  name?: string;
  countries?: string[];
  flatCents?: number;
  freeOverCents?: number | null;
  isActive?: boolean;
}

export async function updateShippingZone(id: string, patch: UpdateShippingZonePatch): Promise<ServiceResult<ShippingZoneRow>> {
  const existingRows = await db.select().from(schema.shippingZones).where(eq(schema.shippingZones.id, id)).limit(1);
  const existing = existingRows[0];
  if (!existing) return { ok: false, error: 'Shipping zone not found.' };

  const [row] = await db
    .update(schema.shippingZones)
    .set({
      name: patch.name ?? existing.name,
      countries: patch.countries ?? existing.countries,
      flatCents: patch.flatCents ?? existing.flatCents,
      freeOverCents: patch.freeOverCents === undefined ? existing.freeOverCents : patch.freeOverCents,
      isActive: patch.isActive ?? existing.isActive,
    })
    .where(eq(schema.shippingZones.id, id))
    .returning();
  return row ? { ok: true, value: row } : { ok: false, error: 'Failed to update the shipping zone.' };
}
