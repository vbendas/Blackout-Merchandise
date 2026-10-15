// The screen PSD (Plan 6.1) and the DTG/DTF PSD (Plan 6.2).
//
// ag-psd writes the structure: layer records, names, the switched-off colour
// overlays, locks, layer colours, the ORIGINAL smart object and its embedded
// file. Pixels go in pre-compressed through ag-psd's `rawData` layer field, so
// no layer is ever expanded to four bytes per pixel. ag-psd also sizes a
// scratch buffer of 8 bytes and a merged image of 4 bytes per document pixel
// (about 850 MB for a 600 ppi full front), so the structure is written as a
// 1 x 1 document; the real size goes into the header afterwards, followed by
// our own merged image, encoded row by row. Both steps follow the Adobe file
// format; the round-trip tests re-read every file with ag-psd and with
// @webtoon/psd, an independent decoder.
//
// The merged image (what Finder, Bridge or a RIP preview shows) is the print
// in colour on the first garment of the set, as if the overlays were switched
// on. Photoshop ignores it and builds the view from the layers.
import sharp from 'sharp';
import { writePsdUint8Array, type Layer, type LayerColor, type LayerRawData, type LinkedFile, type PlacedLayer, type Psd } from 'ag-psd';
import type { DtgLayer, DtgPsdInput, GarmentColour, OriginalArt, PixelRect, ScreenPsdInput } from '@/lib/print/types';
import { ensureAgPsd } from './ag-psd-setup';
import { hexToRgb } from './colour';
import { sha256Hex } from './hash';
import { ORIGINAL_LAYER_NAME, dtgLayerName, garmentLayerName, guidFromHex, plateLayerName } from './names';
import {
  COMPRESSION_CODE,
  compositeSection,
  encodeChannel,
  encodeRgbRows,
  encodedSize,
  layerChannelPayload,
  type EncodedChannel,
  type PsdCompression,
} from './rle';
import { srgbIccProfile } from './srgb-icc';

/** Photoshop's PSD ceiling is 2 GB; past it the file must be PSB. */
const PSD_LIMIT_BYTES = 2 * 1024 ** 3;
/** Headroom for the parts the estimate can't see exactly (records, descriptors). */
const PSD_LIMIT_MARGIN = 64 * 1024 * 1024;
/** PSD documents are at most 30,000 px on a side. */
const PSD_MAX_SIDE = 30000;
/** Photoshop's own thumbnails are at most 160 px. */
const THUMBNAIL_MAX = 160;
const RESOURCE_ICC_PROFILE = 1039;

export interface PsdWriteOptions {
  /** 'rle' (default) or 'zip'. RLE is what Photoshop writes for 8-bit layers,
   * every PSD reader handles it, and the independent decoder in the checks
   * reads only RLE. Measured on a full front (28 x 33.6 cm, 25 mm margin) at
   * 600 ppi with 8 films and a 4K original (size-benchmark.ts): 193 MB with
   * RLE against 109 MB with zip for spot films, 272 MB against 156 MB when
   * every film is halftoned; zip writes 3 to 5 times slower. Zip is kept for
   * those measurements. */
  compression?: PsdCompression;
}

export interface PsdWriteStats {
  psb: boolean;
  compression: PsdCompression;
  bytes: number;
  widthPx: number;
  heightPx: number;
  ppi: number;
  layers: { name: string; bytes: number }[];
  compositeBytes: number;
  embeddedBytes: number;
  /** the ORIGINAL smart object's embedded file */
  original: { name: string; sha256: string; converted: boolean; widthPx: number; heightPx: number };
}

interface LayerChannel {
  /** -1 transparency, 0 red, 1 green, 2 blue */
  id: -1 | 0 | 1 | 2;
  encoded: EncodedChannel;
}

interface LayerSpec {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  channels: LayerChannel[];
  hidden?: boolean;
  locked?: boolean;
  layerColor?: LayerColor;
  /** a colour overlay, written switched off */
  overlay?: { r: number; g: number; b: number };
  placed?: PlacedLayer;
}

