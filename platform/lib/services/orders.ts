import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getStore } from '@/lib/services/stores';
import { getStripeGateway, type CheckoutSessionSnapshot } from '@/lib/services/stripe';
import { anomalyFlags, flagLedgerForOrder, setLedgerStatus } from '@/lib/services/payouts';
import { notify, notifyFan } from '@/lib/services/notifications';
import { fanProductName } from '@/lib/storefront/fan-names';

// Orders are created pending by checkout.ts and only ever move to 'paid'
// here, in markPaid — the single place that touches order status, the
// production_status machine's first step, and the payout_ledger row. Every
// other function here is a read (or, for refundOrder, a state transition on
// an already-paid order).

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface OrderLine {
  label: string;
  colour?: string;
  size?: string;
  qty: number;
  unitCents: number;
}

export interface OrderTotals {
  grossCents: number;
  shippingCents: number;
  taxCents: number;
  feeCents: number;
  transferCents: number;
}

export interface OrderTracking {
  carrier: string;
  code: string;
  url?: string;
}

export interface OrderDetail {
  id: string;
  storeId: string;
  reference: string;
  orderType: 'pod' | 'bulk';
  status: string;
  productionStatus: string | null;
  placedAt: string;
  fanEmail: string | null;
  lines: OrderLine[];
  totals: OrderTotals;
  tracking: OrderTracking | null;
  /** the fan-facing lookup token (tracking.token) — see checkout.ts's doc on the token decision */
  token: string | null;
}

function reference(orderId: string): string {
  return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
}

async function loadOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const rows = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return null;

  const items = await db
    .select({
      quantity: schema.orderItems.quantity,
      priceAtPurchase: schema.orderItems.priceAtPurchase,
      colourCode: schema.orderItems.colourCode,
      colourName: schema.colours.name,
      size: schema.orderItems.size,
      productName: schema.products.name,
    })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .leftJoin(schema.colours, eq(schema.orderItems.colourCode, schema.colours.code))
    .where(eq(schema.orderItems.orderId, orderId));

  const tracking = (order.tracking as Record<string, unknown> | null) ?? null;
  const carrier = typeof tracking?.carrier === 'string' ? tracking.carrier : undefined;
  const code = typeof tracking?.code === 'string' ? tracking.code : undefined;
  const trackingUrl = typeof tracking?.url === 'string' ? tracking.url : undefined;

  return {
    id: order.id,
    storeId: order.storeId,
    reference: reference(order.id),
    orderType: order.orderType,
    status: order.status,
    productionStatus: order.productionStatus,
    placedAt: order.createdAt.toISOString(),
    fanEmail: order.fanEmail,
    lines: items.map((i) => ({ label: i.productName, colour: i.colourName ?? i.colourCode ?? undefined, size: i.size ?? undefined, qty: i.quantity, unitCents: i.priceAtPurchase })),
    totals: {
      grossCents: order.totalAmount,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      feeCents: order.applicationFeeCents,
      transferCents: order.transferCents,
    },
    tracking: carrier && code ? { carrier, code, url: trackingUrl } : null,
    token: typeof tracking?.token === 'string' ? tracking.token : null,
  };
}

/** Scoped read for the artist's own tools. */
export async function getOrder(storeId: string, orderId: string): Promise<OrderDetail | null> {
  const detail = await loadOrderDetail(orderId);
  return detail && detail.storeId === storeId ? detail : null;
}

/** Public read model for the fan storefront (GET /api/orders/[token], built
 * alongside the storefront) — no fan email echoed back. */
export async function getOrderByToken(token: string): Promise<Omit<OrderDetail, 'fanEmail'> | null> {
  const rows = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(sql`${schema.orders.tracking} ->> 'token' = ${token}`)
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const detail = await loadOrderDetail(row.id);
  if (!detail) return null;
  const { fanEmail: _fanEmail, ...pub } = detail;
  return pub;
}

export interface OrderListItem {
  orderId: string;
  reference: string;
  placedAt: string;
  status: string;
  productionStatus: string | null;
  grossCents: number;
  transferCents: number;
}

type OrderStatus = (typeof schema.orders.$inferSelect)['status'];
const ORDER_STATUSES: readonly OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'];

