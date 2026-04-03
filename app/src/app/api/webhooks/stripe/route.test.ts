import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const constructEventMock = vi.fn();
const transactionMock = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      webhooks = {
        constructEvent: constructEventMock,
      };
    },
  };
});

vi.mock('@/db', () => ({
  db: {
    transaction: transactionMock,
  },
}));

describe('Stripe Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test-secret';
    process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 500 when stripe secrets are missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-signature' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it('returns 400 when signature verification fails', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid-signature' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('handles replayed checkout.session.completed idempotently', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_replay',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          amount_total: 2500,
          metadata: {
            userId: 'user_123',
            storeId: 'store_123',
            items: JSON.stringify([{ productId: 'prod_1', quantity: 1, price: 25 }]),
          },
        },
      },
    });
    transactionMock.mockResolvedValueOnce({ id: 'order_123' });
    transactionMock.mockResolvedValueOnce(null);

    const { POST } = await import('./route');
    const firstRequest = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: JSON.stringify({}),
    });
    const secondRequest = new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: JSON.stringify({}),
    });

    const firstResponse = await POST(firstRequest);
    const secondResponse = await POST(secondRequest);
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.success).toBe(true);
    expect(firstBody.orderId).toBe('order_123');
    expect(secondResponse.status).toBe(200);
    expect(secondBody.success).toBe(true);
    expect(secondBody.duplicate).toBe(true);
    expect(transactionMock).toHaveBeenCalledTimes(2);
  });
});
