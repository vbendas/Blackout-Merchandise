import { db } from '@db-root/index';
import { orderItems, orders, processedWebhookEvents } from '@db-root/schema';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { reserveInventory } from '@db-root/catalog';

export const dynamic = 'force-dynamic';

const checkoutMetadataSchema = z.object({
  userId: z.string().min(1),
  storeId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().min(1).optional(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe secrets are not configured' }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const payload = await request.text();

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      let metadataItems: unknown[] = [];
      try {
        metadataItems = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
      } catch (parseError) {
        console.error('Failed to parse checkout metadata items:', parseError);
        return NextResponse.json({ error: 'Invalid checkout metadata JSON' }, { status: 400 });
      }
      const metadataValidation = checkoutMetadataSchema.safeParse({
        userId: session.metadata?.userId,
        storeId: session.metadata?.storeId,
        items: metadataItems,
      });

      if (!metadataValidation.success) {
        return NextResponse.json({ error: 'Invalid checkout metadata' }, { status: 400 });
      }

      const { userId, storeId, items } = metadataValidation.data;
      const totalAmount = session.amount_total ?? 0;

      const createdOrder = await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: processedWebhookEvents.id })
          .from(processedWebhookEvents)
          .where(and(eq(processedWebhookEvents.provider, 'stripe'), eq(processedWebhookEvents.eventId, event.id)))
          .limit(1);

        if (existing.length > 0) {
          return null;
        }

        const [order] = await tx
          .insert(orders)
          .values({
            customerId: userId,
            storeId,
            status: 'paid',
            totalAmount,
            stripePaymentIntentId: session.payment_intent as string,
          })
          .returning();

        for (const item of items) {
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            priceAtPurchase: Math.round(item.price * 100),
          });

          // Reserve stock if variantId is provided
          if (item.variantId) {
            await reserveInventory(item.variantId, item.quantity);
          }
        }

        await tx.insert(processedWebhookEvents).values({
          provider: 'stripe',
          eventId: event.id,
          objectId: session.id,
        });

        return order;
      });

      if (!createdOrder) {
        return NextResponse.json({ success: true, duplicate: true, eventId: event.id });
      }

      return NextResponse.json({ success: true, orderId: createdOrder.id, eventId: event.id });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return NextResponse.json({ success: true, duplicate: true, eventId: event.id });
      }
      return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
    }
  }

  // Handle payment_intent.payment_failed - mark order as cancelled
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    try {
      const result = await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: processedWebhookEvents.id })
          .from(processedWebhookEvents)
          .where(and(eq(processedWebhookEvents.provider, 'stripe'), eq(processedWebhookEvents.eventId, event.id)))
          .limit(1);

        if (existing.length > 0) {
          return { duplicate: true };
        }

        const updated = await tx
          .update(orders)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
          .returning({ id: orders.id });

        await tx.insert(processedWebhookEvents).values({
          provider: 'stripe',
          eventId: event.id,
          objectId: paymentIntent.id,
        });

        return { orderId: updated[0]?.id ?? null };
      });

      if (result.duplicate) {
        return NextResponse.json({ success: true, duplicate: true, eventId: event.id });
      }

      if (!result.orderId) {
        return NextResponse.json({ success: true, orderNotFound: true, eventId: event.id });
      }

      return NextResponse.json({ success: true, orderId: result.orderId, eventId: event.id });
    } catch (error) {
      console.error('Payment failure handling error:', error);
      return NextResponse.json({ error: 'Payment failure handling failed' }, { status: 500 });
    }
  }

  // Handle charge.refunded - mark order as refunded/cancelled
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;

    if (!charge.payment_intent) {
      return NextResponse.json({ success: true, noPaymentIntent: true, eventId: event.id });
    }

    try {
      const result = await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: processedWebhookEvents.id })
          .from(processedWebhookEvents)
          .where(and(eq(processedWebhookEvents.provider, 'stripe'), eq(processedWebhookEvents.eventId, event.id)))
          .limit(1);

        if (existing.length > 0) {
          return { duplicate: true };
        }

        const updated = await tx
          .update(orders)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(orders.stripePaymentIntentId, charge.payment_intent as string))
          .returning({ id: orders.id });

        await tx.insert(processedWebhookEvents).values({
          provider: 'stripe',
          eventId: event.id,
          objectId: charge.id,
        });

        return { orderId: updated[0]?.id ?? null };
      });

      if (result.duplicate) {
        return NextResponse.json({ success: true, duplicate: true, eventId: event.id });
      }

      if (!result.orderId) {
        return NextResponse.json({ success: true, orderNotFound: true, eventId: event.id });
      }

      return NextResponse.json({ success: true, orderId: result.orderId, refunded: true, eventId: event.id });
    } catch (error) {
      console.error('Refund handling error:', error);
      return NextResponse.json({ error: 'Refund handling failed' }, { status: 500 });
    }
  }

  // Handle account.updated - Connect onboarding status changes
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;

    try {
      await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: processedWebhookEvents.id })
          .from(processedWebhookEvents)
          .where(and(eq(processedWebhookEvents.provider, 'stripe'), eq(processedWebhookEvents.eventId, event.id)))
          .limit(1);

        if (existing.length > 0) {
          return { duplicate: true };
        }

        await tx.insert(processedWebhookEvents).values({
          provider: 'stripe',
          eventId: event.id,
          objectId: account.id,
        });

        return { success: true };
      });

      // Log the status for monitoring — future enhancement: update user stripeConnectStatus column
      console.log(`Stripe Connect account updated: ${account.id}`, {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });

      return NextResponse.json({ success: true, accountId: account.id, eventId: event.id });
    } catch (error) {
      console.error('Account update handling error:', error);
      return NextResponse.json({ error: 'Account update handling failed' }, { status: 500 });
    }
  }

  // Handle payout.paid - artist payout confirmation
  if (event.type === 'payout.paid') {
    const payout = event.data.object as Stripe.Payout;

    try {
      await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: processedWebhookEvents.id })
          .from(processedWebhookEvents)
          .where(and(eq(processedWebhookEvents.provider, 'stripe'), eq(processedWebhookEvents.eventId, event.id)))
          .limit(1);

        if (existing.length > 0) {
          return { duplicate: true };
        }

        await tx.insert(processedWebhookEvents).values({
          provider: 'stripe',
          eventId: event.id,
          objectId: payout.id,
        });

        return { success: true };
      });

      // Log the payout for audit trail — future enhancement: notify artist via email
      console.log(`Stripe payout confirmed: ${payout.id}`, {
        amount: payout.amount,
        currency: payout.currency,
        arrivalDate: payout.arrival_date,
      });

      return NextResponse.json({ success: true, payoutId: payout.id, eventId: event.id });
    } catch (error) {
      console.error('Payout handling error:', error);
      return NextResponse.json({ error: 'Payout handling failed' }, { status: 500 });
    }
  }

  // Handle other event types
  return NextResponse.json({ received: true, eventType: event.type });
}
