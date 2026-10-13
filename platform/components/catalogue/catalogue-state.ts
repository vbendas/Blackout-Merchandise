import type { CatalogueAudience, CatalogueItem } from '@/lib/catalog/catalogue-index';
import { CATALOGUE_CATEGORIES } from '@/lib/catalog/categories';

// Filtering, sorting and searching for the catalogue panel. Pure functions on
// the feed's items; nothing here touches React or the network.

export const PAGE_SIZE = 12;

/** The rail's first entry: every category. */
export const ALL = 'All';

/** The 8 categories in the rail's order. The feed carries the same list with
 * counts; this one lets the rail show its names while the feed loads and
 * resolves a category the assistant named. */
export const CATEGORY_NAMES = CATALOGUE_CATEGORIES;

export type WeightBucket = 'light' | 'mid' | 'heavy';
export type SortKey = 'colours' | 'heaviest' | 'lightest' | 'name' | 'price';

export const WEIGHT_BUCKETS: readonly { key: WeightBucket; label: string; range: string; test: (gsm: number) => boolean }[] = [
  { key: 'light', label: 'Light', range: 'under 180 g', test: (gsm) => gsm < 180 },
  { key: 'mid', label: 'Mid', range: '180–300 g', test: (gsm) => gsm >= 180 && gsm <= 300 },
  { key: 'heavy', label: 'Heavy', range: 'over 300 g', test: (gsm) => gsm > 300 },
];

export const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: 'colours', label: 'Most colours' },
  { key: 'heaviest', label: 'Heaviest' },
  { key: 'lightest', label: 'Lightest' },
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Lowest price' },
];

/** Tightest to loosest. */
const FIT_ORDER = ['Fitted', 'Medium', 'Relaxed', 'Oversized'];
const AUDIENCE_ORDER: readonly CatalogueAudience[] = ['Unisex', 'Men', 'Women', 'Kids', 'Baby'];

/** The six colours the filter offers, matched by colour code. Hex values are
 * the sampled garment colours of lib/catalog/variants.ts. */
export const FILTER_COLOURS: readonly { code: string; name: string; hex: string }[] = [
  { code: 'C002', name: 'Black', hex: '#1b1b1b' },
  { code: 'C001', name: 'White', hex: '#e3e8ee' },
  { code: 'C727', name: 'French Navy', hex: '#2a3143' },
  { code: 'C250', name: 'Heather Grey', hex: '#b1b1b1' },
  { code: 'C054', name: 'Natural Raw', hex: '#f2e7db' },
  { code: 'C244', name: 'Burgundy', hex: '#5b2932' },
];

export interface CatalogueFilters {
  /** ALL or one of the feed's categories */
  category: string;
  fit: string | null;
  audience: CatalogueAudience | null;
  weight: WeightBucket | null;
  /** a colour code from FILTER_COLOURS */
  colour: string | null;
  q: string;
  sort: SortKey;
}

export const INITIAL_FILTERS: CatalogueFilters = {
  category: ALL,
  fit: null,
  audience: null,
  weight: null,
  colour: null,
  q: '',
  sort: 'colours',
};

// ---------------------------------------------------------------------------
// Category names

/** 'T-Shirts', 'sweats and hoodies', 'hoodies', 'bags' ...: the catalogue
 * category a name from the assistant or a link refers to, or ALL when it
 * does not recognise it. Case, '&' versus 'and', hyphens and plurals do not matter. */
export function categoryFromName(name: string | undefined): string {
  const key = squash(name ?? '');
  if (!key) return ALL;
  for (const category of CATEGORY_NAMES) if (squash(category) === key) return category;
  return CATEGORY_ALIASES[key] ?? CATEGORY_ALIASES[key.replace(/s$/, '')] ?? ALL;
}

