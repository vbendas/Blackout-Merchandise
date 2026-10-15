// Studio fixes on PGlite: edits anchor on the current version and send their
// history, generated references are labelled for what they are, and the 4K
// final path. fal and file storage are stubbed (falTransport, designIo): no
// call leaves the process and nothing costs money.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';

// A call that slips past the stubs must fail, not spend: no key, no vision pass.
process.env.FAL_API_KEY = '';
delete process.env.ANTHROPIC_API_KEY;

let t: TestDb;
let designs: typeof import('@/lib/services/designs');
let fal: typeof import('@/lib/services/fal');
let storeA: string;
let storeB: string;

const files = new Map<string, Buffer>();
const falCalls: { endpoint: string; input: Record<string, unknown> }[] = [];
/** the image urls each coming fal call answers with; an empty queue means an unexpected call */
const falQueue: (string[] | Error)[] = [];

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).png().toBuffer();
}

/** Registers art at a url, so the stubbed download finds it. */
async function art(url: string, width = 400, height = 400): Promise<string> {
  files.set(url, await png(width, height));
  return url;
}

type DesignInsert = typeof schema.designs.$inferInsert;
async function addDesign(values: Omit<DesignInsert, 'storeId'> & { storeId?: string }) {
  const [row] = await t.db.insert(schema.designs).values({ storeId: storeA, ...values }).returning();
  return row;
}

before(async () => {
  t = await setupTestDb();
  designs = await import('@/lib/services/designs');
  fal = await import('@/lib/services/fal');

  fal.falTransport.subscribe = async (endpoint, input) => {
    falCalls.push({ endpoint, input });
    const next = falQueue.shift();
    if (!next) throw new Error('unexpected fal call');
    if (next instanceof Error) throw next;
    return { data: { images: next.map((url) => ({ url })), description: 'stub' } };
  };
  designs.designIo.download = async (url) => {
    const found = files.get(url);
    if (!found) throw new Error(`no stub for ${url}`);
    return found;
  };
  designs.designIo.store = async (input) => {
    const url = `https://stored.test/${input.folder}/${input.filename}`;
    files.set(url, Buffer.from(input.data));
    return { url, key: url, contentType: input.contentType, bytes: input.data.byteLength };
  };

  const a = await seedUser(t.db, { email: 'a@merchfrom.test', withStore: true });
  const b = await seedUser(t.db, { email: 'b@merchfrom.test', withStore: true });
  storeA = a.storeId!;
  storeB = b.storeId!;
});

beforeEach(() => {
  falCalls.length = 0;
  falQueue.length = 0;
});

after(async () => {
  await t.close();
});

type Params = { mode?: string; brief?: string; instruction?: string; anchoredTo?: string; logoDesignId?: string; capsuleId?: string; history?: { kind: string; text: string }[] };
const paramsOf = (row: { generationParams: unknown }) => row.generationParams as Params;

// -- edit anchor ---------------------------------------------------------------

test('an edit changes the current version, not the root of its lineage', async () => {
  const logoUrl = await art('https://art.test/logo.png');
  const composedUrl = await art('https://art.test/composed.png');
  const logo = await addDesign({ source: 'upload', originalUrl: logoUrl });
  // a composed design's parent is the logo: walking up to the root would hand the model the logo
  const composed = await addDesign({
    source: 'generated',
    parentDesignId: logo.id,
    originalUrl: composedUrl,
    generationParams: { mode: 'compose', brief: 'a death-metal tee around the logo', logoDesignId: logo.id, history: [{ kind: 'brief', text: 'a death-metal tee around the logo', at: '2026-10-15T09:00:00Z' }] },
  });

  falQueue.push([await art('https://fal.test/edit-1.png')]);
  const first = await designs.editDesign(composed.id, 'make the skull bigger');

  assert.equal(falCalls.length, 1);
  assert.equal(falCalls[0].endpoint, 'fal-ai/nano-banana-2/edit');
  assert.deepEqual(falCalls[0].input.image_urls, [composedUrl], 'the composed art goes in, not the logo');
  assert.equal(falCalls[0].input.resolution, '1K', 'an edit is a draft');
  const row = (await designs.getDesign(first.designId))!;
  assert.equal(row.parentDesignId, composed.id);
  assert.equal(row.source, 'edited');
  assert.equal(paramsOf(row).anchoredTo, composedUrl);
});

