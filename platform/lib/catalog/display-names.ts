// Names people read for each blank, keyed by supplier style code (e.g.
// 'STSU177'), in place of the supplier's commercial style name. Client-safe
// and tiny on purpose: cards, the fan shop and tools all import it. A code
// with no entry falls back to the name the caller already has.
//
// Naming: qualifier first, garment last, at most three words, sentence case.
// The qualifier says what sets the blank apart in its family (weight, cut,
// feature or audience). No supplier model names, codes or fibre claims.

export const BLANK_DISPLAY_NAMES: Record<string, string> = {
  // Bags, pouch, beanies and hat
  STAU116: 'Light tote bag',
  STAU117: 'Large shopping bag',
  STAU760: 'Classic tote bag',
  STAU762: 'Classic shopping bag',
  STAU763: 'Drawstring bag',
  STAU764: 'Zip pouch',
  STAU771: 'Single-layer beanie',
  STAU772: 'Double-layer beanie',
  STAU891: 'Belt bag',
  STAU892: 'Duffle bag',
  STAU893: 'Bucket hat',

  // Bottoms: joggers and shorts
  STBK102: 'Kids jogger shorts',
  STBU070: 'Jersey shorts',
  STBU157: 'Relaxed joggers',
  STBU185: 'Classic joggers',
  STBU186: 'Classic jogger shorts',
  STBU944: 'Relaxed jogger shorts',

  // Jackets and gilets, men's
  STJM158: "Men's hooded softshell",
  STJM167: "Men's softshell jacket",
  STJM188: "Men's nylon puffer",
  STJM189: "Men's nylon gilet",
  STJM235: "Men's softshell gilet",
  STJM238: "Men's fleece jacket",
  STJM240: "Men's fleece gilet",
  STJM836: "Men's high-collar gilet",
  STJM837: "Men's padded jacket",

  // Jackets and gilets, unisex
  STJU242: 'Hybrid fleece jacket',
  STJU248: 'Sherpa jacket',
  STJU249: 'Sherpa gilet',
  STJU250: 'Quilted gilet',
  STJU251: 'Bomber jacket',
  STJU833: 'Coach jacket',
  STJU834: 'Half-zip anorak',
  STJU840: 'Oversized puffer',
  STJU841: 'Padded parka',
  STJU845: 'Twill overshirt',
  STJU846: 'Weather jacket',

  // Jackets and gilets, women's
  STJW190: "Women's nylon gilet",
  STJW191: "Women's nylon puffer",
  STJW236: "Women's softshell gilet",
  STJW239: "Women's fleece jacket",
  STJW241: "Women's fleece gilet",
  STJW838: "Women's high-collar gilet",
  STJW839: "Women's padded jacket",

  // Polos
  STPM224: "Men's polo",
  STPU222: 'Heavy polo',
  STPU223: 'Long-sleeve polo',
  STPW977: "Women's polo",

  // Kids sweatshirts, hoodies and joggers
  STSK180: 'Kids hoodie',
  STSK181: 'Kids sweatshirt',
  STSK182: 'Kids zip hoodie',
  STSK183: 'Kids joggers',

  // Hoodies and sweatshirts, unisex and men's
  STSU011: 'Terry hoodie',
  STSU077: 'Clean hoodie',
  STSU168: 'Classic hoodie',
  STSU177: 'Heavy hoodie',
  STSU178: 'Heavy sweatshirt',
  STSU179: 'Heavy zip hoodie',
  STSU201: 'Raglan sweatshirt',
  STSU202: 'Raglan hoodie',
  STSU204: 'Quarter-zip sweatshirt',
  STSU205: 'Zip hoodie',
  STSU207: 'Terry zip hoodie',
  STSU208: 'Washed sweatshirt',
  STSU209: 'Oversized hoodie',
  STSU229: 'Side-pocket hoodie',
  STSU253: 'Full-zip sweatshirt',
  STSU255: 'Boxy sweatshirt',
  STSU256: 'Boxy hoodie',
  STSU257: "Men's hoodie",
  STSU261: 'Modal zip hoodie',
  STSU269: "Men's sweatshirt",
  STSU795: 'Oversized quarter-zip',
  STSU797: 'Boxy terry hoodie',
  STSU798: 'Boxy terry sweatshirt',
  STSU799: 'Terry sweatshirt',
  STSU824: 'Flat-seam hoodie',
  STSU856: 'Wide-rib hoodie',
  STSU857: 'Wide-rib sweatshirt',
  STSU868: 'Classic sweatshirt',

  // Hoodies and sweatshirts, women's
  STSW212: "Women's cropped sweatshirt",
  STSW213: "Women's cropped hoodie",
  STSW214: "Women's zip hoodie",
  STSW217: "Women's raglan sweatshirt",
  STSW218: "Women's oversized sweatshirt",
  STSW254: "Women's sweatshirt",
  STSW262: "Women's modal sweatshirt",
  STSW268: "Women's hoodie",

  // T-shirts, baby and kids
  STTB918: 'Baby tee',
  STTK184: 'Kids tee',

  // T-shirts and tanks, men's
  STTM562: "Men's v-neck tee",
  STTM961: "Men's tank",

  // T-shirts, unisex
  STTU078: 'Heavy boxy tee',
  STTU169: 'Classic tee',
  STTU170: 'Light tee',
  STTU171: 'Washed tee',
  STTU199: 'Long-sleeve tee',
  STTU200: 'Heavy long-sleeve tee',
  STTU258: 'Boxy tee',
  STTU263: 'Modal tee',
  STTU758: 'Tubular tee',
  STTU788: 'Heavy tee',
  STTU815: 'High-neck tee',
  STTU959: 'Mock-neck tee',
  STTU964: 'Relaxed tee',

  // T-shirts and tanks, women's
  STTW079: "Women's fitted tee",
  STTW089: "Women's dolman tee",
  STTW172: "Women's classic tee",
  STTW173: "Women's scoop-neck tee",
  STTW174: 'Fitted cropped tee',
  STTW175: "Women's boxy tee",
  STTW176: "Women's v-neck tee",
  STTW219: "Women's long-sleeve tee",
  STTW259: 'Relaxed cropped tee',
  STTW264: 'High-low tee',
  STTW962: "Women's light tank",
  STTW963: "Women's fitted tank",

  // Baby bodysuit
  STUB103: 'Baby bodysuit',

  // Shirts
  STWM968: "Men's oxford shirt",
  STWM969: "Men's poplin shirt",
  STWW971: "Women's oxford shirt",
  STWW973: "Women's poplin shirt",
};

/** Display name for a blank, or `fallback` when the code has none. */
export function blankDisplayName(code: string, fallback: string): string {
  const key = code.trim().toUpperCase();
  const name = Object.hasOwn(BLANK_DISPLAY_NAMES, key) ? BLANK_DISPLAY_NAMES[key] : '';
  return name || fallback;
}
