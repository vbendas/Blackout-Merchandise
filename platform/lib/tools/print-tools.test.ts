// The print-prep agent tools on PGlite, with the fake engine, pack, storage and queue:
// what each tool is declared as, who is offered it, what it says to an artist (never a
// Pantone code) and to the pre-press team, and that the approval card's link carries the
// conversation. The services are tested in lib/services; this is the thin layer over them.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser } from '@/scripts/test/pglite';
import { PermissionError, type Actor, type PermissionMap } from '@/lib/auth/permissions';
import { bootstrapPrint, seedRun, seedShopOrder, type Harness } from '@/lib/print/test-support';
import type { PrintJobInput } from '@/lib/print/types';
import type { Card, ToolUi } from '@/lib/ui-cards/schemas';
import type { Tool, ToolContext, ToolResult } from '@/lib/tools/types';

let h: Harness;
let print: typeof import('@/lib/tools/print');
let prepress: typeof import('@/lib/tools/prepress');
let registry: typeof import('@/lib/tools/registry');
let labels: typeof import('@/lib/tools/labels');

before(async () => {
  h = await bootstrapPrint();
  print = await import('@/lib/tools/print');
  prepress = await import('@/lib/tools/prepress');
  registry = await import('@/lib/tools/registry');
  labels = await import('@/lib/tools/labels');
});

after(async () => {
  await h.close();
});

// -- helpers --------------------------------------------------------------------

const artistCtx = (over: Partial<ToolContext> = {}): ToolContext => ({
  userId: h.artist.userId,
  clerkId: 'clerk-artist',
  role: 'artist',
  storeId: h.artist.storeId,
  conversationId: randomUUID(),
  idempotencyKey: 'k',
  locale: 'en',
  ...over,
});

const staffCtx = (actor: Actor): ToolContext => ({
  userId: actor.userId,
  clerkId: `clerk-${actor.userId}`,
  role: actor.role,
  storeId: null,
  conversationId: randomUUID(),
  idempotencyKey: 'k',
  locale: 'en',
  permissions: actor.permissions ?? null,
  suspended: actor.suspended,
});

const staffWith = (prepress: 'view' | 'work' | 'manage', name?: string) => h.staff({ prepress }, name ? { name } : undefined);

const notices = (ui?: ToolUi): string[] => (ui?.cards ?? []).filter((c): c is Extract<Card, { kind: 'notice' }> => c.kind === 'notice').map((c) => c.text);
const proofCard = (ui?: ToolUi) => (ui?.cards ?? []).find((c): c is Extract<Card, { kind: 'print_proof' }> => c.kind === 'print_proof');
const chips = (ui?: ToolUi): string[] => (ui?.next ?? []).map((c) => c.label);
const names = (tools: readonly { name: string }[]) => tools.map((t) => t.name);
// What the staff tools put in `data` (they hand it back as unknown, since a refusal and a result share one shape).
interface QueueData {
  ok: boolean;
  tab: string;
  counts: Record<string, number>;
  packs: { packId: string; design: string; file: string; screens: string; neededFor: string }[];
}
interface PackData {
  ok: boolean;
  films: { film: number; label: string; pantone: string | null; needsPantone: boolean }[];
  checks: { id: string; state: string }[];
  canWork: boolean;
}
interface LibraryData {
  ok: boolean;
  codes: { code: string; hex: string; source: string }[];
}
const dataOf = <T>(result: ToolResult<unknown>): T => result.data as T;

/** Runs a tool the way the loop does: the model's input goes through the tool's own schema first. */
const run = <I, O>(tool: Tool<I, O>, ctx: ToolContext, input: I): Promise<ToolResult<O>> => tool.run(ctx, tool.input.parse(input) as I);

// -- what the tools are --------------------------------------------------------------

test('the artist tools are artist tools, and only approving asks first', () => {
  assert.deepEqual(
    print.PRINT_TOOLS.map((t) => [t.name, t.scope, Boolean(t.confirm), Boolean(t.readOnly)]),
    [
      ['prepare_print', 'artist', false, false],
      ['get_print_proof', 'artist', false, true],
      ['approve_design', 'artist', true, false],
      ['change_screen_count', 'artist', false, false],
    ],
  );
  for (const tool of print.PRINT_TOOLS) assert.equal(registry.getTool(tool.name), tool, `${tool.name} is registered`);
});

