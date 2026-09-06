import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool } from '@/lib/tools/types';
import { getBlank, listBlanks } from '@/lib/services/blanks';
import type { Card } from '@/lib/ui-cards/schemas';

export const listBlanksTool = defineTool({
  name: 'list_blanks',
  description:
    "Browse the blank garment catalogue (t-shirts, hoodies, tote bags, ...) the artist can print designs on. Call this whenever the artist wants to see, browse, or search available blanks or garments — e.g. 'show me hoodies', 'what blanks do you have', 'anything in black'. Shows the user a visual grid; you only need to summarise the count and top results in text. Never invent blanks, types, or prices — only what this tool returns exists in the catalogue.",
  input: z
    .object({
      type: z.string().max(60).optional().describe("Garment type filter, e.g. 'T-Shirts', 'Sweats & Hoodies'."),
      fit: z.string().max(40).optional().describe("Fit filter, e.g. 'Regular', 'Oversized'."),
      colour: z.string().max(20).optional().describe('Supplier colour code to filter by, e.g. C002.'),
      q: z.string().max(120).optional().describe('Free-text search over name, description, supplier and code.'),
      limit: z.number().int().min(1).max(24).optional().describe('Max results, default 12.'),
    })
    .strict(),
  scope: 'both',
  readOnly: true,
  run: async (_ctx, input) => {
    const { items, total } = await listBlanks(input);
    const cards: Card[] = [
      {
        id: `blank_grid_${randomUUID()}`,
        kind: 'blank_grid',
        title: 'Blanks',
        items: items.map((b) => ({ code: b.code, name: b.name, imageUrl: b.imageUrl ?? '', fromPriceCents: b.fromPriceCents ?? undefined })),
        total,
      },
    ];
    return {
      data: { total, items: items.map((b) => ({ code: b.code, name: b.name, type: b.type, fromPriceCents: b.fromPriceCents })) },
      ui: { cards },
    };
  },
});

interface GetBlankData {
  found: boolean;
  code?: string;
  name?: string;
  type?: string;
  fit?: string | null;
  fromPriceCents?: number | null;
  colours?: string[];
  sizes?: string[];
  printServices?: string[];
}

export const getBlankTool = defineTool({
  name: 'get_blank',
  description:
    "Get full specs for one blank garment by its exact code (colours, sizes, size guide availability, print services, starting price). Call this when the artist names a specific code (e.g. 'STTU169') or picks one from a list_blanks result. Don't guess a code — call list_blanks first if you don't already have one.",
  input: z.object({ code: z.string().min(2).max(20).describe('Blank code, e.g. STTU169.') }).strict(),
  scope: 'both',
  readOnly: true,
  run: async (_ctx, input): Promise<{ data: GetBlankData; ui?: { cards: Card[] } }> => {
    const blank = await getBlank(input.code.trim().toUpperCase());
    if (!blank) {
      return {
        data: { found: false },
        ui: { cards: [{ id: `notice_${randomUUID()}`, kind: 'notice', tone: 'warning', text: `No blank found with code ${input.code}.` }] },
      };
    }
    const card: Card = {
      id: `blank_${blank.code}`,
      kind: 'blank',
      code: blank.code,
      name: blank.supplierName ?? blank.name,
      description: blank.description ?? undefined,
      imageUrl: blank.frontImageUrl ?? '',
      backImageUrl: blank.backImageUrl ?? undefined,
      type: blank.type,
      fit: blank.fit ?? undefined,
      composition: blank.composition ?? undefined,
      weightGsm: blank.weightGsm ?? undefined,
      colours: blank.colours,
      sizes: blank.sizes,
      printServices: blank.printServices,
      fromPriceCents: blank.fromPriceCents ?? undefined,
    };
    return {
      data: {
        found: true,
        code: blank.code,
        name: blank.supplierName ?? blank.name,
        type: blank.type,
        fit: blank.fit,
        fromPriceCents: blank.fromPriceCents,
        colours: blank.colours.map((c) => c.code),
        sizes: blank.sizes,
        printServices: blank.printServices,
      },
      ui: { cards: [card] },
    };
  },
});