test('the edit history is sent with the new instruction and grows with every edit', async () => {
  const startUrl = await art('https://art.test/start.png');
  const start = await addDesign({
    source: 'generated',
    originalUrl: startUrl,
    generationParams: { mode: 'generate', brief: 'a wolf howling at a blood moon', capsuleId: 'woodcut', history: [{ kind: 'brief', text: 'a wolf howling at a blood moon', at: '2026-10-15T09:00:00Z' }] },
  });

  falQueue.push([await art('https://fal.test/edit-a.png')]);
  const first = await designs.editDesign(start.id, 'add pine trees');
  const firstPrompt = falCalls[0].input.prompt as string;
  assert.match(firstPrompt, /^Change the attached artwork like this: add pine trees\./);
  assert.match(firstPrompt, /Made from the brief: a wolf howling at a blood moon/);

  // the second edit works on the first edit's art and sees both earlier steps
  const firstRow = (await designs.getDesign(first.designId))!;
  falQueue.push([await art('https://fal.test/edit-b.png')]);
  const second = await designs.editDesign(first.designId, 'make the moon red');
  assert.deepEqual(falCalls[1].input.image_urls, [firstRow.originalUrl]);
  const secondPrompt = falCalls[1].input.prompt as string;
  assert.match(secondPrompt, /^Change the attached artwork like this: make the moon red\./);
  assert.match(secondPrompt, /1\. Made from the brief: a wolf howling at a blood moon\n2\. add pine trees/);
  assert.match(secondPrompt, /Keep the artist's existing artwork intact except for what was asked\.$/);

  const secondRow = (await designs.getDesign(second.designId))!;
  assert.deepEqual(
    paramsOf(secondRow).history?.map((h) => [h.kind, h.text]),
    [
      ['brief', 'a wolf howling at a blood moon'],
      ['edit', 'add pine trees'],
      ['edit', 'make the moon red'],
    ],
  );
  assert.equal(paramsOf(secondRow).capsuleId, 'woodcut', 'the capsule the design was styled with travels along, so print prep finds its recipe');
});

test('an edit works on the cleaned print file when there is one', async () => {
  const originalUrl = await art('https://art.test/photo-original.png');
  const cleanedUrl = await art('https://art.test/photo-cleaned.png');
  const design = await addDesign({ source: 'edited', originalUrl, printUrl: cleanedUrl, generationParams: { mode: 'clean', ops: ['remove_bg'] } });

  falQueue.push([await art('https://fal.test/edit-c.png')]);
  await designs.editDesign(design.id, 'tint it blue');
  assert.deepEqual(falCalls[0].input.image_urls, [cleanedUrl]);
});

test('a design made before histories were kept still sends the one instruction it has', async () => {
  const url = await art('https://art.test/legacy.png');
  const legacy = await addDesign({ source: 'edited', originalUrl: url, generationParams: { instruction: 'remove the border', reAnchoredTo: 'https://art.test/root.png' } });

  falQueue.push([await art('https://fal.test/edit-d.png')]);
  await designs.editDesign(legacy.id, 'add a banner');
  assert.deepEqual(falCalls[0].input.image_urls, [url]);
  assert.match(falCalls[0].input.prompt as string, /1\. remove the border/);
});

test('an edit of a design that does not exist fails before any call', async () => {
  await assert.rejects(designs.editDesign('00000000-0000-4000-8000-000000000000', 'anything'), /design_not_found/);
  assert.equal(falCalls.length, 0);
});

// -- generated references --------------------------------------------------------

test('a reference design is labelled as the artist artwork, not as a style reference', async () => {
  const refUrl = await art('https://art.test/ref.png');
  const ref = await addDesign({ source: 'upload', originalUrl: refUrl });

  falQueue.push([await art('https://fal.test/gen-1.png'), await art('https://fal.test/gen-2.png')]);
  const made = await designs.generateDesign({ storeId: storeA, brief: 'a skull and roses', capsuleId: 'american-traditional', referenceDesignIds: [ref.id] });

  assert.equal(made.length, 2);
  assert.equal(falCalls[0].endpoint, 'fal-ai/nano-banana-2/edit', 'references route through /edit');
  assert.deepEqual(falCalls[0].input.image_urls, [refUrl]);
  assert.equal(falCalls[0].input.resolution, '1K');
  assert.equal(falCalls[0].input.num_images, 2);
  const prompt = falCalls[0].input.prompt as string;
  assert.match(prompt, /exactly four flat ink colours/, 'the capsule colour clause is in');
  assert.match(prompt, /Image 1 is the artist's own artwork: use it as a visual reference for what the brief asks for\./);
  assert.doesNotMatch(prompt, /style reference|style only/, 'nothing here is a style anchor');
  assert.ok(prompt.endsWith('a skull and roses'));

  const row = (await designs.getDesign(made[0].designId))!;
  assert.equal(row.parentDesignId, ref.id, 'lineage: the first reference');
  assert.equal(paramsOf(row).mode, 'generate');
  assert.deepEqual(paramsOf(row).history?.map((h) => [h.kind, h.text]), [['brief', 'a skull and roses']]);
});

test('without references there is no reference text at all', async () => {
  falQueue.push([await art('https://fal.test/gen-3.png'), await art('https://fal.test/gen-4.png')]);
  await designs.generateDesign({ storeId: storeA, brief: 'a snake around a dagger', capsuleId: 'line-tattoo' });

  assert.equal(falCalls[0].endpoint, 'fal-ai/nano-banana-2');
  assert.ok(!('image_urls' in falCalls[0].input));
  const prompt = falCalls[0].input.prompt as string;
  assert.doesNotMatch(prompt, /image|reference/i, 'the old "use the reference image for style only" went out with the reference');
  assert.match(prompt, /one solid ink colour \(black\)/);
});

test('composing around a logo names the logo as image 1 and keeps its lineage', async () => {
  const logoUrl = await art('https://art.test/band-logo.png');
  const logo = await addDesign({ source: 'upload', originalUrl: logoUrl });

  falQueue.push([await art('https://fal.test/compose-1.png')]);
  const composed = await designs.composeDesign({ logoDesignId: logo.id, brief: 'a tour shirt', capsuleId: 'blackletter' });

  assert.deepEqual(falCalls[0].input.image_urls, [logoUrl]);
  assert.match(falCalls[0].input.prompt as string, /Image 1 is the artist's logo: incorporate it exactly as provided/);
  const row = (await designs.getDesign(composed.designId))!;
  assert.equal(row.parentDesignId, logo.id);
  assert.equal(paramsOf(row).mode, 'compose');
  assert.equal(paramsOf(row).logoDesignId, logo.id);
  assert.deepEqual(paramsOf(row).history?.map((h) => h.kind), ['brief']);
});

// -- drafts ------------------------------------------------------------------------

test('a 1K draft is not blocked for its resolution, an upload of the same size still is', async () => {
  const start = await addDesign({ source: 'generated', originalUrl: await art('https://art.test/draft-src.png'), generationParams: { mode: 'generate', brief: 'x' } });
  falQueue.push([await art('https://fal.test/edit-e.png')]);
  const draft = await designs.editDesign(start.id, 'tidy the linework');
  assert.notEqual(draft.readiness, 'blocked');
  assert.match(draft.readinessNotes[0], /Draft preview \(36 dpi at a 28cm print width\)\. The full-size print render is made when you prepare it for print\./);

  const upload = await designs.createDesignFromUpload({ storeId: storeA, data: await png(400, 400), contentType: 'image/png', filename: 'tiny.png' });
  assert.equal(upload.readiness, 'blocked');
  assert.match(upload.readinessNotes[0], /too low to print cleanly/);
});

// -- 4K final ----------------------------------------------------------------------------

type Final = Awaited<ReturnType<typeof import('@/lib/services/designs').finaliseDesignForPrint>>;
function won(result: Final) {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.value;
}
type FinalParams = Params & { finalRender?: { from: string; at: string } };

test('the final render goes out at 4K from the chosen draft and becomes the design print file', async () => {
  const draftUrl = await art('https://art.test/final-draft.png');
  const design = await addDesign({ source: 'generated', originalUrl: draftUrl, widthPx: 400, heightPx: 400, readiness: 'blocked', generationParams: { mode: 'generate', brief: 'a stag', capsuleId: 'woodcut' } });
  const before = (await designs.getDesign(design.id))!;

  falQueue.push([await art('https://fal.test/final-4k.png', 3200, 3200)]);
  const art4k = won(await designs.finaliseDesignForPrint(storeA, design.id));

  assert.equal(falCalls.length, 1);
  assert.equal(falCalls[0].endpoint, 'fal-ai/nano-banana-2/edit');
  assert.equal(falCalls[0].input.resolution, '4K');
  assert.deepEqual(falCalls[0].input.image_urls, [draftUrl], 'the draft the artist chose is the input');
  assert.equal(falCalls[0].input.prompt, fal.FINAL_RENDER_PROMPT);

  assert.equal(art4k.rendered, true);
  assert.equal(art4k.source, 'final_4k');
  assert.deepEqual([art4k.widthPx, art4k.heightPx], [3200, 3200]);
  assert.ok(art4k.artUrl.startsWith('https://stored.test/designs/'), 'the final is kept in our storage, not left on fal');
  assert.ok(Buffer.isBuffer(art4k.bytes) && art4k.bytes.length > 0, 'a fresh render hands over its bytes');

  const row = (await designs.getDesign(design.id))!;
  assert.equal(row.printUrl, art4k.artUrl, 'mockups and print prep read printUrl first');
  assert.equal(row.originalUrl, draftUrl, 'the draft stays');
  assert.deepEqual([row.widthPx, row.heightPx], [3200, 3200]);
  assert.ok(row.dpiAtPrint && row.dpiAtPrint > 250);
  assert.equal(row.readiness, 'ready', 'a 4K final is no longer blocked for its resolution');
  assert.notEqual(row.previewUrl, before.previewUrl);
  const params = row.generationParams as FinalParams;
  assert.equal(params.finalRender?.from, draftUrl);
  assert.equal(params.capsuleId, 'woodcut', 'what the design already carried is kept');
  assert.equal(params.brief, 'a stag');

  // print prep pins the version itself: nothing here wrote one
  assert.equal((await t.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, design.id))).length, 0);
});

test('finalising again returns the final without another render', async () => {
  const design = await addDesign({ source: 'generated', originalUrl: await art('https://art.test/again.png'), widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'a stag' } });
  falQueue.push([await art('https://fal.test/again-4k.png', 3200, 3200)]);
  const first = won(await designs.finaliseDesignForPrint(storeA, design.id));
  const second = won(await designs.finaliseDesignForPrint(storeA, design.id));

  assert.equal(falCalls.length, 1, 'a design never gets a second final');
  assert.equal(second.artUrl, first.artUrl);
  assert.equal(second.rendered, false);
  assert.equal(second.source, 'final_4k', 'still the final, so print prep pins it as one');
  assert.deepEqual([second.widthPx, second.heightPx], [3200, 3200]);
});

