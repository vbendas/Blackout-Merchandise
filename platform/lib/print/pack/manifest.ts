// manifest.json (Plan 6.3): the pack in machine-readable form. Beyond the
// contract's PackManifest it records a hash of each input (design version,
// recipe, garments, placement, ink system), the print size, the screen set and
// where each DTG/DTF crop sits, so a file on the press can always be traced
// back to exactly what made it.
import { ENGINE_VERSION } from '@/lib/print/defaults';
import type {
  DtgLayer,
  GarmentColour,
  InkPlate,
  InkSystemProfile,
  PackFile,
  PackFileKind,
  PackManifest,
  PackManifestInk,
  PixelRect,
  PlateLabelInfo,
  PrintPlacement,
  PrintRecipe,
  PrintTechnique,
  ScreenMethod,
  ScreenSet,
  Warning,
} from '@/lib/print/types';
import { canonicalJson, hashJson, sha256Hex } from './hash';

export interface BuildManifestInput {
  designId: string;
  designVersionId: string;
  versionNumber: number;
  placement: PrintPlacement;
  technique: PrintTechnique;
  screenSetKey: string | null;
  garmentCodes: string[];
  method: ScreenMethod | 'dtg';
  plates?: InkPlate[];
  files: PackFile[];
  inputHash: string;
  /** ISO time; pass the job's time to keep the manifest reproducible */
  createdAt?: string;
  label?: PlateLabelInfo;
  /** sha256 of the approved art the pack was made from */
  artSha256?: string;
  recipe?: PrintRecipe;
  garments?: GarmentColour[];
  inkSystem?: InkSystemProfile;
  /** the ink_systems row id or version the job used */
  inkSystemVersion?: string;
  /** the screen set, for sizes, press heads and warnings */
  set?: ScreenSet;
  /** the DTG/DTF layers, for crop offsets and placement */
  dtgLayers?: DtgLayer[];
}

export interface ManifestDtgFile {
  garmentCode: string;
  widthPx: number;
  heightPx: number;
  ppi: number;
  /** where the crop sits in the print area */
  offsetPx: { x: number; y: number };
  offsetMm: { x: number; y: number };
  sizeMm: { width: number; height: number };
  printAreaPx: { width: number; height: number };
  whitesTransparent: boolean;
  fadeShare: number;
}

export interface PackManifestDetail extends PackManifest {
  designCode?: string;
  placementLabel?: string;
  inputs: {
    designVersionId: string;
    artSha256: string | null;
    recipeSha256: string | null;
    garmentsSha256: string | null;
    placementSha256: string;
    inkSystemSha256: string | null;
    inkSystemVersion: string | null;
  };
  print?: {
    ppi: number;
    widthMm: number;
    heightMm: number;
    canvasPx?: { width: number; height: number };
    artPx?: PixelRect;
    marginMm?: number;
  };
  screenSet?: {
    key: string;
    garmentCodes: string[];
    needsUnderbase: boolean;
    method: ScreenMethod;
    screens: number;
    /** screens above 8, each €1 per piece on screen-printed runs */
    extraScreens: number;
    pressHeads: number | null;
    overPressHeads: boolean;
    warnings: Warning[];
  };
  dtg?: ManifestDtgFile[];
  garments?: GarmentColour[];
}

const STANDARD_SCREENS = 8;

const round = (v: number, places = 4) => Math.round(v * 10 ** places) / 10 ** places;
const pxToMm = (px: number, ppi: number) => round((px * 25.4) / ppi, 2);

/** The mesh for a film: the engine's suggestion when it is inside the ink
 * system's range, else the profile's default for the role (halftone films on
 * the finer end, Plan 5). */
export function suggestMesh(plate: Pick<InkPlate, 'role' | 'meshSuggestion'>, inks?: InkSystemProfile): number {
  const m = plate.meshSuggestion;
  if (!inks) return m > 0 ? m : 0;
  if (m >= inks.mesh.min && m <= inks.mesh.max) return m;
  return plate.role === 'underbase' ? inks.mesh.underbase : inks.mesh.halftone;
}

export function manifestInks(plates: InkPlate[], inks?: InkSystemProfile): PackManifestInk[] {
  return [...plates]
    .sort((a, b) => a.index - b.index)
    .map((p) => ({
      index: p.index,
      role: p.role,
      hex: p.target.hex.toUpperCase(),
      clientName: p.clientName ?? '',
      pantone: p.pantone ?? null,
      base: p.base,
      coverage: round(p.coverage, 5),
      lpi: p.halftone.lpi,
      angleDeg: p.halftone.angleDeg,
      mesh: suggestMesh(p, inks),
    }));
}

