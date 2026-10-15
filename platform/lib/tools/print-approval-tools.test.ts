// The artwork rule as the assistant and the Studio see it (Print-Prep-Plan section 7): publish_product and
// update_product refuse in one plain sentence with the way on (a link to the approval page, or a message that
// prepares the print files), a confirm card is never shown for a publish that would be refused, get_product and
// the cards say where a product's artwork stands, the retired per-product proof tools send the assistant to the
// artwork instead, and nothing ever carries a Pantone code. The services are tested in
// lib/services/print-approval-gate.test.ts; this is the layer over them.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { bootstrapPrint, GARMENTS, type Harness } from '@/lib/print/test-support';
import type { AgentEvent } from '@/lib/agent/protocol';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import type { Tool, ToolContext, ToolResult } from '@/lib/tools/types';

// Never a real model: the mock answers if anything reaches it (the loop is imported for the confirm step).
process.env.AGENT_MOCK = '1';
delete process.env.ANTHROPIC_API_KEY;

let h: Harness;
let tools: typeof import('@/lib/tools/products');
let print: typeof import('@/lib/tools/print');
let loop: typeof import('@/lib/agent/loop');
let conversations: typeof import('@/lib/services/conversations');
let audit: typeof import('@/lib/services/tools-audit');
let registry: typeof import('@/lib/tools/registry');
let proofs: typeof import('@/lib/services/proofs');
let guidance: typeof import('@/lib/agent/print-guidance');
let prompt: typeof import('@/lib/agent/system-prompt');

const BLACK = GARMENTS.black.code;
const NAVY = GARMENTS.navy.code;
const WHITE = GARMENTS.white.code;
const ALL = [BLACK, NAVY, WHITE];

before(async () => {
  h = await bootstrapPrint();
  tools = await import('@/lib/tools/products');
  print = await import('@/lib/tools/print');
  loop = await import('@/lib/agent/loop');
  conversations = await import('@/lib/services/conversations');
  audit = await import('@/lib/services/tools-audit');
  registry = await import('@/lib/tools/registry');
  proofs = await import('@/lib/services/proofs');
  guidance = await import('@/lib/agent/print-guidance');
  prompt = await import('@/lib/agent/system-prompt');
  await h.db.insert(schema.stripeAccounts).values({ storeId: h.artist.storeId, accountId: 'acct_test', chargesEnabled: true, payoutsEnabled: true });
  // What create_product prices from: the T-shirt prints DTG, in size M.
  await h.db.insert(schema.blankPrintServices).values({ blankCode: 'STTU169', printServiceCode: 'dtg' });
  await h.db.insert(schema.blankSizes).values({ blankCode: 'STTU169', size: 'M' });
  await h.db.insert(schema.baseCosts).values({ blankCode: 'STTU169', printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 650, printCostCents: 600, marginCents: 375 });
});

after(async () => {
  await h.close();
});

// -- helpers --------------------------------------------------------------------

const ctx = (over: Partial<ToolContext> = {}): ToolContext => ({
  userId: h.artist.userId,
  clerkId: 'clerk-artist',
  role: 'artist',
  storeId: h.artist.storeId,
  conversationId: randomUUID(),
  idempotencyKey: 'k',
  locale: 'en',
  ...over,
});

/** Runs a tool the way the loop does: the model's input goes through the tool's own schema first. */
const run = <I, O>(tool: Tool<I, O>, context: ToolContext, input: I): Promise<ToolResult<O>> => tool.run(context, tool.input.parse(input) as I);

interface Shape {
  ok?: boolean;
  error?: string;
  designId?: string | null;
  artwork?: { approved: boolean; reason?: string; note?: string; approvalPage?: string; prepare?: { designId: string; blankCode: string; colourCodes: string[]; position: string; widthCm: number } };
}
const dataOf = (result: ToolResult<unknown>) => result.data as Shape;
const noticeOf = (ui?: ToolUi) => (ui?.cards ?? []).find((c): c is Extract<Card, { kind: 'notice' }> => c.kind === 'notice');
const productCardOf = (ui?: ToolUi) => (ui?.cards ?? []).find((c): c is Extract<Card, { kind: 'product' }> => c.kind === 'product');
const labels = (chips?: Chip[]) => (chips ?? []).map((c) => c.label);