interface DocumentSpec {
  width: number;
  height: number;
  ppi: number;
  /** bottom of the stack first */
  layers: LayerSpec[];
  linkedFiles: LinkedFile[];
  composite: [EncodedChannel, EncodedChannel, EncodedChannel];
  thumbnail: { width: number; height: number; data: Buffer } | null;
  guides: { location: number; direction: 'horizontal' | 'vertical' }[];
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

function estimateBytes(doc: DocumentSpec): number {
  let total = 1024 * 1024;
  for (const layer of doc.layers) {
    total += 2048;
    for (const c of layer.channels) total += 2 + encodedSize(c.encoded, true);
  }
  for (const f of doc.linkedFiles) total += 1024 + (f.data?.byteLength ?? 0);
  for (const c of doc.composite) total += encodedSize(c, true);
  return total;
}

function toAgLayer(spec: LayerSpec, large: boolean): Layer {
  const rawData: LayerRawData = {
    colorMode: 3 as unknown as LayerRawData['colorMode'], // RGB
    bitsPerChannel: 8,
    large,
    channels: spec.channels.map((c) => ({
      id: c.id as unknown as LayerRawData['channels'][number]['id'],
      compression: COMPRESSION_CODE[c.encoded.compression] as unknown as LayerRawData['channels'][number]['compression'],
      data: layerChannelPayload(c.encoded, large),
    })),
  };
  const layer: Layer = {
    name: spec.name,
    left: spec.left,
    top: spec.top,
    right: spec.left + spec.width,
    bottom: spec.top + spec.height,
    blendMode: 'normal',
    opacity: 1,
    hidden: !!spec.hidden,
    rawData,
  };
  if (spec.layerColor) layer.layerColor = spec.layerColor;
  if (spec.locked) {
    layer.transparencyProtected = true;
    layer.protected = { transparency: true, composite: true, position: true };
  }
  if (spec.overlay) {
    layer.effects = {
      solidFill: [{ present: true, showInDialog: true, enabled: false, blendMode: 'normal', color: spec.overlay, opacity: 1 }],
    };
  }
  if (spec.placed) layer.placedLayer = spec.placed;
  return layer;
}

/** An image resource block: '8BIM', id, empty Pascal name, size, data (padded to even). */
function resourceBlock(id: number, data: Buffer): Buffer {
  const head = Buffer.alloc(12);
  head.write('8BIM', 0, 'latin1');
  head.writeUInt16BE(id, 4);
  head.writeUInt16BE(0, 6); // empty name, padded to two bytes
  head.writeUInt32BE(data.length, 8);
  return Buffer.concat([head, data, Buffer.alloc(data.length % 2)]);
}

interface SectionOffsets {
  imageResources: number;
  layerAndMask: number;
  imageData: number;
}

/** Offsets of the PSD sections (Adobe file format: header, colour mode data,
 * image resources, layer and mask information, image data). */
export function psdSectionOffsets(buf: Buffer): SectionOffsets & { large: boolean } {
  if (buf.length < 26 || buf.toString('latin1', 0, 4) !== '8BPS') throw new Error('not a PSD file');
  const version = buf.readUInt16BE(4);
  if (version !== 1 && version !== 2) throw new Error(`unknown PSD version ${version}`);
  const large = version === 2;
  let o = 26;
  o += 4 + buf.readUInt32BE(o);
  const imageResources = o;
  o += 4 + buf.readUInt32BE(o);
  const layerAndMask = o;
  o += large ? 8 + Number(buf.readBigUInt64BE(o)) : 4 + buf.readUInt32BE(o);
  if (o > buf.length) throw new Error('PSD sections run past the end of the file');
  return { imageResources, layerAndMask, imageData: o, large };
}

function assemblePsd(doc: DocumentSpec): { bytes: Buffer; psb: boolean } {
  ensureAgPsd();
  const psb = doc.width > PSD_MAX_SIDE || doc.height > PSD_MAX_SIDE || estimateBytes(doc) > PSD_LIMIT_BYTES - PSD_LIMIT_MARGIN;
  const psd: Psd = {
    // Structure only: see the note at the top of the file.
    width: 1,
    height: 1,
    imageResources: {
      resolutionInfo: {
        horizontalResolution: doc.ppi,
        horizontalResolutionUnit: 'PPI',
        widthUnit: 'Centimeters',
        verticalResolution: doc.ppi,
        verticalResolutionUnit: 'PPI',
        heightUnit: 'Centimeters',
      },
      ...(doc.guides.length ? { gridAndGuidesInformation: { guides: doc.guides } } : {}),
      ...(doc.thumbnail ? { thumbnailRaw: { width: doc.thumbnail.width, height: doc.thumbnail.height, data: new Uint8Array(doc.thumbnail.data) } } : {}),
    },
    children: doc.layers.map((l) => toAgLayer(l, psb)),
  };
  if (doc.linkedFiles.length) psd.linkedFiles = doc.linkedFiles;

  const written = writePsdUint8Array(psd, { psb, generateThumbnail: false, noBackground: true });
  const structure = Buffer.from(written.buffer, written.byteOffset, written.byteLength);
  const at = psdSectionOffsets(structure);

  const header = Buffer.from(structure.subarray(0, 26));
  header.writeUInt16BE(3, 12); // RGB, no merged alpha
  header.writeUInt32BE(doc.height, 14);
  header.writeUInt32BE(doc.width, 18);
  const colourModeData = structure.subarray(26, at.imageResources);
  const resources = structure.subarray(at.imageResources + 4, at.layerAndMask);
  // ag-psd can't write an ICC profile resource, so it is added here.
  const icc = resourceBlock(RESOURCE_ICC_PROFILE, srgbIccProfile());
  const resourcesLength = Buffer.alloc(4);
  resourcesLength.writeUInt32BE(resources.length + icc.length, 0);
  const layerAndMask = structure.subarray(at.layerAndMask, at.imageData);

  const bytes = Buffer.concat([header, colourModeData, resourcesLength, resources, icc, layerAndMask, ...compositeSection(doc.composite, psb)]);
  return { bytes, psb };
}

// ---------------------------------------------------------------------------
// Merged image and thumbnail
// ---------------------------------------------------------------------------

/** Box-filtered thumbnail from a sparse grid of samples: about 8 x 8 per
 * thumbnail pixel is plenty at 160 px, and keeps it off the write's critical
 * path at 600 ppi. */
class ThumbnailAccumulator {
  readonly width: number;
  readonly height: number;
  private readonly sums: Float64Array;
  private readonly counts: Uint32Array;
  private readonly column: Uint16Array;
  private readonly step: number;

