// Print file storage (WP5): Cloudflare R2 through its S3 API in production,
// a local folder in development. PSDs, PNGs and job sheets are private; proofs
// and film previews are public. Separate from lib/services/storage.ts, which
// keeps fal storage for artwork NB2 must read.
//
// Driver: PRINT_STORAGE_DRIVER=local|r2 (PRINT_STORAGE is accepted as an alias).
// Unset, it is r2 when the four required R2 variables are present and local
// otherwise; in production an unset driver without R2 is an error, so files
// never land on a container disk by accident.
//
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET   required for r2
//   R2_PUBLIC_BUCKET, R2_PUBLIC_BASE_URL   optional, used together: proofs and film
//       previews go to their own bucket, served from that bucket's public domain.
//       R2_PUBLIC_BASE_URL alone is ignored, and an R2_PUBLIC_BUCKET that names
//       R2_BUCKET is refused: one bucket behind a public domain would expose
//       the private PSDs to anyone who can guess a key.
//   R2_ENDPOINT   optional full endpoint, e.g. the EU jurisdiction
//       https://<account>.eu.r2.cloudflarestorage.com, or a local S3 server
//   PRINT_STORAGE_DIR   local root, default .data/print-storage (gitignored)
//   PRINT_UPLOAD_SECRET   optional, signs the local upload links (16+ characters);
//       without it a random secret is kept in <local root>/.secret
//
// Private objects are only ever served through /api/print-files/[...key], which
// checks access first and then streams (local) or redirects to a presigned R2
// URL that lives for a minute. Files run to hundreds of MB: reads stream, and
// R2 uploads go out as one signed PUT with an unsigned payload (the S3 limit
// for that is just under 5 GiB, which covers a PSB).
//
// Browser uploads of that size never pass through the app (a function's request
// body stops at 4.5 MB, and with proxy.ts Next buffers only 10 MB): createUploadUrl
// hands staff a signed PUT. On R2 it is a SigV4 presigned PUT straight to the
// bucket (the bucket needs CORS for the app origin: PUT, header Content-Type).
// On the local driver it is a one-time link to the PUT handler of the same route
// (app/api/print-files/upload.ts), which streams to disk; its token is one of the
// headers to send, not part of the URL.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { AwsClient } from 'aws4fetch';
import { requirePermission, type Actor, type Area, type Level } from '@/lib/auth/permissions';

export type Visibility = 'public' | 'private';

export interface StoredObject {
  key: string;
  visibility: Visibility;
  contentType: string;
  bytes: number;
  sha256: string;
}

export interface PutObjectInput {
  /** from printKey() */
  key: string;
  data: Uint8Array | Buffer;
  contentType: string;
  visibility: Visibility;
}

/** What storage knows about an object without reading it. */
export interface ObjectInfo {
  key: string;
  visibility: Visibility;
  contentType: string;
  bytes: number;
  /** null for files that were dropped into the local folder by hand */
  sha256: string | null;
}

/** Inclusive byte range, like an HTTP Range header after parsing. */
export interface ByteRange {
  start: number;
  end: number;
}

export interface OpenedObject {
  info: ObjectInfo;
  stream: ReadableStream<Uint8Array>;
  /** the range actually served; the whole object when none was asked for */
  range: ByteRange;
}

export type PrintStorageErrorCode =
  | 'not_found'
  | 'invalid_key'
  | 'invalid_request'
  | 'too_large'
  | 'config'
  | 'upstream'
  /** an upload link that was already used */
  | 'conflict'
  /** an upload that stopped short of the size it announced */
  | 'incomplete';

export class PrintStorageError extends Error {
  readonly code: PrintStorageErrorCode;
  constructor(code: PrintStorageErrorCode, message: string) {
    super(message);
    this.name = 'PrintStorageError';
    this.code = code;
  }
}

export function isNotFound(err: unknown): boolean {
  return err instanceof PrintStorageError && err.code === 'not_found';
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** One path segment: no leading dot, so '..' and the hidden folders the local
 * driver keeps for itself can never be addressed. */
const SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const MAX_KEY_LENGTH = 512;

export function isValidKey(key: string): boolean {
  if (!key || key.length > MAX_KEY_LENGTH) return false;
  return key.split('/').every((segment) => SEGMENT.test(segment));
}

function assertKey(key: string): void {
  if (!isValidKey(key)) throw new PrintStorageError('invalid_key', `Invalid print storage key: ${JSON.stringify(key.slice(0, 80))}`);
}

function safePart(part: string): string {
  const cleaned = part
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+|-+$/g, '');
  return cleaned || '_';
}

/** 'print/<designId>/v<version>/<...parts>' with each part made safe. */
export function printKey(designId: string, version: number, ...parts: string[]): string {
  return ['print', designId, `v${version}`, ...parts.map(safePart)].join('/');
}

// ---------------------------------------------------------------------------
// Signed uploads: the types (createUploadUrl is below the drivers)
// ---------------------------------------------------------------------------