async function product(
  designId: string | null,
  opts: { colours?: string[]; name?: string; status?: 'draft' | 'proof_pending' | 'live'; service?: string; proof?: 'approved' | 'pending'; retailPriceCents?: number | null } = {},
): Promise<string> {
  const [row] = await h.db
    .insert(schema.products)
    .values({
      storeId: h.artist.storeId,
      designId,
      blankCode: 'STTU169',
      printServiceCode: opts.service ?? 'dtg',
      name: opts.name ?? 'Underwriter tee',
      placement: { position: 'front_chest', widthCm: 28 },
      baseCostCents: 1500,
      retailPriceCents: opts.retailPriceCents === undefined ? 3500 : opts.retailPriceCents,
      status: opts.status ?? 'draft',
    })
    .returning({ id: schema.products.id });
  await h.db.insert(schema.productColours).values((opts.colours ?? ALL).map((colourCode) => ({ productId: row.id, colourCode, mockupUrl: 'https://img.test/mockup.webp' })));
  // A shop product has no proof of its own; one is made only to show an old one is left alone.
  if (opts.proof) await h.db.insert(schema.proofs).values({ productId: row.id, version: 1, status: opts.proof });
  return row.id;
}

async function prepare(designId: string, colours: string[] = ALL) {
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), garmentCodes: colours });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);
}

async function approve(designId: string) {
  const version = await h.printPrep.latestVersion(designId);
  assert.ok(version);
  const result = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: version.id });
  assert.ok(result.ok, result.ok ? '' : result.error);
}

const revoke = (designId: string) => h.printPrep.revokeApproval({ user: { id: h.artist.userId }, store: { id: h.artist.storeId } }, designId);

// -- publish_product: the refusal ---------------------------------------------------------

test('publish_product refuses an unapproved design in one sentence, with a link to the approval page', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  const context = ctx();

  const result = await run(tools.publishProductTool, context, { productId: id });
  const data = dataOf(result);
  assert.equal(data.ok, false);
  assert.equal(data.error, 'Approve the artwork for the Underwriter tee first.');
  assert.equal(data.designId, designId);
  assert.deepEqual(data.artwork, { approved: false, reason: 'not_approved', note: 'Approve the artwork for the Underwriter tee first.', approvalPage: `/studio/approve/${designId}` });

  // The thread shows the sentence with the way on: the approval page, carrying this conversation back.
  const notice = noticeOf(result.ui);
  assert.equal(notice?.tone, 'warning');
  assert.equal(notice?.text, 'Approve the artwork for the Underwriter tee first.');
  assert.deepEqual(notice?.actions, [{ label: 'Approve the artwork', href: `/studio/approve/${designId}?from=${context.conversationId}`, prompt: undefined, variant: 'primary' }]);
  assert.deepEqual(result.ui?.next, [{ label: 'Look over the proofs', prompt: 'Show me the print proofs for Underwriter tee', primary: true }]);
  assert.equal((await h.db.select().from(schema.products).where(eq(schema.products.id, id)))[0].status, 'draft');
});

test('publish_product points to preparing the print files when there are none for the garment, colours or position', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  const result = await run(tools.publishProductTool, ctx(), { productId: id });
  const data = dataOf(result);
  assert.equal(data.error, "The print files don't cover the Underwriter tee yet. Prepare them and approve the artwork first.");
  assert.equal(data.artwork?.reason, 'not_prepared');
  // The model gets the exact prepare_print call: the blank, every colour on the product and the print position.
  assert.deepEqual(data.artwork?.prepare, { designId, blankCode: 'STTU169', colourCodes: ALL, position: 'front_chest', widthCm: 28 });

  const action = noticeOf(result.ui)?.actions?.[0];
  assert.deepEqual(action, { label: 'Prepare the print files', href: undefined, prompt: 'Prepare the print files for Underwriter tee', variant: 'primary' });
  assert.deepEqual(result.ui?.next, [{ label: 'Prepare the print files', prompt: 'Prepare the print files for Underwriter tee', primary: true }]);
});

test('publish_product names the colours a partial approval leaves out', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId, [BLACK, NAVY]);
  await approve(designId);
  const result = await run(tools.publishProductTool, ctx(), { productId: id });
  assert.equal(dataOf(result).error, "The print files don't cover the White Underwriter tee yet. Prepare them and approve the artwork first.");
});

