import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

interface CheckoutItem {
  productId: string;
  quantity: number;
  price: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, userId, storeId, successUrl, cancelUrl } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: CheckoutItem) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Product ${item.productId}`,
          metadata: {
            productId: item.productId,
          },
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/checkout/cancel`,
      metadata: {
        userId,
        storeId: storeId || '',
        items: JSON.stringify(
          items.map((item: CheckoutItem) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          }))
        ),
      },
      shipping_address_collection: {
        allowed_countries: ['PT', 'ES', 'FR', 'DE', 'NL', 'BE'],
      },
      billing_address_collection: 'required',
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
