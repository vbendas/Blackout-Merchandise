/**
 * Print-prep samples: the whole pipeline on one fixture, end to end, for opening the files in Photoshop
 * and Brother GTX Graphics Lab. A design is uploaded, prepared for screen print and DTG/DTF on black,
 * French Navy and white T-shirts (front chest, 28 cm), approved by the artist, given Pantone codes,
 * approved by pre-press, and every file of every pack is copied out and re-opened with the independent
 * decoders (@webtoon/psd, pngjs, pdf-lib). The design's job sheet (one per design, covering every garment
 * that uses it) is made last, from a shop product on sale, a shop order and a screen-printed run, and
 * written as job-sheet.pdf beside the pack folders.
 *
 * Everything runs here: an in-process Postgres (PGlite) with the migrations applied, local print storage
 * in a temporary folder, the real engine, pack writers and checks, and the real packshots from public/.
 * Nothing touches Neon, R2, fal or any other service.
 *
 * Run from platform/, one fixture per process (a full front at 600 ppi takes a few GB):
 *   npx tsx scripts/print-samples.ts flat-logo-3c ../print-prep-samples
 *   npx tsx scripts/print-samples.ts tints-2c ../print-prep-samples
 *   npx tsx scripts/print-samples.ts test_design ../print-prep-samples
 *
 * The Pantone codes entered are placeholders typed for the sample, not matches for the colours: in the
 * shop, pre-press picks each one in MagnaMix.
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SAMPLE_CODES = ['PANTONE 186 C', 'PANTONE 2685 C', 'PANTONE 7406 C', 'PANTONE 3435 C', 'PANTONE 7621 C', 'PANTONE 300 C', 'PANTONE 1505 C', 'PANTONE 7739 C'];
const GARMENTS = [
  { code: 'C002', front: '/packshots/PFM0_STTU169_C002.png', back: '/packshots/PBM0_STTU169_C002.png' },
  { code: 'C727', front: '/packshots/PFM0_STTU169_C727.webp', back: '/packshots/PBM0_STTU169_C727.webp' },
  { code: 'C001', front: '/packshots/PFM0_STTU169_C001.webp', back: '/packshots/PBM0_STTU169_C001.webp' },
];

interface FileReport {
  file: string;
  bytes: number;
  opened: string;
  ok: boolean;
}

async function main(): Promise<void> {
  const [fixture, outArg] = process.argv.slice(2);
  if (!fixture) throw new Error('Name a fixture: flat-logo-3c, tints-2c or test_design.');
  const fixturePath = path.resolve('scripts/fixtures/print', `${fixture}.png`);
  const out = path.resolve(outArg ?? '../print-prep-samples', fixture);

  // Local storage in a folder of its own, and no Neon: set before anything imports lib/db.
  const storageDir = await mkdtemp(path.join(tmpdir(), 'mf-print-samples-'));
  process.env.PRINT_STORAGE_DRIVER = 'local';
  process.env.PRINT_STORAGE_DIR = storageDir;
  process.env.DATABASE_URL = '';
  delete process.env.PRINT_MOCK;
  delete process.env.PACKSHOT_BASE_URL;

  const { setupTestDb, seedUser } = await import('./test/pglite');
  const t = await setupTestDb();
  try {
    const schema = await import('@db/schema');
    const sharp = (await import('sharp')).default;
    const { COLOUR_SWATCHES, BASE_COLOUR, BASE_SWATCH, isLightColour } = await import('@/lib/catalog/variants');
    const { COLOUR_NAMES } = await import('@/lib/catalog/colour-names');
    const { seedInkSystem } = await import('./seed-print');
    const pipeline = await import('@/lib/print/pipeline');
    const jobs = await import('@/lib/print/jobs');
    const printPrep = await import('@/lib/services/print-prep');
    const prepress = await import('@/lib/services/prepress');
    const pantone = await import('@/lib/services/pantone-library');
    const storage = await import('@/lib/services/print-storage');

    // The catalogue this drop needs: the T-shirt in black, French Navy and white, with its packshots.
    await t.db.insert(schema.printServices).values([
      { code: 'dtg', name: 'Direct-to-garment print' },
      { code: 'screen_3c', name: 'Screen print (3 colours)', availableInShop: false },
    ]);
    await t.db.insert(schema.colours).values(
      GARMENTS.map((g, i) => ({
        code: g.code,
        name: (COLOUR_NAMES as Record<string, string>)[g.code] ?? g.code,
        hex: g.code === BASE_COLOUR ? BASE_SWATCH : COLOUR_SWATCHES[g.code],
        isLight: isLightColour(g.code),
        displayOrder: i,
      })),
    );
    await t.db.insert(schema.blanks).values({ code: 'STTU169', name: 'Creator 2.0', type: 'T-shirts' });
    await t.db.insert(schema.blankColours).values(GARMENTS.map((g) => ({ blankCode: 'STTU169', colourCode: g.code, frontImageUrl: g.front, backImageUrl: g.back })));
    await seedInkSystem(t.db);

    const artist = await seedUser(t.db, { email: 'sample-artist@merchfrom.test', withStore: true });
    const owner = await seedUser(t.db, { email: 'sample-owner@merchfrom.test', role: 'admin' });
    await t.db.update(schema.users).set({ displayName: 'Sample Owner' }).where((await import('drizzle-orm')).eq(schema.users.id, owner.userId));
    const art = await readFile(fixturePath);
    const meta = await sharp(art).metadata();
    const [design] = await t.db
      .insert(schema.designs)
      .values({ storeId: artist.storeId!, source: 'upload', originalUrl: `file://${fixturePath}`, printUrl: `file://${fixturePath}`, widthPx: meta.width, heightPx: meta.height })
      .returning();
    const [product] = await t.db
      .insert(schema.products)
      .values({ storeId: artist.storeId!, designId: design.id, blankCode: 'STTU169', printServiceCode: 'dtg', name: fixture.replace(/[-_]/g, ' '), placement: { position: 'front_chest', widthCm: 28 } })
      .returning();

    // The artwork is read from the fixture file; everything else is the real thing.
    pipeline.overridePrintDeps({ loadArt: async (v) => (v.artKey ? storage.getObject(v.artKey) : readFile(fixturePath)) });

    const runQueue = async (): Promise<number> => {
      let ran = 0;
      for (;;) {
        const job = await jobs.claimNextPrintJob('samples');
        if (!job) return ran;
        const started = Date.now();
        try {
          const result = await pipeline.handlePrintJob(job);
          await jobs.completePrintJob(job.id, result, 'samples');
          console.log(`job ${job.kind} done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
        } catch (err) {
          await jobs.failPrintJob(job.id, err instanceof Error ? err.message : String(err), 'samples');
          throw err;
        }
        ran++;
      }
    };

    const queued = await printPrep.preparePrint({
      storeId: artist.storeId!,
      userId: artist.userId,
      designId: design.id,
      blankCode: 'STTU169',
      garmentCodes: GARMENTS.map((g) => g.code),
      placements: [{ position: 'front_chest', widthMm: 280 }],
    });
    if (!queued.ok) throw new Error(queued.error);
    await runQueue();

    const view = await printPrep.getApprovalView({ storeId: artist.storeId!, designId: design.id });
    if (!view) throw new Error('No approval view.');
    const approved = view.canApprove ? await printPrep.approveDesign({ storeId: artist.storeId!, userId: artist.userId, designId: design.id, versionId: view.versionId }) : null;

    // Pre-press: a code for every colour ink, the files rewritten with them, then the packs approved.
    const ownerActor = { userId: owner.userId, role: 'admin' as const };
    let next = 0;
    for (const pack of await pipeline.loadCurrentPacks(view.versionId)) {
      for (const ink of (pipeline.storedManifest(pack)?.inks ?? []).filter((i) => i.role === 'ink')) {
        const done = await pantone.assignPantone(ownerActor, { packId: pack.id, plateIndex: ink.index, code: SAMPLE_CODES[next++ % SAMPLE_CODES.length] });
        if (!done.ok) throw new Error(done.error);
      }
    }
    await runQueue();
    const audits: Record<string, string> = {};
    for (const pack of await pipeline.loadCurrentPacks(view.versionId)) {
      const done = await prepress.approvePack(ownerActor, pack.id);
      audits[pack.id] = done.ok ? 'approved' : done.error;
    }

    // What the design's sheet covers besides its files: the product on sale in all three colours, a shop
    // order waiting, and a paid run (black and navy by screen print, white by DTG/DTF) in several sizes.
    const { eq } = await import('drizzle-orm');
    await t.db.update(schema.products).set({ status: 'live' }).where(eq(schema.products.id, product.id));
    await t.db.insert(schema.productColours).values(GARMENTS.map((g) => ({ productId: product.id, colourCode: g.code })));
    const order = async (type: 'pod' | 'bulk', items: { productId: string; colourCode: string; size: string; qty: number }[]) => {
      const [row] = await t.db.insert(schema.orders).values({ storeId: artist.storeId!, orderType: type, status: 'paid', totalAmount: 25000, productionStatus: 'queued', fanEmail: 'fan@merchfrom.test' }).returning();
      await t.db.insert(schema.orderItems).values(items.map((i) => ({ orderId: row.id, productId: i.productId, quantity: i.qty, priceAtPurchase: 2500, colourCode: i.colourCode, size: i.size })));
      return row.id;
    };
    await order('pod', [
      { productId: product.id, colourCode: 'C002', size: 'M', qty: 2 },
      { productId: product.id, colourCode: 'C002', size: 'L', qty: 1 },
      { productId: product.id, colourCode: 'C001', size: 'S', qty: 1 },
    ]);
    const runLines = [
      { colourCode: 'C002', service: 'screen_3c', sizes: { S: 10, M: 30, L: 20 } },
      { colourCode: 'C727', service: 'screen_3c', sizes: { M: 20, L: 10 } },
      { colourCode: 'C001', service: 'dtg', sizes: { M: 15, XL: 5 } },
    ];
    const runItems: { productId: string; colourCode: string; size: string; qty: number }[] = [];
    const quoteLines = [];
    for (const line of runLines) {
      const [backing] = await t.db
        .insert(schema.products)
        .values({ storeId: artist.storeId!, designId: design.id, blankCode: 'STTU169', printServiceCode: line.service, name: `Bulk run ${line.colourCode}`, placement: { position: 'front_chest', widthCm: 28 } })
        .returning();
      for (const [size, qty] of Object.entries(line.sizes)) runItems.push({ productId: backing.id, colourCode: line.colourCode, size, qty });
      quoteLines.push({ productId: backing.id, designId: design.id, blankCode: 'STTU169', printServiceCode: line.service, placement: { position: 'front_chest', widthCm: 28 }, colourCode: line.colourCode, qty: Object.values(line.sizes).reduce((a, b) => a + b, 0) });
    }
    const runOrderId = await order('bulk', runItems);
    await t.db.insert(schema.bulkOrders).values({ storeId: artist.storeId!, status: 'in_production', orderId: runOrderId, quote: { lines: quoteLines, totalCents: 90000, currency: 'EUR' } });
    const jobSheets = await import('@/lib/services/job-sheets');
    const sheet = await jobSheets.getDesignJobSheet(ownerActor, design.id);
    if (!sheet) throw new Error('The design has no job sheet.');

    // Every file of every pack, copied out and opened again with a decoder the writer didn't use.
    await rm(out, { recursive: true, force: true });
    const { PDFDocument } = await import('pdf-lib');
    const { parsePsdIndependently, decodePngIndependently } = await import('@/lib/print/pack/independent');
    const packs = [];
    for (const pack of await pipeline.loadCurrentPacks(view.versionId)) {
      const dir = path.join(out, pack.technique === 'screen' ? `screen-${pack.screenSetKey}` : 'dtg-dtf');
      await mkdir(dir, { recursive: true });
      const reports: FileReport[] = [];
      const files = [...pipeline.packFiles(pack)];
      const zip = pipeline.packInfo(pack)?.pngZip;
      if (zip) files.push({ kind: 'dtg_zip', name: zip.name, key: zip.key, visibility: 'private', contentType: 'application/zip', sha256: zip.sha256, bytes: zip.bytes });
      for (const file of files) {
        const bytes = await storage.getObject(file.key);
        const name = file.kind === 'proof' || file.kind === 'loupe' || file.kind === 'film_preview' ? path.join(file.kind === 'film_preview' ? 'films' : 'proofs', file.name) : file.name;
        await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
        await writeFile(path.join(dir, name), bytes);
        reports.push(await openAgain(file.kind, name, bytes, { parsePsdIndependently, decodePngIndependently, PDFDocument }));
      }
      packs.push({
        technique: pack.technique,
        screenSet: pack.screenSetKey,
        garments: pack.garmentCodes,
        screens: pack.screenCount,
        audit: audits[pack.id],
        checks: pipeline.packChecks(pack).map((c) => ({ id: c.id, state: c.state, detail: c.detail })),
        files: reports,
      });
    }
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, 'job-sheet.pdf'), sheet.bytes);
    const sheetReport = await openAgain('job_sheet', 'job-sheet.pdf', sheet.bytes, { parsePsdIndependently, decodePngIndependently, PDFDocument });
    const summary = {
      fixture,
      jobSheet: { name: sheet.filename, hash: sheet.contentHash, ...sheetReport },
      art: { widthPx: meta.width, heightPx: meta.height },
      placement: 'front chest, 28 cm wide',
      garments: GARMENTS.map((g) => g.code),
      approvedByArtist: approved?.ok === true,
      approvalView: { status: view.status, warnings: view.warnings, screenSets: view.screenSets.map((s) => ({ name: s.name, headline: s.headline, inks: s.inks.map((i) => i.name) })) },
      sampleCodesNote: 'The Pantone codes in these files are placeholders typed for the sample, not matches for the colours.',
      packs,
    };
    await writeFile(path.join(out, 'index.json'), JSON.stringify(summary, null, 2));
    const failedOpen = [...packs.flatMap((p) => p.files.filter((f) => !f.ok)), ...(sheetReport.ok ? [] : [sheetReport])];
    console.log(JSON.stringify({ fixture, packs: packs.map((p) => ({ technique: p.technique, set: p.screenSet, audit: p.audit, checks: Object.fromEntries(p.checks.map((c) => [c.id, c.state])) })), failedOpen }, null, 2));
    if (failedOpen.length > 0) process.exitCode = 1;
  } finally {
    await t.close();
    await rm(storageDir, { recursive: true, force: true });
  }
}

async function openAgain(
  kind: string,
  name: string,
  bytes: Buffer,
  libs: {
    parsePsdIndependently: (b: Buffer) => Promise<{ width: number; height: number; layers: { name: string; isHidden: boolean }[]; resolutionInfo?: { horizontal: number; horizontalUnit: number } }>;
    decodePngIndependently: (b: Buffer) => { width: number; height: number; data: Buffer; colorType: number; bitDepth: number };
    PDFDocument: { load: (b: Uint8Array) => Promise<{ getPageCount: () => number }> };
  },
): Promise<FileReport> {
  try {
    if (kind === 'screen_psd' || kind === 'dtg_psd') {
      const psd = await libs.parsePsdIndependently(bytes);
      const res = psd.resolutionInfo;
      const ppi = res ? (res.horizontalUnit === 2 ? res.horizontal * 2.54 : res.horizontal) : null;
      const layers = psd.layers.map((l) => `${l.isHidden ? '(hidden) ' : ''}${l.name}`);
      return { file: name, bytes: bytes.length, opened: `@webtoon/psd: ${psd.width} x ${psd.height} px, ${ppi === null ? 'no' : Math.round(ppi)} ppi, layers: ${layers.join(' | ')}`, ok: psd.width > 0 && layers.length > 0 };
    }
    if (name.endsWith('.png')) {
      const png = libs.decodePngIndependently(bytes);
      const chunks = pngChunks(bytes);
      const phys = chunks.get('pHYs');
      const ppi = phys && phys[8] === 1 ? Math.round(phys.readUInt32BE(0) * 0.0254) : null;
      let partial = 0;
      if (png.colorType === 6) for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 0 && png.data[i] !== 255) partial++;
      const colour = chunks.has('iCCP') ? 'sRGB profile embedded' : chunks.has('sRGB') ? 'sRGB chunk' : 'no colour profile';
      const ok = kind !== 'dtg_png' || (partial === 0 && ppi === 300 && chunks.has('iCCP'));
      return { file: name, bytes: bytes.length, opened: `pngjs: ${png.width} x ${png.height} px, ${ppi ?? 'no'} ppi, ${colour}${png.colorType === 6 ? `, alpha strictly 0 or 255: ${partial === 0 ? 'yes' : `no (${partial} px)`}` : ''}`, ok };
    }
    if (name.endsWith('.pdf')) {
      const pdf = await libs.PDFDocument.load(new Uint8Array(bytes));
      return { file: name, bytes: bytes.length, opened: `pdf-lib: ${pdf.getPageCount()} page(s)`, ok: pdf.getPageCount() > 0 };
    }
    if (name.endsWith('.json')) {
      const parsed = JSON.parse(bytes.toString('utf8')) as { files?: unknown[] };
      return { file: name, bytes: bytes.length, opened: `JSON: ${Array.isArray(parsed.files) ? parsed.files.length : 0} files listed`, ok: true };
    }
    if (name.endsWith('.zip')) {
      const entries = bytes.readUInt16LE(bytes.length - 22 + 10);
      return { file: name, bytes: bytes.length, opened: `zip: ${entries} entries`, ok: bytes.readUInt32LE(bytes.length - 22) === 0x06054b50 };
    }
    if (name.endsWith('.webp')) {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(bytes).metadata();
      return { file: name, bytes: bytes.length, opened: `sharp: ${meta.width} x ${meta.height} px webp`, ok: (meta.width ?? 0) > 0 };
    }
    return { file: name, bytes: bytes.length, opened: 'not opened', ok: true };
  } catch (err) {
    return { file: name, bytes: bytes.length, opened: `could not open: ${err instanceof Error ? err.message : String(err)}`, ok: false };
  }
}

/** A PNG's chunks by type (the first of each), without their CRCs. */
function pngChunks(bytes: Buffer): Map<string, Buffer> {
  const chunks = new Map<string, Buffer>();
  let o = 8;
  while (o + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(o);
    const type = bytes.toString('latin1', o + 4, o + 8);
    if (!chunks.has(type)) chunks.set(type, bytes.subarray(o + 8, o + 8 + length));
    o += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
