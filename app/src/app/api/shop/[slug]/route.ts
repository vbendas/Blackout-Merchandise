import { db } from '@db-root/index';
import { artistStores, products, shopCustomizations } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    // Fetch store by slug
    const store = await db.select().from(artistStores).where(eq(artistStores.slug, slug)).limit(1);

    if (!store.length || !store[0].isLive) {
      return NextResponse.json({ error: 'Shop not found or not live' }, { status: 404 });
    }

    const storeData = store[0];

    // Fetch shop customization
    const customization = await db
      .select()
      .from(shopCustomizations)
      .where(eq(shopCustomizations.storeId, storeData.id))
      .limit(1);

    // Fetch active products for this store
    const storeProducts = await db
      .select({
        id: products.id,
        name: products.name,
        retailPrice: products.retailPrice,
        mockupUrl: products.mockupUrl,
      })
      .from(products)
      .where(eq(products.storeId, storeData.id));

    const customData = customization[0] || {
      sliderImages: [],
      backgroundColor: '#0A0A0A',
      textColor: '#FFFFFF',
      aboutText: '',
      socialLinks: {},
    };

    return NextResponse.json({
      id: storeData.id,
      slug: storeData.slug,
      name: storeData.name,
      isLive: storeData.isLive,
      sliderImages: customData.sliderImages || [],
      backgroundColor: customData.backgroundColor,
      textColor: customData.textColor,
      aboutText: customData.aboutText,
      socialLinks: customData.socialLinks,
      products: storeProducts.map((p) => ({
        id: p.id,
        name: p.name,
        retailPrice: p.retailPrice,
        mockupUrl: p.mockupUrl,
      })),
    });
  } catch (error) {
    console.error('Error fetching shop:', error);
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}
