// The PUT side of /api/print-files/[...key] (WP5): where a browser sends a file
// on a local upload link (createUploadUrl in lib/services/print-storage.ts).
// With R2 the browser PUTs straight to the bucket and this is never called, so
// the same client code works in development and in production.
//
// A request is taken only when all of these hold, checked cheapest first and
// all before the link is used up:
//   - the key is one a signed upload may write to (staff-only prefixes);
//   - the token in the x-upload-token header is ours, for this key, and not
//     expired (a header, not the URL: URLs end up in logs);
//   - the signed-in user is the one the link was made for, and still has the
//     access the key calls for (Pre-press Work);
//   - Content-Type is the one the link was made for;
//   - Content-Length is there, within the link's limit, and (when the link was
//     made for an exact size) equal to it. It is required because proxy.ts makes
//     Next buffer bodies only up to 10 MB and silently drop the rest: the bytes
//     that arrive must add up to it, or the upload is refused as cut short.
// The link then works once; a failed upload gives it back, so a dropped
// connection can try again until the link expires. Kept apart from route.ts so
// the tests can run it without Clerk.
import { can, type Actor, type Role } from '@/lib/auth/permissions';
import {
  PrintStorageError,
  UPLOAD_TOKEN_HEADER,
  uploadPolicyFor,
  type StoredObject,
  type UploadGrant,
  type UploadTokenCheck,
} from '@/lib/services/print-storage';
import type { PrintFilesSession } from './handler';

export interface PrintUploadDeps {
  getSession(): Promise<PrintFilesSession>;
  loadActor(userId: string, role: Role): Promise<Actor>;
  checkToken(token: string, key: string): Promise<UploadTokenCheck>;
  receive(grant: UploadGrant, body: ReadableStream<Uint8Array>, declaredBytes: number): Promise<StoredObject>;
}

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
}

/** 'image/PNG; charset=x' -> 'image/png' */
function mediaType(header: string | null): string {
  return (header ?? '').split(';')[0].trim().toLowerCase();
}

export async function handlePrintFileUpload(req: Request, segments: string[], deps: PrintUploadDeps): Promise<Response> {
  const key = segments.join('/');
  const policy = uploadPolicyFor(key);
  if (!policy) return fail(404, 'not_found');

  const token = req.headers.get(UPLOAD_TOKEN_HEADER);
  if (!token) return fail(403, 'invalid_link');
  const checked = await deps.checkToken(token, key);
  if (!checked.ok) {
    if (checked.reason === 'unsupported') return fail(404, 'not_found');
    return checked.reason === 'expired' ? fail(410, 'expired') : fail(403, 'invalid_link');
  }
  const { grant } = checked;

  const session = await deps.getSession();
  const actor = await deps.loadActor(session.userId, session.role);
  if (session.userId !== grant.userId || !can(actor, policy.area, policy.level)) return fail(403, 'forbidden');

  if (mediaType(req.headers.get('content-type')) !== grant.contentType.toLowerCase()) return fail(415, 'wrong_type');

  const length = req.headers.get('content-length')?.trim() ?? '';
  const declared = /^\d+$/.test(length) ? Number(length) : NaN;
  if (!Number.isSafeInteger(declared)) return fail(411, 'length_required');
  if (declared === 0 || !req.body) return fail(400, 'empty');
  if (declared > grant.maxBytes) return fail(413, 'too_large');
  if (grant.contentLength !== null && declared !== grant.contentLength) return fail(400, 'size_mismatch');

  try {
    const stored = await deps.receive(grant, req.body, declared);
    return Response.json({ key: stored.key, bytes: stored.bytes, sha256: stored.sha256 }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    if (err instanceof PrintStorageError) {
      if (err.code === 'conflict') return fail(409, 'link_used');
      if (err.code === 'too_large') return fail(413, 'too_large');
      if (err.code === 'incomplete') return fail(400, 'incomplete');
    }
    throw err;
  }
}
