import { unstable_cache } from 'next/cache';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Public read model for the fan storefront (/[slug]). Every export here is
// wrapped in unstable_cache — Cache Components ('use cache') is not enabled
// in next.config.ts, so unstable_cache is the current, non-deprecated path
// for persisting a cache entry across requests (see next/dist/docs/01-app/
// 03-api-reference/04-functions/unstable_cache.md). Each entry is tagged
// `store:<slug>` so a future publish/unpublish or product edit can call
// revalidateTag to bust exactly one store's cache.

export interface PublicStore {
  id: string;
  slug: string;
  name: string;
  accentColour: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  about: string | null;
  socials: Record<string, string> | null;
}

/** null unless the store exists and is published — the single storefront gate. */
export async function getPublicStore(slug: string): Promise<PublicStore | null> {
  return unstable_cache(
    async () => {
      const rows = await db.select().from(schema.artistStores).where(eq(schema.artistStores.slug, slug)).limit(1);
      const store = rows[0];
      if (!store || !store.isPublished) return null;
      return {
        id: store.id,
        slug: store.slug,
        name: store.name,
        accentColour: store.accentColour,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        about: store.about,
        socials: (store.socials as Record<string, string> | null) ?? null,
      };
    },
    ['public-store', slug],
    { revalidate: 60, tags: [`store:${slug}`] },
  )();
}

export interface PublicCollection {
  id: string;
  name: string;
  slug: string;
}

export async function listCollections(storeId: string, slug: string): Promise<PublicCollection[]> {
  return unstable_cache(
    async () => {
      const rows = await db
        .select({ id: schema.collections.id, name: schema.collections.name, slug: schema.collections.slug })
        .from(schema.collections)
        .where(and(eq(schema.collections.storeId, storeId), eq(schema.collections.isVisible, true)))
        .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name));
      return rows;
    },
    ['public-collections', storeId],
    { revalidate: 60, tags: [`store:${slug}`] },
  )();
}

export interface PublicProductListItem {
  id: string;
  name: string;
  retailPriceCents: number | null;
  imageUrl: string | null;
  /** a second colourway's mockup, if any — used for the grid hover swap */
  secondImageUrl: string | null;
  collectionSlug: string | null;
}

export async function listLiveProducts(
  storeId: string,
  slug: string,
  collectionSlug?: string,
): Promise<PublicProductListItem[]> {
  return unstable_cache(
    async () => {
      const conditions = [eq(schema.products.storeId, storeId), eq(schema.products.status, 'live')];

      let collectionId: string | null = null;
      if (collectionSlug) {
        const collectionRows = await db
          .select({ id: schema.collections.id })
          .from(schema.collections)
          .where(and(eq(schema.collections.storeId, storeId), eq(schema.collections.slug, collectionSlug)))
          .limit(1);
        collectionId = collectionRows[0]?.id ?? null;
        if (!collectionId) return [];
        conditions.push(eq(schema.products.collectionId, collectionId));
      }

      const rows = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          retailPriceCents: schema.products.retailPriceCents,
          collectionSlug: schema.collections.slug,
        })
        .from(schema.products)
        .leftJoin(schema.collections, eq(schema.products.collectionId, schema.collections.id))
        .where(and(...conditions))
        .orderBy(asc(schema.products.sortOrder), asc(schema.products.createdAt));

      if (rows.length === 0) return [];

      const colourRows = await db
        .select({
          productId: schema.productColours.productId,
          mockupUrl: schema.productColours.mockupUrl,
          blankFront: schema.blankColours.frontImageUrl,
          displayOrder: schema.colours.displayOrder,
        })
        .from(schema.productColours)
        .innerJoin(schema.colours, eq(schema.productColours.colourCode, schema.colours.code))
        .leftJoin(
          schema.products,
          eq(schema.products.id, schema.productColours.productId),
        )
        .leftJoin(
          schema.blankColours,
          and(
            eq(schema.blankColours.blankCode, schema.products.blankCode),
            eq(schema.blankColours.colourCode, schema.productColours.colourCode),
          ),
        )
        .where(inArray(schema.productColours.productId, rows.map((r) => r.id)))
        .orderBy(asc(schema.colours.displayOrder));

      const imagesByProduct = new Map<string, string[]>();
      for (const c of colourRows) {
        const url = c.mockupUrl ?? c.blankFront ?? null;
        if (!url) continue;
        const list = imagesByProduct.get(c.productId) ?? [];
        if (!list.includes(url)) list.push(url);
        imagesByProduct.set(c.productId, list);
      }

      return rows.map((r) => {
        const images = imagesByProduct.get(r.id) ?? [];
        return {
          id: r.id,
          name: r.name,
          retailPriceCents: r.retailPriceCents,
          imageUrl: images[0] ?? null,
          secondImageUrl: images[1] ?? null,
          collectionSlug: r.collectionSlug,
        };
      });
    },
    ['public-live-products', storeId, collectionSlug ?? ''],
    { revalidate: 60, tags: [`store:${slug}`] },
  )();
}

