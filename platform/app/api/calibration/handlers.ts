// What the three calibration routes do, kept out of the route files so they can be tested without Clerk, storage or
// the print libraries: everything they need from the outside arrives through CalibrationDeps.
//
//   GET  /api/calibration/chart?format=psd|pdf&lpi=&angle=&mesh=&ppi=&films=   the test chart (Pre-press "View")
//   POST /api/calibration/scan-url   { filename, size }          a signed URL to put a scan on (Pre-press "Manage")
//   POST /api/calibration/scan       { key, lpi, angleDeg }      reads the scan that landed there (Pre-press "Manage")
//
// As with the corrected-PSD upload (app/api/prepress), a scan is far bigger than a request body can be, so it goes
// to storage on a signed URL and these routes only ever see a few hundred bytes of JSON. Every answer is uncached
// and every refusal is a short code with words: errors are { error, message }.
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import { checkChartSettings, defaultChartSettings, type ChartSettings } from '@/lib/print/calibration/chart-layout';
import type { ChartFile, ChartFormat } from '@/lib/print/calibration/chart';
import type { ScanReading, ScanSettings } from '@/lib/print/calibration/scan';
import {
  CALIBRATION_ERRORS,
  MAX_CALIBRATION_JSON_BYTES,
  SCAN_CONTENT_TYPE,
  SCAN_URL_LIFETIME_SECONDS,
  isScanUploadKey,
  parseScanFilename,
  scanSignature,
  scanUploadKey,
  type CalibrationErrorCode,
} from '@/lib/print/calibration/scan-upload';
import type { InkSystemProfile } from '@/lib/print/types';
import { contentDisposition } from '@/lib/services/print-storage';

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

export interface UploadUrlRequest {
  actor: Actor;
  key: string;
  contentType: string;
  maxBytes: number;
  contentLength: number;
  /** seconds */
  expiresIn: number;
}

export interface CalibrationDeps {
  /** who is asking; null when nobody is signed in */
  getActor: () => Promise<Actor | null>;
  /** the active ink system: the chart's mesh, inks and cure come from it */
  getInks: () => Promise<InkSystemProfile>;
  buildChart: (format: ChartFormat, settings: ChartSettings, inks: InkSystemProfile) => Promise<ChartFile>;
  /** the largest scan taken, in bytes */
  maxScanBytes: number;
  /** a fresh unguessable segment for each upload's key */
  nonce: () => string;
  createUploadUrl: (input: UploadUrlRequest) => Promise<UploadTicket>;
  /** what storage says about an object, or null when it isn't there */
  statUpload: (key: string) => Promise<{ bytes: number } | null>;
  /** the first `length` bytes of an object, or null when it isn't there */
  readHead: (key: string, length: number) => Promise<Uint8Array | null>;
  /** the whole object, or null when it isn't there */
  readUpload: (key: string) => Promise<Buffer | null>;
  removeUpload: (key: string) => Promise<void>;
  /** reads the chart in a scan; throws an error named 'ScanError' (with a code) for a scan it can't use */
  readScan: (bytes: Buffer, settings: ScanSettings) => Promise<ScanReading>;
}

const STATUS: Record<CalibrationErrorCode, number> = {
  unauthorised: 401,
  forbidden: 403,
  bad_request: 400,
  too_large: 413,
  not_an_image: 415,
  empty: 400,
  incomplete: 400,
  storage: 502,
  unreadable: 422,
  failed: 500,
  network: 400,
};

const NO_STORE = { 'cache-control': 'private, no-store' };

export function refuse(code: CalibrationErrorCode, message?: string): Response {
  return Response.json({ error: code, message: message ?? CALIBRATION_ERRORS[code] }, { status: STATUS[code], headers: NO_STORE });
}

function ok(body: Record<string, unknown>): Response {
  return Response.json(body, { headers: NO_STORE });
}

/** Who may do this: signed in, and Pre-press at `level`. A Response is the refusal: the chart (View) and the scan (Manage) say
 * which they are about. */
async function authorise(deps: CalibrationDeps, level: 'view' | 'manage'): Promise<Actor | Response> {
  const chart = level === 'view';
  const actor = await deps.getActor();
  if (!actor) return refuse('unauthorised', chart ? 'Sign in again to download the test chart.' : undefined);
  if (!can(actor, 'prepress', level)) return refuse('forbidden', chart ? 'The test chart needs View access to Pre-press. Ask the owner.' : undefined);
  return actor;
}

/** A small JSON object from the request, or null when the body is missing, too big (read with a cap, whatever Content-Length says), or not an object. */
async function readSmallJson(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_CALIBRATION_JSON_BYTES) {
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
  console.error(`[calibration] ${step} failed:`, err instanceof Error ? err.message : err);
  return refuse('failed');
}

