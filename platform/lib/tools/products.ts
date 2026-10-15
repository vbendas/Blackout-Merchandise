import { randomUUID } from 'crypto';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import {
  archiveProduct,
  checkPublishable,
  createProduct,
  getProduct,
  listProducts,
  publishProduct,
  setPrice,
  updateProduct,
  type PublishCheck,
  type ProductDetail,
  type ProductStatus,
} from '@/lib/services/products';
import { productApproval, type ProductApproval } from '@/lib/services/print-prep';
import { approvalChip, printApprovalState } from '@/lib/tools/print';
import { getLatestProof, type ProofStatus } from '@/lib/services/proofs';
import { quoteFor, type QuoteBreak } from '@/lib/services/quotes';
import { assignToCollection, createCollection } from '@/lib/services/collections';
import { getProjectCard } from '@/lib/services/conversations';
import type { Card, Chip, PrintApprovalState, ProductProjectState, ToolUi } from '@/lib/ui-cards/schemas';

// Product / quote / collection tools. Every write here is scoped by
// ctx.storeId (never a bare productId) and goes through the services in
// lib/services/{products,quotes,collections}.ts, which own the state
// machine. Tools that act on "the current product" accept an optional id and
// fall back to the conversation's project card (set by create_product and
// kept in sync by every tool below) so a chat like "price it at €35" ->
// "publish it" never needs the model to track uuids. A shop product has no
// proof of its own: its design's approval (print.ts) replaces it, and the three
// proof tools below are retired. A run's proof is in bulk.ts.

const placementSchema = z.object({
  position: z
    .string()
    .min(1)
    .max(40)
    .describe("One the garment takes: 'front_chest', 'front_full', 'front_left_chest', 'back', 'centre' or 'front_leg' (trousers). There is no sleeve print yet; it is refused, not moved."),
  widthCm: z.number().positive().max(200).describe('Print width in cm on the garment.'),
  offsetYcm: z.number().optional().describe('Vertical offset from the default anchor, cm (positive = down).'),
});

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

/** Shared "no shop for this account" bail-out — assignable to any tool's { ok, error, ...optional } data shape. */
function noStore(): { data: { ok: false; error: string } } {
  return { data: { ok: false, error: 'No shop found for this account yet.' } };
}

async function resolveProductId(ctx: ToolContext, explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const card = await getProjectCard(ctx.conversationId);
  if (card && card.kind === 'product' && card.refId) return card.refId;
  return null;
}

/** Where the product's artwork stands against publishing, for a product that can still go live: a live or
 * archived one has nothing to show. */
async function approvalOf(detail: ProductDetail): Promise<ProductApproval | null> {
  if (detail.status !== 'draft' && detail.status !== 'proof_pending') return null;
  return productApproval(detail.storeId, detail.id);
}

/** What the model is told about a product's artwork, so it prepares and gets approval before it offers to
 * publish: whether it is approved, why not, and the exact call that prepares the print files when that is next. */
function artworkData(approval: ProductApproval | null): { artwork?: { approved: boolean; reason?: string; note?: string; approvalPage?: string; prepare?: ProductApproval['prepare'] } } {
  if (!approval || approval.exempt) return {};
  if (approval.covered) return { artwork: { approved: true } };
  return {
    artwork: {
      approved: false,
      ...(approval.reason ? { reason: approval.reason } : {}),
      ...(approval.sentence ? { note: approval.sentence } : {}),
      ...(approval.designId ? { approvalPage: `/studio/approve/${approval.designId}` } : {}),
      ...(approval.step?.kind === 'prepare' && approval.prepare ? { prepare: approval.prepare } : {}),
    },
  };
}

/** The refusal of a publish or an edit whose artwork isn't approved: one sentence, the way on (a link to the
 * approval page, or a message that prepares the print files), and the facts the model needs to take that step. */