export interface CreateUploadUrlInput {
  /** who is asking: needs the access the key's prefix calls for (Pre-press Work) */
  actor: Actor;
  /** chosen by the server, never by the browser: 'prepress-uploads/<packId>/<nonce>/<name>' or 'uploads/prepress/...' */
  key: string;
  /** the one type the PUT may carry; the browser must send it as the headers say */
  contentType: string;
  /** the largest file taken, in bytes. The local PUT enforces it; R2 cannot (see contentLength) */
  maxBytes: number;
  /** how long the link works, in seconds: default 900, held to 30..3600 */
  expiresIn?: number;
  /** the exact size, when the browser knows it: R2 then refuses any other length */
  contentLength?: number;
}

/** The header a local upload link's token travels in: a token in the URL would
 * end up in server logs (Next prints the URL of a request it warns about). */
export const UPLOAD_TOKEN_HEADER = 'x-upload-token';

export interface UploadUrl {
  url: string;
  method: 'PUT';
  /** send these with the PUT, exactly as they are (never Content-Length: the browser sets that) */
  headers: Record<string, string>;
  key: string;
  /** ISO 8601 */
  expiresAt: string;
}

/** What a driver is asked to sign: createUploadUrl has already checked it. */
export interface UploadRequest {
  key: string;
  contentType: string;
  maxBytes: number;
  contentLength?: number;
  expiresIn: number;
  userId: string;
}

/** What a local upload link says, read back from its token. */
export interface UploadGrant {
  key: string;
  contentType: string;
  maxBytes: number;
  /** the exact size the link was made for, if it was */
  contentLength: number | null;
  /** who the link was made for */
  userId: string;
  /** epoch ms */
  expiresAt: number;
  /** makes the link one-time */
  nonce: string;
}

export type UploadTokenCheck = { ok: true; grant: UploadGrant } | { ok: false; reason: 'invalid' | 'expired' | 'unsupported' };

// ---------------------------------------------------------------------------
// Driver interface
// ---------------------------------------------------------------------------

export interface PrintStorageDriver {
  readonly name: 'local' | 'r2';
  put(input: PutObjectInput & { sha256: string }): Promise<void>;
  get(key: string): Promise<Buffer>;
  open(key: string, range?: ByteRange): Promise<OpenedObject>;
  head(key: string): Promise<ObjectInfo | null>;
  remove(key: string): Promise<void>;
  /** A URL that needs no route in front of it, or null (public R2 objects only). */
  directUrl(key: string, visibility: Visibility): string | null;
  /** A signed, expiring URL straight to the object (R2 only). */
  presign?(key: string, visibility: Visibility, opts: { expiresInSeconds: number; download?: string }): Promise<string>;
  /** A signed PUT for a new private object. */
  uploadUrl(request: UploadRequest): Promise<UploadUrl>;
  /** Local only: reads an upload link's token, for the PUT handler. */
  checkUpload?(token: string, key: string): Promise<UploadTokenCheck>;
  /** Local only: takes the body of a PUT made on an upload link. */
  receiveUpload?(grant: UploadGrant, body: ReadableStream<Uint8Array>, declaredBytes: number): Promise<StoredObject>;
}

// ---------------------------------------------------------------------------
// Local driver: a folder on disk. Data lives at <root>/<key> so a PSD can be
// opened straight from Finder; sidecar metadata sits in <root>/.meta.
// ---------------------------------------------------------------------------

interface LocalMeta {
  contentType: string;
  visibility: Visibility;
  bytes: number;
  sha256: string;
  createdAt: string;
}

function emptyStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
}

/** Views over `data`, a few MB at a time, as a body stream: no copy of the whole. */
const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;

function streamOf(data: Uint8Array): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= data.byteLength) return controller.close();
      controller.enqueue(data.subarray(offset, offset + UPLOAD_CHUNK_BYTES));
      offset += UPLOAD_CHUNK_BYTES;
    },
  });
}

/** A path that is not there, or has a file where a folder should be. */
function isEnoent(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR';
}

export interface LocalDriverOptions {
  /** the clock (epoch ms) that upload links expire by; fixed in tests */
  now?: () => number;
  /** signs upload links; defaults to PRINT_UPLOAD_SECRET, then a random one kept in the storage folder */
  secret?: string;
}

/** What an upload link's token says, in short keys to keep the header small. */
interface UploadClaims {
  /** key */
  k: string;
  /** content type */
  t: string;
  /** max bytes */
  m: number;
  /** exact size, when the link was made for one */
  c?: number;
  /** expires, epoch ms */
  e: number;
  /** nonce: 32 hex characters, also the name of the file that marks the link used */
  n: string;
  /** user the link was made for */
  u: string;
}

