import { randomUUID } from 'crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { isScreenServiceCode } from '@/lib/pricing/screen-print';
import { blankGarmentCost } from '@/lib/services/quotes';

// Supplier purchase orders (Stanley/Stella): group queued orders' items by
// blank + colour + size into a draft PO, then move it draft -> placed ->
// received.
//
// CONTRACT GAP: supplier_order_items.variant_id is a plain uuid with no
// blank/colour/size columns (the schema's comment says "blank/colour/size
// are tracked by the caller" — there is no productVariants table to join
// against any more). Rather than add columns, we generate a random variantId
// per group and store the human-readable blank/colour/size for each variantId
// as JSON in supplier_orders.notes (a plain text column), alongside the order
// ids the PO was drafted from. getSupplierOrder joins items x notes by
// variantId to render a line. This is a real gap worth a schema migration
// (a supplier_order_items.blank_code/colour_code/size set of columns) in a
// follow-up wave.

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type SupplierOrderStatus = 'draft' | 'placed' | 'confirmed' | 'shipped' | 'received' | 'cancelled';

const SUPPLIER_NAME = 'Stanley/Stella';

export interface SupplierOrderLine {
  variantId: string;
  blankCode: string;
  blankName: string;
  colourCode: string;
  colourName: string;
  size: string;
  qty: number;
  unitCostCents: number;
  receivedQty: number;
}

export interface SupplierOrderDetail {
  id: string;
  poNumber: string;
  supplier: string;
  status: SupplierOrderStatus;
  lines: SupplierOrderLine[];
  forOrders: string[];
  totalUnits: number;
  totalCostCents: number;
  createdAt: string;
}

interface NotesLine {
  variantId: string;
  blankCode: string;
  blankName: string;
  colourCode: string;
  colourName: string;
  size: string;
}

interface NotesPayload {
  orderIds: string[];
  lines: NotesLine[];
}

function parseNotes(notes: string | null): NotesPayload {
  if (!notes) return { orderIds: [], lines: [] };
  try {
    const parsed = JSON.parse(notes) as Partial<NotesPayload>;
    return {
      orderIds: Array.isArray(parsed.orderIds) ? parsed.orderIds : [],
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
    };
  } catch {
    return { orderIds: [], lines: [] };
  }
}

/** Garment-only cost (the supplier ships blanks; print happens in-house), at
 * the base-cost quantity break matching the group's total quantity. Screen
 * print has no base-cost rows of its own (a screen run is priced from the
 * screen-print table), and any left from an old seed were placeholders, so a
 * screen-printed item, or any service without rows, costs what the blank
 * costs under its other services (blankGarmentCost). 0 only when the blank has
 * no pricing at all. */
async function garmentCostFor(blankCode: string, printServiceCode: string, qty: number): Promise<number> {
  if (isScreenServiceCode(printServiceCode)) return (await blankGarmentCost(blankCode, qty)) ?? 0;
  const rows = await db
    .select({ qtyFrom: schema.baseCosts.qtyFrom, garmentCostCents: schema.baseCosts.garmentCostCents })
    .from(schema.baseCosts)
    .where(and(eq(schema.baseCosts.blankCode, blankCode), eq(schema.baseCosts.printServiceCode, printServiceCode)))
    .orderBy(asc(schema.baseCosts.qtyFrom));
  if (rows.length === 0) return (await blankGarmentCost(blankCode, qty)) ?? 0;
  const applicable = rows.filter((r) => r.qtyFrom <= qty).at(-1) ?? rows[0];
  return applicable.garmentCostCents;
}

export interface DraftSupplierOrderOptions {
  /** specific paid+queued orders to draft from; omit for every queued order */
  orderIds?: string[];
}