function approvalRefusal(ctx: ToolContext, idPrefix: string, error: string, approval: ProductApproval) {
  const state = printApprovalState(approval, ctx.conversationId);
  const action = state?.action;
  const chip = approvalChip(approval);
  const notice: Card = {
    id: `${idPrefix}_err_${randomUUID()}`,
    kind: 'notice',
    tone: 'warning',
    text: error,
    ...(action ? { actions: [{ label: action.label, href: action.href, prompt: action.prompt, variant: 'primary' as const }] } : {}),
  };
  const next: Chip[] = chip ? [chip] : [];
  return {
    data: { ok: false as const, error, ...artworkData(approval), designId: approval.designId ?? undefined },
    ui: { cards: [notice], next },
  };
}

function productCard(detail: ProductDetail, approval?: PrintApprovalState): Card {
  return {
    id: `product_${detail.id}`,
    kind: 'product',
    productId: detail.id,
    name: detail.name,
    blankCode: detail.blankCode,
    blankName: detail.blankName,
    imageUrl: detail.colours.find((c) => c.mockupUrl)?.mockupUrl ?? undefined,
    colours: detail.colours.map((c) => ({ code: c.code, name: c.name, hex: c.hex, mockupUrl: c.mockupUrl ?? undefined })),
    sizes: detail.sizes,
    printService: detail.printServiceName,
    placement: detail.placement ? `${detail.placement.position} · ${detail.placement.widthCm}cm` : undefined,
    baseCostCents: detail.baseCostCents ?? undefined,
    retailPriceCents: detail.retailPriceCents ?? undefined,
    marginCents: detail.marginCents ?? undefined,
    status: detail.status,
    ...(approval
      ? {
          printApproval: approval,
          // Blocked: the way on is on the card, next to where it says so.
          ...(!approval.covered && approval.action
            ? { actions: [{ label: approval.action.label, href: approval.action.href, prompt: approval.action.prompt, variant: 'primary' as const }] }
            : {}),
        }
      : {}),
  };
}

function projectStateFor(detail: ProductDetail, proofStatus?: ProofStatus, approval?: PrintApprovalState): ProductProjectState {
  return {
    productId: detail.id,
    name: detail.name,
    blankCode: detail.blankCode,
    blankName: detail.blankName,
    imageUrl: detail.colours.find((c) => c.mockupUrl)?.mockupUrl ?? undefined,
    colours: detail.colours.map((c) => ({ code: c.code, name: c.name, hex: c.hex, mockupUrl: c.mockupUrl ?? undefined })),
    sizes: detail.sizes,
    printService: detail.printServiceName,
    placement: detail.placement ? `${detail.placement.position} · ${detail.placement.widthCm}cm` : undefined,
    baseCostCents: detail.baseCostCents ?? undefined,
    retailPriceCents: detail.retailPriceCents ?? undefined,
    marginCents: detail.marginCents ?? undefined,
    status: detail.status,
    proofStatus,
    ...(approval ? { printApproval: approval } : {}),
  };
}

function projectFor(detail: ProductDetail, proofStatus?: ProofStatus, approval?: PrintApprovalState): NonNullable<ToolUi['project']> {
  return { kind: 'product', refId: detail.id, state: projectStateFor(detail, proofStatus, approval) as unknown as Record<string, unknown> };
}

async function projectForCurrent(
  ctx: ToolContext,
  storeId: string,
  productId: string,
): Promise<{ detail: ProductDetail; project: NonNullable<ToolUi['project']>; approval: ProductApproval | null; approvalState: PrintApprovalState | undefined } | null> {
  const detail = await getProduct(storeId, productId);
  if (!detail) return null;
  const proof = await getLatestProof(storeId, productId);
  const approval = await approvalOf(detail);
  const approvalState = printApprovalState(approval, ctx.conversationId);
  return { detail, project: projectFor(detail, proof?.status, approvalState), approval, approvalState };
}

// ---------------------------------------------------------------------------

