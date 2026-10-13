import { blankFactsLine } from './blank-facts';
import { CATALOGUE_CATEGORIES, fitFor, typeFor } from './catalog-filters';
import { colourName } from './colour-names';
import { blankDisplayName } from './display-names';
import { PRODUCT_DETAILS, printTechniquesFor } from './product-details';
import { PRODUCTS, type Product } from './products';
import { SIZE_GUIDES, type SizeGuide } from './size-guides';
import {
  BASE_COLOUR,
  BASE_SWATCH,
  COLOUR_ORDER,
  COLOUR_SWATCHES,
  VARIANTS,
  VARIANT_BACKS,
  variantBackSrc,
  variantSrc,
} from './variants';

// What the catalogue browser shows (components/catalogue/): every blank in
// the static catalog files as one list, plus the detail of a single blank.
// Pure on purpose, no database and no HTTP: the only live input is the base
// prices, which the route passes in (app/api/catalogue/catalogue-data.ts).
// Server only: it pulls in the whole catalog. The panel imports these types
// with `import type`, never a value.

export type CatalogueAudience = 'Unisex' | 'Men' | 'Women' | 'Kids' | 'Baby';

/** The 4th letter of a style code says who a blank is cut for. */
const AUDIENCE_BY_LETTER: Record<string, CatalogueAudience> = {
  U: 'Unisex',
  M: 'Men',
  W: 'Women',
  K: 'Kids',
  B: 'Baby',
};

/** Shell fabrics (puffers, gilets) list 38 or 75 g/m2, which reads as a garment
 * weight and misleads; the lightest knit in the catalogue is above this. Same
 * rule as lib/catalog/blank-facts.ts. */
const MIN_SHOWN_WEIGHT_GSM = 120;

/** Cheapest base cost per blank code in cents (one piece, any print service);
 * a blank with no price is simply absent. Plain object so it can be cached as JSON. */
export type CataloguePrices = Readonly<Record<string, number>>;

export interface CatalogueColour {
  code: string;
  /** 'French Navy' */
  name: string;
  /** sampled garment colour, for the swatch */
  hex: string;
}

export interface CatalogueItem {
  code: string;
  /** the name artists read, 'Heavy hoodie' */
  name: string;
  /** one of CATALOGUE_CATEGORIES */
  category: string;
  /** 'Fitted' | 'Medium' | 'Relaxed' | 'Oversized'; null for bags and hats */
  fit: string | null;
  audience: CatalogueAudience;
  /** g/m2; null for shell fabrics and when the sheet gives none */
  weightGsm: number | null;
  /** '100% organic cotton · 350 g · relaxed medium fit' */
  facts: string | null;
  /** base colour first, then the colours most blanks carry */
  colours: CatalogueColour[];
  colourCount: number;
  /** packshot in the base colour; the other colours' photos are in the detail */
  front: string;
  back: string | null;
  fromPriceCents: number | null;
}

/** A category with the number of blanks in it. */
export interface CatalogueCategoryCount {
  name: string;
  count: number;
}

export interface CatalogueIndex {
  /** in the order of CATALOGUE_CATEGORIES (lib/catalog/catalog-filters.ts) */
  categories: CatalogueCategoryCount[];
  items: CatalogueItem[];
}

export interface CatalogueDetailColour extends CatalogueColour {
  front: string;
  /** null when the supplier shot no back view in this colour */
  back: string | null;
}

export interface CatalogueDetail {
  code: string;
  name: string;
  category: string;
  /** one plain sentence or two, in MerchFrom's words; '' when there is none */
  description: string;
  composition: string;
  weightGsm: number | null;
  fit: string | null;
  /** in garment order, as the supplier sheet prints them */
  sizes: string[];
  /** 'XXS–5XL', '3–13 years', 'One size' */
  sizeRange: string;
  sizeGuide: SizeGuide | null;
  printTechniques: string[];
  certifications: string[];
  colours: CatalogueDetailColour[];
  /** close-up shots, in the base colour only */
  details: string[];
  fromPriceCents: number | null;
}

// ---------------------------------------------------------------------------
// Colours

const COLOUR_RANK = new Map(COLOUR_ORDER.map((code, i) => [code, i]));

/** Base colour first, then the blank's other colours the way most blanks carry
 * them (COLOUR_ORDER, most-carried first), so the first few are the familiar ones. */
function colourCodesFor(code: string): string[] {
  const others = [...new Set(VARIANTS[code] ?? [])].filter((c) => c !== BASE_COLOUR);
  others.sort((a, b) => (COLOUR_RANK.get(a) ?? 1000) - (COLOUR_RANK.get(b) ?? 1000) || a.localeCompare(b));
  return [BASE_COLOUR, ...others];
}

function swatchFor(colour: string): string {
  return colour === BASE_COLOUR ? BASE_SWATCH : (COLOUR_SWATCHES[colour] ?? '#808080');
}

function toColour(colour: string): CatalogueColour {
  return { code: colour, name: colourName(colour), hex: swatchFor(colour) };
}

