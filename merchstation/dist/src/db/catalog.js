import { db } from './index';
import { categories, categoryAttributes, colors, sizes, catalogProducts, productVariants, inventory, productImages, pricingHistory, pricingSchedules, productBatches } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';
// ============== CATEGORIES ==============
export async function getAllCategories() {
    return await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.displayOrder);
}
export async function getCategoryById(id) {
    return await db.select().from(categories).where(eq(categories.id, id)).limit(1);
}
export async function getCategoryBySlug(slug) {
    return await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
}
export async function createCategory(data) {
    return await db.insert(categories).values(data).returning();
}
export async function updateCategory(id, data) {
    return await db.update(categories).set({ ...data, updatedAt: new Date() }).where(eq(categories.id, id)).returning();
}
export async function deleteCategory(id) {
    return await db.update(categories).set({ isActive: false }).where(eq(categories.id, id)).returning();
}
// ============== CATEGORY ATTRIBUTES ==============
export async function getAttributesByCategory(categoryId) {
    return await db.select().from(categoryAttributes)
        .where(eq(categoryAttributes.categoryId, categoryId))
        .orderBy(categoryAttributes.displayOrder);
}
// ============== COLORS ==============
export async function getAllColors() {
    return await db.select().from(colors).where(eq(colors.isActive, true)).orderBy(colors.displayOrder);
}
export async function getColorById(id) {
    return await db.select().from(colors).where(eq(colors.id, id)).limit(1);
}
export async function getColorByName(name) {
    return await db.select().from(colors).where(eq(colors.name, name)).limit(1);
}
// ============== SIZES ==============
export async function getSizesByCategory(categoryId) {
    return await db.select().from(sizes)
        .where(eq(sizes.categoryId, categoryId))
        .orderBy(sizes.displayOrder);
}
export async function getSizeById(id) {
    return await db.select().from(sizes).where(eq(sizes.id, id)).limit(1);
}
// ============== CATALOG PRODUCTS ==============
export async function getAllCatalogProducts() {
    return await db.select().from(catalogProducts)
        .where(eq(catalogProducts.status, 'active'))
        .orderBy(desc(catalogProducts.createdAt));
}
export async function getCatalogProductById(id) {
    return await db.select().from(catalogProducts).where(eq(catalogProducts.id, id)).limit(1);
}
export async function getCatalogProductBySku(sku) {
    return await db.select().from(catalogProducts).where(eq(catalogProducts.sku, sku)).limit(1);
}
export async function getCatalogProductsByCategory(categoryId) {
    return await db.select().from(catalogProducts)
        .where(and(eq(catalogProducts.categoryId, categoryId), eq(catalogProducts.status, 'active')))
        .orderBy(catalogProducts.name);
}
export async function createCatalogProduct(data) {
    return await db.insert(catalogProducts).values(data).returning();
}
export async function updateCatalogProduct(id, data) {
    return await db.update(catalogProducts).set({ ...data, updatedAt: new Date() }).where(eq(catalogProducts.id, id)).returning();
}
// ============== PRODUCT VARIANTS ==============
export async function getVariantsByProduct(productId) {
    return await db.select().from(productVariants).where(eq(productVariants.productId, productId));
}
export async function getVariantById(id) {
    return await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
}
export async function getVariantBySku(sku) {
    return await db.select().from(productVariants).where(eq(productVariants.sku, sku)).limit(1);
}
export async function createVariant(data) {
    return await db.insert(productVariants).values(data).returning();
}
export async function updateVariant(id, data) {
    return await db.update(productVariants).set(data).where(eq(productVariants.id, id)).returning();
}
// ============== INVENTORY ==============
export async function getInventoryByVariant(variantId) {
    return await db.select().from(inventory).where(eq(inventory.variantId, variantId)).limit(1);
}
export async function updateInventory(variantId, quantity, reserved = 0) {
    return await db.update(inventory)
        .set({
        quantityAvailable: quantity,
        quantityReserved: reserved,
        updatedAt: new Date()
    })
        .where(eq(inventory.variantId, variantId))
        .returning();
}
// Atomic reservation - prevents race conditions by using WHERE clause check
export async function reserveInventory(variantId, quantity) {
    const result = await db.execute(sql `
        UPDATE inventory 
        SET quantity_available = quantity_available - ${quantity},
            quantity_reserved = quantity_reserved + ${quantity},
            updated_at = NOW()
        WHERE variant_id = ${variantId} 
        AND quantity_available >= ${quantity}
        RETURNING *
    `);
    if (!result.rowCount || result.rowCount === 0) {
        throw new Error('Insufficient inventory or variant not found');
    }
    return result.rows;
}
// Atomic release - returns reserved stock back to available
export async function releaseInventory(variantId, quantity) {
    const result = await db.execute(sql `
        UPDATE inventory 
        SET quantity_available = quantity_available + ${quantity},
            quantity_reserved = GREATEST(quantity_reserved - ${quantity}, 0),
            updated_at = NOW()
        WHERE variant_id = ${variantId}
        AND quantity_reserved >= ${quantity}
        RETURNING *
    `);
    if (!result.rowCount || result.rowCount === 0) {
        throw new Error('Insufficient reserved inventory or variant not found');
    }
    return result.rows;
}
// Confirm reservation - move reserved to sold (order fulfillment)
export async function confirmReservation(variantId, quantity) {
    const result = await db.execute(sql `
        UPDATE inventory 
        SET quantity_reserved = quantity_reserved - ${quantity},
            updated_at = NOW()
        WHERE variant_id = ${variantId}
        AND quantity_reserved >= ${quantity}
        RETURNING *
    `);
    if (!result.rowCount || result.rowCount === 0) {
        throw new Error('Insufficient reserved inventory or variant not found');
    }
    return result.rows;
}
// Cancel reservation - move reserved back to available (order failed/cancelled)
export async function cancelReservation(variantId, quantity) {
    return await releaseInventory(variantId, quantity);
}
// ============== PRODUCT IMAGES ==============
export async function getImagesByProduct(productId) {
    return await db.select().from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(productImages.displayOrder);
}
export async function getImagesByVariant(variantId) {
    return await db.select().from(productImages)
        .where(eq(productImages.variantId, variantId))
        .orderBy(productImages.displayOrder);
}
export async function createProductImage(data) {
    return await db.insert(productImages).values(data).returning();
}
export async function deleteProductImage(id) {
    return await db.delete(productImages).where(eq(productImages.id, id)).returning();
}
// ============== PRICING HISTORY ==============
export async function getPricingHistory(productId) {
    return await db.select().from(pricingHistory)
        .where(eq(pricingHistory.productId, productId))
        .orderBy(desc(pricingHistory.effectiveDate));
}
export async function addPricingHistory(productId, field, oldVal, newVal, changedBy, reason) {
    return await db.insert(pricingHistory).values({
        productId,
        fieldChanged: field,
        oldValue: oldVal,
        newValue: newVal,
        changedBy,
        changeReason: reason
    }).returning();
}
// ============== PRICING SCHEDULES ==============
export async function getScheduledPriceChanges() {
    return await db.select().from(pricingSchedules)
        .where(eq(pricingSchedules.status, 'pending'))
        .orderBy(pricingSchedules.effectiveDate);
}
export async function createPricingSchedule(productId, field, newVal, effectiveDate, createdBy) {
    return await db.insert(pricingSchedules).values({
        productId,
        fieldToChange: field,
        newValue: newVal,
        effectiveDate,
        createdBy
    }).returning();
}
export async function applyScheduledPrices() {
    const now = new Date();
    const pending = await db.select().from(pricingSchedules)
        .where(and(eq(pricingSchedules.status, 'pending'), sql `${pricingSchedules.effectiveDate} <= ${now}`));
    for (const schedule of pending) {
        const product = await getCatalogProductById(schedule.productId);
        if (!product.length)
            continue;
        const currentPrice = product[0][schedule.fieldToChange];
        await updateCatalogProduct(schedule.productId, { [schedule.fieldToChange]: schedule.newValue });
        await addPricingHistory(schedule.productId, schedule.fieldToChange, currentPrice, schedule.newValue, 'system', 'Scheduled price change applied');
        await db.update(pricingSchedules)
            .set({ status: 'applied' })
            .where(eq(pricingSchedules.id, schedule.id));
    }
    return pending.length;
}
// ============== PRODUCT BATCHES ==============
export async function getBatchesByVariant(variantId) {
    return await db.select().from(productBatches)
        .where(eq(productBatches.variantId, variantId));
}
export async function getActiveBatchesByVariant(variantId) {
    return await db.select().from(productBatches)
        .where(and(eq(productBatches.variantId, variantId), eq(productBatches.status, 'active')));
}
export async function createBatch(data) {
    return await db.insert(productBatches).values(data).returning();
}
export async function calculateAverageCost(variantId) {
    const batches = await getActiveBatchesByVariant(variantId);
    if (!batches.length)
        return null;
    let totalCost = 0;
    let totalQty = 0;
    for (const batch of batches) {
        totalCost += (batch.purchaseCostEur * batch.quantityRemaining);
        totalQty += batch.quantityRemaining;
    }
    return totalQty > 0 ? Math.round(totalCost / totalQty) : null;
}
// Optimized version using Drizzle query API with joins - single query
export async function getFullProductById(id) {
    const result = await db.query.catalogProducts.findFirst({
        where: eq(catalogProducts.id, id),
        with: {
            category: true,
            variants: {
                with: {
                    color: true,
                    size: true,
                    inventory: true,
                },
            },
            images: true,
        },
    });
    if (!result)
        return null;
    return {
        ...result,
        category: result.category || undefined,
        variants: result.variants?.map(v => ({
            ...v,
            color: v.color || undefined,
            size: v.size || undefined,
            inventory: v.inventory || undefined,
        })) || [],
        images: result.images || [],
    };
}
// Optimized version using single query with joins
export async function getProductPricing(skuOrId) {
    // Try by SKU first
    let result = await db.query.catalogProducts.findFirst({
        where: eq(catalogProducts.sku, skuOrId),
        with: {
            variants: {
                with: {
                    color: true,
                    size: true,
                    inventory: true,
                },
            },
        },
    });
    // If not found by SKU, try by ID
    if (!result) {
        result = await db.query.catalogProducts.findFirst({
            where: eq(catalogProducts.id, skuOrId),
            with: {
                variants: {
                    with: {
                        color: true,
                        size: true,
                        inventory: true,
                    },
                },
            },
        });
    }
    if (!result)
        return null;
    return {
        sku: result.sku,
        name: result.name,
        baseCostEur: result.baseCostEur,
        suggestedRetailEur: result.suggestedRetailEur,
        variants: result.variants?.map(v => ({
            sku: v.sku,
            color: v.color?.name || 'Unknown',
            size: v.size?.name || 'Unknown',
            status: v.status,
            inventory: v.inventory?.quantityAvailable || 0
        })) || []
    };
}
export async function searchProducts(query, page = 1, limit = 20, filters) {
    const offset = (page - 1) * limit;
    // Build where conditions
    const conditions = [];
    // Full-text search on name/description
    if (query) {
        conditions.push(sql `
            to_tsvector('english', COALESCE(${catalogProducts.name}, '') || ' ' || COALESCE(${catalogProducts.description}, '')) @@ plainto_tsquery('english', ${query})
        `);
    }
    if (filters?.categoryId) {
        conditions.push(eq(catalogProducts.categoryId, filters.categoryId));
    }
    if (filters?.status) {
        conditions.push(eq(catalogProducts.status, filters.status));
    }
    else {
        conditions.push(eq(catalogProducts.status, 'active'));
    }
    if (filters?.minPrice !== undefined) {
        conditions.push(sql `${catalogProducts.baseCostEur} >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice !== undefined) {
        conditions.push(sql `${catalogProducts.baseCostEur} <= ${filters.maxPrice}`);
    }
    // Get total count
    const countResult = await db.select({ count: sql `count(*)` })
        .from(catalogProducts)
        .where(and(...conditions));
    const total = Number(countResult[0]?.count) || 0;
    // Get paginated results
    const results = await db.select()
        .from(catalogProducts)
        .where(and(...conditions))
        .orderBy(desc(catalogProducts.createdAt))
        .limit(limit)
        .offset(offset);
    return {
        data: results,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}
export async function getLowStockVariants(threshold = 10) {
    const result = await db.execute(sql `
        SELECT 
            pv.id, pv.sku, pv.status,
            c.name as color_name, s.name as size_name,
            cp.name as product_name, cp.sku as product_sku,
            i.quantity_available, i.reorder_point
        FROM product_variants pv
        JOIN catalog_products cp ON pv.product_id = cp.id
        JOIN colors c ON pv.color_id = c.id
        JOIN sizes s ON pv.size_id = s.id
        JOIN inventory i ON pv.id = i.variant_id
        WHERE i.quantity_available <= ${threshold}
        AND i.quantity_available > 0
        ORDER BY i.quantity_available ASC
    `);
    return result.rows;
}
export async function getOutOfStockVariants() {
    const result = await db.execute(sql `
        SELECT 
            pv.id, pv.sku, pv.status,
            c.name as color_name, s.name as size_name,
            cp.name as product_name, cp.sku as product_sku,
            i.quantity_available
        FROM product_variants pv
        JOIN catalog_products cp ON pv.product_id = cp.id
        JOIN colors c ON pv.color_id = c.id
        JOIN sizes s ON pv.size_id = s.id
        JOIN inventory i ON pv.id = i.variant_id
        WHERE i.quantity_available = 0
        OR pv.status = 'out_of_stock'
        ORDER BY cp.name, c.name, s.name
    `);
    return result.rows;
}
