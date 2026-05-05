import { auth } from '@clerk/nextjs/server';
import {
  getInventoryByVariant,
  getLowStockVariants,
  reserveInventory,
  updateInventory,
} from '@db-root/catalog';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';

export const dynamic = 'force-dynamic';

const reserveSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const updateSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(0),
  reserved: z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');
    const lowStock = searchParams.get('lowStock') === 'true';

    if (lowStock) {
      const threshold = parseInt(searchParams.get('threshold') || '10', 10);
      const variants = await getLowStockVariants(threshold);
      return NextResponse.json({ variants });
    }

    if (variantId) {
      const inventory = await getInventoryByVariant(variantId);
      if (!inventory) {
        return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 });
      }
      return NextResponse.json({ inventory });
    }

    return NextResponse.json({ error: 'Missing variantId or lowStock param' }, { status: 400 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { variantId, quantity, reserved = 0 } = validation.data;
    const inventory = await updateInventory(variantId, quantity, reserved);
    return NextResponse.json({ inventory });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('PATCH /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = reserveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { variantId, quantity } = validation.data;
    const result = await reserveInventory(variantId, quantity);

    if (!result) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 409 });
    }

    return NextResponse.json({ success: true, inventory: result });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to reserve inventory' }, { status: 500 });
  }
}