function frontFor(product: Product, colour: string): string {
  return colour === BASE_COLOUR ? product.src : variantSrc(product.code, colour);
}

function backFor(product: Product, colour: string): string | null {
  if (colour === BASE_COLOUR) return product.back ?? null;
  return VARIANT_BACKS[product.code]?.includes(colour) ? variantBackSrc(product.code, colour) : null;
}

// ---------------------------------------------------------------------------
// Text

/** Supplier sheets name the brand in the odd sentence ("..., Stanley/Stella's
 * classic staple tee"); artists never see supplier names, so that clause goes. */
function withoutSupplierName(text: string): string {
  return text
    .replace(/,?\s*\b(?:Stanley\s*\/\s*Stella|Stanley|Stella)(?:['’]s)?\b[^.]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** What a blank is available in, as one short line. Letter sizes give a range
 * ('XXS–5XL'), kids' and babies' ages give theirs ('3–13 years'). */
export function sizeRangeLabel(sizes: readonly string[]): string {
  if (sizes.length === 0) return '';
  if (sizes.length === 1) return sizes[0] === 'OS' ? 'One size' : sizes[0];
  if (sizes.every((s) => /^\d+-\d+m?$/.test(s))) {
    const from = /^(\d+)-/.exec(sizes[0])?.[1] ?? '';
    const to = /-(\d+)m?$/.exec(sizes[sizes.length - 1])?.[1] ?? '';
    return `${from}–${to} ${sizes[0].endsWith('m') ? 'months' : 'years'}`;
  }
  if (sizes.length === 2) return sizes.join(', ');
  return `${sizes[0]}–${sizes[sizes.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Index

type StaticItem = Omit<CatalogueItem, 'fromPriceCents'>;

// Everything but the price comes from files that only change with a deploy,
// so it is built once per process.
let staticItems: StaticItem[] | null = null;

function buildStaticItems(): StaticItem[] {
  return PRODUCTS.map((product) => {
    const code = product.code;
    const details = PRODUCT_DETAILS[code];
    const colours = colourCodesFor(code).map(toColour);
    return {
      code,
      name: blankDisplayName(code, product.name),
      category: typeFor(code),
      fit: fitFor(code),
      audience: AUDIENCE_BY_LETTER[code.charAt(3)] ?? 'Unisex',
      weightGsm: details && details.weightGsm >= MIN_SHOWN_WEIGHT_GSM ? details.weightGsm : null,
      facts: blankFactsLine(code),
      colours,
      colourCount: colours.length,
      front: product.src,
      back: product.back ?? null,
    };
  });
}

/** All blanks, with their base prices where known, and the category counts. */
export function buildCatalogueIndex(prices: CataloguePrices = {}): CatalogueIndex {
  staticItems ??= buildStaticItems();
  const items = staticItems.map((item) => ({ ...item, fromPriceCents: prices[item.code] ?? null }));

  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const known: readonly string[] = CATALOGUE_CATEGORIES;
  const categories = [
    ...known.map((name) => ({ name, count: counts.get(name) ?? 0 })),
    // a category typeFor() learns later still shows, after the known ones
    ...[...counts].filter(([name]) => !known.includes(name)).map(([name, count]) => ({ name, count })),
  ].filter((c) => c.count > 0);

  return { categories, items };
}

/** How many blanks there are and how many in each category, without prices:
 * the catalogue page's header and tabs on their first paint. */
export function catalogueCounts(): { total: number; categories: CatalogueCategoryCount[] } {
  const { items, categories } = buildCatalogueIndex();
  return { total: items.length, categories };
}

// ---------------------------------------------------------------------------
// Detail

/** One blank in full, or null for a code the catalogue does not have. */
export function buildCatalogueDetail(code: string, prices: CataloguePrices = {}): CatalogueDetail | null {
  const key = code.trim().toUpperCase();
  const product = PRODUCTS.find((p) => p.code === key);
  if (!product) return null;

  const details = PRODUCT_DETAILS[key];
  const guide = SIZE_GUIDES[key] ?? null;
  const sizes = details?.sizes.length ? [...details.sizes] : (guide?.rows.map((r) => r.size) ?? []);

  return {
    code: key,
    name: blankDisplayName(key, product.name),
    category: typeFor(key),
    description: withoutSupplierName(details?.description ?? ''),
    composition: details?.composition ?? '',
    weightGsm: details && details.weightGsm >= MIN_SHOWN_WEIGHT_GSM ? details.weightGsm : null,
    fit: fitFor(key),
    sizes,
    sizeRange: sizeRangeLabel(sizes),
    sizeGuide: guide,
    printTechniques: printTechniquesFor(key),
    certifications: [...new Set(details?.certifications ?? [])],
    colours: colourCodesFor(key).map((colour) => ({
      ...toColour(colour),
      front: frontFor(product, colour),
      back: backFor(product, colour),
    })),
    details: product.details,
    fromPriceCents: prices[key] ?? null,
  };
}