/** The step after a product is made or changed: its artwork if that is not approved, else its price, else the
 * shop. Nothing for a product that is live or archived. A shop product needs no proof of its own. */
function nextStepFor(detail: ProductDetail, approval: ProductApproval | null): Chip | null {
  if (detail.status !== 'draft' && detail.status !== 'proof_pending') return null;
  const artwork = approval && !approval.covered ? approvalChip(approval) : null;
  if (artwork) return artwork;
  if (detail.retailPriceCents == null) {
    const suggested = Math.ceil(((detail.baseCostCents ?? 0) + 500) / 100);
    return { label: `Price it at €${suggested}`, prompt: `Price it at €${suggested}`, primary: true };
  }
  return { label: 'Publish the product', prompt: 'Publish the product', primary: true };
}

interface CreateProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  designId?: string | null;
  name?: string;
  status?: ProductStatus;
  baseCostCents?: number | null;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const createProductTool = defineTool({
  name: 'create_product',
  description:
    "Create a new draft product: a design printed on a blank garment. Requires the exact blank code (from list_blanks/get_blank), a print service offered on that blank, a placement (position + width in cm), at least one colour code and one size that are available on that blank. A shop product always prints DTG or DTF: pass printServiceCode 'dtg' (direct-to-garment) unless the artist asks for 'dtf' (direct-to-film), which is also the one to use on blanks without DTG (jackets, bags, hats, trousers, woven shirts). Screen print is only for runs (create_bulk_quote), so a screen service is refused here with the ones that work. Snapshots the base cost (garment + print + margin) for quantity 1 as baseCostCents — the artist only ever sees this total, never the cost breakdown; use get_quote to explain pricing at other quantities. Best-effort renders mockups immediately; if rendering isn't available yet the product is still created without preview images. Sets this product as the conversation's active project, so later tools (set_price, get_product, publish_product, ...) can omit productId and act on it directly. A shop product needs no proof: once its design's print files are approved for it and it has a price, publish_product puts it in the shop.",
  input: z
    .object({
      designId: z.string().uuid().optional().describe('Design to print, if one was uploaded or generated.'),
      blankCode: z.string().min(2).max(20),
      printServiceCode: z.string().min(2).max(40).describe("'dtg' or 'dtf' ('dtf' on blanks without DTG). Screen print codes (screen_1c, screen_2c, screen_3c) are for runs and are refused."),
      placement: placementSchema,
      colours: z.array(z.string().min(1).max(10)).min(1).describe('Supplier colour codes, e.g. C002.'),
      sizes: z.array(z.string().min(1).max(6)).min(1),
      name: z.string().min(1).max(80).optional(),
    })
    .strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<CreateProductData>> => {
    if (!ctx.storeId) return noStore();

    const result = await createProduct({ storeId: ctx.storeId, ...input });
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`create_product_err_${randomUUID()}`, result.error)] } };
    }

    const detail = result.value;
    const suggestedPrice = Math.ceil(((detail.baseCostCents ?? 0) + 500) / 100);
    const approval = await approvalOf(detail);
    const approvalState = printApprovalState(approval, ctx.conversationId);
    // The print files come before the shop: a product can't be published until its artwork is approved.
    const prepare = approval?.step?.kind === 'prepare' ? approvalChip(approval) : null;

    return {
      data: { ok: true, productId: detail.id, designId: detail.designId, name: detail.name, status: detail.status, baseCostCents: detail.baseCostCents, ...artworkData(approval) },
      ui: {
        cards: [productCard(detail, approvalState)],
        next: [
          { label: `Price it at €${suggestedPrice}`, prompt: `Price it at €${suggestedPrice}`, primary: true },
          ...(prepare ? [{ ...prepare, primary: false }] : []),
          { label: 'Add another colour', prompt: 'Add another colour' },
        ],
        project: projectFor(detail, undefined, approvalState),
      },
    };
  },
});

