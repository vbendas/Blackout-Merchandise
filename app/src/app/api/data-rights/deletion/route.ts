import { getAuth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { artistStores, consents, dataSubjectRequests, orders, products, users } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

async function deleteUserDataHandler(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  console.log(`[${requestId}] Data Rights - Deletion request at ${timestamp}`);

  try {
    const { userId } = getAuth(request);

    if (!userId) {
      console.log(`[${requestId}] Unauthorized deletion attempt`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userData[0];

    const userStores = await db.select().from(artistStores).where(eq(artistStores.artistId, user.id));

    const storeIds = userStores.map((s) => s.id);

    if (storeIds.length > 0) {
      await db.delete(products).where(eq(products.storeId, storeIds[0]));
    }

    await db.delete(orders).where(eq(orders.customerId, user.id));

    await db.delete(consents).where(eq(consents.userId, user.id));

    await db.delete(artistStores).where(eq(artistStores.artistId, user.id));

    await db.delete(users).where(eq(users.clerkId, userId));

    await db.insert(dataSubjectRequests).values({
      userId: user.id,
      requestType: 'deletion',
      status: 'completed',
    });

    console.log(`[${requestId}] Deletion request completed for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'User data has been deleted',
      metadata: {
        requestId,
        timestamp,
        requestType: 'deletion',
        deletedData: ['user profile', 'stores', 'products', 'orders', 'consents'],
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Deletion request failed:`, error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const DELETE = withRateLimit(deleteUserDataHandler, 'strict');
