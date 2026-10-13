import { randomUUID } from 'crypto';
import { getSalesThisMonth } from '@/lib/services/studio-home';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { revalidateStore } from '@/lib/storefront/revalidate';
import { defineTool, type ToolResult } from '@/lib/tools/types';
import { storeSummary, storeUrl, updateStore } from '@/lib/services/stores';
import type { Card } from '@/lib/ui-cards/schemas';

interface GetMyStoreData {
  hasStore: boolean;
  name?: string;
  slug?: string;
  isPublished?: boolean;
  stripeReady?: boolean;
  liveProducts?: number;
}

interface UpdateStoreData {
  ok: boolean;
  error?: 'no_store' | 'not_found' | 'slug_taken';
}

interface PublishStoreData {
  ok: boolean;
  error?: 'no_store' | 'stripe_not_ready' | 'no_live_products';
  published?: boolean;
  note?: string;
}

interface UnpublishStoreData {
  ok: boolean;
  error?: 'no_store';
}

function storeCard(
  summary: NonNullable<Awaited<ReturnType<typeof storeSummary>>>,
  salesThisMonth?: { count: number; grossCents: number },
): Card {
  return {
    id: `store_${summary.id}`,
    kind: 'store',
    storeId: summary.id,
    name: summary.name,
    slug: summary.slug,
    url: storeUrl(summary.slug),
    isPublished: summary.isPublished,
    accentColour: summary.accentColour ?? undefined,
    logoUrl: summary.logoUrl ?? undefined,
    stripeReady: summary.stripeReady,
    liveProducts: summary.liveProducts,
    salesThisMonth,
  };
}

export const getMyStoreTool = defineTool({
  name: 'get_my_store',
  description:
    "Get the signed-in artist's own shop: name, slug, publish status, Stripe payout readiness, and live product count. Call this at the start of a conversation and whenever the artist asks about their shop, status, or whether they can publish yet. When the shop has no products yet, also shows the onboarding checklist.",
  input: z.object({}).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx): Promise<ToolResult<GetMyStoreData>> => {
    if (!ctx.storeId) {
      return {
        data: { hasStore: false },
        ui: { cards: [{ id: `no_store_${ctx.userId}`, kind: 'notice', tone: 'info', text: 'No shop found for this account yet.' }] },
      };
    }
    const summary = await storeSummary(ctx.storeId);
    if (!summary) {
      return { data: { hasStore: false }, ui: { cards: [{ id: `no_store_${ctx.userId}`, kind: 'notice', tone: 'error', text: 'Shop record is missing.' }] } };
    }

    const cards: Card[] = [storeCard(summary, await getSalesThisMonth(summary.id).catch(() => undefined))];
    if (!summary.hasAnyProduct) {
      cards.push({
        id: `onboarding_${summary.id}`,
        kind: 'onboarding_checklist',
        items: [
          { key: 'name', label: 'Name your shop', done: summary.name.trim().length > 0 },
          { key: 'browse', label: 'Browse blanks', done: false, prompt: 'Show me blanks' },
          { key: 'product', label: 'Create your first product', done: summary.hasAnyProduct },
          { key: 'stripe', label: 'Set up payouts', done: summary.stripeReady, prompt: 'Set up payouts' },
          { key: 'publish', label: 'Publish your shop', done: summary.isPublished, prompt: 'Publish my shop' },
        ],
      });
    }

    return {
      data: {
        hasStore: true,
        name: summary.name,
        slug: summary.slug,
        isPublished: summary.isPublished,
        stripeReady: summary.stripeReady,
        liveProducts: summary.liveProducts,
      },
      ui: {
        cards,
        project: summary.hasAnyProduct
          ? undefined
          : { kind: 'onboarding', refId: summary.id, state: { hasStore: true, isPublished: summary.isPublished, stripeReady: summary.stripeReady } },
      },
    };
  },
});