interface UpdateProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  designId?: string | null;
  name?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const updateProductTool = defineTool({
  name: 'update_product',
  description:
    "Update an existing product's name, description, placement, enabled colours, enabled sizes, or collection. Colours and sizes must still be available on the product's blank. Changing colours re-triggers mockup rendering. Omit productId to update the product currently open in this conversation. On a product that is already live, adding a colour or moving the print needs the design's approval to cover it: the tool refuses with what is missing (prepare the print files, then the artist approves them) and changes nothing.",
  input: z
    .object({
      productId: z.string().uuid().optional(),
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(2000).optional(),
      placement: placementSchema.optional(),
      colours: z.array(z.string().min(1).max(10)).min(1).optional(),
      sizes: z.array(z.string().min(1).max(6)).min(1).optional(),
      collectionId: z.string().uuid().nullable().optional(),
    })
    .strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<UpdateProductData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to update — create or open one first.' } };

    const result = await updateProduct(ctx.storeId, productId, {
      name: input.name,
      description: input.description,
      placement: input.placement,
      colours: input.colours,
      sizes: input.sizes,
      collectionId: input.collectionId,
    });
    if (!result.ok) {
      if (result.approval) return approvalRefusal(ctx, 'update_product', result.error, result.approval);
      return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`update_product_err_${randomUUID()}`, result.error)] } };
    }

    const detail = result.value;
    const approval = await approvalOf(detail);
    const approvalState = printApprovalState(approval, ctx.conversationId);
    // Another colour or position has no print files yet: that is the next step, before the shop.
    const next = nextStepFor(detail, approval);
    return {
      data: { ok: true, productId: detail.id, designId: detail.designId, name: detail.name, ...artworkData(approval) },
      ui: {
        cards: [productCard(detail, approvalState)],
        next: next ? [next] : undefined,
        project: projectFor(detail, undefined, approvalState),
      },
    };
  },
});

interface SetPriceData {
  ok: boolean;
  error?: string;
  retailPriceCents?: number;
  marginCents?: number;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const setPriceTool = defineTool({
  name: 'set_price',
  description:
    "Set the retail price for a product. Must be at least the base cost plus €1 — the tool refuses below that minimum and never surfaces the garment/print/margin breakdown to the artist, only the resulting margin. Omit productId to price the product currently open in this conversation.",
  input: z.object({ productId: z.string().uuid().optional(), retailCents: z.number().int().positive() }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<SetPriceData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to price — create or open one first.' } };

    const result = await setPrice(ctx.storeId, productId, input.retailCents);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`set_price_err_${randomUUID()}`, result.error)] } };

    const detail = await getProduct(ctx.storeId, productId);
    if (!detail) return { data: { ok: false, error: 'Product not found after pricing.' } };
    const approval = await approvalOf(detail);
    const approvalState = printApprovalState(approval, ctx.conversationId);
    // Priced: what stands between it and the shop is its artwork, then publishing.
    const next = nextStepFor(detail, approval);

    return {
      data: { ok: true, retailPriceCents: result.value.retailPriceCents, marginCents: result.value.marginCents, ...artworkData(approval) },
      ui: {
        cards: [productCard(detail, approvalState)],
        next: [...(next ? [next] : []), { label: 'Add a collection', prompt: 'Add a collection called Winter Tour' }],
        project: projectFor(detail, undefined, approvalState),
      },
    };
  },
});

interface GetQuoteData {
  ok: boolean;
  error?: string;
  qty?: number;
  unitBaseCostCents?: number;
  totalCents?: number;
  breaks?: QuoteBreak[];
}

