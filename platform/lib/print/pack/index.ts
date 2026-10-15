// Production pack files (WP2): the screen PSD (one black-dot layer per ink,
// printed one by one like Separation Studio NXT files), the DTG/DTF PSD and
// PNGs, the manifest, the automatic checks and the job sheet. Server only: the
// print worker runs these, never a request handler.
import type {
  CheckResult,
  ChecksInput,
  DtgLayer,
  DtgPsdInput,
  InkPlate,
  JobSheetInput,
  PackManifest,
  ParsedScreenPsd,
  PlateLabelInfo,
  ScreenPsdInput,
  ScreenSet,
} from '@/lib/print/types';
import { runPackChecks } from './checks';
import { renderFilmPreviewPng } from './film-preview';
import { renderJobSheetPdf } from './job-sheet';
import { buildPackManifest, type BuildManifestInput } from './manifest';
import { encodePng } from './png';
import { readScreenPsdDetail } from './psd-read';
import { writeDtgPsdWithStats, writeScreenPsdWithStats } from './psd-write';
import { SRGB_PROFILE_NAME, srgbIccProfile } from './srgb-icc';

export type { BuildManifestInput, PackManifestDetail, ManifestDtgFile, DescribeFileInput } from './manifest';
export { buildPackManifest, describePackFile, manifestJson, manifestInks, suggestMesh } from './manifest';
export type { ParsedScreenPsdDetail, ScreenPsdDiff, FilmChange, PsdReadErrorCode } from './psd-read';
export { PsdReadError, diffScreenPsd, readScreenPsdDetail, rebuildScreenSet } from './psd-read';
export type { PsdWriteOptions, PsdWriteStats } from './psd-write';
export { writeScreenPsdWithStats, writeDtgPsdWithStats } from './psd-write';
export type { ProofComparison, ProofVerdict } from './proof-compare';
export { compareProofs, PROOF_THRESHOLDS } from './proof-compare';
export {
  ORIGINAL_LAYER_NAME,
  dtgLayerName,
  dtgPngFileName,
  dtgPsdFileName,
  garmentLayerName,
  packFileStem,
  parsePlateLayerName,
  plateLayerName,
  screenPsdFileName,
} from './names';
export { sha256Hex } from './hash';

/** False for a set where nothing prints: the engine returns it with no films
 * and a blocking warning (black art on a black shirt). Such a set gets no PSD,
 * previews or proofs; runChecks turns the warning into its check result. */
export function screenSetPrints(set: ScreenSet): boolean {
  return set.plates.length > 0;
}

/** RGB 8-bit PSD at the set's ppi: plates as layers in press order, colour
 * overlays switched off, hidden garment fills, the ORIGINAL smart object.
 * Never an empty PSD: a set with no films (see screenSetPrints) comes back as
 * an empty Buffer, for the caller to skip, rather than an error. */
export async function writeScreenPsd(input: ScreenPsdInput): Promise<Buffer> {
  if (!screenSetPrints(input.set)) return Buffer.alloc(0);
  return (await writeScreenPsdWithStats(input)).bytes;
}

/** RGB 8-bit PSD at the DTG ppi: one layer per garment colour plus ORIGINAL. */
export async function writeDtgPsd(input: DtgPsdInput): Promise<Buffer> {
  return (await writeDtgPsdWithStats(input)).bytes;
}

/** What Brother GTX Graphics Lab opens: RGBA, sRGB ICC, ppi set, alpha 0/255.
 * The pixels go out exactly as the engine made them; the checks catch any that
 * aren't print-ready rather than the writer quietly fixing them. */
export async function writeDtgPng(layer: DtgLayer): Promise<Buffer> {
  const { raster } = layer;
  if (raster.channels !== 4) throw new Error(`the DTG/DTF layer for ${layer.garmentCode} is not RGBA`);
  const empty = raster.width === 0 || raster.height === 0;
  return encodePng({
    // A PNG can't be 0 x 0; one transparent pixel prints nothing, and the
    // transparency check reports it.
    width: empty ? 1 : raster.width,
    height: empty ? 1 : raster.height,
    channels: 4,
    data: empty ? new Uint8Array(4) : raster.data,
    ppi: raster.ppi,
    icc: { name: SRGB_PROFILE_NAME, profile: srgbIccProfile() },
  });
}

/** A small black-on-white PNG of one film, for the admin pages. */
export async function renderFilmPreview(plate: InkPlate, label: PlateLabelInfo, heightPx?: number): Promise<Buffer> {
  return renderFilmPreviewPng(plate, label, heightPx);
}

/** Parses a corrected screen PSD uploaded by pre-press back into plates.
 * Throws PsdReadError with a message for pre-press when the file can't be used.
 * The result also carries `otherLayers` and `orderFrom` (readScreenPsdDetail
 * types them); diffScreenPsd compares it with the pack it came from. */
export async function readScreenPsd(bytes: Buffer | Uint8Array): Promise<ParsedScreenPsd> {
  return readScreenPsdDetail(bytes);
}

/** The manifest, with input hashes, print size, screen set and DTG crops on
 * top of PackManifest (buildPackManifest types them). */
export function buildManifest(input: BuildManifestInput): PackManifest {
  return buildPackManifest(input);
}

/** Re-opens every file with a decoder other than the writer's (Plan 6.4). */
export async function runChecks(input: ChecksInput): Promise<CheckResult[]> {
  return runPackChecks(input);
}

/** The design's job sheet: one A4 landscape PDF covering every garment that uses it. */
export async function renderJobSheet(input: JobSheetInput): Promise<Buffer> {
  return renderJobSheetPdf(input);
}
