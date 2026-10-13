import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import {
  approveBulkProof,
  cancelBulk,
  createBulkQuote,
  getBulkOrder,
  requestBulkChanges,
  submitBulkProof,
  type BulkOrderDetail,
  type BulkOrderStatus,
} from '@/lib/services/bulk';
import { buildBulkCheckout } from '@/lib/services/checkout';
import { getLatestBulkProof, type ProofDetail, type ProofStatus } from '@/lib/services/proofs';
import { getProduct, type Placement } from '@/lib/services/products';
import { getProjectCard } from '@/lib/services/conversations';
import { listRunsForStore, runNumberFor } from '@/lib/services/runs';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { runLabel } from '@/lib/format/runs';
import { humanStatus } from '@/lib/format/status';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';

// Run tools (service path B — Platform-Plan.md §0/§4/§6). A run is what the
// artist calls a bulk order: a batch they order for themselves, from a shop
// product or brand-new artwork, shipped to their own address, quoted with
// quantity breaks at 25/50/100 units, approved via a proof, and paid 100% up
// front to MerchFrom (no Stripe Connect transfer, unlike the fan storefront's
// POD sales). Every write here goes through lib/services/bulk.ts, which owns
// the bulk_orders state machine; nothing here touches the DB directly.
//
// Artists and the model say "Run 3", never "bulk order" or an id: every card,
// error and result below carries the run's number (lib/services/runs.ts), and
// every tool that acts on a run takes `runNumber` as well as the internal id.
// With neither, a tool acts on the run open in the conversation (the project
// card, kind 'bulk_order'), mirroring how lib/tools/products.ts resolves an
// omitted productId.

// -- words ---------------------------------------------------------------

/** What the service layer says, in the artist's words: a run, not a bulk
 * order; a stage, not a status code; no supplier codes. */
