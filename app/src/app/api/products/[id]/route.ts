import { auth } from '@clerk/nextjs/server';
import { getProductById, updateProduct } from '@db-root/products';
import { db } from '@db-root/index';
import { products } from '@db-root/schema';
import { eq } from '@db-root/index';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { getStoreByArtist } from '@db-root/stores';

export const dynamic = 'force-dynamic';

const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  baseCost: z.number().int().positive().optional(),
  retailPrice: z.number().int().positive().optional(),
  mockupUrl: z.string().url().optional(),
  designFileUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productRows = await getProductById(id);

    if (productRows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: productRows[0] });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    const productRows = await getProductById(id);
    if (productRows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productRows[0];

    // Verify ownership: the product's store must belong to the authenticated user
    const artistStore = await getStoreByArtist(user.id);
    const ownsProduct = artistStore.length > 0 && artistStore[0].id === product.storeId;

    if (!ownsProduct && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Enforce margin if both prices are provided
    const finalBaseCost = data.baseCost ?? product.baseCost;
    const finalRetailPrice = data.retailPrice ?? product.retailPrice;
    if (finalRetailPrice < finalBaseCost) {
      return NextResponse.json(
        { error: 'Retail price must be greater than or equal to base cost' },
        { status: 400 }
      );
    }

    const [updated] = await updateProduct(id, { ...data, updatedAt: new Date() });

    // Sync to Typesense (non-blocking)
    const updatedStore = await getStoreByArtist(user.id);
    if (updatedStore.length > 0) {
      import('@/lib/typesense/sync').then(({ syncArtistProduct }) => {
        syncArtistProduct(updated, { id: updatedStore[0].id, slug: updatedStore[0].slug, name: updatedStore[0].name });
      }).catch(() => {});
    }

    return NextResponse.json({ product: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    const productRows = await getProductById(id);
    if (productRows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productRows[0];

    const artistStore = await getStoreByArtist(user.id);
    const ownsProduct = artistStore.length > 0 && artistStore[0].id === product.storeId;

    if (!ownsProduct && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    const [updated] = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    // Deactivate in Typesense (non-blocking)
    import('@/lib/typesense/sync').then(({ deactivateArtistProduct }) => {
      deactivateArtistProduct(id);
    }).catch(() => {});

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
