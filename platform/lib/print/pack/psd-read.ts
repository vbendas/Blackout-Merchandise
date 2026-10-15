// Reads a corrected screen PSD that pre-press fixed in Photoshop and uploaded
// back (Plan 8). The films are parsed back by layer name and order, the colour
// overlays are reported so the regenerated pack switches them off again, and
// the result can be compared with the pack it came from.
//
// Uploads are untrusted: the structure is read first without decoding any
// pixels (ag-psd's useRawData), sizes are checked, then one layer at a time is
// decoded and dropped, as ag-psd's production notes advise.
import { getLayerImageData, getLayerMaskImageData, readPsd, type Layer, type LayerEffectsInfo, type Psd } from 'ag-psd';
import type { InkPlate, ParsedScreenPsd, Plate, PixelRect, ScreenSet, Warning } from '@/lib/print/types';
import { ensureAgPsd } from './ag-psd-setup';
import { hexToLab } from './colour';
import { formatNumber, garmentNameFromLayer, isOriginalLayerName, parsePlateLayerName, plateIdentity, plateLayerName, type ParsedPlateName } from './names';

/** Pixels per side and per document we agree to decode from an upload. */
const MAX_SIDE = 40000;
const MAX_DOCUMENT_PIXELS = 600_000_000;
const MAX_LAYERS = 200;

export type PsdReadErrorCode = 'not_psd' | 'unsupported' | 'too_large' | 'unreadable' | 'no_films';

/** An upload we can't use, with a message pre-press can act on. */
export class PsdReadError extends Error {
  constructor(
    readonly code: PsdReadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PsdReadError';
  }
}

export interface ParsedScreenPsdDetail extends ParsedScreenPsd {
  /** layers that are neither films, garment fills nor ORIGINAL, bottom first */
  otherLayers: string[];
  /** where the press order came from */
  orderFrom: 'names' | 'stack';
}

const COLOUR_MODES: Record<number, string> = { 0: 'Bitmap', 1: 'Grayscale', 2: 'Indexed', 3: 'RGB', 4: 'CMYK', 7: 'Multichannel', 8: 'Duotone', 9: 'Lab' };

function checkHeader(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 26 || bytes.toString('latin1', 0, 4) !== '8BPS') throw new PsdReadError('not_psd', 'This is not a Photoshop file. Upload the PSD from the pack.');
  const version = bytes.readUInt16BE(4);
  if (version !== 1 && version !== 2) throw new PsdReadError('not_psd', 'This Photoshop file version is not supported.');
  const height = bytes.readUInt32BE(14);
  const width = bytes.readUInt32BE(18);
  const depth = bytes.readUInt16BE(22);
  const mode = bytes.readUInt16BE(24);
  if (mode !== 3 && mode !== 1) {
    throw new PsdReadError('unsupported', `The file is in ${COLOUR_MODES[mode] ?? 'an unknown'} mode. Save it in RGB mode and upload it again.`);
  }
  if (depth !== 8) throw new PsdReadError('unsupported', `The file is ${depth}-bit. Save it as 8-bit (Image > Mode > 8 Bits/Channel) and upload it again.`);
  if (!(width > 0 && height > 0)) throw new PsdReadError('unreadable', 'The file has no canvas.');
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_DOCUMENT_PIXELS) {
    throw new PsdReadError('too_large', `The canvas is ${width} × ${height} px, larger than any print we make.`);
  }
  return { width, height };
}

interface FlatLayer {
  layer: Layer;
  name: string;
  /** position in the stack, 0 = bottom */
  stack: number;
  inGroup: boolean;
}

function flatten(children: Layer[] | undefined, out: FlatLayer[], inGroup: boolean): void {
  for (const layer of children ?? []) {
    if (layer.children) flatten(layer.children, out, true);
    else out.push({ layer, name: (layer.name ?? '').trim(), stack: out.length, inGroup });
  }
}

const OTHER_EFFECTS: (keyof LayerEffectsInfo)[] = ['dropShadow', 'innerShadow', 'outerGlow', 'innerGlow', 'bevel', 'satin', 'stroke', 'gradientOverlay', 'patternOverlay'];

function effectEnabled(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((v) => !!(v as { enabled?: boolean }).enabled);
  return !!(value as { enabled?: boolean } | undefined)?.enabled;
}