test('the pre-press tools are staff tools in the Pre-press area, at the level their work needs', () => {
  assert.deepEqual(
    prepress.PREPRESS_TOOLS.map((t) => [t.name, t.scope, `${t.access?.area}:${t.access?.level}`, Boolean(t.confirm), Boolean(t.readOnly)]),
    [
      ['list_prepress_queue', 'staff', 'prepress:view', false, true],
      ['get_prepress_pack', 'staff', 'prepress:view', false, true],
      ['approve_pack', 'staff', 'prepress:work', true, false],
      ['rerun_pack', 'staff', 'prepress:work', false, false],
      ['send_back_to_artist', 'staff', 'prepress:work', true, false],
      ['assign_pantone', 'staff', 'prepress:work', false, false],
      ['list_pantone_library', 'staff', 'prepress:view', false, true],
      ['get_ink_system', 'staff', 'prepress:view', false, true],
      ['update_ink_system', 'staff', 'prepress:manage', true, false],
    ],
  );
  for (const tool of prepress.PREPRESS_TOOLS) assert.equal(registry.getTool(tool.name), tool, `${tool.name} is registered`);
  // The team activity log lists what changes something, and leaves the reads out.
  assert.deepEqual(
    registry.staffActionTools().filter((t) => t.area === 'prepress').map((t) => t.name).sort(),
    ['approve_pack', 'assign_pantone', 'rerun_pack', 'send_back_to_artist', 'update_ink_system'],
  );
});

test('each caller is offered the print tools its role and access allow', () => {
  const offered = (holder: Parameters<typeof registry.toolsFor>[0]) => new Set(names(registry.toolsFor(holder)));
  const artistTools = names(print.PRINT_TOOLS);
  const view = ['list_prepress_queue', 'get_prepress_pack', 'list_pantone_library', 'get_ink_system'];
  const work = ['approve_pack', 'rerun_pack', 'send_back_to_artist', 'assign_pantone'];

  const asArtist = offered({ role: 'artist' });
  for (const name of artistTools) assert.ok(asArtist.has(name), `an artist is offered ${name}`);
  for (const name of [...view, ...work, 'update_ink_system']) assert.ok(!asArtist.has(name), `an artist is not offered ${name}`);

  const viewing = offered({ role: 'staff', permissions: { prepress: 'view' } as PermissionMap });
  for (const name of view) assert.ok(viewing.has(name), `view access is offered ${name}`);
  for (const name of [...work, 'update_ink_system', ...artistTools]) assert.ok(!viewing.has(name), `view access is not offered ${name}`);

  const working = offered({ role: 'staff', permissions: { prepress: 'work' } as PermissionMap });
  for (const name of [...view, ...work]) assert.ok(working.has(name), `work access is offered ${name}`);
  for (const name of ['update_ink_system', ...artistTools]) assert.ok(!working.has(name), `work access is not offered ${name}`);

  const managing = offered({ role: 'staff', permissions: { prepress: 'manage' } as PermissionMap });
  for (const name of [...view, ...work, 'update_ink_system']) assert.ok(managing.has(name), `manage access is offered ${name}`);
  for (const name of artistTools) assert.ok(!managing.has(name), 'an employee is never offered an artist tool');

  const owner = offered({ role: 'admin' });
  for (const name of [...view, ...work, 'update_ink_system']) assert.ok(owner.has(name), `the owner is offered ${name}`);

  const nothing = offered({ role: 'staff', permissions: { support: 'manage' } as PermissionMap });
  for (const name of [...view, ...work, 'update_ink_system']) assert.ok(!nothing.has(name), `other areas are not offered ${name}`);
  assert.equal(registry.toolsFor({ role: 'staff', permissions: { prepress: 'manage' } as PermissionMap, suspended: true }).length, 0);
});

test('every tool has a progress line, and the ones that ask first have their buttons', () => {
  for (const tool of [...print.PRINT_TOOLS, ...prepress.PREPRESS_TOOLS]) {
    assert.notEqual(labels.toolProgressLabel(tool.name), 'Working on it', `${tool.name} has a progress line`);
    if (tool.confirm) {
      const buttons = labels.confirmLabels(tool.name);
      assert.notDeepEqual(buttons, { approve: 'Approve', cancel: 'Cancel' }, `${tool.name} has its own buttons`);
      assert.ok(buttons.approve.length > 0 && buttons.cancel.length > 0);
    }
  }
  // Plain words: no jargon in what the artist reads while a tool runs.
  for (const tool of print.PRINT_TOOLS) assert.doesNotMatch(labels.toolProgressLabel(tool.name), /pantone|separation|psd|pack|film/i, tool.name);
});