test('publish_product says an approval was withdrawn, and works again once it is given', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  await approve(designId);
  assert.deepEqual(await revoke(designId), { ok: true, value: null });

  const refused = await run(tools.publishProductTool, ctx(), { productId: id });
  assert.equal(dataOf(refused).error, 'Approve the artwork for the Underwriter tee first. Your earlier approval was withdrawn.');
  assert.equal(dataOf(refused).artwork?.reason, 'withdrawn');

  await approve(designId);
  const published = await run(tools.publishProductTool, ctx(), { productId: id });
  assert.equal(dataOf(published).ok, true);
  assert.equal(published.ui?.cards?.length, 1);
  assert.equal(productCardOf(published.ui)?.status, 'live');
  assert.equal(productCardOf(published.ui)?.printApproval, undefined, 'a live product shows no approval state');
});

test('publish_product on a product with no design says there is no artwork', async () => {
  const id = await product(null);
  const result = await run(tools.publishProductTool, ctx(), { productId: id });
  const data = dataOf(result);
  assert.equal(data.error, 'Underwriter tee has no artwork yet, so there is nothing to approve. Make a new product from your artwork and approve that.');
  assert.equal(data.artwork?.reason, 'no_design');
  assert.equal(data.designId, undefined);
  assert.deepEqual(noticeOf(result.ui)?.actions, [{ label: 'Add your artwork', href: undefined, prompt: 'I want to upload artwork', variant: 'primary' }]);
});

test('the other publish refusals keep their plain notice, without an artwork link', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  const unpriced = await product(designId, { retailPriceCents: null });
  const result = await run(tools.publishProductTool, ctx(), { productId: unpriced });
  assert.equal(dataOf(result).error, 'Set a retail price (at least €1 above the base cost) before publishing.');
  assert.equal(noticeOf(result.ui)?.actions, undefined);
  assert.equal(result.ui?.next, undefined);

  const live = await product(designId, { status: 'live' });
  assert.equal(dataOf(await run(tools.publishProductTool, ctx(), { productId: live })).error, 'This product is already live.');
});

test('a draft with the artwork approved and no proof publishes: no proof is asked for', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  const id = await product(designId);
  const result = await run(tools.publishProductTool, ctx(), { productId: id });
  assert.equal(dataOf(result).ok, true, dataOf(result).error);
  assert.equal(productCardOf(result.ui)?.status, 'live');
  assert.equal((await h.db.select().from(schema.proofs).where(eq(schema.proofs.productId, id))).length, 0);
});

test('an account without a shop is told so', async () => {
  const result = await run(tools.publishProductTool, ctx({ storeId: null }), { productId: randomUUID() });
  assert.deepEqual(dataOf(result), { ok: false, error: 'No shop found for this account yet.' });
});

test('the tool says in its description what a publish needs', () => {
  const description = tools.publishProductTool.description;
  assert.match(description, /print files approved for its garment, every colour it has and its print position/);
  assert.match(description, /Never offer to publish before the artwork is approved/);
  assert.match(description, /already live is not taken down/);
  assert.match(tools.updateProductTool.description, /already live, adding a colour or moving the print needs the design's approval/);
});

// -- the confirm card ----------------------------------------------------------------------

function toolUse(name: string, input: Record<string, unknown>) {
  return { type: 'tool_use' as const, id: `toolu_${randomUUID()}`, name, input };
}

async function turn() {
  const conversation = await conversations.getOrCreateConversation(h.artist.userId, 'artist');
  const base = { userId: h.artist.userId, clerkId: 'clerk-artist', role: 'artist' as const, storeId: h.artist.storeId, conversationId: conversation.id, locale: 'en' };
  return base;
}

async function execute(base: Awaited<ReturnType<typeof turn>>, name: string, input: Record<string, unknown>) {
  const block = toolUse(name, input);
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  const events: AgentEvent[] = [];
  const outcome = await loop.executeToolCall(block as never, base, message.id, (event) => events.push(event));
  return { block, outcome, events };
}

test('a publish that would be refused never shows a confirm card: the refusal is the answer', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  const base = await turn();

  const { block, outcome, events } = await execute(base, 'publish_product', { productId: id, name: 'Underwriter tee' });
  assert.equal(outcome.kind, 'done', 'nothing waits for a click');
  if (outcome.kind !== 'done') return;
  assert.ok(!outcome.result.is_error);
  const told = JSON.parse(String(outcome.result.content)) as Shape;
  assert.equal(told.ok, false);
  assert.equal(told.error, 'Approve the artwork for the Underwriter tee first.');
  assert.equal(noticeOf(outcome.ui)?.actions?.[0]?.href, `/studio/approve/${designId}?from=${base.conversationId}`);
  assert.deepEqual(labels(outcome.ui?.next), ['Look over the proofs']);

  const stored = await audit.findByIdempotencyKey(block.id);
  assert.equal(stored?.status, 'ok', 'recorded as an answered call, not a step waiting to be confirmed');
  assert.equal(audit.confirmOutcomeOf(stored!), 'done');
  const ended = events.find((e) => e.type === 'tool_end');
  assert.ok(ended && ended.type === 'tool_end' && ended.ok && noticeOf(ended.ui), 'the client gets the notice with the tool result');
});

