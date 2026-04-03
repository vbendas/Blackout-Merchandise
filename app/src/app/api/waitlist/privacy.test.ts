import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: (handler: (request: NextRequest) => Promise<Response>) => handler,
  setCachedWaitlistCount: vi.fn(),
}));

describe('Waitlist GET privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose sensitive waitlist fields in public GET response', async () => {
    selectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: 'wl_123',
              email: 'creator@example.com',
              name: 'Creator',
              position: 42,
              status: 'pending',
              timestamp: new Date().toISOString(),
              notified: false,
              socialLink: 'https://instagram.com/private',
              followerRange: '100k+',
              interviewResponses: { q1: 'private data' },
              source: 'partner-referral',
            },
          ],
        }),
      }),
    });

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/waitlist?email=creator@example.com');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('email');
    expect(body.data).toHaveProperty('name');
    expect(body.data).not.toHaveProperty('socialLink');
    expect(body.data).not.toHaveProperty('followerRange');
    expect(body.data).not.toHaveProperty('interviewResponses');
    expect(body.data).not.toHaveProperty('source');
  });
});