// -- the artist's flow ------------------------------------------------------------

test('an artist prepares, looks over and approves a design in their own words, and the link carries the conversation', async () => {
  const { designId } = await h.newDesign();
  const ctx = artistCtx();
  const from = `?from=${encodeURIComponent(ctx.conversationId)}`;

  const prepared = await run(print.preparePrintTool, ctx, { designId, blankCode: 'STTU169', colourCodes: ['C002', 'C727', 'C001'] });
  assert.equal(prepared.data.ok, true, JSON.stringify(prepared.data));
  assert.equal(prepared.data.status, 'preparing');
  assert.equal(prepared.data.approvalPage, `/studio/approve/${designId}`);
  const queued = proofCard(prepared.ui)!;
  assert.equal(queued.status, 'preparing');
  assert.equal(queued.approveHref, `/studio/approve/${designId}${from}`);
  assert.equal(queued.note, 'Preparing the print files. This takes a few minutes.');
  assert.deepEqual(chips(prepared.ui), ['Check the proofs']);

  // Not ready: approving says so, as a notice.
  const early = await run(print.approveDesignTool, ctx, { designId });
  assert.deepEqual(early.data, { ok: false, error: 'The print files are still being prepared. Try again in a few minutes.' });
  assert.deepEqual(notices(early.ui), ['The print files are still being prepared. Try again in a few minutes.']);

  await h.runJob(prepared.data.jobId as string);

  const proof = await run(print.getPrintProofTool, ctx, { designId });
  assert.equal(proof.data.ok, true);
  assert.equal(proof.data.status, 'ready');
  assert.equal(proof.data.canApprove, true);
  assert.equal(proof.data.designName, 'Underwriter tee');
  assert.equal(proof.data.placement, 'Front chest · 28 × 33.6 cm');
  assert.deepEqual(proof.data.garments, ['Black', 'French Navy', 'White']);
  assert.deepEqual(proof.data.screenSets?.map((s) => [s.name, s.garments, s.screens]), [['Darks', 2, 6], ['Lights', 1, 4]]);
  const card = proofCard(proof.ui)!;
  assert.equal(card.status, 'ready');
  assert.equal(card.versionNumber, 1);
  assert.equal(card.screenCount, 6);
  assert.equal(card.approveHref, `/studio/approve/${designId}${from}`, 'the way back from the approval page lands in this conversation');
  assert.deepEqual(card.proofs.map((p) => [p.garmentName, p.technique]), [['Black', 'dtg_dtf'], ['Black', 'screen'], ['French Navy', 'dtg_dtf'], ['French Navy', 'screen']]);
  assert.ok(card.proofs.every((p) => p.url.startsWith('/fake-files/public/print/')));
  assert.equal(card.note, 'Look over the proofs on each colour, then approve.');
  assert.deepEqual(chips(proof.ui), ['Approve the design', 'Use fewer screens']);

  // The confirmation reads clearly; it executes once the artist has clicked (the loop holds it until then).
  assert.equal(print.approveDesignTool.summarize?.({ designId, designName: 'Underwriter tee', versionNumber: 1 }), 'Approve Underwriter tee (version 1) for shop products and runs, on every colour in the proofs.');
  assert.equal(print.approveDesignTool.summarize?.({ designId }), 'Approve this design for shop products and runs, on every colour in the proofs.');

  const approved = await run(print.approveDesignTool, ctx, { designId });
  assert.equal(approved.data.ok, true);
  assert.ok(approved.data.approvalId);
  assert.equal(proofCard(approved.ui)!.status, 'approved');
  assert.equal(proofCard(approved.ui)!.note, 'Approved for shop products and runs, on every colour you picked.');
  assert.deepEqual(chips(approved.ui), ['Quote a run']);
  assert.equal((await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId))).length, 1);
  assert.equal((await run(print.approveDesignTool, ctx, { designId })).data.approvalId, approved.data.approvalId, 'asking again is the same approval');

  // Nothing the artist reads names a Pantone code, even after pre-press has entered one.
  const worker = await staffWith('work');
  const version = (await h.printPrep.latestVersion(designId))!;
  const darks = (await h.packs(version.id)).find((p) => p.screenSetKey === 'darks')!;
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 2, code: '237 C' })).ok);
  const after = await run(print.getPrintProofTool, ctx, { designId });
  assert.doesNotMatch(JSON.stringify([prepared, early, proof, approved, after]), /pantone|separation|\bPSD\b/i);
});

