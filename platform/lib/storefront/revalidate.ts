import { revalidateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// The storefront read model is cached per store (tag `store:<slug>`). Any
// change that alters what fans see must bust it, or a freshly published shop
// keeps showing "Nothing here yet" for up to a minute.
export async function revalidateStore(storeId: string): Promise<void> {
  try {
    const [store] = await db.select({ slug: schema.artistStores.slug }).from(schema.artistStores).where(eq(schema.artistStores.id, storeId)).limit(1);
    if (store) revalidateTag(`store:${store.slug}`, 'max');
  } catch {
    // Called outside a request scope (scripts): nothing to revalidate.
  }
}
