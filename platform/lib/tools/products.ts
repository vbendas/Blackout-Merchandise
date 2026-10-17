import { randomUUID } from 'crypto';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import {
  archiveProduct,
  checkPublishable,
  createProduct,
  describeBaseCost,
  editProductAreas,
  getProduct,
  listProducts,
  publishProduct,
  quoteProductAreas,
  setPrice,
  updateProduct,
  type PriceNeeded,
  type ProductAreaDetail,
  type PublishCheck,
  type ProductDetail,
  type ProductStatus,
} from '@/lib/services/products';
import { printPositionLabel } from '@/lib/mockups/placements';
import { productApproval, type ProductApproval } from '@/lib/services/print-prep';
import { approvalChip, printApprovalState } from '@/lib/tools/print';
import { getLatestProof, type ProofStatus } from '@/lib/services/proofs';
import { digitalServiceFor, quoteFor, type QuoteBreak } from '@/lib/services/quotes';
import { isDigitalAsk, isDigitalService, printedNote } from '@/lib/pricing/pod-table';
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
//
// A product prints one or more print areas (a front, a back, sleeves), each
// with its own design. Its base price is the garment with one print plus the
// extras for more areas, and the artist sees that breakdown (never the garment,
// print and margin inside it).
//
// The garment decides how a shop product prints (owner, 17 Oct 2026): DTG, or DTF where DTG isn't ideal. The artist is never asked,
// and a 'dtg' or 'dtf' that says otherwise is corrected with a short note, never refused. DTG or DTF is said to the artist only
// where it matters: when the product prints DTF ("Printed DTF on this garment").

const POSITIONS_WORDS =
  "'front_chest', 'front_full', 'front_left_chest', 'back', 'sleeve_left' or 'sleeve_right' (sleeves only on garments with sleeves; a sleeve shows as a flat true-size proof, never on a photo), 'centre' (bags) or 'front_leg' (trousers)";

const placementSchema = z.object({
  position: z.string().min(1).max(40).describe(`One the garment takes: ${POSITIONS_WORDS}. A position it doesn't take is refused, not moved.`),
  widthCm: z.number().positive().max(200).describe('Print width in cm on the garment.'),
  offsetYcm: z.number().optional().describe('Vertical offset from the default anchor, cm (positive = down).'),
});

const areaSchema = z.object({
  position: z.string().min(1).max(40).describe(`Where it prints: ${POSITIONS_WORDS}.`),
  widthCm: z.number().positive().max(200).optional().describe('Print width in cm. Leave it out for the usual size there (on a sleeve, the widest that fits the art).'),
  offsetYcm: z.number().optional().describe('Move the print down (positive) or up from its usual height, in cm.'),
  designId: z.string().uuid().optional().describe("The design printed in this area when it isn't the product's own, for example a different back print."),
});

/** '28 × 33.6 cm', or '28 cm wide' when the art's size isn't known. */
function areaSize(area: ProductAreaDetail): string {
  return area.heightCm ? `${area.widthCm} × ${area.heightCm} cm` : `${area.widthCm} cm wide`;
}

function areasView(detail: ProductDetail) {
  return detail.areas.map((a) => ({ position: a.position, label: a.label, size: areaSize(a), ...(a.sleeve ? { sleeve: true } : {}) }));
}

/** €17.00 */
function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** What the model is told about a product's print areas and its price: where each prints, and the base price
 * breakdown in the artist's words ('Garment with one print €17.00 · Front and back +€1.00 · Base €18.00'). */
