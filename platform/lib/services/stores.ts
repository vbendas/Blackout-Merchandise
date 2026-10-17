import { and, eq, ne } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { shopUrl } from '@/lib/format/shop-url';
import { RESERVED_SLUGS } from '@/lib/services/registration';

export type ArtistStore = typeof schema.artistStores.$inferSelect;

export async function getStore(storeId: string): Promise<ArtistStore | null> {
  const rows = await db.select().from(schema.artistStores).where(eq(schema.artistStores.id, storeId)).limit(1);
  return rows[0] ?? null;
}

async function isSlugAvailableForStore(slug: string, storeId: string): Promise<boolean> {
  const normalised = slug.trim().toLowerCase();
  if (!normalised || RESERVED_SLUGS.has(normalised)) return false;
  const rows = await db
    .select({ id: schema.artistStores.id })
    .from(schema.artistStores)
    .where(and(eq(schema.artistStores.slug, normalised), ne(schema.artistStores.id, storeId)))
    .limit(1);
  return rows.length === 0;
}

export interface UpdateStorePatch {
  name?: string;
  slug?: string;
  accentColour?: string;
  about?: string;
  socials?: Record<string, string>;
}

export type UpdateStoreResult =
  | { ok: true; store: ArtistStore }
  | { ok: false; error: 'not_found' | 'slug_taken' };

export async function updateStore(storeId: string, patch: UpdateStorePatch): Promise<UpdateStoreResult> {
  const existing = await getStore(storeId);
  if (!existing) return { ok: false, error: 'not_found' };

  if (patch.slug && patch.slug.toLowerCase() !== existing.slug) {
    const available = await isSlugAvailableForStore(patch.slug, storeId);
    if (!available) return { ok: false, error: 'slug_taken' };
  }

  const [updated] = await db
    .update(schema.artistStores)
    .set({
      name: patch.name ?? existing.name,
      slug: patch.slug ? patch.slug.trim().toLowerCase() : existing.slug,
      accentColour: patch.accentColour ?? existing.accentColour,
      about: patch.about ?? existing.about,
      socials: patch.socials ?? existing.socials,
      updatedAt: new Date(),
    })
    .where(eq(schema.artistStores.id, storeId))
    .returning();

  return { ok: true, store: updated };
}

/** The artist's choice for the website's "On the press" board: on, what is printed for their shop (runs and shop orders)
 * shows the shop's name there beside the piece, the quantity, the ink and the stage; off (the default), it reads
 * "Private". Scoped to the shop, which the caller takes from the session. False when there is no such shop. */
export async function setPressBoardOptIn(storeId: string, show: boolean): Promise<boolean> {
  const updated = await db
    .update(schema.artistStores)
    .set({ showOnPressBoard: show === true, updatedAt: new Date() })
    .where(eq(schema.artistStores.id, storeId))
    .returning({ id: schema.artistStores.id });
  return updated.length > 0;
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  accentColour: string | null;
  logoUrl: string | null;
  liveProducts: number;
  totalProducts: number;
  stripeReady: boolean;
  hasAnyProduct: boolean;
}

export async function storeSummary(storeId: string): Promise<StoreSummary | null> {
  const store = await getStore(storeId);
  if (!store) return null;

  const [products, stripeRows] = await Promise.all([
    db.select({ status: schema.products.status }).from(schema.products).where(eq(schema.products.storeId, storeId)),
    db
      .select({ chargesEnabled: schema.stripeAccounts.chargesEnabled, payoutsEnabled: schema.stripeAccounts.payoutsEnabled })
      .from(schema.stripeAccounts)
      .where(eq(schema.stripeAccounts.storeId, storeId))
      .limit(1),
  ]);

  const stripe = stripeRows[0];
  const liveProducts = products.filter((p) => p.status === 'live').length;

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    isPublished: store.isPublished,
    accentColour: store.accentColour,
    logoUrl: store.logoUrl,
    liveProducts,
    totalProducts: products.length,
    stripeReady: !!stripe?.chargesEnabled && !!stripe?.payoutsEnabled,
    hasAnyProduct: products.length > 0,
  };
}

export function storeUrl(slug: string): string {
  return shopUrl(slug);
}
