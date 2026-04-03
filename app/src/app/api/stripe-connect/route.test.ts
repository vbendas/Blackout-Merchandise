import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const stripeAccountsCreateMock = vi.fn();
const stripeAccountLinksCreateMock = vi.fn();
const stripeAccountsRetrieveMock = vi.fn();
const stripeTransfersCreateMock = vi.fn();

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
  users: {
    id: 'users.id',
    email: 'users.email',
    stripeConnectId: 'users.stripeConnectId',
  },
}));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      accounts = {
        create: stripeAccountsCreateMock,
        retrieve: stripeAccountsRetrieveMock,
      };
      accountLinks = {
        create: stripeAccountLinksCreateMock,
      };
      transfers = {
        create: stripeTransfersCreateMock,
      };
    },
  };
});

describe('Stripe Connect API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test_stripe_key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  describe('POST - create-onboarding-link', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'create-onboarding-link', userId: 'user_123' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 when userId does not match authenticated user', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'create-onboarding-link', userId: 'different_user' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 when userId is missing', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'create-onboarding-link' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('successfully creates onboarding link for authenticated user', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });
      mockSelect.mockResolvedValueOnce([{ id: 'user_123', email: 'test@example.com' }]);

      stripeAccountsCreateMock.mockResolvedValueOnce({ id: 'acct_123' });
      stripeAccountLinksCreateMock.mockResolvedValueOnce({ url: 'https://connect.stripe.com/setup/s123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'create-onboarding-link', userId: 'user_123' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.url).toBe('https://connect.stripe.com/setup/s123');
    });
  });

  describe('POST - get-onboarding-status', () => {
    it('returns 403 when userId does not match authenticated user', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'get-onboarding-status', userId: 'different_user' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns not_connected when user has no Stripe Connect ID', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });
      mockSelect.mockResolvedValueOnce([{ stripeConnectId: null }]);

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'get-onboarding-status', userId: 'user_123' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('not_connected');
    });

    it('returns account status when connected', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });
      mockSelect.mockResolvedValueOnce([{ stripeConnectId: 'acct_123' }]);
      stripeAccountsRetrieveMock.mockResolvedValueOnce({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'get-onboarding-status', userId: 'user_123' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('active');
    });
  });

  describe('POST - create-transfer', () => {
    it('returns 403 when artistUserId does not match authenticated user', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-transfer',
          artistUserId: 'different_user',
          amount: 1000,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 when required fields are missing', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'create-transfer' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 when artist has no Stripe Connect ID', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });
      mockSelect.mockResolvedValueOnce([{ stripeConnectId: null }]);

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-transfer',
          artistUserId: 'user_123',
          amount: 1000,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Artist not connected to Stripe');
    });

    it('successfully creates transfer', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user_123' });
      mockSelect.mockResolvedValueOnce([{ stripeConnectId: 'acct_123' }]);
      stripeTransfersCreateMock.mockResolvedValueOnce({ id: 'tr_123' });

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-transfer',
          artistUserId: 'user_123',
          amount: 1000,
          orderId: 'order_123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.transferId).toBe('tr_123');
    });
  });

  describe('POST - calculate-split', () => {
    it('returns 400 when totalAmount is missing', async () => {
      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'calculate-split' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('correctly calculates platform fee and artist amount', async () => {
      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({
          action: 'calculate-split',
          totalAmount: 1000,
          platformFeePercent: 20,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.total).toBe(1000);
      expect(body.platformFee).toBe(200);
      expect(body.artistAmount).toBe(800);
    });

    it('uses default 20% platform fee when not specified', async () => {
      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({
          action: 'calculate-split',
          totalAmount: 1000,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.platformFee).toBe(200);
      expect(body.artistAmount).toBe(800);
    });
  });

  describe('POST - invalid action', () => {
    it('returns 400 for unknown action', async () => {
      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/stripe-connect', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid-action' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
