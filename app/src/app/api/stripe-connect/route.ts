import { auth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { users } from '@db-root/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, returnUrl } = body;

    switch (action) {
      case 'create-onboarding-link': {
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Verify the authenticated user matches the requested userId
        if (userId !== authUserId) {
          return NextResponse.json(
            { error: 'Forbidden: You can only create onboarding links for yourself' },
            { status: 403 }
          );
        }

        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (user.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const account = await stripe.accounts.create({
          type: 'express',
          country: 'PT',
          email: user[0].email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        await db.update(users).set({ stripeConnectId: account.id }).where(eq(users.id, userId));

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts?refresh=true`,
          return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts`,
          type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
      }

      case 'get-onboarding-status': {
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Verify the authenticated user matches the requested userId
        if (userId !== authUserId) {
          return NextResponse.json(
            { error: 'Forbidden: You can only check your own onboarding status' },
            { status: 403 }
          );
        }

        const user = await db
          .select({ stripeConnectId: users.stripeConnectId })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user[0]?.stripeConnectId) {
          return NextResponse.json({ status: 'not_connected' });
        }

        const account = await stripe.accounts.retrieve(user[0].stripeConnectId);

        return NextResponse.json({
          status: account.charges_enabled ? 'active' : 'pending',
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });
      }

      case 'create-transfer': {
        const { amount, artistUserId, orderId } = body;

        if (!artistUserId || !amount) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Transfers should only be initiated by the platform (or admin), not arbitrary users
        // For now, we require the authenticated user to match the artistUserId or be an admin
        // In production, this would check for platform admin role
        if (artistUserId !== authUserId) {
          return NextResponse.json({ error: 'Forbidden: You can only create transfers for yourself' }, { status: 403 });
        }

        const artist = await db
          .select({ stripeConnectId: users.stripeConnectId })
          .from(users)
          .where(eq(users.id, artistUserId))
          .limit(1);

        if (!artist[0]?.stripeConnectId) {
          return NextResponse.json({ error: 'Artist not connected to Stripe' }, { status: 400 });
        }

        const transfer = await stripe.transfers.create({
          amount: Math.round(amount),
          currency: 'eur',
          destination: artist[0].stripeConnectId,
          metadata: {
            orderId: orderId || '',
          },
        });

        return NextResponse.json({ transferId: transfer.id });
      }

      case 'calculate-split': {
        const { totalAmount, platformFeePercent = 20 } = body;

        if (!totalAmount) {
          return NextResponse.json({ error: 'Total amount required' }, { status: 400 });
        }

        const platformFee = Math.round(totalAmount * (platformFeePercent / 100));
        const artistAmount = totalAmount - platformFee;

        return NextResponse.json({
          total: totalAmount,
          platformFee,
          artistAmount,
          platformFeePercent,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json({ error: 'Stripe operation failed' }, { status: 500 });
  }
}