test('a publish that can go ahead still asks to be confirmed, and the confirmed run decides again', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  await approve(designId);
  const base = await turn();

  const { block, outcome } = await execute(base, 'publish_product', { productId: id, name: 'Underwriter tee' });
  assert.equal(outcome.kind, 'confirm');
  if (outcome.kind !== 'confirm') return;
  assert.equal(outcome.pending.card.summary, 'Publish Underwriter tee to your shop.');
  assert.equal((await audit.findByIdempotencyKey(block.id))?.status, 'pending_confirm');

  // The artist undoes the approval before clicking: the step runs, and refuses.
  assert.deepEqual(await revoke(designId), { ok: true, value: null });
  const confirmed = await run(tools.publishProductTool, ctx({ conversationId: base.conversationId }), { productId: id });
  assert.equal(dataOf(confirmed).ok, false);
  assert.equal(dataOf(confirmed).artwork?.reason, 'withdrawn');
  assert.equal((await h.db.select().from(schema.products).where(eq(schema.products.id, id)))[0].status, 'draft');
});

test('every other reason a publish is refused is said before any confirm card too', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  const base = await turn();
  const told = async (id: string) => {
    const { outcome } = await execute(base, 'publish_product', { productId: id });
    assert.equal(outcome.kind, 'done', 'nothing waits for a click');
    return outcome.kind === 'done' ? (JSON.parse(String(outcome.result.content)) as Shape).error : undefined;
  };
  assert.equal(await told(await product(designId, { status: 'live' })), 'This product is already live.');
  assert.equal(await told(await product(designId, { retailPriceCents: null })), 'Set a retail price (at least €1 above the base cost) before publishing.');
});

test('a draft with no proof gets the confirm card, since nothing stands in its way', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  const id = await product(designId);
  const { outcome } = await execute(await turn(), 'publish_product', { productId: id, name: 'Underwriter tee' });
  assert.equal(outcome.kind, 'confirm');
});

test('if the look before the confirm card fails, the card shows as usual and the run decides', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  const base = await turn();
  const tool = registry.getTool('publish_product')!;
  const original = tool.preflight;
  try {
    // Thrown at once, and rejected later: either way the card shows.
    tool.preflight = () => {
      throw new Error('the database is down');
    };
    assert.equal((await execute(base, 'publish_product', { productId: id })).outcome.kind, 'confirm');
    tool.preflight = async () => {
      throw new Error('the database is down');
    };
    assert.equal((await execute(base, 'publish_product', { productId: id })).outcome.kind, 'confirm');
  } finally {
    tool.preflight = original;
  }
  // And the run itself still refuses.
  assert.equal(dataOf(await run(tools.publishProductTool, ctx(), { productId: id })).ok, false);
});

test('only publish_product looks before it asks', () => {
  const withPreflight = registry.allTools().filter((t) => t.preflight).map((t) => t.name);
  assert.deepEqual(withPreflight, ['publish_product']);
  for (const tool of registry.allTools()) if (tool.preflight) assert.ok(tool.confirm || tool.confirmWhen, `${tool.name} looks before a confirm card only`);
});

// -- update_product on a live product ----------------------------------------------------------

test('update_product refuses a new colour on a live product with the same kind of sentence', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [BLACK], status: 'live' });
  await prepare(designId, [BLACK]);
  await approve(designId);
  const context = ctx();

  const result = await run(tools.updateProductTool, context, { productId: id, colours: [BLACK, NAVY] });
  assert.equal(dataOf(result).ok, false);
  assert.equal(dataOf(result).error, "The print files don't cover the French Navy Underwriter tee yet. Prepare them and approve the artwork first.");
  assert.deepEqual(dataOf(result).artwork?.prepare, { designId, blankCode: 'STTU169', colourCodes: [NAVY], position: 'front_chest', widthCm: 28 });
  assert.deepEqual(noticeOf(result.ui)?.actions?.map((a) => a.label), ['Prepare the print files']);
  assert.deepEqual((await h.db.select().from(schema.productColours).where(eq(schema.productColours.productId, id))).map((r) => r.colourCode), [BLACK]);

  await prepare(designId, [BLACK, NAVY]);
  await approve(designId);
  const allowed = await run(tools.updateProductTool, context, { productId: id, colours: [BLACK, NAVY] });
  assert.equal(dataOf(allowed).ok, true);
  assert.equal(productCardOf(allowed.ui)?.status, 'live');
});