export const getQuoteTool = defineTool({
  name: 'get_quote',
  description:
    "Price a run of a blank + print service at a given quantity, using the seeded base-cost table (garment + print + margin, with quantity breaks). Pass either blankCode or productId (to reuse an existing product's blank/print service); printServiceCode is optional when productId is given. A run can print by any method the blank offers, screen print (screen_1c, screen_2c, screen_3c) or DTG/DTF (dtg, dtf), whatever the shop product itself uses, so pass printServiceCode to price a different method. Returns only totals per quantity break — never the garment/print/margin components, which artists don't see. Use this for 'what would 40 hoodies cost', 'what's my margin at €40', or any pricing question.",
  input: z
    .object({
      blankCode: z.string().min(2).max(20).optional(),
      productId: z.string().uuid().optional(),
      printServiceCode: z.string().min(2).max(40).optional(),
      qty: z.number().int().min(1).max(100000),
    })
    .strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetQuoteData>> => {
    let blankCode = input.blankCode;
    let printServiceCode = input.printServiceCode;
    let blankLabel = blankCode;

    // No explicit blank: fall back to the product in the project card, so
    // 'quote a run of 40' right after creating a product just works.
    const productId = blankCode ? null : await resolveProductId(ctx, input.productId);
    if (!blankCode && productId) {
      if (!ctx.storeId) return noStore();
      const product = await getProduct(ctx.storeId, productId);
      if (!product) return { data: { ok: false, error: 'Product not found for this shop.' } };
      blankCode = product.blankCode;
      printServiceCode = printServiceCode ?? product.printServiceCode;
      blankLabel = product.blankName;
    }

    if (!blankCode || !printServiceCode) {
      const text = 'Which blank should I price? Pick one from the catalogue or create a product first.';
      return {
        data: { ok: false, error: text },
        ui: { cards: [errorNotice(`quote_err_${randomUUID()}`, text)], next: [{ label: 'Browse blanks', prompt: 'Show me blanks' }] },
      };
    }

    const quote = await quoteFor({ blankCode, printServiceCode, qty: input.qty });
    if (!quote) {
      const text = `No pricing configured for ${blankCode} with ${printServiceCode}.`;
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`quote_err_${randomUUID()}`, text)] } };
    }

    const card: Card = {
      id: `quote_${randomUUID()}`,
      kind: 'quote',
      title: blankLabel ? `Quote — ${blankDisplayName(blankLabel, blankLabel)}` : 'Quote',
      lines: quote.breaks.map((b) => ({ label: `${b.qtyFrom}+ units`, qty: b.qtyFrom, unitCents: b.unitCents, totalCents: b.unitCents * b.qtyFrom })),
      totalCents: quote.totalCents,
      currency: 'EUR',
      note: `${input.qty} unit${input.qty === 1 ? '' : 's'} at €${(quote.unitBaseCostCents / 100).toFixed(2)} each = €${(quote.totalCents / 100).toFixed(2)} total.`,
    };

    return {
      data: { ok: true, qty: input.qty, unitBaseCostCents: quote.unitBaseCostCents, totalCents: quote.totalCents, breaks: quote.breaks },
      ui: { cards: [card], next: [{ label: 'Set a price', prompt: `Price it at €${Math.ceil((quote.unitBaseCostCents + 500) / 100)}` }] },
    };
  },
});

// -- the per-product proof is retired ---------------------------------------------------------
//
// A shop product has no proof of its own now: approving its design (approve_design) replaces it, and a product
// goes from draft to live once that approval covers it (Print-Prep-Plan section 7). A run keeps its proof
// (submit_bulk_proof, approve_bulk_proof, request_bulk_changes in bulk.ts). The three tools stay registered so
// an old conversation, a stale card or a habit still gets a plain answer; they change nothing and point to the
// step that is next.

const NO_PRODUCT_PROOF = "Shop products don't need a separate proof now: approving the artwork replaces it.";
const RUN_PROOF_TOOLS = 'A run has its own proof: submit_bulk_proof, approve_bulk_proof and request_bulk_changes.';