export interface ListOrdersOptions {
  status?: string;
  since?: Date;
  limit?: number;
}

export async function listOrders(storeId: string, opts: ListOrdersOptions = {}): Promise<OrderListItem[]> {
  const conditions = [eq(schema.orders.storeId, storeId)];
  const status = opts.status && (ORDER_STATUSES as readonly string[]).includes(opts.status) ? (opts.status as OrderStatus) : undefined;
  if (status) conditions.push(eq(schema.orders.status, status));
  if (opts.since) conditions.push(gte(schema.orders.createdAt, opts.since));

  const rows = await db
    .select({
      id: schema.orders.id,
      createdAt: schema.orders.createdAt,
      status: schema.orders.status,
      productionStatus: schema.orders.productionStatus,
      totalAmount: schema.orders.totalAmount,
      transferCents: schema.orders.transferCents,
    })
    .from(schema.orders)
    .where(and(...conditions))
    .orderBy(desc(schema.orders.createdAt))
    .limit(opts.limit ?? 50);

  return rows.map((r) => ({
    orderId: r.id,
    reference: reference(r.id),
    placedAt: r.createdAt.toISOString(),
    status: r.status,
    productionStatus: r.productionStatus,
    grossCents: r.totalAmount,
    transferCents: r.transferCents,
  }));
}

// -- markPaid ---------------------------------------------------------------

/** Claims a (provider, eventId) pair in processed_webhook_events. Returns
 * true the first time it's seen, false on any retry/duplicate — the single
 * idempotency mechanism shared by the webhook route (real Stripe event ids)
 * and markPaid's own synthetic key below (so the mock-checkout page's direct
 * call, which never goes through a webhook, is just as idempotent). */
export async function claimWebhookEvent(eventId: string, objectId?: string): Promise<boolean> {
  const inserted = await db
    .insert(schema.processedWebhookEvents)
    .values({ provider: 'stripe', eventId, objectId: objectId ?? null })
    .onConflictDoNothing({ target: [schema.processedWebhookEvents.provider, schema.processedWebhookEvents.eventId] })
    .returning({ id: schema.processedWebhookEvents.id });
  return inserted.length > 0;
}

/**
 * Marks an order paid from a Checkout Session snapshot. Idempotent by
 * processed_webhook_events under the synthetic key
 * `checkout.session.completed:<sessionId>` — safe to call from the real
 * webhook (checkout.session.completed, or async_payment_succeeded for a
 * delayed payment method), the webhook's own generic dedup, or the
 * mock-checkout page's server action, in any combination or order. Refuses
 * a session that isn't paid yet.
 */