function areasData(detail: ProductDetail) {
  return {
    printAreas: detail.areas.map((a) => ({ position: a.position, label: a.label, widthCm: a.widthCm, ...(a.heightCm ? { heightCm: a.heightCm } : {}), ...(a.designId && a.designId !== detail.designId ? { designId: a.designId } : {}) })),
    ...(detail.baseCostCents != null && detail.baseCostLines.length > 0 ? { basePrice: describeBaseCost(detail.baseCostLines, detail.baseCostCents) } : {}),
    ...(detail.addableAreas.length > 0 ? { canAdd: detail.addableAreas } : {}),
    // said to the artist only where it matters: DTG is the usual print and needs no words
    ...(detail.printServiceCode === 'dtf' ? { print: 'Printed DTF on this garment' } : {}),
  };
}

/** The chips that add a print area: a back print, a sleeve print. */
function addAreaChips(detail: ProductDetail): Chip[] {
  if (detail.status === 'archived') return [];
  const chips: Chip[] = [];
  if (detail.addableAreas.includes('back')) chips.push({ label: 'Add a back print', prompt: 'Add a back print' });
  if (detail.addableAreas.some((p) => p.startsWith('sleeve_'))) chips.push({ label: 'Add a sleeve print', prompt: 'Add a sleeve print on the left sleeve' });
  return chips;
}

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

/** The notice that goes with a product whose print method was corrected, or moved with its garment; nothing when it wasn't. */
function methodNotice(idPrefix: string, note: string | undefined): Card[] {
  return note ? [{ id: `${idPrefix}_method_${randomUUID()}`, kind: 'notice', tone: 'info', text: note }] : [];
}

/** How a product's print reads on its card: no jargon for the usual digital print (DTG), and "Printed DTF on this garment" where it is
 * DTF, which is where it matters. Any other method (embroidery) keeps its own name. */