test('update_product on a draft offers the next step towards the shop: the artwork, then the price, then publishing', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [BLACK], status: 'draft' });
  const result = await run(tools.updateProductTool, ctx(), { productId: id, colours: [BLACK, NAVY] });
  assert.equal(dataOf(result).ok, true);
  assert.deepEqual(labels(result.ui?.next), ['Prepare the print files']);
  assert.equal(productCardOf(result.ui)?.printApproval?.covered, false);

  // Prepared for those colours but not approved: the approval is next.
  await prepare(designId, [BLACK, NAVY]);
  assert.deepEqual(labels((await run(tools.updateProductTool, ctx(), { productId: id, name: 'Underwriter tee, new name' })).ui?.next), ['Look over the proofs']);

  // Approved but unpriced: the price. Priced: publishing. No step is ever a proof.
  await approve(designId);
  const unpriced = await product(designId, { colours: [BLACK, NAVY], retailPriceCents: null });
  assert.deepEqual(labels((await run(tools.updateProductTool, ctx(), { productId: unpriced, description: 'Heavy cotton.' })).ui?.next), ['Price it at €20']);
  assert.deepEqual(labels((await run(tools.updateProductTool, ctx(), { productId: id, description: 'Heavy cotton.' })).ui?.next), ['Publish the product']);

  // A live product has nothing left to publish.
  const live = await product(designId, { colours: [BLACK, NAVY], status: 'live' });
  assert.equal((await run(tools.updateProductTool, ctx(), { productId: live, description: 'Heavy cotton.' })).ui?.next, undefined);
});

// -- where a product's artwork stands: get_product, the card and the panel --------------------------

test('get_product tells the model and the card whether the artwork is approved, and what to do', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { status: 'draft' });
  const context = ctx();

  const unprepared = await run(tools.getProductTool, context, { productId: id });
  assert.equal(dataOf(unprepared).designId, designId);
  assert.equal(dataOf(unprepared).artwork?.approved, false);
  assert.equal(dataOf(unprepared).artwork?.reason, 'not_prepared');
  assert.deepEqual(dataOf(unprepared).artwork?.prepare, { designId, blankCode: 'STTU169', colourCodes: ALL, position: 'front_chest', widthCm: 28 });
  const card = productCardOf(unprepared.ui);
  assert.deepEqual(card?.printApproval, {
    covered: false,
    sentence: "The print files don't cover the Underwriter tee yet. Prepare them and approve the artwork first.",
    action: { label: 'Prepare the print files', prompt: 'Prepare the print files for Underwriter tee' },
  });
  assert.deepEqual(card?.actions, [{ label: 'Prepare the print files', href: undefined, prompt: 'Prepare the print files for Underwriter tee', variant: 'primary' }]);
  // The panel's state carries the same answer.
  assert.deepEqual((unprepared.ui?.project?.state as { printApproval?: unknown }).printApproval, card?.printApproval);

  await prepare(designId);
  const toApprove = await run(tools.getProductTool, context, { productId: id });
  assert.equal(productCardOf(toApprove.ui)?.printApproval?.action?.href, `/studio/approve/${designId}?from=${context.conversationId}`);
  assert.equal(productCardOf(toApprove.ui)?.printApproval?.action?.prompt, undefined);
  assert.equal(dataOf(toApprove).artwork?.prepare, undefined, 'nothing to prepare once the files exist');
  assert.equal(dataOf(toApprove).artwork?.approvalPage, `/studio/approve/${designId}`);

  await approve(designId);
  const approved = await run(tools.getProductTool, context, { productId: id });
  assert.deepEqual(dataOf(approved).artwork, { approved: true });
  assert.deepEqual(productCardOf(approved.ui)?.printApproval, { covered: true });
  assert.equal(productCardOf(approved.ui)?.actions, undefined, 'nothing to do');
});

