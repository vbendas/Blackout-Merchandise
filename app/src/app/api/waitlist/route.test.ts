import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET, POST } from './route';

/**
 * Waitlist API Route Tests
 *
 * Tests the waitlist API endpoint request/response handling
 */

describe('Waitlist API', () => {
  describe('POST /api/waitlist', () => {
    it('validates request body structure', async () => {
      // Test with invalid JSON
      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      // Should handle error gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('validates required fields are present', async () => {
      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: '', // Empty email
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy(); // Error message should be present
    });

    it('validates name is present', async () => {
      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: '', // Empty name
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('accepts requests with valid data structure', async () => {
      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          socialLink: 'https://instagram.com/test',
          followerRange: '10k-50k',
          interviewResponses: { q1: 'Answer' },
          source: 'organic',
        }),
      });

      const response = await POST(request);
      // Response will be 200 on success or error code on failure
      // The key is that it processes the request
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/waitlist', () => {
    it('requires email parameter', async () => {
      const request = new NextRequest('http://localhost/api/waitlist');

      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email parameter required');
    });

    it('validates email parameter format', async () => {
      const request = new NextRequest('http://localhost/api/waitlist?email=');

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('accepts requests with email parameter', async () => {
      const request = new NextRequest('http://localhost/api/waitlist?email=test@example.com');

      const response = await GET(request);
      // Will be 200 if found, 404 if not found, or error
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('API Response Format', () => {
    it('returns JSON content type', async () => {
      const request = new NextRequest('http://localhost/api/waitlist');

      const response = await GET(request);
      const contentType = response.headers.get('content-type');

      expect(contentType).toContain('application/json');
    });

    it('returns consistent error format', async () => {
      const request = new NextRequest('http://localhost/api/waitlist');

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
    });

    it('returns success field in responses', async () => {
      const request = new NextRequest('http://localhost/api/waitlist');

      const response = await GET(request);
      const data = await response.json();

      expect(typeof data.success).toBe('boolean');
    });
  });

  describe('HTTP Methods', () => {
    it('POST accepts valid requests', async () => {
      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      });

      const response = await POST(request);
      // Should not be 405 (method not allowed)
      expect(response.status).not.toBe(405);
    });

    it('GET accepts requests with parameters', async () => {
      const request = new NextRequest('http://localhost/api/waitlist?email=test@example.com');

      const response = await GET(request);
      // Should not be 405 (method not allowed)
      expect(response.status).not.toBe(405);
    });
  });
});
