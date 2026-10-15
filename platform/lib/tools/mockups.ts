import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { getDesign } from '@/lib/services/designs';
import { getDesignImageUrl, renderDesignOnBlank, renderProductMockups } from '@/lib/services/mockups';
import { UnknownPositionError, checkPlacementPosition, getDefaultPosition } from '@/lib/mockups/placements';
import type { Card } from '@/lib/ui-cards/schemas';
import { defineTool, type Tool } from '@/lib/tools/types';

// Both tools act on a shop's own designs and products, so each one checks the
// design and the product belong to the caller's shop before it renders
// anything. Another shop's id reads exactly like an id that does not exist.

/** What these tools hand to the mockup renderer. Tests swap it for stubs. */
export const mockupIo = { renderProductMockups, renderDesignOnBlank, getDesignImageUrl };

async function colourNames(codes: string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();
  const rows = await db.select({ code: schema.colours.code, name: schema.colours.name }).from(schema.colours).where(inArray(schema.colours.code, codes));
  return new Map(rows.map((c) => [c.code, c.name]));
}

async function blankTypeOf(blankCode: string): Promise<string | null> {
  const rows = await db.select({ type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
  return rows[0]?.type ?? null;
}

function notice(text: string): Card {
  return { id: `notice_${randomUUID()}`, kind: 'notice', tone: 'warning', text };
}

type Refusal = { data: { found: boolean; error: string }; ui: { cards: Card[] } };

/** A call that stops before any rendering: nothing found, or nothing that is the caller's. */
function refuse(error: string, text: string, found = false): Refusal {
  return { data: { found, error }, ui: { cards: [notice(text)] } };
}

interface RenderMockupsData {
  found: boolean;
  error?: string;
  productId?: string;
  rendered?: number;
  colours?: string[];
}

interface PreviewOnBlankData {
  found: boolean;
  error?: string;
  blankCode?: string;
  colours?: string[];
}

export const renderMockupsTool = defineTool({
  name: 'render_mockups',
  description:
    "Render (or re-render) product mockup photos: composites the artist's design onto the blank garment packshot for every enabled colourway of a draft product. Call this once a product has a design, blank and colours set, or whenever the artist wants fresh mockups (e.g. after changing the design or moving the print). Colours that already have a mockup are skipped unless force is set. Only works on the artist's own products. Shows a visual grid; you only need to summarise the count in text.",
  input: z
    .object({
      productId: z.string().min(1).describe('Product id to render mockups for.'),
      force: z.boolean().optional().describe('Re-render colours that already have a mockup instead of skipping them.'),
    })
    .strict(),
  scope: 'both',
  readOnly: false,
  run: async (ctx, input): Promise<{ data: RenderMockupsData; ui?: { cards: Card[] } }> => {
    if (!ctx.storeId) return refuse('no_store', 'No shop found for this account yet.');

    const [product] = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        designId: schema.products.designId,
        blankCode: schema.products.blankCode,
        placement: schema.products.placement,
      })
      .from(schema.products)
      .where(and(eq(schema.products.id, input.productId), eq(schema.products.storeId, ctx.storeId)))
      .limit(1);
    if (!product) return refuse('not_found', `No product found with id ${input.productId}.`);

    if (product.designId) {
      const design = await getDesign(product.designId);
      if (!design || design.storeId !== ctx.storeId) return refuse('not_found', `The design on ${product.name} was not found in your shop.`);
    }

    // A placement the garment cannot take is reported, not moved: the product keeps what the artist chose.
    const type = await blankTypeOf(product.blankCode);
    const position = (product.placement as { position?: string } | null)?.position;
    if (type && position) {
      const check = checkPlacementPosition(type, position);
      if (!check.ok) return { data: { found: true, productId: product.id, error: check.error }, ui: { cards: [notice(check.error)] } };
    }

    let results: Awaited<ReturnType<typeof mockupIo.renderProductMockups>>;
    try {
      results = await mockupIo.renderProductMockups(input.productId, input.force ?? false);
    } catch (err) {
      if (err instanceof UnknownPositionError) return { data: { found: true, productId: product.id, error: err.message }, ui: { cards: [notice(err.message)] } };
      throw err;
    }
    const names = await colourNames(results.map((r) => r.colourCode));

    const card: Card = {
      id: `mockup_grid_${randomUUID()}`,
      kind: 'mockup_grid',
      title: `${product.name} — mockups`,
      items: results.map((r) => ({
        id: `${input.productId}_${r.colourCode}`,
        url: r.url,
        label: names.get(r.colourCode) ?? r.colourCode,
        colourCode: r.colourCode,
      })),
      columns: Math.min(4, Math.max(1, results.length)),
    };

    return {
      data: { found: true, productId: input.productId, rendered: results.length, colours: results.map((r) => r.colourCode) },
      ui: { cards: [card] },
    };
  },
});

