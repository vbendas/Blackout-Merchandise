import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import {
  approveBulkProof,
  cancelBulk,
  createBulkQuote,
  getBulkOrder,
  listBulkOrders,
  requestBulkChanges,
  submitBulkProof,
  type BulkOrderDetail,
  type BulkOrderListItem,
  type BulkOrderStatus,
} from '@/lib/services/bulk';
import { buildBulkCheckout } from '@/lib/services/checkout';
import { getLatestBulkProof, type ProofDetail, type ProofStatus } from '@/lib/services/proofs';
import type { Placement } from '@/lib/services/products';
import { getProjectCard } from '@/lib/services/conversations';
import type { Card, ToolUi } from '@/lib/ui-cards/schemas';

// Bulk order tools (service path B — Platform-Plan.md §0/§4/§6): an artist
// orders a run for themselves, from a shop product or brand-new artwork,
// shipped to their own address, quoted with quantity breaks at 25/50/100
// units, approved via a proof, and paid 100% up front to MerchFrom (no
// Stripe Connect transfer, unlike the fan storefront's POD sales). Every
// write here goes through lib/services/bulk.ts, which owns the bulk_orders
// state machine; nothing here touches the DB directly. Tools that act on
// "the current bulk order" accept an optional bulkOrderId and fall back to
// the conversation's project card (kind 'bulk_order'), mirroring how
// lib/tools/products.ts resolves an omitted productId.

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

function noStore(): { data: { ok: false; error: string } } {
  return { data: { ok: false, error: 'No shop found for this account yet.' } };
}

async function resolveBulkOrderId(ctx: ToolContext, explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const card = await getProjectCard(ctx.conversationId);
  if (card && card.kind === 'bulk_order' && card.refId) return card.refId;
  return null;
}

/** A line with neither productId nor blankCode means "whatever I have open" —
 * reuse the product currently in the project card (kind 'product'), or fall
 * back to the default demo blank. Mirrors products.ts's resolveProductId
 * fallback, one level down (a quote line instead of a whole tool call). */
async function resolveDefaultLineSpec(ctx: ToolContext): Promise<{ productId?: string; blankCode?: string; printServiceCode?: string; placement?: Placement }> {
  const card = await getProjectCard(ctx.conversationId);
  if (card && card.kind === 'product' && card.refId) return { productId: card.refId };
  return { blankCode: 'STSU177', printServiceCode: 'screen_1c', placement: { position: 'front_chest', widthCm: 28 } };
}

function shipToLabel(detail: BulkOrderDetail): string {
  return `${detail.shipTo.name}, ${detail.shipTo.line1}, ${detail.shipTo.city} ${detail.shipTo.postcode}, ${detail.shipTo.country}`;
}

function bulkQuoteCard(detail: BulkOrderDetail, checkoutUrl?: string): Card {
  return {
    id: `bulk_quote_${detail.id}`,
    kind: 'bulk_quote',
    title: `Bulk order — ${detail.lines.length} line${detail.lines.length === 1 ? '' : 's'}`,
    bulkOrderId: detail.id,
    status: detail.status,
    lines: detail.lines.map((l) => ({
      label: l.label,
      colour: l.colourName,
      sizes: Object.entries(l.sizes)
        .map(([size, qty]) => `${size}×${qty}`)
        .join(', '),
      qty: l.qty,
      unitCents: l.unitCents,
      totalCents: l.totalCents,
    })),
    setupCents: detail.setupCents,
    shippingCents: detail.shippingCents,
    totalCents: detail.totalCents,
    shipTo: shipToLabel(detail),
    leadTime: detail.leadTime,
    ...(checkoutUrl ? { checkoutUrl, actions: [{ label: 'Pay now', href: checkoutUrl, variant: 'primary' as const }] } : {}),
  };
}

function bulkProofCard(proof: ProofDetail): Card {
  return {
    id: `proof_${proof.id}_v${proof.version}`,
    kind: 'proof',
    title: `Bulk proof v${proof.version}`,
    proofId: proof.id,
    version: proof.version,
    mockupUrls: proof.mockupUrls,
    spec: proof.spec,
    status: proof.status,
  };
}

function projectFor(detail: BulkOrderDetail): NonNullable<ToolUi['project']> {
  return {
    kind: 'bulk_order',
    refId: detail.id,
    state: {
      bulkOrderId: detail.id,
      lines: detail.lines.map((l) => ({ label: l.label, colour: l.colourName, sizes: Object.keys(l.sizes).join(', '), qty: l.qty, totalCents: l.totalCents })),
      totalCents: detail.totalCents,
      status: detail.status,
      shipTo: shipToLabel(detail),
    },
  };
}