test('two calls at once pay for one render', async () => {
  const design = await addDesign({ source: 'generated', originalUrl: await art('https://art.test/race.png'), widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'a stag' } });
  falQueue.push([await art('https://fal.test/race-4k.png', 3200, 3200)]);
  const [a, b] = await Promise.all([designs.finaliseDesignForPrint(storeA, design.id), designs.finaliseDesignForPrint(storeA, design.id)]);

  assert.equal(falCalls.length, 1);
  assert.equal(won(a).artUrl, won(b).artUrl);
});

test('an upload prints as uploaded: never sent to fal, nothing written', async () => {
  const uploadUrl = await art('https://art.test/own-art.png', 1500, 1200);
  const upload = await addDesign({ source: 'upload', originalUrl: uploadUrl, widthPx: 1500, heightPx: 1200 });

  const result = won(await designs.finaliseDesignForPrint(storeA, upload.id));
  assert.equal(falCalls.length, 0);
  assert.deepEqual(
    { ...result },
    { designId: upload.id, artUrl: uploadUrl, widthPx: 1500, heightPx: 1200, source: 'upload', rendered: false },
  );
  const row = (await designs.getDesign(upload.id))!;
  assert.equal(row.printUrl, null);
  assert.equal(row.generationParams, null, 'the design is left exactly as it was');
});

