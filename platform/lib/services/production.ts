import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getOrder, type OrderDetail } from '@/lib/services/orders';
import { getStore } from '@/lib/services/stores';
import { notify, notifyFan } from '@/lib/services/notifications';

// Production state machine (Platform-Plan.md §6): queued -> printing ->
// packed -> shipped -> delivered. This is the only module that writes
// orders.production_status / orders.tracking — everything goes through the
// single transition() at the bottom so tracking merges and the shipped
// notification never drift out of sync with each other.

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const PRODUCTION_STATUSES = ['queued', 'printing', 'packed', 'shipped', 'delivered'] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

const NEXT_STATUS: Record<ProductionStatus, ProductionStatus | null> = {
  queued: 'printing',
  printing: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
  delivered: null,
};

export interface OrderTrackingInput {
  carrier: string;
  code: string;
  url?: string;
}

export interface ProductionListItem {
  orderId: string;
  storeId: string;
  storeName: string;
  reference: string;
  orderType: OrderDetail['orderType'];
  productionStatus: ProductionStatus;
  itemsSummary: string;
  placedAt: string;
  grossCents: number;
}

function reference(orderId: string): string {
  return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
}

export interface ListProductionOptions {
  status?: ProductionStatus;
  storeId?: string;
}

/** Paid orders (POD or bulk) in the production pipeline, oldest first. With
 * no status filter, shows the active pipeline (everything not yet delivered)
 * — delivered orders are done and drop out of the default view. */
export async function listProduction(opts: ListProductionOptions = {}): Promise<ProductionListItem[]> {
  const conditions = [eq(schema.orders.status, 'paid')];
  if (opts.status) conditions.push(eq(schema.orders.productionStatus, opts.status));
  else conditions.push(inArray(schema.orders.productionStatus, ['queued', 'printing', 'packed', 'shipped']));
  if (opts.storeId) conditions.push(eq(schema.orders.storeId, opts.storeId));

  const rows = await db
    .select({
      id: schema.orders.id,
      storeId: schema.orders.storeId,
      storeName: schema.artistStores.name,
      orderType: schema.orders.orderType,
      productionStatus: schema.orders.productionStatus,
      createdAt: schema.orders.createdAt,
      totalAmount: schema.orders.totalAmount,
    })
    .from(schema.orders)
    .innerJoin(schema.artistStores, eq(schema.orders.storeId, schema.artistStores.id))
    .where(and(...conditions))
    .orderBy(asc(schema.orders.createdAt));

  if (rows.length === 0) return [];

  const items = await db
    .select({
      orderId: schema.orderItems.orderId,
      quantity: schema.orderItems.quantity,
      size: schema.orderItems.size,
      colourCode: schema.orderItems.colourCode,
      colourName: schema.colours.name,
      productName: schema.products.name,
    })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .leftJoin(schema.colours, eq(schema.orderItems.colourCode, schema.colours.code))
    .where(
      inArray(
        schema.orderItems.orderId,
        rows.map((r) => r.id),
      ),
    );

  const summaryByOrder = new Map<string, string[]>();
  for (const item of items) {
    const parts = summaryByOrder.get(item.orderId) ?? [];
    const bits = [item.productName, item.colourName ?? item.colourCode ?? undefined, item.size ?? undefined].filter(Boolean);
    parts.push(`${item.quantity}× ${bits.join(' · ')}`);
    summaryByOrder.set(item.orderId, parts);
  }

  return rows.map((r) => ({
    orderId: r.id,
    storeId: r.storeId,
    storeName: r.storeName,
    reference: reference(r.id),
    orderType: r.orderType,
    productionStatus: (r.productionStatus ?? 'queued') as ProductionStatus,
    itemsSummary: (summaryByOrder.get(r.id) ?? []).join(', ') || '—',
    placedAt: r.createdAt.toISOString(),
    grossCents: r.totalAmount,
  }));
}