export const updateStoreTool = defineTool({
  name: 'update_store',
  description:
    "Update the artist's shop profile: display name, URL slug, accent colour, about text, or social links. Call this when the artist wants to rename their shop, change its slug, set a brand colour, write their about section, or add socials. Only pass the fields that are changing; omit the rest.",
  input: z
    .object({
      name: z.string().min(1).max(80).optional(),
      slug: z
        .string()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and hyphens only')
        .optional(),
      accentColour: z.string().max(20).optional(),
      about: z.string().max(2000).optional(),
      socials: z.record(z.string(), z.string()).optional(),
    })
    .strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<UpdateStoreData>> => {
    if (!ctx.storeId) return { data: { ok: false, error: 'no_store' } };

    const result = await updateStore(ctx.storeId, input);
    if (!result.ok) {
      const text = result.error === 'slug_taken' ? 'That shop address is taken. Try another.' : 'Shop not found.';
      return { data: { ok: false, error: result.error }, ui: { cards: [{ id: `update_store_err_${randomUUID()}`, kind: 'notice', tone: 'warning', text }] } };
    }

    const summary = await storeSummary(ctx.storeId);
    return {
      data: { ok: true },
      ui: summary ? { cards: [storeCard(summary)] } : undefined,
    };
  },
});

export const publishStoreTool = defineTool({
  name: 'publish_store',
  description:
    "Publish the artist's shop so fans can view and buy from it. Blocked until Stripe payouts are connected (charges and payouts both enabled) and the shop has at least one live product. Sensitive action: calling this tool never publishes anything by itself — it shows the artist a confirmation card and only takes effect once they click confirm. Call this when the artist asks to publish, go live, or launch their shop.",
  input: z.object({}).strict(),
  scope: 'artist',
  confirm: true,
  summarize: () => 'Publish your shop so fans can see and buy from it.',
  run: async (ctx): Promise<ToolResult<PublishStoreData>> => {
    if (!ctx.storeId) return { data: { ok: false, error: 'no_store' } };

    const summary = await storeSummary(ctx.storeId);
    if (!summary) return { data: { ok: false, error: 'no_store' } };

    if (!summary.stripeReady) {
      const text = 'Publishing is blocked until your payouts are set up.';
      return {
        data: { ok: false, error: 'stripe_not_ready', note: text },
        ui: {
          cards: [{ id: `publish_blocked_${ctx.storeId}`, kind: 'notice', tone: 'warning', text }],
          next: [
            { label: 'Set up payouts', prompt: 'Set up payouts', primary: true },
            { label: 'Check payout status', prompt: 'Payout status' },
          ],
        },
      };
    }
    if (summary.liveProducts < 1) {
      const text = 'Publishing needs at least one live product — publish a product first.';
      return {
        data: { ok: false, error: 'no_live_products', note: text },
        ui: {
          cards: [{ id: `publish_blocked_${ctx.storeId}`, kind: 'notice', tone: 'warning', text }],
          next: [{ label: 'Add a product', prompt: 'Add a new product', primary: true }],
        },
      };
    }

    await db.update(schema.artistStores).set({ isPublished: true, publishedAt: new Date(), updatedAt: new Date() }).where(eq(schema.artistStores.id, ctx.storeId));
    await revalidateStore(ctx.storeId);

    const updated = await storeSummary(ctx.storeId);
    return {
      data: { ok: true, published: true },
      ui: {
        cards: updated ? [storeCard(updated)] : undefined,
        next: [{ label: 'Share your shop', prompt: 'Show my shop', primary: true }],
      },
    };
  },
});

export const unpublishStoreTool = defineTool({
  name: 'unpublish_store',
  description:
    "Take the shop offline — fans can no longer view or buy from it. Sensitive action: shows a confirm card and only executes once the artist clicks confirm. Call this when the artist asks to unpublish, take down, or pause their shop.",
  input: z.object({}).strict(),
  scope: 'artist',
  confirm: true,
  summarize: () => 'Unpublish your shop — fans will no longer be able to view or buy from it.',
  run: async (ctx): Promise<ToolResult<UnpublishStoreData>> => {
    if (!ctx.storeId) return { data: { ok: false, error: 'no_store' } };

    await db.update(schema.artistStores).set({ isPublished: false, updatedAt: new Date() }).where(eq(schema.artistStores.id, ctx.storeId));
    await revalidateStore(ctx.storeId);

    const updated = await storeSummary(ctx.storeId);
    return {
      data: { ok: true },
      ui: { cards: updated ? [storeCard(updated)] : undefined },
    };
  },
});
