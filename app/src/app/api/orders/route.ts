import { auth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { artistStores, orderItems, orders, products } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const order = await db
        .select({
          id: orders.id,
          storeId: orders.storeId,
          status: orders.status,
          totalAmount: orders.totalAmount,
          shippingAddress: orders.shippingAddress,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          priceAtPurchase: orderItems.priceAtPurchase,
          productName: products.name,
          productMockup: products.mockupUrl,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

      return NextResponse.json({ order: order[0], items });
    }

    if (userId) {
      const userOrders = await db
        .select({
          id: orders.id,
          storeId: orders.storeId,
          status: orders.status,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          storeName: artistStores.name,
        })
        .from(orders)
        .innerJoin(artistStores, eq(orders.storeId, artistStores.id))
        .where(eq(orders.customerId, userId))
        .orderBy(orders.createdAt);

      return NextResponse.json({ orders: userOrders });
    }

    if (storeId) {
      const storeOrders = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          status: orders.status,
          totalAmount: orders.totalAmount,
          shippingAddress: orders.shippingAddress,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.storeId, storeId))
        .orderBy(orders.createdAt);

      return NextResponse.json({ orders: storeOrders });
    }

    return NextResponse.json({ error: 'Missing userId, storeId, or orderId' }, { status: 400 });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify the user has access to this order
    const order = await db
      .select({
        id: orders.id,
        storeId: orders.storeId,
        customerId: orders.customerId,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // User must either own the order (as customer) or own the store
    const store = await db
      .select({ artistId: artistStores.artistId })
      .from(artistStores)
      .where(eq(artistStores.id, order[0].storeId))
      .limit(1);

    const isStoreOwner = store.length > 0 && store[0].artistId === userId;
    const isCustomer = order[0].customerId === userId;

    if (!isStoreOwner && !isCustomer) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this order' }, { status: 403 });
    }

    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
