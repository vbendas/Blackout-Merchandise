import { randomUUID } from 'crypto';
import { z } from 'zod';
import { can, type AccessHolder, type Actor, type Area, type Level } from '@/lib/auth/permissions';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import { jobSheetActions } from '@/lib/tools/job-sheet-actions';
import { buildQueue, type QueueSection } from '@/lib/services/admin-queue';
import {
  advance,
  listProduction,
  PRODUCTION_STATUSES,
  setTracking,
  type ProductionListItem,
  type ProductionStatus,
} from '@/lib/services/production';
import {
  draftSupplierOrder,
  listSupplierOrders,
  placeSupplierOrder,
  receiveSupplierOrder,
  type SupplierOrderDetail,
} from '@/lib/services/supplier';
import { listAnomalies, reviewPayout } from '@/lib/services/payouts';
import { getPodPriceTableState, listBaseCosts, resolvePodBase, setBaseCost, setPodPrices, updateShippingZone } from '@/lib/services/pricing-admin';
import { garmentPriceOf, podExampleRows } from '@/lib/pricing/pod-table';
import { getOrder, type OrderDetail } from '@/lib/services/orders';
import type { Card, CardAction, Chip } from '@/lib/ui-cards/schemas';

// Admin tools (Platform-Plan.md §4 "Admin"). Every write here goes through
// lib/services/{production,supplier,payouts,pricing-admin}.ts — nothing here
// touches the DB directly. Every tool is a staff tool with the area and level
// it needs (Print-Prep-Plan section 9): the registry hands it only to the
// owner and the employees whose access reaches it, and the cards and chips a
// tool returns offer only the next steps the caller may take.

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

/** The caller as the services check it (pricing-admin's setPodPrices asks for Catalogue and pricing Manage itself). */
function actorOf(ctx: ToolContext): Actor {
  return { userId: ctx.userId, role: ctx.role, permissions: ctx.permissions ?? null, suspended: ctx.suspended };
}

/** Next-step chips, keeping only those the caller may act on. */
function chipsFor(ctx: AccessHolder, chips: { chip: Chip; area: Area; level: Level }[]): Chip[] | undefined {
  const allowed = chips.filter((c) => can(ctx, c.area, c.level)).map((c) => c.chip);
  return allowed.length > 0 ? allowed : undefined;
}

// Duplicated from lib/tools/commerce.ts (not owned here) rather than
// exporting a shared helper from it — keeps this file's dependency surface
// limited to services, per the "services are the only writers, tools are
// thin wrappers" rule.
function orderCard(detail: OrderDetail, actions?: CardAction[]): Card {
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
    ...(actions && actions.length > 0 ? { actions } : {}),
  };
}

/** `canWork`: the caller may place and receive supplier orders, so the card
 * offers those buttons. */
function supplierOrderCard(detail: SupplierOrderDetail, canWork: boolean): Card {
  return {
    id: `supplier_order_${detail.id}`,
    kind: 'supplier_order',
    title: detail.poNumber,
    supplierOrderId: detail.id,
    supplier: detail.supplier,
    status: detail.status,
    lines: detail.lines.map((l) => ({ blankCode: l.blankCode, blankName: l.blankName, colour: l.colourName || l.colourCode, size: l.size, qty: l.qty })),
    forOrders: detail.forOrders,
    totalUnits: detail.totalUnits,
    note: `${detail.forOrders.length} order${detail.forOrders.length === 1 ? '' : 's'} — €${(detail.totalCostCents / 100).toFixed(2)} total.`,
    actions: !canWork
      ? undefined
      : detail.status === 'draft'
        ? [{ label: 'Place order', prompt: `Place supplier order ${detail.id}`, variant: 'primary' }]
        : detail.status === 'placed' || detail.status === 'confirmed' || detail.status === 'shipped'
          ? [{ label: 'Mark received', prompt: `Receive supplier order ${detail.id}` }]
          : undefined,
  };
}

function productionOrdersTableCard(title: string, rows: ProductionListItem[]): Card {
  return {
    id: `orders_table_${randomUUID()}`,
    kind: 'orders_table',
    title,
    rows: rows.map((r) => ({
      orderId: r.orderId,
      reference: r.reference,
      placedAt: r.placedAt,
      status: r.productionStatus,
      productionStatus: r.productionStatus,
      grossCents: r.grossCents,
      prompt: `Open order ${r.orderId}`,
    })),
    total: rows.length,
  };
}