test('a live product, an archived one and an embroidered one show no approval state', async () => {
  const { designId } = await h.newDesign();
  for (const status of ['live', 'archived'] as const) {
    const id = await product(designId, { status: status === 'live' ? 'live' : 'draft' });
    if (status === 'archived') await h.db.update(schema.products).set({ status: 'archived' }).where(eq(schema.products.id, id));
    const result = await run(tools.getProductTool, ctx(), { productId: id });
    assert.equal(dataOf(result).artwork, undefined, status);
    assert.equal(productCardOf(result.ui)?.printApproval, undefined, status);
  }
  const embroidered = await product(designId, { status: 'draft', service: 'embroidery' });
  const result = await run(tools.getProductTool, ctx(), { productId: embroidered });
  assert.equal(dataOf(result).artwork, undefined);
  assert.equal(productCardOf(result.ui)?.printApproval, undefined);
});

test('create_product offers to prepare the print files beside pricing, and tells the model how', async () => {
  const { designId } = await h.newDesign();
  const result = await run(tools.createProductTool, ctx(), {
    designId,
    blankCode: 'STTU169',
    printServiceCode: 'dtg',
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [BLACK],
    sizes: ['M'],
    name: 'Underwriter tee',
  });
  assert.equal(dataOf(result).ok, true, dataOf(result).error);
  assert.equal(dataOf(result).designId, designId);
  assert.deepEqual(dataOf(result).artwork?.prepare, { designId, blankCode: 'STTU169', colourCodes: [BLACK], position: 'front_chest', widthCm: 28 });
  assert.deepEqual(labels(result.ui?.next), ['Price it at €22', 'Prepare the print files', 'Add another colour']);
  assert.equal(result.ui?.next?.filter((c) => c.primary).length, 1, 'pricing stays the one primary step');
  assert.equal(productCardOf(result.ui)?.printApproval?.covered, false);
});

// -- the per-product proof is retired ----------------------------------------------------------

const RETIRED_TOOLS = [
  { tool: () => tools.submitProofTool, input: {} as Record<string, unknown>, bulk: 'submit_bulk_proof' },
  { tool: () => tools.approveProofTool, input: {} as Record<string, unknown>, bulk: 'approve_bulk_proof' },
  { tool: () => tools.requestProofChangesTool, input: { notes: 'Make the logo bigger.' } as Record<string, unknown>, bulk: 'request_bulk_changes' },
];

test('the three product proof tools are retired: they change nothing and send the assistant to the artwork', async () => {
  const { designId } = await h.newDesign();
  // An old product with a proof still waiting from before, and a new one with none.
  const old = await product(designId, { status: 'proof_pending', proof: 'pending' });
  const fresh = await product(designId);
  const before = await h.db.select().from(schema.proofs);
  const statuses = async () => (await h.db.select().from(schema.products)).map((r) => [r.id, r.status] as const).sort();
  const productsBefore = await statuses();

  for (const { tool, input } of RETIRED_TOOLS) {
    const t = tool();
    for (const id of [old, fresh]) {
      const result = await (t as Tool<Record<string, unknown>, unknown>).run(ctx(), t.input.parse({ ...input, productId: id }) as Record<string, unknown>);
      const data = dataOf(result) as Shape & { retired?: boolean; runs?: string };
      assert.equal(data.ok, false, t.name);
      assert.equal(data.retired, true, t.name);
      // The artwork is not prepared yet: that is the step it names, in the artist's words.
      assert.equal(data.error, "Shop products don't need a separate proof now: approving the artwork replaces it. The print files don't cover the Underwriter tee yet. Prepare them and approve the artwork first.", t.name);
      assert.equal(data.artwork?.reason, 'not_prepared', t.name);
      assert.match(data.runs ?? '', /submit_bulk_proof, approve_bulk_proof and request_bulk_changes/, 'and the model is told where a run\'s proof is');
      assert.deepEqual(labels(result.ui?.next), ['Prepare the print files'], t.name);
      assert.equal(noticeOf(result.ui)?.tone, 'info', t.name);
    }
  }
  // Nothing was written: no proof made, approved or sent back, and no product moved.
  assert.deepEqual(await h.db.select().from(schema.proofs), before);
  assert.deepEqual(await statuses(), productsBefore);
  assert.equal((await proofs.getLatestProof(h.artist.storeId, old))?.status, 'pending', 'the old proof still reads');

  // Approved artwork: the next step is the shop. Not found or no product open: still a plain answer.
  await prepare(designId);
  await approve(designId);
  for (const { tool, input } of RETIRED_TOOLS) {
    const t = tool();
    const result = await (t as Tool<Record<string, unknown>, unknown>).run(ctx(), t.input.parse({ ...input, productId: fresh }) as Record<string, unknown>);
    assert.equal(dataOf(result).error, "Shop products don't need a separate proof now: approving the artwork replaces it. The artwork is approved, so the Underwriter tee can be published.", t.name);
    assert.deepEqual(result.ui?.next, [{ label: 'Publish the product', prompt: 'Publish the product', primary: true }], t.name);
    const none = await (t as Tool<Record<string, unknown>, unknown>).run(ctx({ conversationId: randomUUID() }), t.input.parse({ ...input }) as Record<string, unknown>);
    assert.equal(dataOf(none).error, "Shop products don't need a separate proof now: approving the artwork replaces it.", `${t.name} with no product open`);
    assert.equal(none.ui?.next, undefined);
  }
  const noShop = await (tools.submitProofTool as Tool<Record<string, unknown>, unknown>).run(ctx({ storeId: null }), {});
  assert.equal(dataOf(noShop).error, "Shop products don't need a separate proof now: approving the artwork replaces it.");
});

