import { eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Public, token-scoped order lookup for the fan order-status page and its
// API route. There is no lib/services/orders.ts yet (it's being built
// alongside this wave by another agent) — the public token this reads is
// documented as living at orders.tracking->>'token', written by whichever
// service marks an order paid. Never returns fanEmail. Deliberately
// uncached: a fan lands here straight off a Stripe redirect and status can
// change any moment after (production, shipping).

export interface PublicOrderLine {
  productId: string;
  name: string;
  colourCode: string | null;
  colourName: string | null;
  size: string | null;
  qty: number;
  priceCents: number;
}

export interface PublicOrder {
  reference: string;
  status: (typeof schema.orderStatusEnum.enumValues)[number];
  productionStatus: (typeof schema.productionStatusEnum.enumValues)[number] | null;
  storeSlug: string;
  storeName: string;
  lines: PublicOrderLine[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  tracking: { carrier?: string; code?: string; url?: string } | null;
}

export async function getPublicOrder(token: string): Promise<PublicOrder | null> {
  if (!token) return null;

  const rows = await db
    .select({
      id: schema.orders.id,
      status: schema.orders.status,
      productionStatus: schema.orders.productionStatus,
      totalAmount: schema.orders.totalAmount,
      shippingCents: schema.orders.shippingCents,
      taxCents: schema.orders.taxCents,
      tracking: schema.orders.tracking,
      storeSlug: schema.artistStores.slug,
      storeName: schema.artistStores.name,
    })
    .from(schema.orders)
    .innerJoin(schema.artistStores, eq(schema.orders.storeId, schema.artistStores.id))
    .where(sql`${schema.orders.tracking} ->> 'token' = ${token}`)
    .limit(1);

  const order = rows[0];
  if (!order) return null;

  const itemRows = await db
    .select({
      productId: schema.orderItems.productId,
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
    .where(eq(schema.orderItems.orderId, order.id));

  const subtotalCents = itemRows.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);

  const trackingRaw = (order.tracking as Record<string, unknown> | null) ?? null;
  const tracking =
    trackingRaw && (trackingRaw.carrier || trackingRaw.code || trackingRaw.url)
      ? {
          carrier: typeof trackingRaw.carrier === 'string' ? trackingRaw.carrier : undefined,
          code: typeof trackingRaw.code === 'string' ? trackingRaw.code : undefined,
          url: typeof trackingRaw.url === 'string' ? trackingRaw.url : undefined,
        }
      : null;

  return {
    reference: order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    productionStatus: order.productionStatus,
    storeSlug: order.storeSlug,
    storeName: order.storeName,
    lines: itemRows.map((i) => ({
      productId: i.productId,
      name: i.productName,
      colourCode: i.colourCode,
      colourName: i.colourName ?? i.colourCode,
      size: i.size,
      qty: i.quantity,
      priceCents: i.priceAtPurchase,
    })),
    subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalAmount,
    tracking,
  };
}