interface RetiredProofData {
  ok: false;
  error: string;
  retired: true;
  runs: string;
  designId?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

/** What a retired proof tool answers: the artwork's standing for the product it was asked about, and the step
 * that is next (approve the artwork, or publish), so the conversation moves on instead of stopping. */
async function retiredProof(ctx: ToolContext, explicitProductId: string | undefined, idPrefix: string): Promise<ToolResult<RetiredProofData>> {
  const productId = ctx.storeId ? await resolveProductId(ctx, explicitProductId) : null;
  const detail = productId && ctx.storeId ? await getProduct(ctx.storeId, productId) : null;
  const approval = detail ? await approvalOf(detail) : null;

  let error = NO_PRODUCT_PROOF;
  let chip: Chip | null = null;
  if (detail && approval && !approval.covered && approval.sentence) {
    error = `${error} ${approval.sentence}`;
    chip = approvalChip(approval);
  } else if (detail && approval) {
    error = `${error} The artwork is approved, so the ${detail.name} can be published.`;
    chip = { label: 'Publish the product', prompt: 'Publish the product', primary: true };
  }
  return {
    data: { ok: false, error, retired: true, runs: RUN_PROOF_TOOLS, ...(detail?.designId ? { designId: detail.designId } : {}), ...artworkData(approval) },
    ui: { cards: [{ id: `${idPrefix}_retired_${randomUUID()}`, kind: 'notice', tone: 'info', text: error }], next: chip ? [chip] : undefined },
  };
}

const RETIRED_PROOF_NOTE =
  "Retired: a shop product has no separate proof any more, so never send, approve or send back one for a shop product. A product goes live once its design's print files are approved for it (prepare_print, then the artist approves on the approval page; get_product's artwork field says where that stands) and it has a price: then publish_product. A run's proof is separate and stays:";

export const submitProofTool = defineTool({
  name: 'submit_proof',
  description: `${RETIRED_PROOF_NOTE} submit_bulk_proof. Calling this changes nothing; it answers with the step that is next.`,
  input: z.object({ productId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: (ctx, input) => retiredProof(ctx, input.productId, 'submit_proof'),
});

export const approveProofTool = defineTool({
  name: 'approve_proof',
  description: `${RETIRED_PROOF_NOTE} approve_bulk_proof. Calling this changes nothing; it answers with the step that is next.`,
  input: z
    .object({
      proofId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
      productName: z.string().max(80).optional(),
      version: z.number().int().optional(),
    })
    .strict(),
  scope: 'artist',
  readOnly: true,
  run: (ctx, input) => retiredProof(ctx, input.productId, 'approve_proof'),
});

export const requestProofChangesTool = defineTool({
  name: 'request_proof_changes',
  description: `${RETIRED_PROOF_NOTE} request_bulk_changes. Calling this changes nothing; it answers with the step that is next.`,
  input: z.object({ proofId: z.string().uuid().optional(), productId: z.string().uuid().optional(), notes: z.string().min(1).max(1000) }).strict(),
  scope: 'artist',
  readOnly: true,
  run: (ctx, input) => retiredProof(ctx, input.productId, 'request_proof_changes'),
});

interface PublishProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  status?: ProductStatus;
  designId?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

/** A publish that was refused, in the artist's words: the artwork's sentence with its way on, or the plain notice. */
function publishRefusal(ctx: ToolContext, refused: { error: string; approval?: ProductApproval }): ToolResult<PublishProductData> {
  if (refused.approval) return approvalRefusal(ctx, 'publish', refused.error, refused.approval);
  return { data: { ok: false, error: refused.error }, ui: { cards: [errorNotice(`publish_err_${randomUUID()}`, refused.error)] } };
}

export const publishProductTool = defineTool({
  name: 'publish_product',
  description:
    "Publish a product to the live shop. Only allowed once the product's design has print files approved for its garment, every colour it has and its print position (prepare_print, then the artist approves on the approval page: get_product's artwork field says where that stands), it has a retail price, and the shop's Stripe account has both charges and payouts enabled. A shop product needs no proof of its own: the artwork approval is the only approval it needs, and a draft is published directly. Fails closed with a plain sentence otherwise, and the result says what is missing and the next step (the print files to prepare, or the approval page). Never offer to publish before the artwork is approved. A product that is already live is not taken down when its approval is later withdrawn. Sensitive action: shows a confirm card and only executes once the human clicks confirm; a product that can't be published gets the refusal instead of a confirm card. Omit productId to publish the product currently open in this conversation; always pass name (from the product card) so the confirmation reads clearly.",
  input: z.object({ productId: z.string().uuid().optional(), name: z.string().max(80).optional() }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => `Publish ${input.name ?? 'this product'} to your shop.`,
  // The same checks the publish makes, before the artist is asked to confirm what would be refused.
  preflight: async (ctx, input): Promise<ToolResult<PublishProductData> | null> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to publish — create or open one first.' } };
    const checked: PublishCheck = await checkPublishable(ctx.storeId, productId);
    return checked.ok ? null : publishRefusal(ctx, checked);
  },
  run: async (ctx, input): Promise<ToolResult<PublishProductData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to publish — create or open one first.' } };

    const result = await publishProduct(ctx.storeId, productId);
    if (!result.ok) return publishRefusal(ctx, result);

    const detail = result.value;
    return {
      data: { ok: true, productId: detail.id, status: detail.status },
      ui: {
        cards: [productCard(detail)],
        next: [
          { label: 'Add another product', prompt: 'Add a new product', primary: true },
          { label: 'Add a collection', prompt: 'Add a collection called Winter Tour' },
        ],
        project: projectFor(detail, 'approved'),
      },
    };
  },
});

interface ArchiveProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  status?: ProductStatus;
}

export const archiveProductTool = defineTool({
  name: 'archive_product',
  description:
    "Archive a product, removing it from the live shop (or dropping a draft that's no longer needed). Sensitive action: shows a confirm card and only executes once the human clicks confirm. Omit productId to archive the product currently open in this conversation; always pass name (from the product card) so the confirmation reads clearly.",
  input: z.object({ productId: z.string().uuid().optional(), name: z.string().max(80).optional() }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => `Archive ${input.name ?? 'this product'}.`,
  run: async (ctx, input): Promise<ToolResult<ArchiveProductData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to archive.' } };

    const result = await archiveProduct(ctx.storeId, productId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`archive_err_${randomUUID()}`, result.error)] } };

