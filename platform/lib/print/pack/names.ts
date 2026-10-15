// Layer and file names for the production pack. The screen PSD layer names are
// what the operator reads in Photoshop's Layers panel (Plan 6.1), so they carry
// the press position, the Pantone code or role, the base, the flash and the
// screen ruling. Pantone codes belong here: these are admin and production
// files, never shown to clients.
import type { InkPlate, PlateRole } from '@/lib/print/types';

export const ORIGINAL_LAYER_NAME = 'ORIGINAL (do not print)';
const GARMENT_PREFIX = 'GARMENT · ';
const DTG_PREFIX = 'DTG/DTF on ';

/** 22.5 -> '22.5', 45 -> '45', 0.25 -> '0.25' (no trailing zeros). */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}

/** 'PANTONE 237 C' whether the library stored '237 C' or 'pantone 237 c'. */
export function displayPantone(code: string): string {
  const trimmed = code.trim().replace(/\s+/g, ' ');
  const bare = trimmed.replace(/^pantone\s*/i, '');
  return `PANTONE ${bare.toUpperCase()}`;
}

/** What a film is, in production words: the Pantone code, or the role when it has none. */
export function plateInkLabel(plate: Pick<InkPlate, 'role' | 'pantone' | 'target'>): string {
  if (plate.role === 'underbase') return 'Underbase';
  if (plate.role === 'highlight') return 'Highlight white';
  if (plate.pantone) return displayPantone(plate.pantone);
  // No code yet: pre-press picks one in MagnaMix. The hex keeps the film identifiable.
  return `Ink ${plate.target.hex.toUpperCase()}`;
}

/** '2/6  PANTONE 237 C · HB Opaque · 55 lpi 22.5°' (two spaces after the position, as in Plan 6.1). */
export function plateLayerName(plate: InkPlate, total: number): string {
  const parts = [plateInkLabel(plate), plate.base];
  if (plate.role === 'underbase') parts.push('flash');
  parts.push(`${formatNumber(plate.halftone.lpi)} lpi ${formatNumber(plate.halftone.angleDeg)}°`);
  return `${plate.index}/${total}  ${parts.join(' · ')}`;
}

export function garmentLayerName(garmentName: string): string {
  return `${GARMENT_PREFIX}${garmentName}`;
}

export function dtgLayerName(garmentName: string): string {
  return `${DTG_PREFIX}${garmentName}`;
}

export function isOriginalLayerName(name: string): boolean {
  return /^\s*original\b/i.test(name);
}

/** 'GARMENT · Black' -> 'Black'; null for anything else. */
export function garmentNameFromLayer(name: string): string | null {
  const m = /^\s*garment\s*[·:\-]\s*(.+?)\s*$/i.exec(name);
  return m ? m[1] : null;
}

export interface ParsedPlateName {
  index: number;
  total: number;
  /** everything after 'n/N', trimmed */
  descriptor: string;
  role: PlateRole;
  /** 'PANTONE 237 C' when the name carries a code */
  pantone: string | null;
  /** '#ED90DC' when the name carries a hex */
  hex: string | null;
  base: string | null;
  flash: boolean;
  lpi: number | null;
  angleDeg: number | null;
}

/** Reads a film layer name back. Lenient about spacing, since a designer may
 * have retyped it; null when the name doesn't start with 'n/N'. */
export function parsePlateLayerName(name: string): ParsedPlateName | null {
  const m = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})(?:\s+(.*?))?\s*$/.exec(name);
  if (!m) return null;
  const index = Number(m[1]);
  const total = Number(m[2]);
  if (index < 1 || total < 1) return null;
  const descriptor = (m[3] ?? '').trim();
  const parts = descriptor.split(/\s*·\s*/).filter(Boolean);
  const first = parts[0] ?? '';

  let role: PlateRole = 'ink';
  if (/^underbase\b/i.test(first)) role = 'underbase';
  else if (/^highlight\b/i.test(first)) role = 'highlight';

  const pantoneMatch = /\bpantone\s+(.+)$/i.exec(first);
  const hexMatch = /#([0-9a-f]{6})\b/i.exec(first);
  const ruling = /(\d+(?:\.\d+)?)\s*lpi\s*(-?\d+(?:\.\d+)?)\s*°?/i.exec(descriptor);
  const flash = parts.some((p) => /^flash$/i.test(p));
  const baseCandidates = parts.slice(1).filter((p) => !/^flash$/i.test(p) && !/\blpi\b/i.test(p));

  return {
    index,
    total,
    descriptor,
    role,
    pantone: pantoneMatch ? displayPantone(pantoneMatch[1]) : null,
    hex: hexMatch ? `#${hexMatch[1].toUpperCase()}` : null,
    base: baseCandidates[0] ?? null,
    flash,
    lpi: ruling ? Number(ruling[1]) : null,
    angleDeg: ruling ? Number(ruling[2]) : null,
  };
}

/** The ink identity of a film name without its press position, for matching
 * films across a re-upload: 'pantone 237 c', 'underbase', '#ed90dc'. */
export function plateIdentity(parsed: ParsedPlateName): string {
  if (parsed.role === 'underbase') return 'underbase';
  if (parsed.role === 'highlight') return 'highlight';
  if (parsed.pantone) return parsed.pantone.toLowerCase();
  if (parsed.hex) return parsed.hex.toLowerCase();
  return parsed.descriptor.toLowerCase();
}

function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

export interface FileStemInput {
  designCode: string;
  version: number;
  /** placement position, e.g. 'front' */
  position: string;
}

/** 'MF-UNDERWRITER-v3-FRONT' */
export function packFileStem({ designCode, version, position }: FileStemInput): string {
  const code = slug(designCode) || 'DESIGN';
  const pos = slug(position) || 'PRINT';
  return `MF-${code}-v${version}-${pos}`;
}

/** 'MF-UNDERWRITER-v3-FRONT-DARKS.psd' */
export function screenPsdFileName(stem: FileStemInput, setKey: string): string {
  return `${packFileStem(stem)}-${slug(setKey) || 'SET'}.psd`;
}

/** 'MF-UNDERWRITER-v3-FRONT-DTG-DTF.psd' */
export function dtgPsdFileName(stem: FileStemInput): string {
  return `${packFileStem(stem)}-DTG-DTF.psd`;
}

/** 'MF-UNDERWRITER-v3-FRONT-DTG-BLACK.png' */
export function dtgPngFileName(stem: FileStemInput, garmentName: string): string {
  return `${packFileStem(stem)}-DTG-${slug(garmentName) || 'GARMENT'}.png`;
}

/** A GUID-shaped id from a hex digest, so the same input always gets the same
 * id (Photoshop and ag-psd want smart-object ids in GUID format). */
export function guidFromHex(hex: string): string {
  const h = hex.toLowerCase().replace(/[^0-9a-f]/g, '').padEnd(32, '0').slice(0, 32);
  // Mark it as a name-based (version 5) id with the RFC 4122 variant.
  const version = `5${h.slice(13, 16)}`;
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${version}-${variant}-${h.slice(20, 32)}`;
}
