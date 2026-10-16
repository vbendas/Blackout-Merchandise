// The browser's side of reading a scan: ask for a signed URL, PUT the file
// straight to print storage (with progress), then ask for the chart in it to be
// read. Three small requests instead of one huge one, because a function's
// request body stops at 4.5 MB and a 600 dpi scan runs to tens of MB. The PUT is
// an XMLHttpRequest because fetch can't report how much of a request body has
// gone up. Client only. The routes are in app/api/calibration.
import type { ScanReading } from '@/lib/print/calibration/scan';
import { CALIBRATION_ERRORS, SCAN_CONTENT_TYPE, describeCalibrationFailure, type CalibrationErrorCode } from '@/lib/print/calibration/scan-upload';
import { settableUploadHeaders } from '@/components/admin/prepress/rules';

export type SendScanResult = { ok: true; reading: ScanReading } | { ok: false; code: CalibrationErrorCode; message: string };

export interface UploadProgress {
  loaded: number;
  total: number;
}

function words(code: CalibrationErrorCode): { code: CalibrationErrorCode; message: string } {
  return { code, message: CALIBRATION_ERRORS[code] };
}

type Posted = { ok: true; body: Record<string, unknown> } | { ok: false; code: CalibrationErrorCode; message: string };

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
  if (!response.ok) return { ok: false, ...describeCalibrationFailure(response.status, body) };
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
    if (!Object.keys(ticket.headers).some((name) => name.toLowerCase() === 'content-type')) request.setRequestHeader('content-type', SCAN_CONTENT_TYPE);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress({ loaded: event.loaded, total: event.total });
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.onabort = () => resolve(false);
    request.send(file);
  });
}

/** Sends a scan and has the chart in it read at the screen it was printed with. */
export async function sendScan(file: File, screen: { lpi: number; angleDeg: number }, onProgress: (progress: UploadProgress) => void): Promise<SendScanResult> {
  const asked = await postJson('/api/calibration/scan-url', { filename: file.name, size: file.size });
  if (!asked.ok) return asked;
  const ticket = readTicket(asked.body);
  if (!ticket) return { ok: false, ...words('failed') };

  if (!(await putFile(ticket, file, onProgress))) return { ok: false, ...words('storage') };

  const done = await postJson('/api/calibration/scan', { key: ticket.key, lpi: screen.lpi, angleDeg: screen.angleDeg });
  if (!done.ok) return done;
  const reading = done.body.reading;
  if (done.body.ok !== true || typeof reading !== 'object' || reading === null) return { ok: false, ...words('failed') };
  return { ok: true, reading: reading as ScanReading };
}
