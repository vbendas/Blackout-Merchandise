// Sample views from the approved mocks (Underwriter test design, front chest,
// 28 cm), returned by the print services when PRINT_MOCK=1 so the Studio and
// admin pages can be built and checked before the pipeline runs. The images in
// public/dev/print-mock come from a rough engine prototype. Development only.
import { COLLAR_DISTANCE_UNSET_NOTE } from '@/lib/mockups/placements';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { jobSheetPath } from '@/lib/print/job-sheet-link';
import type { JobSheetInput, PackManifestInk } from '@/lib/print/types';
import type { ApprovalView } from '@/lib/services/print-prep';
import type { PackDetailView, PrepressQueueRow } from '@/lib/services/prepress';

const IMG = '/dev/print-mock';

/** A well-formed design id for the sample job sheet's link: the sheet route needs one, and answers with the sample whatever it is. */
const MOCK_DESIGN_ID = '00000000-0000-4000-8000-000000000000';

export const MOCK_APPROVAL_VIEW: ApprovalView = {
  designId: 'mock-design',
  designName: 'Underwriter',
  versionId: 'mock-version-3',
  versionNumber: 3,
  placementLabel: 'Front · 28 × 33.6 cm',
  status: 'ready',
  garments: [
    { code: 'C002', name: 'Black', hex: '#1B1C1E', isLight: false, screenSetKey: 'darks' },
    { code: 'C727', name: 'French Navy', hex: '#222A3D', isLight: false, screenSetKey: 'darks' },
    { code: 'C001', name: 'White', hex: '#F3F3F1', isLight: true, screenSetKey: 'lights' },
  ],
  proofs: [
    { garmentCode: 'C002', technique: 'dtg_dtf', url: `${IMG}/proof-dtg-black.webp`, alt: 'DTG proof of the Underwriter design on a Black T-shirt' },
    { garmentCode: 'C727', technique: 'dtg_dtf', url: `${IMG}/proof-dtg-navy.webp`, alt: 'DTG proof of the Underwriter design on a French Navy T-shirt' },
    { garmentCode: 'C001', technique: 'dtg_dtf', url: `${IMG}/proof-dtg-white.webp`, alt: 'DTG proof of the Underwriter design on a White T-shirt' },
    { garmentCode: 'C002', technique: 'screen', url: `${IMG}/proof-screen-black.webp`, alt: 'Screen print proof of the Underwriter design on a Black T-shirt' },
    { garmentCode: 'C727', technique: 'screen', url: `${IMG}/proof-screen-navy.webp`, alt: 'Screen print proof of the Underwriter design on a French Navy T-shirt' },
    { garmentCode: 'C001', technique: 'screen', url: `${IMG}/proof-screen-white.webp`, alt: 'Screen print proof of the Underwriter design on a White T-shirt' },
  ],
  loupes: [
    { technique: 'screen', garmentCode: 'C002', url: `${IMG}/loupe-screen-black.png`, caption: 'True size · 55 lpi dots · on Black' },
    { technique: 'dtg_dtf', garmentCode: 'C002', url: `${IMG}/loupe-dtg-black.png`, caption: 'True size · 45 lpi dots in fades · on Black' },
  ],
  dtgFacts: {
    C002: [
      'The black background is left out, so the shirt itself shows through.',
      'Fades and glows print as fine dots, so no white halo shows around them.',
      'White areas print in white ink.',
      'The same file prints DTG on the shirt or DTF on film for transfers.',
    ],
    C727: [
      'The black background is left out, so the shirt itself shows through.',
      'Fades and glows print as fine dots, so no white halo shows around them.',
      'White areas print in white ink.',
      'The same file prints DTG on the shirt or DTF on film for transfers.',
    ],
    C001: [
      'The black background is removed, so only the illustration prints.',
      'Fades and glows print as fine dots, so no white halo shows around them.',
      'White areas print no ink on a white shirt.',
      'The same file prints DTG on the shirt or DTF on film for transfers.',
    ],
  },
  screenSets: [
    {
      key: 'darks',
      name: 'Darks',
      garmentCodes: ['C002', 'C727'],
      screenCount: 6,
      headline: '6 screens, within the standard 8.',
      shared: 'Black and French Navy print from the same 6 screens, over a white underbase.',
      priceNote: 'No surcharge. On a run, each screen above 8 adds €1 per piece.',
      inks: [
        { n: 1, name: 'White underbase', detail: 'Under the colours so they stay bright', hex: '#F2F2F0' },
        { n: 2, name: 'Orchid pink', detail: '', hex: '#ED90DC' },
        { n: 3, name: 'Violet', detail: '', hex: '#C363DA' },
        { n: 4, name: 'Indigo', detail: '', hex: '#5456AC' },
        { n: 5, name: 'Deep purple', detail: '', hex: '#3E0E61' },
        { n: 6, name: 'Highlight white', detail: 'The brightest points, printed last', hex: '#F2F2F0' },
      ],
    },
    {
      key: 'lights',
      name: 'Lights',
      garmentCodes: ['C001'],
      screenCount: 5,
      headline: '5 screens, within the standard 8.',
      shared: 'White prints from its own 5 screens, with no underbase. The black linework becomes its own ink.',
      priceNote: 'No surcharge. On a run, each screen above 8 adds €1 per piece.',
      inks: [
        { n: 1, name: 'Orchid pink', detail: '', hex: '#ED90DC' },
        { n: 2, name: 'Violet', detail: '', hex: '#C363DA' },
        { n: 3, name: 'Indigo', detail: '', hex: '#5456AC' },
        { n: 4, name: 'Deep purple', detail: '', hex: '#3E0E61' },
        { n: 5, name: 'Black', detail: 'The linework', hex: '#18181A' },
      ],
    },
  ],
  warnings: [
    'The finest lines in the lashes and vines are under 0.3 mm and may close up in screen print.',
    'The artwork is 98 ppi at this size. It prints, but a sharper version would look crisper up close.',
  ],
  approvedAt: null,
  canApprove: true,
  canRevoke: false,
};

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();

