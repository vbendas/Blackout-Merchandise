import { db } from './index';
import { orders, orderItems, products, users, artistStores } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { reserveInventory, cancelReservation } from './catalog';

export async function createOrder(data: {
  userId: string;
  storeId: string;
  items: Array<{ productId: string; variantId?: string; quantity: number; price: number }>;
  total: number;
  stripeSessionId: string;
  orderType?: 'individual' | 'bulk_quote' | 'wholesale';
}) {
  return await db.transaction(async (tx) => {
    // Create order
    const [order] = await tx.insert(orders).values({
      customerId: data.userId,
      storeId: data.storeId,
      orderType: data.orderType ?? 'individual',
      totalAmount: Math.round(data.total * 100), // Convert to cents
      stripePaymentIntentId: data.stripeSessionId,
      status: 'paid',
    }).returning();

    // Create order items and reserve inventory
    for (const item of data.items) {
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        priceAtPurchase: Math.round(item.price * 100),
      });

      // Reserve stock if variantId is provided
      if (item.variantId) {
        await reserveInventory(item.variantId, item.quantity);
      }
    }

    return order;
  });
}

export async function getOrderById(id: string) {
  return await db.select().from(orders).where(eq(orders.id, id)).limit(1);
}

export async function getOrdersByUser(userId: string) {
  return await db.select().from(orders).where(eq(orders.customerId, userId));
}

export async function getOrdersByStore(storeId: string) {
  return await db.select().from(orders).where(eq(orders.storeId, storeId));
}

export async function updateOrderStatus(id: string, status: 'pending' | 'paid' | 'processing' | 'shipped' | 'fulfilled' | 'cancelled') {
  return await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
}

/**
 * Cancel an order and release all reserved inventory back to available.
 * Only cancels orders that haven't been fulfilled yet.
 * Returns the updated order and a list of any variant IDs that failed to release.
 */
export async function cancelOrder(id: string) {
  return await db.transaction(async (tx) => {
    // Get order items with variant IDs
    const items = await tx
      .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    // Track failed releases for visibility
    const failedReleases: string[] = [];

    // Release reserved inventory for each item
    for (const item of items) {
      if (item.variantId) {
        try {
          await cancelReservation(item.variantId, item.quantity);
        } catch {
          // Reservation doesn't exist (e.g., already fulfilled or manually adjusted)
          // Track it for manual reconciliation but don't fail the cancellation
          failedReleases.push(item.variantId);
        }
      }
    }

    if (failedReleases.length > 0) {
      console.error(
        `[cancelOrder] Failed to release reservations for ${failedReleases.length} variant(s): ${failedReleases.join(', ')}. ` +
        `Manual reconciliation may be needed.`
      );
    }

    // Update order status
    const [updated] = await tx
      .update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    return { order: updated, failedReleases };
  });
}

export async function fulfillOrder(id: string) {
  return await updateOrderStatus(id, 'fulfilled');
}

// ============== GET ALL ORDERS (with customer + store names) ==============

export interface OrderWithDetails {
  id: string;
  orderType: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  storeName: string | null;
  itemCount: number;
  variantId: string | null;
}

export async function getAllOrders(
  page = 1,
  limit = 20,
  filters?: { orderType?: string; status?: string; search?: string }
): Promise<{ data: OrderWithDetails[]; total: number; totalPages: number }> {
  const offset = (page - 1) * limit;

  // Build base query with joins
  const baseQuery = db
    .select({
      id: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      customerName: users.displayName,
      customerEmail: users.email,
      storeName: artistStores.name,
      itemCount: sql<number>`count(${orderItems.id})`,
      variantId: orderItems.variantId,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.customerId))
    .leftJoin(artistStores, eq(artistStores.id, orders.storeId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .groupBy(
      orders.id,
      orders.orderType,
      orders.status,
      orders.totalAmount,
      orders.createdAt,
      users.displayName,
      users.email,
      artistStores.name,
      orderItems.variantId
    )
    .orderBy(desc(orders.createdAt));

  const results = await baseQuery;

  // Apply filters in JS
  let filtered = results;

  if (filters?.orderType && filters.orderType !== 'all') {
    filtered = filtered.filter(r => r.orderType === filters.orderType);
  }

  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter(r => r.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(r =>
      r.id.toLowerCase().includes(q) ||
      (r.customerName?.toLowerCase().includes(q)) ||
      (r.customerEmail?.toLowerCase().includes(q)) ||
      (r.storeName?.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paged = filtered.slice(offset, offset + limit);

  return { data: paged, total, totalPages };
}

// ============== GET ORDER WITH ITEMS ==============

export interface OrderWithItems {
  id: string;
  orderType: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  storeName: string | null;
  shippingAddress: any;
  items: {
    id: string;
    productId: string;
    variantId: string | null;
    productName: string | null;
    quantity: number;
    priceAtPurchase: number;
    lineTotal: number;
  }[];
}

export async function getOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const orderResult = await db
    .select({
      id: orders.id,
      orderType: orders.orderType,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: users.displayName,
      customerEmail: users.email,
      storeName: artistStores.name,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.customerId))
    .leftJoin(artistStores, eq(artistStores.id, orders.storeId))
    .where(eq(orders.id, id))
    .limit(1);

  if (!orderResult.length) return null;

  const order = orderResult[0];

  const itemsResult = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      productName: products.name,
      quantity: orderItems.quantity,
      priceAtPurchase: orderItems.priceAtPurchase,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id));

  return {
    ...order,
    items: itemsResult.map(item => ({
      ...item,
      lineTotal: item.quantity * item.priceAtPurchase,
    })),
  };
}

// ============== GET ORDERS BY TYPE ==============

export async function getOrdersByType(orderType: 'individual' | 'bulk_quote' | 'wholesale') {
  return await db.select().from(orders).where(eq(orders.orderType, orderType));
}

// ============== ORDER STATS ==============

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  byType: { type: string; count: number; revenue: number }[];
  byStatus: { status: string; count: number }[];
}

export async function getOrderStats(): Promise<OrderStats> {
  const allOrders = await db.select().from(orders);

  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // By type
  const typeMap = new Map<string, { count: number; revenue: number }>();
  for (const o of allOrders) {
    const t = o.orderType || 'individual';
    const existing = typeMap.get(t) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += o.totalAmount;
    typeMap.set(t, existing);
  }

  const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    revenue: data.revenue,
  }));

  // By status
  const statusMap = new Map<string, number>();
  for (const o of allOrders) {
    const s = o.status || 'pending';
    statusMap.set(s, (statusMap.get(s) || 0) + 1);
  }

  const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  return { totalOrders, totalRevenue, byType, byStatus };
}