export interface PublicProductColour {
  code: string;
  name: string;
  hex: string;
  mockupUrl: string | null;
  backMockupUrl: string | null;
}

export interface PublicProductDetail {
  id: string;
  name: string;
  description: string | null;
  retailPriceCents: number | null;
  colours: PublicProductColour[];
  sizes: string[];
  printServiceName: string;
  blank: {
    code: string;
    name: string;
    supplierName: string | null;
    description: string | null;
    composition: string | null;
    weightGsm: number | null;
    fit: string | null;
    certifications: string[];
  };
  sizeGuide: { unit: string; columns: string[]; rows: { size: string; values: string[] }[] } | null;
}

export async function getPublicProduct(
  storeId: string,
  slug: string,
  productId: string,
): Promise<PublicProductDetail | null> {
  return unstable_cache(
    async () => {
      const rows = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          description: schema.products.description,
          retailPriceCents: schema.products.retailPriceCents,
          blankCode: schema.products.blankCode,
          blankName: schema.blanks.name,
          blankSupplierName: schema.blanks.supplierName,
          blankDescription: schema.blanks.description,
          composition: schema.blanks.composition,
          weightGsm: schema.blanks.weightGsm,
          fit: schema.blanks.fit,
          certifications: schema.blanks.certifications,
          printServiceName: schema.printServices.name,
        })
        .from(schema.products)
        .innerJoin(schema.blanks, eq(schema.products.blankCode, schema.blanks.code))
        .innerJoin(schema.printServices, eq(schema.products.printServiceCode, schema.printServices.code))
        .where(
          and(
            eq(schema.products.id, productId),
            eq(schema.products.storeId, storeId),
            eq(schema.products.status, 'live'),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      const [colourRows, sizeRows, sizeGuideRows] = await Promise.all([
        db
          .select({
            code: schema.colours.code,
            name: schema.colours.name,
            hex: schema.colours.hex,
            mockupUrl: schema.productColours.mockupUrl,
            blankFront: schema.blankColours.frontImageUrl,
            blankBack: schema.blankColours.backImageUrl,
            displayOrder: schema.colours.displayOrder,
          })
          .from(schema.productColours)
          .innerJoin(schema.colours, eq(schema.productColours.colourCode, schema.colours.code))
          .leftJoin(
            schema.blankColours,
            and(
              eq(schema.blankColours.blankCode, row.blankCode),
              eq(schema.blankColours.colourCode, schema.productColours.colourCode),
            ),
          )
          .where(eq(schema.productColours.productId, productId))
          .orderBy(asc(schema.colours.displayOrder)),
        db
          .select({ size: schema.productSizes.size })
          .from(schema.productSizes)
          .where(eq(schema.productSizes.productId, productId)),
        db.select().from(schema.sizeGuides).where(eq(schema.sizeGuides.blankCode, row.blankCode)).limit(1),
      ]);

      const guide = sizeGuideRows[0];

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        retailPriceCents: row.retailPriceCents,
        colours: colourRows.map((c) => ({
          code: c.code,
          name: c.name,
          hex: c.hex ?? '#000000',
          mockupUrl: c.mockupUrl ?? c.blankFront ?? null,
          backMockupUrl: c.blankBack ?? null,
        })),
        sizes: sizeRows.map((s) => s.size),
        printServiceName: row.printServiceName,
        blank: {
          code: row.blankCode,
          name: row.blankName,
          supplierName: row.blankSupplierName,
          description: row.blankDescription,
          composition: row.composition,
          weightGsm: row.weightGsm,
          fit: row.fit,
          certifications: (row.certifications as string[] | null) ?? [],
        },
        sizeGuide: guide
          ? {
              unit: guide.unit ?? 'cm',
              columns: (guide.columns as string[] | null) ?? [],
              rows: (guide.rows as { size: string; values: string[] }[] | null) ?? [],
            }
          : null,
      };
    },
    ['public-product', storeId, productId],
    { revalidate: 60, tags: [`store:${slug}`] },
  )();
}
