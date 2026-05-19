import { db } from './index';
import { supplierOrders, supplierOrderItems, productVariants, inventory, colors, sizes, catalogProducts } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// ============== TYPES ==============

export interface CreateSupplierOrderData {
    supplierName: string;
    expectedDeliveryDate?: Date;
    notes?: string;
    items: {
        variantId: string;
        quantity: number;
        unitCostEur: number; // In cents
    }[];
}

export interface SupplierOrderWithItems {
    id: string;
    poNumber: string;
    supplierName: string;
    orderDate: Date;
    expectedDeliveryDate: Date | null;
    status: string;
    totalCostEur: number;
    notes: string | null;
    items: {
        id: string;
        variantId: string;
        variantSku: string | null;
        productName: string | null;
        colorName: string | null;
        sizeName: string | null;
        quantity: number;
        unitCostEur: number;
        receivedQuantity: number;
        lineTotal: number;
    }[];
}

// ============== GENERATE PO NUMBER ==============

async function generatePoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(supplierOrders)
        .where(sql`EXTRACT(YEAR FROM ${supplierOrders.orderDate}) = ${year}`);

    const count = Number(result[0]?.count ?? 0) + 1;
    return `PO-${year}-${String(count).padStart(4, '0')}`;
}

// ============== GET ALL SUPPLIER ORDERS ==============

export async function getAllSupplierOrders(
    page = 1,
    limit = 20,
    filters?: { status?: string }
): Promise<{ data: any[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters?.status && filters.status !== 'all') {
        conditions.push(eq(supplierOrders.status, filters.status as any));
    }

    // Count
    const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(supplierOrders);

    if (conditions.length > 0) {
        countQuery.where(and(...conditions));
    }
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    // Data
    let dataQuery = db
        .select({
            id: supplierOrders.id,
            poNumber: supplierOrders.poNumber,
            supplierName: supplierOrders.supplierName,
            orderDate: supplierOrders.orderDate,
            expectedDeliveryDate: supplierOrders.expectedDeliveryDate,
            status: supplierOrders.status,
            totalCostEur: supplierOrders.totalCostEur,
            itemCount: sql<number>`count(${supplierOrderItems.id})`,
        })
        .from(supplierOrders)
        .leftJoin(supplierOrderItems, eq(supplierOrderItems.orderId, supplierOrders.id))
        .groupBy(
            supplierOrders.id,
            supplierOrders.poNumber,
            supplierOrders.supplierName,
            supplierOrders.orderDate,
            supplierOrders.expectedDeliveryDate,
            supplierOrders.status,
            supplierOrders.totalCostEur
        )
        .orderBy(desc(supplierOrders.orderDate))
        .limit(limit)
        .offset(offset);

    if (conditions.length > 0) {
        dataQuery = dataQuery.where(and(...conditions)) as any;
    }

    const data = await dataQuery;

    return { data, total, totalPages };
}

// ============== GET SUPPLIER ORDER BY ID ==============

export async function getSupplierOrderById(id: string): Promise<SupplierOrderWithItems | null> {
    const orderResult = await db
        .select()
        .from(supplierOrders)
        .where(eq(supplierOrders.id, id))
        .limit(1);

    if (!orderResult.length) return null;

    const order = orderResult[0];

    const itemsResult = await db
        .select({
            id: supplierOrderItems.id,
            variantId: supplierOrderItems.variantId,
            quantity: supplierOrderItems.quantity,
            unitCostEur: supplierOrderItems.unitCostEur,
            receivedQuantity: supplierOrderItems.receivedQuantity,
            variantSku: productVariants.sku,
            productName: catalogProducts.name,
            colorName: colors.name,
            sizeName: sizes.name,
        })
        .from(supplierOrderItems)
        .leftJoin(productVariants, eq(productVariants.id, supplierOrderItems.variantId))
        .leftJoin(catalogProducts, eq(catalogProducts.id, productVariants.productId))
        .leftJoin(colors, eq(colors.id, productVariants.colorId))
        .leftJoin(sizes, eq(sizes.id, productVariants.sizeId))
        .where(eq(supplierOrderItems.orderId, id));

    return {
        id: order.id,
        poNumber: order.poNumber,
        supplierName: order.supplierName,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
        status: order.status,
        totalCostEur: order.totalCostEur,
        notes: order.notes,
        items: itemsResult.map(item => ({
            ...item,
            lineTotal: item.quantity * item.unitCostEur,
        })),
    };
}

// ============== CREATE SUPPLIER ORDER ==============

