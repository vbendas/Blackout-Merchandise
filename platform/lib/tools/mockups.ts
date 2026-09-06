import { randomUUID } from 'crypto';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { getDesignImageUrl, renderDesignOnBlank, renderProductMockups } from '@/lib/services/mockups';
import type { Card } from '@/lib/ui-cards/schemas';
import { defineTool, type Tool } from '@/lib/tools/types';

async function colourNames(codes: string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();
  const rows = await db.select({ code: schema.colours.code, name: schema.colours.name }).from(schema.colours).where(inArray(schema.colours.code, codes));
  return new Map(rows.map((c) => [c.code, c.name]));
}

interface RenderMockupsData {
  found: boolean;
  productId?: string;
  rendered?: number;
  colours?: string[];
}

interface PreviewOnBlankData {
  found: boolean;
  blankCode?: string;
  colours?: string[];
}

export const renderMockupsTool = defineTool({
  name: 'render_mockups',
  description:
    "Render (or re-render) product mockup photos: composites the artist's design onto the blank garment packshot for every enabled colourway of a draft product. Call this once a product has a design, blank and colours set, or whenever the artist wants fresh mockups (e.g. after changing the design or moving the print). Colours that already have a mockup are skipped unless force is set. Shows a visual grid; you only need to summarise the count in text.",
  input: z
    .object({
      productId: z.string().min(1).describe('Product id to render mockups for.'),
      force: z.boolean().optional().describe('Re-render colours that already have a mockup instead of skipping them.'),
    })
    .strict(),
  scope: 'both',
  readOnly: false,
  run: async (_ctx, input): Promise<{ data: RenderMockupsData; ui?: { cards: Card[] } }> => {
    const [product] = await db
      .select({ id: schema.products.id, name: schema.products.name })
      .from(schema.products)
      .where(eq(schema.products.id, input.productId))
      .limit(1);
    if (!product) {
      return {
        data: { found: false },
        ui: { cards: [{ id: `notice_${randomUUID()}`, kind: 'notice', tone: 'warning', text: `No product found with id ${input.productId}.` }] },
      };
    }

    const results = await renderProductMockups(input.productId, input.force ?? false);
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
    "Preview a design printed on a specific blank garment before a product exists. Call this when the artist wants to try a design on one or more colourways to decide before committing — e.g. 'show me this design on the black hoodie' or 'try it in navy too'. Shows a visual grid, one mockup per colour; tapping one lets the artist turn it into a product.",
  input: z
    .object({
      designId: z.string().min(1).describe('Design id to preview.'),
      blankCode: z.string().min(2).max(20).describe('Blank code, e.g. STTU169.'),
      colourCodes: z.array(z.string().min(1)).min(1).max(6).describe('Supplier colour codes to preview, e.g. ["C002", "C001"].'),
      position: z
        .string()
        .max(40)
        .optional()
        .describe("Print position, e.g. 'front_chest', 'back', 'centre'. Defaults to the blank type's usual spot."),
      widthCm: z.number().min(1).max(60).optional().describe('Print width in cm on the garment. Defaults to a standard chest print size.'),
    })
    .strict(),
  scope: 'both',
  readOnly: false,
  run: async (_ctx, input): Promise<{ data: PreviewOnBlankData; ui?: { cards: Card[] } }> => {
    const designUrl = await getDesignImageUrl(input.designId);
    if (!designUrl) {
      return {
        data: { found: false },
        ui: { cards: [{ id: `notice_${randomUUID()}`, kind: 'notice', tone: 'warning', text: `No design found with id ${input.designId}.` }] },
      };
    }

    const names = await colourNames(input.colourCodes);
    const placement = { position: input.position ?? 'front_chest', widthCm: input.widthCm ?? 28 };

    const items: NonNullable<Extract<Card, { kind: 'mockup_grid' }>['items']> = [];
    for (const colourCode of input.colourCodes) {
      const url = await renderDesignOnBlank({ designUrl, blankCode: input.blankCode, colourCode, placement });
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