type OrderRow = typeof schema.orders.$inferSelect;

async function loadOrderRow(orderId: string): Promise<OrderRow | null> {
  const rows = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  return rows[0] ?? null;
}

/** The single writer for production_status / tracking. `to` omitted keeps
 * the current status (a tracking-only update, used by setTracking); passing
 * `to` validates it's exactly the next step (no skipping, no going back) and
 * fires the shipped notification the first time an order reaches 'shipped'. */
async function transition(orderId: string, opts: { to?: ProductionStatus; tracking?: OrderTrackingInput }): Promise<ServiceResult<OrderDetail>> {
  const order = await loadOrderRow(orderId);
  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.status !== 'paid') return { ok: false, error: `Order is "${order.status}", not paid — nothing to advance.` };

  const current = (order.productionStatus ?? 'queued') as ProductionStatus;
  const target = opts.to ?? current;

  if (target !== current) {
    const expectedNext = NEXT_STATUS[current];
    if (!expectedNext || target !== expectedNext) {
      return { ok: false, error: `Can't move from "${current}" to "${target}" — production advances one step at a time.` };
    }
  }

  const existingTracking = (order.tracking as Record<string, unknown> | null) ?? {};
  const tracking = opts.tracking ? { ...existingTracking, carrier: opts.tracking.carrier, code: opts.tracking.code, url: opts.tracking.url } : existingTracking;

  if (target === 'shipped') {
    const carrier = typeof tracking.carrier === 'string' ? tracking.carrier : undefined;
    const code = typeof tracking.code === 'string' ? tracking.code : undefined;
    if (!carrier || !code) return { ok: false, error: "Shipping requires tracking — pass carrier + code, or call set_tracking first." };
  }

  const becomingShipped = target === 'shipped' && current !== 'shipped';

  await db
    .update(schema.orders)
    .set({ productionStatus: target, tracking, updatedAt: new Date() })
    .where(eq(schema.orders.id, orderId));

  if (becomingShipped) {
    const store = await getStore(order.storeId);
    if (store) {
      try {
        await notify({
          userId: store.artistId,
          event: 'order.shipped',
          text: `Order ${reference(orderId)} shipped`,
          payload: { orderId, reference: reference(orderId), tracking },
          prompt: `Open order ${orderId}`,
        });
      } catch (err) {
        console.error('[production] notify(order.shipped) failed:', err instanceof Error ? err.message : err);
      }
    }
    if (order.fanEmail) {
      try {
        await notifyFan({ email: order.fanEmail, event: 'order.shipped', payload: { reference: reference(orderId), tracking } });
      } catch (err) {
        console.error('[production] notifyFan(order.shipped) failed:', err instanceof Error ? err.message : err);
      }
    }
  }

  const detail = await getOrder(order.storeId, orderId);
  return detail ? { ok: true, value: detail } : { ok: false, error: 'Order not found after transition.' };
}

/** Advance one step. Omit `to` to move to the next step automatically;
 * passing it validates it matches that next step. Moving into 'shipped'
 * needs tracking, either passed here or already set via setTracking. */
export async function advance(orderId: string, to?: ProductionStatus, tracking?: OrderTrackingInput): Promise<ServiceResult<OrderDetail>> {
  if (!to) {
    const order = await loadOrderRow(orderId);
    if (!order) return { ok: false, error: 'Order not found.' };
    const current = (order.productionStatus ?? 'queued') as ProductionStatus;
    const next = NEXT_STATUS[current];
    if (!next) return { ok: false, error: `Order is already "${current}" — nothing further to advance.` };
    return transition(orderId, { to: next, tracking });
  }
  return transition(orderId, { to, tracking });
}

/** Attach or update tracking without changing production status. */
export async function setTracking(orderId: string, tracking: OrderTrackingInput): Promise<ServiceResult<OrderDetail>> {
  return transition(orderId, { tracking });
}