export async function createSupplierOrder(data: CreateSupplierOrderData) {
    return await db.transaction(async (tx) => {
        // Generate PO number
        const year = new Date().getFullYear();
        const countResult = await tx
            .select({ count: sql<number>`count(*)` })
            .from(supplierOrders)
            .where(sql`EXTRACT(YEAR FROM ${supplierOrders.orderDate}) = ${year}`);

        const count = Number(countResult[0]?.count ?? 0) + 1;
        const poNumber = `PO-${year}-${String(count).padStart(4, '0')}`;

        // Calculate total
        const totalCostEur = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCostEur), 0);

        // Create order
        const [order] = await tx.insert(supplierOrders).values({
            poNumber,
            supplierName: data.supplierName,
            expectedDeliveryDate: data.expectedDeliveryDate,
            status: 'draft',
            totalCostEur,
            notes: data.notes,
        }).returning();

        // Create items and update quantityOnOrder
        for (const item of data.items) {
            await tx.insert(supplierOrderItems).values({
                orderId: order.id,
                variantId: item.variantId,
                quantity: item.quantity,
                unitCostEur: item.unitCostEur,
                receivedQuantity: 0,
            });

            // Increment quantityOnOrder for this variant
            await tx.execute(sql`
                INSERT INTO inventory (variant_id, quantity_available, quantity_reserved, quantity_on_order, updated_at)
                VALUES (${item.variantId}, 0, 0, ${item.quantity}, NOW())
                ON CONFLICT (variant_id) DO UPDATE SET
                    quantity_on_order = inventory.quantity_on_order + ${item.quantity},
                    updated_at = NOW()
            `);
        }

        return order;
    });
}

// ============== UPDATE SUPPLIER ORDER STATUS ==============

export async function updateSupplierOrderStatus(id: string, status: string) {
    return await db
        .update(supplierOrders)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(supplierOrders.id, id))
        .returning();
}

// ============== RECEIVE SUPPLIER ORDER ==============

export async function receiveSupplierOrder(id: string) {
    return await db.transaction(async (tx) => {
        // Get order items
        const items = await tx
            .select()
            .from(supplierOrderItems)
            .where(eq(supplierOrderItems.orderId, id));

        // For each item: decrement quantityOnOrder, increment quantityAvailable
        for (const item of items) {
            const qtyToReceive = item.quantity - item.receivedQuantity;
            if (qtyToReceive <= 0) continue;

            await tx.execute(sql`
                UPDATE inventory
                SET quantity_on_order = GREATEST(quantity_on_order - ${qtyToReceive}, 0),
                    quantity_available = quantity_available + ${qtyToReceive},
                    updated_at = NOW()
                WHERE variant_id = ${item.variantId}
            `);

            // Update received quantity
            await tx
                .update(supplierOrderItems)
                .set({ receivedQuantity: item.quantity })
                .where(eq(supplierOrderItems.id, item.id));
        }

        // Update order status
        await tx
            .update(supplierOrders)
            .set({ status: 'received', updatedAt: new Date() })
            .where(eq(supplierOrders.id, id));
    });
}

// ============== CANCEL SUPPLIER ORDER ==============

export async function cancelSupplierOrder(id: string) {
    return await db.transaction(async (tx) => {
        // Get order items
        const items = await tx
            .select()
            .from(supplierOrderItems)
            .where(eq(supplierOrderItems.orderId, id));

        // For each item: decrement quantityOnOrder
        for (const item of items) {
            const qtyToCancel = item.quantity - item.receivedQuantity;
            if (qtyToCancel <= 0) continue;

            await tx.execute(sql`
                UPDATE inventory
                SET quantity_on_order = GREATEST(quantity_on_order - ${qtyToCancel}, 0),
                    updated_at = NOW()
                WHERE variant_id = ${item.variantId}
            `);
        }

        // Update order status
        await tx
            .update(supplierOrders)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(supplierOrders.id, id));
    });
}

// ============== GET OPEN ORDERS FOR VARIANT (ETA lookup) ==============

export async function getOpenOrdersForVariant(variantId: string) {
    return await db
        .select({
            poNumber: supplierOrders.poNumber,
            supplierName: supplierOrders.supplierName,
            expectedDeliveryDate: supplierOrders.expectedDeliveryDate,
            quantity: supplierOrderItems.quantity,
            receivedQuantity: supplierOrderItems.receivedQuantity,
            status: supplierOrders.status,
        })
        .from(supplierOrderItems)
        .innerJoin(supplierOrders, eq(supplierOrders.id, supplierOrderItems.orderId))
        .where(
            and(
                eq(supplierOrderItems.variantId, variantId),
                sql`${supplierOrders.status} IN ('placed', 'confirmed', 'shipped')`
            )
        )
        .orderBy(supplierOrders.expectedDeliveryDate);
}
