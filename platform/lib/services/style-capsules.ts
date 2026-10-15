// Style Capsules: static v0 catalogue for the metal/tattoo/illustration crowd.
// No curated reference-image library yet (Victor adds later) — referenceUrls
// stays empty and generation falls back to prompt-only guidance until then.
// See Documentation/05-Shared/Image-Generation-Architecture.md §6.
//
// Print prep (Documentation/Dev/Print-Prep-Plan.md) owns every print effect:
// halftone dots, grain and misregistration are applied by the engine from a
// recipe, deterministically, so the prompts below never ask the model to paint
// them. Each capsule carries that recipe (`printRecipe`), and the colour
// clauses of its prompt are generated from it, so what the model is asked to
// draw and what the press is set up to print cannot drift apart.
import { DEFAULT_RECIPE, mergeRecipe } from '@/lib/print/defaults';
import type { PrintTechnique, RecipeOverride } from '@/lib/print/types';

export interface StyleCapsule {
  id: string;
  name: string;
  description: string;
  /** the look in words, then the colour clause generated from printRecipe */
  promptFragment: string;
  /** appended as guidance to avoid, folded into the prompt (NB2 has no dedicated negative-prompt field) */
  negativeFragment: string;
  /** the channel the look suits best: line work prints well as DTG/DTF, flat spot art on screens */
  suggestedPrintTechnique: PrintTechnique;
  /** how print prep separates this look. Merged over DEFAULT_RECIPE, under a design's own overrides and an auditor's re-run. */
  printRecipe: RecipeOverride;
  /** the ink colours the art should use, derived from printRecipe by inkColoursFor */
  inkColours: number;
  /** curated anchor images; empty until Victor supplies a library per capsule */
  referenceUrls: string[];
}

/**
 * The ink colours a recipe leaves for the art: the screen budget minus the
 * white underbase a dark garment needs and the highlight white, when the
 * recipe keeps one. With the engine defaults that is 8 - 2 = 6, "a dark
 * garment gets up to 6 colours plus the two whites" (Plan 4.3).
 */
export function inkColoursFor(recipe: RecipeOverride): number {
  const merged = mergeRecipe(DEFAULT_RECIPE, recipe);
  const whites = 1 + (merged.highlightWhite ? 1 : 0);
  return Math.max(1, merged.maxScreens - whites);
}

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** What the model is asked to colour the art with. A palette only names the
 * inks when it has one name per ink; otherwise the count alone stands. */
function colourClause(inks: number, palette: string[] | undefined): string {
  const named = palette && palette.length === inks ? ` (${joinList(palette)})` : '';
  if (inks === 1) return `one solid ink colour${named}`;
  return `exactly ${countWord(inks)} flat ink colours${named}`;
}

/** The colour half of the negative prompt: nothing the press has no screen
 * for. A look that shades with flat tints of its inks (tints) may keep them. */
function colourAvoid(inks: number, tints: boolean): string {
  const limit = inks === 1 ? 'no other colours' : `no more than ${countWord(inks)} colours`;
  return tints ? `no smooth gradients, ${limit}` : `no gradients, no tints, ${limit}`;
}

/** Flat spot art: one screen per ink and the white underbase for dark
 * garments. Flat shapes have no soft highlights to lift, so no highlight white. */
function spot(inks: number, rest: RecipeOverride = {}): RecipeOverride {
  return { method: 'spot', maxScreens: inks + 1, highlightWhite: false, ...rest };
}

interface CapsuleDef {
  id: string;
  name: string;
  /** what the artist reads: the look as delivered, with no promise of an effect print prep does not apply yet */
  description: string;
  /** the look, with no colour counts and no print effects */
  style: string;
  /** colours the style fixes by name, one per ink */
  palette?: string[];
  /** what else to avoid; the colour part comes from the recipe */
  avoid: string;
  /** the look shades with flat lighter tints of its inks, which print prep halftones */
  tints?: boolean;
  suggestedPrintTechnique: PrintTechnique;
  printRecipe: RecipeOverride;
}

