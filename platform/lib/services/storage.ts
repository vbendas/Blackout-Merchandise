// File storage adapter. Wave 1 implements it on fal storage (public URLs that
// fal models can read); Cloudinary replaces it later behind the same interface.
import { fal } from '@fal-ai/client';

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  // fal.storage.upload only needs credentials; never log the key itself.
  fal.config({ credentials: process.env.FAL_API_KEY });
  configured = true;
}

export interface StoredFile {
  /** public https URL */
  url: string;
  /** provider key/id for later deletion */
  key: string;
  contentType: string;
  bytes: number;
}

export interface PutFileInput {
  data: Uint8Array | Buffer;
  contentType: string;
  filename: string;
  /** logical folder, e.g. 'designs/<storeId>' */
  folder: string;
}

/** fal storage keys files by the URL it hands back; there is no separate id,
 * so we use the URL itself as the key (matches StoredFile.key contract). */
function keyFromUrl(url: string): string {
  return url;
}

export async function putFile(input: PutFileInput): Promise<StoredFile> {
  ensureConfigured();
  const bytes = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data);
  // Buffer.slice/subarray share the underlying ArrayBuffer; Blob needs a
  // clean copy so an oversized backing buffer (e.g. Buffer pool) does not
  // leak extra bytes into the upload.
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: input.contentType });
  // fal storage has no folder concept; fold it into the filename so uploads
  // stay traceable to their logical location in the fal dashboard.
  const name = `${input.folder.replace(/\/+$/, '')}/${input.filename}`.replace(/^\/+/, '');
  const file = new File([blob], name, { type: input.contentType });
  const url = await fal.storage.upload(file);
  return { url, key: keyFromUrl(url), contentType: input.contentType, bytes: bytes.byteLength };
}

export async function putFromUrl(url: string, folder: string, filename?: string): Promise<StoredFile> {
  ensureConfigured();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch source url for storage: ${response.status}`);
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();
  const name = filename ?? url.split('/').pop() ?? 'file';
  return putFile({ data: new Uint8Array(arrayBuffer), contentType, filename: name, folder });
}