export async function markPaid(sessionId: string, session: CheckoutSessionSnapshot): Promise<ServiceResult<OrderDetail>> {
  const orderId = session.metadata.orderId;
  if (!orderId) return { ok: false, error: 'Checkout session has no orderId in metadata.' };

  // Checked before the claim below: a delayed payment completes Checkout
  // unpaid, and the later async_payment_succeeded call needs this session's
  // key still unclaimed to mark the order paid.
  if (session.paymentStatus !== 'paid') return { ok: false, error: 'This payment has not gone through yet.' };

  const firstTime = await claimWebhookEvent(`checkout.session.completed:${sessionId}`, orderId);
  if (!firstTime) {
    const existing = await loadOrderDetail(orderId);
    return existing ? { ok: true, value: existing } : { ok: false, error: 'Order not found.' };
  }

  const orderRows = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  const order = orderRows[0];
  if (!order) return { ok: false, error: 'Order not found.' };

  if (order.status === 'paid') {
    const existing = await loadOrderDetail(orderId);
    return existing ? { ok: true, value: existing } : { ok: false, error: 'Order not found.' };
  }

  const taxCents = session.taxCents ?? 0;
  const grossCents = session.amountTotalCents ?? order.totalAmount;

  const items = await db
    .select({ quantity: schema.orderItems.quantity, unitBaseCostCents: schema.orderItems.unitBaseCostCents })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  const baseCostTotalCents = items.reduce((sum, i) => sum + (i.unitBaseCostCents ?? 0) * i.quantity, 0);

  const existingTracking = (order.tracking as Record<string, unknown> | null) ?? {};
  const tracking = session.shippingDetails ? { ...existingTracking, shippingDetails: session.shippingDetails } : existingTracking;

  const [updated] = await db
    .update(schema.orders)
    .set({
      status: 'paid',
      productionStatus: 'queued',
      totalAmount: grossCents,
      taxCents,
      stripePaymentIntentId: session.paymentIntentId,
      stripeCheckoutSessionId: sessionId,
      shippingAddress: session.shippingDetails?.address ?? order.shippingAddress,
      fanEmail: order.fanEmail ?? session.customerEmail,
      tracking,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, orderId))
    .returning();

  const flags = await anomalyFlags({
    storeId: updated.storeId,
    grossCents,
    applicationFeeCents: updated.applicationFeeCents,
    transferCents: updated.transferCents,
    taxCents,
    baseCostTotalCents,
  });

  await db.insert(schema.payoutLedger).values({
    orderId: updated.id,
    storeId: updated.storeId,
    stripeChargeId: null,
    stripeTransferId: updated.stripeTransferId,
    grossCents,
    feeCents: updated.applicationFeeCents,
    transferCents: updated.transferCents,
    stripeFeeCents: null, // unknown until a balance transaction reconciliation job exists
    status: 'recorded',
    anomalyFlags: flags,
  });

  const detail = await loadOrderDetail(orderId);
  if (!detail) return { ok: false, error: 'Order not found after marking paid.' };

  // Notifications are best-effort — never let a failure here undo the sale.
  const store = await getStore(updated.storeId);
  if (store) {
    try {
      await notify({
        userId: store.artistId,
        event: 'sale.new',
        text: `New sale — order ${detail.reference} (€${(grossCents / 100).toFixed(2)})`,
        payload: { orderId: detail.id, reference: detail.reference, grossCents, transferCents: updated.transferCents },
        prompt: `Open order ${detail.id}`,
      });
    } catch (err) {
      console.error('[markPaid] notify(sale.new) failed:', err instanceof Error ? err.message : err);
    }
  }
  if (detail.fanEmail) {
    try {
      await notifyFan({
        email: detail.fanEmail,
        event: 'order.confirmed',
        payload: { reference: detail.reference, grossCents, lines: detail.lines },
      });
    } catch (err) {
      console.error('[markPaid] notifyFan(order.confirmed) failed:', err instanceof Error ? err.message : err);
    }
  }

  return { ok: true, value: detail };
}

// -- refunds ------------------------------------------------------------------

const REFUNDABLE_STATUSES = new Set(['paid', 'processing', 'shipped', 'fulfilled']);

export interface RefundOptions {
  /** omit for an admin-initiated refund (any store); pass to scope to one artist's own order */
  storeId?: string;
  amountCents?: number;
  reason?: string;
}

/** Appends 'refund_after_ship' when applicable, else just marks the ledger
 * row 'refunded' without touching its flags. Shared by refundOrder (our own
 * confirm-gated tool) and handleChargeRefunded (a refund issued directly in
 * the Stripe dashboard, reconciled via the charge.refunded webhook). */
async function reconcileLedgerAfterRefund(orderId: string, wasShipped: boolean): Promise<void> {
  if (wasShipped) await flagLedgerForOrder(orderId, 'refund_after_ship', 'refunded');
  else await setLedgerStatus(orderId, 'refunded');
}

export async function refundOrder(orderId: string, opts: RefundOptions = {}): Promise<ServiceResult<OrderDetail>> {
  const rows = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return { ok: false, error: 'Order not found.' };
  if (opts.storeId && order.storeId !== opts.storeId) return { ok: false, error: 'Order not found for this shop.' };
  if (!REFUNDABLE_STATUSES.has(order.status)) return { ok: false, error: `Can't refund an order that is "${order.status}".` };
  if (!order.stripePaymentIntentId) return { ok: false, error: 'This order has no payment on file to refund.' };

  await getStripeGateway().refund(order.stripePaymentIntentId, opts.amountCents);

  const wasShipped = order.productionStatus === 'shipped' || order.productionStatus === 'delivered';
  const fullyRefunded = !opts.amountCents || opts.amountCents >= order.totalAmount;

  await db
    .update(schema.orders)
    .set({ status: fullyRefunded ? 'cancelled' : order.status, updatedAt: new Date() })
    .where(eq(schema.orders.id, orderId));

  await reconcileLedgerAfterRefund(orderId, wasShipped);

  const detail = await loadOrderDetail(orderId);
  return detail ? { ok: true, value: detail } : { ok: false, error: 'Order not found after refund.' };
}

