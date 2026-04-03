import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}));

vi.mock('@db-root/index', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

vi.mock('@db-root/schema', () => ({
  orders: {
    id: 'orders.id',
    storeId: 'orders.storeId',
    customerId: 'orders.customerId',
    status: 'orders.status',
    totalAmount: 'orders.totalAmount',
    updatedAt: 'orders.updatedAt',
  },
  artistStores: {
    id: 'artistStores.id',
    artistId: 'artistStores.artistId',
  },
}));

describe('Orders API - PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const { PATCH } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: 'order_123', status: 'shipped' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 when orderId or status is missing', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

    const { PATCH } = await import('./route');

    const requestNoOrderId = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'shipped' }),
    });
    const responseNoOrderId = await PATCH(requestNoOrderId);
    expect(responseNoOrderId.status).toBe(400);

    const requestNoStatus = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: 'order_123' }),
    });
    const responseNoStatus = await PATCH(requestNoStatus);
    expect(responseNoStatus.status).toBe(400);
  });

  it('returns 400 when status is invalid', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

    const { PATCH } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: 'order_123', status: 'invalid_status' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it('returns 403 when user does not have access to order', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

    // Mock order belonging to different user
    mockSelect.mockResolvedValueOnce([
      {
        id: 'order_123',
        storeId: 'store_1',
        customerId: 'different_user',
      },
    ]);

    // Mock store with different artist
    mockSelect.mockResolvedValueOnce([{ artistId: 'different_artist' }]);

    const { PATCH } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: 'order_123', status: 'shipped' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(403);
  });

  it('successfully updates order when user is the customer', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

    // Mock order belonging to user as customer
    mockSelect.mockResolvedValueOnce([
      {
        id: 'order_123',
        storeId: 'store_1',
        customerId: 'user_123',
      },
    ]);

    // Mock successful update
    mockUpdate.mockResolvedValueOnce([
      {
        id: 'order_123',
        status: 'shipped',
        updatedAt: new Date(),
      },
    ]);

    const { PATCH } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: 'order_123', status: 'shipped' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('successfully updates order when user is the store owner', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

    // Mock order belonging to store
    mockSelect.mockResolvedValueOnce([
      {
        id: 'order_123',
        storeId: 'store_1',
        customerId: 'customer_456',
      },
    ]);

    // Mock store with matching artist
    mockSelect.mockResolvedValueOnce([{ artistId: 'user_123' }]);

    // Mock successful update
    mockUpdate.mockResolvedValueOnce([
      {
        id: 'order_123',
        status: 'shipped',
        updatedAt: new Date(),
      },
    ]);

    const { PATCH } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders', {
      method: 'PATCH',
      body: JSON.stringify({ orderId: 'order_123', status: 'shipped' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});

describe('Orders API - GET', () => {
  it('returns orders for authenticated user', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_123' });
    mockSelect.mockResolvedValueOnce([{ id: 'order_1', status: 'paid', totalAmount: 2500 }]);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders?userId=user_123');

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('returns 400 when no query params provided', async () => {
    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/orders');

    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