function printWords(detail: ProductDetail): string {
  if (detail.printServiceCode === 'dtf') return 'Printed DTF on this garment';
  if (detail.printServiceCode === 'dtg') return 'Digital print';
  return detail.printServiceName;
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

function coloursView(detail: ProductDetail) {
  return detail.colours.map((c) => ({
    code: c.code,
    name: c.name,
    hex: c.hex,
    mockupUrl: c.mockupUrl ?? undefined,
    ...(Object.keys(c.views).length > 0 ? { views: c.views as Record<string, string> } : {}),
  }));
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
    colours: coloursView(detail),
    sizes: detail.sizes,
    printService: printWords(detail),
    placement: detail.placement ? `${detail.placement.position} · ${detail.placement.widthCm}cm` : undefined,
    areas: areasView(detail),
    ...(detail.baseCostLines.length > 0 ? { priceLines: detail.baseCostLines.map((l) => ({ label: l.label, cents: l.cents })) } : {}),
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
    colours: coloursView(detail),
    sizes: detail.sizes,
    printService: printWords(detail),
    placement: detail.placement ? `${detail.placement.position} · ${detail.placement.widthCm}cm` : undefined,
    areas: areasView(detail),
    ...(detail.baseCostLines.length > 0 ? { priceLines: detail.baseCostLines.map((l) => ({ label: l.label, cents: l.cents })) } : {}),
    ...(detail.addableAreas.length > 0 && detail.status !== 'archived' ? { addable: detail.addableAreas } : {}),
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
  printAreas?: ReturnType<typeof areasData>['printAreas'];
  basePrice?: string;
  canAdd?: string[];
  /** 'Printed DTF on this garment', only when the product prints DTF: said to the artist where it matters */
  print?: string;
  /** the print method asked for was corrected to the garment's own: say it in these words */
  note?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const createProductTool = defineTool({
  name: 'create_product',
  description:
    "Create a new draft product: designs printed on a blank garment. Requires the exact blank code (from list_blanks/get_blank), a print service offered on that blank, where it prints (placement: one position + width in cm, or areas: several print areas), at least one colour code and one size that are available on that blank. A product prints at most one front area (front chest, full front or left chest), one back, and the left and/or right sleeve on garments with sleeves (never tank tops, bags, hats, beanies or trousers); each area is at most 40 × 54 cm, portrait (the A2 screen film keeps room for its registration marks), a sleeve at most its own size. A front or back print sits 5 cm below the collar unless moved (offsetYcm). Each area can print its own design (designId per area), so the front and the back can be different artwork. A shop product prints digitally the way its garment does, so leave printServiceCode out and never ask the artist about DTG or DTF: the garment decides (DTG, or DTF on a garment where DTG isn't ideal: jackets, bags, hats, trousers, woven shirts and any the owner marked). A 'dtg' or 'dtf' that says otherwise is corrected, never refused, and the result's note says so; say DTG or DTF only then, or when the result's print says 'Printed DTF on this garment'. Embroidery is the one other method (printServiceCode 'embroidery', where the blank offers it). Screen print is only for runs (create_bulk_quote), so a screen service is refused here. Snapshots the base price as baseCostCents: the garment's price with one print area up to A2 on the front or the back, plus €1 when it prints front and back and €2 once for sleeve prints. The result's basePrice says it in the artist's words ('Garment with one print €17.00 · Front and back +€1.00 · Base €18.00'): tell them, with their margin once they have a price. Never show the garment, print and margin inside it. Best-effort renders mockups immediately (front and back photos; a sleeve as a flat proof); if rendering isn't available yet the product is still created without preview images. Sets this product as the conversation's active project, so later tools (set_price, get_product, set_print_areas, publish_product, ...) can omit productId and act on it directly. A shop product needs no proof: once its design's print files are approved for every area and it has a price, publish_product puts it in the shop.",
  input: z
    .object({
      designId: z.string().uuid().optional().describe('Design to print, if one was uploaded or generated (every area prints it unless the area names its own).'),
      blankCode: z.string().min(2).max(20),
      printServiceCode: z
        .string()
        .min(2)
        .max(40)
        .optional()
        .describe("Leave out: the garment decides how it prints (DTG, or DTF where DTG isn't ideal), and a 'dtg' or 'dtf' that disagrees is corrected with a note. Only 'embroidery' where the blank offers it. Screen print codes are for runs and are refused."),
      placement: placementSchema.optional().describe('One print area. Use areas for more than one.'),
      areas: z.array(areaSchema).min(1).max(4).optional().describe('Every print area, e.g. a front chest and a back, or a front and a left sleeve. Wins over placement.'),
      colours: z.array(z.string().min(1).max(10)).min(1).describe('Supplier colour codes, e.g. C002.'),
      sizes: z.array(z.string().min(1).max(6)).min(1),
      name: z.string().min(1).max(80).optional(),
    })
    .strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<CreateProductData>> => {
    if (!ctx.storeId) return noStore();
    if (!input.placement && !input.areas) {
      const text = 'Say where the print goes: a placement, or the print areas.';
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`create_product_err_${randomUUID()}`, text)] } };
    }

    const result = await createProduct({ storeId: ctx.storeId, ...input });
    if (!result.ok) {
      return { data: { ok: false, error: result.error }, ui: { cards: [errorNotice(`create_product_err_${randomUUID()}`, result.error)] } };
    }

    const detail = result.value;
    const note = result.note;
    const suggestedPrice = Math.ceil(((detail.baseCostCents ?? 0) + 500) / 100);
    const approval = await approvalOf(detail);
    const approvalState = printApprovalState(approval, ctx.conversationId);
    // The print files come before the shop: a product can't be published until its artwork is approved.
    const prepare = approval?.step?.kind === 'prepare' ? approvalChip(approval) : null;

    return {
      data: {
        ok: true,
        productId: detail.id,
        designId: detail.designId,
        name: detail.name,
        status: detail.status,
        baseCostCents: detail.baseCostCents,
        ...(note ? { note } : {}),
        ...areasData(detail),
        ...artworkData(approval),
      },
      ui: {
        cards: [productCard(detail, approvalState), ...methodNotice('create_product', note)],
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
  /** the product's print method moved to follow its garment: say it in these words */
  note?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const updateProductTool = defineTool({
  name: 'update_product',
  description:
    "Update an existing product's name, description, placement (moves or resizes its main print area; use set_print_areas to add or remove areas), enabled colours, enabled sizes, or collection. Colours and sizes must still be available on the product's blank. Changing colours re-triggers mockup rendering. Omit productId to update the product currently open in this conversation. On a product that is already live, adding a colour or moving the print needs the design's approval to cover it: the tool refuses with what is missing (prepare the print files, then the artist approves them) and changes nothing.",
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
      data: { ok: true, productId: detail.id, designId: detail.designId, name: detail.name, ...(result.note ? { note: result.note } : {}), ...areasData(detail), ...artworkData(approval) },
      ui: {
        cards: [productCard(detail, approvalState), ...methodNotice('update_product', result.note)],
        next: next ? [next] : undefined,
        project: projectFor(detail, undefined, approvalState),
      },
    };
  },
});

// -- print areas ------------------------------------------------------------

interface PrintAreasData {
  ok: boolean;
  error?: string;
  productId?: string;
  printAreas?: ReturnType<typeof areasData>['printAreas'];
  basePrice?: string;
  baseCostCents?: number | null;
  retailPriceCents?: number | null;
  marginCents?: number | null;
  canAdd?: string[];
  /** 'Printed DTF on this garment', only when the product prints DTF */
  print?: string;
  /** the change would put the base cost past the price: ask the artist for a new price of at least this, then call again with retailCents */
  newPriceNeeded?: { baseCostCents: number; minRetailCents: number; currentRetailCents: number; basePrice?: string };
  /** the product's print method moved to follow its garment: say it in these words */
  note?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
  designId?: string;
}

function priceNeededData(needed: PriceNeeded): NonNullable<PrintAreasData['newPriceNeeded']> {
  return {
    baseCostCents: needed.baseCostCents,
    minRetailCents: needed.minRetailCents,
    currentRetailCents: needed.retailPriceCents,
    ...(needed.lines.length > 0 ? { basePrice: describeBaseCost(needed.lines, needed.baseCostCents) } : {}),
  };
}

export const setPrintAreasTool = defineTool({
  name: 'set_print_areas',
  description:
    "Add, change or remove a product's print areas: add a back print, add a print on the left and/or right sleeve, change an area's size or its design, or take one away. add lists areas to print: a new one without widthCm takes the usual size there (on a sleeve, the widest that fits the art); one at a position the product already prints changes it, and what you leave out (its width, its offset, its design) stays as it was; remove lists positions to drop. Rules: at most one front area (front chest, full front or left chest), one back, and the sleeves on garments with sleeves (never tank tops, bags, hats, beanies or trousers); each area at most 40 × 54 cm, portrait (the A2 screen film keeps room for its registration marks), a sleeve at most its own size. Each area can print a different design. The base price follows the areas: the garment with one print area, +€1 when it prints front and back, +€2 once for sleeve prints. The result's basePrice says it in the artist's words ('Garment with one print €17.00 · Front and back +€1.00 · Sleeve prints +€2.00 · Base €20.00') with the margin at their price: tell them. If the new base would go above their price, nothing changes and newPriceNeeded says the lowest price that works: ask the artist for a new price, then call again with the same change and retailCents. Every new or changed area needs its print files prepared and approved before the product can be published (on a live product, before the change is made): prepare_print with the product, then the approval page. A sleeve shows as a flat, true-size proof, never on a photo. Omit productId for the product open in this conversation.",
  input: z
    .object({
      productId: z.string().uuid().optional(),
      add: z.array(areaSchema).max(4).optional().describe('Areas to print, e.g. [{ "position": "back" }] or [{ "position": "sleeve_left", "widthCm": 8 }].'),
      remove: z.array(z.string().min(1).max(40)).max(4).optional().describe('Positions to stop printing, e.g. ["sleeve_left"].'),
      retailCents: z.number().int().positive().optional().describe('A new retail price in cents, with the change: needed when the change lifts the base cost past the current price.'),
    })
    .strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<PrintAreasData>> => {
    if (!ctx.storeId) return noStore();
    const productId = await resolveProductId(ctx, input.productId);
    if (!productId) return { data: { ok: false, error: 'No product to change: create or open one first.' } };
    if (!input.add?.length && !input.remove?.length) {
      const text = 'Say which print area to add or remove.';
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`set_print_areas_err_${randomUUID()}`, text)] } };
    }

    const result = await editProductAreas(ctx.storeId, productId, { add: input.add, remove: input.remove, ...(input.retailCents ? { retailPriceCents: input.retailCents } : {}) });
    if (!result.ok) {
      if (result.approval) return approvalRefusal(ctx, 'set_print_areas', result.error, result.approval);
      const needed = result.priceNeeded;
      const chips: Chip[] = needed ? [{ label: `Price it at €${Math.ceil(needed.minRetailCents / 100)}`, prompt: `Make those print area changes and price it at €${Math.ceil(needed.minRetailCents / 100)}`, primary: true }] : [];
      return {
        data: { ok: false, error: result.error, ...(needed ? { newPriceNeeded: priceNeededData(needed) } : {}) },
        ui: { cards: [errorNotice(`set_print_areas_err_${randomUUID()}`, result.error)], next: chips.length ? chips : undefined },
      };
    }

    const detail = result.value;
    const approval = await approvalOf(detail);
    const approvalState = printApprovalState(approval, ctx.conversationId);
    const next = nextStepFor(detail, approval);
    return {
      data: {
        ok: true,
        productId: detail.id,
        ...(result.note ? { note: result.note } : {}),
        ...areasData(detail),
        baseCostCents: detail.baseCostCents,
        retailPriceCents: detail.retailPriceCents,
        marginCents: detail.marginCents,
        ...artworkData(approval),
      },
      ui: {
        cards: [productCard(detail, approvalState), ...methodNotice('set_print_areas', result.note)],
        next: [...(next ? [next] : []), ...addAreaChips(detail).slice(0, 1)],
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
  /** screen print: the price rests on a first guess at the screens, not on a design's print files */
  estimate?: boolean;
  /** screen print: the screens the guess assumed */
  screens?: number;
  /** a shop product's base price, in the artist's words: 'Garment with one print €17.00 · Front and back +€1.00 · Base €18.00' */
  basePrice?: string;
  /** a shop product's margin at its price, or at the price asked about */
  marginCents?: number;
  /** the garment's price is still a placeholder the owner hasn't set */
  placeholder?: boolean;
  /** a 'dtg' or 'dtf' that said otherwise was corrected to the garment's own method: say it in these words */
  note?: string;
}

export const getQuoteTool = defineTool({
  name: 'get_quote',
  description:
    "Two kinds of price. (1) A shop product's base price, for one piece at any quantity: pass shop: true with productId (its print areas) or with blankCode and positions (the print areas to price, e.g. ['front_chest', 'back', 'sleeve_left']; held to the product rules, so a sleeve on a garment without sleeves is refused), and optionally retailCents to show the margin at that price. A shop product prints the way its garment does (DTG, or DTF where DTG isn't ideal), so leave printServiceCode out: a 'dtg' or 'dtf' that says otherwise is corrected and the result's note says so. A product (productId, or the one open in this conversation) at qty 1 with no printServiceCode is priced this way too; pass shop: false for a run of one. It returns basePrice in the artist's words: 'Garment with one print €17.00 · Front and back +€1.00 · Sleeve prints +€2.00 · Base €20.00' (the garment's price includes one print area up to A2 on the front or the back; +€1 when it prints front and back; +€2 once for sleeve prints). (2) Otherwise, a run: price a run of a blank + print service at a given quantity, using the seeded base-cost table (garment + print + margin, with quantity breaks). Pass either blankCode or productId (to reuse an existing product's blank/print service); printServiceCode is optional when productId is given. A run can print by screen print (screen_1c, screen_2c, screen_3c) or digitally (printServiceCode 'digital': the garment decides between DTG and DTF, and the artist is never asked), whatever the shop product itself uses, so pass printServiceCode to price a different method. Returns only totals per quantity break — never the garment/print/margin components, which artists don't see. A screen-print price here is an estimate (estimate: true): it guesses the screens from the service's colours, plus the white underbase and highlight white on a dark garment (pass colourCode to say which garment colour; dark is assumed without it). Say it is an estimate: a run quote (create_bulk_quote) counts the screens from the design's print files, so its price can differ. Use this for 'what would 40 hoodies cost', 'what's my margin at €40', or any pricing question.",
  input: z
    .object({
      blankCode: z.string().min(2).max(20).optional(),
      productId: z.string().uuid().optional(),
      printServiceCode: z.string().min(2).max(40).optional(),
      qty: z.number().int().min(1).max(100000),
      colourCode: z.string().min(1).max(10).optional().describe('Screen print only: the garment colour code. A light garment needs no white underbase or highlight white, so its estimate counts fewer screens.'),
      shop: z.boolean().optional().describe("true: a shop product's base price (its print areas). false: a run, even for one piece."),
      positions: z.array(z.string().min(1).max(40)).min(1).max(4).optional().describe("Shop price only: the print areas to price, e.g. ['front_chest', 'back']. Left out with productId: the product's own."),
      retailCents: z.number().int().positive().optional().describe('Shop price only: a retail price to show the margin at.'),
    })
    .strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<GetQuoteData>> => {
    // A shop product's price: asked for, or a product at one piece with no run method named.
    const shop = input.shop ?? (Boolean(input.positions) || (!input.blankCode && !input.printServiceCode && input.qty === 1 && Boolean(await resolveProductId(ctx, input.productId))));
    if (shop) return shopQuote(ctx, input);
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

    // A digital run prints the way the garment does: 'digital', 'dtg' and 'dtf' all price the garment's own method, and a 'dtg' or
    // 'dtf' that says otherwise is corrected with a note.
    let note: string | undefined;
    if (isDigitalAsk(printServiceCode)) {
      const digital = await digitalServiceFor(blankCode);
      if (digital) {
        if (input.printServiceCode && isDigitalService(input.printServiceCode) && input.printServiceCode !== digital.service.code) note = printedNote(digital.method.code);
        printServiceCode = digital.service.code;
      }
    }

    const quote = await quoteFor({ blankCode, printServiceCode, qty: input.qty, ...(input.colourCode ? { colourCode: input.colourCode } : {}) });
    if (!quote) {
      const text = `No pricing configured for ${blankCode} with ${printServiceCode}.`;
      return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`quote_err_${randomUUID()}`, text)] } };
    }

    // A screen-print price with no design behind it guesses the screens; the card says so, and what the guess was.
    const estimateNote =
      quote.estimate && quote.screens !== undefined
        ? ` Estimate for ${quote.screens} ${quote.screens === 1 ? 'screen' : 'screens'}: a run quote counts the screens from the design's print files, so its price can differ.`
        : '';
    const card: Card = {
      id: `quote_${randomUUID()}`,
      kind: 'quote',
      title: blankLabel ? `Quote — ${blankDisplayName(blankLabel, blankLabel)}` : 'Quote',
      lines: quote.breaks.map((b) => ({ label: `${b.qtyFrom}+ units`, qty: b.qtyFrom, unitCents: b.unitCents, totalCents: b.unitCents * b.qtyFrom })),
      totalCents: quote.totalCents,
      currency: 'EUR',
      note: `${input.qty} unit${input.qty === 1 ? '' : 's'} at €${(quote.unitBaseCostCents / 100).toFixed(2)} each = €${(quote.totalCents / 100).toFixed(2)} total.${estimateNote}${note ? ` ${note}` : ''}`,
    };

    return {
      data: {
        ok: true,
        qty: input.qty,
        unitBaseCostCents: quote.unitBaseCostCents,
        totalCents: quote.totalCents,
        breaks: quote.breaks,
        ...(quote.estimate ? { estimate: true, ...(quote.screens !== undefined ? { screens: quote.screens } : {}) } : {}),
        ...(note ? { note } : {}),
      },
      // screen print is for runs, never a shop price: the next step for an estimate is a run quote, which counts the real screens
      ui: {
        cards: [card],
        next: quote.estimate
          ? [{ label: 'Quote a run', prompt: `Quote a bulk order of ${input.qty}` }]
          : [{ label: 'Set a price', prompt: `Price it at €${Math.ceil((quote.unitBaseCostCents + 500) / 100)}` }],
      },
    };
  },
});