const DEFS: CapsuleDef[] = [
  {
    id: 'american-traditional',
    name: 'American traditional',
    description: 'Bold black outlines, limited flat palette, vintage tattoo-flash energy.',
    style: 'american traditional tattoo flash style, bold thick black outlines, classic vintage tattoo illustration, clean linework',
    palette: ['red', 'green', 'yellow', 'black'],
    avoid: 'no photorealism, no soft shading, no thin fragile lines',
    suggestedPrintTechnique: 'screen',
    // Four inks and the underbase: five screens on a dark garment.
    printRecipe: spot(4),
  },
  {
    id: 'blackletter',
    name: 'Blackletter',
    description: 'Gothic blackletter typography and ornamentation, high contrast.',
    style: 'blackletter gothic typography, old english lettering, high contrast, ornamental flourishes, medieval manuscript feel',
    palette: ['black'],
    avoid: 'no sans-serif type, no soft rounded letterforms',
    suggestedPrintTechnique: 'screen',
    // Hairline serifs: the default 0.2 mm underbase choke would leave nothing under a 0.4 mm stroke.
    printRecipe: spot(1, { underbaseChokeMm: 0.1 }),
  },
  {
    id: 'woodcut',
    name: 'Woodcut',
    description: 'Hand-carved woodblock print texture, heavy crosshatching, rustic and stark.',
    style: 'woodcut print style, hand-carved woodblock texture, heavy crosshatching and stippling, high contrast, rustic engraving look',
    palette: ['black'],
    avoid: 'no smooth digital shading, no photorealistic texture',
    suggestedPrintTechnique: 'screen',
    printRecipe: spot(1),
  },
  {
    id: 'death-metal-logo',
    name: 'Death-metal logo',
    description: 'Jagged, near-illegible extreme-metal logo lettering, spikes and thorns.',
    style: 'extreme death metal band logo lettering, jagged spiky illegible typography, thorned and bladed letterforms, symmetrical, aggressive',
    palette: ['black'],
    avoid: 'no friendly rounded fonts, no legibility at a glance',
    suggestedPrintTechnique: 'screen',
    // Thin spike tips need the same shallow choke as hairlines.
    printRecipe: spot(1, { underbaseChokeMm: 0.1 }),
  },
  {
    id: 'riso-2-colour',
    name: 'Riso 2-colour',
    description: 'Two flat spot colours, bold simple shapes, zine-poster energy.',
    style: 'bold simple shapes, flat poster composition, zine poster aesthetic',
    avoid: 'no photographic detail, no smooth digital blending',
    suggestedPrintTechnique: 'screen',
    // Tints print coarser than the 55 lpi default, at the classic 45 degrees: the riso dot comes from print prep.
    printRecipe: spot(2, { halftone: { lpi: 45, angleDeg: 45, dot: 'round' } }),
  },
  {
    id: 'photocopy-zine',
    name: 'Photocopy zine',
    description: 'Punk cut-and-paste zine collage: high contrast, torn paper edges.',
    style: 'punk zine cut-and-paste collage aesthetic, torn paper edges, high contrast, bold black shapes',
    palette: ['black'],
    avoid: 'no photographic detail, no soft edges',
    suggestedPrintTechnique: 'screen',
    printRecipe: spot(1),
  },
  {
    id: 'line-tattoo',
    name: 'Line tattoo',
    description: 'Fine single-weight linework, minimal fine-line tattoo style, no shading.',
    style: 'fine-line tattoo style, minimal single-weight continuous line illustration, no shading, delicate and precise linework',
    palette: ['black'],
    avoid: 'no thick bold outlines, no heavy shading, no colour fill',
    // Lines this fine come out best as DTG/DTF; the screen recipe still serves a run.
    suggestedPrintTechnique: 'dtg_dtf',
    printRecipe: spot(1, { underbaseChokeMm: 0.1 }),
  },
  {
    id: 'halftone',
    name: 'Halftone',
    description: 'Comic pop-art look: bold inked outlines, flat tonal shading, high contrast.',
    style: 'comic book pop-art illustration, bold inked outlines, shading as flat lighter tints of the same ink colours with clean hard edges, high contrast, retro pop-art',
    avoid: 'no photorealistic shading, no soft blur',
    tints: true,
    suggestedPrintTechnique: 'screen',
    // The comic dot comes from print prep, not from the model: tints print at a coarse 35 lpi.
    // Tinted art is the one look the engine decides on; the other seven are flat spot art.
    printRecipe: spot(2, { method: 'auto', halftone: { lpi: 35, angleDeg: 45, dot: 'round' } }),
  },
];

function toCapsule(def: CapsuleDef): StyleCapsule {
  const inkColours = inkColoursFor(def.printRecipe);
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    promptFragment: `${def.style}, ${colourClause(inkColours, def.palette)}`,
    negativeFragment: `${def.avoid}, ${colourAvoid(inkColours, def.tints === true)}`,
    suggestedPrintTechnique: def.suggestedPrintTechnique,
    printRecipe: def.printRecipe,
    inkColours,
    referenceUrls: [],
  };
}

export const STYLE_CAPSULES: StyleCapsule[] = DEFS.map(toCapsule);

export function getStyleCapsule(id: string): StyleCapsule | null {
  return STYLE_CAPSULES.find((c) => c.id === id) ?? null;
}

export function listStyleCapsules(): StyleCapsule[] {
  return STYLE_CAPSULES;
}