function overlayOn(effects: LayerEffectsInfo | undefined): boolean {
  return !!effects && !effects.disabled && effectEnabled(effects.solidFill);
}

function otherEffectsOn(effects: LayerEffectsInfo | undefined): string[] {
  if (!effects || effects.disabled) return [];
  return OTHER_EFFECTS.filter((k) => effectEnabled(effects[k]));
}

interface PlateRead {
  data: Uint8Array;
  /** pixels that were grey or semi-transparent and got thresholded */
  softPixels: number;
}

/** A film as the operator would print it: the layer's darkness times its
 * opacity, fill opacity and mask, over white, thresholded at 50%. */
function readPlatePixels(layer: Layer, width: number, height: number): PlateRead {
  const data = new Uint8Array(width * height);
  const left = layer.left ?? 0;
  const top = layer.top ?? 0;
  const lw = Math.max(0, (layer.right ?? 0) - left);
  const lh = Math.max(0, (layer.bottom ?? 0) - top);
  if (lw === 0 || lh === 0) return { data, softPixels: 0 };
  if (lw * lh > 4 * width * height) throw new PsdReadError('too_large', `Layer "${layer.name}" is far larger than the canvas.`);

  const px = getLayerImageData(layer);
  if (!px) return { data, softPixels: 0 };
  const src = px.data;
  const opacity = (layer.opacity ?? 1) * (layer.fillOpacity ?? 1);

  const mask = layer.mask && !layer.mask.disabled ? layer.mask : undefined;
  const maskPx = mask ? getLayerMaskImageData(layer) : undefined;
  const mLeft = mask?.left ?? 0;
  const mTop = mask?.top ?? 0;
  const mWidth = maskPx?.width ?? 0;
  const mHeight = maskPx?.height ?? 0;
  const maskDefault = mask?.defaultColor ?? 255;

  let softPixels = 0;
  const x0 = Math.max(0, left);
  const x1 = Math.min(width, left + lw);
  const y0 = Math.max(0, top);
  const y1 = Math.min(height, top + lh);
  for (let y = y0; y < y1; y++) {
    const srcRow = (y - top) * lw;
    for (let x = x0; x < x1; x++) {
      const p = (srcRow + (x - left)) * 4;
      let a = src[p + 3];
      if (a === 0) continue;
      const lum = (299 * src[p] + 587 * src[p + 1] + 114 * src[p + 2]) / 1000;
      let soft = a !== 255 || (lum > 0.5 && lum < 254.5);
      if (mask) {
        const mx = x - mLeft;
        const my = y - mTop;
        const m = mx >= 0 && my >= 0 && mx < mWidth && my < mHeight ? (maskPx!.data[(my * mWidth + mx) * 4] as number) : maskDefault;
        if (m !== 0 && m !== 255) soft = true;
        a = (a * m) / 255;
      }
      const density = a * opacity * (1 - lum / 255);
      if (soft) softPixels++;
      if (density >= 127.5) data[y * width + x] = 255;
    }
  }
  return { data, softPixels };
}

function warn(code: string, message: string, severity: Warning['severity'] = 'review'): Warning {
  return { code, message, severity };
}

function ppiFrom(psd: Psd): number {
  const info = psd.imageResources?.resolutionInfo;
  if (!info) return 72;
  return info.horizontalResolutionUnit === 'PPCM' ? info.horizontalResolution * 2.54 : info.horizontalResolution;
}

