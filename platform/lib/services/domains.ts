/**
 * Custom-domain service (Platform-Plan §7): an artist points their own
 * domain at Blackout Merchandise, we register it on the Vercel project, hand back the
 * DNS records to add, poll until Vercel reports it verified + configured,
 * then flip `artistStores.customDomain` so the proxy (see proxy.ts) starts
 * rewriting requests for that host to the store's storefront.
 *
 * `resolveStoreSlugForHost` runs on every request in the proxy, which can
 * execute in the edge runtime — it and everything it imports (this module,
 * lib/db.ts, drizzle-orm) must stay HTTP-only, no node-only builtins.
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getVercelGateway, recordsForDomain, VercelApiError, type DnsRecord } from '@/lib/services/vercel';
import { notify } from '@/lib/services/notifications';

export type { DnsRecord };

export type DomainStatus = 'pending' | 'verifying' | 'active' | 'error';

/** Lowercases, strips protocol/path/query/port and punycode-encodes via the
 * WHATWG URL parser. Returns null for anything that isn't a plausible host. */
export function normaliseHostname(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname || !hostname.includes('.') || hostname.includes('..')) return null;
  return hostname;
}

function configuredPlatformHosts(): Set<string> {
  return new Set(
    (process.env.PLATFORM_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase().split(':')[0])
      .filter(Boolean),
  );
}

/** True for Blackout Merchandise's own hosts, localhost, and *.vercel.app preview
 * deployments — none of these can be claimed as an artist's custom domain,
 * and none should be looked up in the custom-domains table by the proxy. */
export function isPlatformHost(hostnameRaw: string): boolean {
  const host = hostnameRaw.toLowerCase().split(':')[0];
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  return configuredPlatformHosts().has(host);
}

// ---------------------------------------------------------------------------
// Host -> store slug cache, used by the proxy on every request
// ---------------------------------------------------------------------------

interface CacheEntry {
  slug: string | null;
  expiresAt: number;
}

const HOST_CACHE_TTL_MS = 60_000;
const hostCache = new Map<string, CacheEntry>();

function invalidateHostCache(hostname: string): void {
  hostCache.delete(hostname.toLowerCase());
}

/** Cached (60s) lookup from a request Host header to the artist store slug
 * it should be rewritten to. Returns null for platform hosts and for any
 * host with no active custom domain. */
export async function resolveStoreSlugForHost(hostnameRaw: string): Promise<string | null> {
  const hostname = hostnameRaw.toLowerCase().split(':')[0];
  if (isPlatformHost(hostname)) return null;

  const cached = hostCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.slug;

  const rows = await db
    .select({ slug: schema.artistStores.slug })
    .from(schema.customDomains)
    .innerJoin(schema.artistStores, eq(schema.artistStores.id, schema.customDomains.storeId))
    .where(and(eq(schema.customDomains.hostname, hostname), eq(schema.customDomains.status, 'active')))
    .limit(1);

  const slug = rows[0]?.slug ?? null;
  hostCache.set(hostname, { slug, expiresAt: Date.now() + HOST_CACHE_TTL_MS });
  return slug;
}

// ---------------------------------------------------------------------------
// Add / check / remove / list
// ---------------------------------------------------------------------------

export type AddDomainOutcome =
  | { ok: true; hostname: string; records: DnsRecord[] }
  | { ok: false; error: 'invalid_hostname' | 'platform_host' | 'already_claimed' | 'vercel_error'; message: string };

/** Registers `hostname` on the Vercel project for `storeId` and returns the
 * DNS records to show the artist. Re-adding the same hostname for the same
 * store refreshes the records instead of failing. */
export async function addCustomDomain(storeId: string, hostnameInput: string): Promise<AddDomainOutcome> {
  const hostname = normaliseHostname(hostnameInput);
  if (!hostname) {
    return { ok: false, error: 'invalid_hostname', message: `"${hostnameInput}" doesn't look like a valid domain.` };
  }
  if (isPlatformHost(hostname)) {
    return { ok: false, error: 'platform_host', message: `${hostname} is a Blackout Merchandise platform host and can't be used as a custom domain.` };
  }

  const existingRows = await db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, hostname)).limit(1);
  const existing = existingRows[0];
  if (existing && existing.storeId !== storeId) {
    return { ok: false, error: 'already_claimed', message: `${hostname} is already connected to another shop.` };
  }

  let added;
  try {
    added = await getVercelGateway().addProjectDomain(hostname);
  } catch (err) {
    const message = err instanceof VercelApiError ? err.message : 'Vercel rejected the domain.';
    return { ok: false, error: 'vercel_error', message };
  }

  if (existing) {
    await db
      .update(schema.customDomains)
      .set({ status: 'pending', vercelDomainId: added.domain.name, verification: added.records })
      .where(eq(schema.customDomains.id, existing.id));
  } else {
    await db.insert(schema.customDomains).values({
      storeId,
      hostname,
      status: 'pending',
      vercelDomainId: added.domain.name,
      verification: added.records,
    });
  }

  invalidateHostCache(hostname);
  return { ok: true, hostname, records: added.records };
}

