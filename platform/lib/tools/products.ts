import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import {
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  publishProduct,
  setPrice,
  updateProduct,
  type ProductDetail,
  type ProductStatus,
} from '@/lib/services/products';
import { approveProof, getLatestProof, requestChanges, submitProof, type ProofDetail, type ProofStatus } from '@/lib/services/proofs';
import { quoteFor, type QuoteBreak } from '@/lib/services/quotes';
import { assignToCollection, createCollection } from '@/lib/services/collections';
import { getProjectCard } from '@/lib/services/conversations';
import type { Card, ProductProjectState, ToolUi } from '@/lib/ui-cards/schemas';

// Product / quote / proof / collection tools. Every write here is scoped by
// ctx.storeId (never a bare productId) and goes through the services in
// lib/services/{products,proofs,quotes,collections}.ts, which own the state
// machine. Tools that act on "the current product" accept an optional id and
// fall back to the conversation's project card (set by create_product and
// kept in sync by every tool below) so a chat like "price it at €35" -> "send
// the proof" -> "approve the proof" never needs the model to track uuids.

const placementSchema = z.object({
  position: z.string().min(1).max(40).describe("e.g. 'front_chest', 'front_full', 'back', 'sleeve', 'centre'."),
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

function productCard(detail: ProductDetail): Card {
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
  };
}

function proofCard(proof: ProofDetail, productName?: string): Card {
  return {
    id: `proof_${proof.id}_v${proof.version}`,
    kind: 'proof',
    title: productName ? `Proof v${proof.version} — ${productName}` : `Proof v${proof.version}`,
    proofId: proof.id,
    productId: proof.productId,
    version: proof.version,
    mockupUrls: proof.mockupUrls,
    spec: proof.spec,
    status: proof.status,
  };
}

function projectStateFor(detail: ProductDetail, proofStatus?: ProofStatus): ProductProjectState {
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
  };
}

function projectFor(detail: ProductDetail, proofStatus?: ProofStatus): NonNullable<ToolUi['project']> {
  return { kind: 'product', refId: detail.id, state: projectStateFor(detail, proofStatus) as unknown as Record<string, unknown> };
}

async function projectForCurrent(storeId: string, productId: string): Promise<{ detail: ProductDetail; project: NonNullable<ToolUi['project']> } | null> {
  const detail = await getProduct(storeId, productId);
  if (!detail) return null;
  const proof = await getLatestProof(storeId, productId);
  return { detail, project: projectFor(detail, proof?.status) };
}

// ---------------------------------------------------------------------------

interface CreateProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  name?: string;
  status?: ProductStatus;
  baseCostCents?: number | null;
}

export const createProductTool = defineTool({
  name: 'create_product',
  description:
    "Create a new draft product: a design printed on a blank garment. Requires the exact blank code (from list_blanks/get_blank), a print service offered on that blank, a placement (position + width in cm), at least one colour code and one size that are available on that blank. Snapshots the base cost (garment + print + margin) for quantity 1 as baseCostCents — the artist only ever sees this total, never the cost breakdown; use get_quote to explain pricing at other quantities. Best-effort renders mockups immediately; if rendering isn't available yet the product is still created without preview images. Sets this product as the conversation's active project, so later tools (set_price, submit_proof, publish_product, ...) can omit productId and act on it directly.",
  input: z
    .object({
      designId: z.string().uuid().optional().describe('Design to print, if one was uploaded or generated.'),
      blankCode: z.string().min(2).max(20),
      printServiceCode: z.string().min(2).max(40),
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

    return {
      data: { ok: true, productId: detail.id, name: detail.name, status: detail.status, baseCostCents: detail.baseCostCents },
      ui: {
        cards: [productCard(detail)],
        next: [
          { label: `Price it at €${suggestedPrice}`, prompt: `Price it at €${suggestedPrice}`, primary: true },
          { label: 'Add another colour', prompt: 'Add another colour' },
          { label: 'Send the proof', prompt: 'Send the proof' },
        ],
        project: projectFor(detail),
      },
    };
  },
});

interface UpdateProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  name?: string;
}