  constructor(private readonly docWidth: number, private readonly docHeight: number) {
    const scale = THUMBNAIL_MAX / Math.max(docWidth, docHeight);
    this.width = Math.max(1, Math.min(docWidth, Math.round(docWidth * scale)));
    this.height = Math.max(1, Math.min(docHeight, Math.round(docHeight * scale)));
    this.sums = new Float64Array(this.width * this.height * 3);
    this.counts = new Uint32Array(this.width * this.height);
    this.column = new Uint16Array(docWidth);
    for (let x = 0; x < docWidth; x++) this.column[x] = Math.min(this.width - 1, Math.floor((x * this.width) / docWidth));
    this.step = Math.max(1, Math.floor(Math.max(docWidth, docHeight) / (THUMBNAIL_MAX * 8)));
  }

  addRow(y: number, r: Uint8Array, g: Uint8Array, b: Uint8Array): void {
    if (y % this.step) return;
    const ty = Math.min(this.height - 1, Math.floor((y * this.height) / this.docHeight));
    const base = ty * this.width;
    for (let x = 0; x < this.docWidth; x += this.step) {
      const t = base + this.column[x];
      this.sums[t * 3] += r[x];
      this.sums[t * 3 + 1] += g[x];
      this.sums[t * 3 + 2] += b[x];
      this.counts[t]++;
    }
  }

