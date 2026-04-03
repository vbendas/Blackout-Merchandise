import { beforeEach, describe, expect, it, vi } from 'vitest';

const capturedRoutes: string[][] = [];

vi.mock('@clerk/nextjs/server', () => ({
  createRouteMatcher: (routes: string[]) => {
    capturedRoutes.push(routes);

    return (req: { nextUrl: { pathname: string } }) => {
      const path = req.nextUrl.pathname;
      return routes.some((routePattern) => {
        const prefix = routePattern.replace('(.*)', '');
        if (routePattern.includes('(.*)')) {
          return path.startsWith(prefix);
        }
        return path === prefix;
      });
    };
  },
  clerkMiddleware: (handler: (auth: { protect: () => void }, req: unknown) => void) => handler,
}));

describe('middleware webhook access', () => {
  beforeEach(() => {
    capturedRoutes.length = 0;
    vi.resetModules();
  });

  it('does not include webhook routes in protected matcher list', async () => {
    await import('../middleware');
    const routes = capturedRoutes[0] ?? [];
    expect(routes.some((route) => route.includes('/api/webhooks'))).toBe(false);
  });

  it('allows webhook route without calling auth.protect', async () => {
    const protect = vi.fn();
    const middlewareModule = await import('../middleware');
    const middleware = middlewareModule.default as unknown as (
      auth: { protect: () => void },
      req: { nextUrl: { pathname: string } }
    ) => void;

    middleware({ protect }, { nextUrl: { pathname: '/api/webhooks/stripe' } });
    expect(protect).not.toHaveBeenCalled();
  });

  it('still protects non-webhook protected routes', async () => {
    const protect = vi.fn();
    const middlewareModule = await import('../middleware');
    const middleware = middlewareModule.default as unknown as (
      auth: { protect: () => void },
      req: { nextUrl: { pathname: string } }
    ) => void;

    middleware({ protect }, { nextUrl: { pathname: '/api/checkout/session' } });
    expect(protect).toHaveBeenCalledTimes(1);
  });
});
