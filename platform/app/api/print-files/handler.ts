// Serving rules for /api/print-files/[...key] (WP5), kept out of route.ts so
// they can be tested without Clerk or a database: everything the route needs
// from the outside arrives through PrintFilesDeps.
//
// Who may read a file under 'print/<designId>/...':
//   - Pre-press staff (can(actor, 'prepress', 'view'), the owner included): any file.
//   - Production staff (can(actor, 'production', 'view')): the public files of
//     every design (proofs and film previews), which the production stations'
//     iPads show beside the job sheet; never the PSDs, PNGs or job sheets (403).
//   - The artist whose shop owns the design: only its public files (proofs and
//     film previews), never the PSDs, PNGs or job sheets.
//   - Everyone else: 404 for artists (so keys cannot be probed), 403 for staff
//     without Pre-press or Production access.
// Local storage streams the file. R2 answers with a redirect to a presigned URL
// that lives for about a minute, so a PSD never passes through this process
// (?ttl= can stretch the link to a public file, never a private one).
import { can, type Actor, type Role } from '@/lib/auth/permissions';
import {
  contentDisposition,
  isNotFound,
  parsePrintFilePath,
  type ByteRange,
  type ObjectInfo,
  type OpenedObject,
  type Visibility,
} from '@/lib/services/print-storage';

export interface PrintFilesSession {
  userId: string;
  role: Role;
  /** the signed-in user's own shop, if they have one */
  storeId: string | null;
}

export interface PrintFilesDeps {
  getSession(): Promise<PrintFilesSession>;
  loadActor(userId: string, role: Role): Promise<Actor>;
  /** the shop a design belongs to, or null when there is no such design */
  designStoreId(designId: string): Promise<string | null>;
  stat(key: string): Promise<ObjectInfo | null>;
  open(key: string, range?: ByteRange): Promise<OpenedObject>;
  /** null when the driver has no signed URLs (local storage) */
  presign(key: string, visibility: Visibility, opts: { expiresInSeconds: number; download?: string }): Promise<string | null>;
}

const DEFAULT_REDIRECT_SECONDS = 60;
const MIN_REDIRECT_SECONDS = 30;
const MAX_REDIRECT_SECONDS = 3600;

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
}

/** One Range header (bytes=a-b, bytes=a-, bytes=-n) against a file of `size`
 * bytes. Null means serve the whole file: no header, or one we do not read
 * (several ranges). */
export function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  if (size === 0) return 'unsatisfiable';
  if (match[1] === '') {
    const last = Number(match[2]);
    return last === 0 ? 'unsatisfiable' : { start: Math.max(size - last, 0), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  return start >= size || start > end ? 'unsatisfiable' : { start, end };
}

function etagOf(info: ObjectInfo): string | null {
  return info.sha256 ? `"${info.sha256}"` : null;
}

function matchesEtag(header: string | null, etag: string | null): boolean {
  if (!header || !etag) return false;
  return header.split(',').some((candidate) => {
    const value = candidate.trim().replace(/^W\//, '');
    return value === '*' || value === etag;
  });
}

/** Only what a browser can show without running anything opens in the tab:
 * SVG and HTML, which can carry script, always download. */
const INLINE_TYPES = /^(image\/(png|jpeg|webp|gif|avif)|application\/pdf)$/;

function dispositionFor(info: ObjectInfo, download: string | null): string {
  if (download) return contentDisposition(download);
  const name = info.key.split('/').pop() ?? 'download';
  return contentDisposition(name, INLINE_TYPES.test(info.contentType) ? 'inline' : 'attachment');
}

export async function handlePrintFileRequest(req: Request, segments: string[], deps: PrintFilesDeps): Promise<Response> {
  const parsed = parsePrintFilePath(segments);
  if (!parsed) return fail(404, 'not_found');

  const session = await deps.getSession();
  const actor = await deps.loadActor(session.userId, session.role);
  const staff = can(actor, 'prepress', 'view');
  // The stations show every design's proofs: Production reads the public files, and only those.
  const production = !staff && can(actor, 'production', 'view');

  if (!staff && !production) {
    if (session.role !== 'artist') return fail(403, 'forbidden');
    const owner = session.storeId && (await deps.designStoreId(parsed.designId)) === session.storeId;
    if (!owner) return fail(404, 'not_found');
  }

  const info = await deps.stat(parsed.key);
  if (!info) return fail(404, 'not_found');
  if (!staff && info.visibility !== 'public') return production ? fail(403, 'forbidden') : fail(404, 'not_found');

  const url = new URL(req.url);
  const download = url.searchParams.get('download')?.trim().slice(0, 120) || null;

  // A private file's link lives a minute whatever ?ttl asks: anyone it is
  // passed to could fetch the PSD until it expires. Only a public file's
  // (a proof, a film preview) may be asked to live longer.
  const expiresInSeconds =
    info.visibility === 'public'
      ? Math.min(Math.max(Number(url.searchParams.get('ttl')) || DEFAULT_REDIRECT_SECONDS, MIN_REDIRECT_SECONDS), MAX_REDIRECT_SECONDS)
      : DEFAULT_REDIRECT_SECONDS;
  const presigned = await deps.presign(parsed.key, info.visibility, { expiresInSeconds, download: download ?? undefined });
  if (presigned) {
    return new Response(null, { status: 302, headers: { location: presigned, 'cache-control': 'private, no-store' } });
  }

  const etag = etagOf(info);
  const range = parseRange(req.headers.get('range'), info.bytes);
  if (range === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: { 'content-range': `bytes */${info.bytes}`, 'cache-control': 'private, no-store' } });
  }

  const headers = new Headers({
    'content-type': info.contentType,
    'content-disposition': dispositionFor(info, download),
    'accept-ranges': 'bytes',
    // revalidate on every use (the ETag makes that cheap); no-transform keeps
    // compression from touching a file that is hundreds of MB
    'cache-control': 'private, no-cache, no-transform',
    'x-content-type-options': 'nosniff',
  });
  if (etag) headers.set('etag', etag);

  if (!range && matchesEtag(req.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: 304, headers });
  }

  const served = range ?? { start: 0, end: info.bytes - 1 };
  headers.set('content-length', String(Math.max(served.end - served.start + 1, 0)));
  if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${info.bytes}`);
  if (req.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });

  try {
    const opened = await deps.open(parsed.key, range ?? undefined);
    return new Response(opened.stream, { status: range ? 206 : 200, headers });
  } catch (err) {
    if (isNotFound(err)) return fail(404, 'not_found');
    throw err;
  }
}