test('the link on the card goes without a conversation when the tool has none', async () => {
  const { designId } = await h.newDesign();
  await h.prepare(designId);
  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))!;
  assert.equal(print.printProofCard(view).kind, 'print_proof');
  assert.equal((print.printProofCard(view) as { approveHref: string }).approveHref, `/studio/approve/${designId}`);
  assert.equal((print.printProofCard(view, null) as { approveHref: string }).approveHref, `/studio/approve/${designId}`);
  assert.equal((print.printProofCard(view, 'a b&c') as { approveHref: string }).approveHref, `/studio/approve/${designId}?from=a%20b%26c`, 'the id is encoded');
});

test('what goes wrong comes back as a plain sentence, as data and as a notice', async () => {
  const { designId } = await h.newDesign();
  const ctx = artistCtx();

  // No shop yet.
  const noShop = artistCtx({ storeId: null });
  for (const result of [
    await run(print.preparePrintTool, noShop, { designId, blankCode: 'STTU169', colourCodes: ['C002'] }),
    await run(print.getPrintProofTool, noShop, { designId }),
    await run(print.approveDesignTool, noShop, { designId }),
    await run(print.changeScreenCountTool, noShop, { designId, screens: 8 }),
  ]) {
    assert.deepEqual(result.data, { ok: false, error: 'No shop found for this account yet.' });
  }

  const say = async (result: Promise<ToolResult<{ ok: boolean; error?: string }>>) => {
    const r = await result;
    assert.equal(r.data.ok, false);
    assert.deepEqual(notices(r.ui), [r.data.error], 'the notice says the same');
    return r.data.error ?? '';
  };
  assert.equal(await say(run(print.preparePrintTool, ctx, { designId, blankCode: 'NOPE', colourCodes: ['C002'] })), 'There is no blank with the code NOPE.');
  assert.equal(await say(run(print.preparePrintTool, ctx, { designId: randomUUID(), blankCode: 'STTU169', colourCodes: ['C002'] })), 'Design not found for this shop.');
  assert.match(await say(run(print.preparePrintTool, ctx, { designId, blankCode: 'STTU169', colourCodes: ['C999'] })), /^C999 isn't available on the /);
  assert.match(await say(run(print.preparePrintTool, ctx, { designId, blankCode: 'STTU169', colourCodes: ['C002'], position: 'sleeve' })), /has no "sleeve" print position\. Use one of: front chest, front, left chest, back\.$/);
  assert.equal(await say(run(print.getPrintProofTool, ctx, { designId })), 'There are no print files for this design yet. Prepare them first.');
  assert.equal(await say(run(print.approveDesignTool, ctx, { designId })), 'There are no print files for this design yet. Prepare them first.');
  assert.equal(await say(run(print.changeScreenCountTool, ctx, { designId, screens: 8 })), 'Prepare the print files first, then the screen count can change.');

  // A version that is not this design's.
  await h.prepare(designId);
  assert.equal(await say(run(print.approveDesignTool, ctx, { designId, versionId: randomUUID() })), "That version of the design wasn't found.");

  // Another shop's design is not theirs to look at or approve.
  const stranger = await seedUser(h.db, { email: 'tool-stranger@merchfrom.test', withStore: true });
  const theirs = artistCtx({ userId: stranger.userId, storeId: stranger.storeId });
  assert.equal(await say(run(print.getPrintProofTool, theirs, { designId })), 'There are no print files for this design yet. Prepare them first.');
  assert.equal(await say(run(print.approveDesignTool, theirs, { designId })), 'There are no print files for this design yet. Prepare them first.');
  assert.equal(await say(run(print.changeScreenCountTool, theirs, { designId, screens: 8 })), 'Design not found for this shop.');

  // The tool's own input rules.
  assert.equal(print.changeScreenCountTool.input.safeParse({ designId, screens: 16 }).success, false);
  assert.equal(print.changeScreenCountTool.input.safeParse({ designId, screens: 2.5 }).success, false);
  assert.equal(print.preparePrintTool.input.safeParse({ designId: 'nope', blankCode: 'STTU169', colourCodes: ['C002'] }).success, false);
  assert.equal(print.preparePrintTool.input.safeParse({ designId, blankCode: 'STTU169', colourCodes: [] }).success, false);
  assert.equal(print.approveDesignTool.input.safeParse({ designId, extra: true }).success, false, 'unknown fields are refused');
});

test('changing the screen count tells the artist the price effect, in the same words as the proof', async () => {
  const { designId } = await h.newDesign();
  const ctx = artistCtx();
  await h.prepare(designId);

  const note = async (screens: number) => {
    const r = await run(print.changeScreenCountTool, ctx, { designId, screens });
    assert.equal(r.data.ok, true, JSON.stringify(r.data));
    assert.equal(r.data.screens, screens);
    assert.equal(proofCard(r.ui)!.status, 'preparing', 'the screen print is being made again');
    return r.data.note;
  };
  assert.equal(await note(6), 'No surcharge on a run.');
  assert.equal(await note(8), 'No surcharge on a run.');
  // A ceiling: the separation may use fewer screens than allowed, and the new proof says how many.
  assert.equal(await note(9), 'The new separation uses up to 9 screens. On a run, each screen above 8 adds €1 per piece, so up to €1 per piece; the new proof shows the actual count.');
  assert.equal(await note(12), 'The new separation uses up to 12 screens. On a run, each screen above 8 adds €1 per piece, so up to €4 per piece; the new proof shows the actual count.');
  assert.equal(await note(15), 'The new separation uses up to 15 screens. On a run, each screen above 8 adds €1 per piece, so up to €7 per piece; the new proof shows the actual count.');
});

// -- the pre-press team's tools --------------------------------------------------------

test('a person without Pre-press access is refused by every pre-press tool, in words, and nothing changes', async () => {
  const { dtg } = await preparedPacks();
  const view = await staffWith('view');
  const worker = await staffWith('work');
  const asArtist = artistCtx();
  const viewerCtx = staffCtx(view);
  const packId = dtg.id;
  const noView = new PermissionError('prepress', 'view').message;
  const noWork = new PermissionError('prepress', 'work').message;
  const noManage = new PermissionError('prepress', 'manage').message;

  const refused = async (result: Promise<ToolResult<unknown>> | ToolResult<unknown>, message: string) => {
    const r = (await result) as ToolResult<{ ok: boolean; error?: string }>;
    assert.deepEqual(r.data, { ok: false, error: message });
    assert.deepEqual(notices(r.ui), [message]);
  };

  // Reads: an artist has no View access at all.
  await refused(run(prepress.listPrepressQueueTool, asArtist, {}), noView);
  await refused(run(prepress.getPrepressPackTool, asArtist, { packId }), noView);
  await refused(run(prepress.listPantoneLibraryTool, asArtist, {}), noView);
  // Actions need Work, and the ink system needs Manage.
  await refused(run(prepress.approvePackTool, viewerCtx, { packId }), noWork);
  await refused(run(prepress.rerunPackTool, viewerCtx, { packId, screens: 6 }), noWork);
  await refused(run(prepress.sendBackToArtistTool, viewerCtx, { packId, note: 'Please redraw it.' }), noWork);
  await refused(run(prepress.assignPantoneTool, viewerCtx, { packId, filmNumber: 2, code: '186 C' }), noWork);
  await refused(run(prepress.updateInkSystemTool, staffCtx(worker), { changes: { pressHeads: 8 } }), noManage);

  const [row] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, packId));
  assert.equal(row.auditStatus, 'idle', 'refused, so nothing moved');
  assert.equal((await h.db.select().from(schema.inkSystems)).length, 0);
  // Reads the viewer does have still work.
  assert.equal(dataOf<QueueData>(await run(prepress.listPrepressQueueTool, viewerCtx, {})).ok, true);
  // The ink system is readable by anyone who can view Pre-press.
  assert.equal((await run(prepress.getInkSystemTool, viewerCtx, {})).data.ok, true);
});