const STAGE_PHRASES: Record<string, string> = {
  quoted: 'the quote stage',
  proof_pending: 'waiting for your OK on the proof',
  awaiting_payment: 'awaiting payment',
  paid: 'paid',
  in_production: 'in production',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

function plain(text: string): string {
  return text
    .replace(/\s*\((?:this bulk order is|status) "[a-z_]+"\)/gi, '')
    .replace(/"([a-z]+(?:_[a-z]+)*)"/g, (match, word: string) => STAGE_PHRASES[word] ?? match)
    .replace(/\bbulk orders\b/gi, 'runs')
    .replace(/\bbulk order\b/gi, 'run')
    .replace(/\s*\(ST[A-Z]{2}\d{3}\)/g, '');
}

function euro(cents: number): string {
  return `€${(cents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

function failure(idPrefix: string, error: string): { data: { ok: false; error: string }; ui: ToolUi } {
  const text = plain(error);
  return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`${idPrefix}_err_${randomUUID()}`, text)] } };
}

function noStore(): { data: { ok: false; error: string } } {
  return { data: { ok: false, error: 'No shop found for this account yet.' } };
}

// -- which run -----------------------------------------------------------

interface RunRef {
  /** the run's number in its shop; null only if it cannot be worked out */
  number: number | null;
  /** 'Run 3' */
  label: string;
}

/** For a proof that has no run to hang a number on. */
const NO_RUN: RunRef = { number: null, label: 'Your run' };

async function runRef(bulkOrderId: string): Promise<RunRef> {
  const number = await runNumberFor(bulkOrderId);
  return number === null ? NO_RUN : { number, label: runLabel(number) };
}

/** What a tool takes to name a run: its number (preferred) or the internal id. */
const runTarget = {
  runNumber: z
    .number()
    .int()
    .min(1)
    .max(100000)
    .optional()
    .describe('The run to act on, as the artist knows it: 3 for "Run 3". Preferred. Omit it (and bulkOrderId) to use the run open in this conversation.'),
  bulkOrderId: z
    .string()
    .uuid()
    .optional()
    .describe('Internal id, only if a tool result or notification gave you one. Never show it to the artist; use runNumber.'),
};

/** The run a call is about: a number within the caller's shop, an id, or the
 * run open in the conversation. null means none of these was given. */
async function resolveRunId(ctx: ToolContext, input: { runNumber?: number; bulkOrderId?: string }): Promise<{ id: string } | { error: string } | null> {
  if (input.runNumber !== undefined) {
    if (!ctx.storeId) return { error: 'No shop found for this account yet.' };
    const runs = await listRunsForStore(ctx.storeId);
    const run = runs.find((r) => r.number === input.runNumber);
    return run ? { id: run.id } : { error: `There is no ${runLabel(input.runNumber)} in this shop.` };
  }
  if (input.bulkOrderId) return { id: input.bulkOrderId };
  const card = await getProjectCard(ctx.conversationId);
  if (card && card.kind === 'bulk_order' && card.refId) return { id: card.refId };
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

// -- cards ---------------------------------------------------------------

function shipToLabel(detail: BulkOrderDetail): string {
  return `${detail.shipTo.name}, ${detail.shipTo.line1}, ${detail.shipTo.city} ${detail.shipTo.postcode}, ${detail.shipTo.country}`;
}

function totalPieces(detail: BulkOrderDetail): number {
  return detail.lines.reduce((sum, line) => sum + line.qty, 0);
}

function lineName(line: BulkOrderDetail['lines'][number]): string {
  return blankDisplayName(line.blankCode, line.blankName);
}

/** What the run is, the way the artist names it: 'Tour tee, black, 120 pieces'. */
async function runTitle(storeId: string, detail: BulkOrderDetail): Promise<string> {
  const first = detail.lines[0];
  if (!first) return 'Empty run';
  const pieces = totalPieces(detail);
  const count = `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`;

  let name = lineName(first);
  if (first.productId) {
    const product = await getProduct(storeId, first.productId).catch(() => null);
    if (product?.name) name = product.name;
  }

  const title = detail.lines.length > 1 ? `${name} and ${detail.lines.length - 1} more, ${count}` : `${name}, ${first.colourName.toLowerCase()}, ${count}`;
  return title.slice(0, 120);
}

function bulkQuoteCard(detail: BulkOrderDetail, run: RunRef, checkoutUrl?: string): Card {
  return {
    id: `bulk_quote_${detail.id}`,
    kind: 'bulk_quote',
    title: run.label,
    bulkOrderId: detail.id,
    status: detail.status,
    lines: detail.lines.map((l) => ({
      label: lineName(l),
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

/** The proof's spec rows are saved with the quote's line labels, which carry the
 * supplier's model name ('Cruiser 2.0 · Black · 40 pcs'); show the blank's name. */
function bulkProofCard(proof: ProofDetail, run: RunRef, detail?: BulkOrderDetail): Card {
  const lineLabels = new Map((detail?.lines ?? []).map((l) => [l.label, `${lineName(l)} · ${l.colourName} · ${l.qty} ${l.qty === 1 ? 'piece' : 'pieces'}`]));
  return {
    id: `proof_${proof.id}_v${proof.version}`,
    kind: 'proof',
    title: run.label,
    proofId: proof.id,
    version: proof.version,
    mockupUrls: proof.mockupUrls,
    spec: proof.spec.map((row) => ({ ...row, label: lineLabels.get(row.label) ?? row.label })),
    status: proof.status,
  };
}

// The stages of a run, in order. 'done' stages have a value of their own;
// the one it is at now says what is happening; the next one says 'Next' and
// the ones after it stay quiet (an empty value is not shown).
const STAGES = ['Brief', 'Proof', 'Payment', 'Production', 'Shipping'] as const;

const DONE_VALUE: Record<(typeof STAGES)[number], string> = {
  Brief: 'Done',
  Proof: 'Approved',
  Payment: 'Paid',
  Production: 'Done',
  Shipping: 'Delivered',
};

const CURRENT_VALUE: Record<(typeof STAGES)[number], string> = {
  Brief: 'Now',
  Proof: 'Waiting for you',
  Payment: 'Waiting for you',
  Production: 'On the press',
  Shipping: 'On its way',
};

/** How many stages are finished and which one is under way, by status. */
const PROGRESS: Record<Exclude<BulkOrderStatus, 'cancelled'>, { done: number; current: number | null }> = {
  quoted: { done: 1, current: null },
  proof_pending: { done: 1, current: 1 },
  awaiting_payment: { done: 2, current: 2 },
  paid: { done: 3, current: 3 },
  in_production: { done: 3, current: 3 },
  shipped: { done: 4, current: 4 },
  delivered: { done: 5, current: null },
};

type RunStep = { label: string; state: 'done' | 'current' | 'next'; value?: string };

function stepsFor(detail: BulkOrderDetail): RunStep[] {
  if (detail.status === 'cancelled') return [{ label: 'Cancelled', state: 'done', value: shortDate(detail.updatedAt) }];

  const progress = PROGRESS[detail.status];
  return STAGES.map((label, index): RunStep => {
    if (index < progress.done) return { label, state: 'done', value: DONE_VALUE[label] };
    if (index === progress.current) {
      // 'paid' is the moment between payment and the press.
      return { label, state: 'current', value: detail.status === 'paid' && label === 'Production' ? 'Starting soon' : CURRENT_VALUE[label] };
    }
    const upcoming = progress.current === null ? progress.done : progress.current + 1;
    return { label, state: 'next', value: index === upcoming ? 'Next' : '' };
  });
}

/** One plain sentence on where the run stands. */
function sentenceFor(detail: BulkOrderDetail): string {
  const total = euro(detail.totalCents);
  const city = detail.shipTo.city;
  switch (detail.status) {
    case 'quoted':
      return `Quoted at ${total}. Send the proof when you're ready.`;
    case 'proof_pending':
      return 'The proof is ready for your OK.';
    case 'awaiting_payment':
      return `Proof approved. Pay ${total} and production starts.`;
    case 'paid':
      return 'Paid. Production starts next.';
    case 'in_production':
      return 'On the press. Shipping comes next.';
    case 'shipped':
      return city ? `On its way to ${city}.` : 'On its way.';
    case 'delivered':
      return city ? `Delivered to ${city}.` : 'Delivered.';
    case 'cancelled':
      return 'This run was cancelled.';
    default:
      return humanStatus(detail.status);
  }
}