const bulkSizesSchema = z.record(z.string().min(1).max(6), z.number().int().min(0).max(10000)).refine((sizes) => Object.values(sizes).some((qty) => qty > 0), {
  message: 'At least one size needs a quantity greater than zero.',
});

const bulkPlacementSchema = z.object({
  position: z.string().min(1).max(40).describe("e.g. 'front_chest', 'front_full', 'back', 'sleeve', 'centre'."),
  widthCm: z.number().positive().max(200).describe('Print width in cm on the garment.'),
  offsetYcm: z.number().optional(),
});

const bulkLineSchema = z
  .object({
    productId: z.string().uuid().optional().describe('Reuse an existing shop product for this line (its blank, print service and placement).'),
    designId: z.string().uuid().optional().describe('Design to print, when this line is brand-new artwork rather than an existing product.'),
    blankCode: z.string().min(2).max(20).optional().describe('Required with printServiceCode + placement when productId is omitted.'),
    printServiceCode: z.string().min(2).max(40).optional(),
    placement: bulkPlacementSchema.optional(),
    colourCode: z.string().min(1).max(10),
    sizes: bulkSizesSchema.describe('Size code -> quantity, e.g. { "S": 8, "M": 8, "L": 8, "XL": 8, "XXL": 8 }.'),
  })
  .strict();

const bulkShipToSchema = z
  .object({
    name: z.string().min(1).max(120),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(120),
    postcode: z.string().min(1).max(20),
    country: z.string().length(2).describe('ISO-2 country code, e.g. ES.'),
  })
  .strict();

// ---------------------------------------------------------------------------

interface CreateBulkQuoteData {
  ok: boolean;
  error?: string;
  bulkOrderId?: string;
  totalCents?: number;
  status?: BulkOrderStatus;
}

export const createBulkQuoteTool = defineTool({
  name: 'create_bulk_quote',
  description:
    'Quote a bulk run for the artist to order for themselves — the "bulk order" path (as opposed to a fan buying from the public shop). It ships to the artist\'s own address and is paid 100% up front, no Stripe split. Each line is either an existing shop product (productId) or new artwork on a blank (blankCode + printServiceCode + placement, optionally designId), plus a colour and a size -> quantity map. Pricing uses quantity breaks at 25/50/100 units per line, a one-time setup fee per distinct print service, and flat-zone shipping scaled to the total unit count. Returns a bulk_quote card and sets this bulk order as the conversation\'s active project, so later tools (submit_bulk_proof, approve_bulk_proof, pay_bulk_order, ...) can omit bulkOrderId.',
  input: z.object({ lines: z.array(bulkLineSchema).min(1), shipTo: bulkShipToSchema }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<CreateBulkQuoteData>> => {
    if (!ctx.storeId) return noStore();

    const lines = await Promise.all(
      input.lines.map(async (line) => (line.productId || line.blankCode ? line : { ...line, ...(await resolveDefaultLineSpec(ctx)) })),
    );

    const result = await createBulkQuote({ storeId: ctx.storeId, lines, shipTo: input.shipTo });
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`bulk_quote_err_${randomUUID()}`, result.error)] } };
    }

    const detail = result.value;
    return {
      data: { ok: true, bulkOrderId: detail.id, totalCents: detail.totalCents, status: detail.status },
      ui: {
        cards: [bulkQuoteCard(detail)],
        next: [
          { label: 'Send the bulk proof', prompt: 'Send the bulk proof', primary: true },
          { label: 'Change the shipping address', prompt: 'Change the bulk order shipping address' },
        ],
        project: projectFor(detail),
      },
    };
  },
});

interface GetBulkOrderData {
  ok: boolean;
  error?: string;
  bulkOrderId?: string;
  status?: BulkOrderStatus;
  totalCents?: number;
}

export const getBulkOrderTool = defineTool({
  name: 'get_bulk_order',
  description: 'Get full details for one bulk order (lines, pricing, status, ship-to address). Omit bulkOrderId to show the bulk order currently open in this conversation.',
  input: z.object({ bulkOrderId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetBulkOrderData>> => {
    if (!ctx.storeId) return noStore();
    const bulkOrderId = await resolveBulkOrderId(ctx, input.bulkOrderId);
    if (!bulkOrderId) return { data: { ok: false, error: 'No bulk order to show — create a quote first.' } };

    const detail = await getBulkOrder(ctx.storeId, bulkOrderId);
    if (!detail) {
      const text = 'Bulk order not found for this shop.';
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`get_bulk_err_${randomUUID()}`, text)] } };
    }

    return {
      data: { ok: true, bulkOrderId: detail.id, status: detail.status, totalCents: detail.totalCents },
      ui: { cards: [bulkQuoteCard(detail, detail.checkoutSessionId ?? undefined)], project: projectFor(detail) },
    };
  },
});

