import { db } from '@db-root/index';
import { artistStores, products, shopCustomizations } from '@db-root/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const shops = await db
      .select({
        id: artistStores.id,
        slug: artistStores.slug,
        name: artistStores.name,
        sliderImages: shopCustomizations.sliderImages,
      })
      .from(artistStores)
      .leftJoin(shopCustomizations, eq(artistStores.id, shopCustomizations.storeId))
      .where(eq(artistStores.isLive, true));

    const shopsWithCount = await Promise.all(
      shops.map(async (shop) => {
        const productCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(eq(products.storeId, shop.id));

        const sliderImages = shop.sliderImages as string[] | undefined;

        return {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          coverImage: sliderImages?.[0] || null,
          productCount: productCount[0]?.count || 0,
        };
      })
    );

    return NextResponse.json({ shops: shopsWithCount });
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}
