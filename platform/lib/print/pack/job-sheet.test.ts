// The job sheet (one per design) renders, re-opens with pdf-lib (independent of pdfkit), is A4
// landscape, and carries what the press needs: screen and DTG/DTF garments together, the inks and
// settings of each screen set, proofs, checks, the pieces waiting and the audit sign-off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { COLLAR_DISTANCE_UNSET_NOTE } from '@/lib/mockups/placements';
import type { CheckResult, JobSheetGarment, JobSheetInput, JobSheetScreenSet, PackManifestInk } from '@/lib/print/types';
import { renderJobSheet } from './index';
import { pdfLines, shows } from './test-pdf';

// The standard collar distance isn't set yet, so a placement says "Standard position" and, if the print was moved, how far.
const PLACEMENT = 'Front chest · 28 cm wide · Standard position';
const LOWER = 'Front · 32 cm wide · Standard position, 2 cm lower';
// Once it is set, the sheet gives the real distance: the standard plus the offset.
const MEASURED = 'Front chest · 28 cm wide · 8.5 cm below the collar';
const COLOURS = [
  { code: 'C002', name: 'Black', hex: '#1B1C1E' },
  { code: 'C727', name: 'French Navy', hex: '#222A3D' },
  { code: 'C001', name: 'White', hex: '#F3F3F1' },
] as const;

async function proofImage(hex: string): Promise<Buffer> {
  return sharp({ create: { width: 300, height: 360, channels: 3, background: hex } }).webp().toBuffer();
}

function inks(dark: boolean, withoutCode = false): PackManifestInk[] {
  const list: PackManifestInk[] = [];
  if (dark) list.push({ index: 1, role: 'underbase', hex: '#F2F2F0', clientName: 'White underbase', pantone: null, base: 'Aquaflex V2 White · flash', coverage: 0.71, lpi: 55, angleDeg: 22.5, mesh: 200 });
  const colours: [string, string, string | null][] = [
    ['#ED90DC', 'Orchid pink', 'PANTONE 237 C'],
    ['#C363DA', 'Violet', 'PANTONE 2582 C'],
    ['#5456AC', 'Indigo', withoutCode ? null : 'PANTONE 2726 C'],
    ['#3E0E61', 'Deep purple', 'PANTONE 2685 C'],
  ];
  for (const [hex, clientName, pantone] of colours) {
    list.push({ index: list.length + 1, role: 'ink', hex, clientName, pantone, base: dark ? 'HB Opaque' : 'HB Neutral', coverage: 0.2, lpi: 55, angleDeg: 22.5, mesh: 230 });
  }
  if (dark) list.push({ index: list.length + 1, role: 'highlight', hex: '#F2F2F0', clientName: 'Highlight white', pantone: null, base: 'Aquaflex V2 White', coverage: 0.07, lpi: 55, angleDeg: 22.5, mesh: 200 });
  return list;
}

function set(setName: 'Darks' | 'Lights', overrides: Partial<JobSheetScreenSet> = {}): JobSheetScreenSet {
  return {
    setName,
    blankCode: 'STTU169',
    blankName: 'Classic tee',
    placement: PLACEMENT,
    colours: setName === 'Darks' ? ['Black', 'French Navy'] : ['White'],
    file: `MF-UNDERWRITER-TEE-v3-FRONT-CHEST-${setName.toUpperCase()}.psd`,
    method: 'spot',
    printSize: '280 × 336 mm at 600 ppi',
    inks: inks(setName === 'Darks'),
    underbaseChokeMm: 0.2,
    trapMm: 0.25,
    system: DEFAULT_INK_SYSTEM,
    note: null,
    ...overrides,
  };
}

const checks: CheckResult[] = [
  { id: 'size', title: 'Size', state: 'passed', detail: '7,796 × 9,119 px at 600 ppi: a 28 × 33.6 cm print plus a 25 mm margin.' },
  { id: 'features', title: 'Fine lines', state: 'review', detail: 'Film 3 has lines under 0.3 mm in 2 places; they may close up or drop out.' },
  { id: 'dtg_alpha', title: 'Transparency', state: 'failed', detail: '12 pixels on Black are within ΔE 10 of the garment colour.' },
];