export const previewOnBlankTool = defineTool({
  name: 'preview_on_blank',
  description:
    "Preview a design printed on a specific blank garment before a product exists. Call this when the artist wants to try a design on one or more colourways to decide before committing — e.g. 'show me this design on the black hoodie' or 'try it in navy too'. Only works on the artist's own designs. Shows a visual grid, one mockup per colour; tapping one lets the artist turn it into a product. A position the garment doesn't take (there is no sleeve print yet) is refused with the ones it does.",
  input: z
    .object({
      designId: z.string().min(1).describe('Design id to preview.'),
      blankCode: z.string().min(2).max(20).describe('Blank code, e.g. STTU169.'),
      colourCodes: z.array(z.string().min(1)).min(1).max(6).describe('Supplier colour codes to preview, e.g. ["C002", "C001"].'),
      position: z
        .string()
        .max(40)
        .optional()
        .describe("Print position: 'front_chest', 'front_full', 'front_left_chest', 'back', 'centre' or 'front_leg', whichever the garment takes. Defaults to the blank type's usual spot."),
      widthCm: z.number().min(1).max(60).optional().describe('Print width in cm on the garment. Defaults to a standard chest print size.'),
    })
    .strict(),
  scope: 'both',
  readOnly: false,
  run: async (ctx, input): Promise<{ data: PreviewOnBlankData; ui?: { cards: Card[] } }> => {
    if (!ctx.storeId) return refuse('no_store', 'No shop found for this account yet.');

    const design = await getDesign(input.designId);
    if (!design || design.storeId !== ctx.storeId) return refuse('not_found', `No design found with id ${input.designId}.`);

    const type = await blankTypeOf(input.blankCode);
    if (!type) return refuse('unknown_blank', `No blank found with code ${input.blankCode}.`, true);

    const position = input.position ?? getDefaultPosition(type);
    const check = checkPlacementPosition(type, position);
    if (!check.ok) return { data: { found: true, blankCode: input.blankCode, error: check.error }, ui: { cards: [notice(check.error)] } };

    const designUrl = await mockupIo.getDesignImageUrl(input.designId);
    if (!designUrl) return refuse('no_image', `Design ${input.designId} has no image yet.`, true);

    const names = await colourNames(input.colourCodes);
    const placement = { position, widthCm: input.widthCm ?? 28 };

    const items: NonNullable<Extract<Card, { kind: 'mockup_grid' }>['items']> = [];
    for (const colourCode of input.colourCodes) {
      const url = await mockupIo.renderDesignOnBlank({ designUrl, blankCode: input.blankCode, colourCode, placement });
      const colourName = names.get(colourCode) ?? colourCode;
      items.push({
        id: `${input.designId}_${input.blankCode}_${colourCode}`,
        url,
        label: colourName,
        designId: input.designId,
        colourCode,
        prompt: `Use design ${input.designId} on ${input.blankCode} in ${colourName}`,
      });
    }

    const card: Card = {
      id: `mockup_grid_${randomUUID()}`,
      kind: 'mockup_grid',
      title: `Preview on ${input.blankCode}`,
      items,
      columns: Math.min(4, Math.max(1, items.length)),
    };

    return {
      data: { found: true, blankCode: input.blankCode, colours: input.colourCodes },
      ui: { cards: [card] },
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MOCKUP_TOOLS: Tool<any, any>[] = [renderMockupsTool, previewOnBlankTool];
