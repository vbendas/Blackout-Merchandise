// The server's half of a catalogue pick (lib/agent/pick.ts). It checks what the
// chat sent, keeps only the blanks and colours the catalogue holds, takes names,
// swatches and photos from the catalogue, and writes the note the assistant
// reads. No database code is imported here, so the route, the loop, the history
// reader and a read-only check can all load it.
import { z } from 'zod';
import { MAX_PICK, type ChatPick, type PickBlank, type PickColour } from '@/lib/agent/pick';
import { BLANK_DISPLAY_NAMES } from '@/lib/catalog/display-names';
import { COLOUR_NAMES } from '@/lib/catalog/colour-names';
import { PRODUCTS } from '@/lib/catalog/products';
import { BASE_COLOUR, BASE_SWATCH, COLOUR_SWATCHES, VARIANTS } from '@/lib/catalog/variants';

const colourSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(80),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const blankSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(1).max(80),
  colours: z.array(colourSchema).min(1).max(20),
  image: z
    .string()
    .max(200)
    .regex(/^\/packshots\/[\w./-]+$/)
    .refine((path) => !path.includes('..'), 'the image path has no parent folders'),
});

/** The shape the chat may send as `pick`. A message that breaks it is a 400. A `null` design counts as none. */
export const pickSchema = z.object({
  intent: z.enum(['design', 'run']),
  design: z
    .object({ id: z.uuid(), name: z.string().min(1).max(80) })
    .nullish()
    .transform((design) => design ?? undefined),
  blanks: z.array(blankSchema).max(MAX_PICK),
});

export type PickInput = z.infer<typeof pickSchema>;
type BlankInput = PickInput['blanks'][number];

const productByCode = new Map(PRODUCTS.map((product) => [product.code, product]));

function catalogColour(colour: BlankInput['colours'][number]): PickColour {
  const swatch = colourSwatch(colour.code);
  return {
    code: colour.code,
    name: COLOUR_NAMES[colour.code] ?? colour.name,
    hex: swatch ?? colour.hex,
  };
}

function colourSwatch(colourCode: string): string | undefined {
  return colourCode === BASE_COLOUR ? BASE_SWATCH : COLOUR_SWATCHES[colourCode];
}

/**
 * The pick as the server keeps it. Blanks the catalogue does not hold are
 * dropped, and so are colours a blank does not come in (its base colour plus
 * VARIANTS). A blank sent twice is merged. Names, swatches and photos come
 * from the catalogue where it has them. Undefined when nothing valid is left,
 * and the message then goes as plain text.
 */
export function catalogPick(input: PickInput): ChatPick | undefined {
  const picked = new Map<string, { blank: BlankInput; colours: PickColour[] }>();
  for (const blank of input.blanks) {
    if (!productByCode.has(blank.code)) continue;
    const allowed = new Set([BASE_COLOUR, ...(VARIANTS[blank.code] ?? [])]);
    const entry = picked.get(blank.code) ?? { blank, colours: [] };
    for (const colour of blank.colours) {
      if (allowed.has(colour.code) && !entry.colours.some((kept) => kept.code === colour.code)) {
        entry.colours.push(catalogColour(colour));
      }
    }
    picked.set(blank.code, entry);
  }

  const blanks: PickBlank[] = [];
  for (const { blank, colours } of picked.values()) {
    if (colours.length === 0) continue;
    blanks.push({
      code: blank.code,
      name: BLANK_DISPLAY_NAMES[blank.code] ?? blank.name,
      colours,
      image: productByCode.get(blank.code)?.src ?? blank.image,
    });
  }
  if (blanks.length === 0) return undefined;
  return { intent: input.intent, ...(input.design ? { design: input.design } : {}), blanks };
}

/** A pick as the chat stored it, read back for the strip. Undefined when it no longer fits the shape. */
export function storedPick(raw: unknown): ChatPick | undefined {
  const parsed = pickSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/**
 * The note the assistant reads right after the artist's own words, with the
 * exact codes its tools take. The artist's words stay the visible message.
 */
export function pickModelText(pick: ChatPick): string {
  const lines = pick.blanks.map(
    (blank) => `- ${blank.code} ${blank.name}: ${blank.colours.map((colour) => `${colour.code} ${colour.name}`).join(', ')}`,
  );
  if (pick.intent === 'run') {
    return [
      'The artist picked these blanks for one run:',
      ...lines,
      'Prepare one bulk quote (create_bulk_quote) with a line per blank and colour; ask for the quantities and sizes per line, and the shipping address if it is missing.',
    ].join('\n');
  }
  const design = pick.design
    ? `Design: ${pick.design.id} (${pick.design.name}).`
    : 'No design is attached yet: ask which design to use, or offer to upload one or create one.';
  return [
    'The artist picked these blanks in the catalogue for one design:',
    ...lines,
    design,
    'Make one product per blank with that design and exactly these colours (one create_product call each), use the same placement on all unless a garment needs another, print them DTG, or DTF where the blank has no DTG (shop products never screen print; that is for runs), ask once if placement is unclear, then show the mockups together.',
  ].join('\n');
}