// ---------------------------------------------------------------------------
// admin_queue

/** Which area each queue section belongs to, and the level its item prompts
 * need (a prompt the caller can't act on is dropped, the item stays). A
 * section missing here is shown to the owner only. */
const QUEUE_SECTION_ACCESS: Record<string, { area: Area; promptLevel: Level }> = {
  payout_anomalies: { area: 'money', promptLevel: 'manage' },
  production: { area: 'production', promptLevel: 'view' },
  bulk_awaiting_payment: { area: 'runs', promptLevel: 'view' },
  supplier_drafts: { area: 'production', promptLevel: 'view' },
  domains_stuck: { area: 'shops', promptLevel: 'work' },
  waitlist: { area: 'applications', promptLevel: 'view' },
  support: { area: 'support', promptLevel: 'view' },
};

/** The queue as this caller may see it: only the sections of their areas. */
export function queueSectionsFor(ctx: AccessHolder, sections: QueueSection[]): QueueSection[] {
  return sections.flatMap((section) => {
    const access = QUEUE_SECTION_ACCESS[section.key];
    if (!access) return ctx.role === 'admin' ? [section] : [];
    if (!can(ctx, access.area, 'view')) return [];
    if (can(ctx, access.area, access.promptLevel)) return [section];
    return [{ ...section, items: section.items.map((item) => ({ id: item.id, text: item.text, meta: item.meta })) }];
  });
}

function adminQueueCard(sections: QueueSection[], generatedAt: string): Card {
  return {
    id: `admin_queue_${randomUUID()}`,
    kind: 'admin_queue',
    title: "What's waiting",
    sections,
    generatedAt,
  };
}

