import { db } from './index';
import { products } from './schema';
import { eq, and } from 'drizzle-orm';

export async function createProduct(data: typeof products.$inferInsert) {
  return await db.insert(products).values(data).returning();
}

export async function getProductById(id: string) {
  return await db.select().from(products).where(eq(products.id, id)).limit(1);
}

export async function getProductsByStore(storeId: string) {
  return await db.select().from(products).where(eq(products.storeId, storeId));
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferSelect>) {
  return await db.update(products).set(data).where(eq(products.id, id)).returning();
}

export async function deleteProduct(id: string) {
  return await db.delete(products).where(eq(products.id, id)).returning();
}
