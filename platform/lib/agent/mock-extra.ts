// Extra scripted responses for AGENT_MOCK=1, owned by the product/design
// tool builders so the runtime's mock.ts stays untouched. mock.ts merges
// these rules ahead of its own table. `text` is the lead-in line; `tool`
// + `input` is the tool_use the mock emits (omit for text-only).
//
// Every rule here relies on product tools resolving an omitted productId /
// proofId from the conversation's project card (set by create_product and
// kept in sync by every product tool — see lib/tools/products.ts), so a
// static `input` never needs to carry a uuid the mock script can't know.
export interface MockRule {
  /** case-insensitive substring matched against the last user text */
  match: string | RegExp;
  text?: string;
  tool?: string;
  input?: Record<string, unknown>;
  /**
   * Alternative to a static `input` for rules whose match is a RegExp with
   * capture groups (e.g. a typed price or quantity). mock.ts should prefer
   * this over `input` when both `match` is a RegExp and `buildInput` is set,
   * calling it with the RegExp match array (or null if `match` was a plain
   * string). Kept optional/additive so a static-input consumer still works.
   */
  buildInput?: (match: RegExpMatchArray | null, text: string) => Record<string, unknown>;
}

/** Sizes S-2XL on the seeded blank catalogue, which spells the top size 'XXL'. */
const HOODIE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const EXTRA_MOCK_RULES: MockRule[] = [
  {
    match: /use\b.*\bdesign(?:\s+([0-9a-f-]{36}))?/i,
    text: 'Creating a hoodie with your design on it...',
    tool: 'create_product',
    input: {
      blankCode: 'STSU177',
      printServiceCode: 'screen_1c',
      placement: { position: 'front_chest', widthCm: 28 },
      colours: ['C002'],
      sizes: HOODIE_SIZES,
    },
    // Carry the design id through so create_product renders real mockups.
    buildInput: (match) => ({
      blankCode: 'STSU177',
      printServiceCode: 'screen_1c',
      placement: { position: 'front_chest', widthCm: 28 },
      colours: ['C002'],
      sizes: HOODIE_SIZES,
      ...(match?.[1] ? { designId: match[1] } : {}),
    }),
  },
  {
    match: /price it (?:at )?€?\s?(\d+)/i,
    text: 'Setting the price...',
    tool: 'set_price',
    input: { retailCents: 3500 },
    buildInput: (match) => ({ retailCents: Number(match?.[1] ?? 35) * 100 }),
  },
  {
    match: /run of (\d+)/i,
    text: 'Pulling a quote...',
    tool: 'get_quote',
    input: { qty: 50 },
    buildInput: (match) => ({ qty: Number(match?.[1] ?? 50) }),
  },
  {
    match: 'quote',
    text: 'Pulling a quote...',
    tool: 'get_quote',
    input: { qty: 1 },
  },
  {
    match: 'send the proof',
    text: 'Submitting the proof...',
    tool: 'submit_proof',
    input: {},
  },
  {
    match: 'approve the proof',
    text: 'Approving the proof...',
    tool: 'approve_proof',
    input: {},
  },
  {
    match: 'publish the product',
    text: 'Publishing...',
    tool: 'publish_product',
    input: {},
  },
  {
    match: 'my products',
    text: 'Here are your products...',
    tool: 'list_products',
    input: {},
  },
];