export const MOCK_PREPRESS_ROWS: PrepressQueueRow[] = [
  {
    packId: 'mock-pack-darks',
    designName: 'Underwriter · v3',
    shopName: 'Underwriter band shop',
    thumbUrl: `${IMG}/proof-screen-black.webp`,
    initials: 'UW',
    fileLabel: 'Screen print · Darks',
    garmentsLabel: 'Black, French Navy',
    screensLabel: '6 of 8',
    methodLabel: 'Simulated process',
    checks: { state: 'review', label: '2 to review' },
    neededForLabel: 'Run 2 · 120 pieces',
    waitingSince: hoursAgo(2),
    auditStatus: 'waiting',
  },
  {
    packId: 'mock-pack-lights',
    designName: 'Underwriter · v3',
    shopName: 'Underwriter band shop',
    thumbUrl: `${IMG}/proof-screen-white.webp`,
    initials: 'UW',
    fileLabel: 'Screen print · Lights',
    garmentsLabel: 'White',
    screensLabel: '5 of 8',
    methodLabel: 'Simulated process',
    checks: { state: 'review', label: '2 to review' },
    neededForLabel: 'Run 2 · 40 pieces',
    waitingSince: hoursAgo(2),
    auditStatus: 'waiting',
  },
  {
    packId: 'mock-pack-dtg',
    designName: 'Underwriter · v3',
    shopName: 'Underwriter band shop',
    thumbUrl: `${IMG}/proof-dtg-black.webp`,
    initials: 'UW',
    fileLabel: 'DTG/DTF',
    garmentsLabel: 'Black, French Navy, White',
    screensLabel: '–',
    methodLabel: 'Full colour',
    checks: { state: 'passed', label: 'Passed' },
    neededForLabel: 'Shop sale',
    waitingSince: hoursAgo(0.7),
    auditStatus: 'waiting',
  },
];