test('a cleaned upload is the artist art too: kept as it is, at its print file', async () => {
  const cleaned = await addDesign({
    source: 'edited',
    originalUrl: await art('https://art.test/photo.png', 800, 800),
    printUrl: await art('https://art.test/photo-nobg.png', 800, 800),
    widthPx: 800,
    heightPx: 800,
    generationParams: { mode: 'clean', ops: ['remove_bg'] },
  });
  const result = won(await designs.finaliseDesignForPrint(storeA, cleaned.id));
  assert.equal(falCalls.length, 0);
  assert.equal(result.artUrl, 'https://art.test/photo-nobg.png');
  assert.equal(result.source, 'edited');
});

test('art that is already large is kept as it is, even when a model made it', async () => {
  const big = await addDesign({ source: 'generated', originalUrl: await art('https://art.test/already-4k.png', 3300, 3300), widthPx: 3300, heightPx: 3300, generationParams: { mode: 'generate', brief: 'x' } });
  const result = won(await designs.finaliseDesignForPrint(storeA, big.id));
  assert.equal(falCalls.length, 0);
  assert.equal(result.rendered, false);
  assert.equal(result.source, 'generated');
});

test("a shop cannot finalise another shop's design", async () => {
  const theirs = await addDesign({ storeId: storeB, source: 'generated', originalUrl: await art('https://art.test/theirs.png'), widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'x' } });
  const result = await designs.finaliseDesignForPrint(storeA, theirs.id);
  assert.deepEqual(result, { ok: false, error: 'Design not found for this shop.' });
  assert.equal(falCalls.length, 0);
  assert.equal((await designs.getDesign(theirs.id))!.printUrl, null);
});

