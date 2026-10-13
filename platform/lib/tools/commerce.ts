import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolResult } from '@/lib/tools/types';
import { appBaseUrl, getStripeAccountStatus, startOnboarding, type StoreStripeStatus } from '@/lib/services/stripe';
import { getOrder, listOrders, refundOrder, salesSummary, type OrderDetail, type OrderListItem, type SalesSummary } from '@/lib/services/orders';
import type { Card, CardAction } from '@/lib/ui-cards/schemas';

// Money tools: Stripe Connect status/onboarding, and the artist-facing order
// / sales read model. Every write here goes through lib/services/{stripe,
// orders}.ts — nothing here touches the DB directly.

function noStore(): { data: { ok: false; error: string } } {
  return { data: { ok: false, error: 'No shop found for this account yet.' } };
}

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

function stripeOnboardingCard(status: StoreStripeStatus, onboardingUrl?: string): Card {
  const cardStatus: 'not_started' | 'in_progress' | 'action_required' | 'ready' = !status.connected
    ? 'not_started'
    : status.chargesEnabled && status.payoutsEnabled
      ? 'ready'
      : status.requirements.length > 0
        ? 'action_required'
        : 'in_progress';

  const actions: CardAction[] | undefined =
    cardStatus === 'ready'
      ? undefined
      : onboardingUrl
        ? [{ label: 'Continue onboarding', href: onboardingUrl, variant: 'primary' }]
        : [{ label: 'Set up payouts', prompt: 'Set up payouts', variant: 'primary' }];

  return {
    id: `stripe_onboarding_${status.accountId ?? 'unconnected'}`,
    kind: 'stripe_onboarding',
    status: cardStatus,
    onboardingUrl,
    requirements: status.requirements,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    ...(actions ? { actions } : {}),
  };
}

function orderCard(detail: OrderDetail): Card {
  return {
    id: `order_${detail.id}`,
    kind: 'order',
    title: detail.reference,
    orderId: detail.id,
    reference: detail.reference,
    kind_: detail.orderType,
    status: detail.status,
    productionStatus: detail.productionStatus ?? undefined,
    placedAt: detail.placedAt,
    fanEmail: detail.fanEmail ?? undefined,
    lines: detail.lines,
    totals: detail.totals,
    tracking: detail.tracking ?? undefined,
  };
}

function ordersTableCard(rows: OrderListItem[]): Card {
  return {
    id: `orders_table_${randomUUID()}`,
    kind: 'orders_table',
    rows: rows.map((r) => ({
      orderId: r.orderId,
      reference: r.reference,
      placedAt: r.placedAt,
      status: r.status,
      productionStatus: r.productionStatus ?? undefined,
      grossCents: r.grossCents,
      transferCents: r.transferCents,
      prompt: `Open order ${r.orderId}`,
    })),
    total: rows.length,
  };
}

function salesSummaryCard(summary: SalesSummary): Card {
  return {
    id: `sales_summary_${randomUUID()}`,
    kind: 'sales_summary',
    period: summary.period,
    orders: summary.orders,
    grossCents: summary.grossCents,
    transferCents: summary.transferCents,
    topProducts: summary.topProducts,
    series: summary.series,
  };
}

// ---------------------------------------------------------------------------

interface StartOnboardingData {
  ok: boolean;
  error?: string;
  url?: string;
}

export const startStripeOnboardingTool = defineTool({
  name: 'start_stripe_onboarding',
  description:
    "Start (or resume) Stripe Connect onboarding so the shop can accept payments and receive payouts. Creates the shop's Express account the first time it's called, then always returns a fresh onboarding link. Call this when the artist asks to connect Stripe, set up payouts, or get paid.",
  input: z.object({}).strict(),
  scope: 'artist',
  run: async (ctx): Promise<ToolResult<StartOnboardingData>> => {
    if (!ctx.storeId) return noStore();

    const base = `${appBaseUrl()}/api/stripe/connect`;
    const result = await startOnboarding(ctx.storeId, { returnUrl: `${base}?return=1`, refreshUrl: `${base}?refresh=1` });
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`onboarding_err_${randomUUID()}`, result.error)] } };
    }

    const status = await getStripeAccountStatus(ctx.storeId);
    return {
      data: { ok: true, url: result.url },
      ui: { cards: [stripeOnboardingCard(status, result.url)] },
    };
  },
});

