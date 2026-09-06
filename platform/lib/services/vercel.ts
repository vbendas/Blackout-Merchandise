/**
 * Thin typed client for the Vercel Domains API, used to attach an artist's
 * custom domain to this project (Platform-Plan §7). Endpoints verified via
 * WebFetch of vercel.com/docs/rest-api on 6 Sep 2026:
 *
 *   POST   /v10/projects/{idOrName}/domains              add-a-domain-to-a-project
 *   GET    /v9/projects/{idOrName}/domains/{domain}       get-a-project-domain
 *   POST   /v9/projects/{idOrName}/domains/{domain}/verify verify-project-domain
 *   DELETE /v9/projects/{idOrName}/domains/{domain}       remove-a-domain-from-a-project
 *   GET    /v6/domains/{domain}/config                    get-a-domain-s-configuration
 *
 * Auth is a bearer token (`VERCEL_TOKEN`); the project is addressed by id
 * (`VERCEL_PROJECT_ID`). Both are empty in this environment, so
 * `getVercelGateway()` falls back to an in-memory MOCK that returns the same
 * standard DNS instructions and lets a smoke test/dev session flip a domain
 * to verified without ever calling Vercel.
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

/** One verification challenge Vercel returned for a not-yet-verified domain
 * (e.g. a TXT record proving ownership when the domain is contested). */
export interface VercelVerificationChallenge {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface VercelProjectDomain {
  name: string;
  apexName: string;
  projectId: string;
  redirect: string | null;
  redirectStatusCode: number | null;
  gitBranch: string | null;
  verified: boolean;
  verification?: VercelVerificationChallenge[];
  createdAt?: number;
  updatedAt?: number;
}

export interface VercelDomainConfig {
  configuredBy: 'A' | 'CNAME' | 'http' | 'dns-01' | null;
  acceptedChallenges: ('dns-01' | 'http-01')[];
  misconfigured: boolean;
}

/** A DNS record instruction shown to the artist on the `domain_setup` card. */
export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

export interface AddDomainResult {
  domain: VercelProjectDomain;
  records: DnsRecord[];
}

/** Never carries the bearer token — only the HTTP status and Vercel's error message. */
export class VercelApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'VercelApiError';
  }
}

export interface VercelGateway {
  addProjectDomain(hostname: string): Promise<AddDomainResult>;
  getProjectDomain(hostname: string): Promise<VercelProjectDomain | null>;
  verifyProjectDomain(hostname: string): Promise<VercelProjectDomain>;
  getDomainConfig(hostname: string): Promise<VercelDomainConfig>;
  removeProjectDomain(hostname: string): Promise<void>;
}

/** The A/CNAME record an artist must add, derived from Vercel's own apex/subdomain split. */
export function standardRecordFor(hostname: string, apexName: string): DnsRecord {
  if (hostname === apexName) {
    return { type: 'A', name: '@', value: '76.76.21.21' };
  }
  const sub = hostname.slice(0, hostname.length - apexName.length - 1);
  return { type: 'CNAME', name: sub || '@', value: 'cname.vercel-dns.com' };
}

function challengeRecords(domain: VercelProjectDomain): DnsRecord[] {
  return (domain.verification ?? []).map((v) => ({ type: v.type.toUpperCase(), name: v.domain, value: v.value }));
}

/** Full record set shown on the card: the standard A/CNAME plus any live ownership challenge. */
export function recordsForDomain(domain: VercelProjectDomain): DnsRecord[] {
  return [standardRecordFor(domain.name, domain.apexName), ...challengeRecords(domain)];
}

// ---------------------------------------------------------------------------
// Real gateway
// ---------------------------------------------------------------------------