export function buildPackManifest(input: BuildManifestInput): PackManifestDetail {
  const plates = input.plates ?? input.set?.plates ?? [];
  const manifest: PackManifestDetail = {
    schema: 1,
    engineVersion: ENGINE_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    designId: input.designId,
    designVersionId: input.designVersionId,
    versionNumber: input.versionNumber,
    placement: input.placement,
    technique: input.technique,
    screenSetKey: input.screenSetKey,
    garmentCodes: input.garmentCodes,
    method: input.method,
    screenCount: input.technique === 'screen' ? plates.length : null,
    inks: input.technique === 'screen' ? manifestInks(plates, input.inkSystem) : [],
    files: input.files,
    inputHash: input.inputHash,
    inputs: {
      designVersionId: input.designVersionId,
      artSha256: input.artSha256 ?? null,
      recipeSha256: input.recipe ? hashJson(input.recipe) : null,
      garmentsSha256: input.garments ? hashJson(input.garments.filter((g) => input.garmentCodes.includes(g.code))) : null,
      placementSha256: hashJson(input.placement),
      inkSystemSha256: input.inkSystem ? hashJson(input.inkSystem) : null,
      inkSystemVersion: input.inkSystemVersion ?? null,
    },
  };
  if (input.label) {
    manifest.designCode = input.label.designCode;
    manifest.placementLabel = input.label.placementLabel;
  }
  if (input.garments) manifest.garments = input.garments.filter((g) => input.garmentCodes.includes(g.code));

  const set = input.set;
  if (set) {
    const { canvas } = set;
    manifest.print = {
      ppi: canvas.ppi,
      widthMm: pxToMm(canvas.art.width, canvas.ppi),
      heightMm: pxToMm(canvas.art.height, canvas.ppi),
      canvasPx: { width: canvas.widthPx, height: canvas.heightPx },
      artPx: canvas.art,
      marginMm: canvas.marginMm,
    };
    const heads = input.inkSystem?.pressHeads ?? null;
    manifest.screenSet = {
      key: set.key,
      garmentCodes: set.garmentCodes,
      needsUnderbase: set.needsUnderbase,
      method: set.method,
      screens: set.plates.length,
      extraScreens: Math.max(0, set.plates.length - STANDARD_SCREENS),
      pressHeads: heads,
      overPressHeads: heads !== null && set.plates.length > heads,
      warnings: set.warnings,
    };
  }

  if (input.dtgLayers?.length) {
    const first = input.dtgLayers[0];
    manifest.print ??= {
      ppi: first.raster.ppi,
      widthMm: pxToMm(first.printAreaPx.width, first.raster.ppi),
      heightMm: pxToMm(first.printAreaPx.height, first.raster.ppi),
    };
    manifest.dtg = input.dtgLayers.map((l) => ({
      garmentCode: l.garmentCode,
      widthPx: l.raster.width,
      heightPx: l.raster.height,
      ppi: l.raster.ppi,
      offsetPx: l.offsetPx,
      offsetMm: { x: pxToMm(l.offsetPx.x, l.raster.ppi), y: pxToMm(l.offsetPx.y, l.raster.ppi) },
      sizeMm: { width: pxToMm(l.raster.width, l.raster.ppi), height: pxToMm(l.raster.height, l.raster.ppi) },
      printAreaPx: l.printAreaPx,
      whitesTransparent: l.whitesTransparent,
      fadeShare: round(l.fadeShare, 4),
    }));
  }
  return manifest;
}

/** The manifest file: sorted keys, two-space indent, trailing newline. */
export function manifestJson(manifest: PackManifest): Buffer {
  return Buffer.from(`${JSON.stringify(JSON.parse(canonicalJson(manifest)), null, 2)}\n`, 'utf8');
}

const CONTENT_TYPES: Record<string, string> = {
  psd: 'image/vnd.adobe.photoshop',
  psb: 'image/vnd.adobe.photoshop',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  json: 'application/json',
};

export interface DescribeFileInput {
  kind: PackFileKind;
  name: string;
  key: string;
  bytes: Buffer;
  visibility?: 'public' | 'private';
  contentType?: string;
  widthPx?: number;
  heightPx?: number;
  ppi?: number;
  garmentCode?: string;
  plateIndex?: number;
}

/** A PackFile entry with its hash and size worked out. Production files are
 * private; proofs and loupes, which the Studio shows, are public by default. */
export function describePackFile(input: DescribeFileInput): PackFile {
  const ext = input.name.split('.').pop()?.toLowerCase() ?? '';
  const file: PackFile = {
    kind: input.kind,
    name: input.name,
    key: input.key,
    visibility: input.visibility ?? (input.kind === 'proof' || input.kind === 'loupe' ? 'public' : 'private'),
    contentType: input.contentType ?? CONTENT_TYPES[ext] ?? 'application/octet-stream',
    sha256: sha256Hex(input.bytes),
    bytes: input.bytes.length,
  };
  if (input.widthPx !== undefined) file.widthPx = input.widthPx;
  if (input.heightPx !== undefined) file.heightPx = input.heightPx;
  if (input.ppi !== undefined) file.ppi = input.ppi;
  if (input.garmentCode !== undefined) file.garmentCode = input.garmentCode;
  if (input.plateIndex !== undefined) file.plateIndex = input.plateIndex;
  return file;
}