export const updateProductTool = defineTool({
  name: 'update_product',
  description:
    "Update an existing product's name, description, placement, enabled colours, enabled sizes, or collection. Colours and sizes must still be available on the product's blank. Changing colours re-triggers mockup rendering. Omit productId to update the product currently open in this conversation.",
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
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`update_product_err_${randomUUID()}`, result.error)] } };

    const detail = result.value;
    return {
      data: { ok: true, productId: detail.id, name: detail.name },
      ui: {
        cards: [productCard(detail)],
        next: [{ label: 'Send the proof', prompt: 'Send the proof', primary: true }],
        project: projectFor(detail),
      },
    };
  },
});

interface SetPriceData {
  ok: boolean;
  error?: string;
  retailPriceCents?: number;
  marginCents?: number;
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

    return {
      data: { ok: true, retailPriceCents: result.value.retailPriceCents, marginCents: result.value.marginCents },
      ui: {
        cards: [productCard(detail)],
        next: [
          { label: 'Send the proof', prompt: 'Send the proof', primary: true },
          { label: 'Add a collection', prompt: 'Add a collection called Winter Tour' },
        ],
        project: projectFor(detail),
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
    "Price a run of a blank + print service at a given quantity, using the seeded base-cost table (garment + print + margin, with quantity breaks). Pass either blankCode or productId (to reuse an existing product's blank/print service); printServiceCode is optional when productId is given. Returns only totals per quantity break — never the garment/print/margin components, which artists don't see. Use this for 'what would 40 hoodies cost', 'what's my margin at €40', or any pricing question.",
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
      title: blankLabel ? `Quote — ${blankLabel}` : 'Quote',
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

interface SubmitProofData {
  ok: boolean;
  error?: string;
  proofId?: string;
  version?: number;
  status?: ProofStatus;
}

export const submitProofTool = defineTool({
  name: 'submit_proof',
  description:
    "Submit the current mockups and spec for approval, moving the product from draft to proof_pending. Omit productId to submit a proof for the product currently open in this conversation. Returns a proof card the artist (or admin) can approve with approve_proof, or send back with request_proof_changes.",
  input: z.object({ productId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<SubmitProofData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to submit — create or open one first.' } };

    const result = await submitProof(ctx.storeId, productId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`submit_proof_err_${randomUUID()}`, result.error)] } };

    const current = await projectForCurrent(ctx.storeId, productId);
    if (!current) return { data: { ok: false, error: 'Product not found after submitting the proof.' } };

    return {
      data: { ok: true, proofId: result.value.id, version: result.value.version, status: result.value.status },
      ui: {
        cards: [proofCard(result.value, current.detail.name), productCard(current.detail)],
        next: [
          { label: 'Approve the proof', prompt: 'Approve the proof', primary: true },
          { label: 'Request changes', prompt: 'Request changes to the proof' },
        ],
        project: current.project,
      },
    };
  },
});

interface ApproveProofData {
  ok: boolean;
  error?: string;
  proofId?: string;
  status?: ProofStatus;
}

export const approveProofTool = defineTool({
  name: 'approve_proof',
  description:
    "Approve a pending proof so the product is ready to publish. Sensitive action: shows a confirm card and only executes once the human clicks confirm. Omit proofId to approve the latest pending proof for the product currently open in this conversation. Always pass productName and version (read them off the most recent proof or product card) so the confirmation reads clearly, e.g. 'Approve proof v2 for Tour Hoodie'.",
  input: z
    .object({
      proofId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
      productName: z.string().max(80).optional(),
      version: z.number().int().optional(),
    })
    .strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => `Approve proof v${input.version ?? '?'} for ${input.productName ?? 'this product'}.`,
  run: async (ctx, input): Promise<ToolResult<ApproveProofData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);

    let proofId = input.proofId;
    if (!proofId) {
      if (!productId) return { data: { ok: false, error: 'No proof to approve — send one first.' } };
      const latest = await getLatestProof(ctx.storeId, productId);
      if (!latest) return { data: { ok: false, error: 'No proof found for this product.' } };
      proofId = latest.id;
    }

    const result = await approveProof(ctx.storeId, proofId, ctx.userId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`approve_proof_err_${randomUUID()}`, result.error)] } };

    const current = await projectForCurrent(ctx.storeId, result.value.productId);

    return {
      data: { ok: true, proofId: result.value.id, status: result.value.status },
      ui: {
        cards: current ? [proofCard(result.value, current.detail.name), productCard(current.detail)] : [proofCard(result.value)],
        next: current ? [{ label: 'Publish the product', prompt: 'Publish the product', primary: true }] : undefined,
        project: current?.project,
      },
    };
  },
});