test('staff find a pack in the queue, open it, enter codes, approve it, run it again and send it back, through the tools', async () => {
  await h.db.delete(schema.pantoneLibrary);
  const { designId, productId, darks, lights, dtg } = await preparedPacks();
  const run1 = await seedRun(h.db, { storeId: h.artist.storeId, designId, lines: [{ colourCode: 'C002', qty: 120, printServiceCode: 'screen_2c' }, { colourCode: 'C001', qty: 40, printServiceCode: 'screen_2c' }] });
  await h.prepress.markPacksNeededForOrder(run1.orderId);
  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId });
  await h.prepress.markPacksNeededForOrder(sale);

  const worker = await staffWith('work', 'Pat Presser');
  const ctx = staffCtx(worker);

  // The queue: the packs the orders need, as a card the staff member can open from.
  const queue = await run(prepress.listPrepressQueueTool, ctx, {});
  assert.equal(dataOf<QueueData>(queue).ok, true);
  const rows = dataOf<QueueData>(queue).packs;
  assert.deepEqual(rows.map((r) => r.packId).sort(), [darks.id, dtg.id, lights.id].sort());
  assert.deepEqual(rows.find((r) => r.packId === darks.id)?.file, 'Screen print · Darks');
  assert.equal(rows.find((r) => r.packId === darks.id)?.screens, '6 of 8');
  const queueCard = (queue.ui?.cards ?? [])[0] as Extract<Card, { kind: 'admin_queue' }>;
  assert.equal(queueCard.kind, 'admin_queue');
  assert.equal(queueCard.sections[0].count, 3);
  assert.ok(queueCard.sections[0].items.every((i) => i.prompt?.startsWith('Open pre-press pack ')));
  assert.deepEqual(dataOf<QueueData>(queue).counts, { waiting: 3, being_fixed: 0, approved: 0, sent_back: 0 });
  const listed = async (input: { tab?: 'waiting' | 'being_fixed' | 'approved' | 'sent_back'; search?: string }) => dataOf<QueueData>(await run(prepress.listPrepressQueueTool, ctx, input)).packs.length;
  assert.equal(await listed({ search: 'no such thing' }), 0);
  assert.equal(await listed({ tab: 'approved' }), 0);
  assert.equal(await listed({ search: 'Darks' }), 1);

  // Opening the pack: the films in press order with what each still needs, checks with the open ones first.
  const open = await run(prepress.getPrepressPackTool, ctx, { packId: darks.id });
  assert.equal(dataOf<PackData>(open).ok, true);
  assert.deepEqual(dataOf<PackData>(open).films.map((f) => [f.film, f.label, f.needsPantone]), [[1, 'Underbase', false], [2, 'Ink 2', true], [3, 'Ink 3', true], [4, 'Ink 4', true], [5, 'Ink 5', true], [6, 'Highlight white', false]]);
  assert.deepEqual(dataOf<PackData>(open).checks.map((c) => c.state), ['review', 'passed', 'passed', 'passed'], 'the check to look at comes first');
  assert.equal(dataOf<PackData>(open).canWork, true);
  assert.deepEqual(chips(open.ui), ['Approve the pack', 'Run it again']);
  assert.match(notices(open.ui)[0], /^Underwriter tee · v1 · Front chest: screen print, 6 films\. 1 check needs a look\.$/);
  assert.deepEqual(dataOf(await run(prepress.getPrepressPackTool, ctx, { packId: randomUUID() })), { ok: false, error: 'No pack found with that id.' });

  // Approving needs a code on every colour ink first; the library remembers them.
  const early = await run(prepress.approvePackTool, ctx, { packId: darks.id });
  assert.match(early.data.error ?? '', /^Enter the Pantone code for films 2, 3, 4, 5 first/);
  for (const [film, code] of [[2, '237 c'], [3, 'pantone 2582 c'], [4, '2726 C'], [5, '2685 c']] as const) {
    const done = await run(prepress.assignPantoneTool, ctx, { packId: darks.id, filmNumber: film, code });
    assert.equal(done.data.ok, true, JSON.stringify(done.data));
    assert.deepEqual(notices(done.ui), [`Saved the code for film ${film}.`]);
  }
  assert.equal((await run(prepress.assignPantoneTool, ctx, { packId: darks.id, filmNumber: 1, code: '186 C' })).data.error, 'The white films have no Pantone code. Only colour inks do.');
  const library = await run(prepress.listPantoneLibraryTool, ctx, {});
  assert.deepEqual(dataOf<LibraryData>(library).codes.map((c) => c.code).sort(), ['PANTONE 237 C', 'PANTONE 2582 C', 'PANTONE 2685 C', 'PANTONE 2726 C']);
  const found = dataOf<LibraryData>(await run(prepress.listPantoneLibraryTool, ctx, { search: '2582' })).codes;
  assert.deepEqual(found.map((c) => [c.code, c.source]), [['PANTONE 2582 C', 'assigned']]);
  assert.match(found[0].hex, /^#[0-9A-F]{6}$/i, 'a swatch for the page');
  const queuedRefresh = (await h.db.select().from(schema.printJobs).where(and(eq(schema.printJobs.kind, 'reupload'), eq(schema.printJobs.status, 'queued')))).filter((j) => (j.input as PrintJobInput).reupload?.packId === darks.id);
  assert.equal(queuedRefresh.length, 1, 'four codes, one refresh of the files');
  for (const job of queuedRefresh) await h.runJob(job.id);

  // The staff member sees the codes the artist never does.
  const withCodes = await run(prepress.getPrepressPackTool, ctx, { packId: darks.id });
  assert.deepEqual(dataOf<PackData>(withCodes).films.map((f) => f.pantone), [null, 'PANTONE 237 C', 'PANTONE 2582 C', 'PANTONE 2726 C', 'PANTONE 2685 C', null]);

  assert.equal(prepress.approvePackTool.summarize?.({ packId: darks.id, packName: 'Underwriter · v1 · Front' }), 'Approve the pre-press pack Underwriter · v1 · Front. Orders that need it can then go to production.');
  assert.equal(prepress.approvePackTool.summarize?.({ packId: darks.id }), 'Approve the pre-press pack. Orders that need it can then go to production.');
  const approved = await run(prepress.approvePackTool, ctx, { packId: darks.id });
  assert.deepEqual(approved.data, { ok: true });
  assert.deepEqual(notices(approved.ui), ['Pack approved. Orders that need it can go to production.']);
  assert.equal((await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, darks.id)))[0].auditStatus, 'approved');

  // Running a pack again: the tool turns its inputs into the service's settings (a colour as a hex with or without '#').
  const again = await run(prepress.rerunPackTool, ctx, { packId: lights.id, screens: 3, lpi: 45, angleDeg: 15, trapMm: 0.1, underbaseChokeMm: 0.2, method: 'spot', inkChanges: [{ filmNumber: 2, hex: '5456ac' }] });
  assert.equal(again.data.ok, true, JSON.stringify(again.data));
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, again.data.jobId as string));
  assert.deepEqual((job.input as PrintJobInput).rerun?.settings, {
    method: 'spot',
    maxScreens: 3,
    lpi: 45,
    angleDeg: 15,
    underbaseChokeMm: 0.2,
    trapMm: 0.1,
    inkSubstitutions: [{ plateIndex: 2, hex: '#5456ac' }],
  });
  assert.equal(job.kind, 'rerun');
  assert.match(notices(again.ui)[0], /^Running the pack again\./);
  assert.equal(prepress.rerunPackTool.input.safeParse({ packId: lights.id, lpi: 5 }).success, false, 'the schema bounds lpi');
  assert.equal(prepress.rerunPackTool.input.safeParse({ packId: lights.id, inkChanges: [{ filmNumber: 2, hex: 'purple' }] }).success, false);
  const refusedRun = await run(prepress.rerunPackTool, ctx, { packId: dtg.id, inkChanges: [{ filmNumber: 2, hex: '#5456AC' }] });
  assert.equal(refusedRun.data.error, 'Inks can only be changed on a screen pack.');

  // Sending a pack back: the note is for the artist, and the artist hears.
  const note = 'The lettering is too thin to print. Could you make it bolder?';
  assert.equal(prepress.sendBackToArtistTool.summarize?.({ packId: dtg.id, note }), `Send the pack back to the artist with this note: "${note}"`);
  assert.match(prepress.sendBackToArtistTool.summarize?.({ packId: dtg.id, note: 'x'.repeat(300) }) ?? '', /^Send the pack back to the artist with this note: "x{137}\.\.\."$/);
  const sent = await run(prepress.sendBackToArtistTool, ctx, { packId: dtg.id, note });
  assert.deepEqual(sent.data, { ok: true });
  assert.equal((await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, dtg.id)))[0].auditStatus, 'sent_back');
  const inbox = await h.db.select().from(schema.notifications).where(and(eq(schema.notifications.userId, h.artist.userId), eq(schema.notifications.event, 'print.sent_back')));
  assert.ok(inbox.some((n) => (n.payload as { designId?: string; message?: string }).designId === designId && /too thin to print/.test((n.payload as { message: string }).message)));
  assert.equal((await run(prepress.sendBackToArtistTool, ctx, { packId: dtg.id, note: '   ' })).data.ok, false);

  // The artist's own tool now says what pre-press asked.
  const artistProof = await run(print.getPrintProofTool, artistCtx(), { designId });
  assert.ok((artistProof.data.warnings as string[]).some((w) => w.startsWith('Our pre-press team asked for a change:')));
  assert.doesNotMatch(JSON.stringify(artistProof), /pantone/i);

  // Every staff action is in the team log under the person's name.
  const logged = h.fakes.activity.filter((a) => a.actorId === worker.userId).map((a) => a.entry.action);
  for (const action of ['pantone.assign', 'pack.approve', 'pack.rerun', 'pack.send_back']) assert.ok(logged.includes(action), action);
});