test('a design with no art, or none we can size, is refused before any call', async () => {
  const empty = await addDesign({ source: 'generated', generationParams: { mode: 'generate', brief: 'x' } });
  assert.deepEqual(await designs.finaliseDesignForPrint(storeA, empty.id), { ok: false, error: 'This design has no artwork yet.' });
  const unsized = await addDesign({ source: 'upload', originalUrl: 'https://art.test/unsized.png' });
  assert.deepEqual(await designs.finaliseDesignForPrint(storeA, unsized.id), { ok: false, error: 'The artwork has no readable size.' });
  assert.equal(falCalls.length, 0);
});

test('a render that comes back too small is refused, leaves the design alone, and a retry can succeed', async () => {
  const draftUrl = await art('https://art.test/retry.png');
  const design = await addDesign({ source: 'generated', originalUrl: draftUrl, widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'x' } });

  falQueue.push([await art('https://fal.test/retry-small.png', 2000, 2000)]);
  const refused = await designs.finaliseDesignForPrint(storeA, design.id);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.error, /came back at 2000 × 2000 px, too small to print from/);
  let row = (await designs.getDesign(design.id))!;
  assert.equal(row.printUrl, null);
  assert.equal((row.generationParams as FinalParams).finalRender, undefined);

  falQueue.push([await art('https://fal.test/retry-4k.png', 3200, 3200)]);
  const retried = won(await designs.finaliseDesignForPrint(storeA, design.id));
  assert.equal(retried.rendered, true);
  row = (await designs.getDesign(design.id))!;
  assert.equal(row.printUrl, retried.artUrl);
});

test('a fal failure comes back as a message and changes nothing on the design', async () => {
  const design = await addDesign({ source: 'generated', originalUrl: await art('https://art.test/fails.png'), widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'x' } });
  falQueue.push(new Error('queue is full'));
  const result = await designs.finaliseDesignForPrint(storeA, design.id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /did not finish: .*queue is full/);
  assert.equal((await designs.getDesign(design.id))!.printUrl, null);
});

