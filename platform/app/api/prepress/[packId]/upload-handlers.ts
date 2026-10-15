// The corrected-PSD upload, in two small requests. A PSD is hundreds of MB and a
// function's request body stops at 4.5 MB, so the file never passes through the
// app: the browser PUTs it straight to print storage on a short-lived signed URL.
//
//   1. POST .../upload-url   { filename, size }  ->  a signed PUT for a new key
//   2. (the browser PUTs the file to storage)
//   3. POST .../upload-done  { key }             ->  the service rebuilds the pack
//
// Both bodies are a few hundred bytes (they are read with a cap). Everything that
// can be refused without the file is refused in step 1; step 3 looks at what
// actually landed in storage (is it there, is it a size we take, does it start
// like a Photoshop file) before the service ever loads it, because a signed URL
// can't promise any of that. Written apart from the route files so the tests can
// run it with stand-ins for the session, storage and the service.
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import type { ServiceResult, UploadOutcome } from '@/lib/services/prepress';
import {
  isPsdSignature,
  isUploadKeyFor,
  MAX_JSON_BODY_BYTES,
  parseUploadFilename,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_URL_LIFETIME_SECONDS,
  uploadKey,
} from '@/components/admin/prepress/rules';
import { authorise, ok, refuse } from './guard';

/** What print storage hands back for a signed upload (createUploadUrl in lib/services/print-storage.ts). */
export interface UploadTicket {
  url: string;
  method: 'PUT';
  /** headers the browser must send with the PUT, exactly as given */
  headers: Record<string, string>;
  key: string;
  /** ISO 8601 */
  expiresAt: string;
}

/** What a signed upload is asked for. `maxBytes` is the most this server takes (print
 * storage enforces it for certain only on its local driver); `contentLength` is the
 * exact size the browser announced, which R2 holds the PUT to. */
export interface UploadUrlRequest {
  actor: Actor;
  key: string;
  contentType: string;
  maxBytes: number;
  contentLength: number;
  /** seconds */
  expiresIn: number;
}

export interface UploadDeps {
  /** who is asking; null when nobody is signed in */
  getActor: () => Promise<Actor | null>;
  /** the largest file taken, in bytes */
  maxBytes: number;
  /** a fresh unguessable segment for each upload's key */
  nonce: () => string;
  createUploadUrl: (input: UploadUrlRequest) => Promise<UploadTicket>;
  /** what storage says about an object, or null when it isn't there */
  statUpload: (key: string) => Promise<{ bytes: number } | null>;
  /** the first `length` bytes of an object, or null when it isn't there */
  readHead: (key: string, length: number) => Promise<Uint8Array | null>;
  removeUpload: (key: string) => Promise<void>;
  /** takes the stored PSD, rebuilds the pack, and records the upload in the staff activity log itself (so the routes don't) */
  uploadCorrectedPsd: (actor: Actor, packId: string, storageKey: string) => Promise<ServiceResult<UploadOutcome>>;
}

/** A small JSON object from the request, or null when the body is missing, too
 * big (read with a cap, whatever Content-Length says), or not an object. */
async function readSmallJson(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_JSON_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function failed(step: string, err: unknown): Response {
  console.error(`[prepress upload] ${step} failed:`, err instanceof Error ? err.message : err);
  return refuse('failed');
}

/** Step 1: a signed PUT for the file the browser is about to send. */
export async function handleUploadUrl(req: Request, packId: string, deps: UploadDeps): Promise<Response> {
  const actor = await authorise(packId, deps.getActor, 'work');
  if (actor instanceof Response) return actor;

  const body = await readSmallJson(req);
  if (!body || typeof body.filename !== 'string' || body.filename.trim() === '') return refuse('bad_request');
  const size = body.size;
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 0) return refuse('bad_request');

  const filename = parseUploadFilename(body.filename);
  if (filename === null) return refuse('not_a_psd');
  if (size === 0) return refuse('empty');
  if (size > deps.maxBytes) return refuse('too_large');

  const key = uploadKey(packId, deps.nonce(), filename);
  let ticket: UploadTicket;
  try {
    ticket = await deps.createUploadUrl({
      actor,
      key,
      contentType: UPLOAD_CONTENT_TYPE,
      maxBytes: deps.maxBytes,
      contentLength: size,
      expiresIn: UPLOAD_URL_LIFETIME_SECONDS,
    });
  } catch (err) {
    if (err instanceof PermissionError) return refuse('forbidden');
    return failed('creating the upload URL', err);
  }
  // Only these fields go to the browser, and the key is the one made here.
  return ok({ url: ticket.url, method: ticket.method, headers: ticket.headers, key, expiresAt: ticket.expiresAt });
}

/** Removal is tidiness, never a reason to answer differently. */
async function discard(key: string, deps: UploadDeps): Promise<void> {
  try {
    await deps.removeUpload(key);
  } catch (err) {
    console.error('[prepress upload] could not remove a refused upload:', err instanceof Error ? err.message : err);
  }
}

/** Step 3: the file is in storage; check it, then hand it to the service. */
export async function handleUploadDone(req: Request, packId: string, deps: UploadDeps): Promise<Response> {
  const actor = await authorise(packId, deps.getActor, 'work');
  if (actor instanceof Response) return actor;

  const body = await readSmallJson(req);
  const key = body?.key;
  // Only a key this pack's upload-url made: never an arbitrary object in storage.
  if (typeof key !== 'string' || !isUploadKeyFor(packId, key)) return refuse('bad_request');

  let info: { bytes: number } | null;
  try {
    info = await deps.statUpload(key);
  } catch (err) {
    return failed('looking for the upload', err);
  }
  if (!info) return refuse('incomplete');
  if (info.bytes === 0) {
    await discard(key, deps);
    return refuse('empty');
  }
  if (info.bytes > deps.maxBytes) {
    await discard(key, deps);
    return refuse('too_large');
  }

  let head: Uint8Array | null;
  try {
    head = await deps.readHead(key, 6);
  } catch (err) {
    return failed('reading the upload', err);
  }
  if (!head) return refuse('incomplete');
  if (!isPsdSignature(head)) {
    await discard(key, deps);
    return refuse('not_a_psd');
  }

  let result: ServiceResult<UploadOutcome>;
  try {
    result = await deps.uploadCorrectedPsd(actor, packId, key);
  } catch (err) {
    if (err instanceof PermissionError) return refuse('forbidden');
    return failed('rebuilding the pack', err);
  }
  if (!result.ok) return refuse('rejected', result.error);
  return ok({ ok: true, outcome: result.value });
}
