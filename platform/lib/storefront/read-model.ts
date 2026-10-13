import { unstable_cache } from 'next/cache';
import { and, asc, eq, exists, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { blankFactsLine } from '@/lib/catalog/blank-facts';
import { fanProductName } from '@/lib/storefront/fan-names';
import { buildSpecLine, sortSizes } from '@/lib/storefront/present';

// Public read model for the fan storefront (/[slug]). Every export here is
// wrapped in unstable_cache — Cache Components ('use cache') is not enabled
// in next.config.ts, so unstable_cache is the current, non-deprecated path
// for persisting a cache entry across requests (see next/dist/docs/01-app/
// 03-api-reference/04-functions/unstable_cache.md). Each entry is tagged
// `store:<slug>` so a future publish/unpublish or product edit can call
// revalidateTag to bust exactly one store's cache.
//
// Nothing here returns supplier fields (model names, style codes): the shop's
// client components receive these objects whole, so what fans must not see is
// dropped on the server.

// Part of the cache key of the product entries. Bump it when the shape of a
// cached value changes, so a stale entry in the data cache is never read as
// the new shape.
const SHAPE = 'v2';

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

/** Shop sections: visible collections with at least one live product. Private
 * ones (Studio sidebar projects) and empty ones never reach fans. */
export async function listCollections(storeId: string, slug: string): Promise<PublicCollection[]> {
  return unstable_cache(
    async () => {
      const liveProductInCollection = db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.collectionId, schema.collections.id),
            eq(schema.products.storeId, storeId),
            eq(schema.products.status, 'live'),
          ),
        );
      const rows = await db
        .select({ id: schema.collections.id, name: schema.collections.name, slug: schema.collections.slug })
        .from(schema.collections)
        .where(
          and(
            eq(schema.collections.storeId, storeId),
            eq(schema.collections.isVisible, true),
            exists(liveProductInCollection),
          ),
        )
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
  /** 'Black · 100% organic cotton · 350 g · S–XXL', the small line under the piece */
  specLine: string | null;
}

/** Every live product of the shop, in shop order. Each carries its
 * collection's slug, so a collection filter is a plain filter over this list
 * (validated against listCollections by the caller). */
export async function listLiveProducts(storeId: string, slug: string): Promise<PublicProductListItem[]> {
  return unstable_cache(
    async () => {
      const rows = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          retailPriceCents: schema.products.retailPriceCents,
          collectionSlug: schema.collections.slug,
          blankCode: schema.products.blankCode,
          blankName: schema.blanks.name,
          blankSupplierName: schema.blanks.supplierName,
        })
        .from(schema.products)
        .innerJoin(schema.blanks, eq(schema.products.blankCode, schema.blanks.code))
        .leftJoin(schema.collections, eq(schema.products.collectionId, schema.collections.id))
        .where(and(eq(schema.products.storeId, storeId), eq(schema.products.status, 'live')))
        .orderBy(asc(schema.products.sortOrder), asc(schema.products.createdAt));

      if (rows.length === 0) return [];
      const productIds = rows.map((r) => r.id);

      const [colourRows, sizeRows] = await Promise.all([
        db
          .select({
            productId: schema.productColours.productId,
            colourName: schema.colours.name,
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
          .where(inArray(schema.productColours.productId, productIds))
          .orderBy(asc(schema.colours.displayOrder)),
        db
          .select({ productId: schema.productSizes.productId, size: schema.productSizes.size })
          .from(schema.productSizes)
          .where(inArray(schema.productSizes.productId, productIds)),
      ]);

      const imagesByProduct = new Map<string, string[]>();
      const coloursByProduct = new Map<string, string[]>();
      for (const c of colourRows) {
        const names = coloursByProduct.get(c.productId) ?? [];
        if (!names.includes(c.colourName)) names.push(c.colourName);
        coloursByProduct.set(c.productId, names);

        const url = c.mockupUrl ?? c.blankFront ?? null;
        if (!url) continue;
        const list = imagesByProduct.get(c.productId) ?? [];
        if (!list.includes(url)) list.push(url);
        imagesByProduct.set(c.productId, list);
      }

      const sizesByProduct = new Map<string, string[]>();
      for (const s of sizeRows) {
        const list = sizesByProduct.get(s.productId) ?? [];
        list.push(s.size);
        sizesByProduct.set(s.productId, list);
      }

      return rows.map((r) => {
        const images = imagesByProduct.get(r.id) ?? [];
        return {
          id: r.id,
          name: fanProductName(r.name, { code: r.blankCode, name: r.blankName, supplierName: r.blankSupplierName }),
          retailPriceCents: r.retailPriceCents,
          imageUrl: images[0] ?? null,
          secondImageUrl: images[1] ?? null,
          collectionSlug: r.collectionSlug,
          specLine: buildSpecLine({
            colours: coloursByProduct.get(r.id) ?? [],
            facts: blankFactsLine(r.blankCode),
            sizes: sizesByProduct.get(r.id) ?? [],
          }),
        };
      });
    },
    ['public-live-products', SHAPE, storeId],
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
  /** small to large */
  sizes: string[];
  printServiceName: string;
  /** The garment as fans read about it: a display name and its facts, never
   * the supplier's model name or style code. */
  garment: {
    name: string;
    /** '100% organic cotton · 350 g · relaxed fit' */
    facts: string | null;
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
        name: fanProductName(row.name, { code: row.blankCode, name: row.blankName, supplierName: row.blankSupplierName }),
        description: row.description,
        retailPriceCents: row.retailPriceCents,
        colours: colourRows.map((c) => ({
          code: c.code,
          name: c.name,
          hex: c.hex ?? '#000000',
          mockupUrl: c.mockupUrl ?? c.blankFront ?? null,
          backMockupUrl: c.blankBack ?? null,
        })),
        sizes: sortSizes(sizeRows.map((s) => s.size)),
        printServiceName: row.printServiceName,
        garment: {
          name: blankDisplayName(row.blankCode, row.blankName),
          facts: blankFactsLine(row.blankCode),
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
    ['public-product', SHAPE, storeId, productId],
    { revalidate: 60, tags: [`store:${slug}`] },
  )();
}
