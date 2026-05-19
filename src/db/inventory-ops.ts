import { db } from './index';
import { catalogProducts, productVariants, inventory, colors, sizes, categories, supplierOrders, supplierOrderItems } from './schema';
import { eq, and, desc, sql, gte, lt } from 'drizzle-orm';

// ============== TYPES ==============

export interface StockOverviewRow {
    productId: string;
    productSku: string;
    productName: string;
    categoryId: string;
    categoryName: string | null;
    totalAvailable: number;
    totalReserved: number;
    totalOnOrder: number;
    variantCount: number;
    reorderPoint: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
}

export interface ColorGroup {
    colorId: string;
    colorName: string;
    colorHex: string | null;
    totalAvailable: number;
    totalReserved: number;
    totalOnOrder: number;
    sizes: SizeStockRow[];
}

export interface SizeStockRow {
    variantId: string;
    variantSku: string;
    sizeName: string;
    quantityAvailable: number;
    quantityReserved: number;
    quantityOnOrder: number;
    status: string;
    eta: string | null; // From open supplier orders
}

export interface StockDetailResult {
    product: {
        id: string;
        sku: string;
        name: string;
        categoryName: string | null;
    };
    summary: {
        totalAvailable: number;
        totalReserved: number;
        totalOnOrder: number;
        variantCount: number;
    };
    colorGroups: ColorGroup[];
}

// ============== STOCK OVERVIEW (Product-level aggregate) ==============