/** The next steps for a run at this stage, as messages to the assistant. */
function actionsFor(detail: BulkOrderDetail, label: string): Chip[] {
  const cancel: Chip = { label: 'Cancel this run', prompt: `Cancel ${label}` };
  switch (detail.status) {
    case 'quoted':
      return [{ label: 'Send the proof', prompt: `Send the proof for ${label}`, primary: true }, cancel];
    case 'proof_pending':
      return [
        { label: 'Approve the proof', prompt: `Approve the proof for ${label}`, primary: true },
        { label: 'Ask for changes', prompt: `Ask for changes to the proof for ${label}` },
        cancel,
      ];
    case 'awaiting_payment':
      return [{ label: 'Pay now', prompt: `Pay for ${label}`, primary: true }, cancel];
    default:
      return [{ label: 'All runs', prompt: 'Show my runs' }];
  }
}

/** The run as a card: its number, what it is (`title`, from runTitle), one
 * sentence, and its stages. */
function runCard(detail: BulkOrderDetail, run: RunRef, title: string, actions: Chip[] = []): Card | null {
  if (run.number === null) return null;
  return {
    id: `run_${detail.id}`,
    kind: 'run',
    bulkOrderId: detail.id,
    runNumber: run.number,
    title,
    description: sentenceFor(detail),
    imageUrl: detail.lines.find((l) => l.mockupUrl)?.mockupUrl ?? undefined,
    status: humanStatus(detail.status),
    steps: stepsFor(detail),
    ...(actions.length > 0 ? { actions } : {}),
  };
}

function projectFor(detail: BulkOrderDetail, run: RunRef): NonNullable<ToolUi['project']> {
  return {
    kind: 'bulk_order',
    refId: detail.id,
    state: {
      bulkOrderId: detail.id,
      ...(run.number !== null ? { runNumber: run.number } : {}),
      lines: detail.lines.map((l) => ({ label: lineName(l), colour: l.colourName, sizes: Object.keys(l.sizes).join(', '), qty: l.qty, totalCents: l.totalCents })),
      totalCents: detail.totalCents,
      status: detail.status,
      shipTo: shipToLabel(detail),
    },
  };
}

/** What the model gets back about a run: its number and stage in words. */
function runFacts(detail: BulkOrderDetail, run: RunRef) {
  return {
    run: run.label,
    ...(run.number !== null ? { runNumber: run.number } : {}),
    stage: humanStatus(detail.status),
    pieces: totalPieces(detail),
    totalCents: detail.totalCents,
  };
}

