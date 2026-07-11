import { db } from './index';
import { orders, orderItems, products, users, artistStores } from './schema';
import { eq, desc, sql } from 'drizzle-orm';
export async function createOrder(data) {
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
        // Create order items
        if (data.items.length > 0) {
            await tx.insert(orderItems).values(data.items.map(item => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: Math.round(item.price * 100),
            })));
        }
        return order;
    });
}
export async function getOrderById(id) {
    return await db.select().from(orders).where(eq(orders.id, id)).limit(1);
}
export async function getOrdersByUser(userId) {
    return await db.select().from(orders).where(eq(orders.customerId, userId));
}
export async function getOrdersByStore(storeId) {
    return await db.select().from(orders).where(eq(orders.storeId, storeId));
}
export async function updateOrderStatus(id, status) {
    return await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
}
export async function fulfillOrder(id) {
    return await updateOrderStatus(id, 'fulfilled');
}
export async function getAllOrders(page = 1, limit = 20, filters) {
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
        itemCount: sql `count(${orderItems.id})`,
    })
        .from(orders)
        .leftJoin(users, eq(users.id, orders.customerId))
        .leftJoin(artistStores, eq(artistStores.id, orders.storeId))
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .groupBy(orders.id, orders.orderType, orders.status, orders.totalAmount, orders.createdAt, users.displayName, users.email, artistStores.name)
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
        filtered = filtered.filter(r => r.id.toLowerCase().includes(q) ||
            (r.customerName?.toLowerCase().includes(q)) ||
            (r.customerEmail?.toLowerCase().includes(q)) ||
            (r.storeName?.toLowerCase().includes(q)));
    }
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const paged = filtered.slice(offset, offset + limit);
    return { data: paged, total, totalPages };
}
export async function getOrderWithItems(id) {
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
    if (!orderResult.length)
        return null;
    const order = orderResult[0];
    const itemsResult = await db
        .select({
        id: orderItems.id,
        productId: orderItems.productId,
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
export async function getOrdersByType(orderType) {
    return await db.select().from(orders).where(eq(orders.orderType, orderType));
}
export async function getOrderStats() {
    const allOrders = await db.select().from(orders);
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    // By type
    const typeMap = new Map();
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
    const statusMap = new Map();
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