interface RequestChangesData {
  ok: boolean;
  error?: string;
  proofId?: string;
  status?: ProofStatus;
  notes?: string;
}

export const requestProofChangesTool = defineTool({
  name: 'request_proof_changes',
  description:
    "Send a pending proof back for changes with notes, moving the product back to draft. Omit proofId to target the latest pending proof for the product currently open in this conversation.",
  input: z.object({ proofId: z.string().uuid().optional(), productId: z.string().uuid().optional(), notes: z.string().min(1).max(1000) }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<RequestChangesData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);

    let proofId = input.proofId;
    if (!proofId) {
      if (!productId) return { data: { ok: false, error: 'No proof to update — submit one first.' } };
      const latest = await getLatestProof(ctx.storeId, productId);
      if (!latest) return { data: { ok: false, error: 'No proof found for this product.' } };
      proofId = latest.id;
    }

    const result = await requestChanges(ctx.storeId, proofId, input.notes);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`request_changes_err_${randomUUID()}`, result.error)] } };

    const current = await projectForCurrent(ctx.storeId, result.value.productId);

    return {
      data: { ok: true, proofId: result.value.id, status: result.value.status, notes: input.notes },
      ui: {
        cards: current ? [proofCard(result.value, current.detail.name), productCard(current.detail)] : [proofCard(result.value)],
        next: current
          ? [{ label: 'Update the design', prompt: 'I want to edit my design' }, { label: 'Send a new proof', prompt: 'Send the proof' }]
          : undefined,
        project: current?.project,
      },
    };
  },
});

interface PublishProductData {
  ok: boolean;
  error?: string;
  productId?: string;
  status?: ProductStatus;
}

export const publishProductTool = defineTool({
  name: 'publish_product',
  description:
    "Publish a product to the live shop. Only allowed once its latest proof is approved and the shop's Stripe account has both charges and payouts enabled — fails closed with a clear message otherwise. Sensitive action: shows a confirm card and only executes once the human clicks confirm. Omit productId to publish the product currently open in this conversation; always pass name (from the product card) so the confirmation reads clearly.",
  input: z.object({ productId: z.string().uuid().optional(), name: z.string().max(80).optional() }).strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => `Publish ${input.name ?? 'this product'} to your shop.`,
  run: async (ctx, input): Promise<ToolResult<PublishProductData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to publish — create or open one first.' } };

    const result = await publishProduct(ctx.storeId, productId);
    if (!result.ok) return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`publish_err_${randomUUID()}`, result.error)] } };

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
  name?: string;
  status?: ProductStatus;
  retailPriceCents?: number | null;
  marginCents?: number | null;
}

export const getProductTool = defineTool({
  name: 'get_product',
  description:
    "Get full details for one product (colours, sizes, price, margin, status). Call this when the artist says 'open product <id>' (e.g. from a list_products grid) or asks about a specific product. Omit productId to show the product currently open in this conversation.",
  input: z.object({ productId: z.string().uuid().optional() }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetProductData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to show.' } };

    const current = await projectForCurrent(ctx.storeId, productId);
    if (!current) {
      const text = 'Product not found for this shop.';
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`get_product_err_${randomUUID()}`, text)] } };
    }

    return {
      data: {
        ok: true,
        productId: current.detail.id,
        name: current.detail.name,
        status: current.detail.status,
        retailPriceCents: current.detail.retailPriceCents,
        marginCents: current.detail.marginCents,
      },
      ui: { cards: [productCard(current.detail)], project: current.project },
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

    const current = await projectForCurrent(ctx.storeId, productId);
    return {
      data: { ok: true, productId, collectionId: input.collectionId },
      ui: current ? { cards: [productCard(current.detail)], project: current.project } : undefined,
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