export async function getStockOverview(
    page = 1,
    limit = 20,
    filters?: { lowStockOnly?: boolean; outOfStockOnly?: boolean; search?: string }
): Promise<{ data: StockOverviewRow[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    // Build the query: JOIN products → variants → inventory, GROUP BY product
    const baseQuery = db
        .select({
            productId: catalogProducts.id,
            productSku: catalogProducts.sku,
            productName: catalogProducts.name,
            categoryId: catalogProducts.categoryId,
            categoryName: categories.name,
            totalAvailable: sql<number>`COALESCE(SUM(${inventory.quantityAvailable}), 0)`,
            totalReserved: sql<number>`COALESCE(SUM(${inventory.quantityReserved}), 0)`,
            totalOnOrder: sql<number>`COALESCE(SUM(${inventory.quantityOnOrder}), 0)`,
            variantCount: sql<number>`COUNT(DISTINCT ${productVariants.id})`,
            reorderPoint: sql<number>`COALESCE(MIN(${inventory.reorderPoint}), 10)`,
        })
        .from(catalogProducts)
        .leftJoin(productVariants, eq(productVariants.productId, catalogProducts.id))
        .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
        .leftJoin(categories, eq(categories.id, catalogProducts.categoryId))
        .groupBy(
            catalogProducts.id,
            catalogProducts.sku,
            catalogProducts.name,
            catalogProducts.categoryId,
            categories.name
        )
        .orderBy(desc(catalogProducts.name));

    const results = await baseQuery;

    // Apply filters in JS (simpler than dynamic SQL for these cases)
    let filtered = results;

    if (filters?.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(r =>
            r.productName.toLowerCase().includes(q) ||
            r.productSku.toLowerCase().includes(q)
        );
    }

    if (filters?.lowStockOnly) {
        filtered = filtered.filter(r => r.totalAvailable <= r.reorderPoint && r.totalAvailable > 0);
    }

    if (filters?.outOfStockOnly) {
        filtered = filtered.filter(r => r.totalAvailable === 0);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const paged = filtered.slice(offset, offset + limit);

    // Enrich with low stock flags
    const data: StockOverviewRow[] = paged.map(r => ({
        ...r,
        totalAvailable: Number(r.totalAvailable),
        totalReserved: Number(r.totalReserved),
        totalOnOrder: Number(r.totalOnOrder),
        variantCount: Number(r.variantCount),
        reorderPoint: Number(r.reorderPoint),
        isLowStock: Number(r.totalAvailable) <= Number(r.reorderPoint) && Number(r.totalAvailable) > 0,
        isOutOfStock: Number(r.totalAvailable) === 0,
    }));

    return { data, total, totalPages };
}

// ============== STOCK DETAIL (Variant-level, grouped by color) ==============

export async function getStockByProduct(productId: string): Promise<StockDetailResult | null> {
    // Get product info
    const product = await db
        .select({
            id: catalogProducts.id,
            sku: catalogProducts.sku,
            name: catalogProducts.name,
            categoryName: categories.name,
        })
        .from(catalogProducts)
        .leftJoin(categories, eq(categories.id, catalogProducts.categoryId))
        .where(eq(catalogProducts.id, productId))
        .limit(1);

    if (!product.length) return null;

    // Get all variants with inventory and color/size info
    const variants = await db
        .select({
            variantId: productVariants.id,
            variantSku: productVariants.sku,
            colorId: productVariants.colorId,
            colorName: colors.name,
            colorHex: colors.hexCode,
            sizeName: sizes.name,
            quantityAvailable: inventory.quantityAvailable,
            quantityReserved: inventory.quantityReserved,
            quantityOnOrder: inventory.quantityOnOrder,
            status: productVariants.status,
        })
        .from(productVariants)
        .leftJoin(colors, eq(colors.id, productVariants.colorId))
        .leftJoin(sizes, eq(sizes.id, productVariants.sizeId))
        .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
        .where(eq(productVariants.productId, productId))
        .orderBy(colors.displayOrder, sizes.displayOrder);

    // Get open supplier orders for ETA info
    const variantIds = variants.map(v => v.variantId);
    let orderEtas: Record<string, { eta: string | null; quantity: number }[]> = {};

    if (variantIds.length > 0) {
        const openOrders = await db
            .select({
                variantId: supplierOrderItems.variantId,
                expectedDeliveryDate: supplierOrders.expectedDeliveryDate,
                quantity: supplierOrderItems.quantity,
            })
            .from(supplierOrderItems)
            .innerJoin(supplierOrders, eq(supplierOrders.id, supplierOrderItems.orderId))
            .where(
                and(
                    sql`${supplierOrderItems.variantId} = ANY(${variantIds})`,
                    sql`${supplierOrders.status} IN ('placed', 'confirmed', 'shipped')`
                )
            );

        // Group by variantId
        for (const item of openOrders) {
            const vid = item.variantId;
            if (!orderEtas[vid]) orderEtas[vid] = [];
            orderEtas[vid].push({
                eta: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString('en-GB') : null,
                quantity: item.quantity,
            });
        }
    }

    // Group by color
    const colorMap = new Map<string, ColorGroup>();
    let totalAvailable = 0;
    let totalReserved = 0;
    let totalOnOrder = 0;

    for (const v of variants) {
        const cid = v.colorId || 'unknown';
        if (!colorMap.has(cid)) {
            colorMap.set(cid, {
                colorId: cid,
                colorName: v.colorName || 'Unknown',
                colorHex: v.colorHex,
                totalAvailable: 0,
                totalReserved: 0,
                totalOnOrder: 0,
                sizes: [],
            });
        }
        const group = colorMap.get(cid)!;
        const avail = v.quantityAvailable ?? 0;
        const reserved = v.quantityReserved ?? 0;
        const onOrder = v.quantityOnOrder ?? 0;

        group.totalAvailable += avail;
        group.totalReserved += reserved;
        group.totalOnOrder += onOrder;
        totalAvailable += avail;
        totalReserved += reserved;
        totalOnOrder += onOrder;

        // Get earliest ETA for this variant
        const etas = orderEtas[v.variantId] || [];
        const earliestEta = etas.length > 0
            ? etas.map(e => e.eta).filter(Boolean).sort()[0] ?? null
            : null;

        group.sizes.push({
            variantId: v.variantId,
            variantSku: v.variantSku,
            sizeName: v.sizeName || '?',
            quantityAvailable: avail,
            quantityReserved: reserved,
            quantityOnOrder: onOrder,
            status: v.status,
            eta: earliestEta,
        });
    }

    return {
        product: product[0],
        summary: {
            totalAvailable,
            totalReserved,
            totalOnOrder,
            variantCount: variants.length,
        },
        colorGroups: Array.from(colorMap.values()),
    };
}

// ============== LOW STOCK PRODUCTS ==============

export async function getLowStockProducts(threshold = 10): Promise<StockOverviewRow[]> {
    const { data } = await getStockOverview(1, 1000, { lowStockOnly: true });
    return data;
}

// ============== ON-ORDER SUMMARY ==============

export async function getOnOrderSummary(): Promise<{ totalOnOrder: number; openOrders: number }> {
    const result = await db
        .select({
            totalOnOrder: sql<number>`COALESCE(SUM(${inventory.quantityOnOrder}), 0)`,
        })
        .from(inventory);

    const openOrdersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(supplierOrders)
        .where(sql`${supplierOrders.status} IN ('placed', 'confirmed', 'shipped')`);

    return {
        totalOnOrder: Number(result[0]?.totalOnOrder ?? 0),
        openOrders: Number(openOrdersResult[0]?.count ?? 0),
    };
}