    const detail = result.value;
    return {
      data: { ok: true, productId: detail.id, status: detail.status },
      ui: {
        cards: [productCard(detail)],
        next: [
          { label: 'Show my products', prompt: 'Show my products', primary: true },
          { label: 'Add a new product', prompt: 'Add a new product' },
        ],
        project: projectFor(detail),
      },
    };
  },
});

interface ListProductsItem {
  id: string;
  name: string;
  status: ProductStatus;
  retailPriceCents: number | null;
}

interface ListProductsData {
  ok: boolean;
  error?: string;
  total?: number;
  items?: ListProductsItem[];
}

export const listProductsTool = defineTool({
  name: 'list_products',
  description:
    "List the artist's products, optionally filtered by status (draft, proof_pending, live, archived). Shows a visual grid; each item's prompt opens it with get_product.",
  input: z.object({ status: z.enum(['draft', 'proof_pending', 'live', 'archived']).optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<ListProductsData>> => {
    if (!ctx.storeId) return noStore();
    const items = await listProducts(ctx.storeId, input.status);

    const card: Card = {
      id: `products_grid_${randomUUID()}`,
      kind: 'mockup_grid',
      title: input.status ? `Products — ${input.status}` : 'Your products',
      items: items.map((p) => ({ id: p.id, url: p.imageUrl ?? '', label: `${p.name} · ${p.status}`, prompt: `Open product ${p.id}` })),
    };

    return {
      data: { ok: true, total: items.length, items: items.map((p) => ({ id: p.id, name: p.name, status: p.status, retailPriceCents: p.retailPriceCents })) },
      ui: { cards: [card], next: [{ label: 'Add a new product', prompt: 'Add a new product', primary: true }] },
    };
  },
});

interface GetProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  designId?: string | null;
  name?: string;
  status?: ProductStatus;
  retailPriceCents?: number | null;
  marginCents?: number | null;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const getProductTool = defineTool({
  name: 'get_product',
  description:
    "Get full details for one product (colours, sizes, price, margin, status, design id). Its artwork field says whether the design's print files are approved for this product's garment, colours and print position, which a product needs before it can be published, and when they are not, why and what to do (prepare_print with the prepare details, or the approval page). Call this when the artist says 'open product <id>' (e.g. from a list_products grid) or asks about a specific product, and before offering to publish. Omit productId to show the product currently open in this conversation.",
  input: z.object({ productId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetProductData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to show.' } };

    const current = await projectForCurrent(ctx, ctx.storeId, productId);
    if (!current) {
      const text = 'Product not found for this shop.';
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`get_product_err_${randomUUID()}`, text)] } };
    }

    return {
      data: {
        ok: true,
        productId: current.detail.id,
        designId: current.detail.designId,
        name: current.detail.name,
        status: current.detail.status,
        retailPriceCents: current.detail.retailPriceCents,
        marginCents: current.detail.marginCents,
        ...artworkData(current.approval),
      },
      ui: { cards: [productCard(current.detail, current.approvalState)], project: current.project },
    };
  },
});