export async function draftSupplierOrder(opts: DraftSupplierOrderOptions = {}): Promise<ServiceResult<SupplierOrderDetail>> {
  const conditions = [eq(schema.orders.status, 'paid'), eq(schema.orders.productionStatus, 'queued')];
  if (opts.orderIds && opts.orderIds.length > 0) conditions.push(inArray(schema.orders.id, opts.orderIds));

  const orders = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(...conditions));
  if (orders.length === 0) return { ok: false, error: 'No queued orders to draft a supplier order from.' };
  const orderIds = orders.map((o) => o.id);

  const items = await db
    .select({
      quantity: schema.orderItems.quantity,
      colourCode: schema.orderItems.colourCode,
      colourName: schema.colours.name,
      size: schema.orderItems.size,
      blankCode: schema.products.blankCode,
      blankName: schema.blanks.name,
      blankSupplierName: schema.blanks.supplierName,
      printServiceCode: schema.products.printServiceCode,
    })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .innerJoin(schema.blanks, eq(schema.products.blankCode, schema.blanks.code))
    .leftJoin(schema.colours, eq(schema.orderItems.colourCode, schema.colours.code))
    .where(inArray(schema.orderItems.orderId, orderIds));

  if (items.length === 0) return { ok: false, error: 'No order items found for the queued orders.' };

  interface Group {
    blankCode: string;
    blankName: string;
    colourCode: string;
    colourName: string;
    size: string;
    qty: number;
    printServiceCode: string;
  }
  const groups = new Map<string, Group>();
  for (const item of items) {
    const colourCode = item.colourCode ?? 'na';
    const size = item.size ?? 'na';
    const key = `${item.blankCode}:${colourCode}:${size}`;
    const existing = groups.get(key);
    if (existing) existing.qty += item.quantity;
    else
      groups.set(key, {
        blankCode: item.blankCode,
        blankName: item.blankSupplierName ?? item.blankName,
        colourCode,
        colourName: item.colourName ?? colourCode,
        size,
        qty: item.quantity,
        printServiceCode: item.printServiceCode,
      });
  }

  const groupList = [...groups.values()];
  const lineInputs = await Promise.all(
    groupList.map(async (g) => ({ ...g, unitCostCents: await garmentCostFor(g.blankCode, g.printServiceCode, g.qty) })),
  );

  const poNumber = `PO-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const totalCostEur = lineInputs.reduce((sum, l) => sum + l.unitCostCents * l.qty, 0);
  const notesLines: NotesLine[] = lineInputs.map((l) => ({
    variantId: randomUUID(),
    blankCode: l.blankCode,
    blankName: l.blankName,
    colourCode: l.colourCode,
    colourName: l.colourName,
    size: l.size,
  }));

  const [created] = await db
    .insert(schema.supplierOrders)
    .values({
      poNumber,
      supplierName: SUPPLIER_NAME,
      status: 'draft',
      totalCostEur,
      notes: JSON.stringify({ orderIds, lines: notesLines } satisfies NotesPayload),
    })
    .returning();

  await db.insert(schema.supplierOrderItems).values(
    lineInputs.map((l, i) => ({
      orderId: created.id,
      variantId: notesLines[i].variantId,
      quantity: l.qty,
      unitCostEur: l.unitCostCents,
      receivedQuantity: 0,
    })),
  );

  const detail = await getSupplierOrder(created.id);
  return detail ? { ok: true, value: detail } : { ok: false, error: 'Supplier order not found after creation.' };
}

type SupplierOrderRow = typeof schema.supplierOrders.$inferSelect;

async function loadSupplierOrderRow(id: string): Promise<SupplierOrderRow | null> {
  const rows = await db.select().from(schema.supplierOrders).where(eq(schema.supplierOrders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getSupplierOrder(id: string): Promise<SupplierOrderDetail | null> {
  const order = await loadSupplierOrderRow(id);
  if (!order) return null;

  const itemRows = await db.select().from(schema.supplierOrderItems).where(eq(schema.supplierOrderItems.orderId, id));
  const parsedNotes = parseNotes(order.notes);
  const lineByVariant = new Map(parsedNotes.lines.map((l) => [l.variantId, l]));

  const lines: SupplierOrderLine[] = itemRows.map((item) => {
    const meta = lineByVariant.get(item.variantId);
    return {
      variantId: item.variantId,
      blankCode: meta?.blankCode ?? 'unknown',
      blankName: meta?.blankName ?? 'Unknown blank',
      colourCode: meta?.colourCode ?? '',
      colourName: meta?.colourName ?? '',
      size: meta?.size ?? '',
      qty: item.quantity,
      unitCostCents: item.unitCostEur,
      receivedQty: item.receivedQuantity,
    };
  });

  return {
    id: order.id,
    poNumber: order.poNumber,
    supplier: order.supplierName,
    status: order.status,
    lines,
    forOrders: parsedNotes.orderIds,
    totalUnits: lines.reduce((sum, l) => sum + l.qty, 0),
    totalCostCents: order.totalCostEur,
    createdAt: order.createdAt.toISOString(),
  };
}

export async function listSupplierOrders(status?: SupplierOrderStatus): Promise<SupplierOrderDetail[]> {
  const rows = await db
    .select({ id: schema.supplierOrders.id })
    .from(schema.supplierOrders)
    .where(status ? eq(schema.supplierOrders.status, status) : undefined)
    .orderBy(desc(schema.supplierOrders.createdAt));
  const details = await Promise.all(rows.map((r) => getSupplierOrder(r.id)));
  return details.filter((d): d is SupplierOrderDetail => d !== null);
}

async function transitionSupplierOrder(id: string, allowedFrom: SupplierOrderStatus[], to: SupplierOrderStatus): Promise<ServiceResult<SupplierOrderDetail>> {
  const order = await loadSupplierOrderRow(id);
  if (!order) return { ok: false, error: 'Supplier order not found.' };
  if (!allowedFrom.includes(order.status)) {
    return { ok: false, error: `Can't move a "${order.status}" supplier order to "${to}".` };
  }

  await db.update(schema.supplierOrders).set({ status: to, updatedAt: new Date() }).where(eq(schema.supplierOrders.id, id));

  const detail = await getSupplierOrder(id);
  return detail ? { ok: true, value: detail } : { ok: false, error: 'Supplier order not found after update.' };
}

export async function placeSupplierOrder(id: string): Promise<ServiceResult<SupplierOrderDetail>> {
  return transitionSupplierOrder(id, ['draft'], 'placed');
}

export async function receiveSupplierOrder(id: string): Promise<ServiceResult<SupplierOrderDetail>> {
  return transitionSupplierOrder(id, ['placed', 'confirmed', 'shipped'], 'received');
}
