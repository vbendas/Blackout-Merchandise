import { getAuth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { artistStores, consents, dataSubjectRequests, orders, products, users } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

async function getUserDataHandler(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  console.log(`[${requestId}] Data Rights - Access request at ${timestamp}`);

  try {
    const { userId } = getAuth(request);

    if (!userId) {
      console.log(`[${requestId}] Unauthorized access attempt`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userData[0];

    const userStores = await db.select().from(artistStores).where(eq(artistStores.artistId, user.id));

    const storeIds = userStores.map((s) => s.id);

    let userProducts: (typeof products.$inferSelect)[] = [];
    let userOrders: (typeof orders.$inferSelect)[] = [];

    if (storeIds.length > 0) {
      userProducts = await db.select().from(products).where(eq(products.storeId, storeIds[0]));

      userOrders = await db.select().from(orders).where(eq(orders.customerId, user.id));
    }

    const userConsents = await db.select().from(consents).where(eq(consents.userId, user.id));

    const response = {
      success: true,
      data: {
        personalInfo: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          stripeCustomerId: user.stripeCustomerId,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        stores: userStores.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          isLive: s.isLive,
          themeConfig: s.themeConfig,
          createdAt: s.createdAt,
        })),
        products: userProducts.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          baseCost: p.baseCost,
          retailPrice: p.retailPrice,
          isActive: p.isActive,
          createdAt: p.createdAt,
        })),
        orders: userOrders.map((o) => ({
          id: o.id,
          status: o.status,
          totalAmount: o.totalAmount,
          shippingAddress: o.shippingAddress,
          createdAt: o.createdAt,
        })),
        consents: userConsents.map((c) => ({
          type: c.consentType,
          granted: c.granted,
          method: c.method,
          grantedAt: c.grantedAt,
          withdrawnAt: c.withdrawnAt,
        })),
      },
      metadata: {
        requestId,
        timestamp,
        requestType: 'access',
      },
    };

    await db.insert(dataSubjectRequests).values({
      userId: user.id,
      requestType: 'access',
      status: 'completed',
    });

    console.log(`[${requestId}] Access request completed for user ${userId}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`[${requestId}] Access request failed:`, error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getUserDataHandler, 'strict');