export const adminQueueTool = defineTool({
  name: 'admin_queue',
  description:
    "Show everything waiting on the admin: unreviewed payout anomalies, orders in production, bulk orders stuck awaiting payment, draft supplier orders, stuck domain verifications, pending waitlist entries and open support tickets. Call this when the admin asks what's waiting, for their queue, or greets admin chat with no other context.",
  input: z.object({}).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'view' },
  readOnly: true,
  run: async (ctx): Promise<ToolResult<{ ok: true; total: number }>> => {
    const queue = await buildQueue();
    const sections = queueSectionsFor(ctx, queue.sections);
    const total = sections.reduce((sum, s) => sum + s.count, 0);
    return {
      data: { ok: true, total },
      ui: {
        cards: [adminQueueCard(sections, queue.generatedAt)],
        next: chipsFor(ctx, [
          { chip: { label: 'Production queue', prompt: 'Show the production queue' }, area: 'production', level: 'view' },
          { chip: { label: 'Payout anomalies', prompt: 'Show payout anomalies' }, area: 'money', level: 'view' },
          { chip: { label: 'Draft supplier order', prompt: 'Draft a supplier order from queued orders' }, area: 'production', level: 'work' },
        ]),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// production

interface ListProductionData {
  ok: boolean;
  total?: number;
}

export const listProductionTool = defineTool({
  name: 'list_production',
  description:
    "List orders in production, optionally filtered by production status ('queued', 'printing', 'packed', 'shipped', 'delivered'). Defaults to the active pipeline (everything not yet delivered), oldest first.",
  input: z.object({ status: z.enum(PRODUCTION_STATUSES).optional() }).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'view' },
  readOnly: true,
  run: async (_ctx, input): Promise<ToolResult<ListProductionData>> => {
    const rows = await listProduction({ status: input.status });
    return {
      data: { ok: true, total: rows.length },
      ui: {
        cards: [productionOrdersTableCard(input.status ? `Production — ${input.status}` : 'Production queue', rows)],
        next: [{ label: "What's waiting", prompt: "What's waiting on me?" }],
      },
    };
  },
});

interface AdvanceProductionData {
  ok: boolean;
  error?: string;
  orderId?: string;
  productionStatus?: string;
}


// Advancing to 'shipped' is confirm-gated via `confirmWhen` (it notifies the fan).
export const advanceProductionTool = defineTool({
  name: 'advance_production',
  description:
    "Move an order forward one production step: queued -> printing -> packed -> shipped -> delivered. Omit 'to' to advance to the next step automatically; passing 'to' must match that next step (no skipping). Moving to 'shipped' requires tracking (carrier + code), either passed here or already set with set_tracking, and notifies the artist and the fan when it ships.",
  input: z
    .object({
      orderId: z.string().uuid(),
      to: z.enum(PRODUCTION_STATUSES).optional(),
      tracking: z.object({ carrier: z.string().min(1).max(60), code: z.string().min(1).max(80), url: z.string().url().optional() }).optional(),
    })
    .strict(),
  scope: 'staff',
  access: { area: 'production', level: 'work' },
  // Shipping notifies the fan and the artist; a human confirms that step.
  confirmWhen: (input) => input.to === 'shipped',
  summarize: (input) => `Mark order ${input.orderId} as shipped${input.tracking ? ` (${input.tracking.carrier} ${input.tracking.code})` : ''}`,
  run: async (ctx, input): Promise<ToolResult<AdvanceProductionData>> => {
    const result = await advance(input.orderId, input.to, input.tracking);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`advance_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, orderId: result.value.id, productionStatus: result.value.productionStatus ?? undefined },
      ui: { cards: [orderCard(result.value, await jobSheetActions(ctx, result.value.id))], next: [{ label: 'Production queue', prompt: 'Show the production queue' }] },
    };
  },
});

interface SetTrackingData {
  ok: boolean;
  error?: string;
  orderId?: string;
}

export const setTrackingTool = defineTool({
  name: 'set_tracking',
  description:
    "Attach or update shipping tracking (carrier, code, optional URL) on an order without changing its production status. Call this before advancing to 'shipped', or to correct tracking on an order that's already shipped.",
  input: z.object({ orderId: z.string().uuid(), carrier: z.string().min(1).max(60), code: z.string().min(1).max(80), url: z.string().url().optional() }).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'work' },
  run: async (ctx, input): Promise<ToolResult<SetTrackingData>> => {
    const result = await setTracking(input.orderId, { carrier: input.carrier, code: input.code, url: input.url });
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`set_tracking_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, orderId: result.value.id },
      ui: {
        cards: [orderCard(result.value, await jobSheetActions(ctx, result.value.id))],
        next: result.value.productionStatus === 'packed' ? [{ label: 'Advance to shipped', prompt: `Advance order ${input.orderId} to shipped`, primary: true }] : undefined,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// supplier orders

interface DraftSupplierOrderData {
  ok: boolean;
  error?: string;
  supplierOrderId?: string;
  totalUnits?: number;
}

export const draftSupplierOrderTool = defineTool({
  name: 'draft_supplier_order',
  description:
    "Draft a Stanley/Stella purchase order by grouping queued orders' items by blank, colour and size. Pass specific orderIds, or omit to draft from every currently queued order.",
  input: z.object({ orderIds: z.array(z.string().uuid()).optional() }).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'work' },
  run: async (_ctx, input): Promise<ToolResult<DraftSupplierOrderData>> => {
    const result = await draftSupplierOrder({ orderIds: input.orderIds });
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`draft_supplier_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, supplierOrderId: result.value.id, totalUnits: result.value.totalUnits },
      ui: { cards: [supplierOrderCard(result.value, true)], next: [{ label: 'Place order', prompt: `Place supplier order ${result.value.id}`, primary: true }] },
    };
  },
});

interface PlaceSupplierOrderData {
  ok: boolean;
  error?: string;
  supplierOrderId?: string;
  status?: string;
}

export const placeSupplierOrderTool = defineTool({
  name: 'place_supplier_order',
  description: "Place a draft supplier order with Stanley/Stella. Sensitive action: shows a confirm card and only executes once the admin clicks confirm.",
  input: z.object({ supplierOrderId: z.string().uuid() }).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'work' },
  confirm: true,
  summarize: (input) => `Place supplier order ${input.supplierOrderId}.`,
  run: async (_ctx, input): Promise<ToolResult<PlaceSupplierOrderData>> => {
    const result = await placeSupplierOrder(input.supplierOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`place_supplier_err_${randomUUID()}`, result.error)] } };

    return { data: { ok: true, supplierOrderId: result.value.id, status: result.value.status }, ui: { cards: [supplierOrderCard(result.value, true)] } };
  },
});

interface ReceiveSupplierOrderData {
  ok: boolean;
  error?: string;
  supplierOrderId?: string;
  status?: string;
}

export const receiveSupplierOrderTool = defineTool({
  name: 'receive_supplier_order',
  description: "Mark a placed, confirmed or shipped supplier order as received.",
  input: z.object({ supplierOrderId: z.string().uuid() }).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'work' },
  run: async (_ctx, input): Promise<ToolResult<ReceiveSupplierOrderData>> => {
    const result = await receiveSupplierOrder(input.supplierOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`receive_supplier_err_${randomUUID()}`, result.error)] } };

    return { data: { ok: true, supplierOrderId: result.value.id, status: result.value.status }, ui: { cards: [supplierOrderCard(result.value, true)] } };
  },
});

interface ListSupplierOrdersData {
  ok: boolean;
  total?: number;
}

export const listSupplierOrdersTool = defineTool({
  name: 'list_supplier_orders',
  description: "List supplier purchase orders, optionally filtered by status ('draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled'), newest first.",
  input: z.object({ status: z.enum(['draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled']).optional() }).strict(),
  scope: 'staff',
  access: { area: 'production', level: 'view' },
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<ListSupplierOrdersData>> => {
    const rows = await listSupplierOrders(input.status);
    const canWork = can(ctx, 'production', 'work');
    return {
      data: { ok: true, total: rows.length },
      ui: {
        cards: rows.slice(0, 6).map((row) => supplierOrderCard(row, canWork)),
        next: canWork ? [{ label: 'Draft from queued', prompt: 'Draft a supplier order from queued orders' }] : undefined,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// payouts

interface ListPayoutAnomaliesData {
  ok: boolean;
  total?: number;
}

export const listPayoutAnomaliesTool = defineTool({
  name: 'list_payout_anomalies',
  description:
    "List payout ledger rows flagged with an anomaly (fee below cost, transfer mismatch, payouts disabled, refund after ship) that haven't been reviewed yet.",
  input: z.object({}).strict(),
  scope: 'staff',
  access: { area: 'money', level: 'view' },
  readOnly: true,
  run: async (ctx): Promise<ToolResult<ListPayoutAnomaliesData>> => {
    const canReview = can(ctx, 'money', 'manage');
    const ledgerRows = (await listAnomalies()).filter((r) => !r.reviewedAt);
    const rows = await Promise.all(
      ledgerRows.map(async (r) => {
        const detail = await getOrder(r.storeId, r.orderId);
        return {
          orderId: r.id,
          reference: detail?.reference ?? `LEDGER-${r.id.slice(0, 8).toUpperCase()}`,
          placedAt: detail?.placedAt ?? r.createdAt.toISOString(),
          status: (r.anomalyFlags as string[] | null)?.join(', ') || 'flagged',
          grossCents: r.grossCents,
          transferCents: r.transferCents,
          prompt: canReview ? `Review payout ${r.id}` : undefined,
        };
      }),
    );

    const card: Card = {
      id: `orders_table_${randomUUID()}`,
      kind: 'orders_table',
      title: 'Payout anomalies',
      rows,
      total: rows.length,
    };

    return {
      data: { ok: true, total: rows.length },
      ui: { cards: [card], next: chipsFor(ctx, [{ chip: { label: "What's waiting", prompt: "What's waiting on me?" }, area: 'production', level: 'view' }]) },
    };
  },
});

interface ReviewPayoutData {
  ok: boolean;
  error?: string;
  ledgerId?: string;
  verdict?: string;
}

export const reviewPayoutTool = defineTool({
  name: 'review_payout',
  description:
    "Record an admin verdict on a flagged payout ledger row: 'ok' clears it, 'hold' keeps it flagged for follow-up. Pass ledgerId from list_payout_anomalies.",
  input: z.object({ ledgerId: z.string().uuid(), verdict: z.enum(['ok', 'hold']), note: z.string().max(500).optional() }).strict(),
  scope: 'staff',
  access: { area: 'money', level: 'manage' },
  run: async (_ctx, input): Promise<ToolResult<ReviewPayoutData>> => {
    const result = await reviewPayout(input.ledgerId, input.verdict);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`review_payout_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, ledgerId: input.ledgerId, verdict: input.verdict },
      ui: {
        cards: [
          {
            id: `notice_review_${input.ledgerId}`,
            kind: 'notice',
            tone: input.verdict === 'ok' ? 'success' : 'warning',
            text: input.verdict === 'ok' ? 'Payout cleared.' : 'Payout held for follow-up.',
          },
        ],
      },
    };
  },
});

// ---------------------------------------------------------------------------
// pricing / shipping

interface SetBaseCostData {
  ok: boolean;
  error?: string;
  totalCents?: number;
  /** DTG/DTF: what a shop product of the garment costs now (the shop price table, or the placeholder this kind of row sets) */
  shopPriceCents?: number;
  /** the garment has no shop price yet: shop products stand on its one-piece DTG cost (DTF where it has no DTG) */
  shopPricePlaceholder?: boolean;
  note?: string;
}

/** €17.00 */
function euro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** What shop products of a garment cost after a base-cost row changed, in words for the admin. Shop products print DTG/DTF and are
 * priced from the shop price table (set_shop_price, Admin → Pricing → Shop products), so a DTG or DTF row prices runs; only while
 * the garment has no shop price does its one-piece DTG row (DTF where it has no DTG) stand in as the placeholder. Null for the
 * other methods (an embroidered product keeps its own rows). */
async function shopPriceNote(blankCode: string, printServiceCode: string): Promise<{ cents: number; placeholder: boolean; text: string } | null> {
  if (printServiceCode !== 'dtg' && printServiceCode !== 'dtf') return null;
  const base = await resolvePodBase(blankCode, printServiceCode);
  if (!base) return null;
  const method = printServiceCode.toUpperCase();
  const text = base.placeholder
    ? `${blankCode} has no shop price yet, so its ${method} shop products stand on ${euro(base.baseCents)}, its one-piece base cost, until set_shop_price sets one. This row also prices ${method} runs.`
    : `Shop products of ${blankCode} are priced from the shop price table (${method} ${euro(base.baseCents)}), so this row prices ${method} runs only.`;
  return { cents: base.baseCents, placeholder: base.placeholder, text };
}

export const setBaseCostTool = defineTool({
  name: 'set_base_cost',
  description:
    "Set (or update) the garment + print + margin cost for a blank at a print service and quantity break (qtyFrom defaults to 1). These rows price runs (bulk orders) printed DTG, DTF or with embroidery, by quantity break, and embroidered shop products. They do NOT set what a DTG/DTF shop product costs: that is the garment's shop price, set with set_shop_price (or at Admin → Pricing → Shop products), and a garment uses its one-piece DTG row (DTF where it has no DTG) only as a placeholder until its shop price is set. The result's note says which applies. Screen print has no rows: runs are priced by screen count in the screen-print table. Sensitive action: shows a confirm card and only executes once the admin clicks confirm.",
  input: z
    .object({
      blankCode: z.string().min(2).max(20),
      printServiceCode: z.string().min(2).max(40),
      qtyFrom: z.number().int().positive().optional(),
      garmentCostCents: z.number().int().nonnegative(),
      printCostCents: z.number().int().nonnegative(),
      marginCents: z.number().int().nonnegative(),
    })
    .strict(),
  scope: 'staff',
  access: { area: 'catalogue', level: 'manage' },
  confirm: true,
  summarize: (input) =>
    `Set base cost for ${input.blankCode} / ${input.printServiceCode} (qty ${input.qtyFrom ?? 1}+): garment €${(input.garmentCostCents / 100).toFixed(2)} + print €${(input.printCostCents / 100).toFixed(2)} + margin €${(input.marginCents / 100).toFixed(2)}.`,
  run: async (_ctx, input): Promise<ToolResult<SetBaseCostData>> => {
    const result = await setBaseCost(input);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`set_base_cost_err_${randomUUID()}`, result.error)] } };

    const total = result.value.totalCents ?? input.garmentCostCents + input.printCostCents + input.marginCents;
    const shop = await shopPriceNote(input.blankCode, input.printServiceCode);
    return {
      data: { ok: true, totalCents: total, ...(shop ? { shopPriceCents: shop.cents, shopPricePlaceholder: shop.placeholder, note: shop.text } : {}) },
      ui: {
        cards: [
          {
            id: `notice_basecost_${randomUUID()}`,
            kind: 'notice',
            tone: 'success',
            text: `Saved — €${(total / 100).toFixed(2)} total for ${input.blankCode} / ${input.printServiceCode} at qty ${input.qtyFrom ?? 1}+.${shop ? ` ${shop.text}` : ''}`,
          },
        ],
      },
    };
  },
});