async function vercelFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${VERCEL_API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body?.error?.message ?? '';
    } catch {
      // non-JSON error body; fall through to the generic message below
    }
    throw new VercelApiError(res.status, detail || `Vercel API request failed (${res.status})`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

class RealVercelGateway implements VercelGateway {
  private readonly token: string;
  private readonly projectId: string;

  constructor() {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (!token || !projectId) {
      throw new VercelApiError(500, 'VERCEL_TOKEN and VERCEL_PROJECT_ID must both be set to use the real Vercel gateway.');
    }
    this.token = token;
    this.projectId = projectId;
  }

  async addProjectDomain(hostname: string): Promise<AddDomainResult> {
    const domain = await vercelFetch<VercelProjectDomain>(this.token, `/v10/projects/${this.projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: hostname }),
    });
    return { domain, records: recordsForDomain(domain) };
  }

  async getProjectDomain(hostname: string): Promise<VercelProjectDomain | null> {
    try {
      return await vercelFetch<VercelProjectDomain>(this.token, `/v9/projects/${this.projectId}/domains/${hostname}`);
    } catch (err) {
      if (err instanceof VercelApiError && err.status === 404) return null;
      throw err;
    }
  }

  async verifyProjectDomain(hostname: string): Promise<VercelProjectDomain> {
    return vercelFetch<VercelProjectDomain>(this.token, `/v9/projects/${this.projectId}/domains/${hostname}/verify`, { method: 'POST' });
  }

  async getDomainConfig(hostname: string): Promise<VercelDomainConfig> {
    return vercelFetch<VercelDomainConfig>(this.token, `/v6/domains/${hostname}/config?projectIdOrName=${this.projectId}`);
  }

  async removeProjectDomain(hostname: string): Promise<void> {
    try {
      await vercelFetch<unknown>(this.token, `/v9/projects/${this.projectId}/domains/${hostname}`, { method: 'DELETE' });
    } catch (err) {
      if (err instanceof VercelApiError && err.status === 404) return; // already gone
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Mock gateway — used whenever VERCEL_TOKEN is empty (this environment today)
// ---------------------------------------------------------------------------

interface MockEntry {
  domain: VercelProjectDomain;
  config: VercelDomainConfig;
}

/** Best-effort apex guess for the mock (last two labels). Real eTLD rules
 * (co.uk, etc.) don't matter here — Vercel's own `apexName` is authoritative
 * once a real token is configured; this only drives the dev/mock DNS hint. */
function guessApexName(hostname: string): string {
  const labels = hostname.split('.');
  return labels.length <= 2 ? hostname : labels.slice(-2).join('.');
}

class MockVercelGateway implements VercelGateway {
  private readonly store = new Map<string, MockEntry>();

  async addProjectDomain(hostname: string): Promise<AddDomainResult> {
    const apexName = guessApexName(hostname);
    const domain: VercelProjectDomain = {
      name: hostname,
      apexName,
      projectId: process.env.VERCEL_PROJECT_ID || 'mock_project',
      redirect: null,
      redirectStatusCode: null,
      gitBranch: null,
      verified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const config: VercelDomainConfig = { configuredBy: null, acceptedChallenges: ['dns-01', 'http-01'], misconfigured: true };
    this.store.set(hostname, { domain, config });
    return { domain, records: recordsForDomain(domain) };
  }

  async getProjectDomain(hostname: string): Promise<VercelProjectDomain | null> {
    return this.store.get(hostname)?.domain ?? null;
  }

  async verifyProjectDomain(hostname: string): Promise<VercelProjectDomain> {
    const entry = this.store.get(hostname);
    if (!entry) throw new VercelApiError(404, `mock: domain ${hostname} not found`);
    // The mock never verifies on its own — only `completeMockVerification`
    // (below) flips it, mirroring real DNS propagation being out of band.
    return entry.domain;
  }

  async getDomainConfig(hostname: string): Promise<VercelDomainConfig> {
    const entry = this.store.get(hostname);
    if (!entry) throw new VercelApiError(404, `mock: domain ${hostname} not found`);
    return entry.config;
  }

  async removeProjectDomain(hostname: string): Promise<void> {
    this.store.delete(hostname);
  }

  /** Test-only: attach a TXT `_vercel` ownership challenge, as Vercel does
   * when a domain is contested across projects/accounts. */
  simulateNeedsVerification(hostname: string): void {
    const entry = this.store.get(hostname);
    if (!entry) return;
    entry.domain.verified = false;
    entry.domain.verification = [
      {
        type: 'TXT',
        domain: `_vercel.${hostname}`,
        value: `vc-domain-verify=${hostname},${globalThis.crypto.randomUUID().slice(0, 12)}`,
        reason: 'Ownership verification required',
      },
    ];
    entry.config = { configuredBy: null, acceptedChallenges: ['dns-01'], misconfigured: true };
  }

  /** Test-only: simulate DNS propagation + verification completing. */
  completeMockVerification(hostname: string): void {
    const entry = this.store.get(hostname);
    if (!entry) return;
    entry.domain.verified = true;
    entry.domain.verification = undefined;
    entry.config = {
      configuredBy: entry.domain.name === entry.domain.apexName ? 'A' : 'CNAME',
      acceptedChallenges: ['dns-01', 'http-01'],
      misconfigured: false,
    };
  }
}

const mockGateway = new MockVercelGateway();
let gateway: VercelGateway | null = null;

/** Real gateway when `VERCEL_TOKEN` is set, otherwise the shared in-memory mock. */
export function getVercelGateway(): VercelGateway {
  if (!gateway) {
    gateway = process.env.VERCEL_TOKEN ? new RealVercelGateway() : mockGateway;
  }
  return gateway;
}

/** Mock-only: flips a domain to verified, as if DNS had propagated and
 * Vercel had confirmed it. No-op (throws) if the real gateway is active. */
export function completeMockVerification(hostname: string): void {
  mockGateway.completeMockVerification(hostname);
}

/** Mock-only: attaches a TXT ownership-verification challenge to a domain,
 * for exercising the "needs verification" branch of `checkDomain`. */
export function simulateNeedsVerification(hostname: string): void {
  mockGateway.simulateNeedsVerification(hostname);
}