/** Accepts a Buffer or any Uint8Array (storage may hand back either), without copying. */
export async function readScreenPsdDetail(input: Buffer | Uint8Array): Promise<ParsedScreenPsdDetail> {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const { width, height } = checkHeader(bytes);
  ensureAgPsd();
  let psd: Psd;
  try {
    psd = readPsd(bytes, { useRawData: true, useRawThumbnail: true, skipThumbnail: true, skipCompositeImageData: true, skipLinkedFilesData: true });
  } catch (e) {
    throw new PsdReadError('unreadable', `The file could not be read (${e instanceof Error ? e.message : 'unknown error'}). Save it again from Photoshop and upload it.`);
  }

  const flat: FlatLayer[] = [];
  flatten(psd.children, flat, false);
  if (flat.length > MAX_LAYERS) throw new PsdReadError('too_large', `The file has ${flat.length} layers; a screen pack has at most 15 films plus a few extras.`);

  const warnings: Warning[] = [];
  const garmentLayers: string[] = [];
  const otherLayers: string[] = [];
  let hasOriginal = false;
  let effectsOn = false;
  const films: { entry: FlatLayer; parsed: ParsedPlateName; read: PlateRead }[] = [];

  for (const entry of flat) {
    const { layer, name } = entry;
    const parsed = parsePlateLayerName(name);
    if (parsed) {
      const label = `Film ${parsed.index}/${parsed.total}`;
      if (overlayOn(layer.effects)) effectsOn = true;
      const others = otherEffectsOn(layer.effects);
      if (others.length) warnings.push(warn('film_effects', `${label} has ${others.join(', ')} switched on. Effects don't print from the layer's pixels, so they were ignored.`));
      if ((layer.blendMode ?? 'normal') !== 'normal') warnings.push(warn('film_blend', `${label} uses the ${layer.blendMode} blend mode; it was read as normal.`));
      if ((layer.opacity ?? 1) < 1 || (layer.fillOpacity ?? 1) < 1) warnings.push(warn('film_opacity', `${label} is below 100% opacity, which prints grey.`));
      if (layer.hidden) warnings.push(warn('film_hidden', `${label} was hidden in the file; it is still a film.`, 'info'));
      if (layer.clipping) warnings.push(warn('film_clipped', `${label} is clipped to the layer below; it was read on its own.`));
      if (layer.vectorMask) warnings.push(warn('film_vector_mask', `${label} has a vector mask, which was ignored. Rasterise it and upload again if it matters.`));
      const read = readPlatePixels(layer, width, height);
      if (read.softPixels > 0) {
        warnings.push(warn('film_not_binary', `${label} had ${read.softPixels.toLocaleString('en-GB')} grey or semi-transparent pixels; they were set to ink or clear at 50%.`));
      }
      films.push({ entry, parsed, read });
      continue;
    }
    if (isOriginalLayerName(name) || layer.placedLayer) {
      hasOriginal = true;
      continue;
    }
    const garment = garmentNameFromLayer(name);
    if (garment) {
      garmentLayers.push(garment);
      continue;
    }
    otherLayers.push(name || '(unnamed layer)');
  }

  if (films.length === 0) throw new PsdReadError('no_films', 'No films found. Film layers are named like "2/6  PANTONE 237 C · HB Opaque · 55 lpi 22.5°".');
  if (otherLayers.length) {
    warnings.push(warn('unknown_layers', `${otherLayers.length === 1 ? 'A layer is' : `${otherLayers.length} layers are`} not a film, a garment or ORIGINAL and ${otherLayers.length === 1 ? 'was' : 'were'} left out: ${otherLayers.join(', ')}.`));
  }
  if (films.some((f) => f.entry.inGroup)) warnings.push(warn('films_in_groups', 'Some films sit inside layer groups; they were read by name.', 'info'));
  if (!hasOriginal) warnings.push(warn('original_missing', 'The ORIGINAL smart object is gone; the regenerated pack puts it back.', 'info'));

  // Press order: the numbers in the names when they run 1..N, else the stack.
  const n = films.length;
  const indexes = films.map((f) => f.parsed.index).sort((a, b) => a - b);
  const namesRun = indexes.every((v, i) => v === i + 1);
  let ordered = films;
  let orderFrom: 'names' | 'stack' = 'stack';
  if (namesRun) {
    ordered = [...films].sort((a, b) => a.parsed.index - b.parsed.index);
    orderFrom = 'names';
    const stackOrder = films.map((f) => f.parsed.index).join(',');
    if (stackOrder !== ordered.map((f) => f.parsed.index).join(',')) {
      warnings.push(warn('order_differs', 'The film layers are stacked in a different order from their numbers; the numbers were used for the press order.'));
    }
  } else {
    warnings.push(warn('renumbered', `The film numbers in the names don't run 1 to ${n}; the stack order was used (bottom prints first).`));
  }
  if (films.some((f) => f.parsed.total !== n)) {
    warnings.push(warn('film_count_changed', `The names count ${[...new Set(films.map((f) => f.parsed.total))].join(' or ')} films; the file has ${n}.`));
  }

  return {
    widthPx: width,
    heightPx: height,
    ppi: ppiFrom(psd),
    plates: ordered.map((f, i) => ({ index: i + 1, name: f.entry.name, plate: { width, height, ppi: ppiFrom(psd), data: f.read.data } })),
    garmentLayers,
    hasOriginal,
    effectsOn,
    warnings,
    otherLayers,
    orderFrom,
  };
}

