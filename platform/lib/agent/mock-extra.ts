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

/** Splits a bulk quantity evenly across S-XXL, remainder to the smaller sizes first. */
function splitSizesEvenly(qty: number, sizes: string[] = HOODIE_SIZES): Record<string, number> {
  const base = Math.floor(qty / sizes.length);
  let remainder = qty % sizes.length;
  const sizeMap: Record<string, number> = {};
  for (const size of sizes) {
    sizeMap[size] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return sizeMap;
}

/** create_bulk_quote's tool layer fills in the blank/print/placement (from
 * the project card's current product, or STSU177) when a line omits both
 * productId and blankCode — see lib/tools/bulk.ts's resolveDefaultLineSpec —
 * so the mock only ever needs to supply colour + sizes here. */
function bulkQuoteInput(qty: number): Record<string, unknown> {
  return {
    lines: [{ colourCode: 'C002', sizes: splitSizesEvenly(qty) }],
    shipTo: { name: 'Studio Barcelona', line1: 'Carrer de Mallorca 401', city: 'Barcelona', postcode: '08013', country: 'ES' },
  };
}

/** A run named by its number ("Run 3") in a prompt; the bulk tools resolve it within the shop. */
function runInput(match: RegExpMatchArray | null): Record<string, unknown> {
  const runNumber = Number(match?.[1]);
  return Number.isInteger(runNumber) && runNumber > 0 ? { runNumber } : {};
}

export const EXTRA_MOCK_RULES: MockRule[] = [
  // -- runs by number (Needs-you rows, run cards, billing) ------------------
  // These must stay ahead of the generic 'send the proof' / 'quote' rules.
  {
    match: /send the proof for run (\d+)/i,
    text: 'Sending the proof...',
    tool: 'submit_bulk_proof',
    buildInput: runInput,
  },
  {
    match: /approve the proof for run (\d+)/i,
    text: 'Approving the proof...',
    tool: 'approve_bulk_proof',
    buildInput: runInput,
  },
  {
    match: /show me the proof for run (\d+)/i,
    text: 'Opening the proof...',
    tool: 'get_bulk_order',
    buildInput: runInput,
  },
  {
    match: /pay for run (\d+)/i,
    text: 'Preparing payment...',
    tool: 'pay_bulk_order',
    buildInput: runInput,
  },
  {
    match: /cancel run (\d+)/i,
    text: 'Checking the run...',
    tool: 'cancel_bulk_order',
    buildInput: runInput,
  },
  {
    match: /(?:open|show me|how is|track|watch) run (\d+)/i,
    text: 'Opening the run...',
    tool: 'get_bulk_order',
    buildInput: runInput,
  },
  {
    match: 'show my runs',
    text: 'Here are your runs.',
    tool: 'list_bulk_orders',
    input: {},
  },
  // -- wave 3: bulk orders -----------------------------------------------
  // Both must stay ahead of the plain '/run of (\d+)/i' -> get_quote rule
  // below, which would otherwise win first on 'run of 40 hoodies'.
  {
    match: /run of (\d+).*(?:hoodie|tee|t-shirt)/i,
    text: 'Pulling a bulk quote...',
    tool: 'create_bulk_quote',
    buildInput: (match) => bulkQuoteInput(Number(match?.[1] ?? 40)),
  },
  {
    match: /bulk order of (\d+)/i,
    text: 'Pulling a bulk quote...',
    tool: 'create_bulk_quote',
    buildInput: (match) => bulkQuoteInput(Number(match?.[1] ?? 40)),
  },
  {
    match: 'send the bulk proof',
    text: 'Submitting the bulk proof...',
    tool: 'submit_bulk_proof',
    input: {},
  },
  {
    match: 'approve the bulk proof',
    text: 'Approving the bulk proof...',
    tool: 'approve_bulk_proof',
    input: {},
  },
  {
    match: 'pay the bulk order',
    text: 'Starting bulk checkout...',
    tool: 'pay_bulk_order',
    input: {},
  },
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
  {
    match: /use (?:the )?domain ([\w.-]+)/i,
    text: 'Connecting your domain...',
    tool: 'add_custom_domain',
    input: { hostname: 'example.com' },
    buildInput: (match) => ({ hostname: match?.[1] ?? 'example.com' }),
  },
  {
    match: 'check my domain',
    text: 'Checking your domain...',
    tool: 'check_domain',
    input: {},
  },
  {
    match: /connect stripe|set up payouts/i,
    text: 'Setting up your payouts...',
    tool: 'start_stripe_onboarding',
    input: {},
  },
  {
    match: 'payout status',
    text: 'Checking payout status...',
    tool: 'get_payout_status',
    input: {},
  },
  {
    match: 'my orders',
    text: 'Here are your orders...',
    tool: 'list_orders',
    input: {},
  },
  {
    match: 'sales this month',
    text: 'Pulling your sales...',
    tool: 'get_sales_summary',
    input: { period: 'month' },
  },
  // -- wave 3: admin ----------------------------------------------------------
  {
    match: /what'?s waiting|whats waiting/i,
    text: 'Pulling the queue...',
    tool: 'admin_queue',
    input: {},
  },
  {
    match: 'production queue',
    text: 'Pulling the production queue...',
    tool: 'list_production',
    input: {},
  },
  {
    match: 'payout anomalies',
    text: 'Checking payout anomalies...',
    tool: 'list_payout_anomalies',
    input: {},
  },
  {
    match: 'draft supplier order',
    text: 'Drafting a supplier order from queued orders...',
    tool: 'draft_supplier_order',
    input: {},
  },
  {
    match: /advance order ([\w-]+)/i,
    text: 'Advancing production...',
    tool: 'advance_production',
    buildInput: (match) => ({ orderId: match?.[1] ?? '' }),
  },
  // -- wave 3: waitlist + support -----------------------------------------
  // The specific "approve waitlist <id>" regex must stay ahead of the plain
  // 'waitlist' substring match below — otherwise it would win first (its
  // own text also contains the word "waitlist").
  {
    match: /approve waitlist ([\w-]+)/i,
    text: 'Approving...',
    tool: 'approve_waitlist',
    input: { id: '' },
    buildInput: (match) => ({ id: match?.[1] ?? '' }),
  },
  {
    match: 'waitlist',
    text: 'Checking the waitlist...',
    tool: 'list_waitlist',
    input: {},
  },
  {
    match: /contact support:? (.+)/i,
    text: 'Opening a support ticket...',
    tool: 'contact_support',
    input: { subject: '', message: '' },
    buildInput: (match) => {
      const message = match?.[1] ?? '';
      return { subject: message.slice(0, 60), message };
    },
  },
  {
    match: /reply to ticket ([\w-]+):? (.+)/i,
    text: 'Sending your reply...',
    tool: 'reply_ticket',
    input: { id: '', text: '' },
    buildInput: (match) => ({ id: match?.[1] ?? '', text: match?.[2] ?? '' }),
  },
  // -- wave 4: reach (discord) ---------------------------------------------
  {
    match: 'connect discord',
    text: 'Checking your Discord connection...',
    tool: 'connect_discord',
    input: {},
  },
  {
    match: /turn off discord|stop discord dms/i,
    text: 'Turning off Discord DMs...',
    tool: 'update_notification_prefs',
    input: { discordDm: false },
  },
  {
    match: 'notification settings',
    text: 'Here are your notification settings...',
    tool: 'update_notification_prefs',
    input: {},
  },
];
