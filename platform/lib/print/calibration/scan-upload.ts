// The rules of uploading a scan of the chart, shared by the three routes
// (app/api/calibration) and the page. A scan of a garment at 600 dpi is tens of
// MB, and a function's request body stops at 4.5 MB (10 MB behind proxy.ts), so,
// as with a corrected PSD, the file never passes through the app: the browser
// asks for a signed URL, PUTs the file to print storage, then asks for it to be
// read. What each step checks, and the words for what goes wrong, live here.
// Pure and client-safe.

/** What the reader takes: png, jpeg and tiff (what flatbed software saves). */
export const SCAN_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff'] as const;

/** A 600 dpi scan of a bed of A4 is 35 megapixels: a TIFF of it is about 100 MB, uncompressed 16-bit about 200. */
export const DEFAULT_SCAN_MAX_BYTES = 300 * 1024 * 1024;
export const HARD_SCAN_MAX_BYTES = 1024 * 1024 * 1024;

/** The largest scan taken: CALIBRATION_SCAN_MAX_MB, or 300 MB. */
export function scanMaxBytes(env: Record<string, string | undefined>): number {
  const megabytes = Number(env.CALIBRATION_SCAN_MAX_MB);
  if (!Number.isFinite(megabytes) || megabytes <= 0) return DEFAULT_SCAN_MAX_BYTES;
  return Math.min(Math.floor(megabytes * 1024 * 1024), HARD_SCAN_MAX_BYTES);
}

/** The small JSON bodies of the routes (a name and a size, or a key and a screen) are read with this cap. */
export const MAX_CALIBRATION_JSON_BYTES = 4096;
export const SCAN_URL_LIFETIME_SECONDS = 15 * 60;
export const SCAN_CONTENT_TYPE = 'application/octet-stream';

const MAX_NAME_LENGTH = 120;

/** The file name the browser sent, made safe to keep: no folders, no control characters, an image extension. Null when it isn't one. */
export function parseScanFilename(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    // not percent-encoded after all: use it as it came
  }
  name = name.split(/[\\/]/).pop() ?? '';
  name = name.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/\s+/g, ' ').trim();
  const match = /^(.*?)\.([A-Za-z0-9]{2,5})$/.exec(name);
  if (!match || !match[1] || !(SCAN_EXTENSIONS as readonly string[]).includes(match[2].toLowerCase())) return null;
  const stem = match[1].slice(0, MAX_NAME_LENGTH - match[2].length - 1).trim();
  return stem ? `${stem}.${match[2].toLowerCase()}` : null;
}

/** Print storage keys are folders of letters, digits, '.', '_' and '-'. */
function keySafe(name: string): string {
  const dot = name.lastIndexOf('.');
  const extension = name.slice(dot).toLowerCase();
  const stem = name
    .slice(0, dot)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
  return `${stem || 'scan'}${extension}`;
}

/** Where a scan waits for the reader. Under 'uploads/prepress/', which print storage lets Pre-press staff sign uploads to and never serves back. */
export const SCAN_KEY_PREFIX = 'uploads/prepress/calibration';

export function scanUploadKey(nonce: string, filename: string): string {
  return [SCAN_KEY_PREFIX, nonce, keySafe(filename)].join('/');
}

/** True for a key scanUploadKey() made: nothing else may be read as a scan. */
export function isScanUploadKey(key: string): boolean {
  const parts = key.split('/');
  return (
    parts.length === 5 &&
    parts.slice(0, 3).join('/') === SCAN_KEY_PREFIX &&
    /^[0-9a-f-]{16,64}$/i.test(parts[3]) &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(?:png|jpe?g|tiff?)$/i.test(parts[4])
  );
}

/** What the first bytes of a file say it is: png, jpeg and tiff files each start with a fixed signature. */
export function scanSignature(head: Uint8Array): 'png' | 'jpeg' | 'tiff' | null {
  if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 && head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a) return 'png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head.length >= 4 && ((head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0x00) || (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00 && head[3] === 0x2a))) return 'tiff';
  return null;
}

export const CALIBRATION_ERRORS = {
  unauthorised: 'Sign in again to upload a scan.',
  forbidden: 'Reading a scan needs Manage access to Pre-press. Ask the owner.',
  bad_request: 'That request couldn’t be read. Reload the page and try again.',
  too_large: 'That scan is bigger than the server accepts. Scan at 600 dpi and save as TIFF with compression, or as JPEG at its best quality.',
  not_an_image: 'That isn’t a TIFF, PNG or JPEG scan. Save the scan in one of those formats.',
  empty: 'The file is empty.',
  incomplete: 'The scan didn’t arrive in storage. Try again.',
  storage: 'The scan couldn’t be sent to storage. Try again; if it keeps failing, the upload link may have expired.',
  unreadable: 'That scan can’t be read.',
  failed: 'Something went wrong on our side. Try again.',
  network: 'The connection dropped. Try again.',
} as const;
export type CalibrationErrorCode = keyof typeof CALIBRATION_ERRORS;

function isCalibrationErrorCode(value: unknown): value is CalibrationErrorCode {
  return typeof value === 'string' && Object.hasOwn(CALIBRATION_ERRORS, value);
}

/** A failed request in words: the route's own message when it gave one (the reader's words about a scan), otherwise the words for its code or, when something in front of the route answered (a gateway's 413 has no JSON), for the status alone. */
export function describeCalibrationFailure(status: number, body: unknown): { code: CalibrationErrorCode; message: string } {
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  let code: CalibrationErrorCode;
  if (isCalibrationErrorCode(fields.error)) code = fields.error;
  else if (status === 413) code = 'too_large';
  else if (status === 401) code = 'unauthorised';
  else if (status === 403) code = 'forbidden';
  else code = 'failed';
  const own = typeof fields.message === 'string' && fields.message.trim() ? fields.message.trim() : null;
  return { code, message: own ?? CALIBRATION_ERRORS[code] };
}