/** A shop product's base price for its print areas: the breakdown the artist reads, and the margin at a price. */
async function shopQuote(ctx: ToolContext, input: { blankCode?: string; productId?: string; printServiceCode?: string; positions?: string[]; retailCents?: number }): Promise<ToolResult<GetQuoteData>> {
  let blankCode = input.blankCode;
  // left out on a blank: the method a new product of it takes (DTG, or DTF where it has no DTG)
  let printServiceCode: string | null = input.printServiceCode ?? null;
  let label = blankCode ? blankDisplayName(blankCode, blankCode) : '';
  let areas: { position: string; widthCm?: number }[] | null = input.positions?.map((position) => ({ position })) ?? null;
  // positions asked about are held to the product rules; a product's own areas are what it prints
  let check = true;
  let retail = input.retailCents ?? null;
  const productId = input.blankCode ? null : await resolveProductId(ctx, input.productId);
  if (!blankCode && productId) {
    if (!ctx.storeId) return noStore();
    const product = await getProduct(ctx.storeId, productId);
    if (!product) return { data: { ok: false, error: 'Product not found for this shop.' } };
    blankCode = product.blankCode;
    printServiceCode = input.printServiceCode ?? product.printServiceCode;
    label = product.name;
    if (!areas) {
      areas = product.areas.map((a) => ({ position: a.position, widthCm: a.widthCm }));
      check = false;
    }
    retail ??= product.retailPriceCents;
  }
  if (!blankCode || !areas) {
    const text = 'Which garment and print areas should I price? Pick a blank, or open a product.';
    return { data: { ok: false, error: text }, ui: { cards: [errorNotice(`quote_err_${randomUUID()}`, text)], next: [{ label: 'Browse blanks', prompt: 'Show me blanks' }] } };
  }

  const quoted = await quoteProductAreas(blankCode, printServiceCode, areas, { check });
  if (!quoted.ok) return { data: { ok: false, error: quoted.error }, ui: { cards: [errorNotice(`quote_err_${randomUUID()}`, quoted.error)] } };
  const price = quoted.value;
  const basePrice = describeBaseCost(price.lines, price.cents);
  const margin = retail != null ? retail - price.cents : null;
  const where = areas.map((a) => printPositionLabel(a.position).toLowerCase()).join(', ');
  const card: Card = {
    id: `quote_${randomUUID()}`,
    kind: 'quote',
    title: `Shop price — ${label}`,
    lines: price.lines.map((l) => ({ label: l.label, qty: 1, unitCents: l.cents, totalCents: l.cents })),
    totalCents: price.cents,
    currency: 'EUR',
    note: `Base price with ${where}: ${basePrice}.${margin !== null && retail !== null ? ` At ${euros(retail)} the margin is ${euros(margin)}.` : ''}${price.placeholder ? ' The garment price is provisional.' : ''}${price.note ? ` ${price.note}` : ''}`,
  };
  return {
    data: {
      ok: true,
      qty: 1,
      unitBaseCostCents: price.cents,
      totalCents: price.cents,
      basePrice,
      ...(margin !== null ? { marginCents: margin } : {}),
      ...(price.placeholder ? { placeholder: true } : {}),
      ...(price.note ? { note: price.note } : {}),
    },
    ui: { cards: [card], next: retail == null ? [{ label: 'Set a price', prompt: `Price it at €${Math.ceil((price.cents + 500) / 100)}` }] : undefined },
  };
}

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
  /** the product's print method moved to follow its garment as it went live: say it in these words */
  note?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
  /** the base cost moved past the price since the draft was priced: the lowest price that works now */
  newPriceNeeded?: { baseCostCents: number; minRetailCents: number; currentRetailCents: number; basePrice?: string };
}