interface CreateCollectionData {
  ok: boolean;
  error?: string;
  id?: string;
  name?: string;
  slug?: string;
}

export const createCollectionTool = defineTool({
  name: 'create_collection',
  description: "Create a named collection to group products in the shop (e.g. 'Winter Tour'). Slug is generated from the name automatically.",
  input: z.object({ name: z.string().min(1).max(80) }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<CreateCollectionData>> => {
    if (!ctx.storeId) return noStore();
    const result = await createCollection(ctx.storeId, input.name);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`create_collection_err_${randomUUID()}`, result.error)] } };

    return {
      data: { ok: true, id: result.value.id, name: result.value.name, slug: result.value.slug },
      ui: {
        cards: [{ id: `notice_collection_${result.value.id}`, kind: 'notice', tone: 'success', text: `Created the "${result.value.name}" collection.` }],
        next: [{ label: 'Add a product to it', prompt: `Add this product to ${result.value.name}` }],
      },
    };
  },
});

interface AssignToCollectionData {
  ok: boolean;
  error?: string;
  productId?: string;
  collectionId?: string | null;
}

export const assignToCollectionTool = defineTool({
  name: 'assign_to_collection',
  description:
    "Move a product into a collection, or pass collectionId: null to remove it from its current collection. Omit productId to use the product currently open in this conversation.",
  input: z.object({ productId: z.string().uuid().optional(), collectionId: z.string().uuid().nullable() }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<AssignToCollectionData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to assign — create or open one first.' } };

    const result = await assignToCollection(ctx.storeId, productId, input.collectionId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`assign_collection_err_${randomUUID()}`, result.error)] } };

    const current = await projectForCurrent(ctx, ctx.storeId, productId);
    return {
      data: { ok: true, productId, collectionId: input.collectionId },
      ui: current ? { cards: [productCard(current.detail, current.approvalState)], project: current.project } : undefined,
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRODUCT_TOOLS: Tool<any, any>[] = [
  createProductTool,
  updateProductTool,
  setPriceTool,
  getQuoteTool,
  submitProofTool,
  approveProofTool,
  requestProofChangesTool,
  publishProductTool,
  archiveProductTool,
  listProductsTool,
  getProductTool,
  createCollectionTool,
  assignToCollectionTool,
];
