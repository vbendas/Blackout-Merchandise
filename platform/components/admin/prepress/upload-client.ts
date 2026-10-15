// The browser's side of the corrected-PSD upload: ask for a signed URL, PUT the
// file straight to print storage (with progress), then say it is there. Three
// small steps instead of one huge request, because a function's request body
// stops at 4.5 MB and a PSD runs to hundreds of MB. The PUT is an XMLHttpRequest
// because fetch can't report how much of a request body has gone up. Client only.
import type { UploadOutcome } from '@/lib/services/prepress';
import { describeUploadFailure, settableUploadHeaders, UPLOAD_CONTENT_TYPE, UPLOAD_ERRORS, type UploadErrorCode } from './rules';

export type UploadResult = { ok: true; outcome: UploadOutcome } | { ok: false; code: UploadErrorCode; message: string };

export interface UploadProgress {
  loaded: number;
  total: number;
}

function words(code: UploadErrorCode): { code: UploadErrorCode; message: string } {
  return { code, message: UPLOAD_ERRORS[code] };
}

type Posted = { ok: true; body: Record<string, unknown> } | { ok: false; code: UploadErrorCode; message: string };

/** A small JSON POST to one of our own routes, its failures already in words. */
async function postJson(url: string, payload: unknown): Promise<Posted> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' });
  } catch {
    return { ok: false, ...words('network') };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // a gateway's own error page: the status alone says what happened
  }
  if (!response.ok) return { ok: false, ...describeUploadFailure(response.status, body) };
  return { ok: true, body: typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {} };
}

interface Ticket {
  url: string;
  headers: Record<string, string>;
  key: string;
}

/** The signed upload the route gave, or null when it isn't one a PUT can use. */
function readTicket(body: Record<string, unknown>): Ticket | null {
  if (typeof body.url !== 'string' || body.url === '' || body.method !== 'PUT' || typeof body.key !== 'string' || body.key === '') return null;
  return { url: body.url, headers: settableUploadHeaders(body.headers), key: body.key };
}

/** The file to storage on the signed URL. True when storage took it. */
function putFile(ticket: Ticket, file: File, onProgress: (progress: UploadProgress) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('PUT', ticket.url);
    for (const [name, value] of Object.entries(ticket.headers)) request.setRequestHeader(name, value);
    // A File carries its own type (often empty for a PSD); say it plainly unless the signature already named one.
    if (!Object.keys(ticket.headers).some((name) => name.toLowerCase() === 'content-type')) request.setRequestHeader('content-type', UPLOAD_CONTENT_TYPE);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress({ loaded: event.loaded, total: event.total });
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.onabort = () => resolve(false);
    request.send(file);
  });
}

/** Sends a corrected PSD for a pack and has the service rebuild the pack from it. */
export async function sendCorrectedPsd(packId: string, file: File, onProgress: (progress: UploadProgress) => void): Promise<UploadResult> {
  const base = `/api/prepress/${encodeURIComponent(packId)}`;

  const asked = await postJson(`${base}/upload-url`, { filename: file.name, size: file.size });
  if (!asked.ok) return asked;
  const ticket = readTicket(asked.body);
  if (!ticket) return { ok: false, ...words('failed') };

  if (!(await putFile(ticket, file, onProgress))) return { ok: false, ...words('storage') };

  const done = await postJson(`${base}/upload-done`, { key: ticket.key });
  if (!done.ok) return done;
  const outcome = done.body.outcome;
  if (done.body.ok !== true || typeof outcome !== 'object' || outcome === null) return { ok: false, ...words('failed') };
  return { ok: true, outcome: outcome as UploadOutcome };
}