function squash(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

const CATEGORY_ALIASES: Record<string, string> = {
  all: ALL,
  allblanks: ALL,
  tshirt: 'T-shirts',
  tee: 'T-shirts',
  hoodie: 'Sweats & Hoodies',
  sweatshirt: 'Sweats & Hoodies',
  sweat: 'Sweats & Hoodies',
  sweatsandhoodie: 'Sweats & Hoodies',
  jacket: 'Jackets',
  gilet: 'Jackets',
  bag: 'Bags & Accessories',
  accessory: 'Bags & Accessories',
  accessorie: 'Bags & Accessories',
  bagsandaccessorie: 'Bags & Accessories',
  kid: 'Kids & Baby',
  baby: 'Kids & Baby',
  kidsandbaby: 'Kids & Baby',
  bottom: 'Bottoms',
  jogger: 'Bottoms',
  short: 'Bottoms',
  shirt: 'Shirts',
  polo: 'Polos',
};

// ---------------------------------------------------------------------------
// Facets

export function weightBucketOf(gsm: number | null): WeightBucket | null {
  if (gsm === null) return null;
  return WEIGHT_BUCKETS.find((bucket) => bucket.test(gsm))?.key ?? null;
}

/** What the filter row can offer for a set of blanks: only values that exist in it. */
export interface Facets {
  fits: string[];
  audiences: CatalogueAudience[];
  weights: WeightBucket[];
  /** FILTER_COLOURS codes some blank in the set comes in */
  colours: ReadonlySet<string>;
}

export function facetsOf(items: readonly CatalogueItem[]): Facets {
  const fits = new Set<string>();
  const audiences = new Set<CatalogueAudience>();
  const weights = new Set<WeightBucket>();
  const colours = new Set<string>();
  const offered = new Set(FILTER_COLOURS.map((c) => c.code));
  for (const item of items) {
    if (item.fit) fits.add(item.fit);
    audiences.add(item.audience);
    const bucket = weightBucketOf(item.weightGsm);
    if (bucket) weights.add(bucket);
    for (const colour of item.colours) if (offered.has(colour.code)) colours.add(colour.code);
  }
  return {
    fits: [...FIT_ORDER.filter((fit) => fits.has(fit)), ...[...fits].filter((fit) => !FIT_ORDER.includes(fit))],
    audiences: AUDIENCE_ORDER.filter((audience) => audiences.has(audience)),
    weights: WEIGHT_BUCKETS.map((bucket) => bucket.key).filter((key) => weights.has(key)),
    colours,
  };
}

/** A group with one value filters nothing, so the row only shows groups of two or more. */
export const MIN_GROUP = 2;

/** Drops chosen filters the category does not offer, so none stays applied out of sight. */
export function reconcileFilters(filters: CatalogueFilters, facets: Facets): CatalogueFilters {
  const keep = <T>(value: T | null, offered: readonly T[]): T | null =>
    value !== null && offered.length >= MIN_GROUP && offered.includes(value) ? value : null;
  return {
    ...filters,
    fit: keep(filters.fit, facets.fits),
    audience: keep(filters.audience, facets.audiences),
    weight: keep(filters.weight, facets.weights),
    colour: filters.colour && facets.colours.has(filters.colour) ? filters.colour : null,
  };
}

// ---------------------------------------------------------------------------
// Search

const haystacks = new WeakMap<CatalogueItem, string>();

/** Lower case, no apostrophes, hyphens and slashes as spaces ("Women's t-shirt" -> "womens t shirt"). */
function plain(text: string): string {
  return text.toLowerCase().replace(/['’]/g, '').replace(/[-–/]/g, ' ');
}

/** Everything an artist might type for a blank: its name, facts, category,
 * who it is for, its fit and the names of its colours. Space-separated, with
 * a space in front, so a word's start can be found by looking for ' ' + typed. */
function haystackOf(item: CatalogueItem): string {
  let text = haystacks.get(item);
  if (text === undefined) {
    text = ` ${plain([item.name, item.facts ?? '', item.category, item.audience, item.fit ?? '', ...item.colours.map((c) => c.name)].join(' '))}`;
    haystacks.set(item, text);
  }
  return text;
}

/** Every word typed has to start a word of the blank ('hood' finds 'hoodie',
 * 'tee' does not find 'Steel Blue'); 'hoodies' also finds 'hoodie'. */
export function matchesQuery(item: CatalogueItem, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = haystackOf(item);
  return words.every((word) => haystack.includes(` ${word}`) || (word.length > 3 && word.endsWith('s') && haystack.includes(` ${word.slice(0, -1)}`)));
}

// ---------------------------------------------------------------------------
// Filtering and sorting

export function inCategory(items: readonly CatalogueItem[], category: string): CatalogueItem[] {
  return category === ALL ? [...items] : items.filter((item) => item.category === category);
}

const byName = (a: CatalogueItem, b: CatalogueItem) => a.name.localeCompare(b.name, 'en');

// A missing weight or price sorts last; Infinity - Infinity is NaN, which falls through to the name.
const COMPARE: Record<SortKey, (a: CatalogueItem, b: CatalogueItem) => number> = {
  colours: (a, b) => b.colourCount - a.colourCount || byName(a, b),
  heaviest: (a, b) => (b.weightGsm ?? -1) - (a.weightGsm ?? -1) || byName(a, b),
  lightest: (a, b) => (a.weightGsm ?? Infinity) - (b.weightGsm ?? Infinity) || byName(a, b),
  name: byName,
  price: (a, b) => (a.fromPriceCents ?? Infinity) - (b.fromPriceCents ?? Infinity) || byName(a, b),
};

/** The blanks that pass every chosen filter and the search, in the chosen order. */
export function applyFilters(categoryItems: readonly CatalogueItem[], filters: CatalogueFilters): CatalogueItem[] {
  const { fit, audience, weight, colour, q, sort } = filters;
  return categoryItems
    .filter(
      (item) =>
        (!fit || item.fit === fit) &&
        (!audience || item.audience === audience) &&
        (!weight || weightBucketOf(item.weightGsm) === weight) &&
        (!colour || item.colours.some((c) => c.code === colour)) &&
        matchesQuery(item, q),
    )
    .sort(COMPARE[sort]);
}

/** Facet filters in use (the search is separate). */
export function activeFacetCount(filters: CatalogueFilters): number {
  return [filters.fit, filters.audience, filters.weight, filters.colour].filter(Boolean).length;
}

export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return activeFacetCount(filters) > 0 || filters.q.trim() !== '';
}

// ---------------------------------------------------------------------------
// Words

/** 'relaxed fit', 'oversized': a fit bucket as a few plain words. */
export function fitPhrase(fit: string): string {
  const lower = fit.toLowerCase();
  return lower === 'fitted' || lower === 'oversized' ? lower : `${lower} fit`;
}

/** Print methods in running text: 'Screen print, DTG, embroidery'. */
export function printPhrase(techniques: readonly string[]): string {
  return techniques.map((t, i) => (i === 0 || /^[A-Z]{2,}$/.test(t) ? t : t.toLowerCase())).join(', ');
}

/** The measurement table labels kids' sizes as '3-4/98-104cm'; show them as '3-4 · 98-104cm'. */
export function sizeLabel(size: string): string {
  return size.replace(/\/(?=\d[^/]*cm$)/, ' · ');
}

/** What "Use this blank" sends to the chat. */
export function makeProductMessage(name: string, colour: string): string {
  return `Make a product on the ${name} in ${colour}`;
}

/** What "Quote a run" sends. */
export function quoteRunMessage(name: string, colour: string): string {
  return `Quote a run of 50 pieces on the ${name} in ${colour}`;
}