  async jpeg(): Promise<{ width: number; height: number; data: Buffer }> {
    const px = Buffer.alloc(this.width * this.height * 3);
    for (let t = 0; t < this.counts.length; t++) {
      const n = this.counts[t] || 1;
      px[t * 3] = Math.round(this.sums[t * 3] / n);
      px[t * 3 + 1] = Math.round(this.sums[t * 3 + 1] / n);
      px[t * 3 + 2] = Math.round(this.sums[t * 3 + 2] / n);
    }
    const data = await sharp(px, { raw: { width: this.width, height: this.height, channels: 3 } }).jpeg({ quality: 85 }).toBuffer();
    return { width: this.width, height: this.height, data };
  }
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

function constantLayerChannels(width: number, height: number, rgb: [number, number, number], compression: PsdCompression): LayerChannel[] {
  return [
    { id: -1, encoded: encodeChannel(width, height, { kind: 'constant', value: 255 }, compression) },
    { id: 0, encoded: encodeChannel(width, height, { kind: 'constant', value: rgb[0] }, compression) },
    { id: 1, encoded: encodeChannel(width, height, { kind: 'constant', value: rgb[1] }, compression) },
    { id: 2, encoded: encodeChannel(width, height, { kind: 'constant', value: rgb[2] }, compression) },
  ];
}

function rgbaLayerChannels(data: Uint8Array, width: number, height: number, compression: PsdCompression): LayerChannel[] {
  const src = (offset: number) => ({ kind: 'buffer' as const, data, offset, stride: 4, rowStride: width * 4 });
  return [
    { id: -1, encoded: encodeChannel(width, height, src(3), compression) },
    { id: 0, encoded: encodeChannel(width, height, src(0), compression) },
    { id: 1, encoded: encodeChannel(width, height, src(1), compression) },
    { id: 2, encoded: encodeChannel(width, height, src(2), compression) },
  ];
}

function garmentFor(code: string, garments: GarmentColour[]): GarmentColour {
  const g = garments.find((x) => x.code === code);
  if (!g) throw new Error(`garment colour ${code} is in the set but missing from the garments list`);
  return g;
}

function garmentFillLayer(garment: GarmentColour, width: number, height: number, compression: PsdCompression): LayerSpec {
  return {
    name: garmentLayerName(garment.name),
    left: 0,
    top: 0,
    width,
    height,
    channels: constantLayerChannels(width, height, hexToRgb(garment.hex), compression),
    hidden: true,
    layerColor: 'gray',
  };
}

const EMBEDDABLE: Record<string, string> = { png: 'png', jpeg: 'jpg', tiff: 'tif' };

/** The file the smart object embeds: the approved bytes as they are when
 * Photoshop opens that format everywhere (PNG, JPEG, TIFF); anything else
 * (WebP, AVIF, GIF, SVG) is re-encoded losslessly as PNG with the same pixels. */
async function embeddedOriginal(original: OriginalArt): Promise<{ name: string; data: Buffer; converted: boolean }> {
  const meta = await sharp(original.bytes).metadata();
  const stem = (original.filename.replace(/\.[A-Za-z0-9]{1,5}$/, '') || 'original').replace(/[\\/:*?"<>|]+/g, '-');
  const ext = meta.format ? EMBEDDABLE[meta.format] : undefined;
  if (ext) return { name: `${stem}.${ext}`, data: original.bytes, converted: false };
  const data = await sharp(original.bytes).keepMetadata().png({ compressionLevel: 9 }).toBuffer();
  return { name: `${stem}.png`, data, converted: true };
}

/** ORIGINAL (do not print): hidden, locked, a smart object embedding the
 * untouched approved art, fitted into the print area. The layer also carries
 * its rendered pixels, as Photoshop expects of a placed layer. */
async function originalLayer(
  original: OriginalArt,
  area: PixelRect,
  ppi: number,
  compression: PsdCompression,
): Promise<{ layer: LayerSpec; linked: LinkedFile; info: PsdWriteStats['original'] }> {
  const embedded = await embeddedOriginal(original);
  const meta = await sharp(original.bytes).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const ow = (rotated ? meta.height : meta.width) ?? original.widthPx;
  const oh = (rotated ? meta.width : meta.height) ?? original.heightPx;

  const scale = Math.min(area.width / ow, area.height / oh);
  const rw = Math.max(1, Math.round(ow * scale));
  const rh = Math.max(1, Math.round(oh * scale));
  const rx = area.x + Math.floor((area.width - rw) / 2);
  const ry = area.y + Math.floor((area.height - rh) / 2);

  const { data, info } = await sharp(original.bytes)
    .rotate()
    .ensureAlpha()
    .resize(rw, rh, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace('srgb')
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4 || info.width !== rw || info.height !== rh) throw new Error('could not render the original art for the PSD');

  const sha = sha256Hex(embedded.data);
  const id = guidFromHex(sha);
  const placed: PlacedLayer = {
    id,
    placed: guidFromHex(sha256Hex(`placed:${id}`)),
    type: 'raster',
    transform: [rx, ry, rx + rw, ry, rx + rw, ry + rh, rx, ry + rh],
    width: ow,
    height: oh,
    // the art's own resolution at this print size
    resolution: { value: (ow / rw) * ppi, units: 'Density' },
  };
  return {
    layer: {
      name: ORIGINAL_LAYER_NAME,
      left: rx,
      top: ry,
      width: rw,
      height: rh,
      channels: rgbaLayerChannels(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), rw, rh, compression),
      hidden: true,
      locked: true,
      layerColor: 'red',
      placed,
    },
    linked: { id, name: embedded.name, data: new Uint8Array(embedded.data) },
    info: { name: embedded.name, sha256: sha, converted: embedded.converted, widthPx: ow, heightPx: oh },
  };
}

function statsFor(doc: DocumentSpec, built: { bytes: Buffer; psb: boolean }, compression: PsdCompression, original: PsdWriteStats['original']): PsdWriteStats {
  return {
    psb: built.psb,
    compression,
    bytes: built.bytes.length,
    widthPx: doc.width,
    heightPx: doc.height,
    ppi: doc.ppi,
    layers: doc.layers.map((l) => ({ name: l.name, bytes: l.channels.reduce((n, c) => n + 2 + encodedSize(c.encoded, built.psb), 0) })),
    compositeBytes: doc.composite.reduce((n, c) => n + encodedSize(c, built.psb), 0),
    embeddedBytes: doc.linkedFiles.reduce((n, f) => n + (f.data?.byteLength ?? 0), 0),
    original,
  };
}

// ---------------------------------------------------------------------------
// Screen PSD
// ---------------------------------------------------------------------------

export async function writeScreenPsdWithStats(input: ScreenPsdInput, options: PsdWriteOptions = {}): Promise<{ bytes: Buffer; stats: PsdWriteStats }> {
  const compression = options.compression ?? 'rle';
  const { set, garments, original } = input;
  const { widthPx: W, heightPx: H, ppi, art } = set.canvas;
  if (!(W > 0 && H > 0 && ppi > 0)) throw new Error('screen set canvas has no size');
  const plates = [...set.plates].sort((a, b) => a.index - b.index);
  if (plates.length === 0) throw new Error('screen set has no films');
  plates.forEach((p, i) => {
    if (p.index !== i + 1) throw new Error(`films must be numbered 1..${plates.length} in press order`);
    if (p.plate.width !== W || p.plate.height !== H || p.plate.data.length !== W * H) {
      throw new Error(`film ${p.index} is ${p.plate.width} × ${p.plate.height}, the canvas is ${W} × ${H}`);
    }
    if (p.plate.ppi !== ppi) throw new Error(`film ${p.index} is at ${p.plate.ppi} ppi, the canvas at ${ppi} ppi`);
  });
  const setGarments = [...new Set(set.garmentCodes)].map((code) => garmentFor(code, garments));
  if (setGarments.length === 0) throw new Error('screen set has no garment colours');

  const orig = await originalLayer(original, art, ppi, compression);
  const layers: LayerSpec[] = [orig.layer, ...setGarments.map((g) => garmentFillLayer(g, W, H, compression))];

  // A film is black dots on transparency: the transparency channel is the
  // plate, the colour channels are black (shared, they are identical).
  const black = encodeChannel(W, H, { kind: 'constant', value: 0 }, compression);
  for (const p of plates) {
    const [r, g, b] = hexToRgb(p.target.hex);
    layers.push({
      name: plateLayerName(p, plates.length),
      left: 0,
      top: 0,
      width: W,
      height: H,
      channels: [
        { id: -1, encoded: encodeChannel(W, H, { kind: 'buffer', data: p.plate.data, offset: 0, stride: 1, rowStride: W }, compression) },
        { id: 0, encoded: black },
        { id: 1, encoded: black },
        { id: 2, encoded: black },
      ],
      overlay: { r, g, b },
    });
  }

  // Merged image: the print in colour on the set's first garment.
  const ground = hexToRgb(setGarments[0].hex);
  const inks = plates.map((p) => ({ data: p.plate.data, rgb: hexToRgb(p.target.hex) }));
  const thumb = new ThumbnailAccumulator(W, H);
  const composite = encodeRgbRows(W, H, (y, r, g, b) => {
    r.fill(ground[0]);
    g.fill(ground[1]);
    b.fill(ground[2]);
    const base = y * W;
    for (const ink of inks) {
      const [ir, ig, ib] = ink.rgb;
      const d = ink.data;
      for (let x = 0; x < W; x++) {
        if (d[base + x] >= 128) {
          r[x] = ir;
          g[x] = ig;
          b[x] = ib;
        }
      }
    }
    thumb.addRow(y, r, g, b);
  });

  const doc: DocumentSpec = {
    width: W,
    height: H,
    ppi,
    layers,
    linkedFiles: [orig.linked],
    composite,
    thumbnail: await thumb.jpeg(),
    // Guides on the print area, for anyone reworking the films.
    guides: [
      { location: art.x, direction: 'vertical' },
      { location: art.x + art.width, direction: 'vertical' },
      { location: art.y, direction: 'horizontal' },
      { location: art.y + art.height, direction: 'horizontal' },
    ],
  };
  const built = assemblePsd(doc);
  return { bytes: built.bytes, stats: statsFor(doc, built, compression, orig.info) };
}

// ---------------------------------------------------------------------------
// DTG/DTF PSD
// ---------------------------------------------------------------------------

export async function writeDtgPsdWithStats(input: DtgPsdInput, options: PsdWriteOptions = {}): Promise<{ bytes: Buffer; stats: PsdWriteStats }> {
  const compression = options.compression ?? 'rle';
  const { layers: dtgLayers, garments, original } = input;
  if (dtgLayers.length === 0) throw new Error('no DTG/DTF layers to write');
  const { width: W, height: H } = dtgLayers[0].printAreaPx;
  const ppi = dtgLayers[0].raster.ppi;
  for (const l of dtgLayers) {
    if (l.printAreaPx.width !== W || l.printAreaPx.height !== H) throw new Error('DTG/DTF layers disagree on the print area');
    if (l.raster.ppi !== ppi) throw new Error('DTG/DTF layers disagree on ppi');
    if (l.raster.channels !== 4) throw new Error(`the DTG/DTF layer for ${l.garmentCode} is not RGBA`);
    const { x, y } = l.offsetPx;
    if (x < 0 || y < 0 || x + l.raster.width > W || y + l.raster.height > H) throw new Error(`the DTG/DTF layer for ${l.garmentCode} sits outside the print area`);
  }

  const orig = await originalLayer(original, { x: 0, y: 0, width: W, height: H }, ppi, compression);
  const layers: LayerSpec[] = [orig.layer];
  // The preview shows the first garment that prints anything.
  const shown = dtgLayers.find((l) => l.raster.width > 0 && l.raster.height > 0) ?? dtgLayers[0];
  dtgLayers.forEach((l) => {
    const garment = garmentFor(l.garmentCode, garments);
    layers.push(garmentFillLayer(garment, W, H, compression));
    layers.push({
      name: dtgLayerName(garment.name),
      left: l.offsetPx.x,
      top: l.offsetPx.y,
      width: l.raster.width,
      height: l.raster.height,
      channels: rgbaLayerChannels(l.raster.data, l.raster.width, l.raster.height, compression),
      // One garment's version shows at a time.
      hidden: l !== shown,
    });
  });

  const first: DtgLayer = shown;
  const ground = hexToRgb(garmentFor(first.garmentCode, garments).hex);
  const thumb = new ThumbnailAccumulator(W, H);
  const rw = first.raster.width;
  const composite = encodeRgbRows(W, H, (y, r, g, b) => {
    r.fill(ground[0]);
    g.fill(ground[1]);
    b.fill(ground[2]);
    const ly = y - first.offsetPx.y;
    if (ly >= 0 && ly < first.raster.height) {
      const d = first.raster.data;
      for (let lx = 0; lx < rw; lx++) {
        const p = (ly * rw + lx) * 4;
        if (d[p + 3] >= 128) {
          const x = first.offsetPx.x + lx;
          r[x] = d[p];
          g[x] = d[p + 1];
          b[x] = d[p + 2];
        }
      }
    }
    thumb.addRow(y, r, g, b);
  });

  const doc: DocumentSpec = {
    width: W,
    height: H,
    ppi,
    layers,
    linkedFiles: [orig.linked],
    composite,
    thumbnail: await thumb.jpeg(),
    guides: [],
  };
  const built = assemblePsd(doc);
  return { bytes: built.bytes, stats: statsFor(doc, built, compression, orig.info) };
}
