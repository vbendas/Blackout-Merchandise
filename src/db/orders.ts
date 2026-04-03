import { db } from './index';
import { orders, orderItems } from './schema';
import { eq } from 'drizzle-orm';

export async function createOrder(data: {
  userId: string;
  storeId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  stripeSessionId: string;
}) {
  return await db.transaction(async (tx) => {
    // Create order
    const [order] = await tx.insert(orders).values({
      customerId: data.userId,
      storeId: data.storeId,
      totalAmount: Math.round(data.total * 100), // Convert to cents
      stripePaymentIntentId: data.stripeSessionId,
      status: 'paid',
    }).returning();

    // Create order items
    if (data.items.length > 0) {
      await tx.insert(orderItems).values(
        data.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: Math.round(item.price * 100),
        }))
      );
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

export async function updateOrderStatus(id: string, status: string) {
  return await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
}

export async function fulfillOrder(id: string) {
  return await updateOrderStatus(id, 'fulfilled');
}
