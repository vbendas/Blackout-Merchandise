// The job sheet as data (lib/print/job-sheet-view.ts): the words of every section, that it is plain JSON,
// and, the point of it, that the PDF drawn from the same input says exactly what the view says (and
// nothing it lacks), so the iPads at the stations and the paper sheet never disagree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { COLLAR_DISTANCE_UNSET_NOTE } from '@/lib/mockups/placements';
import { MOCK_JOB_SHEET } from '@/lib/print/mock-views';
import { renderJobSheet } from '@/lib/print/pack';
import type { CheckResult, JobSheetInput, PackManifestInk } from '@/lib/print/types';
import { buildJobSheetView, EMPTY_AUDITS, EMPTY_GARMENTS, EMPTY_PIECES, NOTHING_PRINTS, type JobSheetViewInput } from './job-sheet-view';
import { compareWithPdf, viewTexts } from './job-sheet-view.test-support';

const GENERATED = '2026-10-15T14:32:10.000Z';

async function proofImage(hex: string): Promise<Buffer> {
  return sharp({ create: { width: 300, height: 360, channels: 3, background: hex } }).webp().toBuffer();
}

const checks: CheckResult[] = [
  { id: 'size', title: 'Size', state: 'passed', detail: '7,796 × 9,119 px at 600 ppi: a 28 × 33.6 cm print plus a 25 mm margin.' },
  { id: 'plates', title: 'Plates', state: 'passed', detail: 'Every film is one ink.' },
  { id: 'features', title: 'Fine lines', state: 'review', detail: 'Film 3 has lines under 0.3 mm in 2 places; they may close up or drop out.' },
  { id: 'dtg_alpha', title: 'Transparency', state: 'failed', detail: '12 pixels on Black are within ΔE 10 of the garment colour.' },
];

