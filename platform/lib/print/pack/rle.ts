// PSD channel compression. Plates are encoded straight from their 1-byte
// buffers, row by row, so a 600 ppi full front never needs a 4-byte-per-pixel
// copy of any layer. RLE is PackBits with a table of row lengths; the lengths
// are kept apart from the rows so the same encoding serves PSD (2-byte
// lengths) and PSB (4-byte lengths) without encoding twice.
import * as zlib from 'node:zlib';

export type PsdCompression = 'rle' | 'zip';

/** PSD channel compression codes. */
export const COMPRESSION_CODE = { rle: 1, zip: 2 } as const;

/** Where a channel's pixels come from. Pixel (x, y) of a buffer source is
 * data[offset + y * rowStride + x * stride]. */
export type ChannelSource =
  | { kind: 'buffer'; data: Uint8Array; offset: number; stride: number; rowStride: number }
  | { kind: 'constant'; value: number }
  | { kind: 'rows'; fill: (y: number, row: Uint8Array) => void };

export interface EncodedChannel {
  compression: PsdCompression;
  width: number;
  height: number;
  /** RLE: compressed length of each row; empty for zip */
  rowLengths: Uint32Array;
  /** RLE rows back to back, or the zlib stream */
  data: Buffer;
}

class ByteSink {
  buf: Uint8Array;
  len = 0;
  constructor(initial: number) {
    this.buf = new Uint8Array(Math.max(1024, initial));
  }
  reserve(n: number): void {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  /** The bytes written; copied out when the sink overshot by a lot, so big
   * documents don't hold doubled buffers until they are written. */
  toBuffer(): Buffer {
    if (this.len < this.buf.length * 0.75) return Buffer.from(this.buf.subarray(0, this.len));
    return Buffer.from(this.buf.buffer, this.buf.byteOffset, this.len);
  }
}

/** PackBits one row of `count` samples read every `stride` bytes from `start`.
 * Runs of 2 or more become repeats; literals stop where a run of 3 begins. */
export function packBitsRow(src: Uint8Array, start: number, stride: number, count: number, out: Uint8Array, o: number): number {
  let i = 0;
  while (i < count) {
    const v = src[start + i * stride];
    let r = 1;
    while (i + r < count && r < 128 && src[start + (i + r) * stride] === v) r++;
    if (r >= 2) {
      out[o++] = 257 - r; // 1 - r as a signed byte
      out[o++] = v;
      i += r;
      continue;
    }
    const litStart = i;
    i++;
    while (i < count && i - litStart < 128) {
      const p = start + i * stride;
      if (i + 2 < count && src[p] === src[p + stride] && src[p] === src[p + 2 * stride]) break;
      i++;
    }
    const n = i - litStart;
    out[o++] = n - 1;
    for (let k = 0; k < n; k++) out[o++] = src[start + (litStart + k) * stride];
  }
  return o;
}

/** Inverse of packBitsRow, for tests and the reader's sanity checks. */
export function unpackBits(src: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let i = 0;
  let o = 0;
  while (i < src.length && o < expected) {
    const n = src[i++];
    if (n < 128) {
      const len = n + 1;
      out.set(src.subarray(i, i + len), o);
      i += len;
      o += len;
    } else if (n > 128) {
      const len = 257 - n;
      out.fill(src[i++], o, o + len);
      o += len;
    }
  }
  if (o !== expected) throw new Error('PackBits row is short');
  return out;
}

function encodeRle(width: number, height: number, source: ChannelSource): EncodedChannel {
  const rowLengths = new Uint32Array(height);
  const worst = width + Math.ceil(width / 128) + 2;

  if (source.kind === 'constant') {
    const row = new Uint8Array(width).fill(source.value & 0xff);
    const packed = new Uint8Array(worst);
    const n = packBitsRow(row, 0, 1, width, packed, 0);
    const data = Buffer.alloc(n * height);
    for (let y = 0; y < height; y++) {
      data.set(packed.subarray(0, n), y * n);
      rowLengths[y] = n;
    }
    return { compression: 'rle', width, height, rowLengths, data };
  }

  // Start the sink at a guess for sparse films; it grows by doubling.
  const sink = new ByteSink(Math.min(width * height, (width * height) >> 3) + height * 4);
  const scratch = source.kind === 'rows' ? new Uint8Array(width) : null;
  for (let y = 0; y < height; y++) {
    sink.reserve(worst);
    let n: number;
    if (source.kind === 'buffer') {
      n = packBitsRow(source.data, source.offset + y * source.rowStride, source.stride, width, sink.buf, sink.len) - sink.len;
    } else {
      source.fill(y, scratch!);
      n = packBitsRow(scratch!, 0, 1, width, sink.buf, sink.len) - sink.len;
    }
    sink.len += n;
    rowLengths[y] = n;
  }
  return { compression: 'rle', width, height, rowLengths, data: sink.toBuffer() };
}

function encodeZip(width: number, height: number, source: ChannelSource): EncodedChannel {
  const raw = new Uint8Array(width * height);
  if (source.kind === 'constant') raw.fill(source.value & 0xff);
  else {
    const row = new Uint8Array(width);
    for (let y = 0; y < height; y++) {
      if (source.kind === 'buffer') {
        const base = source.offset + y * source.rowStride;
        for (let x = 0; x < width; x++) row[x] = source.data[base + x * source.stride];
      } else source.fill(y, row);
      raw.set(row, y * width);
    }
  }
  // Zip without prediction (PSD compression 2), a zlib stream as ag-psd writes it.
  return { compression: 'zip', width, height, rowLengths: new Uint32Array(0), data: zlib.deflateSync(raw, { level: 6 }) };
}

/** Three RLE channels (red, green, blue) from rows computed once each, for the
 * merged image, which is always RLE. */
export function encodeRgbRows(
  width: number,
  height: number,
  fill: (y: number, r: Uint8Array, g: Uint8Array, b: Uint8Array) => void,
): [EncodedChannel, EncodedChannel, EncodedChannel] {
  const worst = width + Math.ceil(width / 128) + 2;
  const rows = [new Uint8Array(width), new Uint8Array(width), new Uint8Array(width)];
  const sinks = rows.map(() => new ByteSink((width * height) >> 4));
  const lengths = rows.map(() => new Uint32Array(height));
  for (let y = 0; y < height; y++) {
    fill(y, rows[0], rows[1], rows[2]);
    for (let c = 0; c < 3; c++) {
      const sink = sinks[c];
      sink.reserve(worst);
      const n = packBitsRow(rows[c], 0, 1, width, sink.buf, sink.len) - sink.len;
      sink.len += n;
      lengths[c][y] = n;
    }
  }
  const out = sinks.map((s, c) => ({ compression: 'rle' as const, width, height, rowLengths: lengths[c], data: s.toBuffer() }));
  return [out[0], out[1], out[2]];
}

export function encodeChannel(width: number, height: number, source: ChannelSource, compression: PsdCompression = 'rle'): EncodedChannel {
  if (width <= 0 || height <= 0) return { compression, width, height, rowLengths: new Uint32Array(0), data: Buffer.alloc(0) };
  return compression === 'zip' ? encodeZip(width, height, source) : encodeRle(width, height, source);
}

function rowCountTable(rowLengths: Uint32Array, large: boolean): Buffer {
  const size = large ? 4 : 2;
  const table = Buffer.alloc(rowLengths.length * size);
  for (let y = 0; y < rowLengths.length; y++) {
    if (large) table.writeUInt32BE(rowLengths[y], y * 4);
    else table.writeUInt16BE(rowLengths[y], y * 2);
  }
  return table;
}

/** A layer channel's bytes after its 2-byte compression code. */
export function layerChannelPayload(channel: EncodedChannel, large: boolean): Buffer {
  if (channel.compression === 'zip' || channel.height === 0) return channel.data;
  return Buffer.concat([rowCountTable(channel.rowLengths, large), channel.data]);
}

/** The merged-image section: compression code, every channel's row lengths,
 * then every channel's rows (always RLE: Photoshop doesn't read zip here). */
export function compositeSection(channels: EncodedChannel[], large: boolean): Buffer[] {
  for (const c of channels) if (c.compression !== 'rle') throw new Error('the merged image must be RLE');
  const code = Buffer.alloc(2);
  code.writeUInt16BE(COMPRESSION_CODE.rle, 0);
  return [code, ...channels.map((c) => rowCountTable(c.rowLengths, large)), ...channels.map((c) => c.data)];
}

export function encodedSize(channel: EncodedChannel, large: boolean): number {
  return channel.data.length + (channel.compression === 'rle' ? channel.rowLengths.length * (large ? 4 : 2) : 0);
}
