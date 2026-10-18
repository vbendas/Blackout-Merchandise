import { randomUUID } from 'crypto';
import { z } from 'zod';
import { can } from '@/lib/auth/permissions';
import { defineTool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import { addCustomDomain, checkDomain, listDomains, normaliseHostname, removeCustomDomain, type DnsRecord, type DomainStatus } from '@/lib/services/domains';
import type { Card } from '@/lib/ui-cards/schemas';

/** Shared "no shop for this account" bail-out, matching lib/tools/products.ts. */
function noStore(): { data: { ok: false; error: string } } {
  return { data: { ok: false, error: 'No shop found for this account yet.' } };
}

function domainCard(hostname: string, status: DomainStatus, records: DnsRecord[], message?: string): Card {
  return {
    id: `domain_${hostname}`,
    kind: 'domain_setup',
    hostname,
    status,
    records,
    message,
    actions: status === 'active' ? undefined : [{ label: 'Check now', prompt: `check my domain ${hostname}`, variant: 'secondary' }],
  };
}

function noticeCard(id: string, tone: 'info' | 'success' | 'warning' | 'error', text: string): Card {
  return { id, kind: 'notice', tone, text };
}

/** Whose domains a call may touch: any shop's with Shops and artists Work
 * (staff helping with domains), otherwise only the caller's own shop. Null
 * when the caller has neither, so the lookup never runs unfiltered. */
function domainScope(ctx: ToolContext): { storeId?: string } | null {
  if (can(ctx, 'shops', 'work')) return {};
  return ctx.storeId ? { storeId: ctx.storeId } : null;
}

/** Resolves the hostname a hostname-optional tool should act on: the one
 * given, or (falling back, same pattern as resolveProductId in products.ts)
 * the store's most recently added domain. */
async function resolveHostname(ctx: ToolContext, explicit?: string): Promise<string | null> {
  if (explicit) return normaliseHostname(explicit) ?? explicit.trim().toLowerCase();
  if (!ctx.storeId) return null;
  const domains = await listDomains(ctx.storeId);
  return domains[0]?.hostname ?? null;
}

interface AddDomainData {
  ok: boolean;
  error?: string;
  hostname?: string;
}

export const addCustomDomainTool = defineTool({
  name: 'add_custom_domain',
  description:
    "Connect a custom domain the artist owns (e.g. merch.theirband.com) to their shop, so it serves at their own URL instead of blackoutmerch.example/their-slug. Call this when the artist wants to use their own domain. An apex domain (example.com) needs an A record at their DNS provider; a subdomain (shop.example.com) needs a CNAME. DNS changes can take from a few minutes up to an hour to propagate. Returns the exact records to add — tell the artist to add them, then ask to check the domain.",
  input: z.object({ hostname: z.string().min(3).max(253) }).strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult<AddDomainData>> => {
    if (!ctx.storeId) return noStore();

    const result = await addCustomDomain(ctx.storeId, input.hostname);
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [noticeCard(`domain_err_${randomUUID()}`, 'warning', result.message)] } };
    }

    return {
      data: { ok: true, hostname: result.hostname },
      ui: { cards: [domainCard(result.hostname, 'pending', result.records, 'Add these DNS records at your provider, then ask me to check the domain.')] },
    };
  },
});

interface CheckDomainData {
  ok: boolean;
  error?: string;
  status?: DomainStatus;
}

export const checkDomainTool = defineTool({
  name: 'check_domain',
  description:
    "Re-check a connected custom domain's DNS and verification status with Vercel. Call this when the artist asks to check, verify, or refresh their domain, or after they say they've added the DNS records. Omit hostname to check the shop's most recently added domain.",
  input: z.object({ hostname: z.string().max(253).optional() }).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<CheckDomainData>> => {
    const hostname = await resolveHostname(ctx, input.hostname);
    if (!hostname) {
      return { data: { ok: false, error: 'no_domain' }, ui: { cards: [noticeCard(`domain_none_${randomUUID()}`, 'info', 'No custom domain connected yet.')] } };
    }

    const scope = domainScope(ctx);
    const outcome = scope ? await checkDomain(hostname, scope) : ({ ok: false, error: 'not_found' } as const);
    if (!outcome.ok) {
      return { data: { ok: false, error: 'not_found' }, ui: { cards: [noticeCard(`domain_404_${randomUUID()}`, 'warning', `${hostname} isn't connected to this shop.`)] } };
    }

    return {
      data: { ok: true, status: outcome.status },
      ui: { cards: [domainCard(hostname, outcome.status, outcome.records, outcome.message)] },
    };
  },
});

interface RemoveDomainData {
  ok: boolean;
  error?: string;
}

export const removeDomainTool = defineTool({
  name: 'remove_domain',
  description:
    "Disconnect a custom domain from the shop; it goes back to serving only at blackoutmerch.example/[slug]. Sensitive action: shows a confirm card and only executes once the human clicks confirm. Omit hostname to remove the shop's most recently added domain.",
  input: z.object({ hostname: z.string().max(253).optional() }).strict(),
  scope: 'both',
  confirm: true,
  summarize: (input) => `Disconnect ${input.hostname ?? 'this custom domain'} from your shop.`,
  run: async (ctx, input): Promise<ToolResult<RemoveDomainData>> => {
    const hostname = await resolveHostname(ctx, input.hostname);
    if (!hostname) return { data: { ok: false, error: 'no_domain' } };

    const scope = domainScope(ctx);
    const result = scope ? await removeCustomDomain(hostname, scope) : ({ ok: false, error: 'not_found' } as const);
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [noticeCard(`domain_rm_err_${randomUUID()}`, 'warning', `${hostname} isn't connected to this shop.`)] } };
    }

    return { data: { ok: true }, ui: { cards: [noticeCard(`domain_rm_${randomUUID()}`, 'success', `${hostname} has been disconnected.`)] } };
  },
});

interface ListDomainsData {
  count: number;
}

export const listDomainsTool = defineTool({
  name: 'list_domains',
  description: "List the shop's connected custom domains and their verification status. Call this when the artist asks what domains are connected or wants an overview of their domain setup.",
  input: z.object({}).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx): Promise<ToolResult<ListDomainsData>> => {
    if (!ctx.storeId) return { data: { count: 0 }, ui: { cards: [noticeCard(`domains_none_${ctx.userId}`, 'info', 'No custom domains connected.')] } };

    const domains = await listDomains(ctx.storeId);
    if (domains.length === 0) {
      return { data: { count: 0 }, ui: { cards: [noticeCard(`domains_none_${ctx.storeId}`, 'info', 'No custom domains connected yet.')] } };
    }

    const cards = domains.slice(0, 6).map((d) => domainCard(d.hostname, d.status, (d.verification as DnsRecord[] | null) ?? []));
    return { data: { count: domains.length }, ui: { cards } };
  },
});

export const DOMAIN_TOOLS = [addCustomDomainTool, checkDomainTool, removeDomainTool, listDomainsTool];