function compact(cards: (Card | null)[]): Card[] {
  return cards.filter((card): card is Card => card !== null);
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

interface RunData {
  ok: boolean;
  error?: string;
  run?: string;
  runNumber?: number;
  stage?: string;
  pieces?: number;
  totalCents?: number;
}

export const createBulkQuoteTool = defineTool({
  name: 'create_bulk_quote',
  description:
    'Quote a run: a batch of printed pieces the artist orders for themselves (also called a bulk order), shipped to their own address and paid 100% up front, no Stripe split. Each line is either an existing shop product (productId) or new artwork on a blank (blankCode + printServiceCode + placement, optionally designId), plus a colour and a size -> quantity map. Pricing uses quantity breaks at 25/50/100 units per line, a one-time setup fee per distinct print service, and flat-zone shipping scaled to the total unit count. Numbers the run ("Run 3" in the result) and shows its quote, and sets it as the conversation\'s active run, so later tools (submit_bulk_proof, approve_bulk_proof, pay_bulk_order, ...) can omit runNumber. Call it by its number when you talk to the artist; never say "bulk order" and never show an id.',
  input: z.object({ lines: z.array(bulkLineSchema).min(1), shipTo: bulkShipToSchema }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<RunData>> => {
    if (!ctx.storeId) return noStore();

    const lines = await Promise.all(
      input.lines.map(async (line) => (line.productId || line.blankCode ? line : { ...line, ...(await resolveDefaultLineSpec(ctx)) })),
    );

    const result = await createBulkQuote({ storeId: ctx.storeId, lines, shipTo: input.shipTo });
    if (!result.ok) return failure('bulk_quote', result.error);

    const detail = result.value;
    const run = await runRef(detail.id);
    return {
      data: { ok: true, ...runFacts(detail, run) },
      ui: {
        cards: [bulkQuoteCard(detail, run)],
        next: [
          { label: 'Send the proof', prompt: `Send the proof for ${run.label}`, primary: true },
          { label: 'Change the address', prompt: `Change the shipping address for ${run.label}` },
        ],
        project: projectFor(detail, run),
      },
    };
  },
});

interface GetRunData extends RunData {
  title?: string;
  leadTime?: string;
  shipsTo?: string;
}

export const getBulkOrderTool = defineTool({
  name: 'get_bulk_order',
  description:
    'Show where one run stands: its stage (quote, proof, payment, production, shipping), what is in it, the price and where it ships. Pass runNumber (3 for "Run 3"); omit it to show the run open in this conversation. Set includeQuote to also show the price breakdown (lines, setup, shipping), e.g. when the artist asks what is in the run or what it costs.',
  input: z.object({ ...runTarget, includeQuote: z.boolean().optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetRunData>> => {
    if (!ctx.storeId) return noStore();
    const target = await resolveRunId(ctx, input);
    if (!target) return failure('get_run', 'No run to show. Quote one first.');
    if ('error' in target) return failure('get_run', target.error);

    const detail = await getBulkOrder(ctx.storeId, target.id);
    if (!detail) return failure('get_run', 'That run was not found in this shop.');

    const run = await runRef(detail.id);
    const title = await runTitle(ctx.storeId, detail);
    const card = runCard(detail, run, title, actionsFor(detail, run.label));
    return {
      data: {
        ok: true,
        ...runFacts(detail, run),
        title,
        leadTime: detail.leadTime,
        shipsTo: detail.shipTo.city,
      },
      ui: {
        cards: compact([card, input.includeQuote || !card ? bulkQuoteCard(detail, run) : null]),
        project: projectFor(detail, run),
      },
    };
  },
});

interface ListRunsData {
  ok: boolean;
  total?: number;
  runs?: { run: string; runNumber: number; stage: string; totalCents: number | null; started: string }[];
}

export const listBulkOrdersTool = defineTool({
  name: 'list_bulk_orders',
  description: "List the artist's runs, newest first, with the stage each is at and its price. Each row opens that run with get_bulk_order.",
  input: z.object({}).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx): Promise<ToolResult<ListRunsData>> => {
    if (!ctx.storeId) return noStore();
    const runs = await listRunsForStore(ctx.storeId);

    const card: Card = {
      id: `runs_table_${randomUUID()}`,
      kind: 'orders_table',
      title: 'Your runs',
      rows: runs.map((run) => ({
        orderId: run.id,
        reference: run.label,
        placedAt: run.createdAt.toISOString(),
        status: run.status,
        grossCents: run.totalCents ?? 0,
        prompt: `Open ${run.label}`,
      })),
      total: runs.length,
    };

    return {
      data: {
        ok: true,
        total: runs.length,
        runs: runs.map((run) => ({
          run: run.label,
          runNumber: run.number,
          stage: humanStatus(run.status),
          totalCents: run.totalCents,
          started: run.createdAt.toISOString().slice(0, 10),
        })),
      },
      ui: { cards: [card] },
    };
  },
});

interface SubmitProofData extends RunData {
  proofVersion?: number;
  proofStatus?: ProofStatus;
}

export const submitBulkProofTool = defineTool({
  name: 'submit_bulk_proof',
  description:
    'Send the proof for a run that is at the quote stage, so the artist can check it: the run moves to "waiting for your OK on the proof". Pass runNumber (3 for "Run 3"); omit it to use the run open in this conversation. Returns a proof card the artist can approve with approve_bulk_proof, or send back with request_bulk_changes.',
  input: z.object({ ...runTarget }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<SubmitProofData>> => {
    if (!ctx.storeId) return noStore();
    const target = await resolveRunId(ctx, input);
    if (!target) return failure('submit_proof', 'No run to send a proof for. Quote one first.');
    if ('error' in target) return failure('submit_proof', target.error);

    const result = await submitBulkProof(ctx.storeId, target.id);
    if (!result.ok) return failure('submit_proof', result.error);

    const detail = await getBulkOrder(ctx.storeId, target.id);
    if (!detail) return failure('submit_proof', 'That run was not found after sending the proof.');

    const run = await runRef(detail.id);
    return {
      data: { ok: true, ...runFacts(detail, run), proofVersion: result.value.version, proofStatus: result.value.status },
      ui: {
        cards: compact([bulkProofCard(result.value, run, detail), runCard(detail, run, await runTitle(ctx.storeId, detail))]),
        next: [
          { label: 'Approve the proof', prompt: `Approve the proof for ${run.label}`, primary: true },
          { label: 'Ask for changes', prompt: `Ask for changes to the proof for ${run.label}` },
        ],
        project: projectFor(detail, run),
      },
    };
  },
});

interface ProofOutcomeData extends RunData {
  proofStatus?: ProofStatus;
}

export const approveBulkProofTool = defineTool({
  name: 'approve_bulk_proof',
  description:
    'Approve the pending proof for a run so it can be paid: the run moves to "awaiting payment". Sensitive action: shows a confirm card and only runs once the human confirms. Always pass runNumber (3 for "Run 3") so the confirm card names the run; omit it to use the run open in this conversation.',
  input: z.object({ ...runTarget, proofId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => (input.runNumber ? `Approve the proof for ${runLabel(input.runNumber)}.` : 'Approve the proof for this run.'),
  run: async (ctx, input): Promise<ToolResult<ProofOutcomeData>> => {
    if (!ctx.storeId) return noStore();
    const target = await resolveRunId(ctx, input);
    if (target && 'error' in target) return failure('approve_proof', target.error);

    let proofId = input.proofId;
    if (!proofId) {
      if (!target) return failure('approve_proof', 'No proof to approve. Send one first.');
      const latest = await getLatestBulkProof(ctx.storeId, target.id);
      if (!latest) return failure('approve_proof', 'No proof found for this run.');
      proofId = latest.id;
    }

    const result = await approveBulkProof(ctx.storeId, proofId, ctx.userId);
    if (!result.ok) return failure('approve_proof', result.error);

    const bulkOrderId = target?.id ?? result.value.bulkOrderId ?? undefined;
    const detail = bulkOrderId ? await getBulkOrder(ctx.storeId, bulkOrderId) : null;
    const run = detail ? await runRef(detail.id) : null;

    return {
      data: { ok: true, ...(detail && run ? runFacts(detail, run) : {}), proofStatus: result.value.status },
      ui: {
        cards: detail && run ? compact([bulkProofCard(result.value, run, detail), runCard(detail, run, await runTitle(ctx.storeId, detail))]) : [bulkProofCard(result.value, NO_RUN)],
        next: run ? [{ label: 'Pay now', prompt: `Pay for ${run.label}`, primary: true }] : undefined,
        project: detail && run ? projectFor(detail, run) : undefined,
      },
    };
  },
});

export const requestBulkChangesTool = defineTool({
  name: 'request_bulk_changes',
  description:
    'Send a run\'s pending proof back for changes, with notes on what to change: the run goes back to the quote stage. Pass runNumber (3 for "Run 3"); omit it to use the run open in this conversation.',
  input: z.object({ ...runTarget, proofId: z.string().uuid().optional(), notes: z.string().min(1).max(1000) }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<ProofOutcomeData>> => {
    if (!ctx.storeId) return noStore();
    const target = await resolveRunId(ctx, input);
    if (target && 'error' in target) return failure('request_changes', target.error);

    let proofId = input.proofId;
    if (!proofId) {
      if (!target) return failure('request_changes', 'No proof to send back. Send one first.');
      const latest = await getLatestBulkProof(ctx.storeId, target.id);
      if (!latest) return failure('request_changes', 'No proof found for this run.');
      proofId = latest.id;
    }

    const result = await requestBulkChanges(ctx.storeId, proofId, input.notes);
    if (!result.ok) return failure('request_changes', result.error);

    const bulkOrderId = target?.id ?? result.value.bulkOrderId ?? undefined;
    const detail = bulkOrderId ? await getBulkOrder(ctx.storeId, bulkOrderId) : null;
    const run = detail ? await runRef(detail.id) : null;

    return {
      data: { ok: true, ...(detail && run ? runFacts(detail, run) : {}), proofStatus: result.value.status },
      ui: {
        cards: detail && run ? compact([bulkProofCard(result.value, run, detail), runCard(detail, run, await runTitle(ctx.storeId, detail))]) : [bulkProofCard(result.value, NO_RUN)],
        next: run ? [{ label: 'Send a new proof', prompt: `Send the proof for ${run.label}` }] : undefined,
        project: detail && run ? projectFor(detail, run) : undefined,
      },
    };
  },
});

interface PayRunData extends RunData {
  checkoutUrl?: string;
}

export const payBulkOrderTool = defineTool({
  name: 'pay_bulk_order',
  description:
    'Start payment for a run whose proof is approved ("awaiting payment"). Returns the run\'s quote with a "Pay now" link to a secure checkout charging 100% to MerchFrom — no split with the artist, since this is their own run, not a fan sale. Pass runNumber (3 for "Run 3"); omit it to pay the run open in this conversation.',
  input: z.object({ ...runTarget }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<PayRunData>> => {
    if (!ctx.storeId) return noStore();
    const target = await resolveRunId(ctx, input);
    if (!target) return failure('pay_run', 'No run to pay. Approve a proof first.');
    if ('error' in target) return failure('pay_run', target.error);

    const result = await buildBulkCheckout(ctx.storeId, target.id);
    if (!result.ok) return failure('pay_run', result.error);

    const detail = await getBulkOrder(ctx.storeId, target.id);
    if (!detail) return failure('pay_run', 'That run was not found after starting payment.');

    const run = await runRef(detail.id);
    return {
      data: { ok: true, ...runFacts(detail, run), checkoutUrl: result.value.url },
      ui: { cards: [bulkQuoteCard(detail, run, result.value.url)], project: projectFor(detail, run) },
    };
  },
});

export const cancelBulkOrderTool = defineTool({
  name: 'cancel_bulk_order',
  description:
    'Cancel a run that has not been paid yet (quote, proof or awaiting payment). Sensitive action: shows a confirm card and only runs once the human confirms. Always pass runNumber (3 for "Run 3") so the confirm card names the run; omit it to cancel the run open in this conversation.',
  input: z.object({ ...runTarget }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => (input.runNumber ? `Cancel ${runLabel(input.runNumber)}.` : 'Cancel this run.'),
  run: async (ctx, input): Promise<ToolResult<RunData>> => {
    if (!ctx.storeId) return noStore();
    const target = await resolveRunId(ctx, input);
    if (!target) return failure('cancel_run', 'No run to cancel.');
    if ('error' in target) return failure('cancel_run', target.error);

    const result = await cancelBulk(ctx.storeId, target.id);
    if (!result.ok) return failure('cancel_run', result.error);

    const detail = result.value;
    const run = await runRef(detail.id);
    return {
      data: { ok: true, ...runFacts(detail, run) },
      ui: { cards: compact([runCard(detail, run, await runTitle(ctx.storeId, detail), actionsFor(detail, run.label))]), project: projectFor(detail, run) },
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
