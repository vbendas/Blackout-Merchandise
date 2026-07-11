import { auth } from '@clerk/nextjs/server';
import { createProduct, getProductsByStore } from '@db-root/products';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStoreOwner, resolveUser } from '@/lib/auth/resolve-user';
import { getStoreByArtist } from '@db-root/stores';

export const dynamic = 'force-dynamic';

const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  baseCost: z.number().int().positive(), // cents
  retailPrice: z.number().int().positive(), // cents
  mockupUrl: z.string().url(),
  designFileUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (storeId) {
      // Public catalog view or owner view
      const allProducts = await getProductsByStore(storeId);

      if (!clerkId) {
        // Public: only active products
        return NextResponse.json({ products: allProducts.filter((p) => p.isActive) });
      }

      const user = await resolveUser(clerkId);
      const artistStore = await getStoreByArtist(user.id);
      const ownsStore = artistStore.length > 0 && artistStore[0].id === storeId;

      if (ownsStore || user.role === 'admin') {
        return NextResponse.json({ products: allProducts });
      }

      return NextResponse.json({ products: allProducts.filter((p) => p.isActive) });
    }

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return authenticated user's own products
    const user = await resolveUser(clerkId);
    const artistStore = await getStoreByArtist(user.id);

    if (artistStore.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const userProducts = await getProductsByStore(artistStore[0].id);
    return NextResponse.json({ products: userProducts });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const { store } = await requireStoreOwner(clerkId);

    const body = await request.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { baseCost, retailPrice } = validation.data;

    if (retailPrice < baseCost) {
      return NextResponse.json(
        { error: 'Retail price must be greater than or equal to base cost' },
        { status: 400 }
      );
    }

    const [product] = await createProduct({ ...validation.data, storeId: store.id });

    // Sync to Typesense (non-blocking)
    import('@/lib/typesense/sync').then(({ syncArtistProduct }) => {
      syncArtistProduct(product, { id: store.id, slug: store.slug, name: store.name });
    }).catch(() => {});
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