interface SetShopPriceData {
  ok: boolean;
  error?: string;
  blankCode?: string;
  /** the garment's base price for shop products; null when it is back on its placeholder */
  priceCents?: number | null;
  /** DTF's own price, when it has one */
  dtfPriceCents?: number | null;
  /** what the placeholder is, for a garment taken back to it */
  placeholderCents?: number | null;
  /** what products of the garment cost with each mix of print areas, in words */
  examples?: string[];
}

export const setShopPriceTool = defineTool({
  name: 'set_shop_price',
  description:
    "Set what a garment costs an artist as a shop product (print on demand, DTG/DTF): its base price, which includes one print area up to A2 on the front or the back, in the shop price table (the same as Admin → Pricing → Shop products). The extras go on top for every garment: +€1 when a product prints front and back, +€2 once for sleeve prints (the owner changes them on that page). dtfPriceCents sets a DTF price when DTF costs differently; left out, a DTF price the garment already has is kept; null, DTF uses the base price. priceCents null takes the garment back to its placeholder (its one-piece DTG base cost). New products, area changes and drafts published from now on use it; products already live keep their base price. Runs are priced separately (set_base_cost rows, the screen-print table). Sensitive action: shows a confirm card and only executes once the admin clicks confirm.",
  input: z
    .object({
      blankCode: z.string().min(2).max(20),
      priceCents: z.number().int().positive().max(100_000).nullable().describe('The base price in cents, e.g. 1700 for €17. null: back to the placeholder.'),
      dtfPriceCents: z.number().int().positive().max(100_000).nullable().optional().describe('A DTF price in cents when DTF costs differently. Left out: keep the one it has. null: DTF uses the base price.'),
    })
    .strict(),
  scope: 'staff',
  access: { area: 'catalogue', level: 'manage' },
  confirm: true,
  summarize: (input) =>
    input.priceCents === null
      ? `Take ${input.blankCode} back to its placeholder shop price.`
      : `Set the shop price of ${input.blankCode} to ${euro(input.priceCents)}${input.dtfPriceCents ? `, DTF ${euro(input.dtfPriceCents)}` : input.dtfPriceCents === null ? ', DTF at the same price' : ''}: one print area up to A2, +€1 front and back, +€2 for sleeves.`,
  run: async (ctx, input): Promise<ToolResult<SetShopPriceData>> => {
    const code = input.blankCode.trim().toUpperCase();
    const fail = (error: string): ToolResult<SetShopPriceData> => ({ data: { ok: false, error }, ui: { cards: [errorNotice(`set_shop_price_err_${randomUUID()}`, error)] } });
    if (input.priceCents === null && input.dtfPriceCents) return fail('A DTF price needs a base price: set priceCents too, or leave the DTF price out.');

    // A DTF price left out stays as it is; the table keeps whole entries, so it is carried over here.
    const current = garmentPriceOf((await getPodPriceTableState()).table, code);
    const dtfCents = input.dtfPriceCents === undefined ? current?.dtfCents : (input.dtfPriceCents ?? undefined);
    const entry = input.priceCents === null ? null : { cents: input.priceCents, ...(dtfCents !== undefined ? { dtfCents } : {}) };
    const saved = await setPodPrices(actorOf(ctx), { garments: { [code]: entry } });
    if (!saved.ok) return fail(saved.error);

    const price = garmentPriceOf(saved.value.table, code);
    const extras = saved.value.table.extras;
    if (!price) {
      const placeholder = (await resolvePodBase(code, 'dtg'))?.baseCents ?? null;
      const text = `${code} is back on its placeholder shop price${placeholder !== null ? `, ${euro(placeholder)} (its one-piece DTG base cost)` : ''}.`;
      return {
        data: { ok: true, blankCode: code, priceCents: null, dtfPriceCents: null, placeholderCents: placeholder },
        ui: { cards: [{ id: `notice_shop_price_${randomUUID()}`, kind: 'notice', tone: 'success', text }] },
      };
    }
    const examples = podExampleRows(price.cents, extras).map((row) => `${row.label}: ${euro(row.totalCents)}`);
    const text = `Saved: a shop ${code} is ${euro(price.cents)} with one print${price.dtfCents !== undefined ? ` (DTF ${euro(price.dtfCents)})` : ''}. ${examples.join(' · ')}.`;
    return {
      data: { ok: true, blankCode: code, priceCents: price.cents, dtfPriceCents: price.dtfCents ?? null, examples },
      ui: { cards: [{ id: `notice_shop_price_${randomUUID()}`, kind: 'notice', tone: 'success', text }] },
    };
  },
});