/** charge.refunded webhook path — Stripe already processed the refund
 * (dashboard-initiated or otherwise); this only reconciles our own records. */
export async function handleChargeRefunded(paymentIntentId: string | null, amountRefundedCents: number): Promise<void> {
  if (!paymentIntentId) return;
  const rows = await db.select().from(schema.orders).where(eq(schema.orders.stripePaymentIntentId, paymentIntentId)).limit(1);
  const order = rows[0];
  if (!order) return;

  const wasShipped = order.productionStatus === 'shipped' || order.productionStatus === 'delivered';
  const fullyRefunded = amountRefundedCents >= order.totalAmount;

  await db
    .update(schema.orders)
    .set({ status: fullyRefunded ? 'cancelled' : order.status, updatedAt: new Date() })
    .where(eq(schema.orders.id, order.id));

  await reconcileLedgerAfterRefund(order.id, wasShipped);
}

// -- sales summary ------------------------------------------------------------

export type SalesPeriod = 'month' | '30d' | 'all';

export interface SalesSummary {
  period: SalesPeriod;
  orders: number;
  grossCents: number;
  transferCents: number;
  topProducts: { name: string; qty: number; grossCents: number }[];
  series: { day: string; grossCents: number }[];
}

function periodStart(period: SalesPeriod): Date | null {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export async function salesSummary(storeId: string, period: SalesPeriod): Promise<SalesSummary> {
  const since = periodStart(period);
  // Fan sales only: an artist paying for their own run is a purchase, not a sale.
  const conditions = [eq(schema.orders.storeId, storeId), eq(schema.orders.status, 'paid'), eq(schema.orders.orderType, 'pod')];
  if (since) conditions.push(gte(schema.orders.createdAt, since));

  const orders = await db
    .select({ id: schema.orders.id, totalAmount: schema.orders.totalAmount, transferCents: schema.orders.transferCents, createdAt: schema.orders.createdAt })
    .from(schema.orders)
    .where(and(...conditions));

  const grossCents = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const transferCents = orders.reduce((sum, o) => sum + o.transferCents, 0);

  const seriesMap = new Map<string, number>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    seriesMap.set(day, (seriesMap.get(day) ?? 0) + o.totalAmount);
  }
  const series = [...seriesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, g]) => ({ day, grossCents: g }));

  let topProducts: { name: string; qty: number; grossCents: number }[] = [];
  if (orders.length > 0) {
    const items = await db
      .select({
        name: schema.products.name,
        blankCode: schema.blanks.code,
        blankName: schema.blanks.name,
        blankSupplierName: schema.blanks.supplierName,
        quantity: schema.orderItems.quantity,
        priceAtPurchase: schema.orderItems.priceAtPurchase,
      })
      .from(schema.orderItems)
      .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .innerJoin(schema.blanks, eq(schema.products.blankCode, schema.blanks.code))
      .where(
        inArray(
          schema.orderItems.orderId,
          orders.map((o) => o.id),
        ),
      );

    const byName = new Map<string, { qty: number; grossCents: number }>();
    for (const item of items) {
      const name = fanProductName(item.name, { code: item.blankCode, name: item.blankName, supplierName: item.blankSupplierName });
      const cur = byName.get(name) ?? { qty: 0, grossCents: 0 };
      cur.qty += item.quantity;
      cur.grossCents += item.quantity * item.priceAtPurchase;
      byName.set(name, cur);
    }
    topProducts = [...byName.entries()]
      .sort((a, b) => b[1].grossCents - a[1].grossCents)
      .slice(0, 5)
      .map(([name, v]) => ({ name, ...v }));
  }

  return { period, orders: orders.length, grossCents, transferCents, topProducts, series };
}