function garmentRows(): JobSheetGarment[] {
  const dtg = COLOURS.map((c) => ({
    blankCode: 'STTU169',
    blankName: 'Classic tee',
    colourCode: c.code,
    colourName: c.name,
    colourHex: c.hex,
    placement: PLACEMENT,
    method: 'dtg_dtf' as const,
    methodLabel: 'DTG/DTF',
    setName: null,
    file: `MF-UNDERWRITER-TEE-v3-FRONT-CHEST-DTG-${c.name.toUpperCase().replace(/ /g, '-')}.png`,
    note: null,
    usedBy: ['Shop · Underwriter tee'],
  }));
  const screen = COLOURS.map((c) => {
    const dark = c.code !== 'C001';
    return {
      blankCode: 'STTU169',
      blankName: 'Classic tee',
      colourCode: c.code,
      colourName: c.name,
      colourHex: c.hex,
      placement: PLACEMENT,
      method: 'screen' as const,
      methodLabel: dark ? 'Screen · Darks' : 'Screen · Lights',
      setName: dark ? 'Darks' : 'Lights',
      file: `MF-UNDERWRITER-TEE-v3-FRONT-CHEST-${dark ? 'DARKS' : 'LIGHTS'}.psd`,
      note: null,
      usedBy: ['Run 2'],
    };
  });
  const hoodie: JobSheetGarment = {
    blankCode: 'STSU177',
    blankName: 'Heavy hoodie',
    colourCode: 'C002',
    colourName: 'Black',
    colourHex: '#1B1C1E',
    placement: LOWER,
    method: 'dtg_dtf',
    methodLabel: 'DTG/DTF',
    setName: null,
    file: null,
    note: 'No print file yet',
    usedBy: ['Shop · Underwriter hoodie', 'Run 3'],
  };
  return [...dtg, ...screen, hoodie];
}

