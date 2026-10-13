import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool } from '@/lib/tools/types';
import { getBlank, listBlanks, type BlankListItem } from '@/lib/services/blanks';
import { BLANK_DISPLAY_NAMES, blankDisplayName } from '@/lib/catalog/display-names';
import { blankFactsLine } from '@/lib/catalog/blank-facts';
import type { Card } from '@/lib/ui-cards/schemas';

// Blanks are named by what they are ('Heavy hoodie'), not by the supplier's
// model name or style code. The artist taps a tile and the chat says "Show me
// the Heavy hoodie", so both tools below also take that name wherever they take
// a code, and both hand the model name and code side by side to map between them.

/** Codes whose display name is `text` (case-insensitive, with or without a leading 'the'). */
function codesForName(text: string): string[] {
  const needle = text.trim().toLowerCase().replace(/^the\s+/, '');
  if (!needle) return [];
  return Object.entries(BLANK_DISPLAY_NAMES)
    .filter(([, name]) => name.toLowerCase() === needle)
    .map(([code]) => code);
}

function displayName(blank: Pick<BlankListItem, 'code' | 'genericName'>): string {
  return blankDisplayName(blank.code, blank.genericName);
}

export const listBlanksTool = defineTool({
  name: 'list_blanks',
  description:
    "Browse the blank garment catalogue (t-shirts, hoodies, tote bags, ...) the artist can print designs on. Call this whenever the artist wants to see, browse, or search available blanks or garments — e.g. 'show me hoodies', 'what blanks do you have', 'anything in black'. Shows the user a visual grid; you only need to summarise the count and top results in text. Never invent blanks, types, or prices — only what this tool returns exists in the catalogue. Every blank has a `name` (e.g. 'Heavy hoodie') and a `facts` line (fabric, weight, fit): talk about blanks by that name, never by the code or a supplier's model name. Keep the `code` for tool calls. `q` also accepts a blank's name.",
  input: z
    .object({
      type: z.string().max(60).optional().describe("Garment type filter, e.g. 'T-Shirts', 'Sweats & Hoodies'."),
      fit: z.string().max(40).optional().describe("Fit filter, e.g. 'Regular', 'Oversized'."),
      colour: z.string().max(20).optional().describe('Supplier colour code to filter by, e.g. C002.'),
      q: z.string().max(120).optional().describe('Free-text search over name, description and code.'),
      limit: z.number().int().min(1).max(24).optional().describe('Max results, default 12.'),
    })
    .strict(),
  scope: 'both',
  readOnly: true,
  run: async (_ctx, input) => {
    // A search for a blank's display name is a search for its code.
    const codes = input.q ? codesForName(input.q) : [];
    const results = codes.length > 0 ? await Promise.all(codes.map((code) => listBlanks({ ...input, q: code }))) : [await listBlanks(input)];
    const items = results.flatMap((result) => result.items);
    const total = codes.length > 0 ? items.length : (results[0]?.total ?? 0);

    const shown = items.map((b) => ({
      code: b.code,
      name: displayName(b),
      type: b.type,
      facts: blankFactsLine(b.code) ?? undefined,
      imageUrl: b.imageUrl ?? '',
      fromPriceCents: b.fromPriceCents ?? undefined,
    }));

    const cards: Card[] = [
      {
        id: `blank_grid_${randomUUID()}`,
        kind: 'blank_grid',
        title: 'Blanks',
        items: shown.map(({ code, name, imageUrl, fromPriceCents, facts }) => ({ code, name, imageUrl, fromPriceCents, facts })),
        total,
      },
    ];
    return {
      data: { total, items: shown.map(({ code, name, type, facts, fromPriceCents }) => ({ code, name, type, facts, fromPriceCents })) },
      ui: { cards },
    };
  },
});

interface GetBlankData {
  found: boolean;
  code?: string;
  /** the name people read, e.g. 'Heavy hoodie' */
  name?: string;
  type?: string;
  fit?: string | null;
  facts?: string | null;
  fromPriceCents?: number | null;
  colours?: string[];
  sizes?: string[];
  printServices?: string[];
  /** set when a name fits more than one blank */
  matches?: { code: string; name: string }[];
}

export const getBlankTool = defineTool({
  name: 'get_blank',
  description:
    "Get full specs for one blank garment (colours, sizes, size guide availability, print services, starting price) by its code (e.g. 'STTU169') or by its name (e.g. 'Heavy hoodie'). Call this when the artist names a specific blank or picks one from a list_blanks result. Don't guess: call list_blanks first if you have neither a code nor a name. Talk about the blank by its `name`, never by the code or a supplier's model name.",
  input: z.object({ code: z.string().min(2).max(60).describe("Blank code, e.g. STTU169, or the blank's name, e.g. 'Heavy hoodie'.") }).strict(),
  scope: 'both',
  readOnly: true,
  run: async (_ctx, input): Promise<{ data: GetBlankData; ui?: { cards: Card[] } }> => {
    const wanted = input.code.trim();
    let blank = await getBlank(wanted.toUpperCase());

    if (!blank) {
      const codes = codesForName(wanted);
      if (codes.length === 1) {
        blank = await getBlank(codes[0]);
      } else if (codes.length > 1) {
        return { data: { found: false, matches: codes.map((code) => ({ code, name: blankDisplayName(code, wanted) })) } };
      }
    }

    if (!blank) {
      return {
        data: { found: false },
        ui: { cards: [{ id: `notice_${randomUUID()}`, kind: 'notice', tone: 'warning', text: "I couldn't find that blank." }] },
      };
    }

    const name = blankDisplayName(blank.code, blank.name);
    const card: Card = {
      id: `blank_${blank.code}`,
      kind: 'blank',
      code: blank.code,
      name,
      supplierName: blank.supplierName ?? undefined,
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
        name,
        type: blank.type,
        fit: blank.fit,
        facts: blankFactsLine(blank.code),
        fromPriceCents: blank.fromPriceCents,
        colours: blank.colours.map((c) => c.code),
        sizes: blank.sizes,
        printServices: blank.printServices,
      },
      ui: { cards: [card] },
    };
  },
});