test('the retired proof tools no longer ask to be confirmed, and say so in their descriptions', () => {
  for (const { tool, bulk } of RETIRED_TOOLS) {
    const t = tool();
    assert.equal(Boolean(t.confirm), false, `${t.name} has nothing to confirm`);
    assert.equal(Boolean(t.confirmWhen), false);
    assert.match(t.description, /^Retired: a shop product has no separate proof any more, so never send, approve or send back one for a shop product\./, t.name);
    assert.match(t.description, new RegExp(`A run's proof is separate and stays: ${bulk}\\.`), `${t.name} points to ${bulk}`);
    assert.match(t.description, /Calling this changes nothing/);
    assert.equal(registry.getTool(bulk)?.scope, 'artist', `${bulk} is still there for runs`);
  }
  // The run tools say nothing of being retired.
  for (const name of ['submit_bulk_proof', 'approve_bulk_proof', 'request_bulk_changes']) assert.doesNotMatch(registry.getTool(name)!.description, /retired/i, name);
  assert.equal(registry.getTool('approve_bulk_proof')?.confirm, true, 'a run proof is still approved on a card');
});

test('no tool the assistant is given asks for a per-product proof any more', () => {
  const live = registry.toolsFor({ role: 'artist' });
  for (const t of live) {
    if (['submit_proof', 'approve_proof', 'request_proof_changes'].includes(t.name)) continue;
    if (['submit_bulk_proof', 'approve_bulk_proof', 'request_bulk_changes'].includes(t.name)) continue;
    // Whatever else mentions a proof is about the print files (a print proof) or a run, never a shop product's own.
    assert.doesNotMatch(t.description, /submit_proof|approve_proof|request_proof_changes|send the proof|moving the product from draft to proof_pending/i, t.name);
  }
  assert.doesNotMatch(tools.createProductTool.description, /submit_proof/);
  assert.doesNotMatch(tools.publishProductTool.description, /latest proof is approved/);
  assert.match(tools.publishProductTool.description, /A shop product needs no proof of its own: the artwork approval is the only approval it needs, and a draft is published directly\./);
});

test('set_price and the collection tool keep the approval state current on the card and in the panel, and point to the shop', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { retailPriceCents: null });
  const context = ctx();

  const priced = await run(tools.setPriceTool, context, { productId: id, retailCents: 4000 });
  assert.equal(productCardOf(priced.ui)?.printApproval?.covered, false);
  assert.equal((priced.ui?.project?.state as { printApproval?: { covered: boolean } }).printApproval?.covered, false);
  // Priced, but the artwork is not: that is the step, and it is not a proof.
  assert.deepEqual(labels(priced.ui?.next), ['Prepare the print files', 'Add a collection']);
  assert.equal(dataOf(priced).artwork?.approved, false);

  await prepare(designId);
  await approve(designId);
  const [collection] = await h.db.insert(schema.collections).values({ storeId: h.artist.storeId, name: 'Winter Tour', slug: 'winter-tour' }).returning();
  const assigned = await run(tools.assignToCollectionTool, context, { productId: id, collectionId: collection.id });
  assert.equal(productCardOf(assigned.ui)?.printApproval?.covered, true);

  // With the artwork approved, pricing leads to publishing.
  const again = await run(tools.setPriceTool, context, { productId: id, retailCents: 4200 });
  assert.deepEqual(again.ui?.next, [{ label: 'Publish the product', prompt: 'Publish the product', primary: true }, { label: 'Add a collection', prompt: 'Add a collection called Winter Tour' }]);
  assert.equal(dataOf(again).artwork?.approved, true);
});

