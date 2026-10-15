// A small PNG writer and chunk reader. The DTG PNGs are written here rather
// than through sharp so the pixels go out exactly as the engine made them (no
// colour transform can nudge an RGB 255 white to 254) and so pngjs stays a
// decoder independent of the writer for the checks (Plan 6.4).
import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

const deflate = promisify(zlib.deflate);

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let crcTable: Uint32Array | null = null;

/** CRC-32 as PNG uses it (zlib's when Node has it). */
export function crc32(data: Uint8Array): number {
  const native = (zlib as unknown as { crc32?: (d: Uint8Array) => number }).crc32;
  if (native) return native(data) >>> 0;
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface PngChunk {
  type: string;
  data: Buffer;
}

export function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Every chunk in file order. Throws on a bad signature, a truncated file or a CRC mismatch. */
export function readPngChunks(png: Buffer): PngChunk[] {
  if (png.length < 8 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG file');
  const chunks: PngChunk[] = [];
  let o = 8;
  while (o < png.length) {
    if (o + 12 > png.length) throw new Error('truncated PNG chunk');
    const len = png.readUInt32BE(o);
    const type = png.toString('latin1', o + 4, o + 8);
    if (o + 12 + len > png.length) throw new Error(`truncated PNG chunk ${type}`);
    const data = png.subarray(o + 8, o + 8 + len);
    const crc = png.readUInt32BE(o + 8 + len);
    if (crc32(png.subarray(o + 4, o + 8 + len)) !== crc) throw new Error(`bad CRC in PNG chunk ${type}`);
    chunks.push({ type, data });
    o += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

/** pixels per metre for a ppi, as pHYs stores it: 300 ppi -> 11811. */
export function ppiToPixelsPerMetre(ppi: number): number {
  return Math.round(ppi / 0.0254);
}

export interface PngPhys {
  x: number;
  y: number;
  /** 1 = metre, 0 = aspect ratio only */
  unit: number;
}

export function parsePhys(chunk: PngChunk): PngPhys {
  return { x: chunk.data.readUInt32BE(0), y: chunk.data.readUInt32BE(4), unit: chunk.data[8] };
}

/** The profile carried by an iCCP chunk. */
export function parseIccp(chunk: PngChunk): { name: string; profile: Buffer } {
  const nul = chunk.data.indexOf(0);
  if (nul < 1 || nul > 79) throw new Error('bad iCCP profile name');
  if (chunk.data[nul + 1] !== 0) throw new Error('unknown iCCP compression method');
  return { name: chunk.data.toString('latin1', 0, nul), profile: zlib.inflateSync(chunk.data.subarray(nul + 2)) };
}

export interface EncodePngInput {
  width: number;
  height: number;
  /** 1 = grey, 3 = RGB, 4 = RGBA; 8 bits per channel */
  channels: 1 | 3 | 4;
  data: Uint8Array;
  /** written as pHYs in pixels per metre */
  ppi?: number;
  /** embedded as iCCP */
  icc?: { name: string; profile: Buffer };
  /** tEXt chunks; Latin-1 */
  text?: Record<string, string>;
}

const COLOUR_TYPE = { 1: 0, 3: 2, 4: 6 } as const;

/** One filtered byte: x is the byte, a the one to its left, b above, c above-left. */
function filterByte(filter: number, x: number, a: number, b: number, c: number): number {
  switch (filter) {
    case 0:
      return x;
    case 1:
      return (x - a) & 0xff;
    case 2:
      return (x - b) & 0xff;
    case 3:
      return (x - ((a + b) >> 1)) & 0xff;
    default: {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      return (x - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
    }
  }
}

// Per-row filter choice by the minimum sum of absolute differences, the
// heuristic libpng recommends; flat art compresses several times better than
// with no filter.
function filterRows(data: Uint8Array, width: number, height: number, bpp: number): Buffer {
  const stride = width * bpp;
  const out = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    const prev = y > 0 ? row - stride : -1;
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0;
      for (let i = 0; i < stride && sum < bestSum; i++) {
        const a = i >= bpp ? data[row + i - bpp] : 0;
        const b = prev >= 0 ? data[prev + i] : 0;
        const c = prev >= 0 && i >= bpp ? data[prev + i - bpp] : 0;
        const v = filterByte(f, data[row + i], a, b, c);
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        best = f;
      }
    }
    const o = y * (stride + 1);
    out[o] = best;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? data[row + i - bpp] : 0;
      const b = prev >= 0 ? data[prev + i] : 0;
      const c = prev >= 0 && i >= bpp ? data[prev + i - bpp] : 0;
      out[o + 1 + i] = filterByte(best, data[row + i], a, b, c);
    }
  }
  return out;
}

const IDAT_CHUNK_BYTES = 256 * 1024;

/** An 8-bit PNG with the exact pixels given. Deterministic: the same input
 * always gives the same bytes (no time stamps, fixed zlib settings). */
export async function encodePng(input: EncodePngInput): Promise<Buffer> {
  const { width, height, channels, data } = input;
  if (!(width > 0 && height > 0 && Number.isInteger(width) && Number.isInteger(height))) {
    throw new Error(`PNG size must be positive whole pixels, got ${width} x ${height}`);
  }
  if (data.length !== width * height * channels) throw new Error('PNG pixel buffer does not match its size');

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = COLOUR_TYPE[channels];
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const parts: Buffer[] = [PNG_SIGNATURE, pngChunk('IHDR', ihdr)];
  if (input.icc) {
    const name = Buffer.from(input.icc.name.slice(0, 79), 'latin1');
    const compressed = zlib.deflateSync(input.icc.profile, { level: 9 });
    parts.push(pngChunk('iCCP', Buffer.concat([name, Buffer.from([0, 0]), compressed])));
  }
  if (input.ppi) {
    const phys = Buffer.alloc(9);
    const ppm = ppiToPixelsPerMetre(input.ppi);
    phys.writeUInt32BE(ppm, 0);
    phys.writeUInt32BE(ppm, 4);
    phys[8] = 1;
    parts.push(pngChunk('pHYs', phys));
  }
  for (const [key, value] of Object.entries(input.text ?? {})) {
    const k = Buffer.from(key.slice(0, 79), 'latin1');
    const v = Buffer.from(value.replace(/[^\x20-\x7e\xa0-\xff\n]/g, '?'), 'latin1');
    parts.push(pngChunk('tEXt', Buffer.concat([k, Buffer.from([0]), v])));
  }

  const filtered = filterRows(data, width, height, channels);
  const compressed = await deflate(filtered, { level: 9, memLevel: 9 });
  for (let o = 0; o < compressed.length; o += IDAT_CHUNK_BYTES) {
    parts.push(pngChunk('IDAT', compressed.subarray(o, Math.min(compressed.length, o + IDAT_CHUNK_BYTES))));
  }
  parts.push(pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