const darksFilms: Array<[string, string | null, string, string, string, string, number]> = [
  // label, pantone, clientName, base, hex, coverage, mesh
  ['Underbase', null, 'White underbase', 'Aquaflex V2 White · flash', '#F2F2F0', '14.7%', 200],
  ['PANTONE 237 C', 'PANTONE 237 C', 'Orchid pink', 'HB Opaque', '#ED90DC', '9.9%', 230],
  ['PANTONE 2582 C', 'PANTONE 2582 C', 'Violet', 'HB Opaque', '#C363DA', '6.3%', 230],
  ['PANTONE 2726 C', 'PANTONE 2726 C', 'Indigo', 'HB Opaque', '#5456AC', '9.0%', 230],
  ['PANTONE 2685 C', 'PANTONE 2685 C', 'Deep purple', 'HB Opaque', '#3E0E61', '5.5%', 230],
  ['Highlight white', null, 'Highlight white', 'Aquaflex V2 White', '#F2F2F0', '1.5%', 200],
];

export const MOCK_PACK_DETAIL: PackDetailView = {
  packId: 'mock-pack-darks',
  designId: 'mock-design',
  title: 'Underwriter · v3 · Front',
  meta: 'RUN 2 · 120 + 40 PIECES',
  shopName: 'Underwriter band shop',
  technique: 'screen',
  screenSetKey: 'darks',
  tabs: [
    { packId: 'mock-pack-darks', label: 'Screen · Darks · 6', technique: 'screen', current: true },
    { packId: 'mock-pack-lights', label: 'Screen · Lights · 5', technique: 'screen', current: false },
    { packId: 'mock-pack-dtg', label: 'DTG/DTF · 3 files', technique: 'dtg_dtf', current: false },
  ],
  films: darksFilms.map(([label, pantone, clientName, base, hex, coverage, mesh], i) => ({
    plateIndex: i + 1,
    n: i + 1,
    total: darksFilms.length,
    pantone,
    clientName,
    label,
    base,
    hex,
    coverage,
    mesh,
    lpi: 55,
    angleDeg: 22.5,
    dotShape: 'round',
    ppi: 600,
    previewUrl: `${IMG}/film-darks-${i + 1}.png`,
    cropUrl: i === 1 ? `${IMG}/film-darks-2-crop.png` : null,
    needsPantone: false,
    suggestion: null,
  })),
  proofs: [
    { garmentCode: 'C002', garmentName: 'Black', hex: '#1B1C1E', url: `${IMG}/proof-screen-black.webp` },
    { garmentCode: 'C727', garmentName: 'French Navy', hex: '#222A3D', url: `${IMG}/proof-screen-navy.webp` },
  ],
  dtgFiles: [],
  dtgLoupeUrl: null,
  engine: {
    method: 'Simulated process',
    methodReason: 'Soft shading runs through most of the art, so solid spot shapes would lose it.',
    screensWhy: '6 of 8: underbase, 4 colours, highlight white. No surcharge.',
    underbase: 'Aquaflex V2 White, choked 0.2 mm, then flash.',
    order: 'Underbase, flash, colours from light to dark, highlight white last.',
    screenSets: 'Black and French Navy share one set. White has its own.',
  },
  checks: [
    { id: 'size', title: 'Size', state: 'passed', detail: '7,795 × 9,118 px at 600 ppi: a 28 × 33.6 cm print plus a 25 mm margin.' },
    { id: 'plates', title: 'Films', state: 'passed', detail: '6 films, every one pure black and white, none empty or solid.' },
    { id: 'marks', title: 'Marks', state: 'passed', detail: 'Identical registration marks on every film, 15 mm clear of the art.' },
    { id: 'screens', title: 'Screens', state: 'passed', detail: '6 of 8, so no surcharge.' },
    { id: 'features', title: 'Fine lines', state: 'review', detail: 'Some lines in the lashes and vines are under 0.3 mm and may close up.' },
    { id: 'inks_measured', title: 'Inks not measured', state: 'review', detail: 'The proof uses each ink’s target colour until the inks are measured on our blanks.' },
    { id: 'proof', title: 'Proof', state: 'passed', detail: 'Matches the proof the artist approved.' },
  ],
  history: [
    { at: hoursAgo(3), text: 'Artist approved version 3 (screen print and DTG, three garment colours).' },
    { at: hoursAgo(2.9), text: 'Pack generated: 2 screen sets, 3 DTG files.' },
    { at: hoursAgo(1.6), text: 'Run 2 ordered: 120 on Black and French Navy, 40 on White.' },
  ],
  auditStatus: 'waiting',
  buildStatus: 'ready',
  downloadUrl: null,
  psdUrl: null,
  // Any well-formed id: in mock mode the job sheet route answers with the sample sheet below.
  jobSheetUrl: jobSheetPath(MOCK_DESIGN_ID),
  canWork: true,
  canManage: true,
  rerunDefaults: { method: 'sim_process', maxScreens: 6, lpi: 55, angleDeg: 22.5, underbaseChokeMm: 0.2, trapMm: 0.25 },
};