interface UpdateShippingZoneData {
  ok: boolean;
  error?: string;
  id?: string;
  flatCents?: number;
}

export const updateShippingZoneTool = defineTool({
  name: 'update_shipping_zone',
  description:
    "Update a shipping zone's name, countries, flat rate, free-over threshold, or active flag. Sensitive action: shows a confirm card and only executes once the admin clicks confirm.",
  input: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1).max(80).optional(),
      countries: z.array(z.string().length(2)).optional(),
      flatCents: z.number().int().nonnegative().optional(),
      freeOverCents: z.number().int().nonnegative().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
  scope: 'staff',
  access: { area: 'catalogue', level: 'manage' },
  confirm: true,
  summarize: (input) => `Update shipping zone ${input.id}${input.flatCents !== undefined ? ` — flat €${(input.flatCents / 100).toFixed(2)}` : ''}.`,
  run: async (_ctx, input): Promise<ToolResult<UpdateShippingZoneData>> => {
    const { id, ...patch } = input;
    const result = await updateShippingZone(id, patch);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`update_zone_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, id: result.value.id, flatCents: result.value.flatCents },
      ui: {
        cards: [
          {
            id: `notice_zone_${result.value.id}`,
            kind: 'notice',
            tone: 'success',
            text: `${result.value.name} — €${(result.value.flatCents / 100).toFixed(2)} flat.`,
          },
        ],
      },
    };
  },
});

interface ListBaseCostsData {
  ok: boolean;
  error?: string;
  total?: number;
  /** what a DTG shop product of the garment costs with one print: its shop price, or the placeholder it stands on */
  shopPriceCents?: number;
  shopPricePlaceholder?: boolean;
}

export const listBaseCostsTool = defineTool({
  name: 'list_base_costs',
  description:
    "List every quantity-break base cost row for a blank (totals only, by print service and qty break): what runs cost. Also says what a shop product of the garment costs with one print (its shop price from the shop price table, or the placeholder it stands on until one is set).",
  input: z.object({ blankCode: z.string().min(2).max(20) }).strict(),
  scope: 'staff',
  access: { area: 'catalogue', level: 'view' },
  readOnly: true,
  run: async (_ctx, input): Promise<ToolResult<ListBaseCostsData>> => {
    const rows = await listBaseCosts(input.blankCode);
    if (rows.length === 0) {
      const text = `No base costs configured for ${input.blankCode}.`;
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`list_base_costs_err_${randomUUID()}`, text)] } };
    }

    const shop = await resolvePodBase(input.blankCode, 'dtg');
    const shopWords = shop ? ` Shop product, one print: ${euro(shop.baseCents)}${shop.placeholder ? ' (placeholder until a shop price is set)' : ' (shop price table)'}.` : '';
    const card: Card = {
      id: `quote_${randomUUID()}`,
      kind: 'quote',
      title: `Base costs — ${input.blankCode}`,
      lines: rows.map((r) => ({ label: `${r.printServiceCode} · ${r.qtyFrom}+`, qty: r.qtyFrom, unitCents: r.totalCents ?? 0, totalCents: r.totalCents ?? 0 })),
      totalCents: rows[0]?.totalCents ?? 0,
      currency: 'EUR',
      note: `Totals only — garment/print/margin components are admin-internal. These rows price runs.${shopWords}`,
    };

    return { data: { ok: true, total: rows.length, ...(shop ? { shopPriceCents: shop.baseCents, shopPricePlaceholder: shop.placeholder } : {}) }, ui: { cards: [card] } };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ADMIN_TOOLS: Tool<any, any>[] = [
  adminQueueTool,
  listProductionTool,
  advanceProductionTool,
  setTrackingTool,
  draftSupplierOrderTool,
  placeSupplierOrderTool,
  receiveSupplierOrderTool,
  listSupplierOrdersTool,
  listPayoutAnomaliesTool,
  reviewPayoutTool,
  setBaseCostTool,
  setShopPriceTool,
  updateShippingZoneTool,
  listBaseCostsTool,
];

export type { ProductionStatus };
