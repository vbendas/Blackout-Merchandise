import { db } from './index';
import { artistStores } from './schema';
import { eq } from 'drizzle-orm';

export async function createStore(data: typeof artistStores.$inferInsert) {
  return await db.insert(artistStores).values(data).returning();
}

export async function getStoreBySlug(slug: string) {
  return await db.select().from(artistStores).where(eq(artistStores.slug, slug)).limit(1);
}

export async function getStoreByArtist(artistId: string) {
  return await db.select().from(artistStores).where(eq(artistStores.artistId, artistId)).limit(1);
}

export async function updateStore(id: string, data: Partial<typeof artistStores.$inferSelect>) {
  return await db.update(artistStores).set(data).where(eq(artistStores.id, id)).returning();
}

export async function deleteStore(id: string) {
  return await db.delete(artistStores).where(eq(artistStores.id, id)).returning();
}