test('an edited design is finalised on its own, from its own draft', async () => {
  const startUrl = await art('https://art.test/edit-then-final.png');
  const start = await addDesign({ source: 'generated', originalUrl: startUrl, widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'a stag' } });
  falQueue.push([await art('https://fal.test/start-4k.png', 3200, 3200)]);
  const startFinal = won(await designs.finaliseDesignForPrint(storeA, start.id));

  // editing the finalised design works on its 4K art (the current version) and makes a new 1K draft
  falQueue.push([await art('https://fal.test/edit-after-final.png')]);
  const edited = await designs.editDesign(start.id, 'add antlers');
  assert.deepEqual(falCalls[1].input.image_urls, [startFinal.artUrl]);
  assert.equal(falCalls[1].input.resolution, '1K');

  // the new design has no final yet; the old one keeps its own
  falQueue.push([await art('https://fal.test/edited-4k.png', 3300, 3300)]);
  const editedFinal = won(await designs.finaliseDesignForPrint(storeA, edited.designId));
  assert.equal(falCalls.length, 3);
  assert.equal(editedFinal.rendered, true);
  assert.notEqual(editedFinal.artUrl, startFinal.artUrl);
  assert.equal(won(await designs.finaliseDesignForPrint(storeA, start.id)).artUrl, startFinal.artUrl);
});

test("a cleaned model draft is still a draft: its final is the draft's 4K render, cleaned again", async () => {
  const draftUrl = await art('https://art.test/clean-me.png');
  const draft = await addDesign({ source: 'generated', originalUrl: draftUrl, widthPx: 400, heightPx: 400, generationParams: { mode: 'generate', brief: 'a stag' } });

  // fal's background remover answers with one image, not a list.
  const subscribe = fal.falTransport.subscribe;
  fal.falTransport.subscribe = async (endpoint, input) => {
    if (endpoint !== fal.FAL_ENDPOINTS.REMOVE_BACKGROUND) return subscribe(endpoint, input);
    falCalls.push({ endpoint, input });
    const next = falQueue.shift();
    if (!next || next instanceof Error) throw next ?? new Error('unexpected fal call');
    return { data: { image: { url: next[0], content_type: 'image/png' } } } as never;
  };
  try {
    falQueue.push([await art('https://fal.test/clean-me-nobg.png')]);
    const cleaned = await designs.cleanDesign(draft.id, ['remove_bg']);
    assert.equal(falCalls.length, 1);
    const row = (await designs.getDesign(cleaned.designId))!;
    assert.deepEqual((row.generationParams as { draftOf?: unknown }).draftOf, { designId: draft.id, ops: ['remove_bg'] });

    // The final: the draft at 4K (the draft keeps it), then the background removed again from that.
    falQueue.push([await art('https://fal.test/clean-me-4k.png', 3200, 3200)]);
    falQueue.push([await art('https://fal.test/clean-me-4k-nobg.png', 3200, 3200)]);
    const final = won(await designs.finaliseDesignForPrint(storeA, cleaned.designId));
    assert.deepEqual(falCalls.slice(1).map((c) => c.endpoint), ['fal-ai/nano-banana-2/edit', fal.FAL_ENDPOINTS.REMOVE_BACKGROUND]);
    assert.deepEqual(falCalls[1].input.image_urls, [draftUrl], 'rendered from the draft the artist chose');
    assert.equal(falCalls[2].input.image_url, won(await designs.finaliseDesignForPrint(storeA, draft.id)).artUrl, 'cleaned from the 4K render');
    assert.equal(final.rendered, true);
    assert.equal(final.source, 'final_4k');
    assert.deepEqual([final.widthPx, final.heightPx], [3200, 3200]);
    const after = (await designs.getDesign(cleaned.designId))!;
    assert.equal(after.printUrl, final.artUrl);
    assert.equal(won(await designs.finaliseDesignForPrint(storeA, cleaned.designId)).rendered, false, 'made once');
    assert.equal(falCalls.length, 3);
  } finally {
    fal.falTransport.subscribe = subscribe;
  }
});
