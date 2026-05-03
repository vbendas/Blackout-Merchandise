import { auth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { artistStores, orderItems, orders, products, users } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { getStoreByArtist } from '@db-root/stores';

export const dynamic = 'force-dynamic';

// Valid status transitions by role
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['in_production', 'cancelled'],
  in_production: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const storeId = searchParams.get('storeId');

    if (orderId) {
      const order = await db
        .select({
          id: orders.id,
          storeId: orders.storeId,
          customerId: orders.customerId,
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

      // Only allow access to the customer or the store owner
      const isCustomer = order[0].customerId === user.id;
      const artistStore = await getStoreByArtist(user.id);
      const isStoreOwner = artistStore.length > 0 && artistStore[0].id === order[0].storeId;

      if (!isCustomer && !isStoreOwner && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    if (storeId) {
      // Verify the authenticated user owns this store
      const artistStore = await getStoreByArtist(user.id);
      const ownsStore = artistStore.length > 0 && artistStore[0].id === storeId;

      if (!ownsStore && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const storeOrders = await db
        .select({
          id: orders.id,
          customerId: orders.customerId,
          customerEmail: users.email,
          customerName: users.displayName,
          status: orders.status,
          totalAmount: orders.totalAmount,
          shippingAddress: orders.shippingAddress,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(users, eq(orders.customerId, users.id))
        .where(eq(orders.storeId, storeId))
        .orderBy(orders.createdAt);

      return NextResponse.json({ orders: storeOrders });
    }

    // Default: return the authenticated user's own orders
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
        .where(eq(orders.customerId, user.id))
        .orderBy(orders.createdAt);

      return NextResponse.json({ orders: userOrders });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    // Resolve Clerk ID → DB user UUID (fixes the Clerk ID vs UUID bug)
    const user = await resolveUser(clerkId);

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await db
      .select({
        id: orders.id,
        storeId: orders.storeId,
        customerId: orders.customerId,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Use DB UUIDs throughout — this is the critical fix
    const store = await db
      .select({ artistId: artistStores.artistId })
      .from(artistStores)
      .where(eq(artistStores.id, order[0].storeId))
      .limit(1);

    const isStoreOwner = store.length > 0 && store[0].artistId === user.id;
    const isCustomer = order[0].customerId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isStoreOwner && !isCustomer && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this order' }, { status: 403 });
    }

    // Validate status transitions
    const currentStatus = order[0].status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' to '${status}'` },
        { status: 400 }
      );
    }

    // Role-based transition restrictions
    if (isCustomer && status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Customers can only cancel orders' },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
