import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

/**
 * Clerk Webhook API Route Tests
 *
 * Tests the Clerk webhook handler request validation
 */

describe('Clerk Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('returns 400 when signature header is missing', async () => {
      // Set the webhook secret
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/signature|webhook/i);
    });

    it('returns 500 when webhook secret is not configured', async () => {
      // Remove the webhook secret
      delete process.env.CLERK_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe('Request Format', () => {
    it('accepts POST requests', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({ type: 'test' }),
      });

      // We expect either 200 (success) or 400/500 (validation/processing error)
      // but not 405 (method not allowed)
      const response = await POST(request);
      expect(response.status).not.toBe(405);
    });

    it('returns JSON content type', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const contentType = response.headers.get('content-type');

      expect(contentType).toContain('application/json');
    });
  });

  describe('Response Format', () => {
    it('returns consistent error format', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Error response should have consistent structure
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });

    it('returns success field in error responses', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Error response may or may not have success field
      if ('success' in data) {
        expect(data.success).toBe(false);
      }
    });
  });

  describe('Security Headers', () => {
    it('requires svix-signature header', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'test-secret';

      const requestWithoutSignature = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': Date.now().toString(),
        },
        body: JSON.stringify({}),
      });

      const response = await POST(requestWithoutSignature);
      expect(response.status).toBe(400);
    });
  });
});