/** A publish that was refused, in the artist's words: the artwork's sentence with its way on, the base cost that moved
 * past the price with a new price to set, or the plain notice. */
function publishRefusal(ctx: ToolContext, refused: { error: string; approval?: ProductApproval; priceNeeded?: PriceNeeded }): ToolResult<PublishProductData> {
  if (refused.approval) return approvalRefusal(ctx, 'publish', refused.error, refused.approval);
  const needed = refused.priceNeeded;
  const price = needed ? Math.ceil(needed.minRetailCents / 100) : null;
  return {
    data: { ok: false, error: refused.error, ...(needed ? { newPriceNeeded: priceNeededData(needed) } : {}) },
    ui: { cards: [errorNotice(`publish_err_${randomUUID()}`, refused.error)], next: price ? [{ label: `Price it at €${price}`, prompt: `Price it at €${price}`, primary: true }] : undefined },
  };
}

export const publishProductTool = defineTool({
  name: 'publish_product',
  description:
    "Publish a product to the live shop. Only allowed once the product's designs have print files approved for its garment, every colour it has and every print area (prepare_print, then the artist approves on the approval page; a product whose areas print different designs needs each design approved: get_product's artwork field says where that stands), it has a retail price at least €1 above its base cost (a draft goes live at today's base price for its print areas; if that moved past the price, the result's newPriceNeeded says the lowest price that works), and the shop's Stripe account has both charges and payouts enabled. A shop product needs no proof of its own: the artwork approval is the only approval it needs, and a draft is published directly. Fails closed with a plain sentence otherwise, and the result says what is missing and the next step (the print files to prepare, or the approval page). Never offer to publish before the artwork is approved. A product that is already live is not taken down when its approval is later withdrawn. Sensitive action: shows a confirm card and only executes once the human clicks confirm; a product that can't be published gets the refusal instead of a confirm card. Omit productId to publish the product currently open in this conversation; always pass name (from the product card) so the confirmation reads clearly.",
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
      data: { ok: true, productId: detail.id, status: detail.status, ...(result.note ? { note: result.note } : {}) },
      ui: {
        cards: [productCard(detail), ...methodNotice('publish', result.note)],
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
  printAreas?: ReturnType<typeof areasData>['printAreas'];
  basePrice?: string;
  canAdd?: string[];
  /** 'Printed DTF on this garment', only when the product prints DTF */
  print?: string;
  artwork?: ReturnType<typeof artworkData>['artwork'];
}

export const getProductTool = defineTool({
  name: 'get_product',
  description:
    "Get full details for one product (colours, sizes, print areas, the base price breakdown, price, margin, status, design id). Its artwork field says whether the design's print files are approved for this product's garment, colours and print position, which a product needs before it can be published, and when they are not, why and what to do (prepare_print with the prepare details, or the approval page). Call this when the artist says 'open product <id>' (e.g. from a list_products grid) or asks about a specific product, and before offering to publish. Omit productId to show the product currently open in this conversation.",
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
        ...areasData(current.detail),
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
  setPrintAreasTool,
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
