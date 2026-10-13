export { CATALOGUE_CATEGORIES, type CatalogueCategory } from './categories';
import { blankDisplayName } from './display-names';
import { colourName } from './colour-names';
import { PRODUCT_DETAILS } from './product-details';
import { PRODUCTS } from './products';
import { BASE_COLOUR, COLOUR_ORDER } from './variants';

const PRODUCT_BY_CODE = new Map(PRODUCTS.map((p) => [p.code, p]));
// The base colour is not a variant, so COLOUR_ORDER omits it; a query
// like 'black' still has to find it. Exact name wins over substrings
// ('black' → Black, not Black Heather).
const SEARCHABLE_COLOURS = [BASE_COLOUR, ...COLOUR_ORDER];

// Matches a search query against a product's style code, catalog name
// (products.ts) and supplier name (PRODUCT_DETAILS), case-insensitive.
// An empty query always matches.
export function matchesSearch(code: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (code.toLowerCase().includes(q)) return true;
  const product = PRODUCT_BY_CODE.get(code);
  if (product?.name.toLowerCase().includes(q)) return true;
  const detailsName = PRODUCT_DETAILS[code]?.name;
  if (detailsName?.toLowerCase().includes(q)) return true;
  // The name artists see in the Studio ('Heavy hoodie').
  if (blankDisplayName(code, '').toLowerCase().includes(q)) return true;
  return false;
}

// The first COLOUR_ORDER code whose printed name contains the trimmed
// query, case-insensitive. A minimum length avoids one- or two-letter
// queries matching almost every colour name.
export function colourMatchingQuery(q: string): string | null {
  const query = q.trim().toLowerCase();
  if (query.length < 3) return null;
  const exact = SEARCHABLE_COLOURS.find((code) => colourName(code).toLowerCase() === query);
  if (exact) return exact;
  return SEARCHABLE_COLOURS.find((code) => colourName(code).toLowerCase().includes(query)) ?? null;
}

// Category from the extracted product data (name + description), with
// the style-code letters only as a last-resort fallback. Letter-only
// guessing misfiled products (the STB* family is Bottoms, not Bags).
export function typeFor(code: string): string {
  const audience = code.charAt(3);
  const d = PRODUCT_DETAILS[code];
  const text = `${d?.name ?? ''} ${d?.description ?? ''}`.toLowerCase();

  if (audience === 'K' || audience === 'B' || /\b(kids?|baby|mini)\b/.test(text)) return 'Kids & Baby';
  // Bags before Bottoms: bag descriptions mention "short handles", which
  // a loose bottoms regex would swallow.
  if (/(tote|\bbag\b|beanie|\bhat\b|\bcap\b|apron|pencil case|umbrella)/.test(text)) return 'Bags & Accessories';
  if (/(jogger|sweatpant|\bshorts\b|\bpants\b|trouser)/.test(text)) return 'Bottoms';
  if (/polo/.test(text)) return 'Polos';
  if (/(jacket|vest|body warmer|puffer|bomber|windbreaker|sherpa|parka|anorak)/.test(text)) return 'Jackets';
  if (/(hoodie|sweatshirt|crewneck|crew neck|half-zip|zip-through)/.test(text)) return 'Sweats & Hoodies';
  if (/(oxford|poplin|woven|button|flannel)/.test(text) && /shirt/.test(text)) return 'Shirts';
  if (/(t-shirt|\btee\b|tank|long sleeve|long-sleeve|singlet)/.test(text)) return 'T-shirts';

  switch (code.charAt(2)) {
    case 'T':
      return 'T-shirts';
    case 'S':
      return 'Sweats & Hoodies';
    case 'J':
      return 'Jackets';
    case 'P':
      return 'Polos';
    case 'W':
      return 'Shirts';
    case 'B':
      return 'Bottoms';
    default:
      return 'Bags & Accessories';
  }
}

// Normalized fit buckets from the extracted spec data. Order matters:
// 'Relaxed Medium Fit' lands in Relaxed.
export function fitFor(code: string): string | null {
  const fit = PRODUCT_DETAILS[code]?.fit ?? '';
  if (!fit) return null;
  if (/oversized/i.test(fit)) return 'Oversized';
  if (/relaxed/i.test(fit)) return 'Relaxed';
  if (/fitted/i.test(fit)) return 'Fitted';
  if (/medium/i.test(fit)) return 'Medium';
  return null;
}