function signClaims(claims: UploadClaims, secret: Buffer): string {
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

/** The claims of a token that this secret signed and that is well formed; null otherwise. */
function readClaims(token: string, secret: Buffer): UploadClaims | null {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const want = createHmac('sha256', secret).update(parts[0]).digest();
  const got = Buffer.from(parts[1], 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const c = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Partial<UploadClaims>;
    const wellFormed =
      typeof c.k === 'string' &&
      typeof c.t === 'string' &&
      Number.isSafeInteger(c.m) &&
      (c.c === undefined || Number.isSafeInteger(c.c)) &&
      Number.isFinite(c.e) &&
      typeof c.n === 'string' &&
      /^[0-9a-f]{32}$/.test(c.n) &&
      typeof c.u === 'string';
    return wellFormed ? (c as UploadClaims) : null;
  } catch {
    return null;
  }
}

async function readSecretFile(file: string): Promise<Buffer | null> {
  try {
    const bytes = Buffer.from((await readFile(file, 'utf8')).trim(), 'hex');
    return bytes.length >= 16 ? bytes : null;
  } catch (err) {
    if (isEnoent(err)) return null;
    throw err;
  }
}

/** The secret that signs local upload links: the one given, PRINT_UPLOAD_SECRET,
 * or a random one written once to <root>/.secret (so a restart, or the worker
 * next to the app, signs and checks with the same). */
async function loadUploadSecret(root: string, given: string | undefined): Promise<Buffer> {
  if (given) return Buffer.from(given);
  const configured = process.env.PRINT_UPLOAD_SECRET?.trim();
  if (configured && configured.length >= 16) return Buffer.from(configured);

  const file = path.join(root, '.secret');
  const existing = await readSecretFile(file);
  if (existing) return existing;
  await mkdir(root, { recursive: true });
  const fresh = randomBytes(32);
  try {
    await writeFile(file, fresh.toString('hex'), { flag: 'wx', mode: 0o600 });
    return fresh;
  } catch (err) {
    // another process wrote it first: use theirs
    const raced = (err as NodeJS.ErrnoException).code === 'EEXIST' ? await readSecretFile(file) : null;
    if (raced) return raced;
    throw err;
  }
}

export function createLocalDriver(root: string, options: LocalDriverOptions = {}): PrintStorageDriver {
  const clock = options.now ?? Date.now;
  const dataPath = (key: string) => path.join(root, ...key.split('/'));
  const metaPath = (key: string) => `${path.join(root, '.meta', ...key.split('/'))}.json`;
  let secretPending: Promise<Buffer> | null = null;
  const secret = () => (secretPending ??= loadUploadSecret(root, options.secret));

  /** Write beside the target (same filesystem) and rename, so a reader never
   * sees half a file. */
  async function writeAtomic(target: string, data: Uint8Array | string): Promise<void> {
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(path.join(root, '.tmp'), { recursive: true });
    const tmp = path.join(root, '.tmp', randomBytes(8).toString('hex'));
    try {
      await writeFile(tmp, data);
      await rename(tmp, target);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }

  async function readMeta(key: string): Promise<LocalMeta | null> {
    try {
      return JSON.parse(await readFile(metaPath(key), 'utf8')) as LocalMeta;
    } catch (err) {
      if (isEnoent(err)) return null;
      throw err;
    }
  }

  async function head(key: string): Promise<ObjectInfo | null> {
    let size: number;
    try {
      const file = await stat(dataPath(key));
      if (!file.isFile()) return null;
      size = file.size;
    } catch (err) {
      if (isEnoent(err)) return null;
      throw err;
    }
    const meta = await readMeta(key);
    // A file with no sidecar was put there by hand: serve it as private.
    return {
      key,
      visibility: meta?.visibility ?? 'private',
      contentType: meta?.contentType ?? 'application/octet-stream',
      bytes: size,
      sha256: meta?.sha256 ?? null,
    };
  }

  return {
    name: 'local',

    async put({ key, data, contentType, visibility, sha256 }) {
      await writeAtomic(dataPath(key), data);
      const meta: LocalMeta = { contentType, visibility, bytes: data.byteLength, sha256, createdAt: new Date().toISOString() };
      await writeAtomic(metaPath(key), JSON.stringify(meta));
    },

    async get(key) {
      try {
        return await readFile(dataPath(key));
      } catch (err) {
        if (isEnoent(err)) throw new PrintStorageError('not_found', `No print file at ${key}`);
        throw err;
      }
    },

    head,

    async open(key, range) {
      const info = await head(key);
      if (!info) throw new PrintStorageError('not_found', `No print file at ${key}`);
      const start = range?.start ?? 0;
      const end = Math.min(range?.end ?? info.bytes - 1, info.bytes - 1);
      if (info.bytes === 0 || start > end) return { info, stream: emptyStream(), range: { start: 0, end: -1 } };
      const stream = Readable.toWeb(createReadStream(dataPath(key), { start, end })) as ReadableStream<Uint8Array>;
      return { info, stream, range: { start, end } };
    },

    async remove(key) {
      await rm(dataPath(key), { force: true });
      await rm(metaPath(key), { force: true });
    },

    directUrl() {
      return null;
    },

    async uploadUrl(request) {
      const claims: UploadClaims = {
        k: request.key,
        t: request.contentType,
        m: request.maxBytes,
        ...(request.contentLength === undefined ? {} : { c: request.contentLength }),
        e: clock() + request.expiresIn * 1000,
        n: randomBytes(16).toString('hex'),
        u: request.userId,
      };
      const token = signClaims(claims, await secret());
      return {
        url: `${PRINT_FILES_ROUTE}/${encodeKey(request.key)}`,
        method: 'PUT',
        headers: { 'content-type': request.contentType, [UPLOAD_TOKEN_HEADER]: token },
        key: request.key,
        expiresAt: new Date(claims.e).toISOString(),
      };
    },

    async checkUpload(token, key) {
      const claims = readClaims(token, await secret());
      // the key in the path must be the one the link was made for
      if (!claims || claims.k !== key) return { ok: false, reason: 'invalid' };
      if (clock() > claims.e) return { ok: false, reason: 'expired' };
      return {
        ok: true,
        grant: {
          key: claims.k,
          contentType: claims.t,
          maxBytes: claims.m,
          contentLength: claims.c ?? null,
          userId: claims.u,
          expiresAt: claims.e,
          nonce: claims.n,
        },
      };
    },

    async receiveUpload(grant, body, declaredBytes) {
      // One-time: the first request to create this file has the link. It is
      // released again if the upload fails, so a dropped connection can retry.
      const claim = path.join(root, '.uploads', grant.nonce);
      await mkdir(path.dirname(claim), { recursive: true });
      try {
        await (await open(claim, 'wx')).close();
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') throw new PrintStorageError('conflict', 'This upload link has already been used.');
        throw err;
      }

      const tmp = path.join(root, '.tmp', randomBytes(8).toString('hex'));
      try {
        await mkdir(path.dirname(tmp), { recursive: true });
        const hash = createHash('sha256');
        let bytes = 0;
        // counts and hashes as the body goes to disk, and stops it past the limit
        const watch = new Transform({
          transform(chunk: Buffer, _encoding, done) {
            bytes += chunk.length;
            if (bytes > grant.maxBytes) return done(new PrintStorageError('too_large', `The upload is bigger than the ${grant.maxBytes} bytes this link takes.`));
            hash.update(chunk);
            done(null, chunk);
          },
        });
        await pipeline(Readable.fromWeb(body as unknown as NodeReadableStream), watch, createWriteStream(tmp, { flags: 'wx' }));
        // A body shorter than its Content-Length was cut off on the way (proxy.ts
        // does that past 10 MB): not a file anyone should print from.
        if (bytes !== declaredBytes) throw new PrintStorageError('incomplete', `The upload stopped at ${bytes} of ${declaredBytes} bytes.`);

        await mkdir(path.dirname(dataPath(grant.key)), { recursive: true });
        await rename(tmp, dataPath(grant.key));
        const sha256 = hash.digest('hex');
        const meta: LocalMeta = { contentType: grant.contentType, visibility: 'private', bytes, sha256, createdAt: new Date(clock()).toISOString() };
        await writeAtomic(metaPath(grant.key), JSON.stringify(meta));
        return { key: grant.key, visibility: 'private', contentType: grant.contentType, bytes, sha256 };
      } catch (err) {
        await rm(tmp, { force: true });
        await rm(claim, { force: true });
        throw err instanceof PrintStorageError ? err : new PrintStorageError('incomplete', `The upload did not arrive: ${err instanceof Error ? err.message : 'connection dropped'}`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// R2 driver: the S3 API, signed with aws4fetch (SigV4, region 'auto').
// ---------------------------------------------------------------------------

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** a second bucket for public objects; null keeps everything in `bucket` */
  publicBucket: string | null;
  /** the public domain of `publicBucket`; ignored without it, or when it is `bucket` itself */
  publicBaseUrl: string | null;
  /** full endpoint override (EU jurisdiction, a local S3 server in tests) */
  endpoint?: string | null;
}

export interface R2Deps {
  fetch?: typeof fetch;
  /** the signing clock, fixed in tests */
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  /** replaces every wait for response headers (tests) */
  timeoutMs?: number;
}

const R2_ATTEMPTS = 4;
const R2_RETRY_BASE_MS = 250;
/** S3 allows 5 GiB per single PUT; stay under it. */
const MAX_SINGLE_PUT_BYTES = 4.9 * 1024 ** 3;
const META_VISIBILITY = 'x-amz-meta-visibility';
const META_SHA256 = 'x-amz-meta-sha256';

function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/** The body as one buffer. With a Content-Length it is filled in place, so a
 * 1 GiB PSD is held once, not twice as arrayBuffer() would (it gathers the chunks
 * and then joins them); and a transfer cut short is an error, not a short file. */
async function readBody(res: Response): Promise<Buffer> {
  try {
    const declared = Number(res.headers.get('content-length'));
    const encoded = res.headers.get('content-encoding');
    if (!res.body || !Number.isSafeInteger(declared) || declared <= 0 || (encoded && encoded !== 'identity')) {
      return Buffer.from(await res.arrayBuffer());
    }
    const out = Buffer.allocUnsafe(declared);
    let filled = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (filled + value.byteLength > declared) {
        await reader.cancel().catch(() => undefined);
        throw new PrintStorageError('upstream', 'R2 get returned more than its Content-Length.');
      }
      out.set(value, filled);
      filled += value.byteLength;
    }
    if (filled !== declared) throw new PrintStorageError('upstream', `R2 get was cut short: ${filled} of ${declared} bytes.`);
    return out;
  } catch (err) {
    if (err instanceof PrintStorageError) throw err;
    throw new PrintStorageError('upstream', `R2 get was interrupted: ${err instanceof Error ? err.message : 'network error'}`);
  }
}

async function upstreamError(op: string, res: Response): Promise<PrintStorageError> {
  let code = '';
  try {
    const text = (await res.text()).slice(0, 600);
    code = /<Code>([^<]+)<\/Code>/.exec(text)?.[1] ?? '';
  } catch {
    // an unreadable error body only costs the code
  }
  return new PrintStorageError('upstream', `R2 ${op} failed: ${res.status}${code ? ` ${code}` : ''}`);
}

export function createR2Driver(cfg: R2Config, deps: R2Deps = {}): PrintStorageDriver {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const endpoint = (cfg.endpoint || `https://${cfg.accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
  const twoBuckets = !!cfg.publicBucket && cfg.publicBucket !== cfg.bucket;
  // A public domain only for a bucket of public files: in front of the private
  // bucket it would serve every PSD, artwork and job sheet by its key.
  const publicBase = twoBuckets && cfg.publicBaseUrl ? cfg.publicBaseUrl.replace(/\/+$/, '') : null;

  const bucketFor = (visibility: Visibility) => (visibility === 'public' && cfg.publicBucket ? cfg.publicBucket : cfg.bucket);
  const urlFor = (bucket: string, key: string) => `${endpoint}/${bucket}/${encodeKey(key)}`;

  /** Signs and sends, retrying network failures, 429 and 5xx with backoff. Each
   * attempt is signed again, so a slow retry never carries a stale date.
   *
   * The payload is unsigned, so the signer never sees the body: it is handed to
   * fetch afterwards as a stream of views over the caller's buffer with an
   * explicit Content-Length (R2 refuses chunked uploads). That keeps a 300 MB
   * PSD from being copied once or twice more on its way out, which a Request
   * with a buffer body does (measured on a 300 MB body: a few MB extra instead
   * of about 550 MB; undici 5, 6 and 7 all send it this way).
   *
   * `timeoutMs` is how long R2 gets to start its answer (for a PUT that includes
   * the upload). It stops counting once the headers are in, so a long download
   * is never cut off; a stalled one is caught by fetch's own body timeout. */
  async function send(
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
    url: string,
    init: { headers?: Record<string, string>; body?: Uint8Array; timeoutMs: number },
  ): Promise<Response> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < R2_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(R2_RETRY_BASE_MS * 2 ** (attempt - 1) * (0.5 + Math.random()));
      const signed = await aws.sign(url, {
        method,
        headers: init.headers,
        aws: deps.now ? { datetime: amzDate(deps.now()) } : undefined,
      });
      const headers = new Headers(signed.headers);
      const controller = new AbortController();
      const request: RequestInit & { duplex?: 'half' } = { method, headers, signal: controller.signal };
      if (init.body && init.body.byteLength > 0) {
        headers.set('content-length', String(init.body.byteLength));
        request.body = streamOf(init.body);
        request.duplex = 'half';
      }
      const waitMs = deps.timeoutMs ?? init.timeoutMs;
      const timer = setTimeout(() => controller.abort(new Error(`no answer after ${Math.max(Math.round(waitMs / 1000), 1)} s`)), waitMs);
      let res: Response;
      try {
        res = await doFetch(signed.url, request);
      } catch (err) {
        lastError = err;
        continue;
      } finally {
        clearTimeout(timer);
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = new PrintStorageError('upstream', `R2 ${method} failed: ${res.status}`);
        await res.body?.cancel().catch(() => undefined);
        continue;
      }
      return res;
    }
    if (lastError instanceof PrintStorageError) throw lastError;
    throw new PrintStorageError('upstream', `R2 ${method} could not be reached: ${lastError instanceof Error ? lastError.message : 'network error'}`);
  }

  function infoFrom(key: string, res: Response, foundIn: Visibility): ObjectInfo {
    const declared = res.headers.get(META_VISIBILITY);
    return {
      key,
      visibility: declared === 'public' || declared === 'private' ? declared : foundIn,
      contentType: res.headers.get('content-type') ?? 'application/octet-stream',
      bytes: Number(res.headers.get('content-length') ?? 0),
      sha256: res.headers.get(META_SHA256),
    };
  }

  /** The private bucket first, then the public one: a key lives in exactly one. */
  const lookupOrder: Visibility[] = twoBuckets ? ['private', 'public'] : ['private'];

  return {
    name: 'r2',

    async put({ key, data, contentType, visibility, sha256 }) {
      if (data.byteLength > MAX_SINGLE_PUT_BYTES) {
        throw new PrintStorageError('too_large', `${key} is ${data.byteLength} bytes; a single R2 upload tops out just under 5 GiB.`);
      }
      const res = await send('PUT', urlFor(bucketFor(visibility), key), {
        headers: { 'content-type': contentType, [META_VISIBILITY]: visibility, [META_SHA256]: sha256 },
        body: data,
        // assume at least 1 MB/s on top of a 30 s floor
        timeoutMs: 30_000 + Math.ceil(data.byteLength / 1024),
      });
      if (!res.ok) throw await upstreamError('put', res);
      await res.body?.cancel().catch(() => undefined);
    },

    async get(key) {
      for (const visibility of lookupOrder) {
        const res = await send('GET', urlFor(bucketFor(visibility), key), { timeoutMs: 60_000 });
        if (res.status === 404) {
          await res.body?.cancel().catch(() => undefined);
          continue;
        }
        if (!res.ok) throw await upstreamError('get', res);
        return readBody(res);
      }
      throw new PrintStorageError('not_found', `No print file at ${key}`);
    },

    async head(key) {
      for (const visibility of lookupOrder) {
        const res = await send('HEAD', urlFor(bucketFor(visibility), key), { timeoutMs: 30_000 });
        if (res.status === 404) continue;
        if (!res.ok) throw await upstreamError('head', res);
        return infoFrom(key, res, visibility);
      }
      return null;
    },

    async open(key, range) {
      const headers: Record<string, string> = range ? { range: `bytes=${range.start}-${range.end}` } : {};
      for (const visibility of lookupOrder) {
        const res = await send('GET', urlFor(bucketFor(visibility), key), { headers, timeoutMs: 30_000 });
        if (res.status === 404) {
          await res.body?.cancel().catch(() => undefined);
          continue;
        }
        if (!res.ok) throw await upstreamError('get', res);
        const info = infoFrom(key, res, visibility);
        // content-length of a ranged reply is the slice, not the object
        const total = /\/(\d+)$/.exec(res.headers.get('content-range') ?? '')?.[1];
        if (total) info.bytes = Number(total);
        const start = range?.start ?? 0;
        const served = Number(res.headers.get('content-length') ?? info.bytes);
        return { info, stream: res.body ?? emptyStream(), range: { start, end: start + served - 1 } };
      }
      throw new PrintStorageError('not_found', `No print file at ${key}`);
    },

    async remove(key) {
      // A key lives in one bucket; S3 answers 204 for the one it is not in.
      for (const visibility of lookupOrder) {
        const res = await send('DELETE', urlFor(bucketFor(visibility), key), { timeoutMs: 30_000 });
        if (!res.ok && res.status !== 404) throw await upstreamError('delete', res);
        await res.body?.cancel().catch(() => undefined);
      }
    },

    directUrl(key, visibility) {
      return visibility === 'public' && publicBase ? `${publicBase}/${encodeKey(key)}` : null;
    },

    async presign(key, visibility, { expiresInSeconds, download }) {
      const url = new URL(urlFor(bucketFor(visibility), key));
      // S3 accepts 1 second to 7 days
      url.searchParams.set('X-Amz-Expires', String(Math.min(Math.max(Math.round(expiresInSeconds), 1), 604_800)));
      if (download) url.searchParams.set('response-content-disposition', contentDisposition(download));
      const signed = await aws.sign(url.toString(), {
        method: 'GET',
        aws: { signQuery: true, ...(deps.now ? { datetime: amzDate(deps.now()) } : {}) },
      });
      return signed.url;
    },

    async uploadUrl({ key, contentType, contentLength, expiresIn }) {
      // Uploads are private: the private bucket, whatever the proofs do.
      const url = new URL(urlFor(cfg.bucket, key));
      url.searchParams.set('X-Amz-Expires', String(expiresIn));
      // Signing the headers is what binds the PUT to them: R2 answers 403 to a
      // request with another Content-Type, or (when signed) another length.
      const signedHeaders: Record<string, string> = { 'content-type': contentType };
      if (contentLength !== undefined) signedHeaders['content-length'] = String(contentLength);
      const issuedAt = deps.now ? deps.now() : new Date();
      const signed = await aws.sign(url.toString(), {
        method: 'PUT',
        headers: signedHeaders,
        aws: { signQuery: true, allHeaders: true, ...(deps.now ? { datetime: amzDate(issuedAt) } : {}) },
      });
      return {
        url: signed.url,
        method: 'PUT',
        headers: { 'content-type': contentType },
        key,
        expiresAt: new Date(issuedAt.getTime() + expiresIn * 1000).toISOString(),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Configuration and the facade the rest of the app uses
// ---------------------------------------------------------------------------

type Env = Record<string, string | undefined>;

const R2_REQUIRED = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const;

function r2Missing(env: Env): string[] {
  return R2_REQUIRED.filter((name) => !env[name]?.trim());
}

/** What the environment asks for; throws on an unknown driver name. */
export function requestedDriver(env: Env = process.env): 'local' | 'r2' | null {
  const raw = (env.PRINT_STORAGE_DRIVER ?? env.PRINT_STORAGE ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (raw !== 'local' && raw !== 'r2') {
    throw new PrintStorageError('config', `PRINT_STORAGE_DRIVER must be "local" or "r2", not "${raw}".`);
  }
  return raw;
}

export function readR2Config(env: Env = process.env): R2Config {
  const missing = r2Missing(env);
  if (missing.length) throw new PrintStorageError('config', `R2 storage needs ${missing.join(', ')}.`);
  const clean = (value: string | undefined) => value?.trim() || null;
  const bucket = env.R2_BUCKET!.trim();
  const publicBucket = clean(env.R2_PUBLIC_BUCKET);
  // Most likely the private bucket was given a public domain: say so, rather
  // than run with the PSDs one guessed key away from anyone.
  if (publicBucket === bucket) {
    throw new PrintStorageError(
      'config',
      `R2_PUBLIC_BUCKET is R2_BUCKET ("${bucket}"). Proofs need a bucket of their own: one bucket behind a public domain would serve the private PSDs to anyone with a key. Name another bucket, or unset R2_PUBLIC_BUCKET.`,
    );
  }
  return {
    accountId: env.R2_ACCOUNT_ID!.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
    bucket,
    publicBucket,
    publicBaseUrl: clean(env.R2_PUBLIC_BASE_URL),
    endpoint: clean(env.R2_ENDPOINT),
  };
}

function localRoot(env: Env): string {
  if (env.PRINT_STORAGE_DIR) return path.resolve(env.PRINT_STORAGE_DIR);
  // The ignore comment keeps the bundler from tracing the whole project (and
  // every stored file) into the server functions for this one cwd lookup.
  return path.join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'print-storage');
}

export function selectDriver(env: Env = process.env): PrintStorageDriver {
  const requested = requestedDriver(env);
  if (requested === 'r2' || (requested === null && r2Missing(env).length === 0)) {
    return createR2Driver(readR2Config(env));
  }
  if (requested === null && env.NODE_ENV === 'production') {
    throw new PrintStorageError(
      'config',
      'Print storage is not configured: set the R2_* variables, or PRINT_STORAGE_DRIVER=local to keep files on this machine.',
    );
  }
  return createLocalDriver(localRoot(env));
}

let current: PrintStorageDriver | null = null;

function driver(): PrintStorageDriver {
  current ??= selectDriver();
  return current;
}

/** Tests: use this driver (or the environment's again with null). */
export function setPrintStorageDriver(next: PrintStorageDriver | null): void {
  current = next;
}

export function printStorageDriverName(): 'local' | 'r2' {
  return driver().name;
}

export async function putObject(input: PutObjectInput): Promise<StoredObject> {
  assertKey(input.key);
  const sha256 = createHash('sha256').update(input.data).digest('hex');
  await driver().put({ ...input, sha256 });
  return { key: input.key, visibility: input.visibility, contentType: input.contentType, bytes: input.data.byteLength, sha256 };
}

/** The whole object in memory. Throws a not_found PrintStorageError when missing. */
export async function getObject(key: string): Promise<Buffer> {
  assertKey(key);
  return driver().get(key);
}

/** Size, type and visibility; null when the key does not exist. */
export async function statObject(key: string): Promise<ObjectInfo | null> {
  assertKey(key);
  return driver().head(key);
}

/** Streams the object (or a byte range of it) without loading it. */
export async function openObject(key: string, range?: ByteRange): Promise<OpenedObject> {
  assertKey(key);
  return driver().open(key, range);
}

export async function deleteObject(key: string): Promise<void> {
  assertKey(key);
  await driver().remove(key);
}

export const PRINT_FILES_ROUTE = '/api/print-files';

/** The route URL for a key: stable, and checked per request. `ttl` hints how
 * long the presigned R2 redirect behind it should live (public files only: a
 * private file's always lives a minute). */
export function routeUrl(key: string, opts?: { expiresInSeconds?: number; download?: string }): string {
  const query = new URLSearchParams();
  if (opts?.download) query.set('download', opts.download);
  if (opts?.expiresInSeconds) query.set('ttl', String(Math.round(opts.expiresInSeconds)));
  const qs = query.toString();
  return `${PRINT_FILES_ROUTE}/${encodeKey(key)}${qs ? `?${qs}` : ''}`;
}

/** A URL the browser can load: the public domain for public R2 objects when one
 * is configured, otherwise /api/print-files, which checks access (Pre-press
 * access for staff, ownership for an artist's own proofs) before it serves. */
export async function objectUrl(
  key: string,
  visibility: Visibility,
  opts?: { expiresInSeconds?: number; download?: string },
): Promise<string> {
  assertKey(key);
  if (!opts?.download) {
    const direct = driver().directUrl(key, visibility);
    if (direct) return direct;
  }
  return routeUrl(key, opts);
}

/** For the print-files route: a signed R2 URL, or null when the driver has none. */
export async function presignObject(
  key: string,
  visibility: Visibility,
  opts: { expiresInSeconds: number; download?: string },
): Promise<string | null> {
  assertKey(key);
  const d = driver();
  return d.presign ? d.presign(key, visibility, opts) : null;
}

// ---------------------------------------------------------------------------
// Signed uploads
// ---------------------------------------------------------------------------

/** Where a signed upload may land, and who may ask for a link to it. Staff
 * only, and none of these keys is served by /api/print-files (which serves
 * print/<design>/... and nothing else). 'prepress-uploads/' is the corrected-PSD
 * key WP9 builds (components/admin/prepress/rules.ts uploadKey). */
const UPLOAD_POLICIES: readonly { prefix: string; area: Area; level: Level }[] = [
  { prefix: 'prepress-uploads/', area: 'prepress', level: 'work' },
  { prefix: 'uploads/prepress/', area: 'prepress', level: 'work' },
];

/** The access a key's upload link needs, or null when the key is not one a
 * signed upload may write to. */
export function uploadPolicyFor(key: string): { area: Area; level: Level } | null {
  if (!isValidKey(key)) return null;
  const policy = UPLOAD_POLICIES.find((p) => key.startsWith(p.prefix) && key.length > p.prefix.length);
  return policy ? { area: policy.area, level: policy.level } : null;
}

const UPLOAD_SECONDS = { min: 30, fallback: 900, max: 3600 };
/** type/subtype only: it goes into a signed header and a token, so no parameters */
const CONTENT_TYPE = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,60}\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,60}$/;

function invalidRequest(message: string): PrintStorageError {
  return new PrintStorageError('invalid_request', message);
}

/** A signed PUT for a new private object, for a browser to send a file that is
 * too big for the app to carry (a corrected PSD). Only staff with the access the
 * key's prefix calls for get one: a PermissionError otherwise, an
 * invalid_key PrintStorageError for a key outside the upload prefixes.
 *
 * The browser PUTs the file to `url` with `headers`, then the caller looks at
 * what arrived: statObject for the size, openObject(key, range) for the first
 * bytes (R2 cannot cap the size of a PUT, so `maxBytes` is only enforced for
 * certain by the local driver; pass `contentLength` to make R2 refuse any other
 * length too). */
export async function createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrl> {
  const { actor, key, contentType, maxBytes, contentLength } = input;
  assertKey(key);
  const policy = uploadPolicyFor(key);
  if (!policy) {
    throw new PrintStorageError('invalid_key', `Signed uploads go under ${UPLOAD_POLICIES.map((p) => p.prefix).join(' or ')}, not ${JSON.stringify(key.slice(0, 80))}.`);
  }
  requirePermission(actor, policy.area, policy.level);

  if (!CONTENT_TYPE.test(contentType)) throw invalidRequest(`Not a content type an upload can carry: ${JSON.stringify(contentType.slice(0, 80))}.`);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_SINGLE_PUT_BYTES) {
    throw invalidRequest(`maxBytes must be a whole number of bytes from 1 to ${Math.floor(MAX_SINGLE_PUT_BYTES)}.`);
  }
  if (contentLength !== undefined && (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > maxBytes)) {
    throw invalidRequest('contentLength must be a whole number of bytes from 1 to maxBytes.');
  }
  const wanted = input.expiresIn === undefined || !Number.isFinite(input.expiresIn) ? UPLOAD_SECONDS.fallback : Math.round(input.expiresIn);
  const expiresIn = Math.min(Math.max(wanted, UPLOAD_SECONDS.min), UPLOAD_SECONDS.max);

  return driver().uploadUrl({ key, contentType, maxBytes, contentLength, expiresIn, userId: actor.userId });
}

/** For the PUT handler: what a local upload link's token says, or why it is no
 * good. 'unsupported' on R2, where the PUT never comes through the app. */
export async function checkUploadToken(token: string, key: string): Promise<UploadTokenCheck> {
  assertKey(key);
  const d = driver();
  return d.checkUpload ? d.checkUpload(token, key) : { ok: false, reason: 'unsupported' };
}

/** For the PUT handler: stores the body of a PUT made on an upload link, a
 * one-time link. `declaredBytes` is the request's Content-Length: a body that
 * ends before it was cut off, and is refused. */
export async function receiveUpload(grant: UploadGrant, body: ReadableStream<Uint8Array>, declaredBytes: number): Promise<StoredObject> {
  const d = driver();
  if (!d.receiveUpload) throw new PrintStorageError('config', 'With R2, uploads go straight to the bucket, not through the app.');
  return d.receiveUpload(grant, body, declaredBytes);
}

/** Content-Disposition for a download name: an ASCII fallback plus the UTF-8 form. */
export function contentDisposition(filename: string, disposition: 'attachment' | 'inline' = 'attachment'): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\;]/g, '_').slice(0, 120) || 'download';
  const utf8 = encodeURIComponent(filename.slice(0, 120)).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

// ---------------------------------------------------------------------------
// Who may read a key (used by the print-files route)
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The key a /api/print-files path names, and the design it belongs to; null
 * for anything that is not 'print/<designId>/...'. */
export function parsePrintFilePath(segments: string[]): { key: string; designId: string } | null {
  if (segments.length < 3 || segments[0] !== 'print' || !UUID.test(segments[1])) return null;
  const key = segments.join('/');
  return isValidKey(key) ? { key, designId: segments[1].toLowerCase() } : null;
}