// ---------------------------------------------------------------------------
// The sample job sheet: one per design, here the Underwriter test design on the T-shirt (a screen
// run and the shop's DTG/DTF), as lib/services/job-sheets.ts would work it out.

const PLACEMENT = 'Front chest · 28 cm wide · Standard position';
const SIZE = '280 × 336 mm at 600 ppi';

const sheetInks = (dark: boolean): PackManifestInk[] => {
  const ink = (index: number, hex: string, clientName: string, pantone: string, coverage: number): PackManifestInk => ({
    index,
    role: 'ink',
    hex,
    clientName,
    pantone,
    base: dark ? 'HB Opaque' : 'HB Neutral',
    coverage,
    lpi: 55,
    angleDeg: 22.5,
    mesh: 230,
  });
  const colours = [ink(0, '#ED90DC', 'Orchid pink', 'PANTONE 237 C', 0.099), ink(0, '#C363DA', 'Violet', 'PANTONE 2582 C', 0.063), ink(0, '#5456AC', 'Indigo', 'PANTONE 2726 C', 0.09), ink(0, '#3E0E61', 'Deep purple', 'PANTONE 2685 C', 0.055)];
  const white = (index: number, role: 'underbase' | 'highlight', coverage: number): PackManifestInk => ({
    index,
    role,
    hex: '#F2F2F0',
    clientName: role === 'underbase' ? 'White underbase' : 'Highlight white',
    pantone: null,
    base: role === 'underbase' ? 'Aquaflex V2 White · flash' : 'Aquaflex V2 White',
    coverage,
    lpi: 55,
    angleDeg: 22.5,
    mesh: 200,
  });
  const list = dark ? [white(1, 'underbase', 0.147), ...colours, white(6, 'highlight', 0.015)] : colours;
  return list.map((entry, i) => ({ ...entry, index: i + 1 }));
};

const sheetFile = (middle: string, ext: string) => `MF-UNDERWRITER-v3-FRONT-CHEST-${middle}.${ext}`;
const sheetColours = [
  { code: 'C002', name: 'Black', hex: '#1B1C1E' },
  { code: 'C727', name: 'French Navy', hex: '#222A3D' },
  { code: 'C001', name: 'White', hex: '#F3F3F1' },
];