test('the stored panel is read again when the chat opens: the artist may have approved on the approval page since', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { status: 'proof_pending' });
  const conversationId = randomUUID();
  const stale = { productId: id, name: 'Underwriter tee', status: 'proof_pending', printApproval: { covered: false, sentence: 'Approve the artwork for the Underwriter tee first.' } };
  const stored = (state: Record<string, unknown>) => ({ kind: 'product', refId: id, state });
  const storeId = h.artist.storeId;

  // Still not approved: the answer is current, with the link back to this conversation.
  await prepare(designId);
  const waiting = await print.withFreshApproval(storeId, conversationId, stored(stale));
  assert.deepEqual(waiting.printApproval, {
    covered: false,
    sentence: 'Approve the artwork for the Underwriter tee first.',
    action: { label: 'Approve the artwork', href: `/studio/approve/${designId}?from=${conversationId}` },
  });
  assert.equal(waiting.name, 'Underwriter tee', 'the rest of the panel is as it was stored');

  await approve(designId);
  assert.deepEqual((await print.withFreshApproval(storeId, conversationId, stored(stale))).printApproval, { covered: true });

  // Undone again: the panel says so.
  assert.deepEqual(await revoke(designId), { ok: true, value: null });
  assert.equal(((await print.withFreshApproval(storeId, conversationId, stored(stale))).printApproval as { covered: boolean }).covered, false);

  // Other projects, other statuses, other shops and unknown products come back as they were stored.
  const live = { ...stale, status: 'live' };
  assert.equal((await print.withFreshApproval(storeId, conversationId, stored(live))).printApproval, live.printApproval);
  const run3 = { kind: 'bulk_order', refId: id, state: { status: 'quoted' } };
  assert.deepEqual(await print.withFreshApproval(storeId, conversationId, run3), run3.state);
  assert.deepEqual(await print.withFreshApproval(null, conversationId, stored(stale)), stale);
  const unknown = { kind: 'product', refId: randomUUID(), state: stale };
  assert.deepEqual(await print.withFreshApproval(storeId, conversationId, unknown), { productId: id, name: 'Underwriter tee', status: 'proof_pending' });
});

// -- words --------------------------------------------------------------------------------

test('nothing the artist reads carries a Pantone code, even after pre-press has entered one', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { name: 'Tour tee, back print' });
  await prepare(designId);
  const [darks] = (await h.packs((await h.printPrep.latestVersion(designId))?.id)).filter((p) => p.screenSetKey === 'darks');
  const assigned = await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: 2, code: '237 c' });
  assert.ok(assigned.ok);

  const context = ctx();
  const outputs = [
    await run(tools.publishProductTool, context, { productId: id }),
    await run(tools.getProductTool, context, { productId: id }),
    await run(tools.approveProofTool, context, { productId: await product(designId, { proof: 'pending' }) }),
    await run(tools.setPriceTool, context, { productId: id, retailCents: 4100 }),
  ];
  for (const output of outputs) assert.doesNotMatch(JSON.stringify(output), /pantone|237/i);
});

test('the assistant is told to prepare and get approval before it offers to publish', () => {
  const text = guidance.ARTIST_PRINT_GUIDANCE;
  assert.match(text, /Publishing\. A product goes in the shop only when its design's print files are approved for its garment, every colour it has and where the print goes, and it has a price\./);
  // A shop product has no proof of its own; a run keeps its own.
  assert.match(text, /That approval is the only approval a shop product needs: it has no separate proof, so never offer to send, approve or send back a proof for a shop product/);
  assert.match(text, /\(submit_proof, approve_proof and request_proof_changes are retired and change nothing\)/);
  assert.match(text, /A run is different: it still has its own proof, with submit_bulk_proof, approve_bulk_proof and request_bulk_changes\./);
  assert.match(text, /prepare and get approval before you offer to publish/);
  assert.match(text, /While it is not approved, do not offer Publish and do not call publish_product/);
  assert.match(text, /Once it is approved, offer to publish the products made from that design, once they have a price\./);
  assert.match(text, /An approval does not cover a colour or print position added afterwards: prepare and approve again\./);
  assert.match(text, /A product that is already live stays live if its approval is later withdrawn/);
  assert.match(prompt.stableSystemText('artist'), /do not offer Publish/);
  assert.doesNotMatch(prompt.stableSystemText('admin'), /do not offer Publish/, 'the owner is not coached as an artist');
});