async function fullInput(): Promise<JobSheetInput> {
  return {
    generatedAt: '2026-10-15T14:32:10.000Z',
    design: { code: 'MF-UNDERWRITER-TEE', name: 'Underwriter tee', shopName: 'Underwriter band shop', versionNumber: 3, approvedAt: '2026-10-15T09:10:00.000Z' },
    packStatus: '2 of 3 files approved by pre-press',
    garments: [...garmentRows(), { ...garmentRows()[0], blankCode: 'STJU251', blankName: 'Bomber jacket', placement: MEASURED, usedBy: ['Shop · Underwriter bomber'] }],
    placementNotes: [COLLAR_DISTANCE_UNSET_NOTE],
    screenSets: [set('Darks'), set('Lights', { inks: inks(false, true) })],
    dtgPacks: [
      {
        blankCode: 'STTU169',
        blankName: 'Classic tee',
        placement: PLACEMENT,
        printSize: '280 × 336 mm at 300 ppi',
        fadeLpi: 45,
        files: COLOURS.map((c, i) => ({
          colourCode: c.code,
          colourName: c.name,
          file: `MF-UNDERWRITER-TEE-v3-FRONT-CHEST-DTG-${c.name.toUpperCase().replace(/ /g, '-')}.png`,
          widthPx: 3307,
          heightPx: 3969,
          ppi: 300,
          sizeMm: { width: 280, height: 336.1 },
          offsetMm: { x: 0, y: 2.5 },
          whitesTransparent: c.code === 'C001',
          fadeShare: i === 1 ? 0 : 0.08,
        })),
      },
    ],
    proofs: [
      { colourName: 'Black', label: 'DTG/DTF', image: await proofImage('#1B1C1E') },
      { colourName: 'French Navy', label: 'DTG/DTF', image: await proofImage('#222A3D') },
      { colourName: 'Black', label: 'Screen · Darks', image: await proofImage('#1B1C1E') },
    ],
    checks: [
      { label: 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm', checks },
      { label: 'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm', checks: checks.slice(0, 1) },
    ],
    pieces: {
      sizes: ['S', 'M', 'L', 'XL'],
      rows: [
        {
          blankCode: 'STTU169',
          blankName: 'Classic tee',
          colourCode: 'C002',
          colourName: 'Black',
          sizes: { S: 20, M: 62, L: 40 },
          total: 122,
          from: [
            { ref: 'Run 2 · ORD-1A2B3C4D', qty: 120 },
            { ref: 'ORD-3F9A2C1B', qty: 2 },
          ],
        },
        { blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C727', colourName: 'French Navy', sizes: { M: 40 }, total: 40, from: [{ ref: 'Run 2 · ORD-1A2B3C4D', qty: 40 }] },
        { blankCode: 'STSU177', blankName: 'Heavy hoodie', colourCode: 'C002', colourName: 'Black', sizes: { XL: 1 }, total: 1, from: [{ ref: 'ORD-55AA66BB', qty: 1 }] },
      ],
      total: 163,
      orders: 3,
    },
    audits: [
      { label: 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm', state: 'approved', by: 'Marta Vidal', at: '2026-10-15T12:30:00.000Z' },
      { label: 'Screen · Lights · Classic tee (STTU169) · Front chest · 28 cm', state: 'waiting', by: null, at: null },
      { label: 'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm', state: 'approved', by: 'Pat Presser', at: '2026-10-15T12:31:00.000Z' },
    ],
  };
}

test('one sheet covers garments printed DTG and by screen, with every section, on A4 landscape', async () => {
  const input = await fullInput();
  const pdf = await renderJobSheet(input);
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');

  const doc = await PDFDocument.load(pdf);
  assert.ok(doc.getPageCount() >= 2);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    assert.ok(Math.abs(width - 841.89) < 0.5 && Math.abs(height - 595.28) < 0.5, 'A4 landscape');
  }
  assert.equal(doc.getTitle(), 'Job sheet MF-UNDERWRITER-TEE · v3');
  assert.equal(doc.getSubject(), 'Underwriter tee');

  const lines = pdfLines(pdf);
  const text = lines.join('\n');
  const expected = [
    // header: design code and version, approval date, pack status
    'MF-UNDERWRITER-TEE · v3',
    'Underwriter tee · Underwriter band shop',
    '2026-10-15',
    '2 of 3 files approved by pre-press',
    'GENERATED 2026-10-15 14:32 UTC',
    // the garments table: several garments and colours, shop and run, both methods
    'Garments (8)',
    'Classic tee',
    'STTU169',
    'Heavy hoodie',
    'STSU177',
    'French Navy',
    'C727',
    PLACEMENT,
    LOWER,
    MEASURED,
    // the note under the garments says why most rows have no distance below the collar
    COLLAR_DISTANCE_UNSET_NOTE,
    'DTG/DTF',
    'Screen · Darks',
    'Screen · Lights',
    'MF-UNDERWRITER-TEE-v3-FRONT-CHEST-DTG-FRENCH-NAVY.png',
    'MF-UNDERWRITER-TEE-v3-FRONT-CHEST-DARKS.psd',
    'MF-UNDERWRITER-TEE-v3-FRONT-CHEST-LIGHTS.psd',
    'No print file yet',
    'Shop · Underwriter tee',
    'Run 2',
    // a screen set: inks in print order, Pantone code and base, ruling, mesh, flash, cure, choke, traps, screens
    'Darks · 6 screens · spot colours',
    'Underbase',
    'PANTONE 237 C',
    'PANTONE 2685 C',
    '#5456AC (no Pantone yet)',
    'Highlight white',
    'HB Opaque',
    'HB Neutral',
    'Aquaflex V2 White',
    '55 lpi 22.5°',
    '230 (91T)',
    'Flash 4 s at 230 °C, then the colours wet on wet',
    'Aquaflex V2 White, choked 0.2 mm, flash 4 s at 230 °C',
    '0.25 mm, lighter ink spread under darker',
    '2 to 2.5 min at 165 °C',
    '6 on a 8-head press',
    'Not measured yet: the proof uses target colours',
    'Lights · 4 screens · spot colours',
    // DTG/DTF notes per garment colour
    'MF-UNDERWRITER-TEE-v3-FRONT-CHEST-DTG-BLACK.png',
    '3307 × 3969 px',
    '280 × 336.1 mm',
    'RGB 255 prints white ink.',
    'White areas print no ink on this colour.',
    'Fades are halftoned (45 lpi)',
    'GTX Graphics Lab',
    // checks
    'PASSED',
    'REVIEW',
    'FAILED',
    'within dE 10 of the garment colour',
    // pieces waiting, added up, with order and run references
    'Pieces waiting',
    '163 pieces in 3 open orders, counted 2026-10-15 14:32 UTC',
    'Run 2 · ORD-1A2B3C4D (120)',
    'ORD-3F9A2C1B (2)',
    'ORD-55AA66BB (1)',
    // audit sign-off
    'Audit sign-off',
    'Marta Vidal',
    'Pat Presser',
    'Waiting for audit',
  ];
  for (const phrase of expected) assert.ok(shows(lines, phrase), `the sheet says "${phrase}"`);
  assert.ok(text.includes('Proofs'), 'a proofs section');
  // A print's height is never called "from the collar": that is not what a product's offset is.
  assert.ok(!/from collar/i.test(text), 'nothing says "from collar"');
  // A set says how its underbase and highlight white are printed only when it has them (the lights set has neither).
  assert.equal(lines.filter((l) => l === 'UNDERBASE').length, 1);
  assert.equal(lines.filter((l) => l === 'HIGHLIGHT WHITE').length, 1);
  // What passed is a line of titles; what needs a person is spelled out.
  assert.ok(!shows(lines, '7,796 × 9,119 px'), 'a passed check is not spelled out');
  assert.ok(shows(lines, 'Film 3 has lines under 0.3 mm in 2 places'));
  assert.match(text, /PAGE 1 OF \d/);
  // Proofs: one JPEG thumbnail per proof image.
  assert.equal(pdf.toString('latin1').match(/\/DCTDecode/g)?.length, 3);
});

test('a design nothing is prepared for and no order waits on still makes a sheet, and says so', async () => {
  const pdf = await renderJobSheet({
    generatedAt: '2026-10-15T14:32:10.000Z',
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
  const doc = await PDFDocument.load(pdf);
  assert.equal(doc.getPageCount(), 1);
  const lines = pdfLines(pdf);
  for (const phrase of [
    'MF-3F9A2C',
    'Nothing prepared yet',
    'Not approved by the artist yet',
    'No print files yet',
    'No shop product or open run uses this design yet.',
    'No open order for this design.',
    'No production file yet, so nothing to audit.',
  ]) {
    assert.ok(shows(lines, phrase), `the sheet says "${phrase}"`);
  }
  assert.ok(!lines.join('\n').includes('Screen sets'), 'no screen section without screen sets');
  assert.ok(!shows(lines, 'Standard position'), 'no placement note when no placement says it');
});

test('a set where nothing prints says why, in the engine’s words, and has no film table', async () => {
  const reason = 'Screen print: nothing prints on Black, French Navy. The art is the same colour as the shirt.';
  const input = await fullInput();
  input.screenSets = [set('Darks', { inks: [], file: null, note: reason })];
  const lines = pdfLines(await renderJobSheet(input));
  assert.ok(shows(lines, reason));
  assert.ok(!shows(lines, 'Film (MagnaMix)'));
});

test('a 15-screen set flags the surcharge and the press heads; a long table runs over pages with its header and footer on each', async () => {
  const input = await fullInput();
  const fifteen: PackManifestInk[] = Array.from({ length: 15 }, (_, i) => ({ index: i + 1, role: 'ink', hex: '#5456AC', clientName: `Ink ${i + 1}`, pantone: `PANTONE ${100 + i} C`, base: 'HB Opaque', coverage: 0.1, lpi: 55, angleDeg: 22.5, mesh: 230 }));
  input.screenSets = [set('Darks', { inks: fifteen })];
  // Eighty garment rows: far more than a page.
  const base = input.garments[0];
  input.garments = Array.from({ length: 80 }, (_, i) => ({ ...base, colourCode: `C${100 + i}`, colourName: `Colour ${i + 1}` }));
  const pdf = await renderJobSheet(input);
  const doc = await PDFDocument.load(pdf);
  assert.ok(doc.getPageCount() >= 4);
  const lines = pdfLines(pdf);
  const text = lines.join('\n');
  for (let p = 1; p <= doc.getPageCount(); p++) assert.ok(text.includes(`PAGE ${p} OF ${doc.getPageCount()}`), `footer on page ${p}`);
  assert.ok(text.includes('7 screens above 8: €7 per piece on runs'));
  assert.ok(text.includes('15 on a 8-head press: more than the heads, plan the run'));
  // The header row of the garments table repeats on every page it runs over.
  assert.ok(lines.filter((l) => l === 'GARMENT (BLANK, CODE)').length >= 2);
  assert.ok(shows(lines, 'Colour 80'));
});

test('a sheet with many sizes keeps every size column and the totals', async () => {
  const input = await fullInput();
  const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  input.pieces = {
    sizes,
    rows: [{ blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C002', colourName: 'Black', sizes: Object.fromEntries(sizes.map((s, i) => [s, i + 1])), total: 55, from: [{ ref: 'ORD-1A2B3C4D', qty: 55 }] }],
    total: 55,
    orders: 1,
  };
  const lines = pdfLines(await renderJobSheet(input));
  for (const size of sizes) assert.ok(lines.includes(size), `column ${size}`);
  assert.ok(lines.includes('55'));
});

test('the sample sheet that PRINT_MOCK shows renders, with both methods and a signed file', async () => {
  const { MOCK_JOB_SHEET } = await import('@/lib/print/mock-views');
  const pdf = await renderJobSheet({ ...MOCK_JOB_SHEET, generatedAt: '2026-10-15T14:32:10.000Z', proofs: [] });
  const doc = await PDFDocument.load(pdf);
  assert.ok(doc.getPageCount() >= 2);
  const lines = pdfLines(pdf);
  for (const phrase of ['MF-UNDERWRITER · v3', 'Screen · Darks', 'Screen · Lights', 'DTG/DTF', 'PANTONE 237 C', 'Sample Owner', 'Waiting for audit', 'Front chest · 28 cm wide · Standard position', COLLAR_DISTANCE_UNSET_NOTE]) assert.ok(shows(lines, phrase), phrase);
});