/** The sample sheet (both methods, a signed file) with the proofs given images, as the PDF is drawn from it. */
async function fullInput(): Promise<JobSheetInput> {
  const sizes = ['S', 'M', 'L', 'XL'];
  return {
    ...MOCK_JOB_SHEET,
    generatedAt: GENERATED,
    garments: [...MOCK_JOB_SHEET.garments, { ...MOCK_JOB_SHEET.garments[0], blankCode: 'STSU177', blankName: 'Heavy hoodie', file: null, note: 'No print file yet', usedBy: ['Shop · Hoodie', 'Run 3'] }],
    // the note a sheet carries when a row can only say "Standard position" (a garment with no collar rule)
    placementNotes: [COLLAR_DISTANCE_UNSET_NOTE],
    checks: [
      { label: 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm', checks },
      { label: 'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm', checks: checks.slice(0, 1) },
      { label: 'Screen · Lights · Classic tee (STTU169) · Front chest · 28 cm', checks: [] },
    ],
    pieces: {
      sizes,
      rows: [
        { blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C002', colourName: 'Black', sizes: { S: 20, M: 62, L: 40 }, total: 122, from: [{ ref: 'Run 2 · ORD-1A2B3C4D', qty: 120 }, { ref: 'ORD-3F9A2C1B', qty: 2 }] },
        { blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C727', colourName: 'French Navy', sizes: { M: 40 }, total: 40, from: [{ ref: 'Run 2 · ORD-1A2B3C4D', qty: 40 }] },
      ],
      total: 162,
      orders: 2,
    },
    audits: [
      { label: 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm', state: 'approved', by: 'Marta Vidal', at: '2026-10-15T12:30:00.000Z' },
      { label: 'Screen · Lights · Classic tee (STTU169) · Front chest · 28 cm', state: 'waiting', by: null, at: null },
      { label: 'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm', state: 'sent_back', by: null, at: null },
    ],
    proofs: [
      { colourName: 'Black', label: 'DTG/DTF', image: await proofImage('#1B1C1E') },
      { colourName: 'White', label: 'Screen · Lights', image: await proofImage('#F3F3F1') },
    ],
  };
}

const emptyInput = (): JobSheetInput => ({
  generatedAt: GENERATED,
  design: { code: 'MF-3F9A2C', name: 'Design 3F9A2C', shopName: 'Band shop', versionNumber: null, approvedAt: null },
  packStatus: 'No print files yet',
  garments: [],
  placementNotes: [],
  screenSets: [],
  dtgPacks: [],
  proofs: [],
  checks: [],
  pieces: { sizes: [], rows: [], total: 0, orders: 0 },
  audits: [],
});

test('the view says the header, the garments and the notes under them as the sheet does', async () => {
  const view = buildJobSheetView(await fullInput());
  assert.equal(view.title, 'MF-UNDERWRITER · v3');
  assert.equal(view.subtitle, 'Underwriter · Underwriter band shop');
  assert.equal(view.generated, '2026-10-15 14:32 UTC');
  assert.deepEqual(view.facts, [
    ['Design', 'MF-UNDERWRITER'],
    ['Version', 'v3'],
    ['Artist approved', '2026-10-15'],
    ['Pre-press', '2 of 3 files approved by pre-press'],
  ]);
  assert.equal(view.garments.heading, 'Garments (7)');
  assert.equal(view.garments.empty, null);
  assert.deepEqual(view.garments.notes, [COLLAR_DISTANCE_UNSET_NOTE]);
  const black = view.garments.rows.find((g) => g.colourCode === 'C002' && g.method === 'screen')!;
  assert.deepEqual([black.blankName, black.blankCode, black.colourName, black.colourHex, black.methodLabel, black.usedBy], ['Classic tee', 'STTU169', 'Black', '#1B1C1E', 'Screen · Darks', ['Run 2']]);
  assert.match(black.file ?? '', /DARKS\.psd$/);
  const hoodie = view.garments.rows.find((g) => g.blankCode === 'STSU177')!;
  assert.deepEqual([hoodie.file, hoodie.note, hoodie.usedBy], [null, 'No print file yet', ['Shop · Hoodie', 'Run 3']]);
});

test('each screen set has its films in press order, with the ink, base, ruling, mesh and cover as the sheet words them', async () => {
  const view = buildJobSheetView(await fullInput());
  const [darks, lights] = view.screenSets;
  assert.deepEqual([darks.setName, darks.title, darks.screens], ['Darks', 'Darks · 6 screens · simulated process', 6]);
  assert.equal(darks.where, 'Classic tee (STTU169) · Front chest · 28 cm wide · 5 cm below the collar · prints on Black, French Navy · 280 × 336 mm at 600 ppi');
  assert.equal(darks.nothingPrints, null);
  assert.deepEqual(darks.films.map((f) => f.position), ['1/6', '2/6', '3/6', '4/6', '5/6', '6/6']);
  assert.deepEqual(darks.films.map((f) => f.role), ['underbase', 'ink', 'ink', 'ink', 'ink', 'highlight']);

  const [underbase, orchid] = darks.films;
  assert.deepEqual([underbase.label, underbase.pantone, underbase.base, underbase.clientName], ['Underbase', null, 'Aquaflex V2 White · flash', null]);
  assert.equal(underbase.flash, 'Flash 4 s at 230 °C, then the colours wet on wet');
  assert.deepEqual([orchid.label, orchid.pantone, orchid.base, orchid.clientName, orchid.colour, orchid.hex], ['PANTONE 237 C', 'PANTONE 237 C', 'HB Opaque', 'Orchid pink', 'Orchid pink · #ED90DC', '#ED90DC']);
  assert.deepEqual([orchid.ruling, orchid.lpi, orchid.angleDeg, orchid.mesh, orchid.meshText, orchid.cover, orchid.flash], ['55 lpi 22.5°', 55, 22.5, 230, '230 (91T)', '9.9%', null]);
  assert.equal(darks.films[5].label, 'Highlight white');
  assert.equal(darks.films[3].cover, '9.0%');
  assert.equal(darks.films[5].cover, '1.5%');

  // The light garments' set has no underbase or highlight white, so no flash note and no such settings.
  assert.deepEqual(lights.films.map((f) => f.role), ['ink', 'ink', 'ink', 'ink']);
  assert.ok(lights.films.every((f) => f.flash === null));
  assert.ok(!lights.settings.some((s) => s.key === 'underbase' || s.key === 'highlight'));
  assert.ok(darks.settings.some((s) => s.key === 'underbase') && darks.settings.some((s) => s.key === 'highlight'));
});

test('the press settings are worded for the press: cure, flash, mesh, off-contact, squeegee and the screens against the heads', async () => {
  const view = buildJobSheetView(await fullInput());
  const darks = view.screenSets[0];
  const by = Object.fromEntries(darks.settings.map((s) => [s.key, s]));
  assert.deepEqual(darks.settings.map((s) => s.key), ['underbase', 'colour_base', 'traps', 'highlight', 'cure', 'mesh', 'off_contact', 'squeegee', 'screens', 'dot_gain', 'inks']);
  assert.equal(by.underbase.value, 'Aquaflex V2 White, choked 0.2 mm, flash 4 s at 230 °C');
  assert.equal(by.colour_base.value, 'HB Opaque, wet on wet over the underbase');
  assert.equal(by.traps.label, 'Traps');
  assert.equal(by.cure.value, '2 to 2.5 min at 165 °C');
  assert.equal(by.off_contact.label, 'Off-contact');
  assert.equal(by.screens.value, '6 on a 8-head press');
  assert.equal(by.dot_gain.value, 'Not calibrated: linear, the films carry the tones as they are');
  assert.equal(by.inks.value, 'Not measured yet: the proof uses target colours');

  // Over the press heads and the standard eight: both are said.
  const fifteen: PackManifestInk[] = Array.from({ length: 15 }, (_, i) => ({ index: i + 1, role: 'ink', hex: '#5456AC', clientName: `Ink ${i + 1}`, pantone: `PANTONE ${100 + i} C`, base: 'HB Opaque', coverage: 0.1, lpi: 55, angleDeg: 22.5, mesh: 230 }));
  const big = buildJobSheetView({ ...(await fullInput()), screenSets: [{ ...MOCK_JOB_SHEET.screenSets[0], inks: fifteen, system: { ...DEFAULT_INK_SYSTEM, measured: true } }] });
  const settings = Object.fromEntries(big.screenSets[0].settings.map((s) => [s.key, s.value]));
  assert.equal(settings.screens, '15 on a 8-head press: more than the heads, plan the run');
  assert.equal(settings.surcharge, '7 screens above 8: €7 per piece on runs');
  assert.equal('inks' in settings, false, 'measured inks need no warning');
});

test('how the films are made shows in the words: index cells have no traps, a simulated process the calibrated curve', async () => {
  const input = await fullInput();
  const calibrated = { ...DEFAULT_INK_SYSTEM, dotGain: { measuredAt: '2026-10-16T09:30:00.000Z', method: 'scan' as const, lpi: 55, angleDeg: 22.5, mesh: 230, points: [{ input: 0.5, printed: 0.65 }] } };
  const cells = MOCK_JOB_SHEET.screenSets[1].inks.map((ink) => ({ ...ink, lpi: 200, angleDeg: 0 }));
  input.screenSets = [
    { ...MOCK_JOB_SHEET.screenSets[1], method: 'index', inks: cells },
    { ...MOCK_JOB_SHEET.screenSets[0], method: 'sim_process', system: calibrated },
  ];
  const [index, sim] = buildJobSheetView(input).screenSets;
  const word = (set: typeof index, key: string) => set.settings.find((s) => s.key === key)!.value;
  assert.ok(index.title.endsWith('· index'));
  assert.equal(index.films[0].ruling, 'Index 200 ppi');
  assert.equal(word(index, 'traps'), 'None: index cells sit side by side');
  assert.equal(word(index, 'dot_gain'), 'Not used: index films have no halftone dots');
  assert.equal(word(sim, 'traps'), 'None: the halftones overlap by design');
  assert.equal(word(sim, 'dot_gain'), 'Calibrated 2026-10-16 (from a scan) at 55 lpi 22.5°, mesh 230: tones compensated');
});

test('a set where nothing prints has no films and no settings, and says why', async () => {
  const reason = 'Screen print: nothing prints on Black, French Navy. The art is the same colour as the shirt.';
  const input = await fullInput();
  input.screenSets = [
    { ...MOCK_JOB_SHEET.screenSets[0], inks: [], file: null, note: reason },
    { ...MOCK_JOB_SHEET.screenSets[1], inks: [], file: null, note: null },
  ];
  const [withReason, withoutReason] = buildJobSheetView(input).screenSets;
  assert.deepEqual([withReason.films, withReason.settings, withReason.nothingPrints, withReason.file], [[], [], reason, null]);
  assert.equal(withoutReason.nothingPrints, NOTHING_PRINTS);
  assert.equal(withReason.title, 'Darks · 0 screens · simulated process');
});

test('the DTG/DTF files say their pixels, size, offset and what happens to whites and fades', async () => {
  const view = buildJobSheetView(await fullInput());
  const [pack] = view.dtg.packs;
  assert.equal(pack.title, 'Classic tee (STTU169) · Front chest · 28 cm wide · 5 cm below the collar');
  assert.equal(pack.where, '3 garment colours · 280 × 336 mm at 300 ppi');
  const [black, , white] = pack.files;
  assert.deepEqual([black.colourName, black.pixels, black.size, black.offset], ['Black', '3307 × 3969 px', '280 × 336 mm', '0, 0 mm']);
  assert.equal(black.notes, 'RGB 255 prints white ink. Fades are halftoned (45 lpi), so no white lies under soft edges.');
  assert.match(white.notes, /^White areas print no ink on this colour\./);
  assert.match(view.dtg.footnote ?? '', /GTX Graphics Lab at 100%/);
  assert.equal(buildJobSheetView(emptyInput()).dtg.footnote, null, 'nothing to explain without files');
});

test('checks say what passed in one line of titles and spell out only what needs a person', async () => {
  const view = buildJobSheetView(await fullInput());
  const [darks, dtg, none] = view.checks;
  assert.deepEqual(darks.passed, ['Size', 'Plates']);
  assert.deepEqual(darks.attention.map((c) => [c.stateWord, c.title]), [['REVIEW', 'Fine lines'], ['FAILED', 'Transparency']]);
  assert.match(darks.attention[0].detail, /Film 3 has lines under 0.3 mm/);
  assert.deepEqual([dtg.passed, dtg.attention, dtg.empty], [['Size'], [], null]);
  assert.deepEqual([none.passed, none.attention, none.empty], [[], [], 'No checks recorded.']);
});

test('pieces waiting are added up by size, with the line that says how many and when they were counted', async () => {
  const view = buildJobSheetView(await fullInput());
  const { pieces } = view;
  assert.deepEqual(pieces.sizes, ['S', 'M', 'L', 'XL']);
  assert.deepEqual(pieces.totals, { S: 20, M: 102, L: 40, XL: 0 });
  assert.equal(pieces.line, '162 pieces in 2 open orders, counted 2026-10-15 14:32 UTC. Open means paid and not yet packed.');
  assert.deepEqual(pieces.rows[0].from, ['Run 2 · ORD-1A2B3C4D (120)', 'ORD-3F9A2C1B (2)']);
  assert.equal(pieces.empty, null);
  const one = buildJobSheetView({ ...(await fullInput()), pieces: { sizes: ['M'], rows: [{ blankCode: 'A', blankName: 'Tee', colourCode: 'C1', colourName: 'Black', sizes: { M: 1 }, total: 1, from: [{ ref: 'ORD-1', qty: 1 }] }], total: 1, orders: 1 } });
  assert.match(one.pieces.line ?? '', /^1 piece in 1 open order, counted /);
});

test('the audit state is in words, with who signed it and when, or a dash', async () => {
  const view = buildJobSheetView(await fullInput());
  assert.deepEqual(view.audits.map((a) => [a.stateWord, a.approved, a.by, a.date]), [
    ['Approved', true, 'Marta Vidal', '2026-10-15'],
    ['Waiting for audit', false, '-', '-'],
    ['Sent back to the artist', false, '-', '-'],
  ]);
  assert.equal(view.auditsEmpty, null);
});

test('a design nothing is prepared for is a short view that says so, in the sheet’s words', () => {
  const view = buildJobSheetView(emptyInput());
  assert.equal(view.title, 'MF-3F9A2C');
  assert.deepEqual(view.facts, [['Design', 'MF-3F9A2C'], ['Version', 'Nothing prepared yet'], ['Artist approved', 'Not approved by the artist yet'], ['Pre-press', 'No print files yet']]);
  assert.deepEqual([view.garments.heading, view.garments.empty], ['Garments', EMPTY_GARMENTS]);
  assert.deepEqual([view.pieces.empty, view.pieces.line, view.auditsEmpty], [EMPTY_PIECES, null, EMPTY_AUDITS]);
  assert.deepEqual([view.screenSets, view.dtg.packs, view.proofs, view.checks, view.audits], [[], [], [], [], []]);
});

test('proofs carry the address an iPad loads them from, and the PDF’s own view has none; a set carries its pack when it has one', async () => {
  const input: JobSheetViewInput = {
    ...(await fullInput()),
    screenSets: [{ ...MOCK_JOB_SHEET.screenSets[0], packId: 'pack-1' }, MOCK_JOB_SHEET.screenSets[1]],
    proofs: [{ colourName: 'Black', label: 'DTG/DTF', url: '/files/proof-1.webp' }, { colourName: 'White', label: 'Screen · Lights' }],
  };
  const view = buildJobSheetView(input);
  assert.deepEqual(view.proofs, [{ colourName: 'Black', label: 'DTG/DTF', url: '/files/proof-1.webp' }, { colourName: 'White', label: 'Screen · Lights', url: null }]);
  assert.deepEqual(view.screenSets.map((s) => s.packId), ['pack-1', null]);
});

test('the view is plain JSON: nothing in it is lost, or made different, on the way to the browser', async () => {
  const view = buildJobSheetView(await fullInput());
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);
  assert.doesNotMatch(JSON.stringify(view), /undefined|\[object/);
});

test('the same input never gives a different view: the view is a pure function of it', async () => {
  const input = await fullInput();
  const before = JSON.stringify(input.screenSets);
  const a = buildJobSheetView(input);
  const b = buildJobSheetView(input);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(input.screenSets), before, 'the input is not changed by making a view');
  // Nothing in the view aliases the input: changing one cannot change the other.
  a.screenSets[0].films[0].label = 'changed';
  assert.notEqual(buildJobSheetView(input).screenSets[0].films[0].label, 'changed');
});

// ---------------------------------------------------------------------------
// Parity: the PDF is drawn from the view, so the paper and the screen say the same

test('PARITY: every phrase of the view is on the PDF drawn from the same input, and the PDF says nothing the view lacks', async () => {
  const input = await fullInput();
  const view = buildJobSheetView(input);
  const pdf = await renderJobSheet(input);
  const { missing, extra } = compareWithPdf(view, pdf);
  assert.deepEqual(missing, [], 'phrases of the view the sheet does not print');
  assert.deepEqual(extra, [], 'lines of the sheet the view does not have');
  assert.ok(viewTexts(view).length > 150, 'the comparison covers the whole sheet');
});

test('PARITY holds for every shape of sheet: nothing prints, index and simulated process, many screens, many sizes, no garments, nothing prepared', async () => {
  const base = await fullInput();
  const fifteen: PackManifestInk[] = Array.from({ length: 15 }, (_, i) => ({ index: i + 1, role: 'ink', hex: '#5456AC', clientName: `Ink ${i + 1}`, pantone: i % 3 === 0 ? null : `pantone ${100 + i} c`, base: 'HB Opaque', coverage: 0.05 * (i % 5), lpi: 55, angleDeg: 22.5, mesh: i % 4 === 0 ? 0 : 230 }));
  const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const shapes: [string, JobSheetInput][] = [
    ['nothing prints', { ...base, screenSets: [{ ...base.screenSets[0], inks: [], file: null, note: 'Screen print: nothing prints on Black.' }, { ...base.screenSets[1], inks: [], file: null, note: null }] }],
    ['index and simulated process', { ...base, screenSets: [{ ...base.screenSets[0], method: 'index' }, { ...base.screenSets[1], method: 'sim_process', system: { ...DEFAULT_INK_SYSTEM, measured: true, dotGain: { measuredAt: '2026-10-16T09:30:00.000Z', method: 'manual', lpi: 55, angleDeg: 22.5, mesh: 230, points: [{ input: 0.5, printed: 0.65 }] } } }] }],
    ['fifteen screens, seventy garments', { ...base, screenSets: [{ ...base.screenSets[0], inks: fifteen }], garments: Array.from({ length: 70 }, (_, i) => ({ ...base.garments[0], colourCode: `C${100 + i}`, colourName: `Colour ${i}`, file: i % 2 ? null : base.garments[0].file, note: i % 2 ? 'No print file yet' : null })) }],
    ['many sizes', { ...base, pieces: { sizes, rows: [{ blankCode: 'A', blankName: 'Tee', colourCode: 'C1', colourName: 'Black', sizes: Object.fromEntries(sizes.map((s, i) => [s, i + 1])), total: 55, from: [{ ref: 'ORD-1', qty: 55 }] }], total: 55, orders: 1 } }],
    ['nothing prepared', emptyInput()],
  ];
  for (const [name, input] of shapes) {
    const { missing, extra } = compareWithPdf(buildJobSheetView(input), await renderJobSheet(input));
    assert.deepEqual([missing, extra], [[], []], name);
  }
});
