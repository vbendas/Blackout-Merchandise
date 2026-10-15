// Decoders independent of the writers, for the checks (Plan 6.4): @webtoon/psd
// for PSDs (ag-psd writes them) and pngjs for PNGs (png.ts writes them).
// @webtoon/psd is ESM only, so it is loaded with import(), which works from the
// worker, tsx and Next alike.
import { PNG } from 'pngjs';
import type WebtoonPsd from '@webtoon/psd';
import type { Layer as WebtoonLayer } from '@webtoon/psd';

export type { WebtoonPsd, WebtoonLayer };

let psdClass: typeof WebtoonPsd | null = null;

/** Additional-info keys whose length is 8 bytes in a PSB (Adobe file format). */
const PSB_LARGE_KEYS = new Set(['LMsk', 'Lr16', 'Lr32', 'Layr', 'Mt16', 'Mt32', 'Mtrn', 'Alph', 'FMsk', 'lnk2', 'FEid', 'FXid', 'PxSD']);

/**
 * @webtoon/psd 0.4.0 lists 'Ink2' (capital i) where Adobe's PSB key list has
 * 'lnk2', so it reads the 8-byte length of a PSB's embedded-file block as 4
 * bytes and stops. For PSBs it gets a copy with that one length field
 * shortened to 4 bytes (and the enclosing section length to match); every
 * other byte is the file's own. PSDs are passed through untouched.
 */
export function webtoonReadableCopy(bytes: Buffer): Buffer {
  if (bytes.length < 26 || bytes.readUInt16BE(4) !== 2) return bytes;
  let o = 26;
  o += 4 + bytes.readUInt32BE(o);
  o += 4 + bytes.readUInt32BE(o);
  const sectionAt = o;
  const sectionEnd = sectionAt + 8 + Number(bytes.readBigUInt64BE(sectionAt));
  let p = sectionAt + 8;
  p += 8 + Number(bytes.readBigUInt64BE(p)); // layer info
  p += 4 + bytes.readUInt32BE(p); // global layer mask info
  const cuts: number[] = [];
  while (p + 12 <= sectionEnd) {
    const signature = bytes.toString('latin1', p, p + 4);
    if (signature !== '8BIM' && signature !== '8B64') break;
    const key = bytes.toString('latin1', p + 4, p + 8);
    const large = PSB_LARGE_KEYS.has(key);
    const length = large ? Number(bytes.readBigUInt64BE(p + 8)) : bytes.readUInt32BE(p + 8);
    if (key === 'lnk2' && large && length < 2 ** 32) cuts.push(p + 8);
    // global blocks are padded to 4 bytes by their size, as both libraries do
    p += 8 + (large ? 8 : 4) + length + ((4 - (length % 4)) % 4);
  }
  if (!cuts.length) return bytes;
  const parts: Buffer[] = [];
  let from = 0;
  for (const at of cuts) {
    parts.push(bytes.subarray(from, at));
    from = at + 4; // drop the high half of the length
  }
  parts.push(bytes.subarray(from));
  const out = Buffer.concat(parts);
  out.writeBigUInt64BE(BigInt(sectionEnd - sectionAt - 8 - 4 * cuts.length), sectionAt);
  return out;
}

export async function parsePsdIndependently(bytes: Buffer): Promise<WebtoonPsd> {
  if (!psdClass) psdClass = (await import('@webtoon/psd')).default;
  const readable = webtoonReadableCopy(bytes);
  const copy = readable.buffer.slice(readable.byteOffset, readable.byteOffset + readable.byteLength) as ArrayBuffer;
  return psdClass.parse(copy);
}

export interface DecodedPng {
  width: number;
  height: number;
  /** RGBA, 8 bits per channel, whatever the file's colour type */
  data: Buffer;
  colorType: number;
  bitDepth: number;
  interlaced: boolean;
}

/** Decodes with pngjs. Pixels come back as RGBA without gamma correction. */
export function decodePngIndependently(bytes: Buffer): DecodedPng {
  const png = PNG.sync.read(bytes, { skipRescale: false });
  const header = bytes.subarray(16, 29);
  return {
    width: png.width,
    height: png.height,
    data: png.data,
    bitDepth: header[8],
    colorType: header[9],
    interlaced: header[12] === 1,
  };
}