interface ListBulkOrdersData {
  ok: boolean;
  total?: number;
  items?: BulkOrderListItem[];
}

export const listBulkOrdersTool = defineTool({
  name: 'list_bulk_orders',
  description: "List the artist's bulk orders, newest first, with status and totals. Each row's prompt opens it with get_bulk_order.",
  input: z.object({}).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx): Promise<ToolResult<ListBulkOrdersData>> => {
    if (!ctx.storeId) return noStore();
    const items = await listBulkOrders(ctx.storeId);

    const card: Card = {
      id: `bulk_orders_table_${randomUUID()}`,
      kind: 'orders_table',
      title: 'Your bulk orders',
      rows: items.map((i) => ({
        orderId: i.id,
        reference: `BULK-${i.id.slice(0, 8).toUpperCase()}`,
        placedAt: i.createdAt.toISOString(),
        status: i.status,
        grossCents: i.totalCents,
        prompt: `Open bulk order ${i.id}`,
      })),
      total: items.length,
    };

    return { data: { ok: true, total: items.length, items }, ui: { cards: [card] } };
  },
});

interface SubmitBulkProofData {
  ok: boolean;
  error?: string;
  proofId?: string;
  version?: number;
  status?: ProofStatus;
}

export const submitBulkProofTool = defineTool({
  name: 'submit_bulk_proof',
  description:
    'Submit the current bulk quote for approval, moving it from "quoted" to "proof_pending". Omit bulkOrderId to submit a proof for the bulk order currently open in this conversation. Returns a proof card the artist can approve with approve_bulk_proof, or send back with request_bulk_changes.',
  input: z.object({ bulkOrderId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<SubmitBulkProofData>> => {
    if (!ctx.storeId) return noStore();
    const bulkOrderId = await resolveBulkOrderId(ctx, input.bulkOrderId);
    if (!bulkOrderId) return { data: { ok: false, error: 'No bulk order to submit — create a quote first.' } };

    const result = await submitBulkProof(ctx.storeId, bulkOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`submit_bulk_proof_err_${randomUUID()}`, result.error)] } };

    const detail = await getBulkOrder(ctx.storeId, bulkOrderId);
    if (!detail) return { data: { ok: false, error: 'Bulk order not found after submitting the proof.' } };

    return {
      data: { ok: true, proofId: result.value.id, version: result.value.version, status: result.value.status },
      ui: {
        cards: [bulkProofCard(result.value), bulkQuoteCard(detail)],
        next: [
          { label: 'Approve the bulk proof', prompt: 'Approve the bulk proof', primary: true },
          { label: 'Request changes', prompt: 'Request changes to the bulk proof' },
        ],
        project: projectFor(detail),
      },
    };
  },
});

interface ApproveBulkProofData {
  ok: boolean;
  error?: string;
  proofId?: string;
  status?: ProofStatus;
}

export const approveBulkProofTool = defineTool({
  name: 'approve_bulk_proof',
  description:
    'Approve a pending bulk proof so the order is ready for payment, moving it to "awaiting_payment". Sensitive action: shows a confirm card and only executes once the human clicks confirm. Omit proofId to approve the latest pending proof for the bulk order currently open in this conversation.',
  input: z.object({ proofId: z.string().uuid().optional(), bulkOrderId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: () => 'Approve the bulk order proof.',
  run: async (ctx, input): Promise<ToolResult<ApproveBulkProofData>> => {
    if (!ctx.storeId) return noStore();
    const bulkOrderId = await resolveBulkOrderId(ctx, input.bulkOrderId);

    let proofId = input.proofId;
    if (!proofId) {
      if (!bulkOrderId) return { data: { ok: false, error: 'No bulk proof to approve — submit one first.' } };
      const latest = await getLatestBulkProof(ctx.storeId, bulkOrderId);
      if (!latest) return { data: { ok: false, error: 'No proof found for this bulk order.' } };
      proofId = latest.id;
    }

    const result = await approveBulkProof(ctx.storeId, proofId, ctx.userId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`approve_bulk_proof_err_${randomUUID()}`, result.error)] } };

    const finalBulkOrderId = bulkOrderId ?? result.value.bulkOrderId ?? undefined;
    const detail = finalBulkOrderId ? await getBulkOrder(ctx.storeId, finalBulkOrderId) : null;

    return {
      data: { ok: true, proofId: result.value.id, status: result.value.status },
      ui: {
        cards: detail ? [bulkProofCard(result.value), bulkQuoteCard(detail)] : [bulkProofCard(result.value)],
        next: detail ? [{ label: 'Pay the bulk order', prompt: 'Pay the bulk order', primary: true }] : undefined,
        project: detail ? projectFor(detail) : undefined,
      },
    };
  },
});

interface RequestBulkChangesData {
  ok: boolean;
  error?: string;
  proofId?: string;
  status?: ProofStatus;
}