// ---------------------------------------------------------------------------
// Differences against the pack the file came from
// ---------------------------------------------------------------------------

export interface FilmChange {
  /** press position in the corrected file */
  index: number;
  name: string;
  /** press position in the original pack */
  originalIndex: number;
  changedPx: number;
  /** changed pixels over the print area */
  changedShare: number;
  coverageBefore: number;
  coverageAfter: number;
  coverageDelta: number;
}

export interface ScreenPsdDiff {
  sizeChanged: boolean;
  changed: FilmChange[];
  unchanged: number[];
  added: { index: number; name: string; coverage: number }[];
  removed: { index: number; name: string }[];
  /** films kept but moved in the press order */
  reordered: boolean;
  effectsOn: boolean;
  otherLayers: string[];
  /** one plain sentence for the auditor */
  summary: string;
}

function coverageIn(plate: Plate, area: PixelRect): number {
  const x1 = Math.min(plate.width, area.x + area.width);
  const y1 = Math.min(plate.height, area.y + area.height);
  let ink = 0;
  for (let y = Math.max(0, area.y); y < y1; y++) {
    const row = y * plate.width;
    for (let x = Math.max(0, area.x); x < x1; x++) if (plate.data[row + x] >= 128) ink++;
  }
  return ink / Math.max(1, area.width * area.height);
}

function changedPixels(a: Plate, b: Plate): number {
  let n = 0;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] >= 128 !== b.data[i] >= 128) n++;
  return n;
}

/** Pairs each corrected film with the original it came from: by ink (Pantone
 * code, role or hex). A film whose name says only 'n/N' pairs by position. A
 * renamed ink counts as a new film, since its colour is no longer known. */
function matchFilms(original: ScreenSet, parsed: ParsedScreenPsd): Map<number, InkPlate> {
  const originals = [...original.plates].sort((a, b) => a.index - b.index);
  const total = originals.length;
  const used = new Set<number>();
  const match = new Map<number, InkPlate>();
  const identityOf = (p: InkPlate) => {
    const parsedName = parsePlateLayerName(plateLayerName(p, total));
    return parsedName ? plateIdentity(parsedName) : '';
  };
  const bare: number[] = [];
  for (const film of parsed.plates) {
    const pn = parsePlateLayerName(film.name);
    const id = pn ? plateIdentity(pn) : '';
    if (!id) {
      bare.push(film.index);
      continue;
    }
    const hit = originals.find((p) => !used.has(p.index) && identityOf(p) === id);
    if (hit) {
      used.add(hit.index);
      match.set(film.index, hit);
    }
  }
  for (const index of bare) {
    const hit = originals.find((p) => !used.has(p.index) && p.index === index);
    if (hit) {
      used.add(hit.index);
      match.set(index, hit);
    }
  }
  return match;
}

function pct(share: number): string {
  const v = share * 100;
  return `${v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2)}%`;
}