interface PayoutStatusData {
  ok: boolean;
  error?: string;
  connected?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export const getPayoutStatusTool = defineTool({
  name: 'get_payout_status',
  description:
    "Check Stripe Connect payout status for the shop — whether onboarding is complete and charges/payouts are enabled, and what's still missing. Call this when the artist asks about payouts, Stripe status, or why publishing is blocked.",
  input: z.object({}).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx): Promise<ToolResult<PayoutStatusData>> => {
    if (!ctx.storeId) return noStore();
    const status = await getStripeAccountStatus(ctx.storeId);
    const ready = status.chargesEnabled && status.payoutsEnabled;

    return {
      data: { ok: true, connected: status.connected, chargesEnabled: status.chargesEnabled, payoutsEnabled: status.payoutsEnabled },
      ui: {
        cards: [stripeOnboardingCard(status)],
        next: ready
          ? [{ label: 'Publish my shop', prompt: 'Publish my shop', primary: true }]
          : [{ label: 'Set up payouts', prompt: 'Set up payouts', primary: true }],
      },
    };
  },
});

interface ListOrdersData {
  ok: boolean;
  total?: number;
}

export const listOrdersTool = defineTool({
  name: 'list_orders',
  description:
    "List the shop's orders, newest first, optionally filtered by status ('pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled') or a since date (ISO). Shows a table; each row's prompt opens it with get_order.",
  input: z.object({ status: z.string().optional(), since: z.string().optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<ListOrdersData>> => {
    if (!ctx.storeId) return noStore();

    const since = input.since ? new Date(input.since) : undefined;
    const rows = await listOrders(ctx.storeId, { status: input.status, since, limit: 50 });

    return {
      data: { ok: true, total: rows.length },
      ui: { cards: [ordersTableCard(rows)], next: [{ label: 'Sales this month', prompt: 'Sales this month' }] },
    };
  },
});

interface GetOrderData {
  ok: boolean;
  error?: string;
  orderId?: string;
  status?: string;
}

export const getOrderTool = defineTool({
  name: 'get_order',
  description: "Get full details for one order — lines, totals, status and tracking. Call this when the artist opens an order from list_orders or asks about a specific order.",
  input: z.object({ orderId: z.string().uuid() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetOrderData>> => {
    if (!ctx.storeId) return noStore();

    const detail = await getOrder(ctx.storeId, input.orderId);
    if (!detail) {
      const text = 'Order not found for this shop.';
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`get_order_err_${randomUUID()}`, text)] } };
    }

    return { data: { ok: true, orderId: detail.id, status: detail.status }, ui: { cards: [orderCard(detail)] } };
  },
});

interface SalesSummaryData {
  ok: boolean;
  orders?: number;
  grossCents?: number;
}

export const getSalesSummaryTool = defineTool({
  name: 'get_sales_summary',
  description: "Summarise sales for a period ('month', '30d' or 'all'): order count, gross, transfer, top products and a daily series. Call this when the artist asks how sales are going.",
  input: z.object({ period: z.enum(['month', '30d', 'all']).default('month') }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<SalesSummaryData>> => {
    if (!ctx.storeId) return noStore();

    const summary = await salesSummary(ctx.storeId, input.period);
    return {
      data: { ok: true, orders: summary.orders, grossCents: summary.grossCents },
      ui: { cards: [salesSummaryCard(summary)] },
    };
  },
});

interface RefundOrderData {
  ok: boolean;
  error?: string;
  orderId?: string;
  status?: string;
}

export const refundOrderTool = defineTool({
  name: 'refund_order',
  description:
    "Refund an order, in full or for a specific amount, with a reason. Admin only. Sensitive action: shows a confirm card and only executes once an admin clicks confirm.",
  input: z.object({ orderId: z.string().uuid(), amountCents: z.number().int().positive().optional(), reason: z.string().min(1).max(300) }).strict(),
  scope: 'admin',
  confirm: true,
  summarize: (input) => `Refund order ${input.orderId}${input.amountCents ? ` (€${(input.amountCents / 100).toFixed(2)})` : ' in full'} — ${input.reason}`,
  run: async (ctx, input): Promise<ToolResult<RefundOrderData>> => {
    // Admin refunds can act on any store's order; an artist calling this
    // (were it ever exposed to that scope) would be limited to their own.
    const storeId = ctx.role === 'admin' ? undefined : (ctx.storeId ?? undefined);
    const result = await refundOrder(input.orderId, { storeId, amountCents: input.amountCents, reason: input.reason });
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`refund_err_${randomUUID()}`, result.error)] } };
    }

    return { data: { ok: true, orderId: result.value.id, status: result.value.status }, ui: { cards: [orderCard(result.value)] } };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMMERCE_TOOLS: Tool<any, any>[] = [
  startStripeOnboardingTool,
  getPayoutStatusTool,
  listOrdersTool,
  getOrderTool,
  getSalesSummaryTool,
  refundOrderTool,
];
