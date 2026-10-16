import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import { checkScreenPriceTable, defaultScreenPriceTable, isScreenServiceCode, type ScreenPriceTable } from '@/lib/pricing/screen-print';

// Admin pricing tools: base costs (garment + print + margin per blank x
// print service x quantity break), the screen-print price table for runs, and
// shipping zones. Artists never see these — only get_quote's totals.

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type BaseCostRow = typeof schema.baseCosts.$inferSelect;

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
  return row ? { ok: true, value: row } : { ok: false, error: 'Failed to save the base cost.' };
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
