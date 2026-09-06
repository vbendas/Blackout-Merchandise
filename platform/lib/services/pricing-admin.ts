import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Admin pricing tools: base costs (garment + print + margin per blank x
// print service x quantity break) and shipping zones. Artists never see
// these — only get_quote's totals.

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