test('the ink system is read by anyone in Pre-press and changed, a field at a time, by the people who manage it', async () => {
  const viewer = await staffWith('view');
  const manager = await staffWith('manage');
  const read = await run(prepress.getInkSystemTool, staffCtx(viewer), {});
  assert.equal(read.data.ok, true);
  assert.equal(read.data.profile.pressHeads, 8);
  assert.equal(read.data.updatedAt, null, 'the code default, until one is saved');

  // The change goes over the profile there is: fields not mentioned stay, and nested ones merge.
  assert.equal(prepress.updateInkSystemTool.summarize?.({ changes: { pressHeads: 10, cure: { celsius: 170 } } }), 'Change the ink system: pressHeads, cure. It applies to packs prepared from now on.');
  const saved = await run(prepress.updateInkSystemTool, staffCtx(manager), { changes: { pressHeads: 10, cure: { celsius: 170 }, mesh: { solid: 210 }, underbaseFlash: { seconds: 5 }, opacity: { 'HB Opaque': 0.9 }, measured: true, name: 'MagnaPrint, measured' } });
  assert.equal(saved.data.ok, true, JSON.stringify(saved.data));
  assert.deepEqual(notices(saved.ui), ['Ink system saved. Packs prepared from now on use it.']);

  const after = (await run(prepress.getInkSystemTool, staffCtx(viewer), {})).data;
  assert.equal(after.profile.name, 'MagnaPrint, measured');
  assert.equal(after.profile.pressHeads, 10);
  assert.equal(after.profile.measured, true);
  assert.equal(after.profile.cure.celsius, 170);
  assert.equal(after.profile.cure.minutesMin, read.data.profile.cure.minutesMin, 'the rest of the cure is as it was');
  assert.equal(after.profile.mesh.solid, 210);
  assert.equal(after.profile.mesh.halftone, read.data.profile.mesh.halftone);
  assert.equal(after.profile.underbase.flash.seconds, 5);
  assert.equal(after.profile.underbase.flash.celsius, read.data.profile.underbase.flash.celsius);
  assert.equal(after.profile.opacity['HB Opaque'], 0.9);
  assert.equal(after.profile.opacity['HB Neutral'], read.data.profile.opacity['HB Neutral']);
  assert.ok(after.updatedAt);

  // What is wrong with a profile comes back in words.
  const bad = await run(prepress.updateInkSystemTool, staffCtx(manager), { changes: { mesh: { min: 300, max: 100 } } });
  assert.deepEqual(bad.data, { ok: false, error: 'Mesh: the finest count must not be lower than the coarsest.' });
  assert.equal(prepress.updateInkSystemTool.input.safeParse({ changes: { pressHeads: 0 } }).success, false);
  assert.equal(prepress.updateInkSystemTool.input.safeParse({ changes: { colour: 'red' } }).success, false);
  assert.equal((await h.db.select().from(schema.inkSystems).where(eq(schema.inkSystems.isActive, true))).length, 1, 'one active profile, however many changes');
});

// -- shared setup ----------------------------------------------------------------------

async function preparedPacks() {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const packs = await h.packs(designVersionId);
  return {
    designId,
    productId,
    designVersionId,
    darks: packs.find((p) => p.screenSetKey === 'darks')!,
    lights: packs.find((p) => p.screenSetKey === 'lights')!,
    dtg: packs.find((p) => p.technique === 'dtg_dtf')!,
  };
}

