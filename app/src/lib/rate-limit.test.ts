import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthMock = vi.fn();
const redisMock = {
  zremrangebyscore: vi.fn(),
  zcard: vi.fn(),
  zrange: vi.fn(),
  zadd: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
};

vi.mock('@clerk/nextjs/server', () => ({
  getAuth: getAuthMock,
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => redisMock,
  },
}));

describe('withRateLimit identity trust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthMock.mockReturnValue({ userId: null });
    redisMock.zremrangebyscore.mockResolvedValue(0);
    redisMock.zcard.mockResolvedValue(0);
    redisMock.zrange.mockResolvedValue([]);
    redisMock.zadd.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);
  });

  it('ignores spoofed x-user-id header when no authenticated identity exists', async () => {
    const { withRateLimit } = await import('./rate-limit');
    const handler = withRateLimit(async () => NextResponse.json({ ok: true }), 'public');
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-user-id': 'spoofed-user',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    const response = await handler(request);
    const keyUsed = redisMock.zremrangebyscore.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(keyUsed).toContain('ratelimit:ratelimit:ip:203.0.113.10');
    expect(keyUsed).not.toContain('spoofed-user');
  });

  it('uses authenticated identity from trusted auth context', async () => {
    getAuthMock.mockReturnValue({ userId: 'auth-user-123' });

    const { withRateLimit } = await import('./rate-limit');
    const handler = withRateLimit(async () => NextResponse.json({ ok: true }), 'public');
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-user-id': 'spoofed-user',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    const response = await handler(request);
    const keyUsed = redisMock.zremrangebyscore.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(keyUsed).toContain('ratelimit:ratelimit:user:auth-user-123');
    expect(keyUsed).not.toContain('spoofed-user');
  });
});
