import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolResult } from '@/lib/tools/types';
import { buildQueue } from '@/lib/services/admin-queue';
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
  getSupplierOrder,
  listSupplierOrders,
  placeSupplierOrder,
  receiveSupplierOrder,
  type SupplierOrderDetail,
} from '@/lib/services/supplier';
import { listAnomalies, reviewPayout } from '@/lib/services/payouts';
import { setBaseCost, listBaseCosts, updateShippingZone } from '@/lib/services/pricing-admin';
import { getOrder, type OrderDetail } from '@/lib/services/orders';
import type { Card } from '@/lib/ui-cards/schemas';

// Admin tools (Platform-Plan.md §4 "Admin"). Every write here goes through
// lib/services/{production,supplier,payouts,pricing-admin}.ts — nothing here
// touches the DB directly. Scope is 'admin' throughout; the registry hides
// these from artist callers.

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

// Duplicated from lib/tools/commerce.ts (not owned here) rather than
// exporting a shared helper from it — keeps this file's dependency surface
// limited to services, per the "services are the only writers, tools are
// thin wrappers" rule.
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

function supplierOrderCard(detail: SupplierOrderDetail): Card {
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
    actions:
      detail.status === 'draft'
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

function adminQueueCard(queue: Awaited<ReturnType<typeof buildQueue>>): Card {
  return {
    id: `admin_queue_${randomUUID()}`,
    kind: 'admin_queue',
    title: "What's waiting",
    sections: queue.sections,
    generatedAt: queue.generatedAt,
  };
}

export const adminQueueTool = defineTool({
  name: 'admin_queue',
  description:
    "Show everything waiting on the admin: unreviewed payout anomalies, orders in production, bulk orders stuck awaiting payment, draft supplier orders, stuck domain verifications, pending waitlist entries and open support tickets. Call this when the admin asks what's waiting, for their queue, or greets admin chat with no other context.",
  input: z.object({}).strict(),
  scope: 'admin',
  readOnly: true,
  run: async (): Promise<ToolResult<{ ok: true; total: number }>> => {
    const queue = await buildQueue();
    const total = queue.sections.reduce((sum, s) => sum + s.count, 0);
    return {
      data: { ok: true, total },
      ui: {
        cards: [adminQueueCard(queue)],
        next: [
          { label: 'Production queue', prompt: 'Show the production queue' },
          { label: 'Payout anomalies', prompt: 'Show payout anomalies' },
          { label: 'Draft supplier order', prompt: 'Draft a supplier order from queued orders' },
        ],
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
  scope: 'admin',
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
  scope: 'admin',
  // Shipping notifies the fan and the artist; a human confirms that step.
  confirmWhen: (input) => input.to === 'shipped',
  summarize: (input) => `Mark order ${input.orderId} as shipped${input.tracking ? ` (${input.tracking.carrier} ${input.tracking.code})` : ''}`,
  run: async (_ctx, input): Promise<ToolResult<AdvanceProductionData>> => {
    const result = await advance(input.orderId, input.to, input.tracking);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`advance_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, orderId: result.value.id, productionStatus: result.value.productionStatus ?? undefined },
      ui: { cards: [orderCard(result.value)], next: [{ label: 'Production queue', prompt: 'Show the production queue' }] },
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
  scope: 'admin',
  run: async (_ctx, input): Promise<ToolResult<SetTrackingData>> => {
    const result = await setTracking(input.orderId, { carrier: input.carrier, code: input.code, url: input.url });
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`set_tracking_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, orderId: result.value.id },
      ui: {
        cards: [orderCard(result.value)],
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
  scope: 'admin',
  run: async (_ctx, input): Promise<ToolResult<DraftSupplierOrderData>> => {
    const result = await draftSupplierOrder({ orderIds: input.orderIds });
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`draft_supplier_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, supplierOrderId: result.value.id, totalUnits: result.value.totalUnits },
      ui: { cards: [supplierOrderCard(result.value)], next: [{ label: 'Place order', prompt: `Place supplier order ${result.value.id}`, primary: true }] },
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
  scope: 'admin',
  confirm: true,
  summarize: (input) => `Place supplier order ${input.supplierOrderId}.`,
  run: async (_ctx, input): Promise<ToolResult<PlaceSupplierOrderData>> => {
    const result = await placeSupplierOrder(input.supplierOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`place_supplier_err_${randomUUID()}`, result.error)] } };

    return { data: { ok: true, supplierOrderId: result.value.id, status: result.value.status }, ui: { cards: [supplierOrderCard(result.value)] } };
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
  scope: 'admin',
  run: async (_ctx, input): Promise<ToolResult<ReceiveSupplierOrderData>> => {
    const result = await receiveSupplierOrder(input.supplierOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`receive_supplier_err_${randomUUID()}`, result.error)] } };

    return { data: { ok: true, supplierOrderId: result.value.id, status: result.value.status }, ui: { cards: [supplierOrderCard(result.value)] } };
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
  scope: 'admin',
  readOnly: true,
  run: async (_ctx, input): Promise<ToolResult<ListSupplierOrdersData>> => {
    const rows = await listSupplierOrders(input.status);
    return {
      data: { ok: true, total: rows.length },
      ui: { cards: rows.slice(0, 6).map(supplierOrderCard), next: [{ label: 'Draft from queued', prompt: 'Draft a supplier order from queued orders' }] },
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
  scope: 'admin',
  readOnly: true,
  run: async (): Promise<ToolResult<ListPayoutAnomaliesData>> => {
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
          prompt: `Review payout ${r.id}`,
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
      ui: { cards: [card], next: [{ label: "What's waiting", prompt: "What's waiting on me?" }] },
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
  scope: 'admin',
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
}

export const setBaseCostTool = defineTool({
  name: 'set_base_cost',
  description:
    "Set (or update) the garment + print + margin cost for a blank at a print service and quantity break (qtyFrom defaults to 1). Sensitive action: shows a confirm card and only executes once the admin clicks confirm.",
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
  scope: 'admin',
  confirm: true,
  summarize: (input) =>
    `Set base cost for ${input.blankCode} / ${input.printServiceCode} (qty ${input.qtyFrom ?? 1}+): garment €${(input.garmentCostCents / 100).toFixed(2)} + print €${(input.printCostCents / 100).toFixed(2)} + margin €${(input.marginCents / 100).toFixed(2)}.`,
  run: async (_ctx, input): Promise<ToolResult<SetBaseCostData>> => {
    const result = await setBaseCost(input);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`set_base_cost_err_${randomUUID()}`, result.error)] } };

    const total = result.value.totalCents ?? input.garmentCostCents + input.printCostCents + input.marginCents;
    return {
      data: { ok: true, totalCents: total },
      ui: {
        cards: [
          {
            id: `notice_basecost_${randomUUID()}`,
            kind: 'notice',
            tone: 'success',
            text: `Saved — €${(total / 100).toFixed(2)} total for ${input.blankCode} / ${input.printServiceCode} at qty ${input.qtyFrom ?? 1}+.`,
          },
        ],
      },
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
  scope: 'admin',
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
}

export const listBaseCostsTool = defineTool({
  name: 'list_base_costs',
  description: "List every quantity-break base cost row for a blank (totals only, by print service and qty break).",
  input: z.object({ blankCode: z.string().min(2).max(20) }).strict(),
  scope: 'admin',
  readOnly: true,
  run: async (_ctx, input): Promise<ToolResult<ListBaseCostsData>> => {
    const rows = await listBaseCosts(input.blankCode);
    if (rows.length === 0) {
      const text = `No base costs configured for ${input.blankCode}.`;
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`list_base_costs_err_${randomUUID()}`, text)] } };
    }

    const card: Card = {
      id: `quote_${randomUUID()}`,
      kind: 'quote',
      title: `Base costs — ${input.blankCode}`,
      lines: rows.map((r) => ({ label: `${r.printServiceCode} · ${r.qtyFrom}+`, qty: r.qtyFrom, unitCents: r.totalCents ?? 0, totalCents: r.totalCents ?? 0 })),
      totalCents: rows[0]?.totalCents ?? 0,
      currency: 'EUR',
      note: 'Totals only — garment/print/margin components are admin-internal.',
    };

    return { data: { ok: true, total: rows.length }, ui: { cards: [card] } };
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
  updateShippingZoneTool,
  listBaseCostsTool,
];

export type { ProductionStatus };