export const requestBulkChangesTool = defineTool({
  name: 'request_bulk_changes',
  description:
    'Send a pending bulk proof back for changes with notes, moving the bulk order back to "quoted". Omit proofId to target the latest pending proof for the bulk order currently open in this conversation.',
  input: z.object({ proofId: z.string().uuid().optional(), bulkOrderId: z.string().uuid().optional(), notes: z.string().min(1).max(1000) }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<RequestBulkChangesData>> => {
    if (!ctx.storeId) return noStore();
    const bulkOrderId = await resolveBulkOrderId(ctx, input.bulkOrderId);

    let proofId = input.proofId;
    if (!proofId) {
      if (!bulkOrderId) return { data: { ok: false, error: 'No bulk proof to update — submit one first.' } };
      const latest = await getLatestBulkProof(ctx.storeId, bulkOrderId);
      if (!latest) return { data: { ok: false, error: 'No proof found for this bulk order.' } };
      proofId = latest.id;
    }

    const result = await requestBulkChanges(ctx.storeId, proofId, input.notes);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`request_bulk_changes_err_${randomUUID()}`, result.error)] } };

    const finalBulkOrderId = bulkOrderId ?? result.value.bulkOrderId ?? undefined;
    const detail = finalBulkOrderId ? await getBulkOrder(ctx.storeId, finalBulkOrderId) : null;

    return {
      data: { ok: true, proofId: result.value.id, status: result.value.status },
      ui: {
        cards: detail ? [bulkProofCard(result.value), bulkQuoteCard(detail)] : [bulkProofCard(result.value)],
        next: detail ? [{ label: 'Send a new proof', prompt: 'Send the bulk proof' }] : undefined,
        project: detail ? projectFor(detail) : undefined,
      },
    };
  },
});

interface PayBulkOrderData {
  ok: boolean;
  error?: string;
  bulkOrderId?: string;
  checkoutUrl?: string;
}

export const payBulkOrderTool = defineTool({
  name: 'pay_bulk_order',
  description:
    'Start checkout for an approved bulk order (must be "awaiting_payment"). Returns a bulk_quote card with a "Pay now" link to a Stripe Checkout Session charging 100% to MerchFrom — no split with the artist, since this is their own order, not a fan sale. Omit bulkOrderId to pay the bulk order currently open in this conversation.',
  input: z.object({ bulkOrderId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<PayBulkOrderData>> => {
    if (!ctx.storeId) return noStore();
    const bulkOrderId = await resolveBulkOrderId(ctx, input.bulkOrderId);
    if (!bulkOrderId) return { data: { ok: false, error: 'No bulk order to pay — approve a proof first.' } };

    const result = await buildBulkCheckout(ctx.storeId, bulkOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`pay_bulk_err_${randomUUID()}`, result.error)] } };

    const detail = await getBulkOrder(ctx.storeId, bulkOrderId);
    if (!detail) return { data: { ok: false, error: 'Bulk order not found after starting checkout.' } };

    return {
      data: { ok: true, bulkOrderId, checkoutUrl: result.value.url },
      ui: { cards: [bulkQuoteCard(detail, result.value.url)], project: projectFor(detail) },
    };
  },
});

interface CancelBulkOrderData {
  ok: boolean;
  error?: string;
  bulkOrderId?: string;
  status?: BulkOrderStatus;
}

export const cancelBulkOrderTool = defineTool({
  name: 'cancel_bulk_order',
  description:
    'Cancel a bulk order that has not been paid yet (quoted, proof_pending or awaiting_payment). Sensitive action: shows a confirm card and only executes once the human clicks confirm. Omit bulkOrderId to cancel the bulk order currently open in this conversation.',
  input: z.object({ bulkOrderId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: () => 'Cancel this bulk order.',
  run: async (ctx, input): Promise<ToolResult<CancelBulkOrderData>> => {
    if (!ctx.storeId) return noStore();
    const bulkOrderId = await resolveBulkOrderId(ctx, input.bulkOrderId);
    if (!bulkOrderId) return { data: { ok: false, error: 'No bulk order to cancel.' } };

    const result = await cancelBulk(ctx.storeId, bulkOrderId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`cancel_bulk_err_${randomUUID()}`, result.error)] } };

    const detail = result.value;
    return {
      data: { ok: true, bulkOrderId: detail.id, status: detail.status },
      ui: { cards: [bulkQuoteCard(detail)], project: projectFor(detail) },
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BULK_TOOLS: Tool<any, any>[] = [
  createBulkQuoteTool,
  getBulkOrderTool,
  listBulkOrdersTool,
  submitBulkProofTool,
  approveBulkProofTool,
  requestBulkChangesTool,
  payBulkOrderTool,
  cancelBulkOrderTool,
];