export type CheckDomainOutcome =
  | { ok: true; status: DomainStatus; hostname: string; message: string; records: DnsRecord[] }
  | { ok: false; error: 'not_found' };

/** Re-checks a domain's DNS/verification state with Vercel and updates the
 * stored status. Only ever returns 'verifying' | 'active' | 'error' — a
 * fresh row starts 'pending' from `addCustomDomain` and is only revisited
 * here once the artist asks to check it. Ownership-scoped by `opts.storeId`
 * unless omitted for an admin cross-store lookup. */
export async function checkDomain(hostname: string, opts: { storeId?: string } = {}): Promise<CheckDomainOutcome> {
  const rows = await db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, hostname)).limit(1);
  const row = rows[0];
  if (!row || (opts.storeId && row.storeId !== opts.storeId)) {
    return { ok: false, error: 'not_found' };
  }

  const storedRecords = (row.verification as DnsRecord[] | null) ?? [];

  if (row.status === 'active') {
    return { ok: true, status: 'active', hostname, message: 'Your domain is live.', records: storedRecords };
  }

  const gateway = getVercelGateway();
  let domain;
  let config;
  try {
    domain = await gateway.getProjectDomain(hostname);
    config = domain ? await gateway.getDomainConfig(hostname) : null;
  } catch (err) {
    const message = err instanceof VercelApiError ? err.message : 'Could not reach Vercel to check this domain.';
    await db.update(schema.customDomains).set({ status: 'error' }).where(eq(schema.customDomains.id, row.id));
    return { ok: true, status: 'error', hostname, message, records: storedRecords };
  }

  if (!domain || !config) {
    await db.update(schema.customDomains).set({ status: 'error' }).where(eq(schema.customDomains.id, row.id));
    return {
      ok: true,
      status: 'error',
      hostname,
      message: 'This domain is no longer registered with Blackout Merchandise — try adding it again.',
      records: storedRecords,
    };
  }

  let verified = domain.verified;
  if (!verified) {
    try {
      verified = (await gateway.verifyProjectDomain(hostname)).verified;
    } catch {
      // Leave verified as-is; the DNS status below still reports something useful.
    }
  }

  let status: DomainStatus = 'verifying';
  let message = 'CNAME not found yet — DNS can take up to an hour.';
  if (verified && !config.misconfigured) {
    status = 'active';
    message = 'Your domain is live.';
  } else if (domain.verification && domain.verification.length > 0) {
    message = 'Add the TXT record below to prove ownership, then check again.';
  } else if (config.configuredBy) {
    message = 'DNS found, waiting on certificate issuance and verification — check again shortly.';
  }

  const records = recordsForDomain(domain);
  await db.update(schema.customDomains).set({ status, verification: records }).where(eq(schema.customDomains.id, row.id));

  if (status === 'active') {
    await db.update(schema.artistStores).set({ customDomain: hostname }).where(eq(schema.artistStores.id, row.storeId));
    invalidateHostCache(hostname);

    const storeRows = await db.select({ artistId: schema.artistStores.artistId }).from(schema.artistStores).where(eq(schema.artistStores.id, row.storeId)).limit(1);
    const artistId = storeRows[0]?.artistId;
    if (artistId) {
      try {
        await notify({ userId: artistId, event: 'domain.active', text: `${hostname} is live.`, payload: { hostname } });
      } catch {
        // notifications service lands concurrently in wave 2 — never fail the domain check on it.
      }
    }
  }

  return { ok: true, status, hostname, message, records };
}

export type RemoveDomainOutcome = { ok: true } | { ok: false; error: 'not_found' };

/** Removes the domain from the Vercel project and the database. Ownership
 * checked against `opts.storeId` unless omitted for an admin action. */
export async function removeCustomDomain(hostname: string, opts: { storeId?: string } = {}): Promise<RemoveDomainOutcome> {
  const rows = await db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, hostname)).limit(1);
  const row = rows[0];
  if (!row || (opts.storeId && row.storeId !== opts.storeId)) {
    return { ok: false, error: 'not_found' };
  }

  try {
    await getVercelGateway().removeProjectDomain(hostname);
  } catch (err) {
    if (!(err instanceof VercelApiError && err.status === 404)) throw err;
  }

  await db.delete(schema.customDomains).where(eq(schema.customDomains.id, row.id));
  await db
    .update(schema.artistStores)
    .set({ customDomain: null })
    .where(and(eq(schema.artistStores.id, row.storeId), eq(schema.artistStores.customDomain, hostname)));
  invalidateHostCache(hostname);
  return { ok: true };
}

export type CustomDomainRow = typeof schema.customDomains.$inferSelect;

export async function listDomains(storeId: string): Promise<CustomDomainRow[]> {
  return db.select().from(schema.customDomains).where(eq(schema.customDomains.storeId, storeId)).orderBy(desc(schema.customDomains.createdAt));
}

/** All non-active domains across every store, for the verify cron. */
export async function listPendingOrVerifyingDomains(): Promise<CustomDomainRow[]> {
  return db.select().from(schema.customDomains).where(inArray(schema.customDomains.status, ['pending', 'verifying']));
}