export function diffScreenPsd(original: ScreenSet, parsed: ParsedScreenPsd & { otherLayers?: string[] }): ScreenPsdDiff {
  const sizeChanged = parsed.widthPx !== original.canvas.widthPx || parsed.heightPx !== original.canvas.heightPx || Math.abs(parsed.ppi - original.canvas.ppi) > 0.01;
  const area = sizeChanged ? { x: 0, y: 0, width: parsed.widthPx, height: parsed.heightPx } : original.canvas.art;
  const match = matchFilms(original, parsed);
  const changed: FilmChange[] = [];
  const unchanged: number[] = [];
  const added: ScreenPsdDiff['added'] = [];
  for (const film of parsed.plates) {
    const before = match.get(film.index);
    const coverageAfter = coverageIn(film.plate, area);
    if (!before) {
      added.push({ index: film.index, name: film.name, coverage: coverageAfter });
      continue;
    }
    const coverageBefore = coverageIn(before.plate, area);
    const px = sizeChanged ? film.plate.width * film.plate.height : changedPixels(before.plate, film.plate);
    if (px === 0) {
      unchanged.push(film.index);
      continue;
    }
    changed.push({
      index: film.index,
      name: film.name,
      originalIndex: before.index,
      changedPx: px,
      changedShare: px / Math.max(1, area.width * area.height),
      coverageBefore,
      coverageAfter,
      coverageDelta: coverageAfter - coverageBefore,
    });
  }
  const matchedOriginals = new Set([...match.values()].map((p) => p.index));
  const total = original.plates.length;
  const removed = original.plates
    .filter((p) => !matchedOriginals.has(p.index))
    .sort((a, b) => a.index - b.index)
    .map((p) => ({ index: p.index, name: plateLayerName(p, total) }));
  const reordered = [...match.entries()].some(([index, p]) => index !== p.index);

  const parts: string[] = [];
  if (sizeChanged) parts.push(`The canvas changed from ${original.canvas.widthPx} × ${original.canvas.heightPx} px at ${formatNumber(original.canvas.ppi)} ppi to ${parsed.widthPx} × ${parsed.heightPx} px at ${formatNumber(parsed.ppi)} ppi`);
  if (changed.length) {
    parts.push(`${changed.length} ${changed.length === 1 ? 'film' : 'films'} changed (${changed.map((c) => `${c.index}/${parsed.plates.length}: ${pct(c.changedShare)} of the print area`).join('; ')})`);
  } else if (!sizeChanged) parts.push('No film changed');
  if (added.length) parts.push(`${added.length} added (${added.map((a) => a.name).join('; ')})`);
  if (removed.length) parts.push(`${removed.length} removed (${removed.map((r) => r.name).join('; ')})`);
  if (reordered) parts.push('the press order changed');
  let summary = `${parts.join(', ')}.`;
  if (parsed.effectsOn) summary += ' Colour overlays were on; the regenerated pack switches them off.';
  const others = (parsed as { otherLayers?: string[] }).otherLayers ?? [];
  if (others.length) summary += ` Left out: ${others.join(', ')}.`;

  return { sizeChanged, changed, unchanged, added, removed, reordered, effectsOn: parsed.effectsOn, otherLayers: others, summary };
}

/** The original set with the corrected films in place, renumbered in the new
 * press order, so the pack can be regenerated and re-checked. Films that are
 * new take what their names say (Pantone code, base, ruling). */
export function rebuildScreenSet(original: ScreenSet, parsed: ParsedScreenPsd): ScreenSet {
  const match = matchFilms(original, parsed);
  const sizeChanged = parsed.widthPx !== original.canvas.widthPx || parsed.heightPx !== original.canvas.heightPx;
  const canvas = sizeChanged ? { ...original.canvas, widthPx: parsed.widthPx, heightPx: parsed.heightPx, ppi: parsed.ppi } : original.canvas;
  const reference = [...original.plates].sort((a, b) => a.index - b.index)[0];
  const warnings: Warning[] = [...original.warnings];
  if (sizeChanged) warnings.push({ code: 'canvas_changed', message: 'The corrected file has a different canvas; the print area was kept where it was.', severity: 'block' });

  const plates: InkPlate[] = parsed.plates.map((film) => {
    const before = match.get(film.index);
    const coverage = coverageIn(film.plate, canvas.art);
    if (before) return { ...before, index: film.index, plate: film.plate, coverage };
    const pn = parsePlateLayerName(film.name);
    const hex = pn?.hex ?? (pn?.role === 'ink' ? '#808080' : '#F2F2F0');
    warnings.push({ code: 'film_added', message: `Film ${film.index} (${film.name}) is new in the corrected file; check its ink.`, severity: 'review' });
    return {
      index: film.index,
      role: pn?.role ?? 'ink',
      target: { hex, lab: hexToLab(hex) },
      base: pn?.base ?? reference.base,
      pantone: pn?.pantone ?? null,
      clientName: undefined,
      plate: film.plate,
      coverage,
      halftone: { ...reference.halftone, lpi: pn?.lpi ?? reference.halftone.lpi, angleDeg: pn?.angleDeg ?? reference.halftone.angleDeg },
      meshSuggestion: reference.meshSuggestion,
    };
  });
  return { ...original, canvas, plates, warnings };
}
