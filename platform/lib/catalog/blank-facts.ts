import { PRODUCT_DETAILS } from '@/lib/catalog/product-details';

// One line of fabric facts for a blank, from the supplier sheets:
// '100% organic cotton · 350 g · relaxed fit'. Server and tool use only: it
// pulls in the whole PRODUCT_DETAILS table, which client bundles should not
// carry.

/** The organic-cotton claim the composition supports, if any. Supplier sheets
 * write it two ways ('100% organic ring-spun cotton' and '100% Cotton -
 * Organic Ring Spun Combed'); both are 100% organic cotton. */
function compositionFact(composition: string): string | null {
  const parts = composition.toLowerCase().split(',');
  const organicCotton = (part: string) => part.includes('organic') && part.includes('cotton');
  if (/^\s*100\s*%/.test(parts[0]) && organicCotton(parts[0])) return '100% organic cotton';
  if (parts.some(organicCotton)) return 'organic cotton blend';
  return null;
}

/** Lightest knit in the catalogue is above this; shell fabrics sit below it. */
const MIN_SHOWN_WEIGHT_GSM = 120;

/** e.g. '100% organic cotton · 350 g · relaxed fit'; null when the sheet has none of these. */
export function blankFactsLine(code: string): string | null {
  const key = code.trim().toUpperCase();
  if (!Object.hasOwn(PRODUCT_DETAILS, key)) return null;
  const details = PRODUCT_DETAILS[key];

  const facts: string[] = [];
  const composition = compositionFact(details.composition ?? '');
  if (composition) facts.push(composition);
  // Puffers, gilets and shells list their shell fabric (38 or 75 g/m²), which
  // reads as a garment weight and misleads; only knit weights are shown.
  if (details.weightGsm >= MIN_SHOWN_WEIGHT_GSM) facts.push(`${details.weightGsm} g`);
  const fit = details.fit?.trim().toLowerCase();
  if (fit) facts.push(fit);

  return facts.length > 0 ? facts.join(' · ') : null;
}
