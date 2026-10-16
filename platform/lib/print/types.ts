// Shared types for print prep (Documentation/Dev/Print-Prep-Plan.md and
// Print-Prep-Build.md). Every size is a physical unit: mm, ppi, lpi, degrees.
// Pixel sizes appear only on rasters, always with the ppi they were made at.
// Client-safe: types and constants only.

export type Mm = number;
export type Ppi = number;
export type Lpi = number;
export type Degrees = number;
/** '#RRGGBB', uppercase */
export type Hex = string;

/** CIE Lab, D50 (the space ΔE2000 is defined in). */
export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** 8-bit sRGB pixels, row-major, channels interleaved (RGBA when channels = 4). */
export interface Raster {
  width: number;
  height: number;
  channels: 1 | 3 | 4;
  data: Uint8Array;
  ppi: Ppi;
}

/** One film's pixels: 1 byte per pixel, 255 = ink (black on the film), 0 = clear.
 * After halftoning every value is 0 or 255. */
export interface Plate {
  width: number;
  height: number;
  ppi: Ppi;
  data: Uint8Array;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Fractions (0..1) of a packshot image, as in lib/mockups/placements.ts. */
export interface FractionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PrintTechnique = 'screen' | 'dtg_dtf';
export type ScreenMethod = 'spot' | 'index' | 'sim_process';

// ---------------------------------------------------------------------------
// Placement, garments
// ---------------------------------------------------------------------------

/** Where the print goes. `position` matches lib/mockups/placements.ts keys. */
export interface PrintPlacement {
  position: string;
  widthMm: Mm;
  /** how far the product moves the print from the standard position of this blank and position, when it
   * set one (positive = lower, as offsetYcm in lib/services/products.ts). It is not a distance from the
   * collar: that is the standard collar distance (lib/mockups/placements.ts, not set yet) plus this. */
  offsetYMm?: Mm;
}

export interface GarmentColour {
  /** supplier colour code, e.g. 'C002' */
  code: string;
  name: string;
  hex: Hex;
  isLight: boolean;
}

/** A garment photo plus the print box for the placement, for proofs. */
export interface PackshotInput {
  /** encoded image (png, webp or jpeg) */
  image: Buffer;
  printBox: FractionRect;
}

// ---------------------------------------------------------------------------
// Recipe and ink system
// ---------------------------------------------------------------------------

export interface HalftoneSpec {
  lpi: Lpi;
  angleDeg: Degrees;
  dot: 'round' | 'ellipse';
  /** smallest dot the mesh holds, 0..1 of a cell; lighter tones drop out */
  minDot: number;
  /** largest dot before it is printed solid, 0..1 */
  maxDot: number;
}

/** How a design is prepared. Code defaults (lib/print/defaults.ts), then the
 * capsule's printRecipe, then the print_recipes table, then an auditor's re-run. */
export interface PrintRecipe {
  method: ScreenMethod | 'auto';
  /** screens on press including underbase and highlight white: 1..15 (8 standard) */
  maxScreens: number;
  screenPpi: Ppi;
  halftone: HalftoneSpec;
  underbaseChokeMm: Mm;
  trapMm: Mm;
  /** islands smaller than this are removed */
  minFeatureMm: Mm;
  /** lines thinner than this raise a warning */
  minLineMm: Mm;
  /** ΔE2000 from the garment colour under which art pixels are knocked out */
  knockoutDeltaE: number;
  highlightWhite: boolean;
  /** inks the design must use, if the capsule or auditor locks them */
  lockedInks?: Hex[];
  /** index separations: square cells per inch on the film (200 when absent; lib/print/engine/index-cells.ts) */
  indexCellPpi?: Ppi;
  dtg: {
    ppi: Ppi;
    fadeLpi: Lpi;
    fadeAngleDeg: Degrees;
    /** width of the hard-edge band thresholded at 50% instead of halftoned */
    edgeBandPx: number;
  };
  marks: {
    /** clear margin around the art on screen PSDs */
    marginMm: Mm;
    /** registration targets sit this far outside the art */
    targetOffsetMm: Mm;
  };
}

/** A partial recipe: capsule defaults, a print_recipes row, a re-run. */
export type RecipeOverride = Partial<Omit<PrintRecipe, 'halftone' | 'dtg' | 'marks'>> & {
  halftone?: Partial<HalftoneSpec>;
  dtg?: Partial<PrintRecipe['dtg']>;
  marks?: Partial<PrintRecipe['marks']>;
};

/** The shop's ink system (MagnaPrint HB by default), editable in admin. */
export interface InkSystemProfile {
  name: string;
  bases: {
    /** colour base on light garments */
    light: string;
    /** colour base on dark garments, over the underbase */
    dark: string;
  };
  /** 0..1 coverage of what is underneath, per base or white ink */
  opacity: Record<string, number>;
  underbase: { ink: string; flash: { seconds: number; celsius: number } };
  highlightWhite: { ink: string };
  /** threads per inch */
  mesh: { min: number; max: number; halftone: number; solid: number; underbase: number };
  cure: { minutesMin: number; minutesMax: number; celsius: number };
  pigmentMaxPct: number;
  offContactMm: [number, number];
  squeegee: string;
  /** print heads on the press; more screens are flagged for planning */
  pressHeads: number;
  /** false until inks are measured with a spectrophotometer */
  measured: boolean;
  /** Phase 2: dot gain measured from a printed test chart; absent means linear (no compensation) */
  dotGain?: DotGainProfile;
}

/** Measured dot gain of the press and ink system (Phase 2, lib/print/calibration). */
export interface DotGainProfile {
  /** ISO timestamp of the measurement */
  measuredAt: string;
  /** how the printed chart was read */
  method: 'manual' | 'scan' | 'spectro';
  /** the screen the chart was printed with */
  lpi: number;
  angleDeg: number;
  mesh: number;
  /** film coverage in (0..1) against the coverage measured on the garment (0..1), ascending input */
  points: { input: number; printed: number }[];
}

// ---------------------------------------------------------------------------
// Engine output (WP1)
// ---------------------------------------------------------------------------

export interface Warning {
  /** stable id, e.g. 'thin_lines', 'low_resolution', 'needs_sim_process' */
  code: string;
  message: string;
  severity: 'info' | 'review' | 'block';
}

/** Text for the label strip on every film. */
export interface PlateLabelInfo {
  designCode: string;
  version: number;
  placementLabel: string;
}

export interface CanvasSpec {
  widthPx: number;
  heightPx: number;
  ppi: Ppi;
  marginMm: Mm;
  /** where the print area sits inside the canvas */
  art: PixelRect;
}

export type PlateRole = 'underbase' | 'ink' | 'highlight';

export interface InkPlate {
  /** 1-based press order */
  index: number;
  role: PlateRole;
  /** the colour the engine chose from the art */
  target: { hex: Hex; lab: Lab };
  /** HB Opaque, HB Neutral, Aquaflex V2 White... */
  base: string;
  /** admin only: Pantone code from the house library, filled by the pipeline */
  pantone?: string | null;
  /** the plain colour name clients see (lib/print/colour-names.ts) */
  clientName?: string;
  /** full canvas size, binary, with marks and label strip drawn in */
  plate: Plate;
  /** 0..1 of the print area */
  coverage: number;
  halftone: HalftoneSpec;
  meshSuggestion: number;
}

export interface ScreenSet {
  /** 'darks', 'lights', or a colour code when a garment needs its own set */
  key: string;
  garmentCodes: string[];
  needsUnderbase: boolean;
  method: ScreenMethod;
  canvas: CanvasSpec;
  /** press order */
  plates: InkPlate[];
  warnings: Warning[];
  /** the set's garment colours, when known: a proof or loupe made later (a
   * set rebuilt from a corrected PSD keeps them) finds the shirt colour here */
  garments?: GarmentColour[];
  /** why this set has its method: sets of one separation can differ (darks
   * simulated process, lights spot), so each pack says its own */
  methodReason?: string;
}

export interface SeparationInput {
  /** RGBA sRGB at its source resolution */
  art: Raster;
  placement: PrintPlacement;
  garments: GarmentColour[];
  recipe: PrintRecipe;
  inks: InkSystemProfile;
  label: PlateLabelInfo;
}

export interface ScreenSeparationResult {
  method: ScreenMethod;
  methodReason: string;
  /** Phase 1 builds spot separations; art that needs index or simulated
   * process gets a best-effort spot draft and this flag for the auditor. */
  needsManual: boolean;
  sets: ScreenSet[];
  warnings: Warning[];
}

export interface DtgInput {
  art: Raster;
  placement: PrintPlacement;
  garments: GarmentColour[];
  recipe: PrintRecipe;
}

export interface DtgLayer {
  garmentCode: string;
  /** RGBA at recipe.dtg.ppi, alpha only 0 or 255, cropped to the art bounds */
  raster: Raster;
  /** where the crop sits in the full print area, at the same ppi */
  offsetPx: { x: number; y: number };
  printAreaPx: { width: number; height: number };
  /** share of printed pixels that are halftoned fades */
  fadeShare: number;
  /** true on white garments: the art's whites print no ink */
  whitesTransparent: boolean;
}

export interface DtgResult {
  layers: DtgLayer[];
  warnings: Warning[];
}

export interface ProofRequest {
  garment: GarmentColour;
  packshot: PackshotInput;
  placement: PrintPlacement;
}

export interface ProofImage {
  garmentCode: string;
  technique: PrintTechnique;
  /** webp, about 1000 px wide, drawn from the plates or the DTG layer */
  image: Buffer;
  width: number;
  height: number;
  /** share (0..1) of the print's height that runs past the bottom of the garment's print box; the proof
   * shows it at true size all the same */
  overflow?: number;
}

/** A true-size crop showing the dots. */
export interface LoupeImage {
  technique: PrintTechnique;
  garmentCode: string;
  /** png at print resolution */
  image: Buffer;
  ppi: Ppi;
}

// ---------------------------------------------------------------------------
// Production pack (WP2)
// ---------------------------------------------------------------------------

/** 'dtg_zip' is every garment colour's DTG/DTF PNG in one zip, for the
 * pre-press download; it is not one of the files the checks re-open. There is
 * no job sheet kind: the job sheet is one per design, not a file of a pack
 * (lib/services/job-sheets.ts). */
export type PackFileKind = 'screen_psd' | 'dtg_psd' | 'dtg_png' | 'dtg_zip' | 'proof' | 'loupe' | 'film_preview' | 'manifest';

export interface PackFile {
  kind: PackFileKind;
  name: string;
  /** print storage key (lib/services/print-storage.ts) */
  key: string;
  visibility: 'public' | 'private';
  contentType: string;
  sha256: string;
  bytes: number;
  widthPx?: number;
  heightPx?: number;
  ppi?: Ppi;
  garmentCode?: string;
  plateIndex?: number;
}

export interface OriginalArt {
  bytes: Buffer;
  filename: string;
  mime: string;
  widthPx: number;
  heightPx: number;
}

export interface ScreenPsdInput {
  set: ScreenSet;
  garments: GarmentColour[];
  original: OriginalArt;
  label: PlateLabelInfo;
  inks: InkSystemProfile;
}

export interface DtgPsdInput {
  layers: DtgLayer[];
  garments: GarmentColour[];
  original: OriginalArt;
  label: PlateLabelInfo;
}

/** What a re-uploaded (corrected) screen PSD contains. */
export interface ParsedScreenPsd {
  widthPx: number;
  heightPx: number;
  ppi: Ppi;
  plates: { index: number; name: string; plate: Plate }[];
  garmentLayers: string[];
  hasOriginal: boolean;
  /** colour overlays were left on (the engine switches them off again) */
  effectsOn: boolean;
  warnings: Warning[];
}

export interface PackManifestInk {
  index: number;
  role: PlateRole;
  hex: Hex;
  clientName: string;
  /** admin only */
  pantone: string | null;
  base: string;
  coverage: number;
  lpi: Lpi;
  angleDeg: Degrees;
  mesh: number;
}

export interface PackManifest {
  schema: 1;
  engineVersion: string;
  createdAt: string;
  designId: string;
  designVersionId: string;
  versionNumber: number;
  placement: PrintPlacement;
  technique: PrintTechnique;
  screenSetKey: string | null;
  garmentCodes: string[];
  method: ScreenMethod | 'dtg';
  screenCount: number | null;
  inks: PackManifestInk[];
  files: PackFile[];
  /** sha256 of the job input that produced this pack */
  inputHash: string;
}

export interface CheckResult {
  /** stable id: 'structure', 'size', 'plates', 'marks', 'screens', 'features', 'dtg_alpha', 'whites', 'proof', 'inks_measured' */
  id: string;
  title: string;
  state: 'passed' | 'review' | 'failed';
  detail: string;
}

export interface ChecksInput {
  technique: PrintTechnique;
  manifest: PackManifest;
  /** the files as written, re-opened with a decoder other than the writer's */
  files: { file: PackFile; bytes: Buffer }[];
  recipe: PrintRecipe;
  inks: InkSystemProfile;
  garments: GarmentColour[];
  /** what the engine rendered, to compare coverage */
  expected: { set?: ScreenSet; dtgLayers?: DtgLayer[] };
  /** the proof the client approved, when re-checking a corrected pack */
  approvedProof?: Buffer;
}

// ---------------------------------------------------------------------------
// Job sheet (Plan 6.3): one per design, covering every garment that uses it.
// What the renderer (lib/print/pack/job-sheet.ts) draws and the service
// (lib/services/job-sheets.ts) works out. Words are worked out by the service,
// so the model is plain data the renderer only lays out.
// ---------------------------------------------------------------------------

/** How a garment prints. 'none' is a method with no print file to make (embroidery). */
export type JobSheetMethod = 'dtg_dtf' | 'screen' | 'none';

/** One row of the garments table: a blank in a colour at a placement, how it
 * prints, and the file to use. */
export interface JobSheetGarment {
  blankCode: string;
  /** the name people read for the blank (lib/catalog/display-names.ts) */
  blankName: string;
  colourCode: string;
  colourName: string;
  colourHex: Hex | null;
  /** 'Front chest · 28 cm wide · Standard position, 2 cm lower', or '... · 8.5 cm below the collar' once the standard collar distance is set */
  placement: string;
  method: JobSheetMethod;
  /** 'DTG/DTF', 'Screen · Darks', 'Embroidery' */
  methodLabel: string;
  /** screen only: the set the colour prints in, 'Darks' or 'Lights' */
  setName: string | null;
  /** the file to use: the set's screen PSD or the colour's DTG PNG; null when there is none yet */
  file: string | null;
  /** says why there is no file ('No print file yet') */
  note: string | null;
  /** what asks for it ('Shop · Underwriter tee', 'Run 2'); one row can serve several */
  usedBy: string[];
}

/** One screen set: its inks in print order and what the press needs. */
export interface JobSheetScreenSet {
  /** 'Darks', 'Lights', or a colour's name */
  setName: string;
  blankCode: string;
  blankName: string;
  placement: string;
  /** the garment colours the set prints on */
  colours: string[];
  /** the set's screen PSD; null when nothing prints on it */
  file: string | null;
  method: ScreenMethod;
  /** '280 × 336 mm at 600 ppi' */
  printSize: string | null;
  inks: PackManifestInk[];
  underbaseChokeMm: number | null;
  trapMm: number | null;
  /** the shop's ink system as the set was built with it: base, flash, cure, mesh, press heads */
  system: InkSystemProfile;
  /** why nothing prints, when nothing does */
  note: string | null;
}

export interface JobSheetDtgFile {
  colourCode: string;
  colourName: string;
  file: string | null;
  widthPx: number;
  heightPx: number;
  ppi: number;
  sizeMm: { width: number; height: number };
  /** where the crop sits in the print area */
  offsetMm: { x: number; y: number };
  whitesTransparent: boolean;
  /** share of printed pixels that are halftoned fades */
  fadeShare: number;
}

/** The DTG/DTF files of one blank at one placement, a PNG per garment colour. */
export interface JobSheetDtgPack {
  blankCode: string;
  blankName: string;
  placement: string;
  printSize: string | null;
  /** the halftone ruling of fades, from the recipe the pack was built with */
  fadeLpi: number | null;
  files: JobSheetDtgFile[];
}

export interface JobSheetProof {
  colourName: string;
  /** what the proof shows beyond the colour: 'DTG/DTF', 'Screen · Darks' (with the blank when there are several) */
  label: string;
  image: Buffer;
}

export interface JobSheetChecks {
  /** 'Screen · Darks · T-shirt (STTU169) · Front chest' */
  label: string;
  checks: CheckResult[];
}

/** Pieces in open orders for one garment colour: sizes added up across orders. */
export interface JobSheetPieceRow {
  blankCode: string;
  blankName: string;
  colourCode: string;
  colourName: string;
  /** size -> pieces */
  sizes: Record<string, number>;
  total: number;
  /** the orders and runs the pieces come from: 'Run 2 · ORD-1A2B3C4D', 'ORD-3F9A2C1B' */
  from: { ref: string; qty: number }[];
}

export interface JobSheetPieces {
  /** every size on any row, small to large */
  sizes: string[];
  rows: JobSheetPieceRow[];
  total: number;
  /** open orders counted (a run is one order) */
  orders: number;
}

export type JobSheetAuditState = 'idle' | 'waiting' | 'being_fixed' | 'approved' | 'sent_back';

/** Where one production file stands with pre-press. */
export interface JobSheetAudit {
  label: string;
  state: JobSheetAuditState;
  /** who approved it, and when (ISO), once it is approved */
  by: string | null;
  at: string | null;
}

export interface JobSheetInput {
  /** ISO time the sheet is made; printed on it, and not part of what makes a sheet different */
  generatedAt: string;
  design: {
    /** 'MF-UNDERWRITER-TEE' */
    code: string;
    name: string;
    shopName: string;
    /** null when nothing was prepared yet */
    versionNumber: number | null;
    /** when the artist approved this version (ISO); null when they haven't */
    approvedAt: string | null;
  };
  /** pre-press' progress over the design's files, in a phrase */
  packStatus: string;
  garments: JobSheetGarment[];
  /** small notes under the garments table (the standard collar distance isn't set, so placements say "Standard position") */
  placementNotes: string[];
  screenSets: JobSheetScreenSet[];
  dtgPacks: JobSheetDtgPack[];
  proofs: JobSheetProof[];
  checks: JobSheetChecks[];
  pieces: JobSheetPieces;
  audits: JobSheetAudit[];
}

// ---------------------------------------------------------------------------
// Jobs and pipeline (WP5, WP7)
// ---------------------------------------------------------------------------

export type PrintJobKind = 'prepare' | 'rerun' | 'reupload';

export interface RerunSettings {
  method?: ScreenMethod;
  maxScreens?: number;
  lpi?: Lpi;
  angleDeg?: Degrees;
  underbaseChokeMm?: Mm;
  trapMm?: Mm;
  /** replace the ink at a press position with another colour */
  inkSubstitutions?: { plateIndex: number; hex: Hex }[];
}

export interface PrintJobInput {
  designId: string;
  designVersionId: string;
  storeId: string;
  /** one blank per job; every garment colour the drop uses */
  blankCode: string;
  garmentCodes: string[];
  placements: PrintPlacement[];
  techniques: PrintTechnique[];
  /** fully resolved recipe (defaults, capsule, overrides, re-run settings) */
  recipe: PrintRecipe;
  inkSystemId?: string | null;
  rerun?: { packId: string; settings: RerunSettings };
  /** `key` is a corrected PSD, or the pack's own PSD for a refresh of its Pantone codes */
  reupload?: { packId: string; key: string };
}

export interface PrintJobResult {
  packIds: string[];
  warnings: Warning[];
}

/** Why a pack is in the pre-press queue. */
export type PackNeed =
  | { kind: 'shop_order'; orderId: string; at: string }
  | { kind: 'run'; bulkOrderId: string; orderId?: string; qty: number; at: string };