export const MOCK_JOB_SHEET: Omit<JobSheetInput, 'generatedAt' | 'proofs'> = {
  design: { code: 'MF-UNDERWRITER', name: 'Underwriter', shopName: 'Underwriter band shop', versionNumber: 3, approvedAt: '2026-10-15T09:10:00.000Z' },
  packStatus: '2 of 3 files approved by pre-press',
  // The standard collar distance isn't set yet (lib/mockups/placements.ts), so placements say "Standard position".
  placementNotes: [COLLAR_DISTANCE_UNSET_NOTE],
  garments: [
    ...sheetColours.map((c) => ({
      blankCode: 'STTU169',
      blankName: 'Classic tee',
      colourCode: c.code,
      colourName: c.name,
      colourHex: c.hex,
      placement: PLACEMENT,
      method: 'dtg_dtf' as const,
      methodLabel: 'DTG/DTF',
      setName: null,
      file: sheetFile(`DTG-${c.name.toUpperCase().replace(/ /g, '-')}`, 'png'),
      note: null,
      usedBy: ['Shop · Underwriter tee'],
    })),
    ...sheetColours.map((c) => ({
      blankCode: 'STTU169',
      blankName: 'Classic tee',
      colourCode: c.code,
      colourName: c.name,
      colourHex: c.hex,
      placement: PLACEMENT,
      method: 'screen' as const,
      methodLabel: c.code === 'C001' ? 'Screen · Lights' : 'Screen · Darks',
      setName: c.code === 'C001' ? 'Lights' : 'Darks',
      file: sheetFile(c.code === 'C001' ? 'LIGHTS' : 'DARKS', 'psd'),
      note: null,
      usedBy: ['Run 2'],
    })),
  ],
  screenSets: (['Darks', 'Lights'] as const).map((setName) => ({
    setName,
    blankCode: 'STTU169',
    blankName: 'Classic tee',
    placement: PLACEMENT,
    colours: setName === 'Darks' ? ['Black', 'French Navy'] : ['White'],
    file: sheetFile(setName.toUpperCase(), 'psd'),
    method: 'sim_process' as const,
    printSize: SIZE,
    inks: sheetInks(setName === 'Darks'),
    underbaseChokeMm: 0.2,
    trapMm: 0.25,
    system: DEFAULT_INK_SYSTEM,
    note: null,
  })),
  dtgPacks: [
    {
      blankCode: 'STTU169',
      blankName: 'Classic tee',
      placement: PLACEMENT,
      printSize: '280 × 336 mm at 300 ppi',
      fadeLpi: 45,
      files: sheetColours.map((c) => ({
        colourCode: c.code,
        colourName: c.name,
        file: sheetFile(`DTG-${c.name.toUpperCase().replace(/ /g, '-')}`, 'png'),
        widthPx: 3307,
        heightPx: 3969,
        ppi: 300,
        sizeMm: { width: 280, height: 336 },
        offsetMm: { x: 0, y: 0 },
        whitesTransparent: c.code === 'C001',
        fadeShare: 0.08,
      })),
    },
  ],
  checks: [
    { label: 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm', checks: MOCK_PACK_DETAIL.checks },
    { label: 'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm', checks: [{ id: 'size', title: 'Size', state: 'passed', detail: 'Pixel size matches the print size at 300 ppi.' }] },
  ],
  pieces: {
    sizes: ['S', 'M', 'L', 'XL'],
    rows: [
      { blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C002', colourName: 'Black', sizes: { S: 20, M: 40, L: 40 }, total: 100, from: [{ ref: 'Run 2 · ORD-1A2B3C4D', qty: 100 }] },
      { blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C727', colourName: 'French Navy', sizes: { M: 20 }, total: 20, from: [{ ref: 'Run 2 · ORD-1A2B3C4D', qty: 20 }] },
      { blankCode: 'STTU169', blankName: 'Classic tee', colourCode: 'C001', colourName: 'White', sizes: { M: 30, L: 8, XL: 2 }, total: 40, from: [{ ref: 'Run 2 · ORD-1A2B3C4D', qty: 38 }, { ref: 'ORD-3F9A2C1B', qty: 2 }] },
    ],
    total: 160,
    orders: 2,
  },
  audits: [
    { label: 'Screen · Darks · Classic tee (STTU169) · Front chest · 28 cm', state: 'waiting', by: null, at: null },
    { label: 'Screen · Lights · Classic tee (STTU169) · Front chest · 28 cm', state: 'approved', by: 'Sample Owner', at: '2026-10-15T12:30:00.000Z' },
    { label: 'DTG/DTF · Classic tee (STTU169) · Front chest · 28 cm', state: 'approved', by: 'Sample Owner', at: '2026-10-15T12:31:00.000Z' },
  ],
};

/** The proofs the sample sheet shows: a garment colour with a stand-in print, drawn when the sheet is made. */
export const MOCK_JOB_SHEET_PROOFS: { colourName: string; label: string; hex: string }[] = [
  { colourName: 'Black', label: 'DTG/DTF', hex: '#1B1C1E' },
  { colourName: 'French Navy', label: 'DTG/DTF', hex: '#222A3D' },
  { colourName: 'White', label: 'DTG/DTF', hex: '#F3F3F1' },
  { colourName: 'Black', label: 'Screen · Darks', hex: '#1B1C1E' },
  { colourName: 'French Navy', label: 'Screen · Darks', hex: '#222A3D' },
  { colourName: 'White', label: 'Screen · Lights', hex: '#F3F3F1' },
];