function isScanError(err: unknown): err is Error & { code: string } {
  return err instanceof Error && err.name === 'ScanError';
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------

export async function handleChart(req: Request, deps: CalibrationDeps): Promise<Response> {
  const actor = await authorise(deps, 'view');
  if (actor instanceof Response) return actor;

  const params = new URL(req.url).searchParams;
  const format = params.get('format');
  if (format !== 'psd' && format !== 'pdf') return refuse('bad_request', 'Ask for format=psd (the films) or format=pdf (the instructions).');

  let inks: InkSystemProfile;
  try {
    inks = await deps.getInks();
  } catch (err) {
    return failed('reading the ink system', err);
  }
  const q = (name: string): string | undefined => params.get(name) ?? undefined;
  const checked = checkChartSettings({ lpi: q('lpi'), angleDeg: q('angle'), ppi: q('ppi'), mesh: q('mesh'), films: q('films'), dot: q('dot') }, defaultChartSettings(inks.mesh.halftone));
  if (!checked.ok) return refuse('bad_request', checked.error);

  let file: ChartFile;
  try {
    file = await deps.buildChart(format, checked.value, inks);
  } catch (err) {
    return failed('making the chart', err);
  }
  const headers = {
    'content-type': file.contentType,
    'content-disposition': contentDisposition(file.name, 'attachment'),
    ...NO_STORE,
    'x-content-type-options': 'nosniff',
  };
  // A function's response stops at 4.5 MB unless it is streamed, and the films run to tens of MB: a big file goes out in
  // pieces (without a length, which a stream can't promise the platform), a small one as it is.
  if (file.bytes.length > STREAM_ABOVE_BYTES) return new Response(streamOf(file.bytes), { status: 200, headers });
  return new Response(new Uint8Array(file.bytes), { status: 200, headers: { ...headers, 'content-length': String(file.bytes.length) } });
}

/** Files bigger than this are streamed. */
export const STREAM_ABOVE_BYTES = 1024 * 1024;
const STREAM_CHUNK_BYTES = 256 * 1024;

/** The bytes as a stream of pieces, read by the response as the client takes them. */
function streamOf(bytes: Buffer): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      const end = Math.min(offset + STREAM_CHUNK_BYTES, bytes.length);
      controller.enqueue(new Uint8Array(bytes.buffer, bytes.byteOffset + offset, end - offset));
      offset = end;
    },
  });
}

// ---------------------------------------------------------------------------
// A scan: a place to put it, then reading it
// ---------------------------------------------------------------------------

/** Step 1: a signed PUT for the scan the browser is about to send. */
export async function handleScanUrl(req: Request, deps: CalibrationDeps): Promise<Response> {
  const actor = await authorise(deps, 'manage');
  if (actor instanceof Response) return actor;

  const body = await readSmallJson(req);
  if (!body || typeof body.filename !== 'string') return refuse('bad_request');
  const size = body.size;
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 0) return refuse('bad_request');
  const filename = parseScanFilename(body.filename);
  if (filename === null) return refuse('not_an_image');
  if (size === 0) return refuse('empty');
  if (size > deps.maxScanBytes) return refuse('too_large');

  const key = scanUploadKey(deps.nonce(), filename);
  let ticket: UploadTicket;
  try {
    ticket = await deps.createUploadUrl({ actor, key, contentType: SCAN_CONTENT_TYPE, maxBytes: deps.maxScanBytes, contentLength: size, expiresIn: SCAN_URL_LIFETIME_SECONDS });
  } catch (err) {
    if (err instanceof PermissionError) return refuse('forbidden');
    return failed('creating the upload URL', err);
  }
  // Only these fields go to the browser, and the key is the one made here.
  return ok({ url: ticket.url, method: ticket.method, headers: ticket.headers, key, expiresAt: ticket.expiresAt });
}

/** Removal is tidiness, never a reason to answer differently. */
async function discard(key: string, deps: CalibrationDeps): Promise<void> {
  try {
    await deps.removeUpload(key);
  } catch (err) {
    console.error('[calibration] could not remove a scan:', err instanceof Error ? err.message : err);
  }
}

/** Step 3: the scan is in storage; check it, read the chart in it, and tidy up. */
export async function handleScan(req: Request, deps: CalibrationDeps): Promise<Response> {
  const actor = await authorise(deps, 'manage');
  if (actor instanceof Response) return actor;

  const body = await readSmallJson(req);
  const key = body?.key;
  // Only a key scan-url made: never an arbitrary object in storage.
  if (!body || typeof key !== 'string' || !isScanUploadKey(key)) return refuse('bad_request');
  const screen = checkChartSettings({ lpi: body.lpi, angleDeg: body.angleDeg });
  if (!screen.ok) return refuse('bad_request', screen.error);

  let info: { bytes: number } | null;
  try {
    info = await deps.statUpload(key);
  } catch (err) {
    return failed('looking for the scan', err);
  }
  if (!info) return refuse('incomplete');
  if (info.bytes === 0) {
    await discard(key, deps);
    return refuse('empty');
  }
  if (info.bytes > deps.maxScanBytes) {
    await discard(key, deps);
    return refuse('too_large');
  }

  let head: Uint8Array | null;
  try {
    head = await deps.readHead(key, 12);
  } catch (err) {
    return failed('reading the scan', err);
  }
  if (!head) return refuse('incomplete');
  if (scanSignature(head) === null) {
    await discard(key, deps);
    return refuse('not_an_image');
  }

  try {
    const bytes = await deps.readUpload(key);
    if (!bytes) return refuse('incomplete');
    const reading = await deps.readScan(bytes, { lpi: screen.value.lpi, angleDeg: screen.value.angleDeg });
    return ok({ ok: true, reading });
  } catch (err) {
    if (isScanError(err)) return refuse('unreadable', err.message);
    return failed('reading the chart', err);
  } finally {
    await discard(key, deps);
  }
}
